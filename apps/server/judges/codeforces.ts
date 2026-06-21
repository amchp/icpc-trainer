
import { SUBMISSION_STATUSES } from "@icpc-trainer/shared";
import { Effect, Layer } from "effect";

import {
  type GetSubmissionsOptions,
  type Judge,
  type JudgeContest,
  JudgeNotFoundError,
  type JudgePreviewContest,
  type JudgeSubmission,
  JudgeTag,
  JudgeUnavailableError,
  type Problem,
  JudgeAPIError
} from "./judges.js";

const CODEFORCES_API_URL = "https://codeforces.com/api";
const CODEFORCES_GYM_URL = "https://codeforces.com/gym";
const CODEFORCES_PARTICIPANT_TYPES = "CONTESTANT;VIRTUAL";
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
}

const toError = (error: unknown): Error =>
  error instanceof Error ? error : new Error(String(error));

const buildUrl = (method: string, params: Record<string, CodeforcesRequestParam> = {}): string => {
  const url = new URL(`${CODEFORCES_API_URL}/${method}`);

  for (const [key, value] of Object.entries(params)) {
    if (value !== undefined) {
      url.searchParams.set(key, String(value));
    }
  }

  return url.toString();
};

const requestCodeforces = <T>(
  method: string,
  params?: Record<string, CodeforcesRequestParam>
): Effect.Effect<T, CodeforcesApiError> =>
  Effect.tryPromise({
    try: async () => {
      const response = await fetch(buildUrl(method, params));

      if (!response.ok) {
        throw new Error(`Codeforces API request failed with HTTP ${response.status}`);
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

const getAllCodeforcesPages = <T>(
  getPage: (from: number, count: number) => Effect.Effect<ReadonlyArray<T>, CodeforcesApiError>,
  from = 1,
  items: ReadonlyArray<T> = []
): Effect.Effect<ReadonlyArray<T>, CodeforcesApiError> =>
  getPage(from, CODEFORCES_PAGE_SIZE).pipe(
    Effect.flatMap((page) => {
      const nextItems = [...items, ...page];

      return page.length < CODEFORCES_PAGE_SIZE
        ? Effect.succeed(nextItems)
        : getAllCodeforcesPages(getPage, from + CODEFORCES_PAGE_SIZE, nextItems);
    })
  );

const isNotFoundError = (error: CodeforcesApiError): boolean =>
  /not found|not exist/i.test(error.comment ?? "");

const isJudgeApiError = (error: CodeforcesApiError): boolean =>
  error.comment !== undefined;

const toJudgeError = (
  judgeId: string,
  resource: "contest" | "user",
  error: CodeforcesApiError
): JudgeNotFoundError | JudgeUnavailableError | JudgeAPIError => {
  if (isNotFoundError(error)) {
    return new JudgeNotFoundError({ resource, judgeId });
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

const getAllContests = (): Effect.Effect<ReadonlyArray<CodeforcesContest>, CodeforcesApiError> =>
  getAllCodeforcesPages(
    (from, count) =>
      requestCodeforces<ReadonlyArray<CodeforcesContest>>("contest.list", {
        gym: true,
        from,
        count
      }),
  );

const getAllStandingPages = (
  contestId: string
): Effect.Effect<ReadonlyArray<CodeforcesStandings>, CodeforcesApiError> =>
  getAllCodeforcesPages(
    (from, count) =>
      requestCodeforces<CodeforcesStandings>("contest.standings", {
        contestId,
        from,
        count,
        showUnofficial: true,
        participantTypes: CODEFORCES_PARTICIPANT_TYPES
      }).pipe(Effect.map((standings) => [standings])),
  );

const getAllSubmissions = (
  handle: string
): Effect.Effect<ReadonlyArray<CodeforcesSubmission>, CodeforcesApiError> =>
  getAllCodeforcesPages(
    (from, count) =>
      requestCodeforces<ReadonlyArray<CodeforcesSubmission>>("user.status", {
        handle,
        from,
        count
      }),
  );

export const makeCodeforcesJudge = (): Judge => ({
  getContests: getAllContests().pipe(
    Effect.map((contests) => contests.map(toPreviewContest)),
    Effect.mapError((error) => new JudgeUnavailableError({ judgeId: "codeforces", cause: error }))
  ),

  getContest: (contestId) =>
    getAllStandingPages(contestId).pipe(
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
    requestCodeforces<ReadonlyArray<CodeforcesUser>>("user.info", { handles: handle, historic: false }).pipe(
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

    return getAllSubmissions(handle).pipe(
      Effect.map((submissions) => submissions.map(toSubmission)),
      Effect.mapError((error) => toJudgeError(handle, "user", error))
    );
  }
});

export const CodeforcesJudgeLive: Layer.Layer<JudgeTag> = Layer.succeed(
  JudgeTag,
  makeCodeforcesJudge()
);
