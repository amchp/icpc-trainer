import { schema } from "@icpc-trainer/db";
import { JUDGES } from "@icpc-trainer/shared";
import type { initTRPC } from "@trpc/server";
import { eq } from "drizzle-orm";

import type { ApiContext, JudgeSyncInput } from "./index.js";

const { contests } = schema;

type TrpcInstance = ReturnType<typeof initTRPC.context<ApiContext>>["create"] extends () => infer T
  ? T
  : never;

export interface AppDataStatus {
  readonly hasSyncedContests: boolean;
  readonly syncedContestJudges: readonly JudgeSyncInput["provider"][];
}

const toProvider = (judge: JUDGES): JudgeSyncInput["provider"] =>
  judge === JUDGES.Qoj ? "qoj" : "codeforces";

export const createAccountRouter = (t: TrpcInstance) =>
  t.router({
    dataStatus: t.procedure.query(({ ctx }): AppDataStatus => {
      const rows = ctx.database.db
        .select({ judge: contests.judge })
        .from(contests)
        .where(eq(contests.synced, true))
        .groupBy(contests.judge)
        .all();

      return {
        hasSyncedContests: rows.length > 0,
        syncedContestJudges: rows.map((row) => toProvider(row.judge))
      };
    })
  });
