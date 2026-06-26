import { chunks, SQLITE_BINDING_CHUNK_SIZE, type DatabaseService, schema } from "@icpc-trainer/db";
import { JUDGES, USER_TYPES } from "@icpc-trainer/shared";
import { TRPCError } from "@trpc/server";
import { and, eq, inArray, or, sql } from "drizzle-orm";

const { appUserJudgeUsers, users } = schema;
const USER_LOOKUP_BINDINGS_PER_ROW = 2;
const USER_LOOKUP_CHUNK_SIZE = Math.max(1, Math.floor(SQLITE_BINDING_CHUNK_SIZE / USER_LOOKUP_BINDINGS_PER_ROW));

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

const judgeUserCondition = (row: RosterInputUser) =>
  and(eq(users.judge, row.judge), sql`lower(${users.username}) = ${row.username.toLowerCase()}`);

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

const existingUserType = async (
  database: Pick<DatabaseService["db"], "select">,
  appUserId: number,
  username: string,
  judge: JUDGES
): Promise<USER_TYPES | undefined> => {
  const row = await database
    .select({ type: appUserJudgeUsers.role })
    .from(appUserJudgeUsers)
    .innerJoin(users, eq(users.id, appUserJudgeUsers.userId))
    .where(and(
      eq(appUserJudgeUsers.appUserId, appUserId),
      sql`lower(${users.username}) = ${username.toLowerCase()}`,
      eq(users.judge, judge)
    ))
    .get();

  return row?.type;
};

const conflictError = (
  label: string,
  username: string,
  existingType: USER_TYPES | undefined
): TRPCError =>
  new TRPCError({
    code: "CONFLICT",
    message: existingType === undefined
      ? `Could not add ${label} ${username}.`
      : `${username} is already saved as a ${existingType} user.`
  });

const ensureJudgeUser = async (
  database: DatabaseService,
  username: string,
  judge: JUDGES,
  timestamp: Date
): Promise<{ readonly id: number }> => {
  await database.db
    .insert(users)
    .values({
      username,
      judge,
      createdAt: timestamp,
      updatedAt: timestamp
    })
    .onConflictDoNothing()
    .run();

  const user = await database.db
    .select({ id: users.id })
    .from(users)
    .where(and(
      sql`lower(${users.username}) = ${username.toLowerCase()}`,
      eq(users.judge, judge)
    ))
    .get();

  if (user === undefined) {
    throw new Error(`Could not find judge user ${username}.`);
  }

  return user;
};

const addRosterLink = async (
  database: DatabaseService,
  appUserId: number,
  userId: number,
  type: USER_TYPES,
  timestamp: Date
): Promise<boolean> => {
  const insertedRows = await database.db
    .insert(appUserJudgeUsers)
    .values({
      appUserId,
      userId,
      role: type,
      createdAt: timestamp,
      updatedAt: timestamp
    })
    .onConflictDoNothing()
    .returning({ userId: appUserJudgeUsers.userId })
    .all();

  return insertedRows.length > 0;
};

export const getUserRoster = async <Type extends USER_TYPES>(
  database: DatabaseService,
  appUserId: number,
  type: Type
): Promise<UserRoster<Type>> => {
  const rows = await database.db
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

export const addUserToRoster = async <Type extends USER_TYPES>(
  database: DatabaseService,
  appUserId: number,
  type: Type,
  input: RosterInputUser,
  label: string
): Promise<UserRoster<Type>> => {
  const timestamp = new Date();
  const username = input.username.trim();

  const user = await ensureJudgeUser(database, username, input.judge, timestamp);
  const inserted = await addRosterLink(database, appUserId, user.id, type, timestamp);

  if (!inserted) {
    throw conflictError(
      label,
      username,
      await existingUserType(database.db, appUserId, username, input.judge)
    );
  }

  return getUserRoster(database, appUserId, type);
};

export const replaceUserRoster = async <Type extends USER_TYPES>(
  database: DatabaseService,
  appUserId: number,
  type: Type,
  rows: readonly RosterInputUser[],
  _label: string
): Promise<UserRoster<Type>> => {
  const rosterUsers = normalizedUsers(rows, type);
  const timestamp = new Date();
  const existingRows = await database.db
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

  if (staleIds.length > 0) {
    await database.db.delete(appUserJudgeUsers).where(and(
      eq(appUserJudgeUsers.appUserId, appUserId),
      inArray(appUserJudgeUsers.userId, staleIds)
    )).run();
  }

  const newRosterUsers = rosterUsers.filter((rosterUser) =>
    existingByUser.get(userKey(rosterUser.judge, rosterUser.username)) === undefined
  );
  for (const rosterUserChunk of chunks(newRosterUsers, SQLITE_BINDING_CHUNK_SIZE)) {
    if (rosterUserChunk.length === 0) {
      continue;
    }

    await database.db
      .insert(users)
      .values(rosterUserChunk.map((rosterUser) => ({
        username: rosterUser.username,
        judge: rosterUser.judge,
        createdAt: timestamp,
        updatedAt: timestamp
      })))
      .onConflictDoNothing()
      .run();
  }

  const usersByKey = new Map<string, { readonly id: number; readonly username: string; readonly judge: JUDGES }>();

  for (const rosterUserChunk of chunks(rosterUsers, USER_LOOKUP_CHUNK_SIZE)) {
    const condition = or(...rosterUserChunk.map(judgeUserCondition));
    if (condition === undefined) {
      continue;
    }

    const userRows = await database.db
      .select({ id: users.id, username: users.username, judge: users.judge })
      .from(users)
      .where(condition)
      .all();

    for (const row of userRows) {
      usersByKey.set(userKey(row.judge, row.username), row);
    }
  }

  const rosterLinks = rosterUsers.map((rosterUser) => {
    const user = usersByKey.get(userKey(rosterUser.judge, rosterUser.username));
    if (user === undefined) {
      throw new Error(`Could not find judge user ${rosterUser.username}.`);
    }

    return {
      appUserId,
      userId: user.id,
      role: type,
      createdAt: timestamp,
      updatedAt: timestamp
    };
  });

  for (const rosterLinkChunk of chunks(rosterLinks, SQLITE_BINDING_CHUNK_SIZE)) {
    if (rosterLinkChunk.length === 0) {
      continue;
    }

    await database.db
      .insert(appUserJudgeUsers)
      .values(rosterLinkChunk)
      .onConflictDoUpdate({
        target: [appUserJudgeUsers.appUserId, appUserJudgeUsers.userId],
        set: {
          role: type,
          updatedAt: timestamp
        }
      })
      .run();
  }

  return getUserRoster(database, appUserId, type);
};
