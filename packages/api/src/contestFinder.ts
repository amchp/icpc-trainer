import type { initTRPC } from "@trpc/server";
import { TRPCError } from "@trpc/server";
import { z } from "zod";

import { getContestFinderOverview } from "./contestFinderReadModel.js";
import type { ApiContext } from "./index.js";

type TrpcInstance = ReturnType<typeof initTRPC.context<ApiContext>>["create"] extends () => infer T
  ? T
  : never;

export interface ContestFinderRefreshWarning {
  readonly judge: "codeforces" | "qoj";
  readonly message: string;
}

export interface ContestFinderRefreshResult {
  readonly contestsUpserted: number;
  readonly friendsProcessed: number;
  readonly warnings: readonly ContestFinderRefreshWarning[];
}

export const contestFinderRefreshInputSchema = z.object({
  provider: z.enum(["codeforces", "qoj"])
});

export type ContestFinderRefreshInput = z.infer<typeof contestFinderRefreshInputSchema>;
export type ContestFinderRefreshStatus = "idle" | "running" | "completed" | "error";

interface ContestFinderRefreshEventBase {
  readonly provider: ContestFinderRefreshInput["provider"];
  readonly stepsTotal: number;
  readonly stepsLeft: number;
}

export type ContestFinderRefreshEvent =
  | (ContestFinderRefreshEventBase & {
      readonly type: "started";
    })
  | (ContestFinderRefreshEventBase & {
      readonly type: "catalog.syncing";
      readonly step: "catalog";
    })
  | (ContestFinderRefreshEventBase & {
      readonly type: "catalog.synced";
      readonly step: "catalog";
      readonly contestsUpserted: number;
    })
  | (ContestFinderRefreshEventBase & {
      readonly type: "friends.syncing";
      readonly step: "friends";
      readonly friendsTotal: number;
    })
  | (ContestFinderRefreshEventBase & {
      readonly type: "friends.friendSyncing";
      readonly step: "friends";
      readonly userHandle: string;
      readonly friendIndex: number;
      readonly friendsTotal: number;
    })
  | (ContestFinderRefreshEventBase & {
      readonly type: "friends.friendSynced";
      readonly step: "friends";
      readonly userHandle: string;
      readonly friendIndex: number;
      readonly friendsTotal: number;
      readonly friendsProcessed: number;
    })
  | (ContestFinderRefreshEventBase & {
      readonly type: "warning";
      readonly message: string;
      readonly userHandle?: string;
    })
  | {
      readonly type: "completed";
      readonly provider: ContestFinderRefreshInput["provider"];
      readonly stepsTotal: number;
      readonly stepsLeft: 0;
      readonly summary: ContestFinderRefreshResult;
    };

export interface ContestFinderRefreshProviderState {
  readonly type: "state";
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
  readonly startContestFinderRefresh: () => Promise<void>;
  readonly observeContestFinderRefresh: (
    input: ContestFinderRefreshInput
  ) => AsyncIterable<ContestFinderRefreshObserveEvent>;
}

export const createContestFinderRouter = (t: TrpcInstance) =>
  t.router({
    overview: t.procedure.query(({ ctx }) => getContestFinderOverview(ctx.database)),
    refresh: t.procedure.mutation(async ({ ctx }): Promise<{ readonly ok: true }> => {
      if (ctx.judges.startContestFinderRefresh === undefined) {
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: "Contest Finder refresh is not configured."
        });
      }

      await ctx.judges.startContestFinderRefresh();
      return { ok: true };
    }),
    observeRefresh: t.procedure.input(contestFinderRefreshInputSchema).subscription(async function* ({ ctx, input }) {
      if (ctx.judges.observeContestFinderRefresh === undefined) {
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: "Contest Finder refresh is not configured."
        });
      }

      yield* ctx.judges.observeContestFinderRefresh(input);
    })
  });

export type { ContestFinderOverview, ContestFinderRow } from "./contestFinderReadModel.js";
