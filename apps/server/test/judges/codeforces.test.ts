import { appRouter } from "@icpc-trainer/api";
import { DatabaseLive, DatabaseServiceTag } from "@icpc-trainer/db";
import { SUBMISSION_STATUSES } from "@icpc-trainer/shared";
import { Effect } from "effect";
import { afterEach, describe, expect, it, vi } from "vitest";

import { makeCodeforcesJudge } from "../../judges/codeforces.js";

const codeforcesAuth = {
  apiKey: "key",
  apiSecret: "secret"
};

const originalCredentialKey = process.env.ICPC_TRAINER_CREDENTIAL_KEY;

const jsonResponse = (payload: unknown): Response =>
  ({
    ok: true,
    status: 200,
    json: async () => payload
  }) as Response;

const textResponse = (status: number, body: string): Response =>
  ({
    ok: false,
    status,
    text: async () => body
  }) as Response;

const expectRequestedUrl = (value: unknown, pathname: string): URL => {
  expect(typeof value).toBe("string");

  const url = new URL(value as string);

  expect(url.origin).toBe("https://codeforces.com");
  expect(url.pathname).toBe(pathname);

  return url;
};

const runWithDatabase = async <A>(
  effect: Effect.Effect<A, unknown, DatabaseServiceTag>,
  auth?: { readonly apiKey: string; readonly apiSecret: string },
): Promise<A> => {
  process.env.ICPC_TRAINER_CREDENTIAL_KEY = Buffer.alloc(32, 7).toString("base64");

  const program = Effect.gen(function* () {
    const database = yield* DatabaseServiceTag;
    yield* database.migrate;

    if (auth !== undefined) {
      const caller = appRouter.createCaller({
        database,
        judges: {
          run: async (input) => ({ ok: true as const, result: input }),
          validateCredentials: async () => undefined
        }
      });
      yield* Effect.promise(() =>
        caller.credentials.save({
          provider: "codeforces",
          providerUserKey: "test",
          codeforces: auth
        })
      );
    }

    return yield* effect;
  });

  return await Effect.runPromise(program.pipe(Effect.provide(DatabaseLive({ filename: ":memory:" }))));
};

const runWithCodeforcesAuth = async <A>(
  effect: Effect.Effect<A, unknown, DatabaseServiceTag>,
  auth = codeforcesAuth,
): Promise<A> => runWithDatabase(effect, auth);

describe("makeCodeforcesJudge", () => {
  afterEach(() => {
    vi.unstubAllGlobals();
    if (originalCredentialKey === undefined) {
      delete process.env.ICPC_TRAINER_CREDENTIAL_KEY;
    } else {
      process.env.ICPC_TRAINER_CREDENTIAL_KEY = originalCredentialKey;
    }
  });

  it("calls user.status with the requested handle and parses Codeforces submissions", async () => {
    const fetchMock = vi.fn().mockResolvedValue(
      jsonResponse({
        status: "OK",
        result: [
          {
            id: 49644212,
            contestId: 100566,
            creationTimeSeconds: 1450000000,
            problem: {
              contestId: 100566,
              index: "A",
              name: "Matching Names"
            },
            verdict: "OK"
          },
          {
            id: 49644213,
            contestId: 100566,
            creationTimeSeconds: 1450000300,
            problem: {
              contestId: 100566,
              index: "B",
              name: "Replicating Processes"
            },
            verdict: "TIME_LIMIT_EXCEEDED"
          },
          {
            id: 49644214,
            contestId: 566,
            creationTimeSeconds: 1450000600,
            problem: {
              contestId: 566,
              index: "C",
              name: "Regular Contest"
            },
            verdict: "OK"
          },
          {
            id: 49644215,
            contestId: 200001,
            creationTimeSeconds: 1450000900,
            problem: {
              contestId: 200001,
              index: "A",
              name: "Out of Range Gym"
            },
            verdict: "OK"
          }
        ]
      })
    );
    vi.stubGlobal("fetch", fetchMock);

    const submissions = await runWithCodeforcesAuth(
      makeCodeforcesJudge().getSubmissions({ userHandle: " Fefer_Ivan " })
    );

    expect(fetchMock).toHaveBeenCalledTimes(1);
    const url = expectRequestedUrl(fetchMock.mock.calls[0]?.[0], "/api/user.status");
    expect(url.searchParams.get("handle")).toBe("Fefer_Ivan");
    expect(url.searchParams.get("from")).toBe("1");
    expect(url.searchParams.get("count")).toBe("100000");

    expect(submissions).toEqual([
      {
        judgeId: "49644212",
        judgeContestId: "100566",
        judgeProblemId: "100566A",
        problemName: "A. Matching Names",
        verdict: SUBMISSION_STATUSES.AC,
        submittedAt: new Date(1450000000 * 1000)
      },
      {
        judgeId: "49644213",
        judgeContestId: "100566",
        judgeProblemId: "100566B",
        problemName: "B. Replicating Processes",
        verdict: SUBMISSION_STATUSES.TLE,
        submittedAt: new Date(1450000300 * 1000)
      }
    ]);
  });

  it("calls contest.standings with the expected filters and parses contest standings", async () => {
    const fetchMock = vi.fn().mockResolvedValue(
      jsonResponse({
        status: "OK",
        result: {
          contest: {
            id: 566,
            name: "Testing Round #566",
            type: "ICPC",
            phase: "FINISHED",
            difficulty: 3
          },
          problems: [
            {
              contestId: 566,
              index: "A",
              name: "Matching Names"
            },
            {
              contestId: 566,
              index: "B",
              name: "Replicating Processes"
            }
          ],
          rows: [
            {
              party: { participantType: "CONTESTANT" },
              rank: 1,
              points: 2,
              penalty: 35,
              problemResults: [{ points: 1 }, { points: 1 }]
            },
            {
              party: { participantType: "VIRTUAL" },
              rank: 2,
              points: 1,
              penalty: 70,
              problemResults: [{ points: 1 }, { points: 0 }]
            },
            {
              party: { participantType: "PRACTICE" },
              rank: 3,
              points: 2,
              penalty: 90,
              problemResults: [{ points: 1 }, { points: 1 }]
            }
          ]
        }
      })
    );
    vi.stubGlobal("fetch", fetchMock);

    const contest = await runWithCodeforcesAuth(makeCodeforcesJudge().getContest("566"));

    expect(fetchMock).toHaveBeenCalledTimes(1);
    const url = expectRequestedUrl(fetchMock.mock.calls[0]?.[0], "/api/contest.standings");
    expect(url.searchParams.get("contestId")).toBe("566");
    expect(url.searchParams.get("from")).toBe("1");
    expect(url.searchParams.get("count")).toBe("100000");
    expect(url.searchParams.get("showUnofficial")).toBe("true");
    expect(url.searchParams.has("participantTypes")).toBe(false);

    expect(contest).toEqual({
      judgeId: "566",
      name: "Testing Round #566",
      participants: 3,
      stars: 3,
      problems: [
        {
          judgeId: "566A",
          name: "A. Matching Names",
          solves: 3,
          link: "https://codeforces.com/gym/566/problem/A"
        },
        {
          judgeId: "566B",
          name: "B. Replicating Processes",
          solves: 2,
          link: "https://codeforces.com/gym/566/problem/B"
        }
      ]
    });
  });

  it("uses a contest-name fallback when Codeforces omits gym difficulty", async () => {
    const fetchMock = vi.fn().mockResolvedValue(
      jsonResponse({
        status: "OK",
        result: {
          contest: {
            id: 104666,
            name: "2019-2020 ICPC Central Europe Regional Contest (CERC 19)",
            type: "ICPC",
            phase: "FINISHED"
          },
          problems: [
            {
              contestId: 104666,
              index: "A",
              name: "ABB"
            }
          ],
          rows: [
            {
              party: { participantType: "CONTESTANT" },
              rank: 1,
              points: 1,
              penalty: 1,
              problemResults: [{ points: 1 }]
            }
          ]
        }
      })
    );
    vi.stubGlobal("fetch", fetchMock);

    const contest = await runWithCodeforcesAuth(makeCodeforcesJudge().getContest("104666"));

    expect(contest).toMatchObject({
      judgeId: "104666",
      name: "2019-2020 ICPC Central Europe Regional Contest (CERC 19)",
      stars: 4
    });
  });

  it("calls contest.list once with gym=true and no pagination", async () => {
    const fetchMock = vi.fn().mockResolvedValue(
      jsonResponse({
        status: "OK",
        result: [
          {
            id: 566,
            name: "Testing Gym #566",
            type: "ICPC",
            phase: "FINISHED"
          },
          {
            id: 567,
            name: "Testing Gym #567",
            type: "CF",
            phase: "BEFORE"
          }
        ]
      })
    );
    vi.stubGlobal("fetch", fetchMock);

    const contests = await runWithCodeforcesAuth(makeCodeforcesJudge().getContests());

    expect(fetchMock).toHaveBeenCalledTimes(1);
    const url = expectRequestedUrl(fetchMock.mock.calls[0]?.[0], "/api/contest.list");
    expect(url.searchParams.get("gym")).toBe("true");
    expect(url.searchParams.has("from")).toBe(false);
    expect(url.searchParams.has("count")).toBe(false);
    expect(contests).toEqual([
      {
        judgeId: "566",
        name: "Testing Gym #566"
      },
      {
        judgeId: "567",
        name: "Testing Gym #567"
      }
    ]);
  });

  it("calls user.info and parses the returned Codeforces user", async () => {
    const fetchMock = vi.fn().mockResolvedValue(
      jsonResponse({
        status: "OK",
        result: [
          {
            handle: "Fefer_Ivan",
            contribution: 0,
            rank: "legendary grandmaster",
            rating: 3662,
            maxRank: "legendary grandmaster",
            maxRating: 3797
          }
        ]
      })
    );
    vi.stubGlobal("fetch", fetchMock);

    const user = await runWithCodeforcesAuth(makeCodeforcesJudge().getUser("Fefer_Ivan"));

    expect(fetchMock).toHaveBeenCalledTimes(1);
    const url = expectRequestedUrl(fetchMock.mock.calls[0]?.[0], "/api/user.info");
    expect(url.searchParams.get("handles")).toBe("Fefer_Ivan");

    expect(user).toEqual({ handle: "Fefer_Ivan" });
  });

  it("signs Codeforces requests when API credentials are supplied", async () => {
    const fetchMock = vi.fn().mockResolvedValue(
      jsonResponse({
        status: "OK",
        result: [
          {
            handle: "Fefer_Ivan"
          }
        ]
      })
    );
    vi.stubGlobal("fetch", fetchMock);

    await runWithCodeforcesAuth(makeCodeforcesJudge().getUser("Fefer_Ivan"));

    const url = expectRequestedUrl(fetchMock.mock.calls[0]?.[0], "/api/user.info");
    expect(url.searchParams.get("handles")).toBe("Fefer_Ivan");
    expect(url.searchParams.get("apiKey")).toBe("key");
    expect(url.searchParams.get("time")).toMatch(/^\d+$/);
    expect(url.searchParams.get("apiSig")).toMatch(/^[a-f0-9]{134}$/);
  });

  it("validates Codeforces credentials with user.info and user.friends", async () => {
    const fetchMock = vi.fn()
      .mockResolvedValueOnce(
        jsonResponse({
          status: "OK",
          result: [{ handle: "MikeMirzayanov" }]
        })
      )
      .mockResolvedValueOnce(
        jsonResponse({
          status: "OK",
          result: ["tourist"]
        })
      );
    vi.stubGlobal("fetch", fetchMock);

    await runWithDatabase(makeCodeforcesJudge().validateAuthentication({
      provider: "codeforces",
      providerUserKey: "MikeMirzayanov",
      codeforces: codeforcesAuth
    }));

    expect(fetchMock).toHaveBeenCalledTimes(2);
    const userInfoUrl = expectRequestedUrl(fetchMock.mock.calls[0]?.[0], "/api/user.info");
    expect(userInfoUrl.searchParams.get("handles")).toBe("MikeMirzayanov");
    expect(userInfoUrl.searchParams.get("apiKey")).toBe("key");
    const friendsUrl = expectRequestedUrl(fetchMock.mock.calls[1]?.[0], "/api/user.friends");
    expect(friendsUrl.searchParams.get("apiKey")).toBe("key");
  });

  it("rejects missing Codeforces handles after checking user.info", async () => {
    const fetchMock = vi.fn().mockResolvedValue(
      jsonResponse({
        status: "FAILED",
        comment: "handles: User with handle bad handle! not found"
      })
    );
    vi.stubGlobal("fetch", fetchMock);

    await expect(
      runWithDatabase(Effect.flip(makeCodeforcesJudge().validateAuthentication({
        provider: "codeforces",
        providerUserKey: "bad handle!",
        codeforces: codeforcesAuth
      })))
    ).resolves.toMatchObject({
      _tag: "JudgeCredentialError",
      judgeId: "bad handle!",
      cause: "Codeforces handle does not exist: bad handle!."
    });
    expect(fetchMock).toHaveBeenCalledTimes(1);
    const url = expectRequestedUrl(fetchMock.mock.calls[0]?.[0], "/api/user.info");
    expect(url.searchParams.get("handles")).toBe("bad handle!");
  });

  it("maps signed Codeforces auth failures to credential errors", async () => {
    const fetchMock = vi.fn().mockResolvedValue(
      jsonResponse({
        status: "FAILED",
        comment: "Invalid apiKey or apiSig"
      })
    );
    vi.stubGlobal("fetch", fetchMock);

    await expect(
      runWithCodeforcesAuth(
        Effect.flip(makeCodeforcesJudge().getUser("x")),
        { apiKey: "bad-key", apiSecret: "bad-secret" }
      )
    ).resolves.toMatchObject({
      _tag: "JudgeCredentialError",
      cause: "Invalid apiKey or apiSig"
    });
  });

  it("fails without credentials before making a Codeforces API request", async () => {
    const fetchMock = vi.fn();
    vi.stubGlobal("fetch", fetchMock);

    await expect(
      runWithDatabase(Effect.flip(makeCodeforcesJudge().getContest("566")))
    ).resolves.toMatchObject({
      _tag: "JudgeCredentialError",
      cause: "Connect Codeforces before using the playground."
    });
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it("maps private Codeforces contest responses to credential errors", async () => {
    const fetchMock = vi.fn().mockResolvedValue(
      jsonResponse({
        status: "FAILED",
        comment: "Contest is private. Access denied."
      })
    );
    vi.stubGlobal("fetch", fetchMock);

    await expect(
      runWithCodeforcesAuth(Effect.flip(makeCodeforcesJudge().getContest("104217")))
    ).resolves.toMatchObject({
      _tag: "JudgeCredentialError",
      cause: "Contest is private. Access denied."
    });
  });

  it("includes Codeforces HTTP error response comments", async () => {
    const fetchMock = vi.fn().mockResolvedValue(
      textResponse(
        400,
        JSON.stringify({
          status: "FAILED",
          comment: "contestId: Field should contain integer."
        })
      )
    );
    vi.stubGlobal("fetch", fetchMock);

    await expect(
      runWithCodeforcesAuth(Effect.flip(makeCodeforcesJudge().getContest("abc")))
    ).resolves.toMatchObject({
      _tag: "JudgeAPIError",
      cause: "Codeforces API returned HTTP 400: contestId: Field should contain integer."
    });
  });

  it("maps Codeforces HTTP 5xx responses to unavailable errors", async () => {
    const fetchMock = vi.fn().mockResolvedValue(
      textResponse(
        503,
        JSON.stringify({
          status: "FAILED",
          comment: "Service unavailable."
        })
      )
    );
    vi.stubGlobal("fetch", fetchMock);

    await expect(
      runWithCodeforcesAuth(Effect.flip(makeCodeforcesJudge().getContest("566")))
    ).resolves.toMatchObject({
      _tag: "JudgeUnavailableError",
      cause: "Codeforces API is unavailable (HTTP 503): Service unavailable."
    });
  });

  it("maps Codeforces network failures to unavailable errors", async () => {
    const fetchMock = vi.fn().mockRejectedValue(new TypeError("fetch failed"));
    vi.stubGlobal("fetch", fetchMock);

    await expect(
      runWithCodeforcesAuth(Effect.flip(makeCodeforcesJudge().getUser("tourist")))
    ).resolves.toMatchObject({
      _tag: "JudgeUnavailableError",
      cause: "Codeforces API is unavailable. The request could not reach Codeforces."
    });
  });

  it("looks up Codeforces credentials when the API request is made", async () => {
    const fetchMock = vi.fn().mockResolvedValue(
      jsonResponse({
        status: "OK",
        result: [{ handle: "Fefer_Ivan" }]
      })
    );
    vi.stubGlobal("fetch", fetchMock);

    const judge = makeCodeforcesJudge();

    await runWithCodeforcesAuth(judge.getUser("Fefer_Ivan"));

    const url = expectRequestedUrl(fetchMock.mock.calls[0]?.[0], "/api/user.info");
    expect(url.searchParams.get("apiKey")).toBe("key");
  });

  it("does not call Codeforces when credentials are missing", async () => {
    const fetchMock = vi.fn();
    vi.stubGlobal("fetch", fetchMock);

    await expect(runWithDatabase(Effect.flip(makeCodeforcesJudge().getUser("x")))).resolves.toMatchObject({
      _tag: "JudgeCredentialError",
      cause: "Connect Codeforces before using the playground."
    });
    expect(fetchMock).not.toHaveBeenCalled();
  });
});
