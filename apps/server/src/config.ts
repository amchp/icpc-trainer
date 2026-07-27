import { isLocalDatabaseUrl, resolveDatabaseUrl } from "@icpc-trainer/db";
import { Buffer } from "node:buffer";
import process from "node:process";

import { createServerEnv } from "./env.js";

export interface ServerConfig {
  readonly host: string;
  readonly port: number;
  readonly database: DatabaseConfig;
  readonly clerk: ClerkAuthConfig;
  readonly taskToken?: string;
}

export interface DatabaseConfig {
  readonly url: string;
  readonly authToken?: string;
  readonly autoMigrate: boolean;
}

export interface ClerkAuthConfig {
  readonly secretKey?: string;
  readonly publishableKey?: string;
  readonly jwtKey?: string;
  readonly authorizedParties: readonly string[];
}

const CREDENTIAL_KEY_BYTE_LENGTH = 32;
const DEFAULT_LOCAL_HOST = "127.0.0.1";
const DEFAULT_LOCAL_PORT = 3773;
const RAILWAY_HOST = "0.0.0.0";

export const CLASS_ADMIN_CLERK_USER_IDS: ReadonlySet<string> = new Set([
  "user_3FeCXgqSNXwtQhPwKdjZ9lroO5e",
  "user_3Fgxgc5a3vsVlbmU083gyXm0Gld"
]);

const commaSeparatedValues = (value: string | undefined): string[] =>
  value
    ?.split(",")
    .map((item) => item.trim())
    .filter((item) => item !== "") ?? [];

const validateCredentialKey = (credentialKey?: string): void => {
  if (credentialKey === undefined) {
    throw new Error(
      "ICPC_TRAINER_CREDENTIAL_KEY is required. Set it in .env with a key from `openssl rand -base64 32`."
    );
  }

  if (Buffer.from(credentialKey, "base64").byteLength !== CREDENTIAL_KEY_BYTE_LENGTH) {
    throw new Error(`ICPC_TRAINER_CREDENTIAL_KEY must be a base64-encoded ${CREDENTIAL_KEY_BYTE_LENGTH}-byte key.`);
  }
};

export const loadServerConfig = (rawEnv: NodeJS.ProcessEnv = process.env): ServerConfig => {
  const env = createServerEnv(rawEnv);
  const databaseUrl = resolveDatabaseUrl({
    databaseUrl: env.ICPC_TRAINER_DATABASE_URL,
    legacySqlitePath: env.ICPC_TRAINER_SQLITE_PATH
  });
  validateCredentialKey(env.ICPC_TRAINER_CREDENTIAL_KEY);
  const port = env.ICPC_TRAINER_PORT ?? env.PORT ?? DEFAULT_LOCAL_PORT;

  return {
    host: env.ICPC_TRAINER_HOST ?? (env.PORT === undefined ? DEFAULT_LOCAL_HOST : RAILWAY_HOST),
    port,
    database: {
      url: databaseUrl,
      authToken: env.ICPC_TRAINER_DATABASE_AUTH_TOKEN,
      autoMigrate: isLocalDatabaseUrl(databaseUrl)
    },
    clerk: {
      secretKey: env.CLERK_SECRET_KEY,
      publishableKey: env.CLERK_PUBLISHABLE_KEY ?? env.VITE_CLERK_PUBLISHABLE_KEY,
      jwtKey: env.CLERK_JWT_KEY,
      authorizedParties: commaSeparatedValues(env.CLERK_ALLOWED_ORIGINS)
    },
    taskToken: env.TASK_TOKEN
  };
};
