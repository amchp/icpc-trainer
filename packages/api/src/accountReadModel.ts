import { type DatabaseService, schema } from "@icpc-trainer/db";
import { JUDGES } from "@icpc-trainer/shared";
import { eq } from "drizzle-orm";

import type { JudgeSyncInput } from "./judges.js";

const { contests } = schema;

export interface AppDataStatus {
  readonly hasSyncedContests: boolean;
  readonly syncedContestJudges: readonly JudgeSyncInput["provider"][];
}

const toProvider = (judge: JUDGES): JudgeSyncInput["provider"] =>
  judge === JUDGES.Qoj ? "qoj" : "codeforces";

export const getAccountDataStatus = (database: DatabaseService): AppDataStatus => {
  const rows = database.db
    .select({ judge: contests.judge })
    .from(contests)
    .where(eq(contests.simulated, true))
    .groupBy(contests.judge)
    .all();

  return {
    hasSyncedContests: rows.length > 0,
    syncedContestJudges: rows.map((row) => toProvider(row.judge))
  };
};
