import { type DatabaseService, schema } from "@icpc-trainer/db";
import { providerFromJudge, type JudgeProvider } from "@icpc-trainer/shared";
import { eq } from "drizzle-orm";

const { contests } = schema;

export interface AppDataStatus {
  readonly hasSyncedContests: boolean;
  readonly syncedContestJudges: readonly JudgeProvider[];
}

export const getAccountDataStatus = (database: DatabaseService): AppDataStatus => {
  const rows = database.db
    .select({ judge: contests.judge })
    .from(contests)
    .where(eq(contests.simulated, true))
    .groupBy(contests.judge)
    .all();

  return {
    hasSyncedContests: rows.length > 0,
    syncedContestJudges: rows.map((row) => providerFromJudge(row.judge))
  };
};
