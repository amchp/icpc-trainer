import { describe, expect, it } from "vitest";

import { binarySearch as en } from "./en/binarySearch.js";
import { binarySearch as es } from "./es/binarySearch.js";

function keyShape(value: unknown): unknown {
  if (Array.isArray(value)) return value.map(keyShape);
  if (typeof value !== "object" || value === null) return typeof value;
  return Object.fromEntries(Object.entries(value).map(([key, child]) => [key, keyShape(child)]));
}

describe("Binary Search locale catalogs", () => {
  it("keeps English and Spanish structurally equal", () => {
    expect(keyShape(es)).toEqual(keyShape(en));
  });

  it("uses problem-specific conditions and correct answer pointers in its code", () => {
    expect(en.tool.codeFirstOccurrence).toContain("values[mid] >= target");
    expect(en.tool.codeClosestLast).toContain("return left;");
    expect(en.tool.codeNumeric).toContain("double mid");
    expect(en.tool.codeNumeric).toContain("while (right - left > 1e-3)");
    expect(en.tool.codeNumeric).not.toContain("int mid");
    expect(en.tool.codeBad).toContain("return right;");
    expect(en.tool.codeMagic).toContain("canMake(mid)");
    expect(es.tool.codeClosestLast).toContain("int left = -1;");
  });
});
