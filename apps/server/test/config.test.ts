import { describe, expect, it } from "vitest";

import { loadServerConfig } from "../src/config.js";

describe("loadServerConfig", () => {
  it("uses stable local defaults", () => {
    expect(loadServerConfig({})).toEqual({
      host: "127.0.0.1",
      port: 3773,
      databasePath: ".local/icpc-trainer.sqlite",
      codeforces: {
        apiKey: undefined,
        apiSecret: undefined
      },
      qoj: {
        cookieJar: undefined
      }
    });
  });

  it("accepts host, port, sqlite path, and judge auth overrides", () => {
    expect(
      loadServerConfig({
        ICPC_TRAINER_HOST: "localhost",
        ICPC_TRAINER_PORT: "4123",
        ICPC_TRAINER_SQLITE_PATH: ":memory:",
        ICPC_TRAINER_CODEFORCES_API_KEY: "cf-key",
        ICPC_TRAINER_CODEFORCES_API_SECRET: "cf-secret",
        ICPC_TRAINER_QOJ_COOKIE_UOJ_USERNAME: "qoj-user",
        ICPC_TRAINER_QOJ_COOKIE_UOJSESSID: "session"
      }),
    ).toEqual({
      host: "localhost",
      port: 4123,
      databasePath: ":memory:",
      codeforces: {
        apiKey: "cf-key",
        apiSecret: "cf-secret"
      },
      qoj: {
        cookieJar: "uoj_username=qoj-user; uojsessid=session"
      }
    });
  });
});
