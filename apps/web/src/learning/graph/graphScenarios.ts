import type { TFunction } from "i18next";

import type { GuideTraceGraphEdgeTone, GuideTraceGraphNodeTone, GuideTraceVisual } from "../guideTrace.js";
import type { ScenarioPreset } from "../ScenarioPlayer.js";
import {
  buildAdjacencyList,
  countRooms,
  dijkstra,
  gridBfs,
  kahnTopologicalOrder,
  NEIGHBOUR_ORDER,
  twoColour,
  type Cell
} from "./graphModels.js";

export type GraphTheoryT = TFunction<"graphTheory">;
export type NodeLayout = Readonly<Record<string, { readonly x: number; readonly y: number }>>;

export const ROOMS_SAMPLE = ["########", "#..#...#", "####.#.#", "#..#...#", "########"] as const;
export const ROOMS_DIAGONAL = ["####", "#.##", "##.#", "####"] as const;
export const ROOMS_WINDING = ["#######", "#.....#", "#####.#", "#.....#", "#######"] as const;
export const ROOMS_TRACE_GRID = ["#####", "#.#.#", "#..##", "#####"] as const;

export const LABYRINTH_SAMPLE = ["########", "#.A#...#", "#.##.#B#", "#......#", "########"] as const;
export const LABYRINTH_UNREACHABLE = ["#####", "#A#B#", "#####"] as const;
export const LABYRINTH_MULTIPATH = ["#####", "#A..#", "#...#", "#..B#", "#####"] as const;

export const TEAMS_SAMPLE = { n: 5, edges: [[1, 2], [1, 3], [4, 5]] } as const;
export const TEAMS_ODD_CYCLE = { n: 3, edges: [[1, 2], [2, 3], [3, 1]] } as const;
export const TEAMS_EVEN_CYCLE = { n: 5, edges: [[1, 2], [2, 3], [3, 4], [4, 1]] } as const;
export const TEAMS_SAMPLE_LAYOUT: NodeLayout = {
  "1": { x: 27, y: 30 }, "2": { x: 12, y: 66 }, "3": { x: 42, y: 66 },
  "4": { x: 68, y: 30 }, "5": { x: 84, y: 66 }
};
export const TEAMS_ODD_CYCLE_LAYOUT: NodeLayout = {
  "1": { x: 50, y: 14 }, "2": { x: 18, y: 76 }, "3": { x: 82, y: 76 }
};
export const TEAMS_EVEN_CYCLE_LAYOUT: NodeLayout = {
  "1": { x: 22, y: 22 }, "2": { x: 22, y: 76 }, "3": { x: 68, y: 76 },
  "4": { x: 68, y: 22 }, "5": { x: 88, y: 49 }
};

export const SCHEDULE_SAMPLE = { n: 5, edges: [[1, 2], [3, 1], [4, 5]] } as const;
export const SCHEDULE_MULTIPLE = { n: 4, edges: [[1, 3], [2, 3], [3, 4]] } as const;
export const SCHEDULE_CYCLE = { n: 3, edges: [[1, 2], [2, 3], [3, 1]] } as const;
export const SCHEDULE_SAMPLE_LAYOUT: NodeLayout = {
  "1": { x: 38, y: 48 }, "2": { x: 68, y: 48 }, "3": { x: 12, y: 48 },
  "4": { x: 38, y: 82 }, "5": { x: 68, y: 82 }
};
export const SCHEDULE_MULTIPLE_LAYOUT: NodeLayout = {
  "1": { x: 18, y: 18 }, "2": { x: 82, y: 18 }, "3": { x: 50, y: 50 }, "4": { x: 50, y: 84 }
};
export const SCHEDULE_CYCLE_LAYOUT: NodeLayout = {
  "1": { x: 50, y: 14 }, "2": { x: 18, y: 76 }, "3": { x: 82, y: 76 }
};

export const ROUTES_SAMPLE = { n: 3, edges: [[1, 2, 6], [1, 3, 2], [3, 2, 3], [1, 3, 4]] } as const;
export const ROUTES_DETOUR = { n: 3, edges: [[1, 2, 10], [1, 3, 1], [3, 2, 2]] } as const;
export const ROUTES_STALE = { n: 4, edges: [[1, 2, 5], [1, 3, 1], [3, 2, 1], [2, 4, 1]] } as const;
export const ROUTES_SAMPLE_LAYOUT: NodeLayout = {
  "1": { x: 16, y: 50 }, "2": { x: 84, y: 50 }, "3": { x: 50, y: 82 }
};
export const ROUTES_DETOUR_LAYOUT: NodeLayout = {
  "1": { x: 16, y: 50 }, "2": { x: 84, y: 50 }, "3": { x: 50, y: 82 }
};
export const ROUTES_STALE_LAYOUT: NodeLayout = {
  "1": { x: 14, y: 34 }, "2": { x: 60, y: 34 }, "3": { x: 36, y: 76 }, "4": { x: 86, y: 66 }
};

export function splitLabyrinthGrid(grid: readonly string[]): { readonly grid: readonly string[]; readonly start: Cell; readonly end: Cell } {
  let start: Cell | undefined;
  let end: Cell | undefined;
  const plain = grid.map((line, row) => [...line].map((value, column) => {
    if (value === "A") {
      if (start !== undefined) throw new Error("Labyrinth must contain exactly one start.");
      start = { row, column };
      return ".";
    }
    if (value === "B") {
      if (end !== undefined) throw new Error("Labyrinth must contain exactly one end.");
      end = { row, column };
      return ".";
    }
    if (value !== "." && value !== "#") throw new Error(`Labyrinth contains invalid character ${JSON.stringify(value)}.`);
    return value;
  }).join(""));
  if (start === undefined || end === undefined) throw new Error("Labyrinth must contain one start and one end.");
  return { grid: plain, start, end };
}

function gridVisual(
  grid: readonly string[],
  label: string,
  toneAt: (row: number, column: number) => Extract<GuideTraceVisual, { kind: "grid" }>["rows"][number][number]["tone"],
  options: { readonly cursor?: Cell; readonly notes?: readonly (readonly number[])[]; readonly noteLabel?: string } = {}
): GuideTraceVisual {
  return {
    kind: "grid",
    label,
    rows: grid.map((line, row) => [...line].map((value, column) => ({
      text: value,
      tone: value === "#" ? "wall" : toneAt(row, column),
      ...(options.notes?.[row]?.[column] !== undefined && options.notes[row]![column]! >= 0
        ? { note: String(options.notes[row]![column]) }
        : {})
    }))),
    ...(options.cursor === undefined ? {} : { cursor: options.cursor }),
    ...(options.noteLabel === undefined ? {} : { noteLabel: options.noteLabel })
  };
}

function graphVisual(
  vertexCount: number,
  edges: readonly (readonly [number, number] | readonly [number, number, number])[],
  layout: NodeLayout,
  directed: boolean,
  label: string,
  nodeTone: (vertex: number) => GuideTraceGraphNodeTone,
  edgeTone: (edge: readonly [number, number] | readonly [number, number, number], index: number) => GuideTraceGraphEdgeTone,
  badge?: (vertex: number) => string | undefined
): GuideTraceVisual {
  return {
    kind: "graph",
    label,
    directed,
    nodes: Array.from({ length: vertexCount }, (_, index) => {
      const id = String(index + 1);
      const point = layout[id];
      if (point === undefined) throw new Error(`Missing layout for vertex ${id}.`);
      const value = badge?.(index + 1);
      return { id, label: id, ...point, tone: nodeTone(index + 1), ...(value === undefined ? {} : { badge: value }) };
    }),
    edges: edges.map((edge, index) => ({
      from: String(edge[0]), to: String(edge[1]), ...(edge.length === 3 ? { weight: edge[2] } : {}), tone: edgeTone(edge, index)
    }))
  };
}

function roomPreset(t: GraphTheoryT, id: string, grid: readonly string[]): ScenarioPreset {
  const result = countRooms(grid);
  const frames: ScenarioPreset["frames"][number][] = [];
  const seen = new Set<string>();
  const completed = new Set<number>();
  for (const [index, cell] of result.visitOrder.entries()) {
    const component = result.componentIds[cell.row]![cell.column]!;
    seen.add(`${cell.row},${cell.column}`);
    frames.push({
      narration: t("scenarios.narration.roomsVisit", { row: cell.row, column: cell.column, room: component + 1 }),
      visuals: [gridVisual(grid, t("traces.visuals.grid"), (row, column) => {
        const key = `${row},${column}`;
        if (row === cell.row && column === cell.column) return "active";
        if (completed.has(result.componentIds[row]![column]!)) return "path";
        return seen.has(key) ? "visited" : "unvisited";
      }, { cursor: cell })]
    });
    const next = result.visitOrder[index + 1];
    if (next === undefined || result.componentIds[next.row]![next.column] !== component) {
      completed.add(component);
      frames.push({
        narration: t("scenarios.narration.roomsComplete", { room: component + 1, count: completed.size }),
        visuals: [gridVisual(grid, t("traces.visuals.grid"), (row, column) => completed.has(result.componentIds[row]![column]!) ? "path" : seen.has(`${row},${column}`) ? "visited" : "unvisited")]
      });
    }
  }
  frames.push({
    narration: t("scenarios.narration.roomsFinal", { count: result.rooms }),
    visuals: [gridVisual(grid, t("traces.visuals.grid"), (row, column) => result.componentIds[row]![column]! >= 0 ? "path" : "unvisited")]
  });
  const preset = id as "sample" | "diagonal" | "winding";
  return { id, label: t(`scenarios.rooms.${preset}.label`), description: t(`scenarios.rooms.${preset}.description`), frames };
}

export function buildRoomScenarios(t: GraphTheoryT): readonly ScenarioPreset[] {
  return [roomPreset(t, "sample", ROOMS_SAMPLE), roomPreset(t, "diagonal", ROOMS_DIAGONAL), roomPreset(t, "winding", ROOMS_WINDING)];
}

function labyrinthPreset(t: GraphTheoryT, id: string, source: readonly string[]): ScenarioPreset {
  const { grid, start, end } = splitLabyrinthGrid(source);
  const result = gridBfs(grid, start, end);
  const visitIndex = new Map(result.visitOrder.map((cell, index) => [`${cell.row},${cell.column}`, index]));
  const discoveryIndex = new Map<string, number>([[`${start.row},${start.column}`, -1]]);
  for (const cell of result.visitOrder.slice(1)) {
    const distance = result.distances[cell.row]![cell.column]!;
    const predecessorIndices = NEIGHBOUR_ORDER.flatMap(([rowDelta, columnDelta]) => {
      const row = cell.row + rowDelta;
      const column = cell.column + columnDelta;
      if (result.distances[row]?.[column] !== distance - 1) return [];
      const index = visitIndex.get(`${row},${column}`);
      return index === undefined ? [] : [index];
    });
    discoveryIndex.set(`${cell.row},${cell.column}`, Math.min(...predecessorIndices));
  }
  const frames: ScenarioPreset["frames"][number][] = result.visitOrder.map((cell, index) => ({
    narration: t("scenarios.narration.bfsVisit", { row: cell.row, column: cell.column, distance: result.distances[cell.row]![cell.column]! }),
    visuals: [gridVisual(grid, t("traces.visuals.grid"), (row, column) => {
      if (row === cell.row && column === cell.column) return "active";
      const candidateIndex = visitIndex.get(`${row},${column}`);
      if (candidateIndex === undefined) return "unvisited";
      if (candidateIndex < index) return "visited";
      return (discoveryIndex.get(`${row},${column}`) ?? Number.POSITIVE_INFINITY) <= index ? "frontier" : "unvisited";
    }, { cursor: cell, notes: result.distances, noteLabel: t("traces.visuals.distance") })]
  }));
  if (result.reachable) {
    const path = new Set<string>();
    for (const cell of [...result.path].reverse()) {
      path.add(`${cell.row},${cell.column}`);
      frames.push({
        narration: t("scenarios.narration.bfsPath", { row: cell.row, column: cell.column }),
        visuals: [gridVisual(grid, t("traces.visuals.grid"), (row, column) => path.has(`${row},${column}`) ? "path" : result.distances[row]![column]! >= 0 ? "visited" : "unvisited", { cursor: cell, notes: result.distances, noteLabel: t("traces.visuals.distance") })]
      });
    }
    frames.push({ narration: t("scenarios.narration.bfsFinal", { distance: result.distance!, moves: result.moves }), visuals: [gridVisual(grid, t("traces.visuals.grid"), (row, column) => path.has(`${row},${column}`) ? "path" : result.distances[row]![column]! >= 0 ? "visited" : "unvisited", { notes: result.distances, noteLabel: t("traces.visuals.distance") })] });
  } else {
    frames.push({ narration: t("scenarios.narration.bfsUnreachable"), visuals: [gridVisual(grid, t("traces.visuals.grid"), (row, column) => result.distances[row]![column]! >= 0 ? "visited" : "unvisited", { notes: result.distances, noteLabel: t("traces.visuals.distance") })] });
  }
  const preset = id as "sample" | "unreachable" | "multipath";
  return { id, label: t(`scenarios.labyrinth.${preset}.label`), description: t(`scenarios.labyrinth.${preset}.description`), frames };
}

export function buildLabyrinthScenarios(t: GraphTheoryT): readonly ScenarioPreset[] {
  return [labyrinthPreset(t, "sample", LABYRINTH_SAMPLE), labyrinthPreset(t, "unreachable", LABYRINTH_UNREACHABLE), labyrinthPreset(t, "multipath", LABYRINTH_MULTIPATH)];
}

type UnweightedFixture = { readonly n: number; readonly edges: readonly (readonly [number, number])[] };

function teamPreset(t: GraphTheoryT, id: string, fixture: UnweightedFixture, layout: NodeLayout): ScenarioPreset {
  const result = twoColour(fixture.n, fixture.edges);
  const coloured = new Set<number>();
  const treeEdges = new Set<number>();
  const frames: ScenarioPreset["frames"][number][] = [];
  for (const vertex of result.visitOrder) {
    const treeIndex = fixture.edges.findIndex(([from, to]) => (from === vertex && coloured.has(to)) || (to === vertex && coloured.has(from)));
    if (treeIndex >= 0) treeEdges.add(treeIndex);
    coloured.add(vertex);
    frames.push({
      narration: t("scenarios.narration.colour", { vertex, colour: result.colours[vertex] === 1 ? "A" : "B" }),
      visuals: [graphVisual(fixture.n, fixture.edges, layout, false, t("traces.visuals.graph"), (candidate) => !coloured.has(candidate) ? "idle" : result.colours[candidate] === 1 ? "colorA" : "colorB", (_edge, index) => treeEdges.has(index) ? "tree" : "idle")]
    });
  }
  if (result.conflictEdge !== null) {
    const [from, to] = result.conflictEdge;
    frames.push({
      narration: t("scenarios.narration.conflict", { from, to }),
      visuals: [graphVisual(fixture.n, fixture.edges, layout, false, t("traces.visuals.graph"), (vertex) => vertex === from || vertex === to ? "conflict" : result.colours[vertex] === 1 ? "colorA" : result.colours[vertex] === 2 ? "colorB" : "idle", ([left, right]) => (left === from && right === to) || (left === to && right === from) ? "rejected" : "idle")]
    });
  }
  frames.push({
    narration: result.bipartite ? t("scenarios.narration.teamsFinal", { assignment: result.colours.slice(1).join(" ") }) : t("scenarios.common.impossible"),
    visuals: [graphVisual(fixture.n, fixture.edges, layout, false, t("traces.visuals.graph"), (vertex) => result.colours[vertex] === 1 ? "colorA" : result.colours[vertex] === 2 ? "colorB" : "idle", () => result.bipartite ? "tree" : "idle")]
  });
  const preset = id as "sample" | "oddCycle" | "evenCycle";
  return { id, label: t(`scenarios.teams.${preset}.label`), description: t(`scenarios.teams.${preset}.description`), frames };
}

export function buildTeamScenarios(t: GraphTheoryT): readonly ScenarioPreset[] {
  return [teamPreset(t, "sample", TEAMS_SAMPLE, TEAMS_SAMPLE_LAYOUT), teamPreset(t, "oddCycle", TEAMS_ODD_CYCLE, TEAMS_ODD_CYCLE_LAYOUT), teamPreset(t, "evenCycle", TEAMS_EVEN_CYCLE, TEAMS_EVEN_CYCLE_LAYOUT)];
}

function schedulePreset(t: GraphTheoryT, id: string, fixture: UnweightedFixture, layout: NodeLayout): ScenarioPreset {
  const result = kahnTopologicalOrder(fixture.n, fixture.edges);
  const adjacency = buildAdjacencyList(fixture.n, fixture.edges, true);
  const indegrees = [...result.indegrees];
  const queue: number[] = [];
  const order: number[] = [];
  const frames: ScenarioPreset["frames"][number][] = [];
  const visualSet = (active?: number): readonly GuideTraceVisual[] => [
    graphVisual(fixture.n, fixture.edges, layout, true, t("traces.visuals.graph"), (vertex) => vertex === active ? "active" : order.includes(vertex) ? "settled" : queue.includes(vertex) ? "queued" : "idle", () => "idle", (vertex) => String(indegrees[vertex])),
    { kind: "collection", label: t("traces.visuals.queue"), layout: "queue", values: queue },
    { kind: "output", label: t("traces.visuals.order"), lines: order.map(String) }
  ];
  for (let vertex = 1; vertex <= fixture.n; vertex += 1) {
    if (indegrees[vertex] !== 0) continue;
    queue.push(vertex);
    frames.push({ narration: t("scenarios.narration.enqueue", { vertex }), visuals: visualSet() });
  }
  while (queue.length > 0) {
    const vertex = queue.shift()!;
    order.push(vertex);
    frames.push({ narration: t("scenarios.narration.dequeue", { vertex }), visuals: visualSet(vertex) });
    for (const next of adjacency[vertex]!) {
      indegrees[next]! -= 1;
      frames.push({ narration: t("scenarios.narration.decrement", { from: vertex, to: next, indegree: indegrees[next]! }), visuals: visualSet(vertex) });
      if (indegrees[next] === 0) {
        queue.push(next);
        frames.push({ narration: t("scenarios.narration.enqueue", { vertex: next }), visuals: visualSet() });
      }
    }
  }
  const remaining = Array.from({ length: fixture.n }, (_, index) => index + 1).filter((vertex) => !order.includes(vertex));
  frames.push({ narration: result.acyclic ? t("scenarios.narration.scheduleFinal", { order: result.order.join(" ") }) : t("scenarios.narration.scheduleCycle", { vertices: remaining.join(", ") }), visuals: visualSet() });
  const preset = id as "sample" | "multiple" | "cycle";
  return { id, label: t(`scenarios.schedule.${preset}.label`), description: t(`scenarios.schedule.${preset}.description`), frames };
}

export function buildScheduleScenarios(t: GraphTheoryT): readonly ScenarioPreset[] {
  return [schedulePreset(t, "sample", SCHEDULE_SAMPLE, SCHEDULE_SAMPLE_LAYOUT), schedulePreset(t, "multiple", SCHEDULE_MULTIPLE, SCHEDULE_MULTIPLE_LAYOUT), schedulePreset(t, "cycle", SCHEDULE_CYCLE, SCHEDULE_CYCLE_LAYOUT)];
}

type WeightedFixture = { readonly n: number; readonly edges: readonly (readonly [number, number, number])[] };

function routePreset(t: GraphTheoryT, id: string, fixture: WeightedFixture, layout: NodeLayout): ScenarioPreset {
  const result = dijkstra(fixture.n, fixture.edges, 1);
  const distances: (number | null)[] = Array.from({ length: fixture.n + 1 }, () => null);
  const queue: { vertex: number; distance: number }[] = [];
  const settled = new Set<number>();
  let active: number | undefined;
  let edgeState: { readonly from: number; readonly to: number; readonly tone: GuideTraceGraphEdgeTone } | undefined;
  const frames: ScenarioPreset["frames"][number][] = [];
  const visualSet = (): readonly GuideTraceVisual[] => [
    graphVisual(fixture.n, fixture.edges, layout, true, t("traces.visuals.graph"), (vertex) => vertex === active ? "active" : settled.has(vertex) ? "settled" : queue.some((entry) => entry.vertex === vertex) ? "queued" : "idle", ([from, to]) => edgeState?.from === from && edgeState.to === to ? edgeState.tone : "idle", (vertex) => distances[vertex] === null ? "∞" : String(distances[vertex])),
    { kind: "entries", label: t("traces.visuals.distance"), entries: distances.slice(1).map((distance, index) => ({ key: index + 1, value: distance ?? "∞" })) },
    { kind: "collection", label: t("traces.visuals.priorityQueue"), layout: "queue", values: queue.map((entry) => `${entry.distance}:${entry.vertex}`) }
  ];
  for (const step of result.steps) {
    edgeState = step.via === undefined ? undefined : { from: step.via, to: step.vertex, tone: step.kind === "relax" ? "tree" : step.kind === "reject" ? "rejected" : "active" };
    if (step.kind === "push") {
      if (step.via === undefined) distances[step.vertex] = step.distance;
      queue.push({ vertex: step.vertex, distance: step.distance });
      queue.sort((left, right) => left.distance - right.distance || left.vertex - right.vertex);
    } else if (step.kind === "pop") {
      active = step.vertex;
      const index = queue.findIndex((entry) => entry.vertex === step.vertex && entry.distance === step.distance);
      if (index >= 0) queue.splice(index, 1);
      if (distances[step.vertex] === step.distance) settled.add(step.vertex);
    } else if (step.kind === "relax") {
      distances[step.vertex] = step.distance;
    }
    const narration = step.kind === "push"
      ? t("scenarios.narration.push", { vertex: step.vertex, distance: step.distance })
      : step.kind === "pop"
        ? t("scenarios.narration.pop", { vertex: step.vertex, distance: step.distance })
        : step.kind === "stale"
          ? t("scenarios.narration.stale", { vertex: step.vertex, distance: step.distance })
          : step.kind === "relax"
            ? t("scenarios.narration.relax", { from: step.via!, to: step.vertex, distance: step.distance })
            : t("scenarios.narration.reject", { from: step.via!, to: step.vertex, distance: step.distance });
    frames.push({ narration, visuals: visualSet() });
  }
  frames.push({ narration: t("scenarios.narration.routesFinal", { distances: result.distances.slice(1).join(" ") }), visuals: visualSet() });
  const preset = id as "sample" | "detour" | "stale";
  return { id, label: t(`scenarios.routes.${preset}.label`), description: t(`scenarios.routes.${preset}.description`), frames };
}

export function buildRouteScenarios(t: GraphTheoryT): readonly ScenarioPreset[] {
  return [routePreset(t, "sample", ROUTES_SAMPLE, ROUTES_SAMPLE_LAYOUT), routePreset(t, "detour", ROUTES_DETOUR, ROUTES_DETOUR_LAYOUT), routePreset(t, "stale", ROUTES_STALE, ROUTES_STALE_LAYOUT)];
}

export function buildAdjacencyPrimerScenarios(t: GraphTheoryT): readonly ScenarioPreset[] {
  const entries: number[][] = Array.from({ length: TEAMS_SAMPLE.n + 1 }, () => []);
  const seen = new Set<number>();
  const frames: ScenarioPreset["frames"][number][] = TEAMS_SAMPLE.edges.map(([from, to], edgeIndex) => {
    entries[from]!.push(to);
    entries[to]!.push(from);
    seen.add(from);
    seen.add(to);
    return {
      narration: t("scenarios.adjacency.frame", { from, to }),
      visuals: [
        graphVisual(TEAMS_SAMPLE.n, TEAMS_SAMPLE.edges, TEAMS_SAMPLE_LAYOUT, false, t("traces.visuals.graph"),
          (vertex) => vertex === from || vertex === to ? "active" : seen.has(vertex) ? "settled" : "idle",
          (_edge, index) => index < edgeIndex ? "tree" : index === edgeIndex ? "active" : "idle"),
        { kind: "entries" as const, label: t("traces.visuals.adjacency"), activeIndex: from - 1, entries: entries.slice(1).map((values, index) => ({ key: index + 1, value: values.join(", ") || "∅" })) }
      ]
    };
  });
  frames.push({ narration: t("scenarios.adjacency.finished"), visuals: [
    graphVisual(TEAMS_SAMPLE.n, TEAMS_SAMPLE.edges, TEAMS_SAMPLE_LAYOUT, false, t("traces.visuals.graph"), () => "settled", () => "tree"),
    { kind: "entries", label: t("traces.visuals.adjacency"), entries: entries.slice(1).map((values, index) => ({ key: index + 1, value: values.join(", ") || "∅" })) }
  ] });
  return [{ id: "adjacency", label: t("scenarios.adjacency.label"), description: t("scenarios.adjacency.description"), frames }];
}
