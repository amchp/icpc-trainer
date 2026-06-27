import { Buffer } from "node:buffer";
import { describe, expect, it } from "vitest";

import { loadServerConfig } from "../src/config.js";

const credentialKey = Buffer.alloc(32, 7).toString("base64");
const env = (values: NodeJS.ProcessEnv = {}): NodeJS.ProcessEnv => ({
  ICPC_TRAINER_CREDENTIAL_KEY: credentialKey,
  ...values
});

describe("loadServerConfig", () => {
  it("defaults to the local libSQL database URL", () => {
    expect(loadServerConfig(env())).toEqual({
      host: "127.0.0.1",
      port: 3773,
      database: {
        url: "file:.local/icpc-trainer.sqlite",
        authToken: undefined,
        autoMigrate: true
      },
      clerk: {
        secretKey: undefined,
        publishableKey: undefined,
        jwtKey: undefined,
        authorizedParties: []
      },
      taskToken: undefined
    });
  });

  it("accepts host, port, database URL, auth token, and Clerk auth overrides", () => {
    expect(
      loadServerConfig({
        ICPC_TRAINER_CREDENTIAL_KEY: credentialKey,
        ICPC_TRAINER_HOST: "localhost",
        ICPC_TRAINER_PORT: "4123",
        ICPC_TRAINER_DATABASE_URL: ":memory:",
        ICPC_TRAINER_DATABASE_AUTH_TOKEN: "local-token",
        TASK_TOKEN: "task-secret",
        CLERK_SECRET_KEY: "sk_test_secret",
        CLERK_PUBLISHABLE_KEY: "pk_test_public",
        CLERK_JWT_KEY: "jwt-key",
        CLERK_ALLOWED_ORIGINS: "https://app.example, https://admin.example"
      }),
    ).toEqual({
      host: "localhost",
      port: 4123,
      database: {
        url: ":memory:",
        authToken: "local-token",
        autoMigrate: true
      },
      clerk: {
        secretKey: "sk_test_secret",
        publishableKey: "pk_test_public",
        jwtKey: "jwt-key",
        authorizedParties: ["https://app.example", "https://admin.example"]
      },
      taskToken: "task-secret"
    });
  });

  it("prefers ICPC_TRAINER_DATABASE_URL over the deprecated sqlite path", () => {
    expect(loadServerConfig(env({
      ICPC_TRAINER_DATABASE_URL: "file:.local/current.sqlite",
      ICPC_TRAINER_SQLITE_PATH: ".local/legacy.sqlite"
    })).database.url).toBe("file:.local/current.sqlite");
  });

  it("keeps the deprecated sqlite memory path as :memory:", () => {
    expect(loadServerConfig(env({ ICPC_TRAINER_SQLITE_PATH: ":memory:" })).database.url).toBe(":memory:");
  });

  it("converts a deprecated sqlite filesystem path to a file URL", () => {
    expect(loadServerConfig(env({ ICPC_TRAINER_SQLITE_PATH: ".local/foo.sqlite" })).database.url)
      .toBe("file:.local/foo.sqlite");
  });

  it("disables automatic migrations for remote database URLs", () => {
    expect(loadServerConfig({
      ICPC_TRAINER_DATABASE_URL: "libsql://icpc-trainer-example.turso.io",
      ICPC_TRAINER_DATABASE_AUTH_TOKEN: "turso-token",
      ICPC_TRAINER_CREDENTIAL_KEY: credentialKey
    }).database).toEqual({
      url: "libsql://icpc-trainer-example.turso.io",
      authToken: "turso-token",
      autoMigrate: false
    });
  });

  it("enables automatic migrations for local database URLs", () => {
    expect(loadServerConfig(env({ ICPC_TRAINER_DATABASE_URL: "file:.local/dev.sqlite" })).database.autoMigrate)
      .toBe(true);
  });

  it("requires a credential encryption key from the environment", () => {
    expect(() => loadServerConfig({}))
      .toThrow("ICPC_TRAINER_CREDENTIAL_KEY is required.");
  });

  it("rejects credential encryption keys with the wrong length", () => {
    expect(() => loadServerConfig({ ICPC_TRAINER_CREDENTIAL_KEY: Buffer.alloc(16, 7).toString("base64") }))
      .toThrow("ICPC_TRAINER_CREDENTIAL_KEY must be a base64-encoded 32-byte key.");
  });

  it("uses the Vite Clerk publishable key when the legacy server key is absent", () => {
    expect(loadServerConfig(env({ VITE_CLERK_PUBLISHABLE_KEY: "pk_test_public" })).clerk.publishableKey)
      .toBe("pk_test_public");
  });
});
