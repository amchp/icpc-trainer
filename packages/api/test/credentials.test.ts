import { appUserJudgeUsers, DatabaseLive, DatabaseServiceTag, providerCredentials, users } from "@icpc-trainer/db";
import { JUDGES, USER_TYPES } from "@icpc-trainer/shared";
import { eq } from "drizzle-orm";
import { Effect } from "effect";
import { Buffer } from "node:buffer";
import process from "node:process";
import { afterEach, describe, expect, it } from "vitest";

import {
  appRouter,
  getStoredCodeforcesCredentials,
  getStoredQojCredentials,
  type CredentialStatusEvent
} from "../src/index.js";
import { createTestAppUser } from "./testAppUser.js";

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
      const appUser = yield* Effect.promise(() => createTestAppUser(database));
      const caller = appRouter.createCaller({
        database,
        appUser,
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

      const stored = yield* Effect.promise(() => database.db.select().from(providerCredentials).get());
      return stored;
    });

    const stored = await Effect.runPromise(
      program.pipe(Effect.provide(DatabaseLive({ url: ":memory:" }))),
    );

    expect(stored?.encryptedPayload).toMatch(/^icpct-v1:/);
    expect(stored?.encryptedPayload).not.toContain("cf-secret");
  });

  it("upserts existing credentials through the create endpoint and attaches the entered handle", async () => {
    process.env.ICPC_TRAINER_CREDENTIAL_KEY = Buffer.alloc(32, 7).toString("base64");

    const program = Effect.gen(function* () {
      const database = yield* DatabaseServiceTag;
      yield* database.migrate;
      const appUser = yield* Effect.promise(() => createTestAppUser(database));
      const caller = appRouter.createCaller({
        database,
        appUser,
        judges: {
          run: async (input) => ({ ok: true as const, result: input }),
          validateCredentials: async () => undefined
        }
      });

      yield* Effect.promise(() => caller.credentials.create({
        provider: "codeforces",
        providerUserKey: "tourist",
        codeforces: {
          apiKey: "first-key",
          apiSecret: "first-secret"
        }
      }));

      const before = yield* Effect.promise(() => getStoredCodeforcesCredentials({ database, appUserId: appUser.id }));

      yield* Effect.promise(() => caller.credentials.create({
        provider: "codeforces",
        providerUserKey: "teammate",
        codeforces: {
          apiKey: "second-key",
          apiSecret: "second-secret"
        }
      }));

      return {
        before,
        after: yield* Effect.promise(() => getStoredCodeforcesCredentials({ database, appUserId: appUser.id })),
        stored: yield* Effect.promise(() => database.db.select().from(providerCredentials).all()),
        handles: yield* Effect.promise(() => database.db.select().from(users).all()),
        roles: yield* Effect.promise(() => database.db.select().from(appUserJudgeUsers).all())
      };
    });

    const result = await Effect.runPromise(
      program.pipe(Effect.provide(DatabaseLive({ url: ":memory:" }))),
    );

    expect(result.before).toEqual({
      ok: true,
      credentials: {
        apiKey: "first-key",
        apiSecret: "first-secret"
      }
    });
    expect(result.after).toEqual({
      ok: true,
      credentials: {
        apiKey: "second-key",
        apiSecret: "second-secret"
      }
    });
    expect(result.stored).toHaveLength(1);
    expect(result.handles.map((user) => user.username).sort()).toEqual(["teammate", "tourist"]);
    expect(result.roles).toHaveLength(2);
  });

  it("adds saved judge handles as team users without storing handles as credential keys", async () => {
    process.env.ICPC_TRAINER_CREDENTIAL_KEY = Buffer.alloc(32, 7).toString("base64");

    const program = Effect.gen(function* () {
      const database = yield* DatabaseServiceTag;
      yield* database.migrate;
      const appUser = yield* Effect.promise(() => createTestAppUser(database));
      const caller = appRouter.createCaller({
        database,
        appUser,
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

      const stored = yield* Effect.promise(() => database.db.select().from(providerCredentials).get());
      const user = yield* Effect.promise(() => database.db.select().from(users).where(eq(users.username, "tourist")).get());
      const role = yield* Effect.promise(() => database.db.select().from(appUserJudgeUsers).get());
      return { stored, user, role };
    });

    const result = await Effect.runPromise(
      program.pipe(Effect.provide(DatabaseLive({ url: ":memory:" }))),
    );

    expect(result.stored).toMatchObject({
      provider: "codeforces",
      providerUserKey: "default"
    });
    expect(result.user).toMatchObject({
      username: "tourist",
      judge: "codeforces"
    });
    expect(result.role).toMatchObject({ role: USER_TYPES.Team });
  });

  it("allows the same team username on different judges when saving credentials", async () => {
    process.env.ICPC_TRAINER_CREDENTIAL_KEY = Buffer.alloc(32, 7).toString("base64");

    const program = Effect.gen(function* () {
      const database = yield* DatabaseServiceTag;
      yield* database.migrate;
      const appUser = yield* Effect.promise(() => createTestAppUser(database));
      const caller = appRouter.createCaller({
        database,
        appUser,
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

      return {
        users: yield* Effect.promise(() => database.db.select().from(users).where(eq(users.username, "juancs")).all()),
        roles: yield* Effect.promise(() => database.db.select().from(appUserJudgeUsers).all())
      };
    });

    const result = await Effect.runPromise(
      program.pipe(Effect.provide(DatabaseLive({ url: ":memory:" }))),
    );

    expect(result.users).toHaveLength(2);
    expect(result.users).toEqual(expect.arrayContaining([
      expect.objectContaining({
        username: "juancs",
        judge: JUDGES.Codeforces
      }),
      expect.objectContaining({
        username: "juancs",
        judge: JUDGES.Qoj
      })
    ]));
    expect(result.roles).toHaveLength(2);
    expect(result.roles.every((role) => role.role === USER_TYPES.Team)).toBe(true);
  });

  it("does not store credentials when judge validation fails", async () => {
    process.env.ICPC_TRAINER_CREDENTIAL_KEY = Buffer.alloc(32, 7).toString("base64");

    const program = Effect.gen(function* () {
      const database = yield* DatabaseServiceTag;
      yield* database.migrate;
      const appUser = yield* Effect.promise(() => createTestAppUser(database));
      const caller = appRouter.createCaller({
        database,
        appUser,
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

      return yield* Effect.promise(() => database.db.select().from(providerCredentials).all());
    });

    const stored = await Effect.runPromise(
      program.pipe(Effect.provide(DatabaseLive({ url: ":memory:" }))),
    );

    expect(stored).toHaveLength(0);
  });

  it("keeps team users when clearing judge credentials", async () => {
    process.env.ICPC_TRAINER_CREDENTIAL_KEY = Buffer.alloc(32, 7).toString("base64");

    const program = Effect.gen(function* () {
      const database = yield* DatabaseServiceTag;
      yield* database.migrate;
      const appUser = yield* Effect.promise(() => createTestAppUser(database));
      const caller = appRouter.createCaller({
        database,
        appUser,
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

      return {
        user: (yield* Effect.promise(() => database.db.select().from(users).where(eq(users.username, "qoj-user")).get())) ?? null,
        role: (yield* Effect.promise(() => database.db.select().from(appUserJudgeUsers).get())) ?? null
      };
    });

    const result = await Effect.runPromise(
      program.pipe(Effect.provide(DatabaseLive({ url: ":memory:" }))),
    );

    expect(result.user).toMatchObject({
      username: "qoj-user",
      judge: JUDGES.Qoj
    });
    expect(result.role).toMatchObject({ role: USER_TYPES.Team });
  });

  it("publishes status-only credential events after saving credentials", async () => {
    process.env.ICPC_TRAINER_CREDENTIAL_KEY = Buffer.alloc(32, 7).toString("base64");
    const published: CredentialStatusEvent[] = [];

    const program = Effect.gen(function* () {
      const database = yield* DatabaseServiceTag;
      yield* database.migrate;
      const appUser = yield* Effect.promise(() => createTestAppUser(database));
      const caller = appRouter.createCaller({
        database,
        appUser,
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
      program.pipe(Effect.provide(DatabaseLive({ url: ":memory:" }))),
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
