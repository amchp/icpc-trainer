
import { AppUserIdTag, getStoredQojCredentials } from "@icpc-trainer/api";
import { type DatabaseService, DatabaseServiceTag } from "@icpc-trainer/db";
import {
  CONTEST_FINDER_REFRESH_EVENT_TYPES,
  CONTEST_FINDER_REFRESH_STEPS,
  JUDGE_RESOURCES,
  JUDGES,
  JUDGE_REQUEST_ERROR_KINDS,
  type JudgeRequestErrorKind,
  SUBMISSION_STATUSES
} from "@icpc-trainer/shared";
import { Effect } from "effect";
import { Impit } from "impit";

import {
  type GetContestsOptions,
  type GetSubmissionsOptions,
  type Judge,
  type JudgeCredentialValidator,
  type JudgeAuthenticationInput,
  type JudgeContest,
  type JudgeError,
  type JudgePreviewContest,
  type JudgeSubmission,
  JudgeAPIError,
  JudgeCredentialError,
  JudgeNotFoundError,
  type JudgeUser,
  type Problem
} from "./judges.js";
import {
  upsertContestFinderCatalog,
  upsertContestFinderParticipations
} from "./contestFinder/index.js";
import { qojContestParticipations } from "./contestFinder/qoj.js";
import { createQojJudgeSync, syncQojContest } from "./sync/sync_qoj.js";

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
    readonly kind: JudgeRequestErrorKind,
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

  return (path: string, params?: Record<string, QojRequestParam>): Effect.Effect<string, JudgeError, DatabaseServiceTag | AppUserIdTag> =>
    Effect.gen(function* () {
      const database = yield* DatabaseServiceTag;
      const appUserId = yield* AppUserIdTag;
      const auth = yield* Effect.promise(() => getStoredQojCredentials({ database, appUserId }));
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

          throw new QojRequestError("QOJ request failed after retries.", JUDGE_REQUEST_ERROR_KINDS.Api, true);
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

const createPublicQojRequester = (baseUrl = QOJ_BASE_URL) => {
  let requestChain: Promise<void> = Promise.resolve();
  let nextAvailableAt = 0;

  return (path: string, params?: Record<string, QojRequestParam>): Effect.Effect<string, JudgeError> =>
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
              return await fetchQojText(buildUrl(path, params, baseUrl), undefined);
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

          throw new QojRequestError("QOJ request failed after retries.", JUDGE_REQUEST_ERROR_KINDS.Api, true);
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
      JUDGE_REQUEST_ERROR_KINDS.Credential
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
      throw new QojRequestError("QOJ request timed out.", JUDGE_REQUEST_ERROR_KINDS.Api, true);
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
      JUDGE_REQUEST_ERROR_KINDS.Credential
    );
  }

  return new QojRequestError(
    text === "" ? `QOJ returned HTTP ${status} with an empty response body.` : `QOJ returned HTTP ${status}: ${text}`,
    status >= 500 ? JUDGE_REQUEST_ERROR_KINDS.Api : JUDGE_REQUEST_ERROR_KINDS.Credential,
    status >= 500
  );
};

const toQojRequestError = (error: unknown): QojRequestError => {
  if (error instanceof QojRequestError) {
    return error;
  }

  const normalized = toError(error);
  return new QojRequestError(normalized.message, JUDGE_REQUEST_ERROR_KINDS.Api, shouldRetryQojError(normalized));
};

const toJudgeRequestError = (error: QojRequestError): JudgeError =>
  error.kind === JUDGE_REQUEST_ERROR_KINDS.Credential
    ? new JudgeCredentialError({ judgeId: "qoj", cause: error.message })
    : new JudgeAPIError({ judgeId: "qoj", cause: error.message });

const normalizeContestId = (contestId: string): string =>
  contestId.trim().replace(/^https?:\/\/qoj\.ac\/contest\//i, "").replace(/\/.*$/, "");

const normalizeUserHandle = (handle: string): string => handle.trim();

const userHandleFromCookieJar = (cookieJar: string | undefined): string | undefined => {
  const match = cookieJar?.match(/(?:^|;\s*)uoj_username=([^;]+)/i);
  return match?.[1] === undefined ? undefined : decodeURIComponent(match[1]).trim();
};

const toPreviewContest = (judgeId: string, name: string): JudgePreviewContest => ({
  judgeId,
  name
});

const parseContestLinks = (html: string): ReadonlyArray<JudgePreviewContest> => {
  const contests = new Map<string, JudgePreviewContest>();
  const linkPattern = /<a\b[^>]*href=["'][^"']*\/contest\/(\d+)(?:[?#][^"']*)?["'][^>]*>([\s\S]*?)<\/a>/gi;
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

const parseProfileContestList = (html: string): ReadonlyArray<JudgePreviewContest> => {
  const virtualSection = matchFirst(
    html,
    /Virtual Participations[\s\S]*?<tbody>([\s\S]*?)<\/tbody>/i
  );

  return parseContestLinks(virtualSection === "" ? html : virtualSection);
};

const parseContestCatalogList = (html: string): ReadonlyArray<JudgePreviewContest> =>
  parseContestLinks(html);

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
  name: problem.name.startsWith(`${problem.letter}. `)
    ? problem.name
    : `${problem.letter}. ${problem.name}`,
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
  const contestProblems = parseContestProblemRows(contestHtml);
  const name = parseContestName(contestHtml);

  return {
    judgeId: contestId,
    name,
    participants: resultStats?.participants ?? parseParticipants(contestHtml),
    problems: contestProblems.map((problem) =>
      toProblem(contestId, problem, resultStats)
    ),
    stars: estimateStarsFromContestName(name)
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

const estimateStarsFromContestName = (name: string): number =>
  /\bworld\s+finals\b/i.test(name) ? 5 : 4;

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

const parseProblemLinksInSection = (html: string, headingPattern: RegExp): ReadonlyArray<{
  readonly id: string;
  readonly name: string;
}> => {
  const heading = headingPattern.source;
  const source = matchFirst(
    html,
    new RegExp(`${heading}[\\s\\S]*?<p\\b[^>]*>([\\s\\S]*?)<\\/p>`, "i")
  );
  const problems = new Map<string, { readonly id: string; readonly name: string }>();
  const linkPattern = /<a\b[^>]*href=["'][^"']*\/problem\/(\d+)(?:[?#][^"']*)?["'][^>]*>([\s\S]*?)<\/a>/gi;
  let match: RegExpExecArray | null;

  while ((match = linkPattern.exec(source)) !== null) {
    const [, id, rawName] = match;
    const name = cleanHtml(rawName ?? "");

    if (id !== undefined && !problems.has(id)) {
      problems.set(id, { id, name: name || id });
    }
  }

  return [...problems.values()];
};

const parseProfileSubmissions = (html: string): ReadonlyArray<JudgeSubmission> => {
  const acceptedProblems = parseProblemLinksInSection(html, /Accepted problems/i);
  const triedProblems = parseProblemLinksInSection(html, /Tried problems/i);
  const acceptedProblemIds = new Set(acceptedProblems.map((problem) => problem.id));
  const submissions: JudgeSubmission[] = [];

  for (const problem of acceptedProblems) {
    submissions.push({
      judgeId: `profile-ac-${problem.id}`,
      judgeProblemId: problem.id,
      problemName: problem.name,
      verdict: SUBMISSION_STATUSES.AC,
      submittedAt: new Date(0)
    });
  }

  for (const problem of triedProblems) {
    if (acceptedProblemIds.has(problem.id)) {
      continue;
    }

    submissions.push({
      judgeId: `profile-tried-${problem.id}`,
      judgeProblemId: problem.id,
      problemName: problem.name,
      verdict: SUBMISSION_STATUSES.WA,
      submittedAt: new Date(0)
    });
  }

  return submissions;
};

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

const qojContestLink = (contestJudgeId: string): string =>
  `${QOJ_BASE_URL}/contest/${encodeURIComponent(contestJudgeId)}`;

const withQojContestLink = (contest: JudgePreviewContest): JudgePreviewContest => ({
  ...contest,
  link: contest.link ?? qojContestLink(contest.judgeId)
});

const validateQojAuthentication = (
  input: JudgeAuthenticationInput,
  baseUrl = QOJ_BASE_URL
): Effect.Effect<void, JudgeError> => {
  if (input.provider !== "qoj") {
    return Effect.fail(new JudgeCredentialError({
      judgeId: "qoj",
      cause: "QOJ authentication input is required."
    }));
  }

  const cookieJar = input.qoj.cookieJar.trim();
  const handle = input.providerUserKey?.trim() || userHandleFromCookieJar(cookieJar);

  if (handle === undefined || handle === "") {
    return Effect.fail(new JudgeCredentialError({
      judgeId: "qoj",
      cause: "QOJ profile handle is required."
    }));
  }

  return Effect.tryPromise({
    try: () => fetchQojText(
      buildUrl(`/user/profile/${encodeURIComponent(handle)}`, {}, baseUrl),
      cookieJar === "" ? undefined : cookieJar
    ),
    catch: (error) => toJudgeRequestError(toQojRequestError(error))
  }).pipe(
    Effect.flatMap((html) => {
      if (isMissingPage(html)) {
        return Effect.fail(new JudgeNotFoundError({ resource: JUDGE_RESOURCES.User, judgeId: handle }));
      }

      return Effect.void;
    })
  );
};

export const makeQojPlaygroundClient = (baseUrl = QOJ_BASE_URL) => {
  const requestQoj = createQojRequester(baseUrl);
  const requestPublicQoj = createPublicQojRequester(baseUrl);
  const requestProfile = (
    options?: GetContestsOptions | GetSubmissionsOptions
  ): Effect.Effect<string, JudgeError, DatabaseServiceTag | AppUserIdTag> =>
    Effect.gen(function* () {
      if (options?.userHandle !== undefined && options.userHandle.trim() !== "") {
        return yield* requestQoj(`/user/profile/${encodeURIComponent(normalizeUserHandle(options.userHandle))}`);
      }

      const database = yield* DatabaseServiceTag;
      const appUserId = yield* AppUserIdTag;
      const auth = yield* Effect.promise(() => getStoredQojCredentials({ database, appUserId }));
      const handle = auth.ok ? userHandleFromCookieJar(auth.credentials.cookieJar) : undefined;

      if (handle === undefined || handle === "") {
        return yield* Effect.fail(new JudgeCredentialError({
          judgeId: "qoj",
          cause: "QOJ profile handle is required."
        }));
      }

      return yield* requestQoj(`/user/profile/${encodeURIComponent(handle)}`);
    });
  const getContestCatalog = (): Effect.Effect<ReadonlyArray<JudgePreviewContest>, JudgeError> =>
    requestPublicQoj("/contests").pipe(Effect.map(parseContestCatalogList));

  return {
    getContestCatalog,

    getContests: (options?: GetContestsOptions) =>
      options?.userHandle !== undefined && options.userHandle.trim() !== ""
        ? requestProfile(options).pipe(Effect.map(parseProfileContestList))
        : getContestCatalog(),

    getContest: (contestId: string) => {
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
            ? Effect.fail(new JudgeNotFoundError({ resource: JUDGE_RESOURCES.Contest, judgeId: normalizedContestId }))
            : Effect.succeed(contest)
        )
      );
    },

    getUser: (handle: string) => {
      const normalizedHandle = normalizeUserHandle(handle);

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
                new JudgeNotFoundError({ resource: JUDGE_RESOURCES.User, judgeId: normalizedHandle })
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

      return requestProfile(options).pipe(Effect.map(parseProfileSubmissions));
    },
  };
};

export type QojPlaygroundClient = ReturnType<typeof makeQojPlaygroundClient>;

export const makeQojCredentialValidator = (baseUrl = QOJ_BASE_URL): JudgeCredentialValidator => ({
  validateAuthentication: (input) => validateQojAuthentication(input, baseUrl)
});

export const syncQojContestFinderCatalog = (
  database: DatabaseService,
  client: QojPlaygroundClient
): ReturnType<Judge["syncContestFinderCatalog"]> => Effect.gen(function* () {
  const catalog = (yield* client.getContestCatalog()).map(withQojContestLink);
  const contestsUpserted = yield* upsertContestFinderCatalog(
    database,
    "qoj",
    JUDGES.Qoj,
    catalog
  ).pipe(
    Effect.mapError((error) => new JudgeAPIError({ judgeId: "qoj", cause: error }))
  );

  return {
    contestsUpserted,
    regularContestsImported: 0,
    regularProblemsImported: 0
  };
});

export const makeQojJudge = (database: DatabaseService, baseUrl = QOJ_BASE_URL): Judge => {
  const client = makeQojPlaygroundClient(baseUrl);

  return {
    findContest: (input) => Effect.gen(function* () {
      const emit = input.emit ?? (() => Effect.void);
      const stepsTotal = input.friends.length;
      let stepsDone = 0;

      yield* emit({
        type: CONTEST_FINDER_REFRESH_EVENT_TYPES.Started,
        provider: "qoj",
        stepsTotal,
        stepsLeft: stepsTotal
      });
      const contestsUpserted = 0;
      let friendsProcessed = 0;

      yield* emit({
        type: CONTEST_FINDER_REFRESH_EVENT_TYPES.FriendsSyncing,
        provider: "qoj",
        step: CONTEST_FINDER_REFRESH_STEPS.Friends,
        friendsTotal: input.friends.length,
        stepsTotal,
        stepsLeft: stepsTotal - stepsDone
      });
      for (const friend of input.friends) {
        yield* emit({
          type: CONTEST_FINDER_REFRESH_EVENT_TYPES.FriendsFriendSyncing,
          provider: "qoj",
          step: CONTEST_FINDER_REFRESH_STEPS.Friends,
          userHandle: friend.username,
          friendIndex: friendsProcessed + 1,
          friendsTotal: input.friends.length,
          stepsTotal,
          stepsLeft: stepsTotal - stepsDone
        });
        const contests = (yield* client.getContests({ userHandle: friend.username })).map(withQojContestLink);
        yield* upsertContestFinderParticipations(
          database,
          "qoj",
          JUDGES.Qoj,
          qojContestParticipations(friend, contests)
        ).pipe(
          Effect.mapError((error) => new JudgeAPIError({ judgeId: friend.username, cause: error }))
        );
        friendsProcessed += 1;
        stepsDone += 1;
        yield* emit({
          type: CONTEST_FINDER_REFRESH_EVENT_TYPES.FriendsFriendSynced,
          provider: "qoj",
          step: CONTEST_FINDER_REFRESH_STEPS.Friends,
          userHandle: friend.username,
          friendIndex: friendsProcessed,
          friendsTotal: input.friends.length,
          friendsProcessed: 1,
          stepsTotal,
          stepsLeft: stepsTotal - stepsDone
        });
      }

      return {
        contestsUpserted,
        friendsProcessed
      };
    }),

    syncContestFinderCatalog: () => syncQojContestFinderCatalog(database, client),

    refetchContest: (input) =>
      syncQojContest(database, input.provider, client, input.contestJudgeId).pipe(
        Effect.asVoid
      ),

    sync: (input) => createQojJudgeSync(database, input, client)
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
