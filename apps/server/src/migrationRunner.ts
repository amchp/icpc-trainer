import {
  DatabaseLive,
  DatabaseServiceTag,
  isLocalDatabaseUrl,
  resolveDatabaseUrl,
  type DatabaseConfig
} from "@icpc-trainer/db";
import { Effect } from "effect";

export const migrateAndVerifyDatabase = Effect.gen(function* () {
  const database = yield* DatabaseServiceTag;
  yield* database.migrate;
  return yield* database.healthCheck;
});

export const runConfiguredDatabaseMigration = (
  config: DatabaseConfig
): Promise<"ok"> => Effect.runPromise(
  migrateAndVerifyDatabase.pipe(
    Effect.provide(DatabaseLive(config)),
    Effect.scoped
  )
);

const requiredProductionValue = (
  environment: NodeJS.ProcessEnv,
  name: "ICPC_TRAINER_DATABASE_URL" | "ICPC_TRAINER_DATABASE_AUTH_TOKEN"
): string => {
  const value = environment[name]?.trim();
  if (value === undefined || value === "") {
    throw new Error(`${name} is required for production database migrations.`);
  }
  return value;
};

export const productionDatabaseConfigFromEnv = (
  environment: NodeJS.ProcessEnv
): DatabaseConfig => {
  const url = resolveDatabaseUrl({
    databaseUrl: requiredProductionValue(environment, "ICPC_TRAINER_DATABASE_URL")
  });
  if (isLocalDatabaseUrl(url)) {
    throw new Error("Production database migrations require an explicit remote database URL.");
  }

  return {
    url,
    authToken: requiredProductionValue(environment, "ICPC_TRAINER_DATABASE_AUTH_TOKEN")
  };
};
