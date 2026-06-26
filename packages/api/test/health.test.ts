import { describe, expect, it } from "vitest";
import { Effect } from "effect";

import { DatabaseLive, DatabaseServiceTag } from "@icpc-trainer/db";
import { appRouter } from "../src/index.js";

describe("appRouter", () => {
  it("returns a health payload from the Effect-backed database service", async () => {
    const program = Effect.gen(function* () {
      const database = yield* DatabaseServiceTag;
      yield* database.migrate;
      const caller = appRouter.createCaller({
        database,
        judges: {
          run: async () => ({ ok: true as const, result: { ok: true } }),
          validateCredentials: async () => undefined
        }
      });
      return yield* Effect.promise(() => caller.health.ping());
    });

    const result = await Effect.runPromise(
      program.pipe(Effect.provide(DatabaseLive({ url: ":memory:" }))),
    );

    expect(result).toMatchObject({
      ok: true,
      service: "icpc-trainer",
      database: "ok"
    });
    expect(new Date(result.timestamp).toString()).not.toBe("Invalid Date");
  });
});
