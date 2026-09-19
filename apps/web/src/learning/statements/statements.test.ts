import { describe, expect, it } from "vitest";

import { runGuideTrace } from "../guideTrace.js";
import type { StatementDefinition } from "../StatementPreview.js";
import { getAdvancedStatement, type AdvancedStatementId } from "./advancedStatements.js";
import { getCoreStatement, type CoreStatementId } from "./coreStatements.js";
import { getFoundationStatement, type FoundationStatementId } from "./foundationStatements.js";

const advanced: Record<AdvancedStatementId, true> = { rooms: true, labyrinth: true, teams: true, schedule: true, routes: true, fibonacci: true, nonAdjacent: true, grid: true, knapsack: true, dag: true, coins: true, fails: true, activities: true, twins: true, chat: true, alternating: true };
const core: Record<CoreStatementId, true> = { alice: true, kitchen: true, sakurako: true, sudoku: true, first: true, closest: true, numeric: true, bad: true, magic: true, search: true, duplicates: true, stock: true, zeros: true, power: true, capstone: true };
const foundation: Record<FoundationStatementId, true> = { numeric: true, vector: true, stack: true, queue: true, set: true, map: true, ranges: true, watermelon: true, plate: true, stones: true, chomp: true, sudoku: true, password: true, folders: true };

const cases: { id: string; get: (language: string) => StatementDefinition }[] = [
  ...Object.keys(advanced).map((id) => ({ id: `advanced/${id}`, get: (language: string) => getAdvancedStatement(language, id as AdvancedStatementId) })),
  ...Object.keys(core).map((id) => ({ id: `core/${id}`, get: (language: string) => getCoreStatement(language, id as CoreStatementId) })),
  ...Object.keys(foundation).map((id) => ({ id: `foundation/${id}`, get: (language: string) => getFoundationStatement(language, id as FoundationStatementId) }))
];

describe("learning statement catalog", () => {
  it.each(cases)("$id has readable contracts and valid visual frames in both languages", ({ get, id }) => {
    const english = get("en");
    const spanish = get("es");
    expect(spanish.frames.length).toBe(english.frames.length);
    for (const statement of [english, spanish]) {
      for (const key of ["description", "input", "output", "exampleInput", "exampleOutput"] as const) {
        expect(statement[key].trim(), key).not.toBe("");
      }
      if (id !== "core/alice" && id !== "core/kitchen") {
        expect(statement.illustration, `${id} illustration`).toBeDefined();
        const illustration = statement.illustration!;
        expect(illustration.presets).toHaveLength(2);
        for (const preset of illustration.presets) {
          const scenes = illustration.build(preset.input);
          expect(scenes.length).toBeGreaterThanOrEqual(2);
          expect(scenes.at(-1)!.result?.trim()).toBeTruthy();
          expect(scenes.every(frame => frame.narration.trim() && frame.scenes.length)).toBe(true);
        }
      }
      expect(statement.frames.length).toBeGreaterThanOrEqual(3);
      const trace = runGuideTrace({
        code: "// statement", language: "cpp", label: "Statement", inputs: {},
        build: (_, recorder) => statement.frames.forEach((frame) => recorder.frame({ ...frame, line: 1 }))
      }, {});
      expect(trace.valid, trace.valid ? undefined : trace.reason).toBe(true);
      for (const frame of statement.frames) {
        expect(frame.visuals.length).toBeGreaterThan(0);
        // Statement scenes must not borrow code execution or algorithm branch displays.
        expect(frame.visuals.some((visual) => visual.kind === "callStack" || visual.kind === "branch")).toBe(false);
      }
    }
    expect(spanish.description).not.toBe(english.description);
    expect(spanish.input).not.toBe(english.input);
    expect(spanish.output).not.toBe(english.output);
    english.frames.forEach((frame, index) => {
      expect(spanish.frames[index]!.narration).not.toBe(frame.narration);
    });
  });
});
