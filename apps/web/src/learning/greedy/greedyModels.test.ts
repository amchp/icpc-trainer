import { describe, expect, it } from "vitest";

import {
  ACTIVITY_START_SENTINEL,
  minimumCoinCount,
  parseActivityRows,
  parseGreedyIntegers,
  parseGreedyTarget,
  parseLowercaseWord,
  traceActivitySelection,
  traceAlternatingSubsequence,
  traceChatRoom,
  traceCoinRace,
  traceGreedyCoins,
  traceTwins
} from "./greedyModels.js";

describe("greedy models", () => {
  it("traces canonical and non-canonical coin systems", () => {
    expect(traceGreedyCoins(68, [1, 5, 10, 25, 50]).coins).toEqual([50, 10, 5, 1, 1, 1]);
    const race = traceCoinRace(6, [1, 3, 4]);
    expect(race).toMatchObject({ greedyCoins: [4, 1, 1], greedyCount: 3, optimalCoins: [3, 3], optimalCount: 2, greedyIsOptimal: false });
    expect(minimumCoinCount(6, [1, 3, 4])).toBe(2);
    expect(minimumCoinCount(68, [1, 5, 10, 25, 50])).toBe(6);
    expect(minimumCoinCount(7, [5])).toBeNull();
    expect(race.frames.map(({ step }) => step)).toEqual(["start", "compare", "compare", "done"]);
    expect(race.frames.at(-1)).toMatchObject({ step: "done", greedyRemaining: 0, optimalRemaining: 0 });
  });

  it("emits the literal coin frame sequence", () => {
    const trace = traceGreedyCoins(6, [4, 3, 1]);
    expect(trace.frames.map((frame) => frame.step)).toEqual([
      "consider", "take", "consider", "skip", "consider", "take", "take", "done"
    ]);
  });

  it("selects activities by earliest finish and permits touching endpoints", () => {
    const defaults = [
      { id: "A", start: 1, finish: 4 }, { id: "B", start: 3, finish: 5 },
      { id: "C", start: 0, finish: 6 }, { id: "D", start: 5, finish: 7 },
      { id: "E", start: 5, finish: 9 }, { id: "F", start: 6, finish: 10 },
      { id: "G", start: 8, finish: 11 }, { id: "H", start: 12, finish: 16 }
    ];
    const trace = traceActivitySelection(defaults);
    expect(trace.accepted.map(({ id }) => id)).toEqual(["A", "D", "G", "H"]);
    expect(trace.frames[0]).toMatchObject({ step: "sort", candidate: null, lastFinish: ACTIVITY_START_SENTINEL, accepted: [] });
    expect(trace.frames.map(({ step }) => step)).toEqual([
      "sort", "consider", "take", "consider", "skip", "consider", "skip", "consider", "take",
      "consider", "skip", "consider", "skip", "consider", "take", "consider", "take", "done"
    ]);
    expect(traceActivitySelection([{ id: "A", start: 0, finish: 4 }, { id: "B", start: 4, finish: 8 }]).accepted).toHaveLength(2);
  });

  it("uses a strict majority for Twins", () => {
    expect(traceTwins([2, 1, 2])).toMatchObject({ ordered: [2, 2, 1], taken: [2, 2], count: 2 });
    expect(traceTwins([1, 1])).toMatchObject({ taken: [1, 1], count: 2 });
    expect(traceTwins([5])).toMatchObject({ taken: [5], count: 1 });
    expect(traceTwins([3, 1, 1])).toMatchObject({ taken: [3], count: 1 });
    for (const values of [[2, 1, 2], [1, 1], [5], [3, 1, 1]]) {
      const trace = traceTwins(values);
      const final = trace.frames.at(-1);
      expect(final?.step).toBe("done");
      expect(final?.strictlyGreater || trace.count === values.length).toBe(true);
    }
  });

  it("matches hello as an earliest subsequence", () => {
    expect(traceChatRoom("ahhellllloou").accepted).toBe(true);
    expect(traceChatRoom("hlelo").accepted).toBe(false);
    expect(traceChatRoom("hello").matchedIndices).toEqual([0, 1, 2, 3, 4]);
    expect(traceChatRoom("heeellloo").accepted).toBe(true);
    const trace = traceChatRoom("hello");
    expect(trace.frames.map(({ step }) => step)).toEqual([
      "scan", "match", "scan", "match", "scan", "match", "scan", "match", "scan", "match", "done"
    ]);
  });

  it("chooses one maximum from each sign block", () => {
    expect(traceAlternatingSubsequence([1, 2, 3, -1, -2])).toMatchObject({ chosen: [3, -1], length: 2, sum: 2 });
    expect(traceAlternatingSubsequence([5, 7])).toMatchObject({ chosen: [7], sum: 7 });
    expect(traceAlternatingSubsequence([-5, -2, -9])).toMatchObject({ chosen: [-2], sum: -2 });
    expect(traceAlternatingSubsequence([1, -1, 1]).blocks).toHaveLength(3);
    expect(traceAlternatingSubsequence([3, 1, -4, -2])).toMatchObject({ chosen: [3, -2] });
  });

  it("returns null rather than throwing for malformed editable input", () => {
    const limits = { maxCount: 2, minValue: 1, maxValue: 9, allowZero: false } as const;
    for (const raw of ["", "   ", "1,,2", "abc", "1.5", "0", "10", "1 2 3"]) {
      expect(() => parseGreedyIntegers(raw, limits)).not.toThrow();
      expect(parseGreedyIntegers(raw, limits)).toBeNull();
    }
    expect(parseGreedyTarget("", 1, 9)).toBeNull();
    expect(parseGreedyTarget("1.5", 1, 9)).toBeNull();
    for (const raw of ["Hello", "h e", "", "a".repeat(101)]) expect(parseLowercaseWord(raw, 100)).toBeNull();
    expect(parseActivityRows([{ id: "A", start: "4", finish: "4" }])).toBeNull();
  });

  it("guards invalid model inputs", () => {
    expect(() => traceGreedyCoins(0, [1])).toThrow();
    expect(() => traceActivitySelection([])).toThrow();
    expect(() => traceTwins([0])).toThrow();
    expect(() => traceChatRoom("Hello")).toThrow();
    expect(() => traceAlternatingSubsequence([1, 0, 2])).toThrow();
  });

  it("keeps every discriminated trace non-empty and terminated by done", () => {
    const traces = [
      traceGreedyCoins(6, [1, 3, 4]),
      traceCoinRace(6, [1, 3, 4]),
      traceActivitySelection([{ id: "A", start: 0, finish: 4 }]),
      traceTwins([2, 1, 2]),
      traceChatRoom("hello"),
      traceAlternatingSubsequence([1, 2, -1])
    ];
    for (const trace of traces) {
      expect(trace.frames.length).toBeGreaterThan(0);
      expect(trace.frames.at(-1)?.step).toBe("done");
    }
  });
});
