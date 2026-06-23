
import { getStoredCodeforcesCredentials } from "@icpc-trainer/api";
import { type DatabaseService, DatabaseServiceTag } from "@icpc-trainer/db";
import { JUDGES, SUBMISSION_STATUSES } from "@icpc-trainer/shared";
import { Effect, Layer } from "effect";
import { createHash, randomBytes } from "node:crypto";

import {
  type GetSubmissionsOptions,
  type Judge,
  type JudgeContest,
  type JudgeError,
  type JudgeAuthenticationInput,
  JudgeNotFoundError,
  type JudgePreviewContest,
  type JudgeSubmission,
  JudgeTag,
  JudgeUnavailableError,
  type Problem,
  JudgeAPIError,
  JudgeCredentialError
} from "./judges.js";
import {
  codeforcesContestParticipations,
  emptyContestFinderRefresh,
  upsertContestFinderCatalog,
  upsertContestFinderParticipations
} from "./contestFinder.js";
import { createCodeforcesJudgeSync } from "./sync/sync_codeforces.js";
import { estimateContestStarsFromName } from "./sync/problemRating.js";
import { notImplementedJudgeSync } from "./sync/sync.js";

const CODEFORCES_API_URL = "https://codeforces.com/api";
const CODEFORCES_GYM_URL = "https://codeforces.com/gym";
const CODEFORCES_GYM_CONTEST_ID_MIN = 100000;
const CODEFORCES_GYM_CONTEST_ID_MAX = 200000;
const CODEFORCES_PAGE_SIZE = 100_000;

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
) => Effect.Effect<T, CodeforcesApiError, DatabaseServiceTag>;

interface CodeforcesContest {
  readonly id: number;
  readonly name: string;
  readonly phase: string;
  readonly type: string;
  readonly difficulty?: number;
}

interface CodeforcesProblem {
  readonly contestId: number;
  readonly index: string;
  readonly name: string;
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

const requestCodeforcesWithAuth = <T>(
  method: string,
  params: Record<string, CodeforcesRequestParam> | undefined,
  auth: Required<CodeforcesAuth>
): Effect.Effect<T, CodeforcesApiError> =>
  Effect.tryPromise({
    try: async () => {
      const response = await fetch(buildSignedUrl(method, params, auth));
      if (!response.ok) {
        return Promise.reject(parseCodeforcesHttpError(response.status, await response.text()));
      }

      const payload = (await response.json()) as CodeforcesApiResponse<T>;

      if (payload.status === "FAILED") {
        return Promise.reject({ comment: payload.comment });
      }

      return payload.result;
    },
    catch: (cause): CodeforcesApiError => {
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
    }
  });

const makeCodeforcesRequester = (): RequestCodeforces =>
  <T>(method: string, params?: Record<string, CodeforcesRequestParam>) =>
    Effect.gen(function* () {
      const database = yield* DatabaseServiceTag;
      const storedAuth = getStoredCodeforcesCredentials({ database });
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
  getPage: (from: number, count: number) => Effect.Effect<ReadonlyArray<T>, CodeforcesApiError, DatabaseServiceTag>,
  pageSize = CODEFORCES_PAGE_SIZE,
  from = 1,
  items: ReadonlyArray<T> = []
): Effect.Effect<ReadonlyArray<T>, CodeforcesApiError, DatabaseServiceTag> =>
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
  resource: "contest" | "user",
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

const toProblem = (
  problem: CodeforcesProblem,
  problemIndex: number,
  rows: ReadonlyArray<CodeforcesRanklistRow>
): Problem => ({
  judgeId: `${problem.contestId}${problem.index}`,
  name: `${problem.index}. ${problem.name}`,
  solves: rows.reduce((total, row) => {
    const result = row.problemResults[problemIndex];
    return total + (result?.points !== undefined && result.points > 0 ? 1 : 0);
  }, 0),
  link: `${CODEFORCES_GYM_URL}/${problem.contestId}/problem/${problem.index}`
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
  judgeProblemId: `${submission.problem.contestId}${submission.problem.index}`,
  problemName: `${submission.problem.index}. ${submission.problem.name}`,
  verdict: toSubmissionStatus(submission.verdict),
  submittedAt: new Date(submission.creationTimeSeconds * 1000)
});

const isGymSubmission = (submission: CodeforcesSubmission): boolean =>
  submission.contestId >= CODEFORCES_GYM_CONTEST_ID_MIN &&
  submission.contestId <= CODEFORCES_GYM_CONTEST_ID_MAX;

const getAllContests = (
  requestCodeforces: RequestCodeforces
): Effect.Effect<ReadonlyArray<CodeforcesContest>, CodeforcesApiError, DatabaseServiceTag> =>
  requestCodeforces<ReadonlyArray<CodeforcesContest>>("contest.list", {
    gym: true
  });

const getAllStandingPages = (
  contestId: string,
  requestCodeforces: RequestCodeforces
): Effect.Effect<ReadonlyArray<CodeforcesStandings>, CodeforcesApiError, DatabaseServiceTag> =>
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
): Effect.Effect<ReadonlyArray<CodeforcesSubmission>, CodeforcesApiError, DatabaseServiceTag> =>
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

export const makeCodeforcesJudge = (database?: DatabaseService): Judge => {
  const requestCodeforces = makeCodeforcesRequester();

  let judge: Judge;

  judge = {
    validateAuthentication: validateCodeforcesAuthentication,

    getContests: () =>
      getAllContests(requestCodeforces).pipe(
        Effect.map((contests) => contests.map(toPreviewContest)),
        Effect.mapError((error) => toJudgeError("codeforces", "contest", error))
      ),

    getContest: (contestId) =>
      getAllStandingPages(contestId, requestCodeforces).pipe(
        Effect.mapError((error) => toJudgeError(contestId, "contest", error)),
        Effect.flatMap((pages) => {
          const standings = mergeStandingsPages(pages);

          return standings === undefined
            ? Effect.fail(new JudgeNotFoundError({ resource: "contest", judgeId: contestId }))
            : Effect.succeed(standings);
        }),
        Effect.map(toContest)
      ),

    getUser: (handle) =>
      requestCodeforces<ReadonlyArray<CodeforcesUser>>("user.info", {
        handles: handle,
        historic: false
      }).pipe(
        Effect.mapError((error) => toJudgeError(handle, "user", error)),
        Effect.flatMap((users) => {
          const user = users[0];

          return user === undefined
            ? Effect.fail(new JudgeNotFoundError({ resource: "user", judgeId: handle }))
            : Effect.succeed({ handle: user.handle });
        })
      ),

    getSubmissions: (options?: GetSubmissionsOptions) => {
      if (options?.userHandle === undefined || options.userHandle.trim() === "") {
        return Effect.succeed([]);
      }

      const handle = options.userHandle.trim();

      return getAllSubmissions(handle, requestCodeforces).pipe(
        Effect.map((submissions) => submissions.filter(isGymSubmission).map(toSubmission)),
        Effect.mapError((error) => toJudgeError(handle, "user", error))
      );
    },

    refreshContestFinder: (input) => database === undefined
      ? Effect.succeed(emptyContestFinderRefresh())
      : Effect.gen(function* () {
          const emit = input.emit ?? (() => Effect.void);
          const stepsTotal = input.friends.length + 1;
          let stepsDone = 0;

          yield* emit({
            type: "started",
            provider: "codeforces",
            stepsTotal,
            stepsLeft: stepsTotal
          });
          yield* emit({
            type: "catalog.syncing",
            provider: "codeforces",
            step: "catalog",
            stepsTotal,
            stepsLeft: stepsTotal - stepsDone
          });
          const catalog = yield* judge.getContests();
          const contestsUpserted = yield* upsertContestFinderCatalog(
            database,
            "codeforces",
            JUDGES.Codeforces,
            catalog
          ).pipe(
            Effect.mapError((error) => new JudgeAPIError({ judgeId: "codeforces", cause: error }))
          );
          stepsDone += 1;
          yield* emit({
            type: "catalog.synced",
            provider: "codeforces",
            step: "catalog",
            contestsUpserted,
            stepsTotal,
            stepsLeft: stepsTotal - stepsDone
          });
          const contestNames = new Map(catalog.map((contest) => [contest.judgeId, contest.name]));
          let friendsProcessed = 0;

          yield* emit({
            type: "friends.syncing",
            provider: "codeforces",
            step: "friends",
            friendsTotal: input.friends.length,
            stepsTotal,
            stepsLeft: stepsTotal - stepsDone
          });
          for (const friend of input.friends) {
            yield* emit({
              type: "friends.friendSyncing",
              provider: "codeforces",
              step: "friends",
              userHandle: friend.username,
              friendIndex: friendsProcessed + 1,
              friendsTotal: input.friends.length,
              stepsTotal,
              stepsLeft: stepsTotal - stepsDone
            });
            const submissions = yield* judge.getSubmissions({ userHandle: friend.username });
            yield* upsertContestFinderParticipations(
              database,
              "codeforces",
              JUDGES.Codeforces,
              codeforcesContestParticipations(friend, submissions, contestNames)
            ).pipe(
              Effect.mapError((error) => new JudgeAPIError({ judgeId: friend.username, cause: error }))
            );
            friendsProcessed += 1;
            stepsDone += 1;
            yield* emit({
              type: "friends.friendSynced",
              provider: "codeforces",
              step: "friends",
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

    sync: database === undefined
      ? notImplementedJudgeSync
      : (input) => createCodeforcesJudgeSync(database, input, judge)
  };

  return judge;
};

export const CodeforcesJudgeLive: Layer.Layer<JudgeTag> = Layer.succeed(
  JudgeTag,
  makeCodeforcesJudge()
);
