import { describe, expect, it } from "vitest";

import "../../i18n/registerGraphTheoryResources.js";
import { i18n } from "../../i18n/i18n.js";
import { defineGuideTrace, runGuideTrace } from "../guideTrace.js";
import {
  buildAdjacencyPrimerScenarios,
  buildLabyrinthScenarios,
  buildRoomScenarios,
  buildRouteScenarios,
  buildScheduleScenarios,
  buildTeamScenarios
} from "./graphScenarios.js";

const t = i18n.getFixedT("en", "graphTheory");

describe("Graph Theory scenario builders", () => {
  const builders = [buildRoomScenarios, buildLabyrinthScenarios, buildTeamScenarios, buildScheduleScenarios, buildRouteScenarios] as const;

  it("returns three uniquely identified presets for every problem arc", () => {
    for (const build of builders) {
      const presets = build(t);
      expect(presets).toHaveLength(3);
      expect(new Set(presets.map((preset) => preset.id)).size).toBe(3);
    }
    expect(buildAdjacencyPrimerScenarios(t)).toHaveLength(1);
  });

  it("produces non-empty, structurally valid frames", () => {
    for (const build of [...builders, buildAdjacencyPrimerScenarios]) {
      for (const preset of build(t)) {
        expect(preset.frames.length).toBeGreaterThan(0);
        for (const frame of preset.frames) {
          expect(frame.narration.trim()).not.toBe("");
          expect(frame.visuals.length).toBeGreaterThan(0);
          const trace = defineGuideTrace({
            code: "frame",
            language: "text",
            label: preset.label,
            inputs: {},
            build: (_inputs, recorder) => recorder.frame({ line: 1, narration: frame.narration, visuals: frame.visuals })
          });
          expect(runGuideTrace(trace, {})).toMatchObject({ valid: true });
        }
      }
    }
  });

  it("ends the rooms sample on the locked answer", () => {
    expect(buildRoomScenarios(t)[0]!.frames.at(-1)!.narration).toContain("3");
  });

  it("does not invent a distance for an unreachable labyrinth", () => {
    const finalNarration = buildLabyrinthScenarios(t).find((preset) => preset.id === "unreachable")!.frames.at(-1)!.narration;
    expect(finalNarration).toBe(t("scenarios.narration.bfsUnreachable"));
  });

  it("explicitly narrates the stale priority-queue entry", () => {
    const staleWording = t("scenarios.narration.stale", { distance: 5, vertex: 2 });
    const preset = buildRouteScenarios(t).find((candidate) => candidate.id === "stale")!;
    expect(preset.frames.some((frame) => frame.narration === staleWording)).toBe(true);
  });
});
