import { describe, expect, it } from "vitest";

import { loadServerConfig } from "../src/config.js";

describe("loadServerConfig", () => {
  it("uses stable local defaults", () => {
    expect(loadServerConfig({})).toEqual({
      host: "127.0.0.1",
      port: 3773,
      databasePath: ".local/icpc-trainer.sqlite"
    });
  });

  it("accepts host, port, and sqlite path overrides", () => {
    expect(
      loadServerConfig({
        ICPC_TRAINER_HOST: "localhost",
        ICPC_TRAINER_PORT: "4123",
        ICPC_TRAINER_SQLITE_PATH: ":memory:"
      }),
    ).toEqual({
      host: "localhost",
      port: 4123,
      databasePath: ":memory:"
    });
  });
});
