import { DatabaseLive } from "@icpc-trainer/db";
import { Effect } from "effect";
import { describe, expect, it, vi } from "vitest";

const clerkMocks = vi.hoisted(() => ({
  verifyToken: vi.fn()
}));

vi.mock("@clerk/backend", () => ({
  createClerkClient: vi.fn(),
  verifyToken: clerkMocks.verifyToken
}));

import { CLASS_ADMIN_CLERK_USER_IDS, type ServerConfig } from "../src/config.js";
import { startServer } from "../src/server.js";

const classAdminClerkUserId = "user_3Fgxgc5a3vsVlbmU083gyXm0Gld";
if (!CLASS_ADMIN_CLERK_USER_IDS.has(classAdminClerkUserId)) {
  throw new Error("Expected the requested Clerk User to be a hard-coded Class admin.");
}

const config: ServerConfig = {
  host: "127.0.0.1",
  port: 0,
  database: {
    url: ":memory:",
    authToken: undefined,
    autoMigrate: true
  },
  clerk: {
    jwtKey: "test-jwt-key",
    authorizedParties: []
  },
  taskToken: undefined
};

const withServer = <T>(run: (url: string) => Promise<T>): Promise<T> =>
  Effect.runPromise(
    Effect.gen(function* () {
      const started = yield* startServer(config);
      return yield* Effect.promise(() => run(started.url));
    }).pipe(
      Effect.provide(DatabaseLive({ url: ":memory:" })),
      Effect.scoped
    )
  );

const inputUrl = (url: string, procedure: string, input?: unknown): string => {
  const target = new URL(`/trpc/${procedure}`, url);
  if (input !== undefined) target.searchParams.set("input", JSON.stringify(input));
  return target.toString();
};

const request = (
  url: string,
  token: "admin-token" | "viewer-token",
  input?: unknown,
  mutation = false
): Promise<Response> => fetch(url, {
  method: mutation ? "POST" : "GET",
  headers: {
    authorization: `Bearer ${token}`,
    ...(mutation ? { "content-type": "application/json" } : {})
  },
  body: mutation ? JSON.stringify(input) : undefined
});

describe("Leaderboard server authorization boundary", () => {
  it("derives capability from the authenticated Clerk id and protects every Class procedure", () =>
    withServer(async (url) => {
      clerkMocks.verifyToken.mockImplementation(async (token: string) => ({
        sub: token === "admin-token" ? classAdminClerkUserId : "clerk_viewer"
      }));

      const adminList = await request(
        inputUrl(url, "leaderboard.list", { scope: "all" }),
        "admin-token"
      );
      const viewerList = await request(
        inputUrl(url, "leaderboard.list", { scope: "all" }),
        "viewer-token"
      );
      expect(adminList.status).toBe(200);
      expect(viewerList.status).toBe(200);
      await expect(adminList.json()).resolves.toMatchObject({
        result: { data: { canManageClass: true } }
      });
      await expect(viewerList.json()).resolves.toMatchObject({
        result: { data: { canManageClass: false } }
      });

      const viewerResponses = await Promise.all([
        request(inputUrl(url, "leaderboard.classMembers"), "viewer-token"),
        request(
          inputUrl(url, "leaderboard.searchClassCandidates", { query: "tourist" }),
          "viewer-token"
        ),
        request(
          inputUrl(url, "leaderboard.addClassMember"),
          "viewer-token",
          { userId: 1 },
          true
        ),
        request(
          inputUrl(url, "leaderboard.removeClassMember"),
          "viewer-token",
          { userId: 1 },
          true
        )
      ]);
      expect(viewerResponses.map((response) => response.status)).toEqual([403, 403, 403, 403]);

      const adminMembers = await request(
        inputUrl(url, "leaderboard.classMembers"),
        "admin-token"
      );
      const adminCandidates = await request(
        inputUrl(url, "leaderboard.searchClassCandidates", { query: "tourist" }),
        "admin-token"
      );
      const adminRemove = await request(
        inputUrl(url, "leaderboard.removeClassMember"),
        "admin-token",
        { userId: 1 },
        true
      );
      const adminAdd = await request(
        inputUrl(url, "leaderboard.addClassMember"),
        "admin-token",
        { userId: 1 },
        true
      );
      expect(adminMembers.status).toBe(200);
      expect(adminCandidates.status).toBe(200);
      expect(adminRemove.status).toBe(200);
      expect(adminAdd.status).toBe(404);
    }));
});
