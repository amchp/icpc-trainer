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

const replaceFriendsInputSchema = z.object({
  users: z
    .array(z.object({
      username: usernameSchema,
      judge: judgeSchema
    }))
    .max(100)
});

const addFriendInputSchema = z.object({
  username: usernameSchema,
  judge: judgeSchema
});

export interface FriendUser {
  readonly username: string;
  readonly judge: JUDGES;
  readonly type: USER_TYPES.Friend;
}

export interface FriendsRoster {
  readonly users: readonly FriendUser[];
  readonly updatedAt: string | null;
}

const normalizedUsers = (
  rows: readonly { readonly username: string; readonly judge: JUDGES }[]
): FriendUser[] => {
  const seen = new Set<string>();
  const result: FriendUser[] = [];

  for (const row of rows) {
    const username = row.username.trim();
    const key = `${row.judge}:${username.toLowerCase()}`;
    if (username === "" || seen.has(key)) {
      continue;
    }

    seen.add(key);
    result.push({
      username,
      judge: row.judge,
      type: USER_TYPES.Friend
    });
  }

  return result;
};

const getRoster = (ctx: ApiContext): FriendsRoster => {
  const rows = ctx.database.db
    .select({
      username: users.username,
      judge: users.judge,
      updatedAt: users.updatedAt
    })
    .from(users)
    .where(eq(users.type, USER_TYPES.Friend))
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
      type: USER_TYPES.Friend
    })),
    updatedAt: updatedAt?.toISOString() ?? null
  };
};

export const createFriendsRouter = (t: TrpcInstance) =>
  t.router({
    roster: t.procedure.query(({ ctx }): FriendsRoster => getRoster(ctx)),
    add: t.procedure.input(addFriendInputSchema).mutation(({ ctx, input }): FriendsRoster => {
      const timestamp = new Date();
      const username = input.username.trim();

      try {
        ctx.database.db
          .insert(users)
          .values({
            username,
            type: USER_TYPES.Friend,
            judge: input.judge,
            createdAt: timestamp,
            updatedAt: timestamp
          })
          .run();
      } catch (error) {
        const existingUser = ctx.database.db
          .select({ type: users.type })
          .from(users)
          .where(
            and(
              sql`lower(${users.username}) = ${username.toLowerCase()}`,
              eq(users.judge, input.judge)
            )
          )
          .get();
        throw new TRPCError({
          code: "CONFLICT",
          message: existingUser === undefined
            ? `Could not add friend ${username}.`
            : `${username} is already saved as a ${existingUser.type} user.`,
          cause: error
        });
      }

      return getRoster(ctx);
    }),
    replace: t.procedure.input(replaceFriendsInputSchema).mutation(({ ctx, input }): FriendsRoster => {
      const rosterUsers = normalizedUsers(input.users);
      const timestamp = new Date();
      const existingFriendRows = ctx.database.db
        .select({ id: users.id, username: users.username, judge: users.judge })
        .from(users)
        .where(eq(users.type, USER_TYPES.Friend))
        .all();
      const existingByUser = new Map(
        existingFriendRows.map((row) => [`${row.judge}:${row.username.toLowerCase()}`, row])
      );
      const nextUserKeys = new Set(
        rosterUsers.map((user) => `${user.judge}:${user.username.toLowerCase()}`)
      );
      const staleIds = existingFriendRows
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
                type: USER_TYPES.Friend,
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
                ? `Could not add friend ${rosterUser.username}.`
                : `${rosterUser.username} is already saved as a ${existingUser.type} user.`,
              cause: error
            });
          }
        }
      });

      return getRoster(ctx);
    })
  });
