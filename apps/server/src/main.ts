import { Effect } from "effect";
import { DatabaseLive } from "@icpc-trainer/db";
import process from "node:process";

import { loadServerConfig } from "./config.js";
import { startServer } from "./server.js";

const config = loadServerConfig();

startServer(config).pipe(
  Effect.tap((server) =>
    Effect.sync(() => {
      console.log(`ICPC Trainer server listening at ${server.url}`);
      console.log(`Database URL: ${config.database.url}`);
    }),
  ),
  Effect.flatMap(() => Effect.never),
  Effect.provide(DatabaseLive({
    url: config.database.url,
    authToken: config.database.authToken
  })),
  Effect.scoped,
  Effect.runPromise,
).catch((error: unknown) => {
  console.error(error);
  process.exit(1);
});
