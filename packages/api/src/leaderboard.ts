import { schema, type DatabaseService } from "@icpc-trainer/db";
import { JUDGES, SUBMISSION_STATUSES } from "@icpc-trainer/shared";
import { TRPCError, type initTRPC } from "@trpc/server";
import { and, count, eq, exists, sql } from "drizzle-orm";
import { z } from "zod";

import { requireAppUser } from "./appUsers.js";
import type { ApiContext } from "./index.js";
import {
  LEADERBOARD_PAGE_SIZE,
  listClassMembers,
  listLeaderboardRows,
  searchClassCandidates,
  type ClassCandidateRow,
  type ClassMemberRow,
  type LeaderboardRow,
  type LeaderboardScope
} from "./leaderboardReadModel.js";

const { classMembers, submissions, users } = schema;
const CLASS_LIMIT = 100;

type TrpcInstance = ReturnType<typeof initTRPC.context<ApiContext>>["create"] extends () => infer T
  ? T
  : never;

const listInputSchema = z.object({
  scope: z.enum(["all", "team", "friends", "class"]),
  judge: z.nativeEnum(JUDGES).optional(),
  startAt: z.iso.datetime({ offset: true }).optional(),
  endAtExclusive: z.iso.datetime({ offset: true }).optional(),
  page: z.number().int().nonnegative().default(0)
}).superRefine((value, context) => {
  if ((value.startAt === undefined) !== (value.endAtExclusive === undefined)) {
    context.addIssue({
      code: "custom",
      message: "Start and end instants must be provided together."
    });
    return;
  }
  if (
    value.startAt !== undefined &&
    value.endAtExclusive !== undefined &&
    Date.parse(value.startAt) >= Date.parse(value.endAtExclusive)
  ) {
    context.addIssue({
      code: "custom",
      message: "Start instant must be before end instant."
    });
  }
});

const candidateInputSchema = z.object({
  query: z.string().trim().min(1).max(64),
  judge: z.nativeEnum(JUDGES).optional()
});
const memberInputSchema = z.object({ userId: z.number().int().positive() });

const requireClassAdmin = (ctx: ApiContext): void => {
  requireAppUser(ctx.appUser);
  if (ctx.canManageClass !== true) {
    throw new TRPCError({
      code: "FORBIDDEN",
      message: "You do not have permission to manage the Class."
    });
  }
};

const classMemberCount = async (database: DatabaseService): Promise<number> => {
  const [row] = await database.db.select({ value: count() }).from(classMembers).all();
  return row?.value ?? 0;
};

const addClassMember = async (
  database: DatabaseService,
  actingAppUserId: number,
  userId: number
): Promise<{ memberCount: number }> => {
  const existing = await database.db
    .select({ userId: classMembers.userId })
    .from(classMembers)
    .where(eq(classMembers.userId, userId))
    .get();
  if (existing !== undefined) {
    return { memberCount: await classMemberCount(database) };
  }
  const preflightEligible = await database.db
    .select({ userId: users.id })
    .from(users)
    .where(and(
      eq(users.id, userId),
      exists(
        database.db
          .select({ submissionId: submissions.id })
          .from(submissions)
          .where(and(
            eq(submissions.userId, users.id),
            eq(submissions.status, SUBMISSION_STATUSES.AC)
          ))
      )
    ))
    .get();
  if (preflightEligible === undefined) {
    throw new TRPCError({
      code: "NOT_FOUND",
      message: "Only Judge Users with synchronized accepted Submissions can join the Class."
    });
  }

  const now = Date.now();
  await database.db.run(sql`
    insert into ${classMembers} (user_id, added_by_app_user_id, created_at, updated_at)
    select ${userId}, ${actingAppUserId}, ${now}, ${now}
    where exists (
      select 1
      from ${users}
      inner join ${submissions} on ${submissions.userId} = ${users.id}
      where ${users.id} = ${userId}
        and ${submissions.status} = ${SUBMISSION_STATUSES.AC}
    )
      and (select count(*) from ${classMembers}) < ${CLASS_LIMIT}
    on conflict (user_id) do nothing
  `);
  const inserted = await database.db
    .select({ userId: classMembers.userId })
    .from(classMembers)
    .where(eq(classMembers.userId, userId))
    .get();
  if (inserted === undefined) {
    throw new TRPCError({
      code: "BAD_REQUEST",
      message: "The Class already has 100 members."
    });
  }
  return { memberCount: await classMemberCount(database) };
};

const removeClassMember = async (
  database: DatabaseService,
  userId: number
): Promise<{ memberCount: number }> =>
  database.db.delete(classMembers).where(eq(classMembers.userId, userId)).run()
    .then(() => classMemberCount(database))
    .then((memberCount) => ({ memberCount }));

export interface LeaderboardListResult {
  readonly rows: readonly LeaderboardRow[];
  readonly totalRows: number;
  readonly page: number;
  readonly pageSize: number;
  readonly hasNextPage: boolean;
  readonly canManageClass: boolean;
  readonly generatedAt: string;
}

export const createLeaderboardRouter = (t: TrpcInstance) => t.router({
  list: t.procedure.input(listInputSchema).query(async ({ ctx, input }): Promise<LeaderboardListResult> => {
    const appUser = requireAppUser(ctx.appUser);
    const result = await listLeaderboardRows(ctx.database, appUser.id, {
      scope: input.scope,
      judge: input.judge,
      startAt: input.startAt === undefined ? undefined : new Date(input.startAt),
      endAtExclusive: input.endAtExclusive === undefined ? undefined : new Date(input.endAtExclusive),
      page: input.page
    });
    return {
      ...result,
      page: input.page,
      pageSize: LEADERBOARD_PAGE_SIZE,
      hasNextPage: (input.page + 1) * LEADERBOARD_PAGE_SIZE < result.totalRows,
      canManageClass: ctx.canManageClass === true,
      generatedAt: new Date().toISOString()
    };
  }),
  classMembers: t.procedure.query(({ ctx }): Promise<ClassMemberRow[]> => {
    requireClassAdmin(ctx);
    return listClassMembers(ctx.database);
  }),
  searchClassCandidates: t.procedure
    .input(candidateInputSchema)
    .query(({ ctx, input }): Promise<ClassCandidateRow[]> => {
      requireClassAdmin(ctx);
      return searchClassCandidates(ctx.database, input.query, input.judge);
    }),
  addClassMember: t.procedure.input(memberInputSchema).mutation(({ ctx, input }) => {
    const appUser = requireAppUser(ctx.appUser);
    requireClassAdmin(ctx);
    return addClassMember(ctx.database, appUser.id, input.userId);
  }),
  removeClassMember: t.procedure.input(memberInputSchema).mutation(({ ctx, input }) => {
    requireClassAdmin(ctx);
    return removeClassMember(ctx.database, input.userId);
  })
});

export type {
  ClassCandidateRow,
  ClassMemberRow,
  LeaderboardRow,
  LeaderboardScope
} from "./leaderboardReadModel.js";
