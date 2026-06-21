import { resolveDatabasePath } from "@icpc-trainer/db";

export interface ServerConfig {
  readonly host: string;
  readonly port: number;
  readonly databasePath: string;
}

const parsePort = (value: string | undefined): number => {
  const parsed = Number(value);
  if (Number.isInteger(parsed) && parsed > 0 && parsed < 65536) {
    return parsed;
  }
  return 3773;
};

export const loadServerConfig = (env: NodeJS.ProcessEnv = process.env): ServerConfig => ({
  host: env.ICPC_TRAINER_HOST?.trim() || "127.0.0.1",
  port: parsePort(env.ICPC_TRAINER_PORT),
  databasePath: resolveDatabasePath(env.ICPC_TRAINER_SQLITE_PATH ?? env.ICPC_TRAINER_DATABASE_URL)
});
