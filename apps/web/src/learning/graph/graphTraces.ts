import "../../i18n/registerGraphTheoryResources.js";

import type { TFunction } from "i18next";
import { useMemo } from "react";
import { useTranslation } from "react-i18next";
import { defineGuideTrace, type GuideTraceVisual } from "../guideTrace.js";
import { getGraphTheorySnippets } from "../snippets/graphTheorySnippets.js";
import { buildAdjacencyList, dijkstra, kahnTopologicalOrder, twoColour } from "./graphModels.js";
import {
  ROUTES_STALE,
  ROUTES_STALE_LAYOUT,
  SCHEDULE_SAMPLE,
  SCHEDULE_SAMPLE_LAYOUT,
  TEAMS_SAMPLE,
  TEAMS_SAMPLE_LAYOUT,
  type NodeLayout
} from "./graphScenarios.js";

type GraphTheoryT = TFunction<"graphTheory">;

export function useGraphTheoryGuideTraces() {
  const { t, i18n } = useTranslation("graphTheory");
  const language = i18n.resolvedLanguage ?? i18n.language;
  return useMemo(() => createGraphTheoryGuideTraces(t, language), [language, t]);
}

export function createGraphTheoryGuideTraces(t: GraphTheoryT, language = "en") {
  const snippets = getGraphTheorySnippets(language);
  const gridDfs = defineGuideTrace({
    code: snippets.gridDfs,
    language: "cpp",
    label: t("traces.labels.gridDfs"),
    inputs: {},
    intervalMs: 700,
    build: (_inputs, recorder) => {
      const adjacency = buildAdjacencyList(TEAMS_SAMPLE.n, TEAMS_SAMPLE.edges, false);
      const visited = new Set<number>();
      const stack: number[] = [];
      const treeEdges = new Set<string>();
      const visual = (active?: number, nextTarget?: number): readonly GuideTraceVisual[] => [
        traceGraph(TEAMS_SAMPLE.n, TEAMS_SAMPLE.edges, TEAMS_SAMPLE_LAYOUT, false, t("traces.visuals.graph"),
          (vertex) => vertex === nextTarget || (nextTarget === undefined && vertex === active) ? "active" : visited.has(vertex) ? "settled" : "idle",
          ([from, to]) => active !== undefined && nextTarget !== undefined && ((from === active && to === nextTarget) || (to === active && from === nextTarget))
            ? "active"
            : treeEdges.has(undirectedKey(from, to)) ? "tree" : "idle"),
        vertexStackVisual(t("traces.visuals.stack"), stack, snippets.names.dfsFunction)
      ];
      const dfs = (vertex: number): void => {
        stack.push(vertex);
        recorder.frame({ line: 4, narration: t("traces.execution.enter"), variables: [{ name: "vertex", value: vertex }], visuals: visual(vertex) });
        visited.add(vertex);
        recorder.frame({ line: 5, narration: t("traces.execution.colour", { vertex }), visuals: visual(vertex) });
        for (const next of adjacency[vertex]!) {
          recorder.frame({ line: 6, narration: t("traces.execution.neighbour", { value: next }), variables: [{ name: "vertex", value: vertex }, { name: "next", value: next }], visuals: visual(vertex, next) });
          recorder.frame({ line: 7, narration: t("traces.execution.visited", { result: String(visited.has(next)) }), visuals: visual(vertex, next) });
          if (!visited.has(next)) {
            treeEdges.add(undirectedKey(vertex, next));
            recorder.frame({ line: 7, narration: t("traces.execution.recurse", { value: next }), visuals: visual(vertex, next) });
            dfs(next);
          }
        }
        recorder.frame({ line: 8, narration: t("traces.execution.return"), visuals: visual(vertex) });
        stack.pop();
      };
      recorder.frame({ line: 1, narration: t("traces.execution.initialize"), visuals: visual() });
      recorder.frame({ line: 2, narration: t("traces.execution.initialize"), visuals: visual() });
      dfs(1);
      recorder.frame({ line: 9, narration: t("traces.execution.finished"), visuals: visual() });
    }
  });

  const gridBfsTrace = defineGuideTrace({
    code: snippets.gridBfs,
    language: "cpp",
    label: t("traces.labels.gridBfs"),
    inputs: {},
    intervalMs: 700,
    build: (_inputs, recorder) => {
      const edges = [[1, 2], [1, 3], [2, 4], [3, 4], [4, 5]] as const;
      const adjacency = buildAdjacencyList(5, edges, false);
      const queue: number[] = [];
      const settled = new Set<number>();
      const distances = Array.from({ length: 6 }, () => -1);
      const parents = Array.from({ length: 6 }, () => -1);
      const visuals = (active?: number, nextTarget?: number): readonly GuideTraceVisual[] => [
        traceGraph(5, edges, TEAMS_SAMPLE_LAYOUT, false, t("traces.visuals.graph"),
          (vertex) => vertex === nextTarget || (nextTarget === undefined && vertex === active) ? "active" : settled.has(vertex) ? "settled" : queue.includes(vertex) ? "queued" : "idle",
          ([from, to]) => active !== undefined && nextTarget !== undefined && ((from === active && to === nextTarget) || (to === active && from === nextTarget))
            ? "active"
            : parents[to] === from || parents[from] === to ? "tree" : "idle",
          (vertex) => distances[vertex] === -1 ? "∞" : String(distances[vertex]),
          (vertex) => vertex === 1 ? "above" : "below"),
        { kind: "collection", label: t("traces.visuals.queue"), layout: "queue", values: queue },
        { kind: "entries", label: t("traces.visuals.parent"), entries: parents.slice(1).map((parent, index) => ({ key: index + 1, value: parent === -1 ? "—" : parent })), ...(nextTarget === undefined ? {} : { activeIndex: nextTarget - 1 }) }
      ];
      recorder.frame({ line: 1, narration: t("traces.execution.initialize"), visuals: visuals() });
      recorder.frame({ line: 2, narration: t("traces.execution.initialize"), visuals: visuals() });
      recorder.frame({ line: 4, narration: t("traces.execution.enter"), variables: [{ name: "source", value: 1 }], visuals: visuals(1) });
      recorder.frame({ line: 5, narration: t("traces.execution.initialize"), visuals: visuals(1) });
      recorder.frame({ line: 6, narration: t("traces.execution.initialize"), visuals: visuals(1) });
      recorder.frame({ line: 7, narration: t("traces.execution.initialize"), visuals: visuals(1) });
      distances[1] = 0;
      recorder.frame({ line: 8, narration: t("traces.execution.distance", { distance: 0 }), visuals: visuals(1) });
      queue.push(1);
      recorder.frame({ line: 9, narration: t("traces.execution.enqueue"), visuals: visuals(1) });
      while (queue.length > 0) {
        recorder.frame({ line: 10, narration: t("traces.execution.loop"), visuals: visuals() });
        const vertex = queue.shift()!;
        settled.add(vertex);
        recorder.frame({ line: 11, narration: t("traces.execution.pop", { vertex, distance: distances[vertex]! }), visuals: visuals(vertex) });
        for (const next of adjacency[vertex]!) {
          recorder.frame({ line: 12, narration: t("traces.execution.neighbour", { value: next }), variables: [{ name: "vertex", value: vertex }, { name: "next", value: next }], visuals: visuals(vertex, next) });
          recorder.frame({ line: 13, narration: t("traces.execution.visited", { result: String(distances[next] !== -1) }), visuals: visuals(vertex, next) });
          if (distances[next] !== -1) continue;
          distances[next] = distances[vertex]! + 1;
          recorder.frame({ line: 14, narration: t("traces.execution.distance", { distance: distances[next]! }), visuals: visuals(vertex, next) });
          parents[next] = vertex;
          recorder.frame({ line: 15, narration: t("traces.execution.parent", { value: vertex }), visuals: visuals(vertex, next) });
          queue.push(next);
          recorder.frame({ line: 16, narration: t("traces.execution.enqueue"), visuals: visuals(vertex, next) });
        }
      }
      recorder.frame({ line: 19, narration: t("traces.execution.finished"), visuals: visuals() });
    }
  });

  const bipartiteDfs = defineGuideTrace({
    code: snippets.bipartiteDfs,
    language: "cpp",
    label: t("traces.labels.bipartiteDfs"),
    inputs: {},
    intervalMs: 700,
    build: (_inputs, recorder) => {
      const result = twoColour(TEAMS_SAMPLE.n, TEAMS_SAMPLE.edges);
      const adjacency = buildAdjacencyList(TEAMS_SAMPLE.n, TEAMS_SAMPLE.edges, false);
      const shown = new Set<number>();
      const stack: number[] = [];
      const visuals = (active?: number): readonly GuideTraceVisual[] => [
        traceGraph(TEAMS_SAMPLE.n, TEAMS_SAMPLE.edges, TEAMS_SAMPLE_LAYOUT, false, t("traces.visuals.graph"), (vertex) => vertex === active ? "active" : !shown.has(vertex) ? "idle" : result.colours[vertex] === 1 ? "colorA" : "colorB", ([from, to]) => shown.has(from) && shown.has(to) ? "tree" : "idle"),
        { kind: "entries", label: t("traces.visuals.adjacency"), entries: adjacency.slice(1).map((values, index) => ({ key: index + 1, value: values.join(", ") || "∅" })) },
        { kind: "callStack", label: t("traces.visuals.stack"), frames: stack.map((vertex) => ({ label: `${snippets.names.colourFunction}(${vertex})`, detail: String(result.colours[vertex]) })), ...(stack.length === 0 ? {} : { activeIndex: stack.length - 1 }) }
      ];
      recorder.frame({ line: 1, narration: t("traces.execution.initialize"), visuals: visuals() });
      recorder.frame({ line: 2, narration: t("traces.execution.initialize"), visuals: visuals() });
      const dfs = (vertex: number): void => {
        stack.push(vertex);
        recorder.frame({ line: 4, narration: t("traces.execution.initialize"), variables: [{ name: "vertex", value: vertex }, { name: "value", value: result.colours[vertex]! }], visuals: visuals(vertex) });
        shown.add(vertex);
        recorder.frame({ line: 5, narration: t("traces.execution.colour", { vertex }), visuals: visuals(vertex) });
        for (const next of adjacency[vertex]!) {
          recorder.frame({ line: 6, narration: t("traces.execution.inspect"), visuals: visuals(vertex) });
          recorder.frame({ line: 7, narration: t("traces.execution.visited", { result: String(shown.has(next)) }), visuals: visuals(vertex) });
          if (!shown.has(next)) {
            recorder.frame({ line: 8, narration: t("traces.execution.recurse", { value: next }), visuals: visuals(vertex) });
            dfs(next);
          } else {
            recorder.frame({ line: 9, narration: result.colours[next] === result.colours[vertex] ? t("traces.execution.conflict", { from: vertex, to: next }) : t("traces.execution.inspect"), visuals: visuals(vertex) });
          }
        }
        recorder.frame({ line: 13, narration: t("traces.execution.return"), visuals: visuals(vertex) });
        stack.pop();
      };
      for (let vertex = 1; vertex <= TEAMS_SAMPLE.n; vertex += 1) {
        if (!shown.has(vertex)) dfs(vertex);
      }
      recorder.frame({ line: 14, narration: t("traces.execution.finished"), visuals: visuals() });
    }
  });

  const kahn = defineGuideTrace({
    code: snippets.kahn,
    language: "cpp",
    label: t("traces.labels.kahn"),
    inputs: {},
    intervalMs: 700,
    build: (_inputs, recorder) => {
      const result = kahnTopologicalOrder(SCHEDULE_SAMPLE.n, SCHEDULE_SAMPLE.edges);
      const adjacency = buildAdjacencyList(SCHEDULE_SAMPLE.n, SCHEDULE_SAMPLE.edges, true);
      const indegrees = [...result.indegrees];
      const queue: number[] = [];
      const order: number[] = [];
      const visuals = (active?: number): readonly GuideTraceVisual[] => [
        traceGraph(SCHEDULE_SAMPLE.n, SCHEDULE_SAMPLE.edges, SCHEDULE_SAMPLE_LAYOUT, true, t("traces.visuals.graph"), (vertex) => vertex === active ? "active" : order.includes(vertex) ? "settled" : queue.includes(vertex) ? "queued" : "idle", () => "idle", (vertex) => String(indegrees[vertex])),
        { kind: "collection", label: t("traces.visuals.queue"), layout: "queue", values: queue },
        { kind: "output", label: t("traces.visuals.order"), lines: order.map(String) }
      ];
      recorder.frame({ line: 2, narration: t("traces.execution.initialize"), visuals: visuals() });
      recorder.frame({ line: 3, narration: t("traces.execution.indegree"), visuals: visuals() });
      recorder.frame({ line: 4, narration: t("traces.execution.indegree"), visuals: visuals() });
      recorder.frame({ line: 5, narration: t("traces.execution.initialize"), visuals: visuals() });
      for (let vertex = 1; vertex <= SCHEDULE_SAMPLE.n; vertex += 1) {
        recorder.frame({ line: 6, narration: t("traces.execution.indegree"), visuals: visuals() });
        if (indegrees[vertex] === 0) {
          queue.push(vertex);
          recorder.frame({ line: 7, narration: t("traces.execution.enqueue"), visuals: visuals() });
        }
      }
      recorder.frame({ line: 8, narration: t("traces.execution.initialize"), visuals: visuals() });
      while (queue.length > 0) {
        recorder.frame({ line: 9, narration: t("traces.execution.loop"), visuals: visuals() });
        const vertex = queue.shift()!;
        recorder.frame({ line: 10, narration: t("traces.execution.front", { value: vertex }), visuals: visuals(vertex) });
        recorder.frame({ line: 11, narration: t("traces.execution.dequeue"), visuals: visuals(vertex) });
        order.push(vertex);
        recorder.frame({ line: 12, narration: t("traces.execution.emit", { vertex }), visuals: visuals(vertex) });
        for (const next of adjacency[vertex]!) {
          recorder.frame({ line: 13, narration: t("traces.execution.inspect"), visuals: visuals(vertex) });
          indegrees[next]! -= 1;
          recorder.frame({ line: 14, narration: t("traces.execution.decrement", { from: vertex, to: next, indegree: indegrees[next]!, vertex: next }), visuals: visuals(vertex) });
          if (indegrees[next] === 0) {
            queue.push(next);
            recorder.frame({ line: 15, narration: t("traces.execution.indegree"), visuals: visuals(vertex) });
            recorder.frame({ line: 15, narration: t("traces.execution.enqueue"), visuals: visuals(vertex) });
          }
        }
      }
      recorder.frame({ line: 20, narration: t("traces.execution.finished"), visuals: visuals() });
    }
  });

  const dijkstraTrace = defineGuideTrace({
    code: snippets.dijkstra,
    language: "cpp",
    label: t("traces.labels.dijkstra"),
    inputs: {},
    intervalMs: 800,
    build: (_inputs, recorder) => {
      const result = dijkstra(ROUTES_STALE.n, ROUTES_STALE.edges, 1);
      const distances: (number | null)[] = Array.from({ length: ROUTES_STALE.n + 1 }, () => null);
      const queue: string[] = [];
      const settled = new Set<number>();
      let active: number | undefined;
      let activeEdge: readonly [number, number] | undefined;
      let activeEdgeTone: "active" | "tree" | "rejected" = "active";
      const visuals = (): readonly GuideTraceVisual[] => [
        traceGraph(ROUTES_STALE.n, ROUTES_STALE.edges, ROUTES_STALE_LAYOUT, true, t("traces.visuals.graph"), (vertex) => vertex === active ? "active" : settled.has(vertex) ? "settled" : queue.some((entry) => entry.endsWith(`:${vertex}`)) ? "queued" : "idle", ([from, to]) => activeEdge?.[0] === from && activeEdge[1] === to ? activeEdgeTone : "idle", (vertex) => distances[vertex] === null ? "∞" : String(distances[vertex])),
        { kind: "entries", label: t("traces.visuals.distance"), entries: distances.slice(1).map((distance, index) => ({ key: index + 1, value: distance ?? "∞" })), ...(active === undefined ? {} : { activeIndex: active - 1 }) },
        { kind: "collection", label: t("traces.visuals.priorityQueue"), layout: "queue", values: queue, ...(queue.length === 0 ? {} : { activeIndex: 0 }) }
      ];
      recorder.frame({ line: 1, narration: t("traces.execution.initialize"), visuals: visuals() });
      recorder.frame({ line: 4, narration: t("traces.execution.initialize"), visuals: visuals() });
      recorder.frame({ line: 5, narration: t("traces.execution.initialize"), visuals: visuals() });
      for (const step of result.steps) {
        activeEdge = step.via === undefined ? undefined : [step.via, step.vertex];
        activeEdgeTone = step.kind === "relax" ? "tree" : step.kind === "reject" ? "rejected" : "active";
        if (step.kind === "push") {
          if (step.via === undefined) {
            distances[step.vertex] = step.distance;
            recorder.frame({ line: 6, narration: t("traces.execution.distance", { distance: step.distance }), visuals: visuals() });
          }
          queue.push(`${step.distance}:${step.vertex}`);
          queue.sort((left, right) => Number(left.split(":")[0]) - Number(right.split(":")[0]) || Number(left.split(":")[1]) - Number(right.split(":")[1]));
          recorder.frame({ line: step.via === undefined ? 6 : 14, narration: t("traces.execution.push", { vertex: step.vertex, distance: step.distance }), visuals: visuals() });
        } else if (step.kind === "pop") {
          active = distances[step.vertex] === step.distance ? step.vertex : undefined;
          const entry = `${step.distance}:${step.vertex}`;
          recorder.frame({ line: 8, narration: t("traces.execution.pop", { vertex: step.vertex, distance: step.distance }), visuals: visuals() });
          const index = queue.indexOf(entry);
          if (index >= 0) queue.splice(index, 1);
          recorder.frame({ line: 8, narration: t("traces.execution.dequeue"), visuals: visuals() });
          if (distances[step.vertex] === step.distance) settled.add(step.vertex);
        } else if (step.kind === "stale") {
          recorder.frame({ line: 9, narration: t("traces.execution.stale", { vertex: step.vertex, distance: step.distance }), visuals: visuals() });
        } else if (step.kind === "relax") {
          recorder.frame({ line: 10, narration: t("traces.execution.inspect"), visuals: visuals() });
          recorder.frame({ line: 11, narration: t("traces.execution.candidate", { distance: step.distance }), visuals: visuals() });
          recorder.frame({ line: 12, narration: t("traces.execution.relax", { to: step.vertex, distance: step.distance }), visuals: visuals() });
          distances[step.vertex] = step.distance;
          recorder.frame({ line: 13, narration: t("traces.execution.distance", { distance: step.distance }), visuals: visuals() });
        } else {
          recorder.frame({ line: 10, narration: t("traces.execution.inspect"), visuals: visuals() });
          recorder.frame({ line: 11, narration: t("traces.execution.candidate", { distance: step.distance }), visuals: visuals() });
          recorder.frame({ line: 12, narration: t("traces.execution.reject", { to: step.vertex, distance: step.distance }), visuals: visuals() });
        }
      }
      recorder.frame({ line: 17, narration: t("traces.execution.finished"), visuals: visuals() });
    }
  });

  return { gridDfs, gridBfs: gridBfsTrace, bipartiteDfs, kahn, dijkstra: dijkstraTrace };
}

function undirectedKey(from: number, to: number): string {
  return from < to ? `${from}-${to}` : `${to}-${from}`;
}

function vertexStackVisual(label: string, stack: readonly number[], functionName: string): GuideTraceVisual {
  return { kind: "callStack", label, frames: stack.map((vertex) => ({ label: `${functionName}(${vertex})`, detail: `vertex=${vertex}` })), ...(stack.length === 0 ? {} : { activeIndex: stack.length - 1 }) };
}

function traceGraph(
  count: number,
  edges: readonly (readonly [number, number] | readonly [number, number, number])[],
  layout: NodeLayout,
  directed: boolean,
  label: string,
  nodeTone: (vertex: number) => Extract<GuideTraceVisual, { kind: "graph" }>["nodes"][number]["tone"],
  edgeTone: (edge: readonly [number, number] | readonly [number, number, number]) => Extract<GuideTraceVisual, { kind: "graph" }>["edges"][number]["tone"],
  badge?: (vertex: number) => string,
  badgePlacement?: (vertex: number) => "above" | "below"
): GuideTraceVisual {
  return {
    kind: "graph", directed, label,
    nodes: Array.from({ length: count }, (_, index) => { const vertex = index + 1; return { id: String(vertex), label: String(vertex), ...layout[String(vertex)]!, tone: nodeTone(vertex), ...(badge === undefined ? {} : { badge: badge(vertex) }), ...(badgePlacement === undefined ? {} : { badgePlacement: badgePlacement(vertex) }) }; }),
    edges: edges.map((edge) => ({ from: String(edge[0]), to: String(edge[1]), ...(edge.length === 3 ? { weight: edge[2] } : {}), tone: edgeTone(edge) }))
  };
}
