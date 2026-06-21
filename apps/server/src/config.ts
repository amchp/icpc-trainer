import { resolveDatabasePath } from "@icpc-trainer/db";

export interface ServerConfig {
  readonly host: string;
  readonly port: number;
  readonly databasePath: string;
  readonly codeforces: CodeforcesAuthConfig;
  readonly qoj: QojAuthConfig;
}

export interface CodeforcesAuthConfig {
  readonly apiKey?: string;
  readonly apiSecret?: string;
}

export interface QojAuthConfig {
  readonly cookieJar?: string;
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

const buildQojCookieJar = (env: NodeJS.ProcessEnv): string | undefined => {
  const cookieEntries = [
    ["uoj_remember_token", env.ICPC_TRAINER_QOJ_COOKIE_UOJ_REMEMBER_TOKEN],
    ["uoj_remember_token_checksum", env.ICPC_TRAINER_QOJ_COOKIE_UOJ_REMEMBER_TOKEN_CHECKSUM],
    ["uoj_username", env.ICPC_TRAINER_QOJ_COOKIE_UOJ_USERNAME],
    ["uoj_username_checksum", env.ICPC_TRAINER_QOJ_COOKIE_UOJ_USERNAME_CHECKSUM],
    ["uojsessid", env.ICPC_TRAINER_QOJ_COOKIE_UOJSESSID]
  ]
    .map(([key, value]) => [key, readOptional(value)] as const)
    .filter((entry): entry is readonly [string, string] => entry[1] !== undefined);

  return cookieEntries.length === 0
    ? undefined
    : cookieEntries.map(([key, value]) => `${key}=${value}`).join("; ");
};

export const loadServerConfig = (env: NodeJS.ProcessEnv = process.env): ServerConfig => ({
  host: env.ICPC_TRAINER_HOST?.trim() || "127.0.0.1",
  port: parsePort(env.ICPC_TRAINER_PORT),
  databasePath: resolveDatabasePath(env.ICPC_TRAINER_SQLITE_PATH ?? env.ICPC_TRAINER_DATABASE_URL),
  codeforces: {
    apiKey: readOptional(env.ICPC_TRAINER_CODEFORCES_API_KEY),
    apiSecret: readOptional(env.ICPC_TRAINER_CODEFORCES_API_SECRET)
  },
  qoj: {
    cookieJar: buildQojCookieJar(env)
  }
});
