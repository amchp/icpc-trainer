import { type DatabaseService, schema } from "@icpc-trainer/db";
import { JUDGES, SUBMISSION_STATUSES, USER_TYPES } from "@icpc-trainer/shared";
import {
  and,
  asc,
  count,
  desc,
  eq,
  exists,
  gte,
  lt,
  min,
  notExists,
  sql,
  type SQL
} from "drizzle-orm";

const { appUserJudgeUsers, classMembers, submissions, users } = schema;

export type LeaderboardScope = "all" | "team" | "friends" | "class";
export const LEADERBOARD_PAGE_SIZE = 50;

export interface LeaderboardListInput {
  readonly scope: LeaderboardScope;
  readonly judge?: JUDGES;
  readonly startAt?: Date;
  readonly endAtExclusive?: Date;
  readonly page: number;
}

export interface LeaderboardRow {
  readonly userId: number;
  readonly username: string;
  readonly judge: JUDGES;
  readonly solvedCount: number;
  readonly rank: number;
}

export interface LeaderboardRowsPage {
  readonly rows: readonly LeaderboardRow[];
  readonly totalRows: number;
}

export interface ClassMemberRow {
  readonly userId: number;
  readonly username: string;
  readonly judge: JUDGES;
  readonly allTimeSolvedCount: number;
  readonly addedAt: string;
}

export interface ClassCandidateRow {
  readonly userId: number;
  readonly username: string;
  readonly judge: JUDGES;
  readonly allTimeSolvedCount: number;
}

const firstAcceptedProblems = (database: DatabaseService) =>
  database.db
    .select({
      userId: submissions.userId,
      problemId: submissions.problemId,
      firstAcceptedAt: min(submissions.submittedAt)
        .mapWith(submissions.submittedAt)
        .as("first_accepted_at")
    })
    .from(submissions)
    .where(eq(submissions.status, SUBMISSION_STATUSES.AC))
    .groupBy(submissions.userId, submissions.problemId)
    .as("first_accepted_problems");

const scopeCondition = (
  database: DatabaseService,
  appUserId: number,
  scope: LeaderboardScope
): SQL | undefined => {
  if (scope === "all") {
    return undefined;
  }
  if (scope === "class") {
    return exists(
      database.db
        .select({ userId: classMembers.userId })
        .from(classMembers)
        .where(eq(classMembers.userId, users.id))
    );
  }

  return exists(
    database.db
      .select({ userId: appUserJudgeUsers.userId })
      .from(appUserJudgeUsers)
      .where(and(
        eq(appUserJudgeUsers.userId, users.id),
        eq(appUserJudgeUsers.appUserId, appUserId),
        eq(
          appUserJudgeUsers.role,
          scope === "team" ? USER_TYPES.Team : USER_TYPES.Friend
        )
      ))
  );
};

export const listLeaderboardRows = async (
  database: DatabaseService,
  appUserId: number,
  input: LeaderboardListInput
): Promise<LeaderboardRowsPage> => {
  const firstSolves = firstAcceptedProblems(database);

  const solvedCount = count().as("solved_count");
  const scores = database.db
    .select({
      userId: users.id,
      username: users.username,
      judge: users.judge,
      solvedCount
    })
    .from(users)
    .innerJoin(firstSolves, eq(firstSolves.userId, users.id))
    .where(and(
      scopeCondition(database, appUserId, input.scope),
      input.judge === undefined ? undefined : eq(users.judge, input.judge),
      input.startAt === undefined
        ? undefined
        : and(
            gte(firstSolves.firstAcceptedAt, input.startAt),
            lt(firstSolves.firstAcceptedAt, input.endAtExclusive!)
          )
    ))
    .groupBy(users.id, users.username, users.judge)
    .as("leaderboard_scores");

  const [rows, totalRow] = await Promise.all([
    database.db
      .select({
        userId: scores.userId,
        username: scores.username,
        judge: scores.judge,
        solvedCount: scores.solvedCount,
        rank: sql<number>`rank() over (order by ${scores.solvedCount} desc)`.mapWith(Number)
      })
      .from(scores)
      .orderBy(
        desc(scores.solvedCount),
        asc(scores.judge),
        sql`lower(${scores.username})`,
        asc(scores.username)
      )
      .limit(LEADERBOARD_PAGE_SIZE)
      .offset(input.page * LEADERBOARD_PAGE_SIZE)
      .all(),
    database.db
      .select({ value: count() })
      .from(scores)
      .get()
  ]);

  return {
    rows,
    totalRows: totalRow?.value ?? 0
  };
};

export const listClassMembers = async (
  database: DatabaseService
): Promise<ClassMemberRow[]> => {
  const firstSolves = firstAcceptedProblems(database);
  const rows = await database.db
    .select({
      userId: users.id,
      username: users.username,
      judge: users.judge,
      allTimeSolvedCount: count(firstSolves.problemId),
      addedAt: classMembers.createdAt
    })
    .from(classMembers)
    .innerJoin(users, eq(users.id, classMembers.userId))
    .leftJoin(firstSolves, eq(firstSolves.userId, users.id))
    .groupBy(
      users.id,
      users.username,
      users.judge,
      classMembers.createdAt
    )
    .orderBy(asc(users.judge), sql`lower(${users.username})`, asc(users.username))
    .limit(100)
    .all();

  return rows.map((row) => ({
    ...row,
    addedAt: row.addedAt.toISOString()
  }));
};

export const searchClassCandidates = async (
  database: DatabaseService,
  query: string,
  judge?: JUDGES
): Promise<ClassCandidateRow[]> => {
  const normalized = query.trim();
  const firstSolves = firstAcceptedProblems(database);
  return database.db
    .select({
      userId: users.id,
      username: users.username,
      judge: users.judge,
      allTimeSolvedCount: count(firstSolves.problemId)
    })
    .from(users)
    .innerJoin(firstSolves, eq(firstSolves.userId, users.id))
    .where(and(
      judge === undefined ? undefined : eq(users.judge, judge),
      sql`instr(lower(${users.username}), lower(${normalized})) > 0`,
      notExists(
        database.db
          .select({ userId: classMembers.userId })
          .from(classMembers)
          .where(eq(classMembers.userId, users.id))
      )
    ))
    .groupBy(users.id, users.username, users.judge)
    .orderBy(
      sql`case when substr(lower(${users.username}), 1, length(lower(${normalized}))) = lower(${normalized}) then 0 else 1 end`,
      asc(users.judge),
      sql`lower(${users.username})`,
      asc(users.username)
    )
    .limit(25)
    .all();
};
