import { appUserJudgeUsers, providerCredentials, users } from "@icpc-trainer/db";
import type { DatabaseService } from "@icpc-trainer/db";
import { JUDGES, USER_TYPES, judgeFromProvider } from "@icpc-trainer/shared";
import { and, desc, eq, sql } from "drizzle-orm";

import type { PlaygroundProvider } from "./playground.js";

const CODEFORCES_CREDENTIAL_TYPE = "api_credentials";
export const QOJ_CREDENTIAL_TYPE = "cookie_jar";
const DEFAULT_PROVIDER_USER_KEY = "default";

export interface CredentialDatabaseContext {
  readonly database: DatabaseService;
  readonly appUserId: number;
}

export interface CredentialStatus {
  readonly codeforces: {
    readonly saved: boolean;
    readonly lastValidatedAt?: string;
  };
  readonly qoj: {
    readonly saved: boolean;
    readonly lastValidatedAt?: string;
  };
}

export interface SaveCredentialsInput {
  readonly provider: PlaygroundProvider;
  readonly providerUserKey?: string;
  readonly codeforces?: {
    readonly apiKey?: string;
    readonly apiSecret?: string;
  };
  readonly qoj?: {
    readonly cookieJar?: string;
  };
}

const credentialTypeFor = (provider: PlaygroundProvider): string =>
  provider === JUDGES.Codeforces ? CODEFORCES_CREDENTIAL_TYPE : QOJ_CREDENTIAL_TYPE;

const normalizeProviderUserKey = (value: string | undefined): string =>
  value?.trim().toLowerCase() || DEFAULT_PROVIDER_USER_KEY;

const qojUsernameFromCookieJar = (cookieJar: string | undefined): string | null => {
  if (cookieJar === undefined) {
    return null;
  }

  const cookie = cookieJar
    .split(";")
    .map((entry) => entry.trim())
    .find((entry) => entry.startsWith("uoj_username="));
  const value = cookie?.slice("uoj_username=".length).trim();
  return value ? decodeURIComponent(value) : null;
};

const trackedTeamUsername = (input: SaveCredentialsInput): string | null => {
  const username = input.provider === JUDGES.Qoj
    ? input.providerUserKey?.trim() || qojUsernameFromCookieJar(input.qoj?.cookieJar)
    : input.providerUserKey?.trim();

  return username && normalizeProviderUserKey(username) !== DEFAULT_PROVIDER_USER_KEY
    ? username
    : null;
};

const attachTeamUser = async (
  ctx: CredentialDatabaseContext,
  username: string,
  judge: JUDGES,
  timestamp: Date
): Promise<void> => {
  await ctx.database.db
    .insert(users)
    .values({
      username,
      judge,
      createdAt: timestamp,
      updatedAt: timestamp
    })
    .onConflictDoNothing()
    .run();

  const user = await ctx.database.db
    .select({ id: users.id })
    .from(users)
    .where(and(
      sql`lower(${users.username}) = ${username.toLowerCase()}`,
      eq(users.judge, judge)
    ))
    .get();

  if (user === undefined) {
    throw new Error(`Judge user ${username} was not found after credential save.`);
  }

  await ctx.database.db
    .update(users)
    .set({ updatedAt: timestamp })
    .where(eq(users.id, user.id))
    .run();

  await ctx.database.db
    .insert(appUserJudgeUsers)
    .values({
      appUserId: ctx.appUserId,
      userId: user.id,
      role: USER_TYPES.Team,
      createdAt: timestamp,
      updatedAt: timestamp
    })
    .onConflictDoUpdate({
      target: [appUserJudgeUsers.appUserId, appUserJudgeUsers.userId],
      set: {
        role: USER_TYPES.Team,
        updatedAt: timestamp
      }
    })
    .run();
};

export const getLatestCredential = async (
  ctx: CredentialDatabaseContext,
  provider: PlaygroundProvider,
): Promise<typeof providerCredentials.$inferSelect | null> => {
  const credential = await ctx.database.db
    .select()
    .from(providerCredentials)
    .where(
      and(
        eq(providerCredentials.appUserId, ctx.appUserId),
        eq(providerCredentials.provider, provider),
        eq(providerCredentials.credentialType, credentialTypeFor(provider))
      )
    )
    .orderBy(desc(providerCredentials.updatedAt))
    .get();

  return credential ?? null;
};

export const getCredentialStatus = async (ctx: CredentialDatabaseContext): Promise<CredentialStatus> => {
  const codeforces = await getLatestCredential(ctx, JUDGES.Codeforces);
  const qoj = await getLatestCredential(ctx, JUDGES.Qoj);

  return {
    codeforces: {
      saved: codeforces !== null,
      lastValidatedAt: codeforces?.lastValidatedAt?.toISOString()
    },
    qoj: {
      saved: qoj !== null,
      lastValidatedAt: qoj?.lastValidatedAt?.toISOString()
    }
  };
};

export const saveEncryptedCredential = async (
  ctx: CredentialDatabaseContext,
  input: SaveCredentialsInput,
  encryptedPayload: string,
): Promise<CredentialStatus> => {
  const now = new Date();
  const teamUsername = trackedTeamUsername(input);
  const judge = judgeFromProvider(input.provider);

  await ctx.database.db
    .insert(providerCredentials)
    .values({
      provider: input.provider,
      appUserId: ctx.appUserId,
      providerUserKey: DEFAULT_PROVIDER_USER_KEY,
      credentialType: credentialTypeFor(input.provider),
      encryptedPayload,
      lastValidatedAt: now,
      createdAt: now,
      updatedAt: now
    })
    .onConflictDoUpdate({
      target: [
        providerCredentials.appUserId,
        providerCredentials.provider,
        providerCredentials.providerUserKey,
        providerCredentials.credentialType
      ],
      set: {
        encryptedPayload,
        lastValidatedAt: now,
        updatedAt: now
      }
    })
    .run();

  if (teamUsername !== null) {
    await attachTeamUser(ctx, teamUsername, judge, now);
  }

  return getCredentialStatus(ctx);
};

export const clearCredentials = async (
  ctx: CredentialDatabaseContext,
  provider: PlaygroundProvider,
): Promise<CredentialStatus> => {
  await ctx.database.db
    .delete(providerCredentials)
    .where(
      and(
        eq(providerCredentials.appUserId, ctx.appUserId),
        eq(providerCredentials.provider, provider),
        eq(providerCredentials.credentialType, credentialTypeFor(provider))
      )
    )
    .run();

  return getCredentialStatus(ctx);
};
