import { describe, expect, it, vi } from "vitest";

import {
  checkMagicPowder,
  classifyConditionPattern,
  expandDiscreteTrace,
  runDiscreteSearch,
  traceClosestValue,
  traceContinuousSquareRoot,
  traceFirstOccurrence,
  traceMagicPowder
} from "./binarySearchModel.js";

describe("binarySearchModel", () => {
  it("finds first true without evaluating either sentinel", () => {
    const condition = vi.fn((value: number) => value >= 4);
    const trace = runDiscreteSearch({ left: -1, right: 8, orientation: "false-true", condition });
    expect(trace.boundary).toBe(4);
    expect(condition).not.toHaveBeenCalledWith(-1);
    expect(condition).not.toHaveBeenCalledWith(8);
    expect(trace.steps.every((step) => step.left < step.mid && step.mid < step.right)).toBe(true);
  });

  it("expands every probe into calculate, evaluate, and move animation frames", () => {
    const trace = runDiscreteSearch({ left: -1, right: 8, orientation: "false-true", condition: (value) => value >= 4 });
    const frames = expandDiscreteTrace(trace);

    expect(frames).toHaveLength(trace.probes * 3);
    expect(frames.slice(0, 3).map((frame) => frame.phase)).toEqual([
      "calculate-mid",
      "evaluate-condition",
      "move-bound"
    ]);
    expect(frames[2]?.step.nextLeft).toBe(frames[2]?.step.mid);
  });

  it("finds last true and handles constant boundary patterns", () => {
    expect(runDiscreteSearch({ left: -1, right: 8, orientation: "true-false", condition: (value) => value <= 5 }).boundary).toBe(5);
    expect(runDiscreteSearch({ left: -1, right: 8, orientation: "false-true", condition: () => false }).boundary).toBe(8);
    expect(runDiscreteSearch({ left: -1, right: 8, orientation: "false-true", condition: () => true }).boundary).toBe(0);
  });

  it("classifies monotone patterns and rejects the PDF counterexample", () => {
    expect(classifyConditionPattern([false, false, true, true])).toBe("false-true");
    expect(classifyConditionPattern([true, true, false, false])).toBe("true-false");
    expect(classifyConditionPattern([false, true, true, false, false])).toBe("non-monotone");
    expect(classifyConditionPattern([false, false])).toBe("constant-false");
    expect(classifyConditionPattern([true, true])).toBe("constant-true");
  });

  it("returns the first duplicate or -1 after boundary verification", () => {
    expect(traceFirstOccurrence([1, 2, 2, 2, 8], 2).index).toBe(1);
    expect(traceFirstOccurrence([1, 3, 8], 2).index).toBe(-1);
    expect(traceFirstOccurrence([], 2).index).toBe(-1);
  });

  it("chooses the smaller closest value on a tie and handles edges", () => {
    expect(traceClosestValue([10, 20], 15).value).toBe(10);
    expect(traceClosestValue([10, 20], 1).value).toBe(10);
    expect(traceClosestValue([10, 20], 30).value).toBe(20);
    expect(traceClosestValue([10, 10, 20], 10).value).toBe(10);
  });

  it("supports epsilon and fixed-iteration continuous searches", () => {
    const epsilon = traceContinuousSquareRoot(8, { kind: "epsilon", epsilon: 1e-9 });
    const iterations = traceContinuousSquareRoot(8, { kind: "iterations", iterations: 60 });
    const zero = traceContinuousSquareRoot(0, { kind: "epsilon", epsilon: 1e-6 });
    const zeroIterations = traceContinuousSquareRoot(0, { kind: "iterations", iterations: 10 });
    const exactRootEndpoint = traceContinuousSquareRoot(1, { kind: "epsilon", epsilon: 1e-6 });
    expect(epsilon.result).toBeCloseTo(Math.sqrt(8), 8);
    expect(iterations.result).toBeCloseTo(Math.sqrt(8), 12);
    expect(exactRootEndpoint.steps[0]?.right).toBe(2);
    expect(exactRootEndpoint.result).toBeCloseTo(1, 5);
    expect(epsilon.steps.length).toBeGreaterThan(0);
    expect(iterations.steps.length).toBeLessThanOrEqual(60);
    expect(iterations.steps.length).toBeGreaterThan(50);
    expect(iterations.stagnated).toBe(true);
    expect(zero.steps[0]).toMatchObject({ left: 0, right: 1, conditionResult: false });
    expect(zero.result).toBeLessThan(1e-6);
    expect(zeroIterations.steps).toHaveLength(10);
  });

  it("uses exact BigInt arithmetic for Magic Powder samples", () => {
    expect(traceMagicPowder(1_000_000_000n, [{ need: 1n, stock: 1_000_000_000n }]).result).toBe(2_000_000_000n);
    expect(traceMagicPowder(1n, [{ need: 2n, stock: 11n }, { need: 1n, stock: 3n }, { need: 4n, stock: 16n }]).result).toBe(4n);
    expect(traceMagicPowder(3n, [{ need: 4n, stock: 11n }, { need: 3n, stock: 12n }, { need: 5n, stock: 14n }, { need: 6n, stock: 20n }]).result).toBe(3n);
    const early = checkMagicPowder(2_000_000_000n, 1n, [{ need: 1_000_000_000n, stock: 1n }, { need: 1n, stock: 1n }]);
    expect(early.feasible).toBe(false);
    expect(early.checks).toHaveLength(1);
  });
});
