import { DatabaseLive, DatabaseServiceTag, providerCredentials, users } from "@icpc-trainer/db";
import { USER_TYPES } from "@icpc-trainer/shared";
import { eq } from "drizzle-orm";
import { Effect } from "effect";
import { afterEach, describe, expect, it } from "vitest";

import { appRouter, getStoredCodeforcesCredentials, getStoredQojCredentials, seedStoredCredentials } from "../src/index.js";

const originalCredentialKey = process.env.ICPC_TRAINER_CREDENTIAL_KEY;

describe("credentials router", () => {
  afterEach(() => {
    if (originalCredentialKey === undefined) {
      delete process.env.ICPC_TRAINER_CREDENTIAL_KEY;
    } else {
      process.env.ICPC_TRAINER_CREDENTIAL_KEY = originalCredentialKey;
    }
  });

  it("stores Codeforces credentials encrypted", async () => {
    process.env.ICPC_TRAINER_CREDENTIAL_KEY = Buffer.alloc(32, 7).toString("base64");

    const program = Effect.gen(function* () {
      const database = yield* DatabaseServiceTag;
      yield* database.migrate;
      const caller = appRouter.createCaller({
        database,
        judges: {
          run: async (input) => ({ ok: true, result: input })
        }
      });

      yield* Effect.promise(() => caller.credentials.save({
        provider: "codeforces",
        providerUserKey: "tourist",
        codeforces: {
          apiKey: "cf-key",
          apiSecret: "cf-secret"
        }
      }));

      const stored = database.db.select().from(providerCredentials).get();
      return stored;
    });

    const stored = await Effect.runPromise(
      program.pipe(Effect.provide(DatabaseLive({ filename: ":memory:" }))),
    );

    expect(stored?.encryptedPayload).toMatch(/^icpct-v1:/);
    expect(stored?.encryptedPayload).not.toContain("cf-secret");
  });

  it("adds saved judge handles as primary users", async () => {
    process.env.ICPC_TRAINER_CREDENTIAL_KEY = Buffer.alloc(32, 7).toString("base64");

    const program = Effect.gen(function* () {
      const database = yield* DatabaseServiceTag;
      yield* database.migrate;
      const caller = appRouter.createCaller({
        database,
        judges: {
          run: async (input) => ({ ok: true, result: input })
        }
      });

      yield* Effect.promise(() => caller.credentials.save({
        provider: "codeforces",
        providerUserKey: " tourist ",
        codeforces: {
          apiKey: "cf-key",
          apiSecret: "cf-secret"
        }
      }));

      return database.db.select().from(users).where(eq(users.username, "tourist")).get();
    });

    const primaryUser = await Effect.runPromise(
      program.pipe(Effect.provide(DatabaseLive({ filename: ":memory:" }))),
    );

    expect(primaryUser).toMatchObject({
      username: "tourist",
      type: USER_TYPES.Primary,
      judge: "codeforces"
    });
  });

  it("removes primary users when clearing judge credentials", async () => {
    process.env.ICPC_TRAINER_CREDENTIAL_KEY = Buffer.alloc(32, 7).toString("base64");

    const program = Effect.gen(function* () {
      const database = yield* DatabaseServiceTag;
      yield* database.migrate;
      const caller = appRouter.createCaller({
        database,
        judges: {
          run: async (input) => ({ ok: true, result: input })
        }
      });

      yield* Effect.promise(() => caller.credentials.save({
        provider: "qoj",
        providerUserKey: "qoj-user",
        qoj: {
          cookieJar: "uoj_username=qoj-user; uojsessid=session"
        }
      }));
      yield* Effect.promise(() => caller.credentials.clear("qoj"));

      return database.db.select().from(users).where(eq(users.username, "qoj-user")).get() ?? null;
    });

    const primaryUser = await Effect.runPromise(
      program.pipe(Effect.provide(DatabaseLive({ filename: ":memory:" }))),
    );

    expect(primaryUser).toBeNull();
  });

  it("seeds config credentials into encrypted database storage", async () => {
    process.env.ICPC_TRAINER_CREDENTIAL_KEY = Buffer.alloc(32, 7).toString("base64");

    const program = Effect.gen(function* () {
      const database = yield* DatabaseServiceTag;
      yield* database.migrate;

      seedStoredCredentials({ database }, {
        codeforces: {
          apiKey: "env-cf-key",
          apiSecret: "env-cf-secret"
        },
        qoj: {
          cookieJar: "uoj_username=qoj-user; uojsessid=session"
        }
      });

      const stored = database.db.select().from(providerCredentials).all();
      return {
        codeforces: getStoredCodeforcesCredentials({ database }),
        qoj: getStoredQojCredentials({ database }),
        stored
      };
    });

    const result = await Effect.runPromise(
      program.pipe(Effect.provide(DatabaseLive({ filename: ":memory:" }))),
    );

    expect(result.codeforces).toEqual({
      ok: true,
      credentials: {
        apiKey: "env-cf-key",
        apiSecret: "env-cf-secret"
      }
    });
    expect(result.qoj).toEqual({
      ok: true,
      credentials: {
        cookieJar: "uoj_username=qoj-user; uojsessid=session"
      }
    });
    expect(result.stored).toHaveLength(2);
    expect(result.stored.map((credential) => credential.encryptedPayload).join("\n")).not.toContain("env-cf-secret");
    expect(result.stored.map((credential) => credential.encryptedPayload).join("\n")).not.toContain("uojsessid");
  });
});
