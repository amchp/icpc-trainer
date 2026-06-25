import { DatabaseLive, DatabaseServiceTag, schema } from "@icpc-trainer/db";
import { JUDGES, USER_TYPES } from "@icpc-trainer/shared";
import { Effect } from "effect";
import { describe, expect, it } from "vitest";

import { addUserToRoster, replaceUserRoster } from "../src/userRoster.js";

const { users } = schema;

describe("user roster module", () => {
  it("normalizes and dedupes replacement rows", async () => {
    const roster = await Effect.runPromise(
      Effect.gen(function* () {
        const database = yield* DatabaseServiceTag;
        yield* database.migrate;

        return replaceUserRoster(database, USER_TYPES.Team, [
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

        database.db.insert(users).values({
          username: "tourist",
          judge: JUDGES.Codeforces,
          type: USER_TYPES.Team,
          createdAt: timestamp,
          updatedAt: timestamp
        }).run();

        yield* Effect.sync(() =>
          expect(() =>
            addUserToRoster(database, USER_TYPES.Friend, {
              username: "tourist",
              judge: JUDGES.Codeforces
            }, "friend")
          ).toThrow("tourist is already saved as a team user.")
        );
      }).pipe(Effect.provide(DatabaseLive({ filename: ":memory:" })))
    );
  });
});
