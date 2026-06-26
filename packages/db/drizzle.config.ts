import { defineConfig } from "drizzle-kit";
import process from "node:process";
import { resolveDatabaseUrl } from "./src/index.js";

export default defineConfig({
  dialect: "turso",
  schema: "./src/schema.ts",
  out: "./drizzle",
  dbCredentials: {
    url: resolveDatabaseUrl({
      databaseUrl: process.env.ICPC_TRAINER_DATABASE_URL,
      legacySqlitePath: process.env.ICPC_TRAINER_SQLITE_PATH
    }),
    authToken: process.env.ICPC_TRAINER_DATABASE_AUTH_TOKEN
  }
});
