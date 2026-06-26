import { isLocalDatabaseUrl, resolveDatabaseUrl } from "@icpc-trainer/db";
import { randomBytes } from "node:crypto";
import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import process from "node:process";

import { createServerEnv, type ServerEnv } from "./env.js";

export interface ServerConfig {
  readonly host: string;
  readonly port: number;
  readonly database: DatabaseConfig;
  readonly clerk: ClerkAuthConfig;
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

const localDatabasePath = (databaseUrl: string): string =>
  databaseUrl.startsWith("file:") ? databaseUrl.slice("file:".length) : databaseUrl;

const credentialKeyPath = (env: ServerEnv, databaseUrl: string): string => {
  if (env.ICPC_TRAINER_CREDENTIAL_KEY_FILE !== undefined) {
    return env.ICPC_TRAINER_CREDENTIAL_KEY_FILE;
  }

  return join(
    databaseUrl === ":memory:" ? ".local" : dirname(localDatabasePath(databaseUrl)),
    "icpc-trainer.credentials.key"
  );
};

const ensureCredentialKey = (rawEnv: NodeJS.ProcessEnv, env: ServerEnv, databaseUrl: string): void => {
  if (env.ICPC_TRAINER_CREDENTIAL_KEY !== undefined) {
    return;
  }

  if (!isLocalDatabaseUrl(databaseUrl)) {
    if (env.ICPC_TRAINER_CREDENTIAL_KEY_FILE === undefined) {
      throw new Error(
        "Remote database URLs require ICPC_TRAINER_CREDENTIAL_KEY or ICPC_TRAINER_CREDENTIAL_KEY_FILE."
      );
    }

    rawEnv.ICPC_TRAINER_CREDENTIAL_KEY = readFileSync(env.ICPC_TRAINER_CREDENTIAL_KEY_FILE, "utf8").trim();
    if (rawEnv.ICPC_TRAINER_CREDENTIAL_KEY === "") {
      throw new Error("ICPC_TRAINER_CREDENTIAL_KEY_FILE must contain a non-empty credential key.");
    }
    return;
  }

  const keyPath = credentialKeyPath(env, databaseUrl);
  mkdirSync(dirname(keyPath), { recursive: true });

  if (!existsSync(keyPath)) {
    writeFileSync(keyPath, `${randomBytes(32).toString("base64")}\n`, { mode: 0o600 });
  }

  rawEnv.ICPC_TRAINER_CREDENTIAL_KEY = readFileSync(keyPath, "utf8").trim();
};

export const loadServerConfig = (rawEnv: NodeJS.ProcessEnv = process.env): ServerConfig => {
  const env = createServerEnv(rawEnv);
  const databaseUrl = resolveDatabaseUrl({
    databaseUrl: env.ICPC_TRAINER_DATABASE_URL,
    legacySqlitePath: env.ICPC_TRAINER_SQLITE_PATH
  });
  if (
    !isLocalDatabaseUrl(databaseUrl) &&
    env.ICPC_TRAINER_CREDENTIAL_KEY === undefined &&
    env.ICPC_TRAINER_CREDENTIAL_KEY_FILE === undefined
  ) {
    throw new Error(
      "Remote database URLs require ICPC_TRAINER_CREDENTIAL_KEY or ICPC_TRAINER_CREDENTIAL_KEY_FILE."
    );
  }

  if (rawEnv === process.env) {
    ensureCredentialKey(rawEnv, env, databaseUrl);
  }

  return {
    host: env.ICPC_TRAINER_HOST,
    port: env.ICPC_TRAINER_PORT,
    database: {
      url: databaseUrl,
      authToken: env.ICPC_TRAINER_DATABASE_AUTH_TOKEN,
      autoMigrate: isLocalDatabaseUrl(databaseUrl)
    },
    clerk: {
      secretKey: env.CLERK_SECRET_KEY,
      publishableKey: env.CLERK_PUBLISHABLE_KEY ?? env.VITE_CLERK_PUBLISHABLE_KEY,
      jwtKey: env.CLERK_JWT_KEY,
      authorizedParties: env.CLERK_ALLOWED_ORIGINS
        ?.split(",")
        .map((origin) => origin.trim())
        .filter((origin) => origin !== "") ?? []
    }
  };
};
