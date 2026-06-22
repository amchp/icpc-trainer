import { providerCredentials } from "@icpc-trainer/db";
import type { DatabaseService } from "@icpc-trainer/db";
import { JUDGES } from "@icpc-trainer/shared";
import { and, desc, eq } from "drizzle-orm";

import type { PlaygroundProvider } from "./playground.js";

const CODEFORCES_CREDENTIAL_TYPE = "api_credentials";
const QOJ_CREDENTIAL_TYPE = "cookie_jar";
const DEFAULT_PROVIDER_USER_KEY = "default";

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

  return getCredentialStatus(ctx);
};
