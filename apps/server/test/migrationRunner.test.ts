import { DatabaseLive } from "@icpc-trainer/db";
import { Effect } from "effect";
import { describe, expect, it } from "vitest";

import {
  migrateAndVerifyDatabase,
  productionDatabaseConfigFromEnv
} from "../src/migrationRunner.js";

describe("production database migration runner", () => {
  it("applies migrations, verifies readiness, and remains idempotent", async () => {
    const program = Effect.gen(function* () {
      const first = yield* migrateAndVerifyDatabase;
      const second = yield* migrateAndVerifyDatabase;
      return [first, second];
    });

    await expect(Effect.runPromise(program.pipe(
      Effect.provide(DatabaseLive({ url: ":memory:" })),
      Effect.scoped
    ))).resolves.toEqual(["ok", "ok"]);
  });

  it("requires an explicit remote URL and auth token for production", () => {
    expect(() => productionDatabaseConfigFromEnv({}))
      .toThrow("ICPC_TRAINER_DATABASE_URL is required for production database migrations");
    expect(() => productionDatabaseConfigFromEnv({
      ICPC_TRAINER_DATABASE_URL: "file:.local/accidental.sqlite",
      ICPC_TRAINER_DATABASE_AUTH_TOKEN: "token"
    })).toThrow("Production database migrations require an explicit remote database URL");
    expect(() => productionDatabaseConfigFromEnv({
      ICPC_TRAINER_DATABASE_URL: ":memory:",
      ICPC_TRAINER_DATABASE_AUTH_TOKEN: "token"
    })).toThrow("Production database migrations require an explicit remote database URL");
    expect(() => productionDatabaseConfigFromEnv({
      ICPC_TRAINER_DATABASE_URL: "libsql://icpc-trainer.turso.io"
    })).toThrow("ICPC_TRAINER_DATABASE_AUTH_TOKEN is required for production database migrations");

    expect(productionDatabaseConfigFromEnv({
      ICPC_TRAINER_DATABASE_URL: " libsql://icpc-trainer.turso.io ",
      ICPC_TRAINER_DATABASE_AUTH_TOKEN: " token "
    })).toEqual({
      url: "libsql://icpc-trainer.turso.io",
      authToken: "token"
    });
  });
});
