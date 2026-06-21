import { Effect } from "effect";
import { DatabaseLive } from "@icpc-trainer/db";

import { loadServerConfig } from "./config.js";
import { startServer } from "./server.js";

const config = loadServerConfig();

startServer(config).pipe(
  Effect.tap((server) =>
    Effect.sync(() => {
      console.log(`ICPC Trainer server listening at ${server.url}`);
      console.log(`SQLite database: ${config.databasePath}`);
    }),
  ),
  Effect.flatMap(() => Effect.never),
  Effect.provide(DatabaseLive({ filename: config.databasePath })),
  Effect.scoped,
  Effect.runPromise,
).catch((error: unknown) => {
  console.error(error);
  process.exit(1);
});
