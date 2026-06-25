import { appUserJudgeUsers, DatabaseLive, DatabaseServiceTag, schema } from "@icpc-trainer/db";
import { JUDGES, USER_TYPES } from "@icpc-trainer/shared";
import { eq } from "drizzle-orm";
import { Effect } from "effect";
import { describe, expect, it } from "vitest";

import { appRouter } from "../src/index.js";
import { createTestAppUser } from "./testAppUser.js";

const { users } = schema;

describe("user roster routers", () => {
  it("adds team users through a create-only endpoint", async () => {
    const program = Effect.gen(function* () {
      const database = yield* DatabaseServiceTag;
      yield* database.migrate;
      const appUser = createTestAppUser(database);
      const caller = appRouter.createCaller({
        database,
        appUser,
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

      return {
        users: database.db.select().from(users).where(eq(users.username, "tourist")).all(),
        roles: database.db.select().from(appUserJudgeUsers).all()
      };
    });

    const result = await Effect.runPromise(
      program.pipe(Effect.provide(DatabaseLive({ filename: ":memory:" }))),
    );

    expect(result.users).toHaveLength(1);
    expect(result.users[0]).toMatchObject({
      username: "tourist",
      judge: JUDGES.Codeforces
    });
    expect(result.roles).toMatchObject([{ role: USER_TYPES.Team }]);
  });

  it("returns a conflict when adding a friend that already exists as another user type", async () => {
    const program = Effect.gen(function* () {
      const database = yield* DatabaseServiceTag;
      yield* database.migrate;
      const appUser = createTestAppUser(database);
      const caller = appRouter.createCaller({
        database,
        appUser,
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

      return {
        users: database.db.select().from(users).where(eq(users.username, "tourist")).all(),
        roles: database.db.select().from(appUserJudgeUsers).all()
      };
    });

    const result = await Effect.runPromise(
      program.pipe(Effect.provide(DatabaseLive({ filename: ":memory:" }))),
    );

    expect(result.users).toHaveLength(1);
    expect(result.users[0]).toMatchObject({
      username: "tourist",
      judge: JUDGES.Codeforces
    });
    expect(result.roles).toMatchObject([{ role: USER_TYPES.Team }]);
  });
});
