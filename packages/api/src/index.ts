import { APP_SERVICE_ID, type HealthStatus } from "@icpc-trainer/shared";
import type { DatabaseService } from "@icpc-trainer/db";
import { initTRPC } from "@trpc/server";
import { Effect } from "effect";

import { createAccountRouter } from "./account.js";
import {
  createCredentialsRouter,
  type CredentialStatus,
  type SaveCredentialsInput
} from "./credentials.js";
import {
  createContestFinderRouter,
  type ContestFinderRefreshService
} from "./contestFinder.js";
import { createFindProblemsRouter } from "./findProblems.js";
import { createFriendsRouter } from "./friends.js";
import { createJudgesRouter, type JudgeSyncService } from "./judges.js";
import { createPlaygroundRouter, type JudgePlaygroundService } from "./playground.js";
import {
  createUpsolvingRouter,
  type UpsolvingContestRow,
  type UpsolvingOverview,
  type UpsolvingProblemRow,
  type UpsolvingProblemStatus
} from "./upsolving.js";
import { createTeamRouter, type TeamRoster } from "./team.js";

export interface JudgeCredentialValidationService {
  readonly validateCredentials: (input: SaveCredentialsInput) => Promise<void>;
}

export type CredentialStatusEvent =
  | {
      readonly type: "snapshot";
      readonly status: CredentialStatus;
      readonly occurredAt: string;
    }
  | {
      readonly type: "changed";
      readonly status: CredentialStatus;
      readonly occurredAt: string;
    };

export interface CredentialStatusEventService {
  readonly publish: (event: CredentialStatusEvent) => void;
  readonly subscribe: () => AsyncIterable<CredentialStatusEvent>;
}

export interface ApiContext {
  readonly database: DatabaseService;
  readonly judges: JudgePlaygroundService & JudgeCredentialValidationService & Partial<JudgeSyncService> & Partial<ContestFinderRefreshService>;
  readonly credentialEvents?: CredentialStatusEventService;
}

const t = initTRPC.context<ApiContext>().create();

export const appRouter = t.router({
  account: createAccountRouter(t),
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
  contestFinder: createContestFinderRouter(t),
  findProblems: createFindProblemsRouter(t),
  friends: createFriendsRouter(t),
  judges: createJudgesRouter(t),
  playground: createPlaygroundRouter(t),
  team: createTeamRouter(t),
  upsolving: createUpsolvingRouter(t)
});

export type AppRouter = typeof appRouter;

export type {
  AppDataStatus
} from "./account.js";

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
  ContestFinderRefreshEvent,
  ContestFinderRefreshInput,
  ContestFinderRefreshObserveEvent,
  ContestFinderOverview,
  ContestFinderRefreshProviderState,
  ContestFinderRefreshResult,
  ContestFinderRefreshService,
  ContestFinderRefreshStatus,
  ContestFinderRefreshWarning,
  ContestFinderRow,
} from "./contestFinder.js";

export type {
  FindProblemRow,
  FindProblemsOverview
} from "./findProblems.js";

export type {
  FriendsRoster,
} from "./friends.js";

export type {
  SeedStoredCredentialsInput,
  StoredCodeforcesCredentials,
  StoredQojCredentials
} from "./storedCredentials.js";

export type {
  JudgeSyncEvent,
  JudgeSyncInput,
  JudgeSyncObserveEvent,
  JudgeSyncProviderState,
  JudgeSyncService,
  JudgeSyncStepState,
  JudgeSyncSummary
} from "./judges.js";

export {
  judgeSyncInputSchema,
  JudgeSyncEventType,
  JudgeSyncStep,
  SyncRunStatus,
  SyncStepStatus
} from "./judges.js";

export type {
  JudgePlaygroundService,
  PlaygroundError,
  PlaygroundInput,
  PlaygroundOperation,
  PlaygroundProvider,
  PlaygroundResult
} from "./playground.js";

export type {
  RefetchContestInput,
  UpsolvingContestRow,
  UpsolvingOverview,
  UpsolvingProblemRow,
  UpsolvingProblemStatus
} from "./upsolving.js";

export type {
  TeamRoster
} from "./team.js";
