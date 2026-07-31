import process from "node:process";

import {
  productionDatabaseConfigFromEnv,
  runConfiguredDatabaseMigration
} from "./migrationRunner.js";

const migrateProductionDatabase = async (): Promise<"ok"> =>
  runConfiguredDatabaseMigration(productionDatabaseConfigFromEnv(process.env));

migrateProductionDatabase().then(() => {
  console.log("Database migrations applied and readiness verified.");
}).catch((error: unknown) => {
  console.error(error);
  process.exitCode = 1;
});
