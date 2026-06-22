import { readFileSync } from "node:fs";
import { createServer, type Server } from "node:http";
import { join } from "node:path";
import { appRouter } from "@icpc-trainer/api";
import { DatabaseLive, DatabaseServiceTag } from "@icpc-trainer/db";
import { SUBMISSION_STATUSES } from "@icpc-trainer/shared";
import { Effect } from "effect";
import { afterAll, beforeAll, beforeEach, describe, expect, it } from "vitest";

import { makeQojJudge } from "../../judges/qoj.js";

const fixturesDir = join(import.meta.dirname, "../fixtures/qoj");

const fixture = (name: string): string => readFileSync(join(fixturesDir, name), "utf8");
const qojCookieJar = "uoj_username=qoj-user; uojsessid=session";
const originalCredentialKey = process.env.ICPC_TRAINER_CREDENTIAL_KEY;

const routes = new Map<string, string>([
  ["/contest/1113", fixture("result-link.html")],
  ["/results/QOJ1113", fixture("result-standings.html")],
  ["/contest/cloudflare", fixture("blocked-cloudflare.html")],
  ["/contest/login", fixture("login-required.html")],
  ["/user/profile/empty", fixture("profile-empty.html")],
  ["/user/profile/cloudflare", fixture("blocked-cloudflare.html")],
  ["/user/profile/cloudflare-js", fixture("blocked-cloudflare-js.html")],
  ["/user/profile/private", fixture("login-required.html")]
]);

const statuses = new Map<string, number>([
  ["/user/profile/cloudflare-http", 403],
  ["/user/profile/cloudflare-js", 403]
]);

describe("QOJ judge HTML fixtures", () => {
  let server: Server;
  let baseUrl: string;
  let lastCookieHeader: string | undefined;
  let requestedPaths: Array<string>;

  beforeAll(async () => {
    server = createServer((request, response) => {
      lastCookieHeader = request.headers.cookie;
      const path = request.url === undefined ? "/" : new URL(request.url, "http://localhost").pathname;
      requestedPaths.push(path);
      const body = routes.get(path);

      if (body === undefined) {
        response.writeHead(404, { "content-type": "text/html; charset=utf-8" });
        response.end("<!doctype html><title>404 Not Found</title><h1>404 Not Found</h1>");
        return;
      }

      response.writeHead(statuses.get(path) ?? 200, { "content-type": "text/html; charset=utf-8" });
      response.end(body);
    });

    await new Promise<void>((resolve) => {
      server.listen(0, "127.0.0.1", resolve);
    });

    const address = server.address();
    if (address === null || typeof address === "string") {
      throw new Error("Expected test server to listen on a TCP port");
    }

    baseUrl = `http://127.0.0.1:${address.port}`;
  });

  afterAll(async () => {
    await new Promise<void>((resolve, reject) => {
      server.close((error) => {
        if (error) {
          reject(error);
          return;
        }
        resolve();
      });
    });
    if (originalCredentialKey === undefined) {
      delete process.env.ICPC_TRAINER_CREDENTIAL_KEY;
    } else {
      process.env.ICPC_TRAINER_CREDENTIAL_KEY = originalCredentialKey;
    }
  });

  beforeEach(() => {
    requestedPaths = [];
    lastCookieHeader = undefined;
    process.env.ICPC_TRAINER_CREDENTIAL_KEY = originalCredentialKey ?? Buffer.alloc(32, 7).toString("base64");
  });

  const runWithQojAuth = async <A>(effect: Effect.Effect<A, unknown, DatabaseServiceTag>): Promise<A> => {
    process.env.ICPC_TRAINER_CREDENTIAL_KEY = Buffer.alloc(32, 7).toString("base64");

    const program = Effect.gen(function* () {
      const database = yield* DatabaseServiceTag;
      yield* database.migrate;
      const caller = appRouter.createCaller({
        database,
        judges: {
          run: async (input) => ({ ok: true as const, result: input })
        }
      });
      yield* Effect.promise(() =>
        caller.credentials.save({
          provider: "qoj",
          providerUserKey: "qoj-user",
          qoj: {
            cookieJar: qojCookieJar
          }
        })
      );

      return yield* effect;
    });

    return await Effect.runPromise(program.pipe(Effect.provide(DatabaseLive({ filename: ":memory:" }))));
  };

  it("parses contest metadata and problems from copied QOJ contest HTML", async () => {
    const judge = makeQojJudge(baseUrl);

    const contest = await runWithQojAuth(judge.getContest("https://qoj.ac/contest/1113"));

    expect(fixture("result-link.html")).toContain('/results/QOJ1113');
    expect(requestedPaths).toEqual(["/contest/1113", "/results/QOJ1113"]);
    expect(contest).toMatchObject({
      judgeId: "1113",
      name: "The 2017 ICPC Northern Eurasia Finals",
      participants: 3,
      stars: 0
    });
    expect(contest.problems).toHaveLength(12);
    expect(contest.problems.slice(0, 3)).toEqual([
      {
        judgeId: "11785",
        name: "Archery Tournament",
        solves: 71,
        link: "https://qoj.ac/contest/1113/problem/11785"
      },
      {
        judgeId: "11786",
        name: "Box",
        solves: 235,
        link: "https://qoj.ac/contest/1113/problem/11786"
      },
      {
        judgeId: "11787",
        name: "Connections",
        solves: 128,
        link: "https://qoj.ac/contest/1113/problem/11787"
      }
    ]);
  });

  it("accepts an existing profile fixture", async () => {
    const judge = makeQojJudge(baseUrl);

    await expect(runWithQojAuth(judge.getUser("empty"))).resolves.toEqual({ handle: "empty" });
  });

  it("parses QOJ submissions with database-matchable problem ids", async () => {
    routes.set(
      "/submissions",
      `<!doctype html>
      <table>
        <tr>
          <td><a href="/submission/98765">98765</a></td>
          <td><a href="/user/profile/qoj-user">qoj-user</a></td>
          <td><a href="/contest/1113/problem/11785">Archery Tournament</a></td>
          <td>Accepted</td>
          <td>2024-04-05 12:30:00</td>
        </tr>
      </table>`
    );
    const judge = makeQojJudge(baseUrl);

    await expect(runWithQojAuth(judge.getSubmissions({ userHandle: " qoj-user " }))).resolves.toEqual([
      {
        judgeId: "98765",
        judgeContestId: "1113",
        judgeProblemId: "11785",
        problemName: "Archery Tournament",
        verdict: SUBMISSION_STATUSES.AC,
        submittedAt: new Date("2024/04/05 12:30:00")
      }
    ]);
  });

  it("rejects login-required profile HTML instead of treating it as a user", async () => {
    const judge = makeQojJudge(baseUrl);

    await expect(runWithQojAuth(Effect.flip(judge.getUser("private")))).resolves.toMatchObject({
      _tag: "JudgeCredentialError",
      cause: "QOJ login required. Paste a fresh QOJ cookie set from your browser."
    });
  });

  it("sends QOJ cookie authentication when supplied", async () => {
    const judge = makeQojJudge(baseUrl);

    await expect(runWithQojAuth(judge.getUser("empty"))).resolves.toEqual({ handle: "empty" });
    expect(lastCookieHeader).toBe(qojCookieJar);
  });

  it("does not classify successful Cloudflare-looking HTML before parsing", async () => {
    const judge = makeQojJudge(baseUrl);

    await expect(runWithQojAuth(judge.getUser("cloudflare"))).resolves.toEqual({
      handle: "cloudflare"
    });
  });

  it("returns status and response text for blocked HTTP responses", async () => {
    routes.set("/user/profile/cloudflare-http", fixture("blocked-cloudflare.html"));
    const judge = makeQojJudge(baseUrl);

    await expect(
      runWithQojAuth(Effect.flip(judge.getUser("cloudflare-http")))
    ).resolves.toMatchObject({
      _tag: "JudgeCredentialError",
      cause: "QOJ returned HTTP 403: Attention Required! | Cloudflare Checking your browser before accessing qoj.ac."
    });
  });

  it("returns status and response text for current Cloudflare JavaScript challenge pages", async () => {
    const judge = makeQojJudge(baseUrl);

    await expect(runWithQojAuth(Effect.flip(judge.getUser("cloudflare-js")))).resolves.toMatchObject({
      _tag: "JudgeCredentialError",
      cause: "QOJ returned HTTP 403: Just a moment... Just a moment... Enable JavaScript and cookies to continue"
    });
  });

  it("returns a credential error for HTTP login-required pages with details", async () => {
    const judge = makeQojJudge(baseUrl);

    await expect(runWithQojAuth(Effect.flip(judge.getContest("login")))).resolves.toMatchObject({
      _tag: "JudgeCredentialError",
      cause: "QOJ login required. Paste a fresh QOJ cookie set from your browser."
    });
  });
});
