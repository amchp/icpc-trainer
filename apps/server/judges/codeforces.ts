
import { AppUserIdTag, getStoredCodeforcesCredentials } from "@icpc-trainer/api";
import { type DatabaseService, DatabaseServiceTag } from "@icpc-trainer/db";
import {
  FRIEND_SUBMISSION_SYNC_EVENT_TYPES,
  JUDGE_RESOURCES,
  JUDGES,
  SUBMISSION_STATUSES,
  type JudgeResource
} from "@icpc-trainer/shared";
import { Effect } from "effect";
import { createHash, randomBytes } from "node:crypto";

import {
  type GetContestsOptions,
  type GetSubmissionsOptions,
  type Judge,
  type JudgeCredentialValidator,
  type JudgeContest,
  type JudgeError,
  type JudgeAuthenticationInput,
  JudgeNotFoundError,
  type JudgePreviewContest,
  type JudgeRegularCatalogProblem,
  type JudgeSubmission,
  JudgeUnavailableError,
  type Problem,
  JudgeAPIError,
  JudgeCredentialError
} from "./judges.js";
import {
  getContestFinderCatalog,
  upsertContestFinderCatalog,
  upsertContestFinderParticipations
} from "./contestFinder/index.js";
import { codeforcesContestParticipations } from "./contestFinder/codeforces.js";
import { createCodeforcesJudgeSync, syncCodeforcesContest, type CodeforcesSyncOperations } from "./sync/sync_codeforces.js";
import { upsertCodeforcesRegularCatalog } from "./sync/codeforcesRegularCatalog.js";
import { syncUserSubmissions } from "./sync/persistence.js";
import { estimateContestStarsFromName } from "./sync/problemRating.js";

const CODEFORCES_API_URL = "https://codeforces.com/api";
const CODEFORCES_GYM_URL = "https://codeforces.com/gym";
const CODEFORCES_CONTEST_URL = "https://codeforces.com/contest";
const CODEFORCES_GYM_CONTEST_ID_MIN = 100000;
const CODEFORCES_GYM_CONTEST_ID_MAX = 200000;
const CODEFORCES_PAGE_SIZE = 100_000;
const CODEFORCES_REQUEST_TIMEOUT_MS = 30_000;
const CODEFORCES_REQUEST_TIMEOUT_SECONDS = CODEFORCES_REQUEST_TIMEOUT_MS / 1_000;
const DIV_ROUND_PATTERN = /\bdiv\.?\s*[1-4]\b/i;
const WEIRD_REGULAR_CONTEST_PATTERN =
  /\b(?:challenge|marathon|communication|huawei|huawai|april\s+fools|kotlin\s+heroes|experimental|testing\s+round)\b/i;

export const isNormalRegularCodeforcesContestName = (name: string): boolean =>
  DIV_ROUND_PATTERN.test(name) && !WEIRD_REGULAR_CONTEST_PATTERN.test(name);

interface CodeforcesApiSuccess<T> {
  readonly status: "OK";
  readonly result: T;
}

interface CodeforcesApiFailure {
  readonly status: "FAILED";
  readonly comment?: string;
}

type CodeforcesApiResponse<T> = CodeforcesApiSuccess<T> | CodeforcesApiFailure;

type CodeforcesRequestParam = string | number | boolean | undefined;

export interface CodeforcesAuth {
  readonly apiKey?: string;
  readonly apiSecret?: string;
}

type RequestCodeforces = <T>(
  method: string,
  params?: Record<string, CodeforcesRequestParam>
) => Effect.Effect<T, CodeforcesApiError, DatabaseServiceTag | AppUserIdTag>;

interface CodeforcesContest {
  readonly id: number;
  readonly name: string;
  readonly phase: string;
  readonly type: string;
  readonly difficulty?: number;
}

interface CodeforcesProblem {
  readonly contestId?: number;
  readonly index: string;
  readonly name: string;
  readonly rating?: number;
  readonly tags?: readonly string[];
}

interface CodeforcesProblemStatistic {
  readonly contestId: number;
  readonly index: string;
  readonly solvedCount: number;
}

interface CodeforcesProblemset {
  readonly problems: ReadonlyArray<CodeforcesProblem>;
  readonly problemStatistics: ReadonlyArray<CodeforcesProblemStatistic>;
}

interface CodeforcesProblemResult {
  readonly points?: number;
  readonly penalty?: number;
  readonly rejectedAttemptCount?: number;
  readonly type?: string;
  readonly bestSubmissionTimeSeconds?: number;
}

interface CodeforcesParty {
  readonly participantType?: string;
}

interface CodeforcesRanklistRow {
  readonly party: CodeforcesParty;
  readonly rank: number;
  readonly points: number;
  readonly penalty: number;
  readonly problemResults: ReadonlyArray<CodeforcesProblemResult>;
}

interface CodeforcesStandings {
  readonly contest: CodeforcesContest;
  readonly problems: ReadonlyArray<CodeforcesProblem>;
  readonly rows: ReadonlyArray<CodeforcesRanklistRow>;
}

interface CodeforcesUser {
  readonly handle: string;
}

interface CodeforcesSubmission {
  readonly id: number;
  readonly contestId: number;
  readonly creationTimeSeconds: number;
  readonly problem: CodeforcesProblem;
  readonly verdict?: string;
}

interface CodeforcesApiError {
  readonly comment?: string;
  readonly cause?: unknown;
  readonly credential?: boolean;
  readonly unavailable?: boolean;
}

const toError = (error: unknown): Error =>
  error instanceof Error ? error : new Error(String(error));

const isAbortError = (cause: unknown): cause is Error =>
  cause instanceof Error && cause.name === "AbortError";

const hasCodeforcesAuth = (auth: CodeforcesAuth | undefined): auth is Required<CodeforcesAuth> =>
  auth?.apiKey !== undefined &&
  auth.apiKey.trim() !== "" &&
  auth.apiSecret !== undefined &&
  auth.apiSecret.trim() !== "";

const buildSignedUrl = (
  method: string,
  params: Record<string, CodeforcesRequestParam> = {},
  auth: Required<CodeforcesAuth>
): string => {
  const entries: Array<[string, string]> = [];
  for (const [key, value] of Object.entries(params)) {
    if (value !== undefined) {
      entries.push([key, String(value)]);
    }
  }

  const time = Math.floor(Date.now() / 1_000).toString();
  entries.push(["apiKey", auth.apiKey.trim()], ["time", time]);
  const sortedEntries = entries.sort(([leftKey, leftValue], [rightKey, rightValue]) =>
    leftKey === rightKey ? leftValue.localeCompare(rightValue) : leftKey.localeCompare(rightKey)
  );
  const query = new URLSearchParams(sortedEntries);
  const rand = randomBytes(3).toString("hex");
  const signaturePayload = `${rand}/${method}?${query.toString()}#${auth.apiSecret.trim()}`;
  const digest = createHash("sha512").update(signaturePayload).digest("hex");
  query.set("apiSig", `${rand}${digest}`);

  return `${CODEFORCES_API_URL}/${method}?${query.toString()}`;
};

const parseCodeforcesHttpError = (status: number, body: string): CodeforcesApiError => {
  const unavailable = status >= 500;
  const prefix = unavailable
    ? `Codeforces API is unavailable (HTTP ${status})`
    : `Codeforces API returned HTTP ${status}`;

  try {
    const payload = JSON.parse(body) as Partial<CodeforcesApiFailure>;

    if (typeof payload.comment === "string" && payload.comment.trim() !== "") {
      return {
        comment: `${prefix}: ${payload.comment.trim()}`,
        unavailable
      };
    }
  } catch {
    // Fall through to the plain-body message below.
  }

  const trimmedBody = body.trim();

  return {
    comment:
      trimmedBody === ""
        ? `${prefix} with an empty response body.`
        : `${prefix}: ${trimmedBody.slice(0, 500)}`,
    unavailable
  };
};

const toCodeforcesApiError = (cause: unknown): CodeforcesApiError => {
  if (typeof cause === "object" && cause !== null && "comment" in cause) {
    return cause as CodeforcesApiError;
  }

  const error = toError(cause);
  if (error instanceof SyntaxError) {
    return {
      comment: "Codeforces API is unavailable. It returned an invalid response.",
      cause: error,
      unavailable: true
    };
  }

  return {
    comment: "Codeforces API is unavailable. The request could not reach Codeforces.",
    cause: error,
    unavailable: true
  };
};

const requestCodeforcesApi = async <T>(url: string): Promise<T> => {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), CODEFORCES_REQUEST_TIMEOUT_MS);

  try {
    const response = await fetch(url, { signal: controller.signal });
    if (!response.ok) {
      throw parseCodeforcesHttpError(response.status, await response.text());
    }

    const payload = (await response.json()) as CodeforcesApiResponse<T>;
    if (payload.status === "FAILED") {
      throw { comment: payload.comment };
    }

    return payload.result;
  } catch (cause) {
    if (isAbortError(cause)) {
      throw {
        comment: `Codeforces API is unavailable. The request timed out after ${CODEFORCES_REQUEST_TIMEOUT_SECONDS} seconds.`,
        cause,
        unavailable: true
      };
    }

    throw cause;
  } finally {
    clearTimeout(timeout);
  }
};

const requestCodeforcesWithAuth = <T>(
  method: string,
  params: Record<string, CodeforcesRequestParam> | undefined,
  auth: Required<CodeforcesAuth>
): Effect.Effect<T, CodeforcesApiError> =>
  Effect.tryPromise({
    try: () => requestCodeforcesApi<T>(buildSignedUrl(method, params, auth)),
    catch: toCodeforcesApiError
  });

const requestCodeforcesPublic = <T>(
  method: string,
  params: Record<string, CodeforcesRequestParam> = {}
): Effect.Effect<T, CodeforcesApiError> =>
  Effect.tryPromise({
    try: async () => {
      const url = new URL(`${CODEFORCES_API_URL}/${method}`);
      for (const [key, value] of Object.entries(params)) {
        if (value !== undefined) {
          url.searchParams.set(key, String(value));
        }
      }

      return await requestCodeforcesApi<T>(url.toString());
    },
    catch: toCodeforcesApiError
  });

const makeCodeforcesRequester = (): RequestCodeforces =>
  <T>(method: string, params?: Record<string, CodeforcesRequestParam>) =>
    Effect.gen(function* () {
      const database = yield* DatabaseServiceTag;
      const appUserId = yield* AppUserIdTag;
      const storedAuth = yield* Effect.promise(() => getStoredCodeforcesCredentials({ database, appUserId }));
      if (!storedAuth.ok || !hasCodeforcesAuth(storedAuth.credentials)) {
        return yield* Effect.fail({
          comment: storedAuth.ok
            ? "Codeforces authentication is required. Provide an API key and API secret."
            : storedAuth.cause,
          credential: true
        });
      }

      return yield* requestCodeforcesWithAuth<T>(method, params, storedAuth.credentials);
    });

const getAllCodeforcesPages = <T>(
  getPage: (from: number, count: number) => Effect.Effect<ReadonlyArray<T>, CodeforcesApiError, DatabaseServiceTag | AppUserIdTag>,
  pageSize = CODEFORCES_PAGE_SIZE,
  from = 1,
  items: ReadonlyArray<T> = []
): Effect.Effect<ReadonlyArray<T>, CodeforcesApiError, DatabaseServiceTag | AppUserIdTag> =>
  getPage(from, pageSize).pipe(
    Effect.flatMap((page) => {
      const nextItems = [...items, ...page];

      return page.length < pageSize
        ? Effect.succeed(nextItems)
        : getAllCodeforcesPages(getPage, pageSize, from + pageSize, nextItems);
    })
  );

const isNotFoundError = (error: CodeforcesApiError): boolean =>
  /not found|not exist/i.test(error.comment ?? "");

const isJudgeApiError = (error: CodeforcesApiError): boolean =>
  error.comment !== undefined;

const isCredentialError = (error: CodeforcesApiError): boolean =>
  error.credential === true ||
  /api(?:key|sig)|credential|access|denied|permission|private|not authorized|unauthorized|forbidden|invalid/i.test(
    error.comment ?? ""
  );

const isUnavailableError = (error: CodeforcesApiError): boolean =>
  error.unavailable === true ||
  /Codeforces API is unavailable|temporarily unavailable|service unavailable|bad gateway|gateway timeout/i.test(
    error.comment ?? ""
  );

const toJudgeError = (
  judgeId: string,
  resource: JudgeResource,
  error: CodeforcesApiError
): JudgeNotFoundError | JudgeUnavailableError | JudgeAPIError | JudgeCredentialError => {
  if (isNotFoundError(error)) {
    return new JudgeNotFoundError({ resource, judgeId });
  }

  if (isCredentialError(error)) {
    return new JudgeCredentialError({ judgeId, cause: error.comment });
  }

  if (isUnavailableError(error)) {
    return new JudgeUnavailableError({ judgeId, cause: error.comment ?? error.cause });
  }

  if (isJudgeApiError(error)) {
    return new JudgeAPIError({ judgeId, cause: error.comment });
  }

  return new JudgeUnavailableError({ judgeId, cause: error.cause });
};

const toPreviewContest = (contest: CodeforcesContest): JudgePreviewContest => ({
  judgeId: String(contest.id),
  name: contest.name
});

const mergePreviewContests = (
  ...catalogs: ReadonlyArray<ReadonlyArray<JudgePreviewContest>>
): readonly JudgePreviewContest[] => [
  ...new Map(
    catalogs.flatMap((catalog) => catalog).map((contest) => [contest.judgeId, contest])
  ).values()
];

const toProblem = (
  problem: CodeforcesProblem,
  problemIndex: number,
  rows: ReadonlyArray<CodeforcesRanklistRow>
): Problem => ({
  judgeId: `${problem.contestId ?? ""}${problem.index}`,
  name: `${problem.index}. ${problem.name}`,
  solves: rows.reduce((total, row) => {
    const result = row.problemResults[problemIndex];
    return total + (result?.points !== undefined && result.points > 0 ? 1 : 0);
  }, 0),
  link: `${CODEFORCES_GYM_URL}/${problem.contestId ?? ""}/problem/${problem.index}`
});

const toRegularCatalogProblem = (
  problem: CodeforcesProblem & { readonly contestId: number },
  solves: number
): JudgeRegularCatalogProblem => ({
  judgeId: `${problem.contestId}${problem.index}`,
  judgeContestId: String(problem.contestId),
  name: `${problem.index}. ${problem.name}`,
  solves,
  rating: problem.rating,
  tags: problem.tags ?? [],
  link: `${CODEFORCES_CONTEST_URL}/${problem.contestId}/problem/${problem.index}`
});

const isContestDifficulty = (value: number | undefined): value is number =>
  value !== undefined && Number.isInteger(value) && value >= 1 && value <= 5;

const contestStars = (contest: CodeforcesContest): number =>
  isContestDifficulty(contest.difficulty)
    ? contest.difficulty
    : estimateContestStarsFromName(contest.name) || 3;

const toContest = (standings: CodeforcesStandings): JudgeContest => {
  const rows = standings.rows;

  return {
    judgeId: String(standings.contest.id),
    name: standings.contest.name,
    participants: rows.length,
    problems: standings.problems.map((problem, index) => toProblem(problem, index, rows)),
    stars: contestStars(standings.contest)
  };
};

const mergeStandingsPages = (
  pages: ReadonlyArray<CodeforcesStandings>
): CodeforcesStandings | undefined => {
  const [firstPage, ...remainingPages] = pages;

  if (firstPage === undefined) {
    return undefined;
  }

  return {
    ...firstPage,
    rows: remainingPages.reduce(
      (rows, page) => [...rows, ...page.rows],
      [...firstPage.rows] as ReadonlyArray<CodeforcesRanklistRow>
    )
  };
};

const toSubmissionStatus = (verdict: string | undefined): SUBMISSION_STATUSES => {
  switch (verdict) {
    case "OK":
      return SUBMISSION_STATUSES.AC;
    case "TIME_LIMIT_EXCEEDED":
      return SUBMISSION_STATUSES.TLE;
    case "MEMORY_LIMIT_EXCEEDED":
      return SUBMISSION_STATUSES.MLE;
    case "RUNTIME_ERROR":
    case "IDLENESS_LIMIT_EXCEEDED":
    case "SECURITY_VIOLATED":
      return SUBMISSION_STATUSES.RTE;
    default:
      return SUBMISSION_STATUSES.WA;
  }
};

const toSubmission = (submission: CodeforcesSubmission): JudgeSubmission => ({
  judgeId: String(submission.id),
  judgeContestId: String(submission.contestId),
  judgeProblemId: `${submission.contestId}${submission.problem.index}`,
  problemName: `${submission.problem.index}. ${submission.problem.name}`,
  verdict: toSubmissionStatus(submission.verdict),
  submittedAt: new Date(submission.creationTimeSeconds * 1000)
});

const isGymSubmission = (submission: CodeforcesSubmission): boolean =>
  submission.contestId >= CODEFORCES_GYM_CONTEST_ID_MIN &&
  submission.contestId <= CODEFORCES_GYM_CONTEST_ID_MAX;

const isGymContestId = (contestId: number): boolean =>
  contestId >= CODEFORCES_GYM_CONTEST_ID_MIN &&
  contestId <= CODEFORCES_GYM_CONTEST_ID_MAX;

const codeforcesContestLink = (contestJudgeId: string): string => {
  const contestId = Number(contestJudgeId);
  return Number.isInteger(contestId) && isGymContestId(contestId)
    ? `${CODEFORCES_GYM_URL}/${encodeURIComponent(contestJudgeId)}`
    : `${CODEFORCES_CONTEST_URL}/${encodeURIComponent(contestJudgeId)}`;
};

const withCodeforcesContestLink = (contest: JudgePreviewContest): JudgePreviewContest => ({
  ...contest,
  link: contest.link ?? codeforcesContestLink(contest.judgeId)
});

const getAllContests = (): Effect.Effect<ReadonlyArray<CodeforcesContest>, CodeforcesApiError> =>
  requestCodeforcesPublic<ReadonlyArray<CodeforcesContest>>("contest.list", {
    gym: true
  });

const getRegularContests = (): Effect.Effect<ReadonlyArray<CodeforcesContest>, CodeforcesApiError> =>
  requestCodeforcesPublic<ReadonlyArray<CodeforcesContest>>("contest.list");

const getProblemset = (): Effect.Effect<CodeforcesProblemset, CodeforcesApiError> =>
  requestCodeforcesPublic<CodeforcesProblemset>("problemset.problems");

const getAllStandingPages = (
  contestId: string,
  requestCodeforces: RequestCodeforces
): Effect.Effect<ReadonlyArray<CodeforcesStandings>, CodeforcesApiError, DatabaseServiceTag | AppUserIdTag> =>
  getAllCodeforcesPages(
    (from, count) =>
      requestCodeforces<CodeforcesStandings>("contest.standings", {
        contestId,
        from,
        count,
        showUnofficial: true
      }).pipe(Effect.map((standings) => [standings])),
  );

const getAllSubmissions = (
  handle: string,
  requestCodeforces: RequestCodeforces
): Effect.Effect<ReadonlyArray<CodeforcesSubmission>, CodeforcesApiError, DatabaseServiceTag | AppUserIdTag> =>
  getAllCodeforcesPages(
    (from, count) =>
      requestCodeforces<ReadonlyArray<CodeforcesSubmission>>("user.status", {
        handle,
        from,
        count
      }),
  );

const validateCodeforcesUserInfo = (
  handle: string,
  auth: Required<CodeforcesAuth>
): Effect.Effect<void, JudgeError> =>
  requestCodeforcesWithAuth<ReadonlyArray<CodeforcesUser>>("user.info", {
    handles: handle,
    historic: false
  }, auth).pipe(
    Effect.mapError((error) =>
      isNotFoundError(error)
        ? new JudgeCredentialError({
            judgeId: handle,
            cause: `Codeforces handle does not exist: ${handle}.`
          })
        : toJudgeError(handle, "user", error)
    ),
    Effect.flatMap((users) =>
      users[0] === undefined
        ? Effect.fail(new JudgeCredentialError({
            judgeId: handle,
            cause: `Codeforces handle does not exist: ${handle}.`
          }))
        : Effect.void
    )
  );

const validateCodeforcesAuthentication = (
  input: JudgeAuthenticationInput
): Effect.Effect<void, JudgeError> => {
  if (input.provider !== "codeforces") {
    return Effect.fail(new JudgeCredentialError({
      judgeId: "codeforces",
      cause: "Codeforces authentication input is required."
    }));
  }

  const handle = input.providerUserKey?.trim();

  if (handle === undefined || handle === "") {
    return Effect.fail(new JudgeCredentialError({
      judgeId: "codeforces",
      cause: "Codeforces handle is required to validate credentials."
    }));
  }

  const auth = {
    apiKey: input.codeforces.apiKey,
    apiSecret: input.codeforces.apiSecret
  };

  if (!hasCodeforcesAuth(auth)) {
    return Effect.fail(new JudgeCredentialError({
      judgeId: "codeforces",
      cause: "Codeforces authentication is required. Provide an API key and API secret."
    }));
  }

  return validateCodeforcesUserInfo(handle, auth).pipe(
    Effect.flatMap(() =>
      requestCodeforcesWithAuth<ReadonlyArray<string>>("user.friends", undefined, auth).pipe(
        Effect.mapError((error) => toJudgeError("codeforces", "user", error))
      )
    ),
    Effect.asVoid
  );
};

export const getCodeforcesContests = (_options?: GetContestsOptions) =>
  getAllContests().pipe(
    Effect.map((contests) =>
      contests
        .filter((contest) => isGymContestId(contest.id))
        .map(toPreviewContest)
    ),
    Effect.mapError((error) => toJudgeError("codeforces", "contest", error))
  );

export const getCodeforcesContest = (contestId: string) => {
  const requestCodeforces = makeCodeforcesRequester();

  return getAllStandingPages(contestId, requestCodeforces).pipe(
    Effect.mapError((error) => toJudgeError(contestId, "contest", error)),
    Effect.flatMap((pages) => {
      const standings = mergeStandingsPages(pages);

      return standings === undefined
        ? Effect.fail(new JudgeNotFoundError({ resource: JUDGE_RESOURCES.Contest, judgeId: contestId }))
        : Effect.succeed(standings);
    }),
    Effect.map(toContest)
  );
};

export const getCodeforcesUser = (handle: string) => {
  const requestCodeforces = makeCodeforcesRequester();

  return requestCodeforces<ReadonlyArray<CodeforcesUser>>("user.info", {
    handles: handle,
    historic: false
  }).pipe(
    Effect.mapError((error) => toJudgeError(handle, "user", error)),
    Effect.flatMap((users) => {
      const user = users[0];

      return user === undefined
        ? Effect.fail(new JudgeNotFoundError({ resource: JUDGE_RESOURCES.User, judgeId: handle }))
        : Effect.succeed({ handle: user.handle });
    })
  );
};

export const getCodeforcesSubmissions = (options?: GetSubmissionsOptions) => {
  if (options?.userHandle === undefined || options.userHandle.trim() === "") {
    return Effect.succeed([]);
  }

  const requestCodeforces = makeCodeforcesRequester();
  const handle = options.userHandle.trim();

  return getAllSubmissions(handle, requestCodeforces).pipe(
    Effect.map((submissions) =>
      submissions
        .filter((submission) => submission.contestId !== undefined && submission.problem.index !== undefined)
        .map(toSubmission)
    ),
    Effect.mapError((error) => toJudgeError(handle, "user", error))
  );
};

export const getCodeforcesRegularContests = () => {
  return getRegularContests().pipe(
    Effect.map((contests) =>
      contests
        .filter((contest) => !isGymSubmission({
          id: 0,
          contestId: contest.id,
          creationTimeSeconds: 0,
          problem: {
            contestId: contest.id,
            index: "",
            name: contest.name
          }
        }) && isNormalRegularCodeforcesContestName(contest.name))
        .map(toPreviewContest)
    ),
    Effect.mapError((error) => toJudgeError("codeforces", "contest", error))
  );
};

export const getCodeforcesRegularProblems = () =>
  getProblemset().pipe(
    Effect.map((problemset) => {
      const solvesByProblemId = new Map(
        problemset.problemStatistics.map((statistic) => [
          `${statistic.contestId}${statistic.index}`,
          statistic.solvedCount
        ])
      );
      const regularProblems = problemset.problems
        .filter((problem): problem is CodeforcesProblem & { readonly contestId: number } =>
          problem.contestId !== undefined &&
          !isGymSubmission({
            id: 0,
            contestId: problem.contestId,
            creationTimeSeconds: 0,
            problem
          })
        )
        .map((problem) =>
          toRegularCatalogProblem(
            problem,
            solvesByProblemId.get(`${problem.contestId}${problem.index}`) ?? 0
          )
        );

      return regularProblems;
    }),
    Effect.mapError((error) => toJudgeError("codeforces", "contest", error))
  );

const codeforcesSyncOperations: CodeforcesSyncOperations = {
  getContest: getCodeforcesContest,
  getSubmissions: getCodeforcesSubmissions
};

export const syncCodeforcesContestFinderCatalog = (
  database: DatabaseService
): ReturnType<Judge["syncContestFinderCatalog"]> => Effect.gen(function* () {
  const gymCatalog = yield* getCodeforcesContests();
  const regularCatalog = yield* getCodeforcesRegularContests();
  const catalog = mergePreviewContests(gymCatalog, regularCatalog).map(withCodeforcesContestLink);
  const contestsUpserted = yield* upsertContestFinderCatalog(
    database,
    "codeforces",
    JUDGES.Codeforces,
    catalog
  ).pipe(
    Effect.mapError((error) => new JudgeAPIError({ judgeId: "codeforces", cause: error }))
  );
  const regularProblemCatalog = yield* getCodeforcesRegularProblems();
  const regularImport = yield* upsertCodeforcesRegularCatalog(
    database,
    "codeforces",
    new Set(regularCatalog.map((contest) => contest.judgeId)),
    regularCatalog.map(withCodeforcesContestLink),
    regularProblemCatalog
  );

  return {
    contestsUpserted,
    regularContestsImported: regularImport.contestsImported,
    regularProblemsImported: regularImport.problemsImported
  };
});

export const makeCodeforcesCredentialValidator = (): JudgeCredentialValidator => ({
  validateAuthentication: validateCodeforcesAuthentication
});

const syncCodeforcesFriendSubmissions = (
  database: DatabaseService,
  input: Parameters<Judge["syncFriendSubmissions"]>[0]
): ReturnType<Judge["syncFriendSubmissions"]> => Effect.gen(function* () {
  const emit = input.emit ?? (() => Effect.void);
  const stepsTotal = input.friends.length;
  let stepsDone = 0;

  yield* emit({
    type: FRIEND_SUBMISSION_SYNC_EVENT_TYPES.Started,
    provider: "codeforces",
    stepsTotal,
    stepsLeft: stepsTotal
  });
  const contestCatalog = yield* getContestFinderCatalog(
    database,
    "codeforces",
    JUDGES.Codeforces
  ).pipe(
    Effect.mapError((error) => new JudgeAPIError({ judgeId: "codeforces", cause: error }))
  );
  let friendsProcessed = 0;

  yield* emit({
    type: FRIEND_SUBMISSION_SYNC_EVENT_TYPES.FriendsSyncing,
    provider: "codeforces",
    friendsTotal: input.friends.length,
    stepsTotal,
    stepsLeft: stepsTotal - stepsDone
  });
  for (const friend of input.friends) {
    yield* emit({
      type: FRIEND_SUBMISSION_SYNC_EVENT_TYPES.FriendSyncing,
      provider: "codeforces",
      userHandle: friend.username,
      friendIndex: friendsProcessed + 1,
      friendsTotal: input.friends.length,
      stepsTotal,
      stepsLeft: stepsTotal - stepsDone
    });
    const submissions = yield* getCodeforcesSubmissions({ userHandle: friend.username });
    yield* syncUserSubmissions(database, "codeforces", JUDGES.Codeforces, friend, {
      queueMissingSubmissions: false,
      userSubmissions: submissions
    }).pipe(
      Effect.mapError((error) => new JudgeAPIError({ judgeId: friend.username, cause: error }))
    );
    yield* upsertContestFinderParticipations(
      database,
      "codeforces",
      JUDGES.Codeforces,
      codeforcesContestParticipations(friend, submissions, contestCatalog)
    ).pipe(
      Effect.mapError((error) => new JudgeAPIError({ judgeId: friend.username, cause: error }))
    );
    friendsProcessed += 1;
    stepsDone += 1;
    yield* emit({
      type: FRIEND_SUBMISSION_SYNC_EVENT_TYPES.FriendSynced,
      provider: "codeforces",
      userHandle: friend.username,
      friendIndex: friendsProcessed,
      friendsTotal: input.friends.length,
      friendsProcessed: 1,
      stepsTotal,
      stepsLeft: stepsTotal - stepsDone
    });
  }

  return {
    friendsProcessed
  };
});

export const makeCodeforcesJudge = (database: DatabaseService): Judge => {
  return {
    syncFriendSubmissions: (input) => syncCodeforcesFriendSubmissions(database, input),
    syncContestFinderCatalog: () => syncCodeforcesContestFinderCatalog(database),

    refetchContest: (input) =>
      syncCodeforcesContest(database, input.provider, input.contestJudgeId, codeforcesSyncOperations).pipe(
        Effect.asVoid
      ),

    sync: (input) => createCodeforcesJudgeSync(database, input, codeforcesSyncOperations)
  };
};
