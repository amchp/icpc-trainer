
import { getStoredQojCredentials } from "@icpc-trainer/api";
import { DatabaseServiceTag } from "@icpc-trainer/db";
import { SUBMISSION_STATUSES } from "@icpc-trainer/shared";
import { Effect, Layer, Option } from "effect";
import { Impit } from "impit";

import {
  type GetSubmissionsOptions,
  type Judge,
  type JudgeContest,
  type JudgeError,
  type JudgePreviewContest,
  type JudgeSubmission,
  JudgeAPIError,
  JudgeCredentialError,
  JudgeNotFoundError,
  JudgeTag,
  type JudgeUser,
  type Problem
} from "./judges.js";

const QOJ_BASE_URL = "https://qoj.ac";
const USER_AGENT = "icpc-trainer-v2-qoj-sync/1.0";
const REQUEST_TIMEOUT_MS = 60_000;
const OUTBOUND_INTERVAL_MS = 1_000;
const MAX_RETRY_ATTEMPTS = 3;

type QojRequestParam = string | number | boolean | undefined;

type QojHttpResponse = {
  readonly status: number;
  readonly ok: boolean;
  readonly html: string;
};

export interface QojAuth {
  readonly cookieJar?: string;
}

type QojContestProblem = {
  readonly id: string;
  readonly letter: string;
  readonly name: string;
  readonly solves: number;
};

type QojResultStats = {
  readonly participants: number;
  readonly solvesByLetter: ReadonlyMap<string, number>;
};

class QojRequestError extends Error {
  constructor(
    message: string,
    readonly kind: "api" | "credential",
    readonly retryable = false
  ) {
    super(message);
    this.name = "QojRequestError";
  }
}

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

  return (path: string, params?: Record<string, QojRequestParam>): Effect.Effect<string, JudgeError, DatabaseServiceTag> =>
    Effect.gen(function* () {
      const database = yield* DatabaseServiceTag;
      const auth = getStoredQojCredentials({ database });
      if (!auth.ok) {
        return yield* Effect.fail(new JudgeCredentialError({ judgeId: "qoj", cause: auth.cause }));
      }

      const cookieJar = auth.credentials.cookieJar.trim();
      const normalizedCookieJar = cookieJar === "" ? undefined : cookieJar;

      return yield* Effect.tryPromise({
        try: () => {
        const run = async (): Promise<string> => {
          for (let attempt = 0; attempt < MAX_RETRY_ATTEMPTS; attempt += 1) {
            const waitMs = Math.max(0, nextAvailableAt - Date.now());
            if (waitMs > 0) {
              await delay(waitMs);
            }

            nextAvailableAt = Date.now() + OUTBOUND_INTERVAL_MS;

            try {
              return await fetchQojText(buildUrl(path, params, baseUrl), normalizedCookieJar);
            } catch (error) {
              const normalizedError = toQojRequestError(error);

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

          throw new QojRequestError("QOJ request failed after retries.", "api", true);
        };

        const scheduled = requestChain.then(run, run);
        requestChain = scheduled.then(
          () => undefined,
          () => undefined
        );

        return scheduled;
      },
      catch: (error) => toJudgeRequestError(toQojRequestError(error))
      });
    });
};

const fetchQojText = async (
  url: string,
  cookieJar: string | undefined
): Promise<string> => {
  const response = isLiveQojUrl(url)
    ? await fetchQojWithImpit(url, cookieJar)
    : await fetchQojWithNode(url, cookieJar);
  const html = response.html;

  if (!response.ok) {
    throw parseQojHttpError(response.status, html);
  }

  if (isLoginRequiredPage(html)) {
    throw new QojRequestError(
      "QOJ login required. Paste a fresh QOJ cookie set from your browser.",
      "credential"
    );
  }

  return html;
};

let qojImpit: Impit | undefined;

const getQojImpit = (): Impit => {
  qojImpit ??= new Impit({
    browser: "chrome",
    timeout: REQUEST_TIMEOUT_MS
  });

  return qojImpit;
};

const isLiveQojUrl = (url: string): boolean => new URL(url).origin === QOJ_BASE_URL;

const fetchQojWithNode = async (
  url: string,
  cookieJar: string | undefined
): Promise<QojHttpResponse> => {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS);

  try {
    const response = await fetch(url, {
      signal: controller.signal,
      headers: {
        "user-agent": USER_AGENT,
        ...(cookieJar === undefined ? {} : { cookie: cookieJar })
      }
    });

    return {
      status: response.status,
      ok: response.ok,
      html: await response.text()
    };
  } catch (error) {
    if (error instanceof Error && error.name === "AbortError") {
      throw new QojRequestError("QOJ request timed out.", "api", true);
    }

    throw error;
  } finally {
    clearTimeout(timeout);
  }
};

const fetchQojWithImpit = async (
  url: string,
  cookieJar: string | undefined
): Promise<QojHttpResponse> => {
  const response = await getQojImpit().fetch(url, {
    headers: {
      "user-agent": USER_AGENT,
      ...(cookieJar === undefined ? {} : { cookie: cookieJar })
    }
  });

  return {
    status: response.status,
    ok: response.ok,
    html: await response.text()
  };
};

const parseQojHttpError = (status: number, html: string): QojRequestError => {
  const text = cleanHtml(html).slice(0, 500);

  if (isLoginRequiredPage(html)) {
    return new QojRequestError(
      `QOJ returned HTTP ${status}: login required. Paste a fresh QOJ cookie set from your browser.`,
      "credential"
    );
  }

  return new QojRequestError(
    text === "" ? `QOJ returned HTTP ${status} with an empty response body.` : `QOJ returned HTTP ${status}: ${text}`,
    status >= 500 ? "api" : "credential",
    status >= 500
  );
};

const toQojRequestError = (error: unknown): QojRequestError => {
  if (error instanceof QojRequestError) {
    return error;
  }

  const normalized = toError(error);
  return new QojRequestError(normalized.message, "api", shouldRetryQojError(normalized));
};

const toJudgeRequestError = (error: QojRequestError): JudgeError =>
  error.kind === "credential"
    ? new JudgeCredentialError({ judgeId: "qoj", cause: error.message })
    : new JudgeAPIError({ judgeId: "qoj", cause: error.message });

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

  for (const [index, row] of rows.entries()) {
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
    const letter = normalizeProblemLetter(cells[0] ?? "", index);
    const name = cleanHtml(
      linkText || cells.find((cell) => /\S/.test(cell) && !/^\d+$/.test(cell)) || id
    );
    const solves = parseInteger(cells.find((cell) => /^\d+\s*$/.test(cell)) ?? "0");

    problems.set(id, { id, letter, name, solves });
  }

  return [...problems.values()];
};

const toProblem = (
  contestId: string,
  problem: QojContestProblem,
  resultStats?: QojResultStats
): Problem => ({
  judgeId: problem.id,
  name: problem.name,
  solves: resultStats?.solvesByLetter.get(problem.letter) ?? problem.solves,
  link: `${QOJ_BASE_URL}/contest/${encodeURIComponent(contestId)}/problem/${encodeURIComponent(
    problem.id
  )}`
});

const toContest = (
  contestId: string,
  contestHtml: string,
  resultHtml?: string
): JudgeContest => {
  const resultStats = resultHtml === undefined ? undefined : parseResultStats(resultHtml);

  return {
    judgeId: contestId,
    name: parseContestName(contestHtml),
    participants: resultStats?.participants ?? parseParticipants(contestHtml),
    problems: parseContestProblemRows(contestHtml).map((problem) =>
      toProblem(contestId, problem, resultStats)
    ),
    stars: 0
  };
};

const parseParticipants = (html: string): number =>
  parseInteger(matchFirst(html, /(\d+)\s+participants?/i));

const normalizeProblemLetter = (value: string, position: number): string => {
  const match = value.match(/[A-Z]{1,3}/i);

  if (match?.[0] !== undefined) {
    return match[0].toUpperCase();
  }

  return String.fromCodePoint("A".codePointAt(0)! + position);
};

const findResultId = (html: string, contestId: string): string => {
  const linkedResultId = matchFirst(html, /href=["'][^"']*\/results\/(QOJ\d+)(?:\/|["'#?])/i);
  return linkedResultId === "" ? `QOJ${contestId}` : linkedResultId.toUpperCase();
};

const parseResultStats = (html: string): QojResultStats => {
  const participantRows = (html.match(/<tr\b[^>]*>\s*<td\b[^>]*>\s*(?:<[^>]+>\s*)*\d+\s*(?:<\/[^>]+>\s*)*<\/td>/gi) ?? [])
    .length;
  const explicitParticipants = parseParticipants(html);
  const solvesByLetter = new Map<string, number>();
  const rows = html.match(/<tr\b[\s\S]*?<\/tr>/gi) ?? [];

  for (const [index, row] of rows.entries()) {
    if (/data-qoj-result-problem-row/i.test(row)) {
      const letter = normalizeProblemLetter(
        matchFirst(row, /data-letter=["']([^"']+)["']/i) || cleanHtml(row),
        index
      );
      const accepted = parseInteger(
        matchFirst(row, /data-accepted=["']([^"']+)["']/i) ||
          matchFirst(row, /class=["'][^"']*\baccepted\b[^"']*["'][^>]*>([\s\S]*?)<\/[^>]+>/i)
      );

      if (accepted > 0) {
        solvesByLetter.set(letter, accepted);
      }
    }

    for (const header of row.match(/<th\b[\s\S]*?<\/th>/gi) ?? []) {
      const parsedHeader = parseStandingsHeader(cleanHtml(header));

      if (parsedHeader !== undefined) {
        solvesByLetter.set(parsedHeader.letter, parsedHeader.accepted);
      }
    }
  }

  return {
    participants: explicitParticipants || participantRows,
    solvesByLetter
  };
};

const parseStandingsHeader = (
  value: string
): { readonly letter: string; readonly accepted: number } | undefined => {
  const match = value.replace(/\s+/g, "").match(/^([A-Z]{1,3})(\d+)\/\d+$/i);

  if (match?.[1] === undefined || match[2] === undefined) {
    return undefined;
  }

  return {
    letter: match[1].toUpperCase(),
    accepted: Number.parseInt(match[2], 10)
  };
};

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

      return requestQoj(`/contest/${encodeURIComponent(normalizedContestId)}`).pipe(
        Effect.flatMap((contestHtml) => {
          const resultId = findResultId(contestHtml, normalizedContestId);

          return requestQoj(`/results/${encodeURIComponent(resultId)}`).pipe(
            Effect.catchAll(() => Effect.succeed(undefined)),
            Effect.map((resultHtml) => toContest(normalizedContestId, contestHtml, resultHtml))
          );
        }),
        Effect.flatMap((contest) =>
          contest.name === ""
            ? Effect.fail(new JudgeNotFoundError({ resource: "contest", judgeId: normalizedContestId }))
            : Effect.succeed(contest)
        )
      );
    },

    getUser: (handle) => {
      const normalizedHandle = handle.trim();

      if (normalizedHandle === "") {
        return Effect.fail(
          new JudgeAPIError({ judgeId: "qoj", cause: "QOJ user handle is empty" })
        ) as Effect.Effect<JudgeUser, JudgeAPIError>;
      }

      return requestQoj(`/user/profile/${encodeURIComponent(normalizedHandle)}`).pipe(
        Effect.flatMap(
          (html): Effect.Effect<JudgeUser, JudgeNotFoundError | JudgeCredentialError> => {
            if (isMissingPage(html)) {
              return Effect.fail(
                new JudgeNotFoundError({ resource: "user", judgeId: normalizedHandle })
              );
            }

            if (isLoginRequiredPage(html)) {
              return Effect.fail(
                new JudgeCredentialError({
                  judgeId: normalizedHandle,
                  cause: "QOJ login required"
                })
              );
            }

            return Effect.succeed({ handle: normalizedHandle });
          }
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
