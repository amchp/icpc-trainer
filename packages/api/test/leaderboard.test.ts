import { DatabaseLive, DatabaseServiceTag, schema } from "@icpc-trainer/db";
import { JUDGES, SUBMISSION_STATUSES, USER_TYPES } from "@icpc-trainer/shared";
import { TRPCError } from "@trpc/server";
import { Effect } from "effect";
import { describe, expect, it } from "vitest";

import { appRouter } from "../src/index.js";
import { attachJudgeUser, createTestAppUser } from "./testAppUser.js";

const {
  classMembers,
  contests,
  problems,
  submissions,
  users
} = schema;
const instant = (value: string): Date => new Date(value);
const base = instant("2026-01-01T00:00:00.000Z");

const withDatabase = <T>(
  run: (database: typeof DatabaseServiceTag.Service) => Promise<T>
): Promise<T> =>
  Effect.runPromise(
    Effect.gen(function* () {
      const database = yield* DatabaseServiceTag;
      yield* database.migrate;
      return yield* Effect.promise(() => run(database));
    }).pipe(Effect.provide(DatabaseLive({ url: ":memory:" })))
  );

const seedScoringFixture = async (database: typeof DatabaseServiceTag.Service) => {
  const appUser = await createTestAppUser(database, "viewer");
  const admin = await createTestAppUser(database, "admin");
  const [codeforcesContest, qojContest] = await database.db.insert(contests).values([
    {
      judgeId: "cf-leaderboard",
      judge: JUDGES.Codeforces,
      name: "CF Leaderboard",
      link: "https://codeforces.com/contest/1",
      participants: 4,
      stars: 1,
      createdAt: base,
      updatedAt: base
    },
    {
      judgeId: "qoj-leaderboard",
      judge: JUDGES.Qoj,
      name: "QOJ Leaderboard",
      link: "https://qoj.ac/contest/1",
      participants: 4,
      stars: 1,
      createdAt: base,
      updatedAt: base
    }
  ]).returning().all();
  if (!codeforcesContest || !qojContest) throw new Error("Expected contests.");

  const problemRows = await database.db.insert(problems).values([
    ...Array.from({ length: 3 }, (_, index) => ({
      judgeId: `cf-${index}`,
      judge: JUDGES.Codeforces,
      name: `CF ${index}`,
      link: `https://codeforces.com/problem/${index}`,
      contestId: codeforcesContest.id,
      solves: 1,
      rating: 1000,
      createdAt: base,
      updatedAt: base
    })),
    ...Array.from({ length: 3 }, (_, index) => ({
      judgeId: `qoj-${index}`,
      judge: JUDGES.Qoj,
      name: `QOJ ${index}`,
      link: `https://qoj.ac/problem/${index}`,
      contestId: qojContest.id,
      solves: 1,
      rating: 1000,
      createdAt: base,
      updatedAt: base
    }))
  ]).returning().all();

  const userRows = await database.db.insert(users).values([
    { username: "Alice", judge: JUDGES.Codeforces, createdAt: base, updatedAt: base },
    { username: "Bob", judge: JUDGES.Qoj, createdAt: base, updatedAt: base },
    { username: "Carol", judge: JUDGES.Qoj, createdAt: base, updatedAt: base },
    { username: "Dave", judge: JUDGES.Codeforces, createdAt: base, updatedAt: base },
    { username: "Unsolved", judge: JUDGES.Codeforces, createdAt: base, updatedAt: base }
  ]).returning().all();
  const byName = new Map(userRows.map((row) => [row.username, row]));
  const problem = (judge: JUDGES, index: number) => {
    const row = problemRows.find((candidate) =>
      candidate.judge === judge && candidate.judgeId === `${judge === JUDGES.Codeforces ? "cf" : "qoj"}-${index}`
    );
    if (!row) throw new Error("Expected problem.");
    return row;
  };
  const user = (name: string) => {
    const row = byName.get(name);
    if (!row) throw new Error(`Expected ${name}.`);
    return row;
  };

  await attachJudgeUser(database, appUser.id, user("Alice").id, USER_TYPES.Team);
  await attachJudgeUser(database, appUser.id, user("Bob").id, USER_TYPES.Friend);
  await database.db.insert(classMembers).values({
    userId: user("Carol").id,
    addedByAppUserId: admin.id,
    createdAt: base,
    updatedAt: base
  }).run();

  const rows = [
    ["a-old", "Alice", JUDGES.Codeforces, 0, "2026-01-10T12:00:00.000Z", SUBMISSION_STATUSES.AC],
    ["a-repeat", "Alice", JUDGES.Codeforces, 0, "2026-02-10T12:00:00.000Z", SUBMISSION_STATUSES.AC],
    ["a-new", "Alice", JUDGES.Codeforces, 1, "2026-02-11T12:00:00.000Z", SUBMISSION_STATUSES.AC],
    ["b-wa", "Bob", JUDGES.Qoj, 0, "2026-02-09T12:00:00.000Z", SUBMISSION_STATUSES.WA],
    ["b-ac", "Bob", JUDGES.Qoj, 0, "2026-02-12T12:00:00.000Z", SUBMISSION_STATUSES.AC],
    ["c-one", "Carol", JUDGES.Qoj, 0, "2026-02-05T12:00:00.000Z", SUBMISSION_STATUSES.AC],
    ["c-two", "Carol", JUDGES.Qoj, 1, "2026-02-06T12:00:00.000Z", SUBMISSION_STATUSES.AC],
    ["c-three", "Carol", JUDGES.Qoj, 2, "2026-03-01T00:00:00.000Z", SUBMISSION_STATUSES.AC],
    ["d-one", "Dave", JUDGES.Codeforces, 0, "2026-01-05T12:00:00.000Z", SUBMISSION_STATUSES.AC],
    ["d-two", "Dave", JUDGES.Codeforces, 1, "2026-01-06T12:00:00.000Z", SUBMISSION_STATUSES.AC]
  ] as const;
  await database.db.insert(submissions).values(rows.map(
    ([judgeId, username, judge, problemIndex, submittedAt, status]) => ({
      judgeId,
      judge,
      problemId: problem(judge, problemIndex).id,
      userId: user(username).id,
      status,
      submittedAt: instant(submittedAt),
      createdAt: base,
      updatedAt: base
    })
  )).run();

  return { appUser, admin, user };
};

const callerFor = (
  database: typeof DatabaseServiceTag.Service,
  appUser: Awaited<ReturnType<typeof createTestAppUser>> | undefined,
  canManageClass = false
) => appRouter.createCaller({
  database,
  appUser,
  canManageClass,
  judges: {
    run: async (input) => ({ ok: true as const, result: input }),
    validateCredentials: async () => undefined
  }
});

describe("leaderboard router", () => {
  it("counts first accepted Problems once and assigns deterministic competition ranks", () =>
    withDatabase(async (database) => {
      const { appUser } = await seedScoringFixture(database);
      const result = await callerFor(database, appUser).leaderboard.list({ scope: "all" });

      expect(result.canManageClass).toBe(false);
      expect(result.rows.map(({ username, solvedCount, rank }) => ({ username, solvedCount, rank }))).toEqual([
        { username: "Carol", solvedCount: 3, rank: 1 },
        { username: "Alice", solvedCount: 2, rank: 2 },
        { username: "Dave", solvedCount: 2, rank: 2 },
        { username: "Bob", solvedCount: 1, rank: 4 }
      ]);
    }));

  it("bounds each page while preserving global competition ranks", () =>
    withDatabase(async (database) => {
      const { appUser } = await seedScoringFixture(database);
      const caller = callerFor(database, appUser);
      const [problem] = await database.db.select().from(problems).limit(1).all();
      if (problem === undefined) throw new Error("Expected a Problem.");
      const extraUsers = await database.db.insert(users).values(
        Array.from({ length: 47 }, (_, index) => ({
          username: `Extra-${String(index).padStart(2, "0")}`,
          judge: JUDGES.Codeforces,
          createdAt: base,
          updatedAt: base
        }))
      ).returning().all();
      await database.db.insert(submissions).values(extraUsers.map((row, index) => ({
        judgeId: `extra-${index}`,
        judge: JUDGES.Codeforces,
        problemId: problem.id,
        userId: row.id,
        status: SUBMISSION_STATUSES.AC,
        submittedAt: base,
        createdAt: base,
        updatedAt: base
      }))).run();

      const firstPage = await caller.leaderboard.list({
        scope: "all",
        page: 0
      });
      expect(firstPage).toMatchObject({
        totalRows: 51,
        page: 0,
        pageSize: 50,
        hasNextPage: true
      });
      expect(firstPage.rows).toHaveLength(50);
      expect(firstPage.rows.slice(0, 3).map(({ username, rank }) => ({ username, rank })))
        .toEqual([
          { username: "Carol", rank: 1 },
          { username: "Alice", rank: 2 },
          { username: "Dave", rank: 2 }
        ]);

      const secondPage = await caller.leaderboard.list({
        scope: "all",
        page: 1
      });
      expect(secondPage).toMatchObject({
        totalRows: 51,
        page: 1,
        pageSize: 50,
        hasNextPage: false
      });
      expect(secondPage.rows.map(({ username, rank }) => ({ username, rank }))).toEqual([
        { username: "Bob", rank: 4 }
      ]);
    }));

  it("filters the earliest AC by a half-open interval and omits zero scores", () =>
    withDatabase(async (database) => {
      const { appUser } = await seedScoringFixture(database);
      const result = await callerFor(database, appUser).leaderboard.list({
        scope: "all",
        startAt: "2026-02-01T00:00:00.000Z",
        endAtExclusive: "2026-03-01T00:00:00.000Z"
      });

      expect(result.rows.map(({ username, solvedCount, rank }) => ({ username, solvedCount, rank }))).toEqual([
        { username: "Carol", solvedCount: 2, rank: 1 },
        { username: "Alice", solvedCount: 1, rank: 2 },
        { username: "Bob", solvedCount: 1, rank: 2 }
      ]);
    }));

  it("re-ranks Team, Friends, Class, and Judge populations independently", () =>
    withDatabase(async (database) => {
      const { appUser } = await seedScoringFixture(database);
      const caller = callerFor(database, appUser);

      await expect(caller.leaderboard.list({ scope: "team" })).resolves.toMatchObject({
        rows: [{ username: "Alice", rank: 1 }]
      });
      await expect(caller.leaderboard.list({ scope: "friends" })).resolves.toMatchObject({
        rows: [{ username: "Bob", rank: 1 }]
      });
      await expect(caller.leaderboard.list({ scope: "class" })).resolves.toMatchObject({
        rows: [{ username: "Carol", rank: 1 }]
      });
      const codeforces = await caller.leaderboard.list({
        scope: "all",
        judge: JUDGES.Codeforces
      });
      expect(codeforces.rows.map((row) => row.username)).toEqual(["Alice", "Dave"]);
      expect(codeforces.rows.map((row) => row.rank)).toEqual([1, 1]);
    }));

  it("validates authentication, paired instants, ordering, and admin permission", () =>
    withDatabase(async (database) => {
      const { appUser } = await seedScoringFixture(database);
      await expect(callerFor(database, undefined).leaderboard.list({ scope: "all" }))
        .rejects.toMatchObject({ code: "UNAUTHORIZED" });
      await expect(callerFor(database, appUser).leaderboard.list({
        scope: "all",
        startAt: "2026-02-01T00:00:00.000Z"
      })).rejects.toThrow("Start and end instants must be provided together.");
      await expect(callerFor(database, appUser).leaderboard.list({
        scope: "all",
        startAt: "2026-03-01T00:00:00.000Z",
        endAtExclusive: "2026-02-01T00:00:00.000Z"
      })).rejects.toThrow("Start instant must be before end instant.");
      await expect(callerFor(database, appUser).leaderboard.classMembers())
        .rejects.toMatchObject({ code: "FORBIDDEN" });
    }));

  it("searches eligible non-members and keeps add/remove idempotent", () =>
    withDatabase(async (database) => {
      const { admin, user } = await seedScoringFixture(database);
      const caller = callerFor(database, admin, true);
      const candidates = await caller.leaderboard.searchClassCandidates({ query: "ali" });
      expect(candidates.map((row) => row.username)).toEqual(["Alice"]);

      await expect(caller.leaderboard.addClassMember({ userId: user("Unsolved").id }))
        .rejects.toMatchObject({ code: "NOT_FOUND" });
      await expect(caller.leaderboard.addClassMember({ userId: user("Alice").id }))
        .resolves.toEqual({ memberCount: 2 });
      await expect(caller.leaderboard.addClassMember({ userId: user("Alice").id }))
        .resolves.toEqual({ memberCount: 2 });
      expect((await caller.leaderboard.classMembers()).map((row) => row.username))
        .toEqual(["Alice", "Carol"]);
      await expect(caller.leaderboard.removeClassMember({ userId: user("Alice").id }))
        .resolves.toEqual({ memberCount: 1 });
      await expect(caller.leaderboard.removeClassMember({ userId: user("Alice").id }))
        .resolves.toEqual({ memberCount: 1 });
    }));

  it("rejects the 101st Class member", () =>
    withDatabase(async (database) => {
      const { admin, user } = await seedScoringFixture(database);
      const candidate = user("Alice");
      const memberRows = await database.db.insert(users).values(
        Array.from({ length: 99 }, (_, index) => ({
          username: `member-${index}`,
          judge: JUDGES.Codeforces,
          createdAt: base,
          updatedAt: base
        }))
      ).returning().all();
      await database.db.insert(classMembers).values(memberRows.map((row) => ({
        userId: row.id,
        addedByAppUserId: admin.id,
        createdAt: base,
        updatedAt: base
      }))).run();

      await expect(callerFor(database, admin, true).leaderboard.addClassMember({
        userId: candidate.id
      })).rejects.toEqual(expect.objectContaining<Partial<TRPCError>>({
        code: "BAD_REQUEST"
      }));
    }));
});
