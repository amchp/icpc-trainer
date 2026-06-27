import { DatabaseLive, DatabaseServiceTag } from "@icpc-trainer/db";
import { Effect } from "effect";
import process from "node:process";

import { makeCodeforcesJudge } from "../judges/codeforces.js";
import { makeQojJudge } from "../judges/qoj.js";
import { loadServerConfig } from "./config.js";
import { runContestFinderCatalogSyncJob } from "./contestFinderCatalogSync.js";

const config = loadServerConfig();

Effect.gen(function* () {
  const database = yield* DatabaseServiceTag;
  if (config.database.autoMigrate) {
    yield* database.migrate;
  } else {
    yield* database.healthCheck;
  }

  const registry = {
    codeforces: makeCodeforcesJudge(database),
    qoj: makeQojJudge(database)
  };

  return yield* Effect.promise(() =>
    runContestFinderCatalogSyncJob(database, registry)
  );
}).pipe(
  Effect.provide(DatabaseLive({
    url: config.database.url,
    authToken: config.database.authToken
  })),
  Effect.scoped,
  Effect.runPromise,
).then((result) => {
  for (const providerResult of result.providers) {
    if (providerResult.ok) {
      console.log(
        `${providerResult.provider}: synced ${providerResult.contestsUpserted} catalog contests, ` +
        `${providerResult.regularContestsImported} regular contests, ` +
        `${providerResult.regularProblemsImported} regular problems`
      );
    } else {
      console.error(`${providerResult.provider}: ${providerResult.error ?? "catalog sync failed"}`);
    }
  }

  if (!result.ok) {
    process.exitCode = 1;
  }
}).catch((error: unknown) => {
  console.error(error);
  process.exit(1);
});
