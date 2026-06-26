import { JUDGES } from "@icpc-trainer/shared";

import { decryptCredential } from "./credentialCrypto.js";
import {
  clearCredentials,
  getLatestCredential,
  type CredentialDatabaseContext
} from "./credentialRepository.js";
import type { PlaygroundProvider } from "./playground.js";

export interface StoredCodeforcesCredentials {
  readonly apiKey: string;
  readonly apiSecret: string;
}

export interface StoredQojCredentials {
  readonly cookieJar: string;
}

export type StoredCredentialResult<T> =
  | {
      readonly ok: true;
      readonly credentials: T;
    }
  | {
      readonly ok: false;
      readonly cause: string;
    };

export const getStoredCodeforcesCredentials = async (
  ctx: CredentialDatabaseContext,
): Promise<StoredCredentialResult<StoredCodeforcesCredentials>> => {
  const stored = await getLatestCredential(ctx, JUDGES.Codeforces);

  if (!stored) {
    return {
      ok: false,
      cause: "Connect Codeforces before using the playground."
    };
  }

  const parsed = JSON.parse(decryptCredential(stored.encryptedPayload)) as Partial<StoredCodeforcesCredentials>;
  if (typeof parsed.apiKey !== "string" || typeof parsed.apiSecret !== "string") {
    return {
      ok: false,
      cause: "Saved Codeforces credentials are invalid."
    };
  }

  return {
    ok: true,
    credentials: {
      apiKey: parsed.apiKey,
      apiSecret: parsed.apiSecret
    }
  };
};

export const getStoredQojCredentials = async (
  ctx: CredentialDatabaseContext,
): Promise<StoredCredentialResult<StoredQojCredentials>> => {
  const stored = await getLatestCredential(ctx, JUDGES.Qoj);

  if (!stored) {
    return {
      ok: false,
      cause: "Connect QOJ before using the playground."
    };
  }

  const parsed = JSON.parse(decryptCredential(stored.encryptedPayload)) as Partial<StoredQojCredentials>;
  if (typeof parsed.cookieJar !== "string") {
    return {
      ok: false,
      cause: "Saved QOJ credentials are invalid."
    };
  }

  return {
    ok: true,
    credentials: {
      cookieJar: parsed.cookieJar
    }
  };
};

export const clearStoredCredentials = async (
  ctx: CredentialDatabaseContext,
  provider: PlaygroundProvider,
): Promise<void> => {
  await clearCredentials(ctx, provider);
};
