
import { getStoredCodeforcesCredentials } from "@icpc-trainer/api";
import { DatabaseServiceTag } from "@icpc-trainer/db";
import { SUBMISSION_STATUSES } from "@icpc-trainer/shared";
import { Effect, Layer } from "effect";
import { createHash, randomBytes } from "node:crypto";

import {
  type GetSubmissionsOptions,
  type Judge,
  type JudgeContest,
  type JudgeError,
  JudgeNotFoundError,
  type JudgePreviewContest,
  type JudgeSubmission,
  JudgeTag,
  JudgeUnavailableError,
  type Problem,
  JudgeAPIError,
  JudgeCredentialError
} from "./judges.js";

const CODEFORCES_API_URL = "https://codeforces.com/api";
const CODEFORCES_GYM_URL = "https://codeforces.com/gym";
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
  try {
    const payload = JSON.parse(body) as Partial<CodeforcesApiFailure>;

    if (typeof payload.comment === "string" && payload.comment.trim() !== "") {
      return {
        comment: `Codeforces API returned HTTP ${status}: ${payload.comment.trim()}`
      };
    }
  } catch {
    // Fall through to the plain-body message below.
  }

  const trimmedBody = body.trim();

  return {
    comment:
      trimmedBody === ""
        ? `Codeforces API returned HTTP ${status} with an empty response body.`
        : `Codeforces API returned HTTP ${status}: ${trimmedBody.slice(0, 500)}`
  };
};

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

      return yield* Effect.tryPromise({
        try: async () => {
        const response = await fetch(buildSignedUrl(method, params, storedAuth.credentials));
        if (!response.ok) {
          return Promise.reject(parseCodeforcesHttpError(response.status, await response.text()));
        }

        const payload = (await response.json()) as CodeforcesApiResponse<T>;

        if (payload.status === "FAILED") {
          return Promise.reject({ comment: payload.comment });
        }

        return payload.result;
      },
      catch: (cause): CodeforcesApiError =>
        typeof cause === "object" && cause !== null && "comment" in cause
          ? (cause as CodeforcesApiError)
          : { cause: toError(cause) }
      });
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

const toContest = (standings: CodeforcesStandings): JudgeContest => {
  const rows = standings.rows;

  return {
    judgeId: String(standings.contest.id),
    name: standings.contest.name,
    participants: rows.length,
    problems: standings.problems.map((problem, index) => toProblem(problem, index, rows)),
    stars: standings.contest.difficulty ?? 0
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
  problemName: `${submission.problem.index}. ${submission.problem.name}`,
  verdict: toSubmissionStatus(submission.verdict),
  submittedAt: new Date(submission.creationTimeSeconds * 1000)
});

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

export const makeCodeforcesJudge = (): Judge => {
  const requestCodeforces = makeCodeforcesRequester();

  return {
    getContests: getAllContests(requestCodeforces).pipe(
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
        Effect.map((submissions) => submissions.map(toSubmission)),
        Effect.mapError((error) => toJudgeError(handle, "user", error))
      );
    }
  };
};

export const CodeforcesJudgeLive: Layer.Layer<JudgeTag> = Layer.succeed(
  JudgeTag,
  makeCodeforcesJudge()
);
