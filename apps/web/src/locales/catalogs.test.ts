import { describe, expect, it } from "vitest";

import { en } from "./en/index.js";
import { es } from "./es/index.js";

const flatten = (value: unknown, prefix = ""): Map<string, string> => {
  const result = new Map<string, string>();
  if (typeof value === "string") {
    result.set(prefix, value);
    return result;
  }
  if (typeof value !== "object" || value === null || Array.isArray(value)) {
    throw new Error(`Catalog value at ${prefix || "<root>"} must be a string or object.`);
  }
  for (const [key, child] of Object.entries(value)) {
    const childPrefix = prefix === "" ? key : `${prefix}.${key}`;
    for (const [path, text] of flatten(child, childPrefix)) result.set(path, text);
  }
  return result;
};

const interpolationParams = (value: string): string[] =>
  [...value.matchAll(/{{\s*([\w.]+)\s*}}/g)].map((match) => match[1] ?? "").sort();

describe("locale catalogs", () => {
  it("keeps English and Spanish namespaces, keys, values, and interpolation parameters in parity", () => {
    const english = flatten(en);
    const spanish = flatten(es);
    expect([...spanish.keys()].sort()).toEqual([...english.keys()].sort());

    for (const [key, englishValue] of english) {
      const spanishValue = spanish.get(key);
      expect(englishValue.trim(), `${key} has an empty English value`).not.toBe("");
      expect(spanishValue?.trim(), `${key} has an empty Spanish value`).not.toBe("");
      expect(interpolationParams(spanishValue ?? ""), `${key} interpolation differs`).toEqual(interpolationParams(englishValue));
    }
  });
});
