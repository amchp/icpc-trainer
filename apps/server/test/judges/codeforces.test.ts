
import { SUBMISSION_STATUSES } from "@icpc-trainer/shared";
import { Effect } from "effect";
import { afterEach, describe, expect, it, vi } from "vitest";

import { makeCodeforcesJudge } from "../../judges/codeforces.js";

const jsonResponse = (payload: unknown): Response =>
  ({
    ok: true,
    status: 200,
    json: async () => payload
  }) as Response;

const expectRequestedUrl = (value: unknown, pathname: string): URL => {
  expect(typeof value).toBe("string");

  const url = new URL(value as string);

  expect(url.origin).toBe("https://codeforces.com");
  expect(url.pathname).toBe(pathname);

  return url;
};

describe("makeCodeforcesJudge", () => {
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("calls user.status with the requested handle and parses Codeforces submissions", async () => {
    const fetchMock = vi.fn().mockResolvedValue(
      jsonResponse({
        status: "OK",
        result: [
          {
            id: 49644212,
            contestId: 566,
            creationTimeSeconds: 1450000000,
            problem: {
              contestId: 566,
              index: "A",
              name: "Matching Names"
            },
            verdict: "OK"
          },
          {
            id: 49644213,
            contestId: 566,
            creationTimeSeconds: 1450000300,
            problem: {
              contestId: 566,
              index: "B",
              name: "Replicating Processes"
            },
            verdict: "TIME_LIMIT_EXCEEDED"
          }
        ]
      })
    );
    vi.stubGlobal("fetch", fetchMock);

    const submissions = await Effect.runPromise(
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
        judgeContestId: "566",
        problemName: "A. Matching Names",
        verdict: SUBMISSION_STATUSES.AC,
        submittedAt: new Date(1450000000 * 1000)
      },
      {
        judgeId: "49644213",
        judgeContestId: "566",
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
            }
          ]
        }
      })
    );
    vi.stubGlobal("fetch", fetchMock);

    const contest = await Effect.runPromise(makeCodeforcesJudge().getContest("566"));

    expect(fetchMock).toHaveBeenCalledTimes(1);
    const url = expectRequestedUrl(fetchMock.mock.calls[0]?.[0], "/api/contest.standings");
    expect(url.searchParams.get("contestId")).toBe("566");
    expect(url.searchParams.get("from")).toBe("1");
    expect(url.searchParams.get("count")).toBe("100000");
    expect(url.searchParams.get("showUnofficial")).toBe("true");
    expect(url.searchParams.get("participantTypes")).toBe("CONTESTANT;VIRTUAL");

    expect(contest).toEqual({
      judgeId: "566",
      name: "Testing Round #566",
      participants: 2,
      stars: 3,
      problems: [
        {
          judgeId: "566A",
          name: "A. Matching Names",
          solves: 2,
          link: "https://codeforces.com/gym/566/problem/A"
        },
        {
          judgeId: "566B",
          name: "B. Replicating Processes",
          solves: 1,
          link: "https://codeforces.com/gym/566/problem/B"
        }
      ]
    });
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

    const user = await Effect.runPromise(makeCodeforcesJudge().getUser("Fefer_Ivan"));

    expect(fetchMock).toHaveBeenCalledTimes(1);
    const url = expectRequestedUrl(fetchMock.mock.calls[0]?.[0], "/api/user.info");
    expect(url.searchParams.get("handles")).toBe("Fefer_Ivan");

    expect(user).toEqual({ handle: "Fefer_Ivan" });
  });
});
