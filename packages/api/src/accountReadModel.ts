import { type DatabaseService, schema } from "@icpc-trainer/db";
import { USER_TYPES, providerFromJudge, type JudgeProvider } from "@icpc-trainer/shared";
import { and, eq } from "drizzle-orm";

const { appUserJudgeUsers, contests, userContestStates } = schema;

export interface AppDataStatus {
  readonly hasSyncedContests: boolean;
  readonly syncedContestJudges: readonly JudgeProvider[];
}

export const getAccountDataStatus = async (database: DatabaseService, appUserId: number): Promise<AppDataStatus> => {
  const rows = await database.db
    .select({ judge: contests.judge })
    .from(userContestStates)
    .innerJoin(contests, eq(contests.id, userContestStates.contestId))
    .innerJoin(appUserJudgeUsers, and(
      eq(appUserJudgeUsers.userId, userContestStates.userId),
      eq(appUserJudgeUsers.appUserId, appUserId),
      eq(appUserJudgeUsers.role, USER_TYPES.Team)
    ))
    .where(eq(userContestStates.simulated, true))
    .groupBy(contests.judge)
    .all();

  return {
    hasSyncedContests: rows.length > 0,
    syncedContestJudges: rows.map((row) => providerFromJudge(row.judge))
  };
};
