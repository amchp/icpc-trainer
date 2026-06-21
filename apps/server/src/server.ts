import { appRouter } from "@icpc-trainer/api";
import { DatabaseServiceTag } from "@icpc-trainer/db";
import { createHTTPHandler } from "@trpc/server/adapters/standalone";
import { Effect, Scope } from "effect";
import { createServer, type Server, type ServerResponse } from "node:http";

import type { ServerConfig } from "./config.js";

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

    const trpcHandler = createHTTPHandler({
      router: appRouter,
      basePath: "/trpc/",
      createContext: () => ({ database })
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

    yield* Effect.async<void, Error>((resume) => {
      server.once("error", (error) => resume(Effect.fail(error)));
      server.listen(config.port, config.host, () => resume(Effect.void));
    });

    yield* Effect.addFinalizer(() =>
      Effect.async<void>((resume) => {
        server.close(() => resume(Effect.void));
      }),
    );

    return {
      server,
      url: `http://${config.host}:${config.port}`
    };
  });
