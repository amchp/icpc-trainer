import { type DatabaseService, schema } from "@icpc-trainer/db";
import { JUDGES, USER_TYPES } from "@icpc-trainer/shared";
import { TRPCError } from "@trpc/server";
import { and, eq, inArray, sql } from "drizzle-orm";

const { appUserJudgeUsers, users } = schema;

export interface RosterUser<Type extends USER_TYPES> {
  readonly username: string;
  readonly judge: JUDGES;
  readonly type: Type;
}

export interface UserRoster<Type extends USER_TYPES> {
  readonly users: readonly RosterUser<Type>[];
  readonly updatedAt: string | null;
}

interface RosterInputUser {
  readonly username: string;
  readonly judge: JUDGES;
}

const userKey = (judge: JUDGES, username: string): string =>
  `${judge}:${username.toLowerCase()}`;

const normalizedUsers = <Type extends USER_TYPES>(
  rows: readonly RosterInputUser[],
  type: Type
): RosterUser<Type>[] => {
  const seen = new Set<string>();
  const result: RosterUser<Type>[] = [];

  for (const row of rows) {
    const username = row.username.trim();
    const key = userKey(row.judge, username);
    if (username === "" || seen.has(key)) {
      continue;
    }

    seen.add(key);
    result.push({ username, judge: row.judge, type });
  }

  return result;
};

const existingUserType = (
  database: Pick<DatabaseService["db"], "select">,
  appUserId: number,
  username: string,
  judge: JUDGES
): USER_TYPES | undefined =>
  database
    .select({ type: appUserJudgeUsers.role })
    .from(appUserJudgeUsers)
    .innerJoin(users, eq(users.id, appUserJudgeUsers.userId))
    .where(and(
      eq(appUserJudgeUsers.appUserId, appUserId),
      sql`lower(${users.username}) = ${username.toLowerCase()}`,
      eq(users.judge, judge)
    ))
    .get()?.type;

const conflictError = (
  label: string,
  username: string,
  existingType: USER_TYPES | undefined,
  cause: unknown
): TRPCError =>
  new TRPCError({
    code: "CONFLICT",
    message: existingType === undefined
      ? `Could not add ${label} ${username}.`
      : `${username} is already saved as a ${existingType} user.`,
    cause
  });

export const getUserRoster = <Type extends USER_TYPES>(
  database: DatabaseService,
  appUserId: number,
  type: Type
): UserRoster<Type> => {
  const rows = database.db
    .select({
      username: users.username,
      judge: users.judge,
      updatedAt: appUserJudgeUsers.updatedAt
    })
    .from(appUserJudgeUsers)
    .innerJoin(users, eq(users.id, appUserJudgeUsers.userId))
    .where(and(eq(appUserJudgeUsers.appUserId, appUserId), eq(appUserJudgeUsers.role, type)))
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
      type
    })),
    updatedAt: updatedAt?.toISOString() ?? null
  };
};

export const addUserToRoster = <Type extends USER_TYPES>(
  database: DatabaseService,
  appUserId: number,
  type: Type,
  input: RosterInputUser,
  label: string
): UserRoster<Type> => {
  const timestamp = new Date();
  const username = input.username.trim();

  try {
    database.db.transaction((tx) => {
      tx
        .insert(users)
        .values({
          username,
          judge: input.judge,
          createdAt: timestamp,
          updatedAt: timestamp
        })
        .onConflictDoNothing()
        .run();

      const user = tx
        .select({ id: users.id })
        .from(users)
        .where(and(
          sql`lower(${users.username}) = ${username.toLowerCase()}`,
          eq(users.judge, input.judge)
        ))
        .get();

      if (user === undefined) {
        throw new Error(`Could not find judge user ${username}.`);
      }

      tx
        .insert(appUserJudgeUsers)
        .values({
          appUserId,
          userId: user.id,
          role: type,
          createdAt: timestamp,
          updatedAt: timestamp
        })
        .run();
    });
  } catch (error) {
    throw conflictError(label, username, existingUserType(database.db, appUserId, username, input.judge), error);
  }

  return getUserRoster(database, appUserId, type);
};

export const replaceUserRoster = <Type extends USER_TYPES>(
  database: DatabaseService,
  appUserId: number,
  type: Type,
  rows: readonly RosterInputUser[],
  label: string
): UserRoster<Type> => {
  const rosterUsers = normalizedUsers(rows, type);
  const timestamp = new Date();
  const existingRows = database.db
    .select({ id: users.id, username: users.username, judge: users.judge })
    .from(appUserJudgeUsers)
    .innerJoin(users, eq(users.id, appUserJudgeUsers.userId))
    .where(and(eq(appUserJudgeUsers.appUserId, appUserId), eq(appUserJudgeUsers.role, type)))
    .all();
  const existingByUser = new Map(
    existingRows.map((row) => [userKey(row.judge, row.username), row])
  );
  const nextUserKeys = new Set(
    rosterUsers.map((user) => userKey(user.judge, user.username))
  );
  const staleIds = existingRows
    .filter((row) => !nextUserKeys.has(userKey(row.judge, row.username)))
    .map((row) => row.id);

  database.db.transaction((tx) => {
    if (staleIds.length > 0) {
      tx.delete(appUserJudgeUsers).where(and(
        eq(appUserJudgeUsers.appUserId, appUserId),
        inArray(appUserJudgeUsers.userId, staleIds)
      )).run();
    }

    for (const rosterUser of rosterUsers) {
      const existing = existingByUser.get(userKey(rosterUser.judge, rosterUser.username));
      if (existing !== undefined) {
        tx
          .update(appUserJudgeUsers)
          .set({ role: type, updatedAt: timestamp })
          .where(and(
            eq(appUserJudgeUsers.appUserId, appUserId),
            eq(appUserJudgeUsers.userId, existing.id)
          ))
          .run();
        continue;
      }

      try {
        tx
          .insert(users)
          .values({
            username: rosterUser.username,
            judge: rosterUser.judge,
            createdAt: timestamp,
            updatedAt: timestamp
          })
          .onConflictDoNothing()
          .run();

        const user = tx
          .select({ id: users.id })
          .from(users)
          .where(and(
            sql`lower(${users.username}) = ${rosterUser.username.toLowerCase()}`,
            eq(users.judge, rosterUser.judge)
          ))
          .get();

        if (user === undefined) {
          throw new Error(`Could not find judge user ${rosterUser.username}.`);
        }

        tx
          .insert(appUserJudgeUsers)
          .values({
            appUserId,
            userId: user.id,
            role: type,
            createdAt: timestamp,
            updatedAt: timestamp
          })
          .onConflictDoUpdate({
            target: [appUserJudgeUsers.appUserId, appUserJudgeUsers.userId],
            set: {
              role: type,
              updatedAt: timestamp
            }
          })
          .run();
      } catch (error) {
        throw conflictError(
          label,
          rosterUser.username,
          existingUserType(tx, appUserId, rosterUser.username, rosterUser.judge),
          error
        );
      }
    }
  });

  return getUserRoster(database, appUserId, type);
};
