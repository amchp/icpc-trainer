import type { initTRPC } from "@trpc/server";
import {
  CONTEST_FINDER_REFRESH_EVENT_TYPES,
  CONTEST_FINDER_REFRESH_STEPS,
  PROVIDER_STATE_EVENT_TYPES,
  type JudgeProvider,
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

export interface ContestFinderRefreshWarning {
  readonly judge: JudgeProvider;
  readonly message: string;
}

export interface ContestFinderRefreshResult {
  readonly contestsUpserted: number;
  readonly friendsProcessed: number;
  readonly warnings: readonly ContestFinderRefreshWarning[];
}

export const contestFinderRefreshInputSchema = z.object({
  provider: judgeProviderSchema
});

export type ContestFinderRefreshInput = z.infer<typeof contestFinderRefreshInputSchema>;
export type AppScopedContestFinderRefreshInput = ContestFinderRefreshInput & {
  readonly appUserId: number;
};
export type ContestFinderRefreshStatus = RunStatus;

interface ContestFinderRefreshEventBase {
  readonly provider: ContestFinderRefreshInput["provider"];
  readonly stepsTotal: number;
  readonly stepsLeft: number;
}

export type ContestFinderRefreshEvent =
  | (ContestFinderRefreshEventBase & {
      readonly type: CONTEST_FINDER_REFRESH_EVENT_TYPES.Started;
    })
  | (ContestFinderRefreshEventBase & {
      readonly type: CONTEST_FINDER_REFRESH_EVENT_TYPES.CatalogSyncing;
      readonly step: CONTEST_FINDER_REFRESH_STEPS.Catalog;
    })
  | (ContestFinderRefreshEventBase & {
      readonly type: CONTEST_FINDER_REFRESH_EVENT_TYPES.CatalogSynced;
      readonly step: CONTEST_FINDER_REFRESH_STEPS.Catalog;
      readonly contestsUpserted: number;
    })
  | (ContestFinderRefreshEventBase & {
      readonly type: CONTEST_FINDER_REFRESH_EVENT_TYPES.FriendsSyncing;
      readonly step: CONTEST_FINDER_REFRESH_STEPS.Friends;
      readonly friendsTotal: number;
    })
  | (ContestFinderRefreshEventBase & {
      readonly type: CONTEST_FINDER_REFRESH_EVENT_TYPES.FriendsFriendSyncing;
      readonly step: CONTEST_FINDER_REFRESH_STEPS.Friends;
      readonly userHandle: string;
      readonly friendIndex: number;
      readonly friendsTotal: number;
    })
  | (ContestFinderRefreshEventBase & {
      readonly type: CONTEST_FINDER_REFRESH_EVENT_TYPES.FriendsFriendSynced;
      readonly step: CONTEST_FINDER_REFRESH_STEPS.Friends;
      readonly userHandle: string;
      readonly friendIndex: number;
      readonly friendsTotal: number;
      readonly friendsProcessed: number;
    })
  | (ContestFinderRefreshEventBase & {
      readonly type: CONTEST_FINDER_REFRESH_EVENT_TYPES.Warning;
      readonly message: string;
      readonly userHandle?: string;
    })
  | {
      readonly type: CONTEST_FINDER_REFRESH_EVENT_TYPES.Completed;
      readonly provider: ContestFinderRefreshInput["provider"];
      readonly stepsTotal: number;
      readonly stepsLeft: 0;
      readonly summary: ContestFinderRefreshResult;
    };

export interface ContestFinderRefreshProviderState {
  readonly type: PROVIDER_STATE_EVENT_TYPES.State;
  readonly provider: ContestFinderRefreshInput["provider"];
  readonly status: ContestFinderRefreshStatus;
  readonly progress: number;
  readonly stepsTotal: number;
  readonly stepsLeft: number;
  readonly current: string | null;
  readonly contestsUpserted: number;
  readonly friendsProcessed: number;
  readonly warnings: readonly string[];
}

export type ContestFinderRefreshObserveEvent = ContestFinderRefreshProviderState;

export interface ContestFinderRefreshService {
  readonly startContestFinderRefresh: (input: { readonly appUserId: number }) => Promise<void>;
  readonly observeContestFinderRefresh: (
    input: AppScopedContestFinderRefreshInput
  ) => AsyncIterable<ContestFinderRefreshObserveEvent>;
}

export const createContestFinderRouter = (t: TrpcInstance) =>
  t.router({
    overview: t.procedure.query(({ ctx }) => getContestFinderOverview(ctx.database, requireAppUser(ctx.appUser).id)),
    refresh: t.procedure.mutation(async ({ ctx }): Promise<{ readonly ok: true }> => {
      if (ctx.judges.startContestFinderRefresh === undefined) {
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: "Contest Finder refresh is not configured."
        });
      }

      await ctx.judges.startContestFinderRefresh({ appUserId: requireAppUser(ctx.appUser).id });
      return { ok: true };
    }),
    observeRefresh: t.procedure.input(contestFinderRefreshInputSchema).subscription(async function* ({ ctx, input }) {
      if (ctx.judges.observeContestFinderRefresh === undefined) {
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: "Contest Finder refresh is not configured."
        });
      }

      yield* ctx.judges.observeContestFinderRefresh({ ...input, appUserId: requireAppUser(ctx.appUser).id });
    })
  });

export type { ContestFinderOverview, ContestFinderRow } from "./contestFinderReadModel.js";
