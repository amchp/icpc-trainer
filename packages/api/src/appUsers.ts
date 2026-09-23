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

export const upsertAppUser = async (
  ctx: AppUserContext,
  input: AuthenticatedAppUserInput
): Promise<AppUser> => {
  const existing = await ctx.database.db
    .select()
    .from(appUsers)
    .where(eq(appUsers.clerkUserId, input.clerkUserId))
    .get();
  const profile = {
    ...(input.primaryEmail !== undefined ? { primaryEmail: input.primaryEmail } : {}),
    ...(input.displayName !== undefined ? { displayName: input.displayName } : {}),
    ...(input.imageUrl !== undefined ? { imageUrl: input.imageUrl } : {})
  };

  if (existing !== undefined && Object.entries(profile).every(
    ([key, value]) => existing[key as keyof typeof profile] === value
  )) {
    return existing;
  }

  const now = new Date();
  // RETURNING avoids another read after a profile write. The conflict path also
  // handles simultaneous first requests without erasing absent profile claims.
  const appUser = existing === undefined
    ? await ctx.database.db
      .insert(appUsers)
      .values({ clerkUserId: input.clerkUserId, ...profile, createdAt: now, updatedAt: now })
      .onConflictDoUpdate({
        target: [appUsers.clerkUserId],
        set: { ...profile, updatedAt: now }
      })
      .returning()
      .get()
    : await ctx.database.db
      .update(appUsers)
      .set({
        ...Object.fromEntries(Object.entries(profile).filter(
          ([key, value]) => existing[key as keyof typeof profile] !== value
        )),
        updatedAt: now
      })
      .where(eq(appUsers.id, existing.id))
      .returning()
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
