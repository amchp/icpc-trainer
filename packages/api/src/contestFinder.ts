import { schema } from "@icpc-trainer/db";
import { USER_TYPES } from "@icpc-trainer/shared";
import { and, desc, eq, notInArray, sql } from "drizzle-orm";
import type { initTRPC } from "@trpc/server";
import { TRPCError } from "@trpc/server";
import { z } from "zod";

import type { ApiContext } from "./index.js";

const { contests, userContestStates, users } = schema;

type TrpcInstance = ReturnType<typeof initTRPC.context<ApiContext>>["create"] extends () => infer T
  ? T
  : never;

export interface ContestFinderRow {
  readonly id: number;
  readonly judge: "codeforces" | "qoj";
  readonly judgeId: string;
  readonly name: string;
  readonly link: string;
  readonly participants: number | null;
  readonly stars: number | null;
  readonly friendCount: number;
  readonly handles: readonly string[];
}

export interface ContestFinderOverview {
  readonly contests: readonly ContestFinderRow[];
}

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

export type ContestFinderRefreshObserveEvent =
  | {
      readonly type: "snapshot";
      readonly provider: ContestFinderRefreshInput["provider"];
      readonly running: boolean;
      readonly events: readonly ContestFinderRefreshEvent[];
    }
  | ContestFinderRefreshEvent;

export interface ContestFinderRefreshService {
  readonly startContestFinderRefresh: () => Promise<void>;
  readonly observeContestFinderRefresh: (
    input: ContestFinderRefreshInput
  ) => AsyncIterable<ContestFinderRefreshObserveEvent>;
}

export const createContestFinderRouter = (t: TrpcInstance) =>
  t.router({
    overview: t.procedure.query(({ ctx }): ContestFinderOverview => {
      const attemptedContestIds = new Set<number>();
      const teamContestStateRows = ctx.database.db
        .select({
          contestId: userContestStates.contestId
        })
        .from(userContestStates)
        .innerJoin(users, eq(users.id, userContestStates.userId))
        .where(eq(users.type, USER_TYPES.Team))
        .groupBy(userContestStates.contestId)
        .all();
      for (const row of teamContestStateRows) {
        attemptedContestIds.add(row.contestId);
      }

      const attemptedContestIdList = [...attemptedContestIds];
      const contestFinderFilter = attemptedContestIdList.length === 0
        ? eq(contests.simulated, false)
        : and(
          eq(contests.simulated, false),
          notInArray(contests.id, attemptedContestIdList)
        );

      const contestRows = ctx.database.db
        .select({
          id: contests.id,
          judge: contests.judge,
          judgeId: contests.judgeId,
          name: contests.name,
          link: contests.link,
          participants: contests.participants,
          stars: contests.stars,
          friendCount: sql<number>`count(${users.id})`
        })
        .from(userContestStates)
        .innerJoin(contests, eq(contests.id, userContestStates.contestId))
        .innerJoin(
          users,
          and(
            eq(users.id, userContestStates.userId),
            eq(users.type, USER_TYPES.Friend)
          )
        )
        .where(contestFinderFilter)
        .groupBy(contests.id)
        .orderBy(desc(sql<number>`count(${users.id})`), contests.judge, contests.name)
        .all();

      const handleRows = ctx.database.db
        .select({
          contestId: userContestStates.contestId,
          username: users.username
        })
        .from(userContestStates)
        .innerJoin(users, eq(users.id, userContestStates.userId))
        .innerJoin(contests, eq(contests.id, userContestStates.contestId))
        .where(and(
          eq(users.type, USER_TYPES.Friend),
          contestFinderFilter
        ))
        .orderBy(users.username)
        .all();
      const handlesByContestId = new Map<number, string[]>();
      for (const row of handleRows) {
        const handles = handlesByContestId.get(row.contestId) ?? [];
        handles.push(row.username);
        handlesByContestId.set(row.contestId, handles);
      }

      return {
        contests: contestRows.map((row) => ({
          ...row,
          friendCount: handlesByContestId.get(row.id)?.length ?? 0,
          handles: handlesByContestId.get(row.id) ?? []
        }))
      };
    }),
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
