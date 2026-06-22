import { providerCredentials, users } from "@icpc-trainer/db";
import type { DatabaseService } from "@icpc-trainer/db";
import { JUDGES, USER_TYPES } from "@icpc-trainer/shared";
import { and, desc, eq } from "drizzle-orm";

import type { PlaygroundProvider } from "./playground.js";

const CODEFORCES_CREDENTIAL_TYPE = "api_credentials";
const QOJ_CREDENTIAL_TYPE = "cookie_jar";
const DEFAULT_PROVIDER_USER_KEY = "default";
const ENV_PROVIDER_USER_KEY = "env";

export interface CredentialDatabaseContext {
  readonly database: DatabaseService;
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

const normalizePrimaryUsername = (value: string | undefined): string | null => {
  const username = value?.trim();
  const providerUserKey = normalizeProviderUserKey(value);
  return username && providerUserKey !== DEFAULT_PROVIDER_USER_KEY && providerUserKey !== ENV_PROVIDER_USER_KEY
    ? username
    : null;
};

const providerJudge = (provider: PlaygroundProvider): JUDGES =>
  provider === JUDGES.Codeforces ? JUDGES.Codeforces : JUDGES.Qoj;

export const getLatestCredential = (
  ctx: CredentialDatabaseContext,
  provider: PlaygroundProvider,
) =>
  ctx.database.db
    .select()
    .from(providerCredentials)
    .where(
      and(
        eq(providerCredentials.provider, provider),
        eq(providerCredentials.credentialType, credentialTypeFor(provider))
      )
    )
    .orderBy(desc(providerCredentials.updatedAt))
    .get() ?? null;

export const getCredentialStatus = (ctx: CredentialDatabaseContext): CredentialStatus => {
  const codeforces = getLatestCredential(ctx, JUDGES.Codeforces);
  const qoj = getLatestCredential(ctx, JUDGES.Qoj);

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

export const saveEncryptedCredential = (
  ctx: CredentialDatabaseContext,
  input: SaveCredentialsInput,
  encryptedPayload: string,
): CredentialStatus => {
  const now = new Date();
  const primaryUsername = normalizePrimaryUsername(input.providerUserKey);
  const judge = providerJudge(input.provider);

  ctx.database.db
    .insert(providerCredentials)
    .values({
      provider: input.provider,
      providerUserKey: normalizeProviderUserKey(input.providerUserKey),
      credentialType: credentialTypeFor(input.provider),
      encryptedPayload,
      lastValidatedAt: now,
      createdAt: now,
      updatedAt: now
    })
    .onConflictDoUpdate({
      target: [
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

  if (primaryUsername !== null) {
    ctx.database.db
      .insert(users)
      .values({
        username: primaryUsername,
        type: USER_TYPES.Primary,
        judge,
        createdAt: now,
        updatedAt: now
      })
      .onConflictDoUpdate({
        target: users.username,
        set: {
          type: USER_TYPES.Primary,
          judge,
          updatedAt: now
        }
      })
      .run();
  }

  return getCredentialStatus(ctx);
};

export const clearCredentials = (
  ctx: CredentialDatabaseContext,
  provider: PlaygroundProvider,
): CredentialStatus => {
  ctx.database.db
    .delete(providerCredentials)
    .where(
      and(
        eq(providerCredentials.provider, provider),
        eq(providerCredentials.credentialType, credentialTypeFor(provider))
      )
    )
    .run();

  ctx.database.db
    .delete(users)
    .where(
      and(
        eq(users.judge, providerJudge(provider)),
        eq(users.type, USER_TYPES.Primary)
      )
    )
    .run();

  return getCredentialStatus(ctx);
};
