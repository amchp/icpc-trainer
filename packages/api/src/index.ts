import { APP_SERVICE_ID, type HealthStatus } from "@icpc-trainer/shared";
import type { DatabaseService } from "@icpc-trainer/db";
import { initTRPC } from "@trpc/server";
import { Effect } from "effect";

import { createCredentialsRouter } from "./credentials.js";
import { createJudgesRouter, type JudgeSyncService } from "./judges.js";
import { createPlaygroundRouter, type JudgePlaygroundService } from "./playground.js";

export interface ApiContext {
  readonly database: DatabaseService;
  readonly judges: JudgePlaygroundService & Partial<JudgeSyncService>;
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
  credentials: createCredentialsRouter(t),
  judges: createJudgesRouter(t),
  playground: createPlaygroundRouter(t)
});

export type AppRouter = typeof appRouter;

export type {
  CredentialStatus,
  SaveCredentialsInput,
} from "./credentials.js";

export {
  clearStoredCredentials,
  getStoredCodeforcesCredentials,
  getStoredQojCredentials,
  seedStoredCredentials
} from "./storedCredentials.js";

export type {
  SeedStoredCredentialsInput,
  StoredCodeforcesCredentials,
  StoredQojCredentials
} from "./storedCredentials.js";

export type {
  JudgeSyncEvent,
  JudgeSyncInput,
  JudgeSyncService,
  JudgeSyncSummary
} from "./judges.js";

export type {
  JudgePlaygroundService,
  PlaygroundError,
  PlaygroundInput,
  PlaygroundOperation,
  PlaygroundProvider,
  PlaygroundResult
} from "./playground.js";
