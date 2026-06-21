import { APP_SERVICE_ID, type HealthStatus } from "@icpc-trainer/shared";
import type { DatabaseService } from "@icpc-trainer/db";
import { initTRPC } from "@trpc/server";
import { Effect } from "effect";

import { createPlaygroundRouter, type JudgePlaygroundService } from "./playground.js";

export interface ApiContext {
  readonly database: DatabaseService;
  readonly judges: JudgePlaygroundService;
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
  }),
  playground: createPlaygroundRouter(t)
});

export type AppRouter = typeof appRouter;

export type {
  JudgePlaygroundService,
  PlaygroundError,
  PlaygroundInput,
  PlaygroundOperation,
  PlaygroundProvider,
  PlaygroundResult
} from "./playground.js";
