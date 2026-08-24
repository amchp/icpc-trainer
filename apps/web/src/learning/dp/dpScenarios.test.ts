import i18next from "i18next";
import { describe, expect, it } from "vitest";

import { dynamicProgramming } from "../../locales/en/dynamicProgramming.js";
import {
  buildDagScenarios,
  buildFibonacciScenarios,
  buildGridScenarios,
  buildKnapsackScenarios,
  buildNonAdjacentScenarios
} from "./dpScenarios.js";

const instance = i18next.createInstance();
await instance.init({ lng: "en", resources: { en: { dynamicProgramming } } });
const t = instance.getFixedT("en", "dynamicProgramming");

describe("dynamic-programming scenarios", () => {
  it.each([
    ["fibonacci", buildFibonacciScenarios, "13"],
    ["non-adjacent", buildNonAdjacentScenarios, "13"],
    ["grid", buildGridScenarios, "2"],
    ["knapsack", buildKnapsackScenarios, "10"],
    ["dag", buildDagScenarios, "3"]
  ] as const)("builds two complete %s animations", (_name, build, finalAnswer) => {
    const scenarios = build(t);
    expect(scenarios).toHaveLength(2);
    for (const scenario of scenarios) {
      expect(scenario.frames.length).toBeGreaterThan(2);
      expect(scenario.frames.some((frame) => frame.visuals.some((visual) => visual.kind === "callStack"))).toBe(true);
      expect(scenario.frames.some((frame) => /already remembered/i.test(frame.narration))).toBe(true);
      expect(scenario.frames.at(-1)?.visuals.some((visual) =>
        visual.kind === "output" && visual.lines.includes(finalAnswer)
      ) || scenario.id.endsWith("-b")).toBe(true);
    }
  });

  it("visualizes recursive memoization without coupling frames to source code", () => {
    for (const build of [buildFibonacciScenarios, buildNonAdjacentScenarios, buildGridScenarios, buildKnapsackScenarios, buildDagScenarios]) {
      const frames = build(t)[0]!.frames;
      expect(frames.some((frame) => frame.visuals.some((visual) => visual.kind === "callStack"))).toBe(true);
      expect(frames.some((frame) => frame.visuals.some((visual) => visual.label === "Memoized states"))).toBe(true);
      expect(frames.map((frame) => frame.narration).join("\n")).toMatch(/Remember|remembered/);
    }
  });

  it("includes a DAG preset whose global optimum starts after node 1 and ends before node n", () => {
    const first = buildDagScenarios(t)[0];
    expect(first?.description).toMatch(/node 2.*node 5/i);
    expect(first?.frames.at(-1)?.visuals).toContainEqual(expect.objectContaining({ kind: "output", lines: ["3"] }));
  });
});
