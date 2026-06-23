import Database from "better-sqlite3";
import { drizzle, type BetterSQLite3Database } from "drizzle-orm/better-sqlite3";
import { migrate } from "drizzle-orm/better-sqlite3/migrator";
import { count } from "drizzle-orm";
import { Context, Effect, Layer, Scope } from "effect";
import { dirname, resolve } from "node:path";
import { mkdirSync } from "node:fs";
import { fileURLToPath } from "node:url";

import { healthChecks, providerCredentials, schema, userContestStates, users } from "./schema.js";

export { schema, healthChecks, providerCredentials, userContestStates, users };

export type DatabaseClient = BetterSQLite3Database<typeof schema>;

export interface DatabaseConfig {
  readonly filename: string;
}

export interface DatabaseService {
  readonly filename: string;
  readonly db: DatabaseClient;
  readonly migrate: Effect.Effect<void>;
  readonly healthCheck: Effect.Effect<"ok">;
  readonly close: Effect.Effect<void>;
}

export class DatabaseServiceTag extends Context.Tag("@icpc-trainer/db/DatabaseService")<
  DatabaseServiceTag,
  DatabaseService
>() {}

export const DEFAULT_DATABASE_PATH = ".local/icpc-trainer.sqlite";

export const resolveDatabasePath = (value: string | undefined): string =>
  value?.trim() ? value.trim() : DEFAULT_DATABASE_PATH;

const ensureDatabaseDirectory = (filename: string): void => {
  if (filename === ":memory:") {
    return;
  }
  mkdirSync(dirname(filename), { recursive: true });
};

const packageRoot = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const migrationsFolder = resolve(packageRoot, "drizzle");

export const migrateDatabase = (db: DatabaseClient): Effect.Effect<void> =>
  Effect.sync(() => migrate(db, { migrationsFolder }));

export const makeDatabaseService = (
  config: DatabaseConfig,
): Effect.Effect<DatabaseService, never, Scope.Scope> =>
  Effect.acquireRelease(
    Effect.sync(() => {
      ensureDatabaseDirectory(config.filename);
      const sqlite = new Database(config.filename);
      const db = drizzle(sqlite, { schema });

      const service: DatabaseService = {
        filename: config.filename,
        db,
        migrate: migrateDatabase(db),
        healthCheck: Effect.sync(() => {
          const [result] = db.select({ value: count() }).from(healthChecks).all();
          if (result?.value === undefined) {
            throw new Error("Health table query returned no result");
          }
          return "ok" as const;
        }),
        close: Effect.sync(() => sqlite.close())
      };

      return service;
    }),
    (service) => service.close
  );

export const DatabaseLive = (config: DatabaseConfig): Layer.Layer<DatabaseServiceTag> =>
  Layer.scoped(DatabaseServiceTag, makeDatabaseService(config));
