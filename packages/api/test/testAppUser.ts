import { appUserJudgeUsers, appUsers, type DatabaseService } from "@icpc-trainer/db";
import { USER_TYPES } from "@icpc-trainer/shared";
import { eq } from "drizzle-orm";

export const createTestAppUser = (
  database: DatabaseService,
  clerkUserId = "test_app_user"
) => {
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

export const attachJudgeUser = (
  database: DatabaseService,
  appUserId: number,
  userId: number,
  role: USER_TYPES.Team | USER_TYPES.Friend
): void => {
  const now = new Date("2026-01-01T00:00:00.000Z");
  database.db.insert(appUserJudgeUsers).values({
    appUserId,
    userId,
    role,
    createdAt: now,
    updatedAt: now
  }).run();
};
