import { describe, expect, it } from "vitest";
import { Effect, Layer } from "effect";

import { DatabaseLive, DatabaseServiceTag } from "../src/index.js";

describe("DatabaseLive", () => {
  it("can be composed as an Effect layer", async () => {
    const layer = Layer.provideMerge(DatabaseLive({ filename: ":memory:" }), Layer.empty);
    const program = Effect.gen(function* () {
      const database = yield* DatabaseServiceTag;
      yield* database.migrate;
      return database.filename;
    });

    await expect(Effect.runPromise(program.pipe(Effect.provide(layer)))).resolves.toBe(":memory:");
  });
});
