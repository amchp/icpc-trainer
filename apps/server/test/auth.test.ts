import { DatabaseLive, DatabaseServiceTag, schema, type DatabaseService } from "@icpc-trainer/db";
import { Effect } from "effect";
import type { IncomingMessage } from "node:http";
import { beforeEach, describe, expect, it, vi } from "vitest";

const clerkMocks = vi.hoisted(() => ({
  authenticateRequest: vi.fn(),
  getUser: vi.fn(),
  verifyToken: vi.fn()
}));

vi.mock("@clerk/backend", () => ({
  createClerkClient: () => ({
    authenticateRequest: clerkMocks.authenticateRequest,
    users: {
      getUser: clerkMocks.getUser
    }
  }),
  verifyToken: clerkMocks.verifyToken
}));

import { appUserFromConnectionParams, appUserFromHttpRequest } from "../src/auth.js";

const { appUsers } = schema;

const withDatabase = async <A>(run: (database: DatabaseService) => Promise<A>): Promise<A> => {
  const program = Effect.gen(function* () {
    const database = yield* DatabaseServiceTag;
    yield* database.migrate;
    return yield* Effect.promise(() => run(database));
  });

  return await Effect.runPromise(program.pipe(Effect.provide(DatabaseLive({ filename: ":memory:" }))));
};

const requestWithAuthorization = (authorization: string): IncomingMessage => ({
  method: "GET",
  url: "/trpc/account.status",
  headers: {
    authorization,
    host: "127.0.0.1:3773"
  }
}) as IncomingMessage;

describe("Clerk server auth", () => {
  beforeEach(() => {
    clerkMocks.authenticateRequest.mockReset();
    clerkMocks.getUser.mockReset();
    clerkMocks.verifyToken.mockReset();
  });

  it("normalizes invalid HTTP bearer tokens to an unauthenticated app user", async () => {
    await withDatabase(async (database) => {
      clerkMocks.verifyToken.mockRejectedValue(new Error("expired token"));

      const appUser = await appUserFromHttpRequest({
        config: {
          jwtKey: "jwt-key",
          authorizedParties: []
        },
        database
      }, requestWithAuthorization("Bearer expired"));

      expect(appUser).toBeUndefined();
      expect(database.db.select().from(appUsers).all()).toEqual([]);
    });
  });

  it("upserts WebSocket users with metadata from JWT claims", async () => {
    await withDatabase(async (database) => {
      clerkMocks.verifyToken.mockResolvedValue({
        sub: "user_123",
        email: "user@example.com",
        name: "Example User",
        picture: "https://example.com/avatar.png"
      });

      const appUser = await appUserFromConnectionParams({
        config: {
          jwtKey: "jwt-key",
          authorizedParties: []
        },
        database
      }, { token: "valid" });

      expect(appUser).toMatchObject({
        clerkUserId: "user_123",
        primaryEmail: "user@example.com",
        displayName: "Example User",
        imageUrl: "https://example.com/avatar.png"
      });
    });
  });

  it("normalizes Clerk API failures during cookie auth", async () => {
    await withDatabase(async (database) => {
      clerkMocks.authenticateRequest.mockResolvedValue({
        isAuthenticated: true,
        toAuth: () => ({ userId: "user_123" })
      });
      clerkMocks.getUser.mockRejectedValue(new Error("Clerk API unavailable"));

      const appUser = await appUserFromHttpRequest({
        config: {
          secretKey: "sk_test_secret",
          authorizedParties: []
        },
        database
      }, {
        method: "GET",
        url: "/trpc/account.status",
        headers: {
          host: "127.0.0.1:3773"
        }
      } as IncomingMessage);

      expect(appUser).toBeUndefined();
      expect(database.db.select().from(appUsers).all()).toEqual([]);
    });
  });
});
