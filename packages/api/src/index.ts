import { APP_SERVICE_ID, type HealthStatus } from "@icpc-trainer/shared";
import type { DatabaseService } from "@icpc-trainer/db";
import { initTRPC } from "@trpc/server";
import { Effect } from "effect";

export interface ApiContext {
  readonly database: DatabaseService;
}

const t = initTRPC.context<ApiContext>().create();

export const appRouter = t.router({
  health: t.router({
    ping: t.procedure.query(async ({ ctx }): Promise<HealthStatus> => {
      const database = await Effect.runPromise(ctx.database.healthCheck);

      return {
        ok: true,
        service: APP_SERVICE_ID,
        database,
        timestamp: new Date().toISOString()
      };
    })
  })
});

export type AppRouter = typeof appRouter;
