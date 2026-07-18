import { learningProgress, type DatabaseService } from "@icpc-trainer/db";
import {
  LEARNING_GUIDE_IDS,
  LEARNING_PROGRESS_STATUSES,
  type LearningGuideId,
  type LearningProgressStatus
} from "@icpc-trainer/shared";
import type { initTRPC } from "@trpc/server";
import { and, eq } from "drizzle-orm";
import { z } from "zod";

import type { ApiContext } from "./index.js";
import { requireAppUser } from "./appUsers.js";

type TrpcInstance = ReturnType<typeof initTRPC.context<ApiContext>>["create"] extends () => infer T
  ? T
  : never;

const guideIdSchema = z.nativeEnum(LEARNING_GUIDE_IDS);
const statusSchema = z.nativeEnum(LEARNING_PROGRESS_STATUSES);
const guideInputSchema = z.object({ guideId: guideIdSchema });
const setStatusInputSchema = z.object({ guideId: guideIdSchema, status: statusSchema });

export interface LearningProgressRow {
  readonly guideId: LearningGuideId;
  readonly status: LearningProgressStatus;
  readonly startedAt: string;
  readonly completedAt: string | null;
  readonly updatedAt: string;
}

const serializeRow = (row: typeof learningProgress.$inferSelect): LearningProgressRow => ({
  guideId: row.guideId as LearningGuideId,
  status: row.status,
  startedAt: row.startedAt.toISOString(),
  completedAt: row.completedAt?.toISOString() ?? null,
  updatedAt: row.updatedAt.toISOString()
});

export const listLearningProgress = async (
  database: DatabaseService,
  appUserId: number
): Promise<LearningProgressRow[]> => {
  const rows = await database.db
    .select()
    .from(learningProgress)
    .where(eq(learningProgress.appUserId, appUserId))
    .all();
  return rows.map(serializeRow);
};

export const startLearningGuide = async (
  database: DatabaseService,
  appUserId: number,
  guideId: LearningGuideId
): Promise<LearningProgressRow> => {
  const now = new Date();
  await database.db.insert(learningProgress).values({
    appUserId,
    guideId,
    status: LEARNING_PROGRESS_STATUSES.InProgress,
    startedAt: now,
    completedAt: null,
    updatedAt: now
  }).onConflictDoNothing().run();

  const row = await database.db.select().from(learningProgress).where(and(
    eq(learningProgress.appUserId, appUserId),
    eq(learningProgress.guideId, guideId)
  )).get();
  if (row === undefined) throw new Error("Learning progress was not found after start.");
  return serializeRow(row);
};

export const setLearningProgressStatus = async (
  database: DatabaseService,
  appUserId: number,
  guideId: LearningGuideId,
  status: LEARNING_PROGRESS_STATUSES
): Promise<LearningProgressRow> => {
  const now = new Date();
  await database.db.insert(learningProgress).values({
    appUserId,
    guideId,
    status,
    startedAt: now,
    completedAt: status === LEARNING_PROGRESS_STATUSES.Completed ? now : null,
    updatedAt: now
  }).onConflictDoUpdate({
    target: [learningProgress.appUserId, learningProgress.guideId],
    set: {
      status,
      completedAt: status === LEARNING_PROGRESS_STATUSES.Completed ? now : null,
      updatedAt: now
    }
  }).run();

  const row = await database.db.select().from(learningProgress).where(and(
    eq(learningProgress.appUserId, appUserId),
    eq(learningProgress.guideId, guideId)
  )).get();
  if (row === undefined) throw new Error("Learning progress was not found after update.");
  return serializeRow(row);
};

export const createLearningProgressRouter = (t: TrpcInstance) => t.router({
  list: t.procedure.query(({ ctx }) => {
    const appUser = requireAppUser(ctx.appUser);
    ctx.analytics?.capture({ distinctId: appUser.clerkUserId, event: "learning_roadmap_viewed" });
    return listLearningProgress(ctx.database, appUser.id);
  }),
  start: t.procedure.input(guideInputSchema).mutation(async ({ ctx, input }) => {
    const appUser = requireAppUser(ctx.appUser);
    const existing = await ctx.database.db.select().from(learningProgress).where(and(
      eq(learningProgress.appUserId, appUser.id),
      eq(learningProgress.guideId, input.guideId)
    )).get();
    const progress = await startLearningGuide(ctx.database, appUser.id, input.guideId);
    if (existing === undefined) {
      ctx.analytics?.capture({
        distinctId: appUser.clerkUserId,
        event: "learning_guide_started",
        properties: { guide_id: input.guideId }
      });
    }
    return progress;
  }),
  setStatus: t.procedure.input(setStatusInputSchema).mutation(async ({ ctx, input }) => {
    const appUser = requireAppUser(ctx.appUser);
    const progress = await setLearningProgressStatus(ctx.database, appUser.id, input.guideId, input.status);
    if (input.status === LEARNING_PROGRESS_STATUSES.Completed) {
      ctx.analytics?.capture({
        distinctId: appUser.clerkUserId,
        event: "learning_guide_completed",
        properties: { guide_id: input.guideId }
      });
    }
    return progress;
  })
});
