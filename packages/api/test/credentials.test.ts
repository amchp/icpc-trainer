import { DatabaseLive, DatabaseServiceTag, providerCredentials, users } from "@icpc-trainer/db";
import { JUDGES, USER_TYPES } from "@icpc-trainer/shared";
import { eq } from "drizzle-orm";
import { Effect } from "effect";
import { afterEach, describe, expect, it } from "vitest";

import {
  appRouter,
  getStoredCodeforcesCredentials,
  getStoredQojCredentials,
  seedStoredCredentials,
  type CredentialStatusEvent
} from "../src/index.js";

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
          run: async (input) => ({ ok: true as const, result: input }),
          validateCredentials: async () => undefined
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

  it("adds saved judge handles as team users without storing handles as credential keys", async () => {
    process.env.ICPC_TRAINER_CREDENTIAL_KEY = Buffer.alloc(32, 7).toString("base64");

    const program = Effect.gen(function* () {
      const database = yield* DatabaseServiceTag;
      yield* database.migrate;
      const caller = appRouter.createCaller({
        database,
        judges: {
          run: async (input) => ({ ok: true as const, result: input }),
          validateCredentials: async () => undefined
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

      const stored = database.db.select().from(providerCredentials).get();
      const user = database.db.select().from(users).where(eq(users.username, "tourist")).get();
      return { stored, user };
    });

    const result = await Effect.runPromise(
      program.pipe(Effect.provide(DatabaseLive({ filename: ":memory:" }))),
    );

    expect(result.stored).toMatchObject({
      provider: "codeforces",
      providerUserKey: "default"
    });
    expect(result.user).toMatchObject({
      username: "tourist",
      type: USER_TYPES.Team,
      judge: "codeforces"
    });
  });

  it("allows the same team username on different judges when saving credentials", async () => {
    process.env.ICPC_TRAINER_CREDENTIAL_KEY = Buffer.alloc(32, 7).toString("base64");

    const program = Effect.gen(function* () {
      const database = yield* DatabaseServiceTag;
      yield* database.migrate;
      const caller = appRouter.createCaller({
        database,
        judges: {
          run: async (input) => ({ ok: true as const, result: input }),
          validateCredentials: async () => undefined
        }
      });

      yield* Effect.promise(() => caller.credentials.save({
        provider: "codeforces",
        providerUserKey: "juancs",
        codeforces: {
          apiKey: "cf-key",
          apiSecret: "cf-secret"
        }
      }));
      yield* Effect.promise(() => caller.credentials.save({
        provider: "qoj",
        providerUserKey: "juancs",
        qoj: {
          cookieJar: "uoj_username=juancs; uojsessid=session"
        }
      }));

      return database.db.select().from(users).where(eq(users.username, "juancs")).all();
    });

    const teamUsers = await Effect.runPromise(
      program.pipe(Effect.provide(DatabaseLive({ filename: ":memory:" }))),
    );

    expect(teamUsers).toHaveLength(2);
    expect(teamUsers).toEqual(expect.arrayContaining([
      expect.objectContaining({
        username: "juancs",
        type: USER_TYPES.Team,
        judge: JUDGES.Codeforces
      }),
      expect.objectContaining({
        username: "juancs",
        type: USER_TYPES.Team,
        judge: JUDGES.Qoj
      })
    ]));
  });

  it("does not store credentials when judge validation fails", async () => {
    process.env.ICPC_TRAINER_CREDENTIAL_KEY = Buffer.alloc(32, 7).toString("base64");

    const program = Effect.gen(function* () {
      const database = yield* DatabaseServiceTag;
      yield* database.migrate;
      const caller = appRouter.createCaller({
        database,
        judges: {
          run: async (input) => ({ ok: true as const, result: input }),
          validateCredentials: async () => {
            throw new Error("Codeforces credentials failed validation.");
          }
        }
      });

      yield* Effect.promise(() =>
        expect(caller.credentials.save({
          provider: "codeforces",
          providerUserKey: "tourist",
          codeforces: {
            apiKey: "cf-key",
            apiSecret: "cf-secret"
          }
        })).rejects.toThrow("Codeforces credentials failed validation.")
      );

      return database.db.select().from(providerCredentials).all();
    });

    const stored = await Effect.runPromise(
      program.pipe(Effect.provide(DatabaseLive({ filename: ":memory:" }))),
    );

    expect(stored).toHaveLength(0);
  });

  it("keeps team users when clearing judge credentials", async () => {
    process.env.ICPC_TRAINER_CREDENTIAL_KEY = Buffer.alloc(32, 7).toString("base64");

    const program = Effect.gen(function* () {
      const database = yield* DatabaseServiceTag;
      yield* database.migrate;
      const caller = appRouter.createCaller({
        database,
        judges: {
          run: async (input) => ({ ok: true as const, result: input }),
          validateCredentials: async () => undefined
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

    const teamUser = await Effect.runPromise(
      program.pipe(Effect.provide(DatabaseLive({ filename: ":memory:" }))),
    );

    expect(teamUser).toMatchObject({
      username: "qoj-user",
      type: USER_TYPES.Team,
      judge: JUDGES.Qoj
    });
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

  it("publishes status-only credential events after saving credentials", async () => {
    process.env.ICPC_TRAINER_CREDENTIAL_KEY = Buffer.alloc(32, 7).toString("base64");
    const published: CredentialStatusEvent[] = [];

    const program = Effect.gen(function* () {
      const database = yield* DatabaseServiceTag;
      yield* database.migrate;
      const caller = appRouter.createCaller({
        database,
        credentialEvents: {
          publish: (event) => published.push(event),
          subscribe: async function* () {}
        },
        judges: {
          run: async (input) => ({ ok: true as const, result: input }),
          validateCredentials: async () => undefined
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
    });

    await Effect.runPromise(
      program.pipe(Effect.provide(DatabaseLive({ filename: ":memory:" }))),
    );

    expect(published).toHaveLength(1);
    expect(published[0]).toMatchObject({
      type: "changed",
      status: {
        codeforces: {
          saved: true
        }
      }
    });
    const payload = JSON.stringify(published);
    expect(payload).not.toContain("cf-key");
    expect(payload).not.toContain("cf-secret");
    expect(payload).not.toContain("encryptedPayload");
  });
});
