
import { SUBMISSION_STATUSES } from "@icpc-trainer/shared";
import { Effect, Layer, Option } from "effect";

import {
  type GetSubmissionsOptions,
  type Judge,
  type JudgeContest,
  type JudgePreviewContest,
  type JudgeSubmission,
  JudgeTag,
  type JudgeUser,
  type Problem
} from "./judges.js";

const QOJ_BASE_URL = "https://qoj.ac";
const REQUEST_TIMEOUT_MS = 60_000;
const OUTBOUND_INTERVAL_MS = 1_000;
const MAX_RETRY_ATTEMPTS = 3;

type QojRequestParam = string | number | boolean | undefined;

type QojContestProblem = {
  readonly id: string;
  readonly name: string;
  readonly solves: number;
};

const toError = (error: unknown): Error =>
  error instanceof Error ? error : new Error(String(error));

const buildUrl = (
  path: string,
  params: Record<string, QojRequestParam> = {},
  baseUrl = QOJ_BASE_URL
): string => {
  const url = new URL(path, baseUrl);

  for (const [key, value] of Object.entries(params)) {
    if (value !== undefined) {
      url.searchParams.set(key, String(value));
    }
  }

  return url.toString();
};

const createQojRequester = (baseUrl = QOJ_BASE_URL) => {
  let requestChain: Promise<void> = Promise.resolve();
  let nextAvailableAt = 0;

  return (path: string, params?: Record<string, QojRequestParam>): Effect.Effect<string> =>
    Effect.tryPromise({
      try: () => {
        const run = async (): Promise<string> => {
          for (let attempt = 0; attempt < MAX_RETRY_ATTEMPTS; attempt += 1) {
            const waitMs = Math.max(0, nextAvailableAt - Date.now());
            if (waitMs > 0) {
              await delay(waitMs);
            }

            nextAvailableAt = Date.now() + OUTBOUND_INTERVAL_MS;

            try {
              return await fetchQojText(buildUrl(path, params, baseUrl));
            } catch (error) {
              const normalizedError = toError(error);

              if (attempt + 1 < MAX_RETRY_ATTEMPTS && shouldRetryQojError(normalizedError)) {
                nextAvailableAt = Math.max(
                  nextAvailableAt,
                  Date.now() + OUTBOUND_INTERVAL_MS * (attempt + 1)
                );
                continue;
              }

              throw normalizedError;
            }
          }

          throw new Error("QOJ request failed after retries");
        };

        const scheduled = requestChain.then(run, run);
        requestChain = scheduled.then(
          () => undefined,
          () => undefined
        );

        return scheduled;
      },
      catch: toError
    }).pipe(Effect.catchAll((error) => Effect.die(error)));
};

const fetchQojText = async (url: string): Promise<string> => {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS);

  try {
    const response = await fetch(url, {
      signal: controller.signal,
      headers: {
        Accept: "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
        "User-Agent": "icpc-trainer/1.0"
      }
    });

    if (!response.ok) {
      throw new Error(`QOJ request failed with HTTP ${response.status}`);
    }

    return await response.text();
  } catch (error) {
    if (error instanceof Error && error.name === "AbortError") {
      throw new Error("QOJ request timed out");
    }

    throw error;
  } finally {
    clearTimeout(timeout);
  }
};

const normalizeContestId = (contestId: string): string =>
  contestId.trim().replace(/^https?:\/\/qoj\.ac\/contest\//i, "").replace(/\/.*$/, "");

const toPreviewContest = (judgeId: string, name: string): JudgePreviewContest => ({
  judgeId,
  name
});

const parseContestList = (html: string): ReadonlyArray<JudgePreviewContest> => {
  const contests = new Map<string, JudgePreviewContest>();
  const linkPattern = /<a\b[^>]*href=["']\/contest\/(\d+)["'][^>]*>([\s\S]*?)<\/a>/gi;
  let match: RegExpExecArray | null;

  while ((match = linkPattern.exec(html)) !== null) {
    const [, judgeId, rawName] = match;
    const name = cleanHtml(rawName ?? "");

    if (judgeId !== undefined && name !== "" && !contests.has(judgeId)) {
      contests.set(judgeId, toPreviewContest(judgeId, name));
    }
  }

  return [...contests.values()];
};

const parseContestName = (html: string): string => {
  const titleHeading = matchFirst(html, /<h1\b[^>]*>\s*<a\b[^>]*>([\s\S]*?)<\/a>\s*<\/h1>/i);
  if (titleHeading !== "") {
    return cleanHtml(titleHeading);
  }

  const title = matchFirst(html, /<title\b[^>]*>([\s\S]*?)<\/title>/i);
  return cleanHtml(title)
    .replace(/\s*-\s*(?:Dashboard|Standings|Submissions)\s*-\s*Contest\s*-\s*QOJ(?:\.ac)?\s*$/i, "")
    .replace(/\s*[-|]\s*QOJ(?:\.ac)?\s*$/i, "")
    .trim();
};

const parseContestProblemRows = (html: string): ReadonlyArray<QojContestProblem> => {
  const problems = new Map<string, QojContestProblem>();
  const rows = html.match(/<tr\b[\s\S]*?<\/tr>/gi) ?? [];

  for (const row of rows) {
    const problemHref = matchFirst(row, /href=["'][^"']*\/problem\/(\d+)["']/i);
    const contestProblemHref = matchFirst(
      row,
      /href=["'][^"']*\/contest\/\d+\/problem\/([^"'#?]+)["']/i
    );
    const id = decodeURIComponent(contestProblemHref || problemHref).trim();

    if (id === "") {
      continue;
    }

    const linkText = matchFirst(
      row,
      /<a\b[^>]*href=["'][^"']*(?:\/contest\/\d+\/problem\/[^"']+|\/problem\/\d+)["'][^>]*>([\s\S]*?)<\/a>/i
    );
    const cells = [...row.matchAll(/<td\b[^>]*>([\s\S]*?)<\/td>/gi)].map((cell) =>
      cleanHtml(cell[1] ?? "")
    );
    const name = cleanHtml(
      linkText || cells.find((cell) => /\S/.test(cell) && !/^\d+$/.test(cell)) || id
    );
    const solves = parseInteger(cells.find((cell) => /^\d+\s*$/.test(cell)) ?? "0");

    problems.set(id, { id, name, solves });
  }

  return [...problems.values()];
};

const toProblem = (contestId: string, problem: QojContestProblem): Problem => ({
  judgeId: problem.id,
  name: problem.name,
  solves: problem.solves,
  link: `${QOJ_BASE_URL}/contest/${encodeURIComponent(contestId)}/problem/${encodeURIComponent(
    problem.id
  )}`
});

const toContest = (contestId: string, contestHtml: string, problemsHtml: string): JudgeContest => ({
  judgeId: contestId,
  name: parseContestName(contestHtml),
  participants: parseParticipants(contestHtml),
  problems: parseContestProblemRows(problemsHtml || contestHtml).map((problem) =>
    toProblem(contestId, problem)
  ),
  stars: 0
});

const parseParticipants = (html: string): number =>
  parseInteger(matchFirst(html, /(\d+)\s+participants?/i));

const toSubmissionStatus = (value: string): SUBMISSION_STATUSES => {
  const verdict = cleanHtml(value).toUpperCase();

  if (/\b(?:AC|ACCEPTED|CORRECT|OK)\b/.test(verdict)) {
    return SUBMISSION_STATUSES.AC;
  }

  if (/\b(?:TLE|TIME\s+LIMIT|TIME_LIMIT_EXCEEDED)\b/.test(verdict)) {
    return SUBMISSION_STATUSES.TLE;
  }

  if (/\b(?:RE|RTE|RUNTIME|RUNTIME_ERROR|SEGMENTATION)\b/.test(verdict)) {
    return SUBMISSION_STATUSES.RTE;
  }

  return SUBMISSION_STATUSES.WA;
};

const isVerdictText = (value: string): boolean =>
  /\b(?:AC|WA|TLE|RE|RTE|Accepted|Wrong Answer|Time Limit|Runtime Error|Compilation Error)\b/i.test(
    value
  );

const parseSubmissions = (html: string): ReadonlyArray<JudgeSubmission> => {
  const submissions: JudgeSubmission[] = [];
  const rows = html.match(/<tr\b[\s\S]*?<\/tr>/gi) ?? [];

  for (const row of rows) {
    const cells = [...row.matchAll(/<td\b[^>]*>([\s\S]*?)<\/td>/gi)].map((cell) =>
      cleanHtml(cell[1] ?? "")
    );

    if (cells.length === 0) {
      continue;
    }

    const links = [...row.matchAll(/<a\b[^>]*href=["']([^"']+)["'][^>]*>([\s\S]*?)<\/a>/gi)].map(
      (link) => ({ href: link[1] ?? "", text: cleanHtml(link[2] ?? "") })
    );
    const judgeId = matchFirst(row, /href=["'][^"']*\/submission\/(\d+)["']/i) || cells[0] || "";
    const problemName =
      links.find((link) => /\/problem\//.test(link.href))?.text ||
      cells.find((cell) => /[A-Za-z]/.test(cell) && !isVerdictText(cell)) ||
      "";

    if (judgeId === "" || problemName === "") {
      continue;
    }

    submissions.push({
      judgeId,
      judgeContestId: extractContestId(row),
      problemName,
      verdict: toSubmissionStatus(cells.find(isVerdictText) ?? row),
      submittedAt: parseSubmissionDate(cells) ?? new Date(0)
    });
  }

  return submissions;
};

const parseSubmissionDate = (cells: ReadonlyArray<string>): Date | undefined => {
  for (const cell of cells) {
    const normalized = cell.replace(/\s+/g, " ").trim();
    if (!/\d{4}[-/]\d{1,2}[-/]\d{1,2}/.test(normalized)) {
      continue;
    }

    const date = new Date(normalized.replace(/-/g, "/"));
    if (!Number.isNaN(date.getTime())) {
      return date;
    }
  }

  return undefined;
};

const extractContestId = (html: string): string =>
  matchFirst(html, /href=["'][^"']*\/contest\/(\d+)(?:\/|["'#?])/i);

const shouldRetryQojError = (error: Error): boolean =>
  /HTTP 5\d\d|timed out|fetch failed|network/i.test(error.message);

const matchFirst = (value: string, pattern: RegExp): string => pattern.exec(value)?.[1] ?? "";

const parseInteger = (value: string): number => {
  const parsed = Number.parseInt(value.replace(/[^\d-]/g, ""), 10);
  return Number.isFinite(parsed) ? parsed : 0;
};

const cleanHtml = (value: string): string =>
  decodeHtmlEntities(
    value
      .replace(/<script\b[\s\S]*?<\/script>/gi, "")
      .replace(/<style\b[\s\S]*?<\/style>/gi, "")
      .replace(/<[^>]+>/g, " ")
  )
    .replace(/\s+/g, " ")
    .trim();

const decodeHtmlEntities = (value: string): string => {
  const namedEntities: Record<string, string> = {
    amp: "&",
    apos: "'",
    gt: ">",
    lt: "<",
    nbsp: " ",
    quot: '"'
  };

  return value.replace(/&(#x?[\da-f]+|[a-z]+);/gi, (entity, body: string) => {
    if (body.startsWith("#x") || body.startsWith("#X")) {
      return String.fromCodePoint(Number.parseInt(body.slice(2), 16));
    }

    if (body.startsWith("#")) {
      return String.fromCodePoint(Number.parseInt(body.slice(1), 10));
    }

    return namedEntities[body.toLowerCase()] ?? entity;
  });
};

const delay = (ms: number): Promise<void> => new Promise((resolve) => setTimeout(resolve, ms));

export const makeQojJudge = (baseUrl = QOJ_BASE_URL): Judge => {
  const requestQoj = createQojRequester(baseUrl);

  return {
    getContests: requestQoj("/contests").pipe(Effect.map(parseContestList)),

    getContest: (contestId) => {
      const normalizedContestId = normalizeContestId(contestId);

      return Effect.all({
        contestHtml: requestQoj(`/contest/${encodeURIComponent(normalizedContestId)}`),
        problemsHtml: requestQoj(
          `/contest/${encodeURIComponent(normalizedContestId)}/problems`
        ).pipe(Effect.catchAll(() => Effect.succeed("")))
      }).pipe(
        Effect.map(({ contestHtml, problemsHtml }) =>
          toContest(normalizedContestId, contestHtml, problemsHtml)
        ),
        Effect.flatMap((contest) =>
          contest.name === "" ? Effect.fail(new Error("QOJ contest not found")) : Effect.succeed(contest)
        )
      );
    },

    getUser: (handle) => {
      const normalizedHandle = handle.trim();

      if (normalizedHandle === "") {
        return Effect.die(new Error("QOJ user handle is empty"));
      }

      return requestQoj(`/user/profile/${encodeURIComponent(normalizedHandle)}`).pipe(
        Effect.flatMap((html) =>
          isMissingPage(html)
            ? Effect.fail(new Error("QOJ user not found"))
            : isLoginRequiredPage(html)
              ? Effect.fail(new Error("QOJ login required"))
              : Effect.succeed({ handle: normalizedHandle } satisfies JudgeUser)
        )
      );
    },

    getSubmissions: (options?: GetSubmissionsOptions) => {
      if (options?.userHandle === undefined || options.userHandle.trim() === "") {
        return Effect.succeed([]);
      }

      const userHandle = options.userHandle.trim();

      return requestQoj("/submissions", {
        submitter: userHandle,
        username: userHandle
      }).pipe(Effect.map(parseSubmissions));
    }
  };
};

const isMissingPage = (html: string): boolean =>
  /\b(?:not found|no such user|404)\b/i.test(cleanHtml(html));

const isLoginRequiredPage = (html: string): boolean => {
  const text = cleanHtml(html);

  return (
    /\b(?:login required|please log in|sign in to continue)\b/i.test(text) ||
    /<form\b[^>]*action=["'][^"']*login[^"']*["'][\s\S]*<input\b[^>]*(?:type|name)=["'][^"']*password/i.test(html) ||
    /<h[1-6]\b[^>]*>\s*login\s*<\/h[1-6]>/i.test(html)
  );
};

export const QojJudgeLive: Layer.Layer<JudgeTag> = Layer.succeed(JudgeTag, makeQojJudge());
