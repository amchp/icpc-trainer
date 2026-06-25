import { AppUserIdTag, type AppUser } from "@icpc-trainer/api";
import { appUsers, type DatabaseService } from "@icpc-trainer/db";
import { eq } from "drizzle-orm";
import { Effect } from "effect";

export const createTestAppUser = (
  database: DatabaseService,
  clerkUserId = "server_test_app_user"
): AppUser => {
  const now = new Date("2026-01-01T00:00:00.000Z");
  database.db.insert(appUsers).values({
    clerkUserId,
    primaryEmail: `${clerkUserId}@example.com`,
    displayName: clerkUserId,
    imageUrl: null,
    createdAt: now,
    updatedAt: now
  }).run();

  const appUser = database.db
    .select()
    .from(appUsers)
    .where(eq(appUsers.clerkUserId, clerkUserId))
    .get();
  if (appUser === undefined) {
    throw new Error("Expected test app user.");
  }
  return appUser;
};

export const provideTestAppUser = <A, E, R>(
  effect: Effect.Effect<A, E, R>,
  appUser: AppUser
): Effect.Effect<A, E, Exclude<R, AppUserIdTag>> =>
  Effect.provideService(effect, AppUserIdTag, appUser.id) as Effect.Effect<A, E, Exclude<R, AppUserIdTag>>;
