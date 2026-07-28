import { describe, expect, it } from "vitest";

import { bruteForce as en } from "./en/bruteForce.js";
import { bruteForce as es } from "./es/bruteForce.js";

describe("Brute Force locale catalogs", () => {
  it("keeps every key and interpolation parameter in English and Spanish", () => {
    const english = flatten(en);
    const spanish = flatten(es);
    expect([...english.keys()].sort()).toEqual([...spanish.keys()].sort());
    for (const [key, value] of english) {
      expect(parameters(spanish.get(key) ?? ""), key).toEqual(parameters(value));
    }
  });
});

function flatten(value: unknown, prefix = "", result = new Map<string, string>()): Map<string, string> {
  if (typeof value === "string") {
    result.set(prefix, value);
    return result;
  }
  for (const [key, child] of Object.entries(value as Record<string, unknown>)) {
    flatten(child, prefix === "" ? key : `${prefix}.${key}`, result);
  }
  return result;
}

function parameters(value: string): string[] {
  return [...value.matchAll(/{{\s*([^},\s]+)[^}]*}}/g)].map((match) => match[1]!).sort();
}
