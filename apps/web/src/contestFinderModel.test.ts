import { describe, expect, it } from "vitest";

import {
  contestFinderSearchText,
  normalizeContestFinderRows,
  sortContestFinderRows
} from "./contestFinderModel.js";

describe("contestFinderModel", () => {
  it("normalizes malformed rows so refreshed catalog data cannot crash rendering", () => {
    const rows = normalizeContestFinderRows([
      {
        id: 1,
        judge: "codeforces",
        judgeId: "100001",
        name: "ICPC Test",
        link: null,
        participants: Number.NaN,
        stars: undefined,
        friendCount: undefined,
        handles: undefined
      },
      {
        id: 2,
        judge: "qoj",
        judgeId: "200001",
        name: null,
        link: "https://qoj.ac/contest/1",
        participants: 10,
        stars: 4,
        friendCount: 2,
        handles: ["alice", null, "bob"]
      },
      {
        id: 3,
        judge: "unknown",
        judgeId: "bad",
        name: "Bad judge",
        link: "",
        participants: null,
        stars: null,
        friendCount: 1,
        handles: []
      }
    ] as never);

    expect(rows).toEqual([
      {
        id: 1,
        judge: "codeforces",
        judgeId: "100001",
        name: "ICPC Test",
        link: "",
        participants: null,
        stars: null,
        friendCount: 0,
        handles: []
      },
      {
        id: 2,
        judge: "qoj",
        judgeId: "200001",
        name: "Untitled contest",
        link: "https://qoj.ac/contest/1",
        participants: 10,
        stars: 4,
        friendCount: 2,
        handles: ["alice", "bob"]
      }
    ]);

    expect(() => rows.filter((row) => contestFinderSearchText(row)).sort(sortContestFinderRows)).not.toThrow();
  });
});
