import { DatabaseLive, DatabaseServiceTag, schema } from "@icpc-trainer/db";
import { JUDGES, USER_TYPES } from "@icpc-trainer/shared";
import { Effect } from "effect";
import { describe, expect, it } from "vitest";

import { addUserToRoster, replaceUserRoster } from "../src/userRoster.js";
import { attachJudgeUser, createTestAppUser } from "./testAppUser.js";

const { users } = schema;

describe("user roster module", () => {
  it("normalizes and dedupes replacement rows", async () => {
    const roster = await Effect.runPromise(
      Effect.gen(function* () {
        const database = yield* DatabaseServiceTag;
        yield* database.migrate;
        const appUser = createTestAppUser(database);

        return replaceUserRoster(database, appUser.id, USER_TYPES.Team, [
          { username: " tourist ", judge: JUDGES.Codeforces },
          { username: "Tourist", judge: JUDGES.Codeforces },
          { username: "benq", judge: JUDGES.Qoj }
        ], "team user");
      }).pipe(Effect.provide(DatabaseLive({ filename: ":memory:" })))
    );

    expect(roster.users).toEqual([
      { username: "tourist", judge: JUDGES.Codeforces, type: USER_TYPES.Team },
      { username: "benq", judge: JUDGES.Qoj, type: USER_TYPES.Team }
    ]);
  });

  it("keeps conflict messages stable across roster types", async () => {
    await Effect.runPromise(
      Effect.gen(function* () {
        const database = yield* DatabaseServiceTag;
        yield* database.migrate;
        const timestamp = new Date("2026-01-01T00:00:00.000Z");
        const appUser = createTestAppUser(database);

        database.db.insert(users).values({
          username: "tourist",
          judge: JUDGES.Codeforces,
          createdAt: timestamp,
          updatedAt: timestamp
        }).run();
        const user = database.db.select().from(users).get();
        if (user === undefined) {
          throw new Error("Expected test judge user.");
        }
        attachJudgeUser(database, appUser.id, user.id, USER_TYPES.Team);

        yield* Effect.sync(() =>
          expect(() =>
            addUserToRoster(database, appUser.id, USER_TYPES.Friend, {
              username: "tourist",
              judge: JUDGES.Codeforces
            }, "friend")
          ).toThrow("tourist is already saved as a team user.")
        );
      }).pipe(Effect.provide(DatabaseLive({ filename: ":memory:" })))
    );
  });

  it("reuses existing judge users when roster casing differs", async () => {
    const result = await Effect.runPromise(
      Effect.gen(function* () {
        const database = yield* DatabaseServiceTag;
        yield* database.migrate;
        const firstAppUser = createTestAppUser(database, "first_app_user");
        const secondAppUser = createTestAppUser(database, "second_app_user");

        addUserToRoster(database, firstAppUser.id, USER_TYPES.Team, {
          username: "Tourist",
          judge: JUDGES.Codeforces
        }, "team user");
        const secondRoster = addUserToRoster(database, secondAppUser.id, USER_TYPES.Team, {
          username: "tourist",
          judge: JUDGES.Codeforces
        }, "team user");

        return {
          users: database.db.select().from(users).all(),
          secondRoster
        };
      }).pipe(Effect.provide(DatabaseLive({ filename: ":memory:" })))
    );

    expect(result.users).toHaveLength(1);
    expect(result.users[0]).toMatchObject({
      username: "Tourist",
      judge: JUDGES.Codeforces
    });
    expect(result.secondRoster.users).toEqual([
      { username: "Tourist", judge: JUDGES.Codeforces, type: USER_TYPES.Team }
    ]);
  });
});
