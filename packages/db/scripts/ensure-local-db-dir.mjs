import { mkdirSync } from "node:fs";
import { dirname } from "node:path";

const DEFAULT_DATABASE_URL = "file:.local/icpc-trainer.sqlite";

const resolveDatabaseUrl = () => {
  const databaseUrl = process.env.ICPC_TRAINER_DATABASE_URL?.trim();
  if (databaseUrl) {
    return databaseUrl;
  }

  const legacySqlitePath = process.env.ICPC_TRAINER_SQLITE_PATH?.trim();
  if (!legacySqlitePath) {
    return DEFAULT_DATABASE_URL;
  }

  if (legacySqlitePath === ":memory:" || legacySqlitePath.startsWith("file:")) {
    return legacySqlitePath;
  }

  return `file:${legacySqlitePath}`;
};

const databaseUrl = resolveDatabaseUrl();
if (databaseUrl.startsWith("file:")) {
  const filename = databaseUrl.slice("file:".length);
  if (filename !== "" && filename !== ":memory:") {
    mkdirSync(dirname(filename), { recursive: true });
  }
}
