import { APP_SERVICE_ID, type HealthStatus } from "@icpc-trainer/shared";
import type { DatabaseService } from "@icpc-trainer/db";
import { initTRPC, TRPCError } from "@trpc/server";
import { Effect } from "effect";
import { z } from "zod";

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
import { createFriendsRouter } from "./friends.js";
import { createPlaygroundRouter, type JudgePlaygroundService } from "./playground.js";
import {
  createUpsolvingRouter,
  type RefetchContestInput,
  type UpsolvingContestRow,
  type UpsolvingOverview,
  type UpsolvingProblemRow,
  type UpsolvingProblemStatus
} from "./upsolving.js";
import { createTeamRouter, type TeamRoster } from "./team.js";

export const judgeSyncInputSchema = z.object({
  provider: z.enum(["codeforces", "qoj"])
});

export type JudgeSyncInput = z.infer<typeof judgeSyncInputSchema>;

export interface JudgeSyncSummary {
  readonly usersProcessed: number;
  readonly submissionsFetched: number;
  readonly submissionsInserted: number;
  readonly submissionsUpdated: number;
  readonly submissionsSkipped: number;
  readonly contestsSynced: number;
  readonly regularContestsImported: number;
  readonly regularProblemsImported: number;
  readonly regularPendingSubmissionsRetried: number;
  readonly errors: number;
}

export type JudgeSyncStep = "submissions" | "contests" | "regularCatalog";

interface JudgeSyncEventBase {
  readonly provider: JudgeSyncInput["provider"];
  readonly stepsTotal: number;
  readonly stepsLeft: number;
}

export type JudgeSyncEvent =
  | (JudgeSyncEventBase & {
      readonly type: "started";
    })
  | (JudgeSyncEventBase & {
      readonly type: "submissions.syncing";
      readonly step: "submissions";
      readonly usersTotal: number;
    })
  | (JudgeSyncEventBase & {
      readonly type: "submissions.userSyncing";
      readonly step: "submissions";
      readonly userHandle: string;
      readonly userIndex: number;
      readonly usersTotal: number;
    })
  | (JudgeSyncEventBase & {
      readonly type: "submissions.userSynced";
      readonly step: "submissions";
      readonly userHandle: string;
      readonly fetched: number;
      readonly inserted: number;
      readonly updated: number;
      readonly skipped: number;
      readonly missingProblems: number;
    })
  | (JudgeSyncEventBase & {
      readonly type: "contests.syncing";
      readonly step: "contests";
      readonly contestsTotal: number;
      readonly contestsLeft: number;
    })
  | (JudgeSyncEventBase & {
      readonly type: "contests.contestSyncing";
      readonly step: "contests";
      readonly contestJudgeId: string;
      readonly contestsLeft: number;
      readonly contestsTotal: number;
    })
  | (JudgeSyncEventBase & {
      readonly type: "contests.contestSynced";
      readonly step: "contests";
      readonly contestJudgeId: string;
      readonly problemsSynced: number;
    })
  | (JudgeSyncEventBase & {
      readonly type: "regularCatalog.contestsSyncing";
      readonly step: "regularCatalog";
    })
  | (JudgeSyncEventBase & {
      readonly type: "regularCatalog.contestsSynced";
      readonly step: "regularCatalog";
      readonly contestsTotal: number;
    })
  | (JudgeSyncEventBase & {
      readonly type: "regularCatalog.problemsSyncing";
      readonly step: "regularCatalog";
      readonly contestsTotal: number;
    })
  | (JudgeSyncEventBase & {
      readonly type: "regularCatalog.problemsSynced";
      readonly step: "regularCatalog";
      readonly contestsImported: number;
      readonly problemsImported: number;
      readonly pendingSubmissionsRetried: number;
    })
  | (JudgeSyncEventBase & {
      readonly type: "error";
      readonly phase: "submissions" | "contests" | "regularCatalog" | "database" | "concurrency";
      readonly step?: JudgeSyncStep;
      readonly message: string;
      readonly userHandle?: string;
      readonly contestJudgeId?: string;
      readonly judgeId?: string;
    })
  | {
      readonly type: "completed";
      readonly provider: JudgeSyncInput["provider"];
      readonly stepsTotal: number;
      readonly stepsLeft: 0;
      readonly summary: JudgeSyncSummary;
    };

export type JudgeSyncObserveEvent =
  | {
      readonly type: "snapshot";
      readonly provider: JudgeSyncInput["provider"];
      readonly running: boolean;
      readonly events: readonly JudgeSyncEvent[];
    }
  | JudgeSyncEvent;

export interface JudgeSyncService {
  readonly start: (input: JudgeSyncInput) => Promise<void>;
  readonly observe: (input: JudgeSyncInput) => AsyncIterable<JudgeSyncObserveEvent>;
  readonly refetchContest?: (input: RefetchContestInput) => Promise<void>;
}

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

const createJudgesRouter = () =>
  t.router({
    startSync: t.procedure.input(judgeSyncInputSchema).mutation(async ({ ctx, input }) => {
      if (ctx.judges.start === undefined) {
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: "Judge sync service is not configured."
        });
      }

      await ctx.judges.start(input);
    }),
    observeSync: t.procedure.input(judgeSyncInputSchema).subscription(async function* ({ ctx, input }) {
      if (ctx.judges.observe === undefined) {
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: "Judge sync service is not configured."
        });
      }

      yield* ctx.judges.observe(input);
    })
  });

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
  friends: createFriendsRouter(t),
  judges: createJudgesRouter(),
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
  ContestFinderRefreshResult,
  ContestFinderRefreshService,
  ContestFinderRefreshWarning,
  ContestFinderRow,
} from "./contestFinder.js";

export type {
  FriendsRoster,
} from "./friends.js";

export type {
  SeedStoredCredentialsInput,
  StoredCodeforcesCredentials,
  StoredQojCredentials
} from "./storedCredentials.js";

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
