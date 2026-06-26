import { Buffer } from "node:buffer";
import { readFileSync } from "node:fs";
import { createServer, type Server } from "node:http";
import { join } from "node:path";
import process from "node:process";
import { AppUserIdTag, appRouter } from "@icpc-trainer/api";
import { DatabaseLive, DatabaseServiceTag } from "@icpc-trainer/db";
import { SUBMISSION_STATUSES } from "@icpc-trainer/shared";
import { Effect } from "effect";
import { afterAll, beforeAll, beforeEach, describe, expect, it } from "vitest";

import {
  makeQojCredentialValidator,
  makeQojPlaygroundClient
} from "../../judges/qoj.js";
import { createTestAppUser, provideTestAppUser } from "../testAppUser.js";

const fixturesDir = join(import.meta.dirname, "../fixtures/qoj");

const fixture = (name: string): string => readFileSync(join(fixturesDir, name), "utf8");
const qojCookieJar = "uoj_username=qoj-user; uojsessid=session";
const originalCredentialKey = process.env.ICPC_TRAINER_CREDENTIAL_KEY;

const routes = new Map<string, string>([
  ["/contests", fixture("contests-page.html")],
  ["/contest/1113", fixture("result-link.html")],
  ["/results/QOJ1113", fixture("result-standings.html")],
  ["/contest/cloudflare", fixture("blocked-cloudflare.html")],
  ["/contest/login", fixture("login-required.html")],
  ["/user/profile/empty", fixture("profile-empty.html")],
  ["/user/profile/juancs", fixture("profile-page.html")],
  ["/user/profile/qoj-user", fixture("profile-page.html")],
  ["/user/profile/cloudflare", fixture("blocked-cloudflare.html")],
  ["/user/profile/cloudflare-js", fixture("blocked-cloudflare-js.html")],
  ["/user/profile/private", fixture("login-required.html")]
]);

const minimalContestHtml = (
  contestId: string,
  problemCount: number,
  name = `Contest ${contestId}`
): string => `
  <!doctype html>
  <html>
    <head><title>${name} - QOJ</title></head>
    <body>
      <a href="/results/QOJ${contestId}">External Standings</a>
      <table>
        <tbody>
          ${Array.from({ length: problemCount }, (_, index) => {
            const letter = String.fromCodePoint("A".codePointAt(0)! + index);

            return `
              <tr>
                <td>${letter}</td>
                <td><a href="/contest/${contestId}/problem/${letter}">Problem ${letter}</a></td>
                <td>0</td>
              </tr>
            `;
          }).join("")}
        </tbody>
      </table>
    </body>
  </html>
`;

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

  const runWithQojAuth = async <A>(effect: Effect.Effect<A, unknown, DatabaseServiceTag | AppUserIdTag>): Promise<A> => {
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
      yield* Effect.promise(() =>
        caller.credentials.save({
          provider: "qoj",
          providerUserKey: "qoj-user",
          qoj: {
            cookieJar: qojCookieJar
          }
        })
      );

      return yield* provideTestAppUser(effect, appUser);
    });

    return await Effect.runPromise(program.pipe(Effect.provide(DatabaseLive({ url: ":memory:" }))));
  };

  it("parses contest metadata and problems from copied QOJ contest HTML", async () => {
    const judge = makeQojPlaygroundClient(baseUrl);

    const contest = await runWithQojAuth(judge.getContest("https://qoj.ac/contest/1113"));

    expect(fixture("result-link.html")).toContain('/results/QOJ1113');
    expect(requestedPaths).toEqual(["/contest/1113", "/results/QOJ1113"]);
    expect(contest).toMatchObject({
      judgeId: "1113",
      name: "The 2017 ICPC Northern Eurasia Finals",
      participants: 3,
      stars: 4
    });
    expect(contest.problems).toHaveLength(12);
    expect(contest.problems.slice(0, 3)).toEqual([
      {
        judgeId: "11785",
        name: "A. Archery Tournament",
        solves: 71,
        link: "https://qoj.ac/contest/1113/problem/11785"
      },
      {
        judgeId: "11786",
        name: "B. Box",
        solves: 235,
        link: "https://qoj.ac/contest/1113/problem/11786"
      },
      {
        judgeId: "11787",
        name: "C. Connections",
        solves: 128,
        link: "https://qoj.ac/contest/1113/problem/11787"
      }
    ]);
  });

  it("rates QOJ World Finals contests as five stars", async () => {
    routes.set("/contest/2000", minimalContestHtml("2000", 1, "The 2024 ICPC World Finals"));
    const judge = makeQojPlaygroundClient(baseUrl);

    const contest = await runWithQojAuth(judge.getContest("2000"));

    expect(contest).toMatchObject({
      name: "The 2024 ICPC World Finals",
      stars: 5
    });
  });

  it.each([
    ["2001", "Moscow Pre-Finals Workshop 2016"],
    ["2002", "All Ireland Programming Olympiad 2017 National Finals"],
    ["2003", "The 2017 ICPC Northern Eurasia Finals"],
    ["2004", "The 4th Universal Cup. Stage 10"],
    ["2005", "Random Training Contest"]
  ])("rates non-World-Finals QOJ contests as four stars: %s", async (contestId, name) => {
    routes.set(`/contest/${contestId}`, minimalContestHtml(contestId, 1, name));
    const judge = makeQojPlaygroundClient(baseUrl);

    const contest = await runWithQojAuth(judge.getContest(contestId));

    expect(contest).toMatchObject({
      name,
      stars: 4
    });
  });

  it("keeps default QOJ stars when external results are unavailable", async () => {
    routes.set("/contest/2006", minimalContestHtml("2006", 5, "Normal QOJ Contest"));
    const judge = makeQojPlaygroundClient(baseUrl);

    const contest = await runWithQojAuth(judge.getContest("2006"));

    expect(requestedPaths).toEqual(["/contest/2006", "/results/QOJ2006"]);
    expect(contest.stars).toBe(4);
  });

  it("accepts an existing profile fixture", async () => {
    const judge = makeQojPlaygroundClient(baseUrl);

    await expect(runWithQojAuth(judge.getUser("empty"))).resolves.toEqual({ handle: "empty" });
  });

  it("parses QOJ submissions with database-matchable problem ids", async () => {
    const judge = makeQojPlaygroundClient(baseUrl);

    await expect(runWithQojAuth(judge.getSubmissions({ userHandle: " juancs " }))).resolves.toContainEqual(
      {
        judgeId: "profile-ac-11785",
        judgeProblemId: "11785",
        problemName: "11785",
        verdict: SUBMISSION_STATUSES.AC,
        submittedAt: new Date(0)
      }
    );
  });

  it("parses tried QOJ profile problems as non-accepted submissions", async () => {
    const judge = makeQojPlaygroundClient(baseUrl);

    await expect(runWithQojAuth(judge.getSubmissions({ userHandle: "juancs" }))).resolves.toContainEqual(
      {
        judgeId: "profile-tried-3176",
        judgeProblemId: "3176",
        problemName: "3176",
        verdict: SUBMISSION_STATUSES.WA,
        submittedAt: new Date(0)
      }
    );
  });

  it("parses virtual contests from the QOJ profile page", async () => {
    const judge = makeQojPlaygroundClient(baseUrl);

    await expect(runWithQojAuth(judge.getContests({ userHandle: "juancs" }))).resolves.toEqual([
      expect.objectContaining({
        judgeId: "2814",
        name: "The 4th Universal Cup. Stage 10: Grand Prix of Wrocław"
      }),
      expect.objectContaining({
        judgeId: "3384"
      }),
      expect.objectContaining({
        judgeId: "2641"
      }),
      expect.objectContaining({
        judgeId: "1113",
        name: "The 2017 ICPC Northern Eurasia Finals"
      }),
      expect.objectContaining({
        judgeId: "3347"
      }),
      expect.objectContaining({
        judgeId: "1511"
      }),
      expect.objectContaining({
        judgeId: "1893"
      }),
      expect.objectContaining({
        judgeId: "1913"
      }),
      expect.objectContaining({
        judgeId: "1741"
      }),
      expect.objectContaining({
        judgeId: "2828"
      }),
      expect.objectContaining({
        judgeId: "1774"
      }),
      expect.objectContaining({
        judgeId: "1522"
      }),
      expect.objectContaining({
        judgeId: "1123"
      }),
      expect.objectContaining({
        judgeId: "407"
      }),
      expect.objectContaining({
        judgeId: "1450"
      })
    ]);
  });

  it("parses the public QOJ contest catalog when no user handle is provided", async () => {
    const judge = makeQojPlaygroundClient(baseUrl);

    await expect(runWithQojAuth(judge.getContests())).resolves.toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          judgeId: "3876",
          name: "The 4th Al-Khwarizmi International Informatics Olympiad (KHIMIO 2026). Day 2"
        }),
        expect.objectContaining({
          judgeId: "116",
          name: "2017-2018 ICPC - North American Invitational Programming Contest 2017"
        })
      ])
    );
  });

  it("rejects login-required profile HTML instead of treating it as a user", async () => {
    const judge = makeQojPlaygroundClient(baseUrl);

    await expect(runWithQojAuth(Effect.flip(judge.getUser("private")))).resolves.toMatchObject({
      _tag: "JudgeCredentialError",
      cause: "QOJ login required. Paste a fresh QOJ cookie set from your browser."
    });
  });

  it("sends QOJ cookie authentication when supplied", async () => {
    const judge = makeQojPlaygroundClient(baseUrl);

    await expect(runWithQojAuth(judge.getUser("empty"))).resolves.toEqual({ handle: "empty" });
    expect(lastCookieHeader).toBe(qojCookieJar);
  });

  it("validates QOJ credentials by loading the submitted profile page", async () => {
    const judge = makeQojCredentialValidator(baseUrl);

    await expect(runWithQojAuth(judge.validateAuthentication({
      provider: "qoj",
      providerUserKey: "juancs",
      qoj: {
        cookieJar: qojCookieJar
      }
    }))).resolves.toBeUndefined();

    expect(requestedPaths.at(-1)).toBe("/user/profile/juancs");
    expect(lastCookieHeader).toBe(qojCookieJar);
  });

  it("rejects QOJ validation when the profile page requires login", async () => {
    const judge = makeQojCredentialValidator(baseUrl);

    await expect(runWithQojAuth(Effect.flip(judge.validateAuthentication({
      provider: "qoj",
      providerUserKey: "private",
      qoj: {
        cookieJar: qojCookieJar
      }
    })))).resolves.toMatchObject({
      _tag: "JudgeCredentialError",
      cause: "QOJ login required. Paste a fresh QOJ cookie set from your browser."
    });
  });

  it("does not classify successful Cloudflare-looking HTML before parsing", async () => {
    const judge = makeQojPlaygroundClient(baseUrl);

    await expect(runWithQojAuth(judge.getUser("cloudflare"))).resolves.toEqual({
      handle: "cloudflare"
    });
  });

  it("returns status and response text for blocked HTTP responses", async () => {
    routes.set("/user/profile/cloudflare-http", fixture("blocked-cloudflare.html"));
    const judge = makeQojPlaygroundClient(baseUrl);

    await expect(
      runWithQojAuth(Effect.flip(judge.getUser("cloudflare-http")))
    ).resolves.toMatchObject({
      _tag: "JudgeCredentialError",
      cause: "QOJ returned HTTP 403: Attention Required! | Cloudflare Checking your browser before accessing qoj.ac."
    });
  });

  it("returns status and response text for current Cloudflare JavaScript challenge pages", async () => {
    const judge = makeQojPlaygroundClient(baseUrl);

    await expect(runWithQojAuth(Effect.flip(judge.getUser("cloudflare-js")))).resolves.toMatchObject({
      _tag: "JudgeCredentialError",
      cause: "QOJ returned HTTP 403: Just a moment... Just a moment... Enable JavaScript and cookies to continue"
    });
  });

  it("returns a credential error for HTTP login-required pages with details", async () => {
    const judge = makeQojPlaygroundClient(baseUrl);

    await expect(runWithQojAuth(Effect.flip(judge.getContest("login")))).resolves.toMatchObject({
      _tag: "JudgeCredentialError",
      cause: "QOJ login required. Paste a fresh QOJ cookie set from your browser."
    });
  });
});
