import { appRouter, type CredentialStatusEvent } from "@icpc-trainer/api";
import { DatabaseServiceTag } from "@icpc-trainer/db";
import { createHTTPHandler } from "@trpc/server/adapters/standalone";
import { applyWSSHandler } from "@trpc/server/adapters/ws";
import { Effect, Scope } from "effect";
import { createServer, type Server, type ServerResponse } from "node:http";
import { WebSocketServer } from "ws";

import { makeCodeforcesJudge } from "../judges/codeforces.js";
import { makeQojJudge } from "../judges/qoj.js";
import { createJudgeSyncService } from "../judges/sync/sync.js";
import type { ServerConfig } from "./config.js";
import { appUserFromConnectionParams, appUserFromHttpRequest } from "./auth.js";
import { createContestFinderRefreshService } from "./contestFinderRefresh.js";
import { createAsyncEventHub } from "./asyncEventHub.js";
import { createJudgeCredentialValidation, createJudgePlayground } from "./playground.js";

export interface StartedServer {
  readonly server: Server;
  readonly url: string;
}

const json = (body: unknown): string => JSON.stringify(body);

const writeCorsHeaders = (response: ServerResponse): void => {
  response.setHeader("access-control-allow-origin", "*");
  response.setHeader("access-control-allow-methods", "GET,POST,OPTIONS");
  response.setHeader("access-control-allow-headers", "authorization,content-type,trpc-accept");
};

export const startServer = (
  config: ServerConfig,
): Effect.Effect<StartedServer, Error, Scope.Scope | DatabaseServiceTag> =>
  Effect.gen(function* () {
    const database = yield* DatabaseServiceTag;
    yield* database.migrate;
    const judgeRegistry = {
      codeforces: makeCodeforcesJudge(database),
      qoj: makeQojJudge(database)
    };
    const judges = {
      ...createJudgePlayground(database),
      ...createJudgeCredentialValidation(database),
      ...createJudgeSyncService(judgeRegistry, database),
      ...createContestFinderRefreshService(database, judgeRegistry)
    };
    const credentialEvents = createAsyncEventHub<CredentialStatusEvent>();

    const trpcHandler = createHTTPHandler({
      router: appRouter,
      basePath: "/trpc/",
      createContext: async ({ req }) => ({
        database,
        judges,
        credentialEvents,
        appUser: await appUserFromHttpRequest({ config: config.clerk, database }, req)
      })
    });

    const server = createServer((request, response) => {
      writeCorsHeaders(response);

      if (request.method === "OPTIONS") {
        response.writeHead(204);
        response.end();
        return;
      }

      if (request.url === "/health") {
        Effect.runPromise(database.healthCheck)
          .then((databaseStatus) => {
            response.writeHead(200, { "content-type": "application/json" });
            response.end(
              json({
                ok: true,
                service: "icpc-trainer",
                database: databaseStatus,
                timestamp: new Date().toISOString()
              }),
            );
          })
          .catch((error: unknown) => {
            response.writeHead(500, { "content-type": "application/json" });
            response.end(json({ ok: false, error: String(error) }));
          });
        return;
      }

      trpcHandler(request, response);
    });
    const wss = new WebSocketServer({ server, path: "/trpc" });
    const wsHandler = applyWSSHandler({
      wss,
      router: appRouter,
      createContext: async ({ info }) => ({
        database,
        judges,
        credentialEvents,
        appUser: await appUserFromConnectionParams({ config: config.clerk, database }, info.connectionParams)
      })
    });

    yield* Effect.async<void, Error>((resume) => {
      server.once("error", (error) => resume(Effect.fail(error)));
      server.listen(config.port, config.host, () => resume(Effect.void));
    });

    yield* Effect.addFinalizer(() =>
      Effect.async<void>((resume) => {
        wsHandler.broadcastReconnectNotification();
        wss.close();
        server.close(() => resume(Effect.void));
      }),
    );

    return {
      server,
      url: `http://${config.host}:${config.port}`
    };
  });
