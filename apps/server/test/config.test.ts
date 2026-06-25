import { describe, expect, it } from "vitest";

import { loadServerConfig } from "../src/config.js";

describe("loadServerConfig", () => {
  it("uses stable local defaults", () => {
    expect(loadServerConfig({})).toEqual({
      host: "127.0.0.1",
      port: 3773,
      databasePath: ".local/icpc-trainer.sqlite",
      clerk: {
        secretKey: undefined,
        publishableKey: undefined,
        jwtKey: undefined,
        authorizedParties: []
      }
    });
  });

  it("accepts host, port, sqlite path, and Clerk auth overrides", () => {
    expect(
      loadServerConfig({
        ICPC_TRAINER_HOST: "localhost",
        ICPC_TRAINER_PORT: "4123",
        ICPC_TRAINER_SQLITE_PATH: ":memory:",
        CLERK_SECRET_KEY: "sk_test_secret",
        CLERK_PUBLISHABLE_KEY: "pk_test_public",
        CLERK_JWT_KEY: "jwt-key",
        CLERK_ALLOWED_ORIGINS: "https://app.example, https://admin.example"
      }),
    ).toEqual({
      host: "localhost",
      port: 4123,
      databasePath: ":memory:",
      clerk: {
        secretKey: "sk_test_secret",
        publishableKey: "pk_test_public",
        jwtKey: "jwt-key",
        authorizedParties: ["https://app.example", "https://admin.example"]
      }
    });
  });
});
