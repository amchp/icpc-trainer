import { TRPCError, type initTRPC } from "@trpc/server";
import {
  JUDGE_SYNC_EVENT_TYPES as JudgeSyncEventType,
  JUDGE_SYNC_STEPS as JudgeSyncStep,
  PROVIDER_STATE_EVENT_TYPES,
  RUN_STATUSES as SyncRunStatus,
  SYNC_ERROR_PHASES,
  SYNC_STEP_STATUSES as SyncStepStatus,
  type LocalizedMessageReference
} from "@icpc-trainer/shared";
import { z } from "zod";

import type { ApiContext } from "./index.js";
import { requireAppUser } from "./appUsers.js";
import { judgeProviderSchema } from "./judgeProvider.js";
import type { RefetchContestInput } from "./upsolving.js";

type TrpcInstance = ReturnType<typeof initTRPC.context<ApiContext>>["create"] extends () => infer T
  ? T
  : never;

export const judgeSyncInputSchema = z.object({
  provider: judgeProviderSchema
});

export type JudgeSyncInput = z.infer<typeof judgeSyncInputSchema>;
export type AppScopedJudgeSyncInput = JudgeSyncInput & {
  readonly appUserId: number;
};

export interface JudgeSyncSummary {
  readonly usersProcessed: number;
  readonly submissionsFetched: number;
  readonly submissionsInserted: number;
  readonly submissionsUpdated: number;
  readonly submissionsSkipped: number;
  readonly contestsSynced: number;
  readonly regularContestsImported: number;
  readonly regularProblemsImported: number;
  readonly regularPendingSubmissionsRetried: number;
  readonly errors: number;
}

export {
  JudgeSyncEventType,
  JudgeSyncStep,
  SyncRunStatus,
  SyncStepStatus
};

export interface JudgeSyncStepState {
  readonly status: SyncStepStatus;
  readonly total: number;
  readonly processed: number;
  readonly current?: string;
}

interface JudgeSyncEventBase {
  readonly provider: JudgeSyncInput["provider"];
  readonly stepsTotal: number;
  readonly stepsLeft: number;
}

export type JudgeSyncEvent =
  | (JudgeSyncEventBase & {
      readonly type: JudgeSyncEventType.Started;
    })
  | (JudgeSyncEventBase & {
      readonly type: JudgeSyncEventType.Step;
      readonly step: JudgeSyncStep;
      readonly stepStatus: SyncStepStatus.Running | SyncStepStatus.Completed | SyncStepStatus.Error;
      readonly processed: number;
      readonly total: number;
      readonly current?: string;
    })
  | (JudgeSyncEventBase & {
      readonly type: JudgeSyncEventType.Error;
      readonly phase: JudgeSyncStep | SYNC_ERROR_PHASES;
      readonly step?: JudgeSyncStep;
      readonly message: LocalizedMessageReference;
      readonly userHandle?: string;
      readonly contestJudgeId?: string;
      readonly judgeId?: string;
    })
  | {
      readonly type: JudgeSyncEventType.Completed;
      readonly provider: JudgeSyncInput["provider"];
      readonly stepsTotal: number;
      readonly stepsLeft: 0;
      readonly summary: JudgeSyncSummary;
    };

export interface JudgeSyncProviderState {
  readonly type: PROVIDER_STATE_EVENT_TYPES.State;
  readonly provider: JudgeSyncInput["provider"];
  readonly status: SyncRunStatus;
  readonly stepsTotal: number;
  readonly stepsLeft: number;
  readonly latestEvent: JudgeSyncEvent | null;
  readonly summary: JudgeSyncSummary | null;
  readonly steps: {
    readonly submissions: JudgeSyncStepState;
    readonly contests: JudgeSyncStepState;
    readonly regularCatalog: JudgeSyncStepState;
  };
}

export type JudgeSyncObserveEvent = JudgeSyncProviderState;

export interface JudgeSyncService {
  readonly start: (input: AppScopedJudgeSyncInput) => Promise<void>;
  readonly observe: (input: AppScopedJudgeSyncInput) => AsyncIterable<JudgeSyncObserveEvent>;
  readonly refetchContest?: (input: RefetchContestInput & { readonly appUserId: number }) => Promise<void>;
}

export const createJudgesRouter = (t: TrpcInstance) =>
  t.router({
    startSync: t.procedure.input(judgeSyncInputSchema).mutation(async ({ ctx, input }) => {
      if (ctx.judges.start === undefined) {
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: "Judge sync service is not configured."
        });
      }

      await ctx.judges.start({ ...input, appUserId: requireAppUser(ctx.appUser).id });
    }),
    observeSync: t.procedure.input(judgeSyncInputSchema).subscription(async function* ({ ctx, input }) {
      if (ctx.judges.observe === undefined) {
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: "Judge sync service is not configured."
        });
      }

      yield* ctx.judges.observe({ ...input, appUserId: requireAppUser(ctx.appUser).id });
    })
  });
