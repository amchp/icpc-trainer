import { createClient, type Client } from "@libsql/client";
import { drizzle, type LibSQLDatabase } from "drizzle-orm/libsql";
import { migrate } from "drizzle-orm/libsql/migrator";
import { count } from "drizzle-orm";
import { Context, Effect, Layer, Scope } from "effect";
import { dirname, resolve } from "node:path";
import { mkdirSync } from "node:fs";
import { fileURLToPath } from "node:url";

import {
  appUserJudgeUsers,
  appUsers,
  healthChecks,
  providerCredentials,
  schema,
  userContestStates,
  users
} from "./schema.js";

export {
  schema,
  appUserJudgeUsers,
  appUsers,
  healthChecks,
  providerCredentials,
  userContestStates,
  users
};

export type DatabaseClient = LibSQLDatabase<typeof schema>;

export interface DatabaseConfig {
  readonly url: string;
  readonly authToken?: string;
}

export interface DatabaseService {
  readonly url: string;
  readonly db: DatabaseClient;
  readonly migrate: Effect.Effect<void>;
  readonly healthCheck: Effect.Effect<"ok">;
  readonly close: Effect.Effect<void>;
}

export class DatabaseServiceTag extends Context.Tag("@icpc-trainer/db/DatabaseService")<
  DatabaseServiceTag,
  DatabaseService
>() {}

export const DEFAULT_DATABASE_URL = "file:.local/icpc-trainer.sqlite";

export const isLocalDatabaseUrl = (url: string): boolean =>
  url === ":memory:" || url.startsWith("file:");

export const resolveDatabaseUrl = (input?: {
  readonly databaseUrl?: string;
  readonly legacySqlitePath?: string;
}): string => {
  const databaseUrl = input?.databaseUrl?.trim();
  if (databaseUrl) {
    return databaseUrl;
  }

  const legacySqlitePath = input?.legacySqlitePath?.trim();
  if (!legacySqlitePath) {
    return DEFAULT_DATABASE_URL;
  }

  if (legacySqlitePath === ":memory:" || legacySqlitePath.startsWith("file:")) {
    return legacySqlitePath;
  }

  return `file:${legacySqlitePath}`;
};

const localFilePath = (url: string): string | undefined => {
  if (!url.startsWith("file:")) {
    return undefined;
  }

  return url.slice("file:".length);
};

const ensureDatabaseDirectory = (url: string): void => {
  const filename = localFilePath(url);
  if (filename === undefined || filename === "" || filename === ":memory:") {
    return;
  }

  mkdirSync(dirname(filename), { recursive: true });
};

const packageRoot = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const migrationsFolder = resolve(packageRoot, "drizzle");

export const migrateDatabase = (db: DatabaseClient): Effect.Effect<void> =>
  Effect.promise(() => migrate(db, { migrationsFolder }));

export const makeDatabaseService = (
  config: DatabaseConfig,
): Effect.Effect<DatabaseService, never, Scope.Scope> =>
  Effect.acquireRelease(
    Effect.sync(() => {
      ensureDatabaseDirectory(config.url);
      const client: Client = createClient({
        url: config.url,
        authToken: config.authToken
      });
      const db = drizzle(client, { schema });

      const service: DatabaseService = {
        url: config.url,
        db,
        migrate: migrateDatabase(db),
        healthCheck: Effect.promise(async () => {
          const [result] = await db.select({ value: count() }).from(healthChecks).all();
          if (result?.value === undefined) {
            throw new Error("Health table query returned no result");
          }
          return "ok" as const;
        }),
        close: Effect.sync(() => client.close())
      };

      return service;
    }),
    (service) => service.close
  );

export const DatabaseLive = (config: DatabaseConfig): Layer.Layer<DatabaseServiceTag> =>
  Layer.scoped(DatabaseServiceTag, makeDatabaseService(config));
