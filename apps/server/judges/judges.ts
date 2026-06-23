
import { Context, Data, Effect } from "effect";
import { SUBMISSION_STATUSES } from "@icpc-trainer/shared";
import type { DatabaseServiceTag } from "@icpc-trainer/db";
import type { ContestFinderRefreshEvent, JudgeSyncEvent, JudgeSyncInput } from "@icpc-trainer/api";
import type { SyncUser } from "./sync/sync.js";

export class JudgeNotFoundError extends Data.TaggedError("JudgeNotFoundError")<{
  readonly resource: "contest" | "user";
  readonly judgeId: string;
}> {}

export class JudgeUnavailableError extends Data.TaggedError("JudgeUnavailableError")<{
  readonly judgeId: string;
  readonly cause?: unknown;
}> {}

export class JudgeAPIError extends Data.TaggedError("JudgeAPIError")<{
  readonly judgeId: string;
  readonly cause?: unknown;
}> {}

export class JudgeCredentialError extends Data.TaggedError("JudgeCredentialError")<{
  readonly judgeId: string;
  readonly cause?: unknown;
}> {}

export type JudgeError =
  | JudgeNotFoundError
  | JudgeUnavailableError
  | JudgeAPIError
  | JudgeCredentialError;

export interface JudgePreviewContest {
  readonly judgeId: string;
  readonly name: string;
}

export interface Problem {
  readonly judgeId: string;
  readonly name: string;
  readonly solves: number;
  readonly link: string;
}

export interface JudgeContest {
  readonly judgeId: string;
  readonly name: string;
  readonly participants: number;
  readonly problems: ReadonlyArray<Problem>;
  readonly stars: number;
}

export interface JudgeUser {
  readonly handle: string;
}

export interface JudgeSubmission {
  readonly judgeId: string;
  readonly judgeContestId?: string;
  readonly judgeProblemId: string;
  readonly problemName: string;
  readonly verdict: SUBMISSION_STATUSES;
  readonly submittedAt: Date;
}

export interface JudgeRegularCatalogContest {
  readonly judgeId: string;
  readonly name: string;
}

export interface JudgeRegularCatalogProblem {
  readonly judgeId: string;
  readonly judgeContestId: string;
  readonly name: string;
  readonly link: string;
  readonly solves: number;
  readonly rating?: number;
  readonly tags: readonly string[];
}

export interface GetContestsOptions {
  readonly userHandle?: string;
}

export interface GetSubmissionsOptions {
  readonly userHandle: string;
}

export interface RefreshContestFinderInput {
  readonly friends: readonly SyncUser[];
  readonly emit?: (event: ContestFinderRefreshEvent) => Effect.Effect<void>;
}

export interface RefreshContestFinderResult {
  readonly contestsUpserted: number;
  readonly friendsProcessed: number;
}

export type JudgeAuthenticationInput =
  | {
      readonly provider: "codeforces";
      readonly providerUserKey?: string;
      readonly codeforces: {
        readonly apiKey: string;
        readonly apiSecret: string;
      };
    }
  | {
      readonly provider: "qoj";
      readonly providerUserKey?: string;
      readonly qoj: {
        readonly cookieJar: string;
      };
    };

export interface Judge {
  readonly sync: (input: JudgeSyncInput) => AsyncIterable<JudgeSyncEvent>;
  readonly validateAuthentication: (
    input: JudgeAuthenticationInput,
  ) => Effect.Effect<void, JudgeError, DatabaseServiceTag>;
  readonly getContests: (
    options?: GetContestsOptions,
  ) => Effect.Effect<ReadonlyArray<JudgePreviewContest>, JudgeError, DatabaseServiceTag>;
  readonly getContest: (contestId: string) => Effect.Effect<JudgeContest, JudgeError, DatabaseServiceTag>;
  readonly getUser: (handle: string) => Effect.Effect<JudgeUser, JudgeError, DatabaseServiceTag>;
  readonly getSubmissions: (
    options?: GetSubmissionsOptions,
  ) => Effect.Effect<ReadonlyArray<JudgeSubmission>, JudgeError, DatabaseServiceTag>;
  readonly getRegularContests?: () => Effect.Effect<ReadonlyArray<JudgeRegularCatalogContest>, JudgeError, DatabaseServiceTag>;
  readonly getRegularProblems?: () => Effect.Effect<ReadonlyArray<JudgeRegularCatalogProblem>, JudgeError, DatabaseServiceTag>;
  readonly refreshContestFinder: (
    input: RefreshContestFinderInput,
  ) => Effect.Effect<RefreshContestFinderResult, JudgeError, DatabaseServiceTag>;
}

export class JudgeTag extends Context.Tag("@icpc-trainer/server/Judge")<
  JudgeTag,
  Judge
>() {}
