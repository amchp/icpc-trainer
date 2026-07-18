import type { initTRPC } from "@trpc/server";
import {
  FRIEND_SUBMISSION_SYNC_EVENT_TYPES,
  PROVIDER_STATE_EVENT_TYPES,
  type JudgeProvider,
  type LocalizedMessageReference,
  type RunStatus
} from "@icpc-trainer/shared";
import { TRPCError } from "@trpc/server";
import { z } from "zod";

import { getContestFinderOverview } from "./contestFinderReadModel.js";
import type { ApiContext } from "./index.js";
import { requireAppUser } from "./appUsers.js";
import { judgeProviderSchema } from "./judgeProvider.js";

type TrpcInstance = ReturnType<typeof initTRPC.context<ApiContext>>["create"] extends () => infer T
  ? T
  : never;

export interface FriendSubmissionSyncWarning {
  readonly judge: JudgeProvider;
  readonly message: LocalizedMessageReference;
}

export interface FriendSubmissionSyncResult {
  readonly friendsProcessed: number;
  readonly warnings: readonly FriendSubmissionSyncWarning[];
}

export const friendSubmissionSyncInputSchema = z.object({
  provider: judgeProviderSchema
});

export type FriendSubmissionSyncInput = z.infer<typeof friendSubmissionSyncInputSchema>;
export type AppScopedFriendSubmissionSyncInput = FriendSubmissionSyncInput & {
  readonly appUserId: number;
};
export type FriendSubmissionSyncStatus = RunStatus;

interface FriendSubmissionSyncEventBase {
  readonly provider: FriendSubmissionSyncInput["provider"];
  readonly stepsTotal: number;
  readonly stepsLeft: number;
}

export type FriendSubmissionSyncEvent =
  | (FriendSubmissionSyncEventBase & {
      readonly type: FRIEND_SUBMISSION_SYNC_EVENT_TYPES.Started;
    })
  | (FriendSubmissionSyncEventBase & {
      readonly type: FRIEND_SUBMISSION_SYNC_EVENT_TYPES.FriendsSyncing;
      readonly friendsTotal: number;
    })
  | (FriendSubmissionSyncEventBase & {
      readonly type: FRIEND_SUBMISSION_SYNC_EVENT_TYPES.FriendSyncing;
      readonly userHandle: string;
      readonly friendIndex: number;
      readonly friendsTotal: number;
    })
  | (FriendSubmissionSyncEventBase & {
      readonly type: FRIEND_SUBMISSION_SYNC_EVENT_TYPES.FriendSynced;
      readonly userHandle: string;
      readonly friendIndex: number;
      readonly friendsTotal: number;
      readonly friendsProcessed: number;
    })
  | (FriendSubmissionSyncEventBase & {
      readonly type: FRIEND_SUBMISSION_SYNC_EVENT_TYPES.Warning;
      readonly message: LocalizedMessageReference;
      readonly userHandle?: string;
    })
  | {
      readonly type: FRIEND_SUBMISSION_SYNC_EVENT_TYPES.Completed;
      readonly provider: FriendSubmissionSyncInput["provider"];
      readonly stepsTotal: number;
      readonly stepsLeft: 0;
      readonly summary: FriendSubmissionSyncResult;
    };

export interface FriendSubmissionSyncProviderState {
  readonly type: PROVIDER_STATE_EVENT_TYPES.State;
  readonly provider: FriendSubmissionSyncInput["provider"];
  readonly status: FriendSubmissionSyncStatus;
  readonly progress: number;
  readonly stepsTotal: number;
  readonly stepsLeft: number;
  readonly current: LocalizedMessageReference | null;
  readonly friendsProcessed: number;
  readonly warnings: readonly LocalizedMessageReference[];
}

export type FriendSubmissionSyncObserveEvent = FriendSubmissionSyncProviderState;

export interface FriendSubmissionSyncService {
  readonly startFriendSubmissionSync: (input: { readonly appUserId: number }) => Promise<void>;
  readonly observeFriendSubmissionSync: (
    input: AppScopedFriendSubmissionSyncInput
  ) => AsyncIterable<FriendSubmissionSyncObserveEvent>;
}

export const createContestFinderRouter = (t: TrpcInstance) =>
  t.router({
    overview: t.procedure.query(({ ctx }) => getContestFinderOverview(ctx.database, requireAppUser(ctx.appUser).id)),
    syncFriendSubmissions: t.procedure.mutation(async ({ ctx }): Promise<{ readonly ok: true }> => {
      if (ctx.judges.startFriendSubmissionSync === undefined) {
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: "Friend submission sync is not configured."
        });
      }

      const appUser = requireAppUser(ctx.appUser);
      await ctx.judges.startFriendSubmissionSync({ appUserId: appUser.id });
      ctx.analytics?.capture({
        distinctId: appUser.clerkUserId,
        event: "friend_submissions_sync_started"
      });
      return { ok: true };
    }),
    observeFriendSubmissionSync: t.procedure.input(friendSubmissionSyncInputSchema).subscription(async function* ({ ctx, input }) {
      if (ctx.judges.observeFriendSubmissionSync === undefined) {
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: "Friend submission sync status is not configured."
        });
      }

      yield* ctx.judges.observeFriendSubmissionSync({ ...input, appUserId: requireAppUser(ctx.appUser).id });
    })
  });

export type { ContestFinderOverview, ContestFinderRow } from "./contestFinderReadModel.js";
