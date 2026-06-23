import { DatabaseLive, DatabaseServiceTag, schema } from "@icpc-trainer/db";
import { JUDGES, USER_TYPES } from "@icpc-trainer/shared";
import { eq } from "drizzle-orm";
import { Effect } from "effect";
import { describe, expect, it } from "vitest";

import { appRouter } from "../src/index.js";

const { users } = schema;

describe("user roster routers", () => {
  it("adds team users through a create-only endpoint", async () => {
    const program = Effect.gen(function* () {
      const database = yield* DatabaseServiceTag;
      yield* database.migrate;
      const caller = appRouter.createCaller({
        database,
        judges: {
          run: async (input) => ({ ok: true as const, result: input }),
          validateCredentials: async () => undefined
        }
      });

      yield* Effect.promise(() => caller.team.add({
        username: "tourist",
        judge: JUDGES.Codeforces
      }));

      yield* Effect.promise(() =>
        expect(caller.team.add({
          username: "tourist",
          judge: JUDGES.Codeforces
        })).rejects.toThrow("tourist is already saved as a team user.")
      );

      return database.db.select().from(users).where(eq(users.username, "tourist")).all();
    });

    const storedUsers = await Effect.runPromise(
      program.pipe(Effect.provide(DatabaseLive({ filename: ":memory:" }))),
    );

    expect(storedUsers).toHaveLength(1);
    expect(storedUsers[0]).toMatchObject({
      username: "tourist",
      judge: JUDGES.Codeforces,
      type: USER_TYPES.Team
    });
  });

  it("returns a conflict when adding a friend that already exists as another user type", async () => {
    const program = Effect.gen(function* () {
      const database = yield* DatabaseServiceTag;
      yield* database.migrate;
      const caller = appRouter.createCaller({
        database,
        judges: {
          run: async (input) => ({ ok: true as const, result: input }),
          validateCredentials: async () => undefined
        }
      });

      yield* Effect.promise(() => caller.team.add({
        username: "tourist",
        judge: JUDGES.Codeforces
      }));

      yield* Effect.promise(() =>
        expect(caller.friends.add({
          username: "tourist",
          judge: JUDGES.Codeforces
        })).rejects.toThrow("tourist is already saved as a team user.")
      );

      return database.db.select().from(users).where(eq(users.username, "tourist")).all();
    });

    const storedUsers = await Effect.runPromise(
      program.pipe(Effect.provide(DatabaseLive({ filename: ":memory:" }))),
    );

    expect(storedUsers).toHaveLength(1);
    expect(storedUsers[0]).toMatchObject({
      username: "tourist",
      judge: JUDGES.Codeforces,
      type: USER_TYPES.Team
    });
  });
});
