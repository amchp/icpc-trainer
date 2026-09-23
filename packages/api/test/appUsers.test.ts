import { DatabaseLive, DatabaseServiceTag, appUsers, type DatabaseService } from "@icpc-trainer/db";
import { APP_LOCALES } from "@icpc-trainer/shared";
import { eq } from "drizzle-orm";
import { Effect } from "effect";
import { describe, expect, it, vi } from "vitest";

import { upsertAppUser } from "../src/appUsers.js";

const withDatabase = async (run: (database: DatabaseService, queries: ReturnType<typeof vi.fn>) => Promise<void>) => {
  const queries = vi.fn();
  await Effect.runPromise(Effect.gen(function* () {
    const database = yield* DatabaseServiceTag;
    yield* database.migrate;
    queries.mockClear();
    yield* Effect.promise(() => run(database, queries));
  }).pipe(Effect.provide(DatabaseLive({ url: ":memory:", onQuery: queries }))));
};

const profile = {
  clerkUserId: "user_profile",
  primaryEmail: "person@example.com",
  displayName: "Person",
  imageUrl: "https://example.com/avatar.png"
};

describe("authenticated app user resolution", () => {
  it("uses one read and no write for an unchanged or absent profile", async () => {
    await withDatabase(async (database, queries) => {
      const original = await upsertAppUser({ database }, profile);
      expect(queries).toHaveBeenCalledTimes(2);
      const oldTimestamp = new Date("2025-01-01T00:00:00Z");
      await database.db.update(appUsers).set({ updatedAt: oldTimestamp })
        .where(eq(appUsers.id, original.id)).run();

      for (const input of [profile, { clerkUserId: profile.clerkUserId }]) {
        queries.mockClear();
        const result = await upsertAppUser({ database }, input);
        expect(queries).toHaveBeenCalledTimes(1);
        expect(result).toMatchObject({ ...profile, updatedAt: oldTimestamp });
      }
    });
  });

  it("updates supplied changes, preserves missing claims and locale, and returns without a reread", async () => {
    await withDatabase(async (database, queries) => {
      const original = await upsertAppUser({ database }, profile);
      await database.db.update(appUsers).set({ preferredLocale: APP_LOCALES.Spanish })
        .where(eq(appUsers.id, original.id)).run();
      queries.mockClear();

      const result = await upsertAppUser({ database }, {
        clerkUserId: profile.clerkUserId,
        displayName: "New Name",
        imageUrl: null
      });

      expect(queries).toHaveBeenCalledTimes(2);
      expect(result).toMatchObject({
        id: original.id,
        primaryEmail: profile.primaryEmail,
        displayName: "New Name",
        imageUrl: null,
        preferredLocale: APP_LOCALES.Spanish
      });
      expect(await database.db.select().from(appUsers).get()).toEqual(result);
    });
  });

  it("handles simultaneous first requests without duplicate users or lost profile claims", async () => {
    await withDatabase(async (database) => {
      const results = await Promise.all([
        upsertAppUser({ database }, profile),
        upsertAppUser({ database }, { clerkUserId: profile.clerkUserId })
      ]);
      expect(results[0]?.id).toBe(results[1]?.id);
      const rows = await database.db.select().from(appUsers).all();
      expect(rows).toHaveLength(1);
      expect(rows[0]).toMatchObject(profile);
    });
  });
});
