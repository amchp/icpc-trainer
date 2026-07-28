import { beforeAll, describe, expect, it } from "vitest";

import { i18n } from "../i18n/i18n.js";
import { createBruteForceGuideTraces } from "./BruteForceGuideTraces.js";
import { runGuideTrace, type GuideTraceFrame, type GuideTraceVisual } from "./BruteForceGuideTrace.js";

describe("brute-force guide traces", () => {
  beforeAll(async () => i18n.changeLanguage("en"));

  it("executes every recursive permutation branch and exposes all six leaves in the complete tree", () => {
    const trace = createBruteForceGuideTraces(i18n.getFixedT("en", "bruteForce"), "en").recursivePermutation;
    const result = runGuideTrace(trace, {});
    expect(result.valid).toBe(true);
    if (!result.valid) return;

    expect(new Set(result.frames.map((frame) => frame.line))).toEqual(new Set([1, 2, 4, 5, 6, 7, 9, 10, 11, 12, 13, 14, 15, 17]));
    expect(outputOf(result.frames.at(-1))).toEqual(["ABC", "ACB", "BAC", "BCA", "CAB", "CBA"]);
    const tree = visualOf(result.frames.at(-1), "tree");
    expect(tree?.nodes).toHaveLength(16);
    expect(tree?.completedIds).toEqual(["ABC", "ACB", "BAC", "BCA", "CAB", "CBA"]);
    expect(result.frames).toHaveLength(182);
  });

  it("visits all six lexicographic permutations including the terminal false transition", () => {
    const trace = createBruteForceGuideTraces(i18n.getFixedT("en", "bruteForce"), "en").iterativePermutation;
    const result = runGuideTrace(trace, {});
    expect(result.valid).toBe(true);
    if (!result.valid) return;
    expect(outputOf(result.frames.at(-1))).toEqual(["ABC", "ACB", "BAC", "BCA", "CAB", "CBA"]);
    expect(result.frames.at(-1)?.narration).toMatch(/last lexicographic ordering/);
  });

  it("executes every binary decision and all eight masks without problem-specific sums", () => {
    const traces = createBruteForceGuideTraces(i18n.getFixedT("en", "bruteForce"), "en");
    const recursive = runGuideTrace(traces.recursiveSubset, {});
    const bitmask = runGuideTrace(traces.bitmaskSubset, {});
    expect(recursive.valid).toBe(true);
    expect(bitmask.valid).toBe(true);
    if (!recursive.valid || !bitmask.valid) return;

    const candidates = ["000", "001", "010", "011", "100", "101", "110", "111"];
    expect(outputOf(recursive.frames.at(-1))).toEqual(candidates);
    expect(outputOf(bitmask.frames.at(-1))).toEqual(candidates);
    expect(new Set(recursive.frames.map((frame) => frame.line))).toEqual(new Set([1, 3, 4, 5, 6, 8, 9, 10, 11, 12, 13, 14]));
    expect(traces.recursiveSubset.code).not.toMatch(/sum|values|target/);
    expect(traces.bitmaskSubset.code).not.toMatch(/sum|values|target/);
    expect(traces.bitmaskSubset.code).toContain("(mask & (1 << bit)) != 0");
  });
});

function outputOf(frame: GuideTraceFrame | undefined): readonly string[] | undefined {
  return visualOf(frame, "output")?.lines;
}

function visualOf<K extends GuideTraceVisual["kind"]>(
  frame: GuideTraceFrame | undefined,
  kind: K
): Extract<GuideTraceVisual, { readonly kind: K }> | undefined {
  return frame?.visuals?.find((visual): visual is Extract<GuideTraceVisual, { readonly kind: K }> => visual.kind === kind);
}
