import { describe, expect, it } from "vitest";

import "../../i18n/registerGraphTheoryResources.js";
import { i18n } from "../../i18n/i18n.js";
import { getGuideTraceDefaultInputs, runGuideTrace } from "../guideTrace.js";
import { createGraphTheoryGuideTraces } from "./graphTraces.js";

describe("Graph Theory guide traces", () => {
  for (const language of ["en", "es"] as const) {
    it(`keeps all five ${language.toUpperCase()} traces executable and line-aligned`, () => {
      const traces = createGraphTheoryGuideTraces(i18n.getFixedT(language, "graphTheory"), language);
      expect(Object.keys(traces)).toEqual(["gridDfs", "gridBfs", "bipartiteDfs", "kahn", "dijkstra"]);
      for (const trace of Object.values(traces)) {
        const result = runGuideTrace(trace, getGuideTraceDefaultInputs(trace));
        expect(result, result.valid ? undefined : result.reason).toMatchObject({ valid: true });
        if (!result.valid) continue;
        expect(result.frames.length).toBeGreaterThan(8);
        const lineCount = trace.code.split("\n").length;
        expect(result.frames.every((frame) => frame.line >= 1 && frame.line <= lineCount)).toBe(true);
        expect(result.frames.at(-1)!.narration.trim()).not.toBe("");
      }
    });
  }

  it("shows nested colouring calls and keeps the general BFS trace on its compact snippet", () => {
    const traces = createGraphTheoryGuideTraces(i18n.getFixedT("en", "graphTheory"), "en");
    const colouring = runGuideTrace(traces.bipartiteDfs, {});
    const bfs = runGuideTrace(traces.gridBfs, {});
    expect(colouring.valid).toBe(true);
    expect(bfs.valid).toBe(true);
    if (!colouring.valid || !bfs.valid) return;
    const deepestStack = Math.max(...colouring.frames.flatMap((frame) => frame.visuals?.filter((visual) => visual.kind === "callStack").map((visual) => visual.frames.length) ?? []));
    expect(deepestStack).toBeGreaterThan(1);
    expect(bfs.frames.some((frame) => frame.line === 16)).toBe(true);
    expect(traces.gridBfs.code.split("\n")).toHaveLength(19);
    expect(traces.gridBfs.code).toContain("vector<vector<int>> adjacency");
  });

  it("does not reactivate a settled vertex for a stale Dijkstra entry", () => {
    const traces = createGraphTheoryGuideTraces(i18n.getFixedT("en", "graphTheory"), "en");
    const result = runGuideTrace(traces.dijkstra, {});
    expect(result.valid).toBe(true);
    if (!result.valid) return;
    const staleFrame = result.frames.find((frame) => frame.narration.includes("Discard stale entry"));
    const graph = staleFrame?.visuals?.find((visual) => visual.kind === "graph");
    expect(graph?.kind).toBe("graph");
    if (graph?.kind !== "graph") return;
    expect(graph.nodes.find((node) => node.id === "2")?.tone).toBe("settled");
  });
});
