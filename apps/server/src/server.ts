import { appRouter, type CredentialStatusEvent } from "@icpc-trainer/api";
import { DatabaseServiceTag } from "@icpc-trainer/db";
import { createHTTPHandler } from "@trpc/server/adapters/standalone";
import { applyWSSHandler } from "@trpc/server/adapters/ws";
import { Effect, Scope } from "effect";
import { Buffer } from "node:buffer";
import { timingSafeEqual } from "node:crypto";
import { createServer, type Server, type ServerResponse } from "node:http";
import type { AddressInfo } from "node:net";
import { WebSocketServer } from "ws";
import type { JudgeProvider } from "@icpc-trainer/shared";

import { makeCodeforcesJudge } from "../judges/codeforces.js";
import type { Judge } from "../judges/judges.js";
import { makeQojJudge } from "../judges/qoj.js";
import { createJudgeSyncService } from "../judges/sync/sync.js";
import type { ServerConfig } from "./config.js";
import { appUserFromConnectionParams, appUserFromHttpRequest } from "./auth.js";
import { createFriendSubmissionSyncService } from "./friendSubmissionSync.js";
import { runContestFinderCatalogSyncJob } from "./contestFinderCatalogSync.js";
import { createAsyncEventHub } from "./asyncEventHub.js";
import { createJudgeCredentialValidation, createJudgePlayground } from "./playground.js";
import { getPostHog } from "./posthog.js";
import type { Analytics } from "@icpc-trainer/api";

type JudgeRegistry = Record<JudgeProvider, Judge>;
const CATALOG_SYNC_TASK_PATHS = new Set(["/internal/tasks/catalog-sync", "/internal/tasks/catalog-sync/"]);

export interface StartedServer {
  readonly server: Server;
  readonly url: string;
}

export interface StartServerOptions {
  readonly judgeRegistry?: JudgeRegistry;
}

const json = (body: unknown): string => JSON.stringify(body);

const writeCorsHeaders = (response: ServerResponse): void => {
  response.setHeader("access-control-allow-origin", "*");
  response.setHeader("access-control-allow-methods", "GET,POST,OPTIONS");
  response.setHeader("access-control-allow-headers", "authorization,content-type,trpc-accept");
};

const writeJson = (response: ServerResponse, statusCode: number, body: unknown): void => {
  response.writeHead(statusCode, { "content-type": "application/json" });
  response.end(json(body));
};

const bearerToken = (authorization: string | undefined): string | undefined => {
  const prefix = "Bearer ";
  return authorization?.startsWith(prefix) === true
    ? authorization.slice(prefix.length).trim()
    : undefined;
};

const tokenMatches = (expected: string | undefined, actual: string | undefined): boolean => {
  if (expected === undefined || actual === undefined) {
    return false;
  }

  const expectedBytes = Buffer.from(expected);
  const actualBytes = Buffer.from(actual);
  return expectedBytes.byteLength === actualBytes.byteLength && timingSafeEqual(expectedBytes, actualBytes);
};

const urlPathname = (requestUrl: string | undefined, host: string | string[] | undefined): string | undefined => {
  if (requestUrl === undefined) {
    return undefined;
  }

  return new URL(requestUrl, `http://${Array.isArray(host) ? host[0] : host ?? "localhost"}`).pathname;
};

export const startServer = (
  config: ServerConfig,
  options: StartServerOptions = {},
): Effect.Effect<StartedServer, Error, Scope.Scope | DatabaseServiceTag> =>
  Effect.gen(function* () {
    const database = yield* DatabaseServiceTag;
    if (config.database.autoMigrate) {
      yield* database.migrate;
    } else {
      yield* database.healthCheck.pipe(
        Effect.mapError((cause) =>
          new Error(
            "Remote database is not migrated or is unavailable. Run pnpm --filter @icpc-trainer/db db:migrate.",
            { cause }
          )
        )
      );
    }
    const judgeRegistry: JudgeRegistry = options.judgeRegistry ?? {
      codeforces: makeCodeforcesJudge(database),
      qoj: makeQojJudge(database)
    };
    const judges = {
      ...createJudgePlayground(database),
      ...createJudgeCredentialValidation(database),
      ...createJudgeSyncService(judgeRegistry, database),
      ...createFriendSubmissionSyncService(database, judgeRegistry)
    };
    const credentialEvents = createAsyncEventHub<CredentialStatusEvent>();

    const ph = getPostHog();
    const analytics: Analytics | undefined = ph ? {
      capture: (params) => ph.capture(params),
      identify: (params) => ph.identify(params),
      captureException: (error, distinctId) => ph.captureException(error, distinctId)
    } : undefined;

    const trpcHandler = createHTTPHandler({
      router: appRouter,
      basePath: "/trpc/",
      createContext: async ({ req }) => ({
        database,
        judges,
        credentialEvents,
        analytics,
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

      const pathname = urlPathname(request.url, request.headers.host);

      if (pathname === "/health") {
        Effect.runPromise(database.healthCheck)
          .then((databaseStatus) => {
            writeJson(response, 200, {
              ok: true,
              service: "icpc-trainer",
              database: databaseStatus,
              timestamp: new Date().toISOString()
            });
          })
          .catch((error: unknown) => {
            writeJson(response, 500, { ok: false, error: String(error) });
          });
        return;
      }

      if (pathname !== undefined && CATALOG_SYNC_TASK_PATHS.has(pathname)) {
        if (request.method !== "POST") {
          response.setHeader("allow", "POST");
          writeJson(response, 405, { ok: false, error: "Method not allowed." });
          return;
        }

        if (config.taskToken === undefined) {
          writeJson(response, 503, { ok: false, error: "TASK_TOKEN is not configured." });
          return;
        }

        if (!tokenMatches(config.taskToken, bearerToken(request.headers.authorization))) {
          writeJson(response, 401, { ok: false, error: "Unauthorized." });
          return;
        }

        Effect.runPromise(Effect.promise(() => runContestFinderCatalogSyncJob(database, judgeRegistry)))
          .then((result) => {
            writeJson(response, result.ok ? 200 : 500, result);
          })
          .catch((error: unknown) => {
            writeJson(response, 500, { ok: false, error: String(error) });
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
        analytics,
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

    const address = server.address() as AddressInfo | string | null;
    const serverPort = typeof address === "object" && address !== null ? address.port : config.port;
    return {
      server,
      url: `http://${config.host}:${serverPort}`
    };
  });
