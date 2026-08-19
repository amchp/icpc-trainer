import { describe, expect, it } from "vitest";

import { dynamicProgramming as en } from "./en/dynamicProgramming.js";
import { dynamicProgramming as es } from "./es/dynamicProgramming.js";

function shape(value: unknown): unknown {
  if (typeof value !== "object" || value === null) return typeof value;
  return Object.fromEntries(Object.entries(value).map(([key, child]) => [key, shape(child)]));
}

function values(value: unknown): readonly string[] {
  if (typeof value === "string") return [value];
  if (typeof value !== "object" || value === null) return [];
  return Object.values(value).flatMap(values);
}

describe("Dynamic Programming locale catalogs", () => {
  it("keeps English and Spanish structurally equal", () => expect(shape(es)).toEqual(shape(en)));

  it("locks the five selected topics in order", () => {
    expect(Object.keys(en.sections).slice(0, 5)).toEqual(["fibonacci", "nonAdjacent", "grid", "knapsack", "dag"]);
  });

  it("keeps complete source submissions out of learner-facing prose", () => {
    expect(values(en).join("\n")).not.toMatch(/#include|\bint\s+main\b/);
    expect(values(es).join("\n")).not.toMatch(/#include|\bint\s+main\b/);
    expect(values(en).join("\n")).not.toMatch(/C\+\+ walkthrough|Copy C\+\+/i);
    expect(values(es).join("\n")).not.toMatch(/recorrido (?:del código )?C\+\+|Copiar recorrido/i);
  });

  it("defines recursive DAG states from predecessors in both languages", () => {
    expect(en.dag.base).toMatch(/no predecessors/i);
    expect(en.dag.transition).toMatch(/previous.*→ node/i);
    expect(es.dag.base).toMatch(/no tiene predecesores/i);
    expect(es.dag.transition).toMatch(/anterior.*→ nodo/i);
  });

  it("builds the reusable DP tool progressively before the guided solutions", () => {
    expect([
      en.fibonacci.toolTitle,
      en.nonAdjacent.toolTitle,
      en.grid.toolTitle,
      en.knapsack.toolTitle,
      en.dag.toolTitle
    ]).toEqual([
      "DP starts by naming and remembering states",
      "A state can be an array index",
      "A state can need more than one coordinate",
      "A state stores only what the future still needs",
      "States are nodes; transitions are directed edges"
    ]);
    expect(en.challenge.toolStage).toBe("Reusable DP tool");
    expect(en.challenge.applicationStage).toBe("Guided solution · no code");
    expect(es.challenge.toolStage).toBe("Herramienta reutilizable de DP");
    expect(es.challenge.applicationStage).toBe("Solución guiada · sin código");
  });
});
