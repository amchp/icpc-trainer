import { describe, expect, it } from "vitest";

import {
  BIG_O_LABELS,
  CURRENT_UNIVERSE_AGE_SECONDS,
  formatBytes,
  formatDuration,
  log10OperationCount,
  memoryModelEstimate,
  memoryEstimate,
  meterWidthPercent,
  operationEstimate,
  runtimeLog10Seconds
} from "./complexityMath.js";

describe("complexity math", () => {
  it("matches exact and reference one-second thresholds", () => {
    expect(10 ** log10OperationCount("quadratic", 10_000)).toBeCloseTo(1e8);
    expect(10 ** log10OperationCount("cubic", 500)).toBeCloseTo(125_000_000);
    expect(2 ** 26).toBeLessThan(1e8);
    expect(2 ** 27).toBeGreaterThan(1e8);
    expect(11 * 10 * 9 * 8 * 7 * 6 * 5 * 4 * 3 * 2).toBeLessThan(1e8);
    expect(12 * 11 * 10 * 9 * 8 * 7 * 6 * 5 * 4 * 3 * 2).toBeGreaterThan(1e8);
  });

  it("keeps huge families finite in logarithmic space and caps only the visual value", () => {
    const estimate = operationEstimate("factorial", 100_000_000);
    expect(estimate.log10).toBeGreaterThan(1e8);
    expect(estimate.visualValue).toBe(1e18);
    expect(estimate.exceedsVisualCap).toBe(true);
    expect(meterWidthPercent(estimate.log10)).toBe(100);
  });

  it("estimates one second for n squared at n 10,000 and scales with c", () => {
    const base = runtimeLog10Seconds("quadratic", 10_000, 1, 1e8);
    const largerConstant = runtimeLog10Seconds("quadratic", 10_000, 8, 1e8);
    expect(10 ** base).toBeCloseTo(1);
    expect(10 ** largerConstant).toBeCloseTo(8);
    expect(BIG_O_LABELS.quadratic).toBe("O(n²)");
  });

  it("formats duration and memory with explicit units and fit state", () => {
    expect(formatDuration(0, "en", "older than universe")).toBe("1 s");
    expect(formatDuration(Math.log10(CURRENT_UNIVERSE_AGE_SECONDS) + 1, "en", "older than universe")).toBe("older than universe");
    expect(memoryEstimate(10_000, 8, 1)?.fits).toBe(true);
    expect(memoryEstimate(1_000_000, 8, 1)?.fits).toBe(false);
    expect(formatBytes(1024, "en")).toContain("KiB");
  });

  it("separates input, auxiliary, and total memory for each algorithm model", () => {
    const pair = memoryModelEstimate("pair", 1_000_000, 8, 256);
    const sort = memoryModelEstimate("sort", 1_000_000, 8, 256);
    const hash = memoryModelEstimate("hash", 1_000_000, 32, 256);

    expect(pair).toMatchObject({ inputBytes: 8_000_000, auxiliaryBytes: 8, totalBytes: 8_000_008, fits: true });
    expect(sort).toMatchObject({ inputBytes: 8_000_000, auxiliaryBytes: 8_000_000, totalBytes: 16_000_000, fits: true });
    expect(hash).toMatchObject({ inputBytes: 8_000_000, auxiliaryBytes: 32_000_000, totalBytes: 40_000_000, fits: true });
    expect(memoryModelEstimate("sort", 100_000_000, 8, 256)?.fits).toBe(false);
  });
});
