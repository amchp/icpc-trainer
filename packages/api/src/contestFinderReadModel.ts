import { type DatabaseService, schema } from "@icpc-trainer/db";
import { USER_TYPES, type JudgeProvider } from "@icpc-trainer/shared";
import { and, count, desc, eq, notInArray } from "drizzle-orm";

const { appUserJudgeUsers, contests, userContestStates, users } = schema;

export interface ContestFinderRow {
  readonly id: number;
  readonly judge: JudgeProvider;
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

export const getContestFinderOverview = async (
  database: DatabaseService,
  appUserId: number
): Promise<ContestFinderOverview> => {
  const attemptedContestIds = new Set<number>();
  const teamContestStateRows = await database.db
    .select({ contestId: userContestStates.contestId })
    .from(userContestStates)
    .innerJoin(appUserJudgeUsers, and(
      eq(appUserJudgeUsers.userId, userContestStates.userId),
      eq(appUserJudgeUsers.appUserId, appUserId),
      eq(appUserJudgeUsers.role, USER_TYPES.Team)
    ))
    .where(eq(userContestStates.simulated, true))
    .groupBy(userContestStates.contestId)
    .all();
  for (const row of teamContestStateRows) {
    attemptedContestIds.add(row.contestId);
  }

  const attemptedContestIdList = [...attemptedContestIds];
  const contestFinderFilter = attemptedContestIdList.length === 0
    ? undefined
    : notInArray(contests.id, attemptedContestIdList);
  const friendCount = count(users.id);

  const contestRows = await database.db
    .select({
      id: contests.id,
      judge: contests.judge,
      judgeId: contests.judgeId,
      name: contests.name,
      link: contests.link,
      participants: contests.participants,
      stars: contests.stars,
      friendCount
    })
    .from(userContestStates)
    .innerJoin(contests, eq(contests.id, userContestStates.contestId))
    .innerJoin(appUserJudgeUsers, and(
      eq(appUserJudgeUsers.userId, userContestStates.userId),
      eq(appUserJudgeUsers.appUserId, appUserId),
      eq(appUserJudgeUsers.role, USER_TYPES.Friend)
    ))
    .innerJoin(
      users,
      eq(users.id, userContestStates.userId)
    )
    .where(contestFinderFilter)
    .groupBy(contests.id)
    .orderBy(desc(friendCount), contests.judge, contests.name)
    .all();

  const handleRows = await database.db
    .select({
      contestId: userContestStates.contestId,
      username: users.username
    })
    .from(userContestStates)
    .innerJoin(appUserJudgeUsers, and(
      eq(appUserJudgeUsers.userId, userContestStates.userId),
      eq(appUserJudgeUsers.appUserId, appUserId),
      eq(appUserJudgeUsers.role, USER_TYPES.Friend)
    ))
    .innerJoin(users, eq(users.id, userContestStates.userId))
    .innerJoin(contests, eq(contests.id, userContestStates.contestId))
    .where(contestFinderFilter)
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
};
