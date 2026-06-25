import { appUsers, type DatabaseService } from "@icpc-trainer/db";
import { TRPCError } from "@trpc/server";
import { eq } from "drizzle-orm";
import { Context } from "effect";

export type AppUser = typeof appUsers.$inferSelect;

export class AppUserIdTag extends Context.Tag("@icpc-trainer/api/AppUserId")<
  AppUserIdTag,
  number
>() {}

export interface AuthenticatedAppUserInput {
  readonly clerkUserId: string;
  readonly primaryEmail?: string | null;
  readonly displayName?: string | null;
  readonly imageUrl?: string | null;
}

export interface AppUserContext {
  readonly database: DatabaseService;
}

export const upsertAppUser = (
  ctx: AppUserContext,
  input: AuthenticatedAppUserInput
): AppUser => {
  const now = new Date();

  ctx.database.db
    .insert(appUsers)
    .values({
      clerkUserId: input.clerkUserId,
      primaryEmail: input.primaryEmail ?? null,
      displayName: input.displayName ?? null,
      imageUrl: input.imageUrl ?? null,
      createdAt: now,
      updatedAt: now
    })
    .onConflictDoUpdate({
      target: [appUsers.clerkUserId],
      set: {
        primaryEmail: input.primaryEmail ?? null,
        displayName: input.displayName ?? null,
        imageUrl: input.imageUrl ?? null,
        updatedAt: now
      }
    })
    .run();

  const appUser = ctx.database.db
    .select()
    .from(appUsers)
    .where(eq(appUsers.clerkUserId, input.clerkUserId))
    .get();

  if (appUser === undefined) {
    throw new Error(`App user ${input.clerkUserId} was not found after upsert.`);
  }

  return appUser;
};

export const requireAppUser = (appUser: AppUser | undefined): AppUser => {
  if (appUser === undefined) {
    throw new TRPCError({
      code: "UNAUTHORIZED",
      message: "Sign in to use ICPC Trainer."
    });
  }

  return appUser;
};
