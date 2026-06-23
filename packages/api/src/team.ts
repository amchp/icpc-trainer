import { schema } from "@icpc-trainer/db";
import { JUDGES, USER_TYPES } from "@icpc-trainer/shared";
import { and, eq, inArray, sql } from "drizzle-orm";
import type { initTRPC } from "@trpc/server";
import { TRPCError } from "@trpc/server";
import { z } from "zod";

import type { ApiContext } from "./index.js";

const { users } = schema;

type TrpcInstance = ReturnType<typeof initTRPC.context<ApiContext>>["create"] extends () => infer T
  ? T
  : never;

const usernameSchema = z.string().trim().min(1).max(64);
const judgeSchema = z.nativeEnum(JUDGES);

const replaceTeamInputSchema = z.object({
  users: z
    .array(z.object({
      username: usernameSchema,
      judge: judgeSchema
    }))
    .max(20)
});

export interface TeamUser {
  readonly username: string;
  readonly judge: JUDGES;
  readonly type: USER_TYPES.Team;
}

export interface TeamRoster {
  readonly users: readonly TeamUser[];
  readonly updatedAt: string | null;
}

const normalizedUsers = (
  users: readonly { readonly username: string; readonly judge: JUDGES }[]
): TeamUser[] => {
  const seen = new Set<string>();
  const result: TeamUser[] = [];

  for (const user of users) {
    const username = user.username.trim();
    const key = `${user.judge}:${username.toLowerCase()}`;
    if (seen.has(key)) {
      continue;
    }
    seen.add(key);
    result.push({
      username,
      judge: user.judge,
      type: USER_TYPES.Team
    });
  }

  return result;
};

const getRoster = (ctx: ApiContext): TeamRoster => {
  const rows = ctx.database.db
    .select({
      username: users.username,
      judge: users.judge,
      type: users.type,
      updatedAt: users.updatedAt
    })
    .from(users)
    .where(eq(users.type, USER_TYPES.Team))
    .orderBy(users.judge, users.username)
    .all();

  const updatedAt = rows.reduce<Date | null>(
    (latest, row) => latest === null || row.updatedAt > latest ? row.updatedAt : latest,
    null
  );

  return {
    users: rows.map((row) => ({
      username: row.username,
      judge: row.judge,
      type: USER_TYPES.Team
    })),
    updatedAt: updatedAt?.toISOString() ?? null
  };
};

export const createTeamRouter = (t: TrpcInstance) =>
  t.router({
    roster: t.procedure.query(({ ctx }): TeamRoster => getRoster(ctx)),
    replace: t.procedure.input(replaceTeamInputSchema).mutation(({ ctx, input }): TeamRoster => {
      const rosterUsers = normalizedUsers(input.users);
      const timestamp = new Date();
      const existingTeamRows = ctx.database.db
        .select({ id: users.id, username: users.username, judge: users.judge })
        .from(users)
        .where(eq(users.type, USER_TYPES.Team))
        .all();
      const existingByUser = new Map(
        existingTeamRows.map((row) => [`${row.judge}:${row.username.toLowerCase()}`, row])
      );
      const nextUserKeys = new Set(
        rosterUsers.map((user) => `${user.judge}:${user.username.toLowerCase()}`)
      );
      const staleIds = existingTeamRows
        .filter((row) => !nextUserKeys.has(`${row.judge}:${row.username.toLowerCase()}`))
        .map((row) => row.id);

      ctx.database.db.transaction((tx) => {
        if (staleIds.length > 0) {
          tx.delete(users).where(inArray(users.id, staleIds)).run();
        }

        for (const rosterUser of rosterUsers) {
          const existing = existingByUser.get(
            `${rosterUser.judge}:${rosterUser.username.toLowerCase()}`
          );
          if (existing !== undefined) {
            tx
              .update(users)
              .set({ username: rosterUser.username, judge: rosterUser.judge, updatedAt: timestamp })
              .where(eq(users.id, existing.id))
              .run();
            continue;
          }

          try {
            tx
              .insert(users)
              .values({
                username: rosterUser.username,
                type: USER_TYPES.Team,
                judge: rosterUser.judge,
                createdAt: timestamp,
                updatedAt: timestamp
              })
              .run();
          } catch (error) {
            const existingUser = tx
              .select({ type: users.type })
              .from(users)
              .where(
                and(
                  sql`lower(${users.username}) = ${rosterUser.username.toLowerCase()}`,
                  eq(users.judge, rosterUser.judge)
                )
              )
              .get();
            throw new TRPCError({
              code: "CONFLICT",
              message: existingUser === undefined
                ? `Could not add team user ${rosterUser.username}.`
                : `${rosterUser.username} is already saved as a ${existingUser.type} user.`,
              cause: error
            });
          }
        }
      });

      return getRoster(ctx);
    })
  });
