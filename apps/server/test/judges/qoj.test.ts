import { readFileSync } from "node:fs";
import { createServer, type Server } from "node:http";
import { join } from "node:path";
import { Effect } from "effect";
import { afterAll, beforeAll, describe, expect, it } from "vitest";

import { makeQojJudge } from "../../judges/qoj.js";

const fixturesDir = join(import.meta.dirname, "../fixtures/qoj");

const fixture = (name: string): string => readFileSync(join(fixturesDir, name), "utf8");

const routes = new Map<string, string>([
  ["/contest/1113", fixture("result-link.html")],
  ["/contest/1113/problems", fixture("result-link.html")],
  ["/user/profile/empty", fixture("profile-empty.html")],
  ["/user/profile/private", fixture("login-required.html")]
]);

describe("QOJ judge HTML fixtures", () => {
  let server: Server;
  let baseUrl: string;

  beforeAll(async () => {
    server = createServer((request, response) => {
      const path = request.url === undefined ? "/" : new URL(request.url, "http://localhost").pathname;
      const body = routes.get(path);

      if (body === undefined) {
        response.writeHead(404, { "content-type": "text/html; charset=utf-8" });
        response.end("<!doctype html><title>404 Not Found</title><h1>404 Not Found</h1>");
        return;
      }

      response.writeHead(200, { "content-type": "text/html; charset=utf-8" });
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
  });

  it("parses contest metadata and problems from copied QOJ contest HTML", async () => {
    const judge = makeQojJudge(baseUrl);

    const contest = await Effect.runPromise(judge.getContest("https://qoj.ac/contest/1113"));

    expect(fixture("result-link.html")).toContain('/results/QOJ1113');
    expect(contest).toMatchObject({
      judgeId: "1113",
      name: "The 2017 ICPC Northern Eurasia Finals",
      stars: 0
    });
    expect(contest.problems).toHaveLength(12);
    expect(contest.problems.slice(0, 3)).toEqual([
      {
        judgeId: "11785",
        name: "Archery Tournament",
        solves: 0,
        link: "https://qoj.ac/contest/1113/problem/11785"
      },
      {
        judgeId: "11786",
        name: "Box",
        solves: 0,
        link: "https://qoj.ac/contest/1113/problem/11786"
      },
      {
        judgeId: "11787",
        name: "Connections",
        solves: 0,
        link: "https://qoj.ac/contest/1113/problem/11787"
      }
    ]);
  });

  it("accepts an existing profile fixture", async () => {
    const judge = makeQojJudge(baseUrl);

    await expect(Effect.runPromise(judge.getUser("empty"))).resolves.toEqual({ handle: "empty" });
  });

  it("rejects login-required profile HTML instead of treating it as a user", async () => {
    const judge = makeQojJudge(baseUrl);

    await expect(Effect.runPromise(judge.getUser("private"))).rejects.toThrow(/login|required/i);
  });
});
