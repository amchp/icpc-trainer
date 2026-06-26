import { resolveDatabasePath } from "@icpc-trainer/db";
import { randomBytes } from "node:crypto";
import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";

import { createServerEnv, type ServerEnv } from "./env.js";

export interface ServerConfig {
  readonly host: string;
  readonly port: number;
  readonly databasePath: string;
  readonly clerk: ClerkAuthConfig;
}

export interface ClerkAuthConfig {
  readonly secretKey?: string;
  readonly publishableKey?: string;
  readonly jwtKey?: string;
  readonly authorizedParties: readonly string[];
}

const ensureCredentialKey = (rawEnv: NodeJS.ProcessEnv, env: ServerEnv, databasePath: string): void => {
  if (env.ICPC_TRAINER_CREDENTIAL_KEY !== undefined) {
    return;
  }

  const keyPath = env.ICPC_TRAINER_CREDENTIAL_KEY_FILE ||
    join(databasePath === ":memory:" ? ".local" : dirname(databasePath), "icpc-trainer.credentials.key");
  mkdirSync(dirname(keyPath), { recursive: true });

  if (!existsSync(keyPath)) {
    writeFileSync(keyPath, `${randomBytes(32).toString("base64")}\n`, { mode: 0o600 });
  }

  rawEnv.ICPC_TRAINER_CREDENTIAL_KEY = readFileSync(keyPath, "utf8").trim();
};

export const loadServerConfig = (rawEnv: NodeJS.ProcessEnv = process.env): ServerConfig => {
  const env = createServerEnv(rawEnv);

  const databasePath = resolveDatabasePath(env.ICPC_TRAINER_SQLITE_PATH ?? env.ICPC_TRAINER_DATABASE_URL);
  if (rawEnv === process.env) {
    ensureCredentialKey(rawEnv, env, databasePath);
  }

  return {
    host: env.ICPC_TRAINER_HOST,
    port: env.ICPC_TRAINER_PORT,
    databasePath,
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
