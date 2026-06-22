import { appRouter, seedStoredCredentials } from "@icpc-trainer/api";
import { DatabaseServiceTag } from "@icpc-trainer/db";
import { createHTTPHandler } from "@trpc/server/adapters/standalone";
import { applyWSSHandler } from "@trpc/server/adapters/ws";
import { Effect, Scope } from "effect";
import { createServer, type Server, type ServerResponse } from "node:http";
import { WebSocketServer } from "ws";

import { makeCodeforcesJudge } from "../judges/codeforces.js";
import { makeQojJudge } from "../judges/qoj.js";
import { createJudgeSyncService } from "../judges/sync/sync_codeforces.js";
import type { ServerConfig } from "./config.js";
import { createJudgePlayground } from "./playground.js";

export interface StartedServer {
  readonly server: Server;
  readonly url: string;
}

const json = (body: unknown): string => JSON.stringify(body);

const writeCorsHeaders = (response: ServerResponse): void => {
  response.setHeader("access-control-allow-origin", "*");
  response.setHeader("access-control-allow-methods", "GET,POST,OPTIONS");
  response.setHeader("access-control-allow-headers", "content-type,trpc-accept");
};

export const startServer = (
  config: ServerConfig,
): Effect.Effect<StartedServer, Error, Scope.Scope | DatabaseServiceTag> =>
  Effect.gen(function* () {
    const database = yield* DatabaseServiceTag;
    yield* database.migrate;
    seedStoredCredentials({ database }, {
      codeforces: config.codeforces,
      qoj: config.qoj
    });
    const createJudges = () => ({
      ...createJudgePlayground(database),
      ...createJudgeSyncService({
        codeforces: makeCodeforcesJudge(database),
        qoj: makeQojJudge()
      })
    });

    const trpcHandler = createHTTPHandler({
      router: appRouter,
      basePath: "/trpc/",
      createContext: () => ({ database, judges: createJudges() })
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
      createContext: () => ({ database, judges: createJudges() })
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
