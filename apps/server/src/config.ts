import { resolveDatabasePath } from "@icpc-trainer/db";
import { randomBytes } from "node:crypto";
import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { loadEnvFile } from "node:process";

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

const parsePort = (value: string | undefined): number => {
  const parsed = Number(value);
  if (Number.isInteger(parsed) && parsed > 0 && parsed < 65536) {
    return parsed;
  }
  return 3773;
};

const readOptional = (value: string | undefined): string | undefined => {
  const trimmed = value?.trim();
  return trimmed === undefined || trimmed === "" ? undefined : trimmed;
};

const loadLocalEnvFiles = (): void => {
  for (const file of ["../../.env.local", "../../.env", ".env.local", ".env"]) {
    try {
      if (existsSync(file)) {
        loadEnvFile(file);
      }
    } catch {
      // Ignore malformed local env files here; required values still fail through config consumers.
    }
  }
};

const ensureCredentialKey = (env: NodeJS.ProcessEnv, databasePath: string): void => {
  if (readOptional(env.ICPC_TRAINER_CREDENTIAL_KEY) !== undefined) {
    return;
  }

  const keyPath = env.ICPC_TRAINER_CREDENTIAL_KEY_FILE?.trim() ||
    join(databasePath === ":memory:" ? ".local" : dirname(databasePath), "icpc-trainer.credentials.key");
  mkdirSync(dirname(keyPath), { recursive: true });

  if (!existsSync(keyPath)) {
    writeFileSync(keyPath, `${randomBytes(32).toString("base64")}\n`, { mode: 0o600 });
  }

  env.ICPC_TRAINER_CREDENTIAL_KEY = readFileSync(keyPath, "utf8").trim();
};

export const loadServerConfig = (env: NodeJS.ProcessEnv = process.env): ServerConfig => {
  if (env === process.env) {
    loadLocalEnvFiles();
  }

  const databasePath = resolveDatabasePath(env.ICPC_TRAINER_SQLITE_PATH ?? env.ICPC_TRAINER_DATABASE_URL);
  if (env === process.env) {
    ensureCredentialKey(env, databasePath);
  }

  return {
    host: env.ICPC_TRAINER_HOST?.trim() || "127.0.0.1",
    port: parsePort(env.ICPC_TRAINER_PORT),
    databasePath,
    clerk: {
      secretKey: readOptional(env.CLERK_SECRET_KEY),
      publishableKey: readOptional(env.CLERK_PUBLISHABLE_KEY),
      jwtKey: readOptional(env.CLERK_JWT_KEY),
      authorizedParties: readOptional(env.CLERK_ALLOWED_ORIGINS)
        ?.split(",")
        .map((origin) => origin.trim())
        .filter((origin) => origin !== "") ?? []
    }
  };
};
