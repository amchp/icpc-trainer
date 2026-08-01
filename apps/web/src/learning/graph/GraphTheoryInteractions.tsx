import "../../i18n/registerGraphTheoryResources.js";

import { useMemo } from "react";
import { useTranslation } from "react-i18next";
import { GuideCodeBlock } from "../GuideCodeBlock.js";
import type { GuideTraceGraphEdgeTone, GuideTraceGraphNodeTone, GuideTraceVisual } from "../guideTrace.js";
import { TraceVisual, VisualPanel } from "../GuideTraceVisuals.js";
import { ScenarioPlayer, type ScenarioPreset } from "../ScenarioPlayer.js";
import {
  buildAdjacencyPrimerScenarios,
  buildLabyrinthScenarios,
  buildRoomScenarios,
  buildRouteScenarios,
  buildScheduleScenarios,
  buildTeamScenarios,
  TEAMS_SAMPLE,
  TEAMS_SAMPLE_LAYOUT
} from "./graphScenarios.js";
import { useGraphTheoryGuideTraces } from "./graphTraces.js";

type GraphNode = Extract<GuideTraceVisual, { readonly kind: "graph" }>["nodes"][number];

type ConceptLayout = Readonly<Record<string, { readonly x: number; readonly y: number }>>;

const DFS_LAYOUT: ConceptLayout = {
  "1": { x: 50, y: 12 }, "2": { x: 25, y: 38 }, "3": { x: 75, y: 38 },
  "4": { x: 10, y: 76 }, "5": { x: 36, y: 76 }, "6": { x: 64, y: 76 }, "7": { x: 90, y: 76 }
};
const BFS_LAYOUT: ConceptLayout = {
  "1": { x: 50, y: 18 }, "2": { x: 25, y: 44 }, "3": { x: 75, y: 44 },
  "4": { x: 10, y: 80 }, "5": { x: 36, y: 80 }, "6": { x: 64, y: 80 }, "7": { x: 90, y: 80 }
};
const DFS_EDGES = [["1", "2"], ["1", "3"], ["2", "4"], ["2", "5"], ["3", "6"], ["3", "7"]] as const;
const DAG_LAYOUT: ConceptLayout = {
  "1": { x: 14, y: 18 }, "2": { x: 44, y: 18 }, "3": { x: 30, y: 52 },
  "4": { x: 68, y: 52 }, "5": { x: 50, y: 84 }
};
const DAG_EDGES = [["1", "3"], ["2", "3"], ["2", "4"], ["3", "5"], ["4", "5"]] as const;
const CYCLE_LAYOUT: ConceptLayout = { "1": { x: 50, y: 14 }, "2": { x: 18, y: 76 }, "3": { x: 82, y: 76 } };
const CYCLE_EDGES = [["1", "2"], ["2", "3"], ["3", "1"]] as const;
const RELAXATION_LAYOUT: ConceptLayout = { "1": { x: 16, y: 58 }, "2": { x: 82, y: 28 }, "3": { x: 52, y: 78 } };
const RELAXATION_EDGES = [["1", "2", 9], ["1", "3", 2], ["3", "2", 3]] as const;

function conceptNodes(
  layout: ConceptLayout,
  tones: Readonly<Record<string, GuideTraceGraphNodeTone>>,
  badges: Readonly<Record<string, string>> = {},
  badgePlacements: Readonly<Record<string, "above" | "below">> = {}
): readonly GraphNode[] {
  return Object.entries(layout).map(([id, position]) => {
    const badge = badges[id];
    const badgePlacement = badgePlacements[id];
    return {
      id, label: id, ...position, tone: tones[id] ?? "idle",
      ...(badge === undefined ? {} : { badge }),
      ...(badgePlacement === undefined ? {} : { badgePlacement })
    };
  });
}

function edgeKey(from: string, to: string): string { return `${from}-${to}`; }

function useConceptPreset(kind: "connectivity" | "bfs" | "indegree" | "relaxation"): readonly ScenarioPreset[] {
  const { t, i18n } = useTranslation("graphTheory");
  return useMemo(() => {
    if (kind === "connectivity") {
      const visual = (current: string | undefined, next: string | undefined, settled: readonly string[], treeEdges: readonly string[], activeEdge?: readonly [string, string]): GuideTraceVisual => ({
        kind: "graph", label: t("conceptPlayers.connectivity.label"), directed: false,
        nodes: conceptNodes(DFS_LAYOUT, Object.fromEntries(Object.keys(DFS_LAYOUT).map((id) => [id, id === current ? "active" : id === next ? "queued" : settled.includes(id) ? "settled" : "idle"]))),
        edges: DFS_EDGES.map(([from, to]) => ({ from, to, tone: activeEdge?.[0] === from && activeEdge[1] === to ? "active" : treeEdges.includes(edgeKey(from, to)) ? "tree" : "idle" }))
      });
      const tree12 = [edgeKey("1", "2")];
      const tree124 = [...tree12, edgeKey("2", "4")];
      const tree1245 = [...tree124, edgeKey("2", "5")];
      const treeAllLeft = [...tree1245, edgeKey("1", "3")];
      const treeToSix = [...treeAllLeft, edgeKey("3", "6")];
      const treeComplete = [...treeToSix, edgeKey("3", "7")];
      return [{ id: "dfs", label: t("conceptPlayers.connectivity.preset"), description: t("conceptPlayers.connectivity.description"), frames: [
        { narration: t("conceptPlayers.connectivity.start"), visuals: [visual("1", "2", [], [], ["1", "2"])] },
        { narration: t("conceptPlayers.connectivity.descend", { vertex: 2, next: 4 }), visuals: [visual("2", "4", ["1"], tree12, ["2", "4"])] },
        { narration: t("conceptPlayers.connectivity.leaf", { vertex: 4, parent: 2 }), visuals: [visual("4", undefined, ["1", "2"], tree124)] },
        { narration: t("conceptPlayers.connectivity.resume", { vertex: 2, next: 5 }), visuals: [visual("2", "5", ["1", "4"], tree124, ["2", "5"])] },
        { narration: t("conceptPlayers.connectivity.leaf", { vertex: 5, parent: 2 }), visuals: [visual("5", undefined, ["1", "2", "4"], tree1245)] },
        { narration: t("conceptPlayers.connectivity.nextBranch"), visuals: [visual("1", "3", ["2", "4", "5"], tree1245, ["1", "3"])] },
        { narration: t("conceptPlayers.connectivity.descend", { vertex: 3, next: 6 }), visuals: [visual("3", "6", ["1", "2", "4", "5"], treeAllLeft, ["3", "6"])] },
        { narration: t("conceptPlayers.connectivity.leaf", { vertex: 6, parent: 3 }), visuals: [visual("6", undefined, ["1", "2", "3", "4", "5"], treeToSix)] },
        { narration: t("conceptPlayers.connectivity.resume", { vertex: 3, next: 7 }), visuals: [visual("3", "7", ["1", "2", "4", "5", "6"], treeToSix, ["3", "7"])] },
        { narration: t("conceptPlayers.connectivity.leaf", { vertex: 7, parent: 3 }), visuals: [visual("7", undefined, ["1", "2", "3", "4", "5", "6"], treeComplete)] },
        { narration: t("conceptPlayers.connectivity.finished"), visuals: [visual(undefined, undefined, Object.keys(DFS_LAYOUT), treeComplete)] }
      ] }];
    }
    if (kind === "bfs") {
      const state = (queue: readonly number[], discovered: readonly (readonly [number, number, number | null])[], active?: number): readonly GuideTraceVisual[] => {
        const distances: (number | null)[] = Array.from({ length: 7 }, () => null);
        const parents: (number | null)[] = Array.from({ length: 7 }, () => null);
        for (const [vertex, distance, parent] of discovered) { distances[vertex - 1] = distance; parents[vertex - 1] = parent; }
        const discoveredVertices = new Set(discovered.map(([vertex]) => vertex));
        const activeParent = active === undefined ? null : parents[active - 1];
        return [
          {
            kind: "graph", label: t("conceptPlayers.bfs.graph"), directed: false,
            nodes: conceptNodes(
              BFS_LAYOUT,
              Object.fromEntries(Object.keys(BFS_LAYOUT).map((id) => {
                const vertex = Number(id);
                return [id, vertex === active ? "active" : queue.includes(vertex) ? "queued" : discoveredVertices.has(vertex) ? "settled" : "idle"];
              })),
              Object.fromEntries(discovered.map(([vertex, distance]) => [String(vertex), String(distance)])),
              { "1": "above" }
            ),
            edges: DFS_EDGES.map(([from, to]) => {
              const fromNumber = Number(from);
              const toNumber = Number(to);
              const isActiveDiscovery = activeParent !== null && (
                (fromNumber === active && toNumber === activeParent)
                || (toNumber === active && fromNumber === activeParent)
              );
              const isTreeEdge = parents[fromNumber - 1] === toNumber || parents[toNumber - 1] === fromNumber;
              return { from, to, tone: isActiveDiscovery ? "active" : isTreeEdge ? "tree" : "idle" };
            })
          },
          { kind: "collection", label: t("conceptPlayers.bfs.queue"), layout: "queue", values: queue, ...(queue.length === 0 ? {} : { activeIndex: 0 }) },
          { kind: "entries", label: t("conceptPlayers.bfs.distance"), entries: distances.map((distance, index) => ({ key: index + 1, value: distance ?? "∞" })), ...(active === undefined ? {} : { activeIndex: active - 1 }) },
          { kind: "entries", label: t("conceptPlayers.bfs.parents"), entries: parents.map((parent, index) => ({ key: index + 1, value: index === 0 ? t("conceptPlayers.bfs.source") : parent ?? "—" })), ...(active === undefined ? {} : { activeIndex: active - 1 }) }
        ];
      };
      const d1 = [[1, 0, null]] as const;
      const d2 = [...d1, [2, 1, 1]] as const;
      const d3 = [...d2, [3, 1, 1]] as const;
      const d4 = [...d3, [4, 2, 2]] as const;
      const d5 = [...d4, [5, 2, 2]] as const;
      const d6 = [...d5, [6, 2, 3]] as const;
      const all = [...d6, [7, 2, 3]] as const;
      return [{ id: "layers", label: t("conceptPlayers.bfs.preset"), description: t("conceptPlayers.bfs.description"), frames: [
        { narration: t("conceptPlayers.bfs.initialize"), visuals: state([1], d1) },
        { narration: t("conceptPlayers.bfs.dequeue", { vertex: 1 }), visuals: state([], d1, 1) },
        { narration: t("conceptPlayers.bfs.discover", { vertex: 2, parent: 1, distance: 1 }), visuals: state([2], d2, 2) },
        { narration: t("conceptPlayers.bfs.discover", { vertex: 3, parent: 1, distance: 1 }), visuals: state([2, 3], d3, 3) },
        { narration: t("conceptPlayers.bfs.dequeue", { vertex: 2 }), visuals: state([3], d3, 2) },
        { narration: t("conceptPlayers.bfs.discover", { vertex: 4, parent: 2, distance: 2 }), visuals: state([3, 4], d4, 4) },
        { narration: t("conceptPlayers.bfs.discover", { vertex: 5, parent: 2, distance: 2 }), visuals: state([3, 4, 5], d5, 5) },
        { narration: t("conceptPlayers.bfs.dequeue", { vertex: 3 }), visuals: state([4, 5], d5, 3) },
        { narration: t("conceptPlayers.bfs.discover", { vertex: 6, parent: 3, distance: 2 }), visuals: state([4, 5, 6], d6, 6) },
        { narration: t("conceptPlayers.bfs.discover", { vertex: 7, parent: 3, distance: 2 }), visuals: state([4, 5, 6, 7], all, 7) },
        ...([4, 5, 6, 7] as const).map((vertex, index) => ({ narration: t("conceptPlayers.bfs.dequeue", { vertex }), visuals: state([4, 5, 6, 7].slice(index + 1), all, vertex) })),
        { narration: t("conceptPlayers.bfs.finished"), visuals: state([], all) }
      ] }];
    }
    if (kind === "indegree") {
      const dagVisuals = (indegrees: readonly number[], queue: readonly number[], order: readonly number[], removed: readonly string[], active?: number): readonly GuideTraceVisual[] => [
        { kind: "graph", label: t("conceptPlayers.indegree.label"), directed: true,
          nodes: conceptNodes(DAG_LAYOUT, Object.fromEntries(Object.keys(DAG_LAYOUT).map((id) => [id, Number(id) === active ? "active" : order.includes(Number(id)) ? "settled" : queue.includes(Number(id)) ? "queued" : "idle"])), Object.fromEntries(indegrees.map((value, index) => [String(index + 1), String(value)]))),
          edges: DAG_EDGES.map(([from, to]) => ({ from, to, tone: removed.includes(edgeKey(from, to)) ? "tree" : "idle" })) },
        { kind: "collection", label: t("conceptPlayers.indegree.queue"), layout: "queue", values: queue, ...(queue.length === 0 ? {} : { activeIndex: 0 }) },
        { kind: "output", label: t("conceptPlayers.indegree.order"), lines: order.map(String) }
      ];
      const cycleVisuals = (failed: boolean): readonly GuideTraceVisual[] => [
        { kind: "graph", label: t("conceptPlayers.indegree.cycleLabel"), directed: true,
          nodes: conceptNodes(CYCLE_LAYOUT, failed ? { "1": "conflict", "2": "conflict", "3": "conflict" } : {}, { "1": "1", "2": "1", "3": "1" }),
          edges: CYCLE_EDGES.map(([from, to]) => ({ from, to, tone: failed ? "rejected" : "idle" })) },
        { kind: "collection", label: t("conceptPlayers.indegree.queue"), layout: "queue", values: [] },
        { kind: "output", label: t("conceptPlayers.indegree.leftovers"), lines: failed ? ["1 2 3"] : [] }
      ];
      return [
        { id: "dag", label: t("conceptPlayers.indegree.successPreset"), description: t("conceptPlayers.indegree.successDescription"), frames: [
          { narration: t("conceptPlayers.indegree.initialize"), visuals: dagVisuals([0, 0, 2, 1, 2], [1, 2], [], []) },
          { narration: t("conceptPlayers.indegree.emitVertex", { vertex: 1 }), visuals: dagVisuals([0, 0, 1, 1, 2], [2], [1], [edgeKey("1", "3")], 1) },
          { narration: t("conceptPlayers.indegree.emitVertex", { vertex: 2 }), visuals: dagVisuals([0, 0, 0, 0, 2], [3, 4], [1, 2], [edgeKey("1", "3"), edgeKey("2", "3"), edgeKey("2", "4")], 2) },
          { narration: t("conceptPlayers.indegree.emitVertex", { vertex: 3 }), visuals: dagVisuals([0, 0, 0, 0, 1], [4], [1, 2, 3], [...DAG_EDGES.slice(0, 4).map(([from, to]) => edgeKey(from, to))], 3) },
          { narration: t("conceptPlayers.indegree.emitVertex", { vertex: 4 }), visuals: dagVisuals([0, 0, 0, 0, 0], [5], [1, 2, 3, 4], DAG_EDGES.map(([from, to]) => edgeKey(from, to)), 4) },
          { narration: t("conceptPlayers.indegree.emitVertex", { vertex: 5 }), visuals: dagVisuals([0, 0, 0, 0, 0], [], [1, 2, 3, 4, 5], DAG_EDGES.map(([from, to]) => edgeKey(from, to)), 5) },
          { narration: t("conceptPlayers.indegree.finished"), visuals: dagVisuals([0, 0, 0, 0, 0], [], [1, 2, 3, 4, 5], DAG_EDGES.map(([from, to]) => edgeKey(from, to))) }
        ] },
        { id: "cycle", label: t("conceptPlayers.indegree.cyclePreset"), description: t("conceptPlayers.indegree.cycleDescription"), frames: [
          { narration: t("conceptPlayers.indegree.cycleStart"), visuals: cycleVisuals(false) },
          { narration: t("conceptPlayers.indegree.cycle"), visuals: cycleVisuals(true) }
        ] }
      ];
    }
    const graph = (tones: Readonly<Record<string, GuideTraceGraphNodeTone>>, distances: readonly [string, string, string], activeEdge?: string, treeEdges: readonly string[] = []): GuideTraceVisual => ({
      kind: "graph", label: t("conceptPlayers.relaxation.label"), directed: true,
      nodes: conceptNodes(RELAXATION_LAYOUT, tones, { "1": distances[0], "2": distances[1], "3": distances[2] }, { "1": "above", "2": "above" }),
      edges: RELAXATION_EDGES.map(([from, to, weight]) => ({ from, to, weight, tone: activeEdge === edgeKey(from, to) ? "active" : treeEdges.includes(edgeKey(from, to)) ? "tree" : "idle" }))
    });
    const visuals = (tones: Readonly<Record<string, GuideTraceGraphNodeTone>>, distances: readonly [string, string, string], queue: readonly string[], activeEdge?: string, treeEdges: readonly string[] = []): readonly GuideTraceVisual[] => [
      graph(tones, distances, activeEdge, treeEdges),
      { kind: "collection", label: t("traces.visuals.priorityQueue"), layout: "queue", values: queue, ...(queue.length === 0 ? {} : { activeIndex: 0 }) },
      { kind: "entries", label: t("traces.visuals.distance"), entries: distances.map((distance, index) => ({ key: index + 1, value: distance })) }
    ];
    return [{ id: "relax", label: t("conceptPlayers.relaxation.preset"), description: t("conceptPlayers.relaxation.description"), frames: [
      { narration: t("conceptPlayers.relaxation.initialize"), visuals: visuals({ "1": "queued" }, ["0", "∞", "∞"], ["0:1"]) },
      { narration: t("conceptPlayers.relaxation.settle", { vertex: 1, distance: 0 }), visuals: visuals({ "1": "active" }, ["0", "∞", "∞"], []) },
      { narration: t("conceptPlayers.relaxation.direct"), visuals: visuals({ "1": "active", "2": "queued" }, ["0", "9", "∞"], ["9:2"], edgeKey("1", "2")) },
      { narration: t("conceptPlayers.relaxation.intermediate"), visuals: visuals({ "1": "settled", "2": "queued", "3": "queued" }, ["0", "9", "2"], ["2:3", "9:2"], edgeKey("1", "3"), [edgeKey("1", "3")]) },
      { narration: t("conceptPlayers.relaxation.settle", { vertex: 3, distance: 2 }), visuals: visuals({ "1": "settled", "2": "queued", "3": "active" }, ["0", "9", "2"], ["9:2"], undefined, [edgeKey("1", "3")]) },
      { narration: t("conceptPlayers.relaxation.improve"), visuals: visuals({ "1": "settled", "2": "queued", "3": "active" }, ["0", "5", "2"], ["5:2", "9:2"], edgeKey("3", "2"), [edgeKey("1", "3"), edgeKey("3", "2")]) },
      { narration: t("conceptPlayers.relaxation.settle", { vertex: 2, distance: 5 }), visuals: visuals({ "1": "settled", "2": "active", "3": "settled" }, ["0", "5", "2"], ["9:2"], undefined, [edgeKey("1", "3"), edgeKey("3", "2")]) },
      { narration: t("conceptPlayers.relaxation.stale"), visuals: visuals({ "1": "settled", "2": "settled", "3": "settled" }, ["0", "5", "2"], ["9:2"], undefined, [edgeKey("1", "3"), edgeKey("3", "2")]) },
      { narration: t("conceptPlayers.relaxation.finished"), visuals: visuals({ "1": "settled", "2": "settled", "3": "settled" }, ["0", "5", "2"], [], undefined, [edgeKey("1", "3"), edgeKey("3", "2")]) }
    ] }];
  }, [i18n.language, kind, t]);
}

function ConceptPlayer({ kind, accent }: { readonly kind: "connectivity" | "bfs" | "indegree" | "relaxation"; readonly accent: "emerald" | "cyan" | "amber" | "rose" }): React.JSX.Element {
  const { t } = useTranslation("graphTheory");
  return <ScenarioPlayer label={t(`conceptPlayers.${kind}.label`)} presets={useConceptPreset(kind)} accent={accent} intervalMs={1100} />;
}

export function ConnectivityConceptPlayer(): React.JSX.Element { return <ConceptPlayer kind="connectivity" accent="emerald" />; }
export function BfsLayerConceptPlayer(): React.JSX.Element { return <ConceptPlayer kind="bfs" accent="cyan" />; }
export function IndegreeConceptPlayer(): React.JSX.Element { return <ConceptPlayer kind="indegree" accent="amber" />; }
export function RelaxationConceptPlayer(): React.JSX.Element { return <ConceptPlayer kind="relaxation" accent="rose" />; }

function AdjacencyListPrimer(): React.JSX.Element {
  const { t, i18n } = useTranslation("graphTheory");
  const presets = useMemo(() => buildAdjacencyPrimerScenarios(t), [i18n.language, t]);
  return <ScenarioPlayer label={t("conceptPlayers.adjacency.label")} presets={presets} accent="violet" intervalMs={1100} />;
}

export function GraphRepresentationPrimer(): React.JSX.Element {
  const { t } = useTranslation("graphTheory");
  const matrix = [
    [0, 1, 1, 0, 0],
    [1, 0, 0, 0, 0],
    [1, 0, 0, 0, 0],
    [0, 0, 0, 0, 1],
    [0, 0, 0, 1, 0]
  ] as const;
  return (
    <section aria-labelledby="graph-representation-title" className="not-prose my-8 rounded-xl border border-violet-400/25 bg-violet-950/10 p-4 sm:p-6">
      <p className="font-mono text-[10px] font-semibold uppercase tracking-[0.16em] text-violet-300">{t("representations.eyebrow")}</p>
      <h5 id="graph-representation-title" className="mt-2 text-xl font-semibold text-zinc-50">{t("representations.title")}</h5>
      <p className="mt-3 max-w-3xl text-sm leading-7 text-zinc-400">{t("representations.intro")}</p>
      <div className="mt-5 grid gap-4 lg:grid-cols-3">
        <TraceVisual visual={{
          kind: "graph", label: t("representations.graphTitle"), directed: false,
          nodes: conceptNodes(TEAMS_SAMPLE_LAYOUT, {}),
          edges: TEAMS_SAMPLE.edges.map(([from, to]) => ({ from: String(from), to: String(to), tone: "idle" }))
        }} />
        <TraceVisual visual={{
          kind: "entries", label: t("representations.listTitle"), entries: [
            { key: 1, value: "2, 3" }, { key: 2, value: "1" }, { key: 3, value: "1" }, { key: 4, value: "5" }, { key: 5, value: "4" }
          ]
        }} />
        <VisualPanel label={t("representations.matrixTitle")}>
          <div className="overflow-x-auto [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
            <table className="mx-auto border-collapse font-mono text-xs" aria-label={t("representations.matrixAria")}>
              <thead><tr><th className="size-8 text-zinc-600" aria-hidden="true" />{matrix.map((_, index) => <th key={index} scope="col" className="size-8 text-center font-medium text-zinc-500">{index + 1}</th>)}</tr></thead>
              <tbody>{matrix.map((row, rowIndex) => <tr key={rowIndex}><th scope="row" className="size-8 text-center font-medium text-zinc-500">{rowIndex + 1}</th>{row.map((value, columnIndex) => <td key={columnIndex} className={`size-8 border text-center ${value === 1 ? "border-violet-400/60 bg-violet-400/15 text-violet-100" : "border-zinc-800 text-zinc-600"}`}>{value}</td>)}</tr>)}</tbody>
            </table>
          </div>
        </VisualPanel>
      </div>
      <div className="mt-4 grid gap-3 text-sm leading-6 text-zinc-400 sm:grid-cols-2">
        <p><strong className="text-zinc-200">{t("representations.listTitle")}:</strong> {t("representations.listText")}</p>
        <p><strong className="text-zinc-200">{t("representations.matrixTitle")}:</strong> {t("representations.matrixText")}</p>
      </div>
      <p className="mt-4 border-l-2 border-violet-400/50 pl-3 text-sm leading-6 text-zinc-300">{t("representations.symmetry")}</p>
      <AdjacencyListPrimer />
    </section>
  );
}

function ToolTrace({ trace }: { readonly trace: ReturnType<typeof useGraphTheoryGuideTraces>[keyof ReturnType<typeof useGraphTheoryGuideTraces>] }): React.JSX.Element {
  return <div className="[&_.prism-code]:!max-h-none [&_.prism-code]:!overflow-x-auto [&_.prism-code]:!overflow-y-visible [&_.prism-code]:[scrollbar-width:none] [&_.prism-code::-webkit-scrollbar]:hidden"><GuideCodeBlock trace={trace} /></div>;
}

export function GridDfsToolTrace(): React.JSX.Element { return <ToolTrace trace={useGraphTheoryGuideTraces().gridDfs} />; }
export function GridBfsToolTrace(): React.JSX.Element { return <ToolTrace trace={useGraphTheoryGuideTraces().gridBfs} />; }
export function BipartiteToolTrace(): React.JSX.Element { return <ToolTrace trace={useGraphTheoryGuideTraces().bipartiteDfs} />; }
export function KahnToolTrace(): React.JSX.Element { return <ToolTrace trace={useGraphTheoryGuideTraces().kahn} />; }
export function DijkstraToolTrace(): React.JSX.Element { return <ToolTrace trace={useGraphTheoryGuideTraces().dijkstra} />; }

function ProblemPlayer({ kind }: { readonly kind: "rooms" | "labyrinth" | "teams" | "schedule" | "routes" }): React.JSX.Element {
  const { t, i18n } = useTranslation("graphTheory");
  const presets = useMemo(() => {
    if (kind === "rooms") return buildRoomScenarios(t);
    if (kind === "labyrinth") return buildLabyrinthScenarios(t);
    if (kind === "teams") return buildTeamScenarios(t);
    if (kind === "schedule") return buildScheduleScenarios(t);
    return buildRouteScenarios(t);
  }, [i18n.language, kind, t]);
  const accents = { rooms: "emerald", labyrinth: "cyan", teams: "violet", schedule: "emerald", routes: "rose" } as const;
  return <ScenarioPlayer label={t(`${kind}.animationLabel`)} presets={presets} accent={accents[kind]} />;
}

export function RoomsProblemAnimation(): React.JSX.Element { return <ProblemPlayer kind="rooms" />; }
export function LabyrinthProblemAnimation(): React.JSX.Element { return <ProblemPlayer kind="labyrinth" />; }
export function TeamsProblemAnimation(): React.JSX.Element { return <ProblemPlayer kind="teams" />; }
export function ScheduleProblemAnimation(): React.JSX.Element { return <ProblemPlayer kind="schedule" />; }
export function RoutesProblemAnimation(): React.JSX.Element { return <ProblemPlayer kind="routes" />; }
