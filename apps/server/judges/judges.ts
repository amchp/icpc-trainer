
import { Context, Data, Effect } from "effect";
import { SUBMISSION_STATUSES, type JudgeResource } from "@icpc-trainer/shared";
import type { DatabaseServiceTag } from "@icpc-trainer/db";
import type {
  AppUserIdTag,
  AppScopedJudgeSyncInput,
  FriendSubmissionSyncEvent,
  JudgeSyncEvent,
  RefetchContestInput
} from "@icpc-trainer/api";
import type { SyncOperationError } from "./sync/sync.js";
import type { SyncUser } from "./sync/sync.js";

export class JudgeNotFoundError extends Data.TaggedError("JudgeNotFoundError")<{
  readonly resource: JudgeResource;
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

export interface JudgeCatalogContest {
  readonly judgeId: string;
  readonly name: string;
  readonly link?: string;
}

export type JudgePreviewContest = JudgeCatalogContest;
export type JudgeRegularCatalogContest = JudgeCatalogContest;

export interface JudgeProblem {
  readonly judgeId: string;
  readonly judgeContestId?: string;
  readonly name: string;
  readonly solves: number;
  readonly link: string;
  readonly rating?: number;
  readonly tags?: readonly string[];
}

export type Problem = JudgeProblem;
export type JudgeRegularCatalogProblem = JudgeProblem;

export interface JudgeContest {
  readonly judgeId: string;
  readonly name: string;
  readonly link?: string;
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

export interface GetContestsOptions {
  readonly userHandle?: string;
}

export interface GetSubmissionsOptions {
  readonly userHandle: string;
}

export interface SyncFriendSubmissionsInput {
  readonly friends: readonly SyncUser[];
  readonly emit?: (event: FriendSubmissionSyncEvent) => Effect.Effect<void>;
}

export interface SyncFriendSubmissionsResult {
  readonly friendsProcessed: number;
}

export interface SyncContestFinderCatalogResult {
  readonly contestsUpserted: number;
  readonly regularContestsImported: number;
  readonly regularProblemsImported: number;
}

export type JudgeEffectContext = DatabaseServiceTag | AppUserIdTag;

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
  readonly sync: (input: AppScopedJudgeSyncInput) => AsyncIterable<JudgeSyncEvent>;
  readonly syncFriendSubmissions: (
    input: SyncFriendSubmissionsInput,
  ) => Effect.Effect<SyncFriendSubmissionsResult, JudgeError, JudgeEffectContext>;
  readonly syncContestFinderCatalog: (
  ) => Effect.Effect<SyncContestFinderCatalogResult, JudgeError | SyncOperationError, DatabaseServiceTag>;
  readonly refetchContest: (
    input: RefetchContestInput,
  ) => Effect.Effect<void, JudgeError | SyncOperationError, JudgeEffectContext>;
}

export interface JudgeCredentialValidator {
  readonly validateAuthentication: (
    input: JudgeAuthenticationInput,
  ) => Effect.Effect<void, JudgeError, DatabaseServiceTag>;
}

export class JudgeTag extends Context.Tag("@icpc-trainer/server/Judge")<
  JudgeTag,
  Judge
>() {}
