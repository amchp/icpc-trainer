import { Effect } from "effect";
import { DatabaseLive } from "@icpc-trainer/db";
import process from "node:process";

import { loadServerConfig } from "./config.js";
import { startServer } from "./server.js";
import { getPostHog, shutdownPostHog } from "./posthog.js";

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
  getPostHog()?.captureException(error, "server");
  shutdownPostHog().finally(() => process.exit(1));
});
