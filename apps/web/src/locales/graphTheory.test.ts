import { describe, expect, it } from "vitest";

import { graphTheory as en } from "./en/graphTheory.js";
import { graphTheory as es } from "./es/graphTheory.js";

function keyShape(value: unknown): unknown {
  if (Array.isArray(value)) return value.map(keyShape);
  if (typeof value !== "object" || value === null) return typeof value;
  return Object.fromEntries(Object.entries(value).map(([key, child]) => [key, keyShape(child)]));
}

function catalogValues(value: unknown): readonly string[] {
  if (typeof value === "string") return [value];
  if (typeof value !== "object" || value === null) return [];
  return Object.values(value).flatMap(catalogValues);
}

describe("Graph Theory locale catalogs", () => {
  it("keeps English and Spanish structurally equal", () => {
    expect(keyShape(es)).toEqual(keyShape(en));
  });

  it("corrects shortest-path guidance in both languages", () => {
    expect(en.routes.correction).toMatch(/BFS.*Dijkstra.*Bellman–Ford/);
    expect(es.routes.correction).toMatch(/BFS.*Dijkstra.*Bellman–Ford/);
  });

  it("contains no complete-submission entry point", () => {
    expect(catalogValues(en).join("\n")).not.toMatch(/\bint\s+main\b/);
    expect(catalogValues(es).join("\n")).not.toMatch(/\bint\s+main\b/);
  });
});
