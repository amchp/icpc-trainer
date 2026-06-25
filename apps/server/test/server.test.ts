import { appRouter } from "@icpc-trainer/api";
import { DatabaseLive, DatabaseServiceTag, providerCredentials } from "@icpc-trainer/db";
import { Effect } from "effect";
import { afterEach, describe, expect, it, vi } from "vitest";

import {
  JudgeAPIError,
  JudgeCredentialError,
  JudgeNotFoundError,
  JudgeUnavailableError
} from "../judges/judges.js";
import { createJudgePlayground, formatJudgeError, toPlaygroundError } from "../src/playground.js";
import { createTestAppUser } from "./testAppUser.js";

const originalCredentialKey = process.env.ICPC_TRAINER_CREDENTIAL_KEY;

const jsonResponse = (body: unknown): Response =>
  new Response(JSON.stringify(body), {
    status: 200,
    headers: {
      "content-type": "application/json"
    }
  });

const requestedUrl = (value: unknown): URL => {
  if (typeof value !== "string") {
    throw new Error("Expected fetch URL to be a string.");
  }

  return new URL(value);
};

afterEach(() => {
  vi.unstubAllGlobals();
  if (originalCredentialKey === undefined) {
    delete process.env.ICPC_TRAINER_CREDENTIAL_KEY;
  } else {
    process.env.ICPC_TRAINER_CREDENTIAL_KEY = originalCredentialKey;
  }
});

describe("formatJudgeError", () => {
  it("formats credential errors with the provider detail", () => {
    expect(
      formatJudgeError(
        new JudgeCredentialError({
          judgeId: "104217",
          cause: "Contest is private. Access denied."
        })
      )
    ).toBe("Credential error for 104217. Contest is private. Access denied.");
  });

  it("formats common judge failures without Effect fiber wrapper text", () => {
    expect(
      formatJudgeError(new JudgeNotFoundError({ resource: "contest", judgeId: "999999" }))
    ).toBe("Contest not found on judge: 999999.");
    expect(formatJudgeError(new JudgeAPIError({ judgeId: "codeforces", cause: "Rate limit" }))).toBe(
      "Judge API rejected the request for codeforces. Rate limit"
    );
    expect(
      formatJudgeError(new JudgeUnavailableError({ judgeId: "qoj", cause: new Error("HTTP 502") }))
    ).toBe("Judge is unavailable for qoj. HTTP 502");
  });

  it("returns structured playground debug details for API errors", () => {
    expect(
      toPlaygroundError(
        new JudgeAPIError({
          judgeId: "104217",
          cause: "Codeforces API request failed: contestId: Field should contain integer."
        })
      )
    ).toMatchObject({
      message:
        "Judge API rejected the request for 104217. Codeforces API request failed: contestId: Field should contain integer.",
      tag: "JudgeAPIError",
      judgeId: "104217",
      cause: "Codeforces API request failed: contestId: Field should contain integer.",
      causeType: "string"
    });
  });
});

describe("createJudgePlayground", () => {
  it("returns a credential error when no Codeforces credentials are saved", async () => {
    process.env.ICPC_TRAINER_CREDENTIAL_KEY = Buffer.alloc(32, 7).toString("base64");
    const program = Effect.gen(function* () {
      const database = yield* DatabaseServiceTag;
      yield* database.migrate;
      const appUser = createTestAppUser(database);
      return yield* Effect.promise(() =>
        createJudgePlayground(database).run({
          provider: "codeforces",
          operation: "user",
          appUserId: appUser.id,
          userHandle: "tourist"
        })
      );
    });

    const result = await Effect.runPromise(program.pipe(Effect.provide(DatabaseLive({ filename: ":memory:" }))));

    expect(result).toMatchObject({
      ok: false,
      error: {
        tag: "JudgeCredentialError",
        judgeId: "tourist",
        cause: "Connect Codeforces before using the playground."
      }
    });
  });

  it("loads Codeforces credentials from the database before making API requests", async () => {
    process.env.ICPC_TRAINER_CREDENTIAL_KEY = Buffer.alloc(32, 7).toString("base64");
    const fetchMock = vi.fn().mockResolvedValue(
      jsonResponse({
        status: "OK",
        result: [{ handle: "tourist" }]
      })
    );
    vi.stubGlobal("fetch", fetchMock);

    const program = Effect.gen(function* () {
      const database = yield* DatabaseServiceTag;
      yield* database.migrate;
      const appUser = createTestAppUser(database);
      const caller = appRouter.createCaller({
        database,
        appUser,
        judges: {
          ...createJudgePlayground(database),
          validateCredentials: async () => undefined
        }
      });

      yield* Effect.promise(() =>
        caller.credentials.save({
          provider: "codeforces",
          providerUserKey: "tourist",
          codeforces: {
            apiKey: "cf-key",
            apiSecret: "cf-secret"
          }
        })
      );

      return yield* Effect.promise(() =>
        createJudgePlayground(database).run({
          provider: "codeforces",
          operation: "user",
          appUserId: appUser.id,
          userHandle: "tourist"
        })
      );
    });

    const result = await Effect.runPromise(program.pipe(Effect.provide(DatabaseLive({ filename: ":memory:" }))));
    const url = requestedUrl(fetchMock.mock.calls[0]?.[0]);

    expect(result).toMatchObject({ ok: true });
    expect(url.pathname).toBe("/api/user.info");
    expect(url.searchParams.get("apiKey")).toBe("cf-key");
  });

  it("deletes saved credentials after a credential failure", async () => {
    process.env.ICPC_TRAINER_CREDENTIAL_KEY = Buffer.alloc(32, 7).toString("base64");
    const fetchMock = vi.fn().mockResolvedValue(
      jsonResponse({
        status: "FAILED",
        comment: "Invalid apiKey or apiSig"
      })
    );
    vi.stubGlobal("fetch", fetchMock);

    const program = Effect.gen(function* () {
      const database = yield* DatabaseServiceTag;
      yield* database.migrate;
      const appUser = createTestAppUser(database);
      const caller = appRouter.createCaller({
        database,
        appUser,
        judges: {
          ...createJudgePlayground(database),
          validateCredentials: async () => undefined
        }
      });

      yield* Effect.promise(() =>
        caller.credentials.save({
          provider: "codeforces",
          providerUserKey: "tourist",
          codeforces: {
            apiKey: "bad-key",
            apiSecret: "bad-secret"
          }
        })
      );

      const result = yield* Effect.promise(() =>
        createJudgePlayground(database).run({
          provider: "codeforces",
          operation: "user",
          appUserId: appUser.id,
          userHandle: "tourist"
        })
      );

      const remaining = database.db.select().from(providerCredentials).all();
      return { remaining, result };
    });

    const { remaining, result } = await Effect.runPromise(
      program.pipe(Effect.provide(DatabaseLive({ filename: ":memory:" })))
    );

    expect(result).toMatchObject({
      ok: false,
      error: {
        tag: "JudgeCredentialError",
        cause: "Invalid apiKey or apiSig"
      }
    });
    expect(remaining).toHaveLength(0);
  });
});
