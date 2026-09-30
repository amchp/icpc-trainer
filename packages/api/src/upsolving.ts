import { listInputSchema } from "./listInput.js";
import { schema } from "@icpc-trainer/db";
import { JUDGES, USER_TYPES, type JudgeProvider } from "@icpc-trainer/shared";
import { and, eq } from "drizzle-orm";
import type { initTRPC } from "@trpc/server";
import { TRPCError } from "@trpc/server";
import { z } from "zod";

import type { ApiContext } from "./index.js";
import { requireAppUser } from "./appUsers.js";
import { getUpsolvingOverview } from "./upsolvingReadModel.js";

const { contests, problems, appUserProblemReviews, appUserJudgeUsers, userContestStates } = schema;

const linkPath = (link: string): string => {
  try {
    return new URL(link, "https://codeforces.com").pathname.toLowerCase();
  } catch {
    return link.toLowerCase();
  }
};

const canRefetchContest = (contest: {
  readonly judge: JudgeProvider;
  readonly link: string;
}): boolean =>
  !(contest.judge === JUDGES.Codeforces && linkPath(contest.link).startsWith("/contest/"));

export interface RefetchContestInput {
  readonly provider: JudgeProvider;
  readonly contestJudgeId: string;
}

type TrpcInstance = ReturnType<typeof initTRPC.context<ApiContext>>["create"] extends () => infer T
  ? T
  : never;

export const createUpsolvingRouter = (t: TrpcInstance) =>
  t.router({
    overview: t.procedure.input(listInputSchema).query(({ ctx, input }) => getUpsolvingOverview(ctx.database, requireAppUser(ctx.appUser).id, input?.limit)),
    setReviewLater: t.procedure.input(z.object({
      judge: z.nativeEnum(JUDGES),
      problemJudgeId: z.string().min(1),
      reviewLater: z.boolean()
    })).mutation(async ({ ctx, input }): Promise<{ readonly ok: true }> => {
      const appUser = requireAppUser(ctx.appUser);
      const problem = await ctx.database.db
        .select({ id: problems.id })
        .from(problems)
        .innerJoin(userContestStates, and(
          eq(userContestStates.contestId, problems.contestId),
          eq(userContestStates.simulated, true)
        ))
        .innerJoin(appUserJudgeUsers, and(
          eq(appUserJudgeUsers.userId, userContestStates.userId),
          eq(appUserJudgeUsers.appUserId, appUser.id),
          eq(appUserJudgeUsers.role, USER_TYPES.Team)
        ))
        .where(and(eq(problems.judge, input.judge), eq(problems.judgeId, input.problemJudgeId)))
        .get();

      if (problem === undefined) {
        throw new TRPCError({ code: "NOT_FOUND", message: "Upsolving problem was not found." });
      }

      if (input.reviewLater) {
        const now = new Date();
        await ctx.database.db.insert(appUserProblemReviews).values({
          appUserId: appUser.id,
          problemId: problem.id,
          createdAt: now,
          updatedAt: now
        }).onConflictDoNothing().run();
      } else {
        await ctx.database.db.delete(appUserProblemReviews).where(and(
          eq(appUserProblemReviews.appUserId, appUser.id),
          eq(appUserProblemReviews.problemId, problem.id)
        )).run();
      }
      return { ok: true };
    }),
    refetchContest: t.procedure.input(z.object({
      contestId: z.number().int().positive()
    })).mutation(async ({ ctx, input }): Promise<{ readonly ok: true }> => {
      const appUser = requireAppUser(ctx.appUser);
      const contest = await ctx.database.db
        .select({
          judge: contests.judge,
          judgeId: contests.judgeId,
          link: contests.link
        })
        .from(contests)
        .where(eq(contests.id, input.contestId))
        .get();

      if (contest === undefined) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: `Contest ${input.contestId} was not found.`
        });
      }

      if (ctx.judges.refetchContest === undefined) {
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: "Contest refetch is not configured."
        });
      }

      if (!canRefetchContest(contest)) {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: "Codeforces rounds are refreshed by the catalog sync and cannot be refetched individually."
        });
      }

      try {
        await ctx.judges.refetchContest({
          provider: contest.judge,
          contestJudgeId: contest.judgeId,
          appUserId: appUser.id
        });
      } catch (error) {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: error instanceof Error ? error.message : String(error),
          cause: error
        });
      }

      ctx.analytics?.capture({
        distinctId: appUser.clerkUserId,
        event: "contest_refetched",
        properties: { contest_id: input.contestId, provider: contest.judge }
      });
      return { ok: true };
    })
  });

export type {
  UpsolvingContestRow,
  UpsolvingOverview,
  UpsolvingProblemRow,
  UpsolvingProblemStatus
} from "./upsolvingReadModel.js";
