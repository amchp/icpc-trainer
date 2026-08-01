import type { TFunction } from "i18next";
import { useEffect, useId, useState } from "react";
import { useTranslation } from "react-i18next";

import { cn } from "../lib.js";
import type {
  GuideTraceGraphEdgeTone,
  GuideTraceGraphNodeTone,
  GuideTraceGridTone,
  GuideTracePrimitive,
  GuideTraceVisual
} from "./guideTrace.js";

export function TraceVisual({ visual }: { readonly visual: GuideTraceVisual }): React.JSX.Element {
  switch (visual.kind) {
    case "output":
      return <VisualPanel label={visual.label}><output className="block whitespace-pre-wrap font-mono text-xs text-violet-200">{visual.lines.length === 0 ? "∅" : visual.lines.join("\n")}</output></VisualPanel>;
    case "branch":
      return <VisualPanel label={visual.label}><p className="font-mono text-xs text-amber-200"><span className="text-zinc-500">{visual.condition} → </span>{visual.outcome}</p></VisualPanel>;
    case "vector":
      return (
        <VisualPanel label={visual.label}>
          <div className="flex max-w-full gap-1.5 overflow-x-auto pb-1">
            {visual.values.map((value, index) => (
              <div key={index} className={cn("min-w-10 border text-center font-mono", visual.activeIndex === index ? "border-cyan-300 bg-cyan-300/10 text-cyan-100" : "border-zinc-700 text-zinc-300")}>
                <span className="block border-b border-inherit px-2 py-0.5 text-[9px] text-zinc-500">{index}</span>
                <span className="block px-2 py-1.5 text-xs">{formatPrimitive(value)}</span>
              </div>
            ))}
          </div>
        </VisualPanel>
      );
    case "callStack":
      return (
        <VisualPanel label={visual.label}>
          <ol className="flex flex-col gap-1.5">
            {[...visual.frames].reverse().map((callFrame, reversedIndex) => {
              const originalIndex = visual.frames.length - reversedIndex - 1;
              return (
                <li key={`${callFrame.label}-${originalIndex}`} className={cn("border-l-2 bg-zinc-900/70 px-3 py-2 font-mono text-xs", visual.activeIndex === originalIndex ? "border-emerald-300 text-emerald-100" : "border-zinc-700 text-zinc-400")}>
                  <span className="block">{callFrame.label}</span>
                  {callFrame.detail === undefined ? null : <span className="mt-1 block text-[10px] text-zinc-500">{callFrame.detail}</span>}
                </li>
              );
            })}
          </ol>
        </VisualPanel>
      );
    case "collection": {
      const values = visual.layout === "stack" ? [...visual.values].reverse() : visual.values;
      return (
        <VisualPanel label={visual.label}>
          <ol className={cn(
            "max-w-full gap-1.5",
            visual.layout === "stack" ? "flex w-fit min-w-28 flex-col" : "flex overflow-x-auto pb-1"
          )}>
            {values.map((value, renderedIndex) => {
              const originalIndex = visual.layout === "stack"
                ? visual.values.length - renderedIndex - 1
                : renderedIndex;
              const markers = visual.markers?.filter((marker) => marker.index === originalIndex) ?? [];
              return (
                <li
                  key={originalIndex}
                  className={cn(
                    "min-w-12 border bg-zinc-900/70 px-2 py-2 text-center font-mono text-xs",
                    visual.layout === "intervals" && "min-w-max",
                    visual.activeIndex === originalIndex
                      ? "border-cyan-300 text-cyan-100"
                      : "border-zinc-700 text-zinc-300"
                  )}
                >
                  <span>{formatPrimitive(value)}</span>
                  {markers.map((marker) => (
                    <span key={marker.label} className="mt-1 block text-[9px] uppercase tracking-wide text-amber-300">
                      {marker.label}
                    </span>
                  ))}
                </li>
              );
            })}
          </ol>
        </VisualPanel>
      );
    }
    case "entries":
      return (
        <VisualPanel label={visual.label}>
          <dl className="grid gap-1.5">
            {visual.entries.map((entry, index) => (
              <div
                key={`${formatPrimitive(entry.key)}-${index}`}
                className={cn(
                  "grid grid-cols-[minmax(0,1fr)_auto] gap-3 border-l-2 bg-zinc-900/70 px-3 py-2 font-mono text-xs",
                  visual.activeIndex === index
                    ? "border-rose-300 text-rose-100"
                    : "border-zinc-700 text-zinc-400"
                )}
              >
                <dt className="min-w-0 break-words">{formatPrimitive(entry.key)}</dt>
                <dd className="text-zinc-200">{formatPrimitive(entry.value)}</dd>
              </div>
            ))}
          </dl>
        </VisualPanel>
      );
    case "grid":
      return <GridVisual visual={visual} />;
    case "graph":
      return <GraphVisual visual={visual} />;
  }
}

type GridVisualValue = Extract<GuideTraceVisual, { readonly kind: "grid" }>;

function GridVisual({ visual }: { readonly visual: GridVisualValue }): React.JSX.Element {
  const { t } = useTranslation("programmingFundamentals");
  const rawId = useId();
  const summaryId = `guide-grid-${rawId.replace(/:/g, "")}`;
  const columns = visual.rows[0]?.length ?? 0;
  return (
    <VisualPanel label={visual.label}>
      <div
        role="img"
        aria-label={visual.label}
        aria-describedby={summaryId}
        className="max-h-96 overflow-x-auto overflow-y-auto pb-1 font-mono text-xs"
      >
        <div className="min-w-max">
          <div className="ml-8 grid" style={{ gridTemplateColumns: `repeat(${columns}, minmax(2.5rem, 1fr))` }} aria-hidden="true">
            {Array.from({ length: columns }, (_, column) => <span key={column} className="py-1 text-center text-[9px] text-zinc-600">{column}</span>)}
          </div>
          {visual.rows.map((row, rowIndex) => (
            <div key={rowIndex} className="flex">
              <span className="flex w-8 shrink-0 items-center justify-center text-[9px] text-zinc-600" aria-hidden="true">{rowIndex}</span>
              <div className="grid flex-1" style={{ gridTemplateColumns: `repeat(${columns}, minmax(2.5rem, 1fr))` }}>
                {row.map((cell, columnIndex) => {
                  const cursor = visual.cursor?.row === rowIndex && visual.cursor.column === columnIndex;
                  const marker = gridMarker(cell.tone);
                  return (
                    <div
                      key={columnIndex}
                      data-tone={cell.tone}
                      data-cursor={cursor ? "true" : undefined}
                      aria-current={cursor ? "location" : undefined}
                      className={cn(
                        "relative flex min-h-11 min-w-10 flex-col items-center justify-center border p-1 text-center transition-colors motion-reduce:transition-none",
                        gridToneClass(cell.tone)
                      )}
                    >
                      <span>{cell.tone === "wall" ? "#" : cell.text}</span>
                      {cell.note === undefined ? null : <span className="text-[9px] leading-none opacity-80">{cell.note}</span>}
                      {marker === null ? null : <span aria-hidden="true" className="absolute right-0.5 top-0 text-[9px] leading-none">{marker}</span>}
                    </div>
                  );
                })}
              </div>
            </div>
          ))}
        </div>
      </div>
      <ul id={summaryId} className="sr-only">
        {visual.rows.flatMap((row, rowIndex) => row.map((cell, columnIndex) => cell.tone === "wall" ? null : (
          <li key={`${rowIndex}-${columnIndex}`}>
            {t("trace.gridCell", { row: String(rowIndex), column: String(columnIndex) })}: {gridToneLabel(t, cell.tone)}
            {cell.note === undefined ? "" : `, ${visual.noteLabel ?? ""} ${cell.note}`}
          </li>
        )))}
      </ul>
    </VisualPanel>
  );
}

function gridToneClass(tone: GuideTraceGridTone): string {
  switch (tone) {
    case "wall": return "border-zinc-700 bg-zinc-800 text-zinc-500";
    case "unvisited": return "border-dotted border-zinc-800 bg-zinc-950 text-zinc-400";
    case "visited": return "border-emerald-400/60 bg-zinc-900 text-emerald-200";
    case "frontier": return "border-dashed border-cyan-300 bg-zinc-900 text-cyan-200";
    case "active": return "border-cyan-200 bg-cyan-300/15 text-cyan-100 ring-1 ring-cyan-200";
    case "path": return "border-violet-300 bg-violet-400/15 text-violet-100";
  }
}

function gridToneLabel(t: TFunction<"programmingFundamentals">, tone: GuideTraceGridTone): string {
  switch (tone) {
    case "wall": return t("trace.gridTone.wall");
    case "unvisited": return t("trace.gridTone.unvisited");
    case "visited": return t("trace.gridTone.visited");
    case "frontier": return t("trace.gridTone.frontier");
    case "active": return t("trace.gridTone.active");
    case "path": return t("trace.gridTone.path");
  }
}

function gridMarker(tone: GuideTraceGridTone): string | null {
  switch (tone) {
    case "visited": return "✓";
    case "frontier": return "…";
    case "active": return "▶";
    case "path": return "★";
    case "wall":
    case "unvisited": return null;
  }
}

type GraphVisualValue = Extract<GuideTraceVisual, { readonly kind: "graph" }>;

function GraphVisual({ visual }: { readonly visual: GraphVisualValue }): React.JSX.Element {
  const { t } = useTranslation("programmingFundamentals");
  const rawId = useId().replace(/:/g, "");
  const summaryId = `guide-graph-${rawId}`;
  const markerIds: Record<GuideTraceGraphEdgeTone, string> = {
    idle: `${rawId}-idle-arrow`,
    active: `${rawId}-active-arrow`,
    tree: `${rawId}-tree-arrow`,
    rejected: `${rawId}-rejected-arrow`
  };
  const byId = new Map(visual.nodes.map((node) => [node.id, node]));
  return (
    <VisualPanel label={visual.label}>
      <svg
        viewBox="0 0 100 100"
        role="img"
        aria-label={visual.label}
        aria-describedby={summaryId}
        className="mx-auto block h-auto w-full max-w-sm text-zinc-200"
        preserveAspectRatio="xMidYMid meet"
      >
        {visual.directed ? (
          <defs>
            {(Object.keys(markerIds) as GuideTraceGraphEdgeTone[]).map((tone) => (
              <marker key={tone} id={markerIds[tone]} viewBox="0 0 6 6" refX="5" refY="3" markerWidth="5" markerHeight="5" orient="auto-start-reverse" markerUnits="userSpaceOnUse">
                <path d="M 0 0 L 6 3 L 0 6 z" className={edgeTone(tone).fill} />
              </marker>
            ))}
          </defs>
        ) : null}
        {visual.edges.map((edge, index) => {
          const from = byId.get(edge.from)!;
          const to = byId.get(edge.to)!;
          const pairKey = [edge.from, edge.to].sort().join("\u0000");
          const parallelIndices = visual.edges.flatMap((candidate, candidateIndex) =>
            [candidate.from, candidate.to].sort().join("\u0000") === pairKey ? [candidateIndex] : []
          );
          const parallelPosition = parallelIndices.indexOf(index);
          const canonicalDirection = edge.from <= edge.to ? 1 : -1;
          const parallelOffset = (parallelPosition - (parallelIndices.length - 1) / 2) * 5 * canonicalDirection;
          const coordinates = offsetLine(shortenedLine(from.x, from.y, to.x, to.y, 7), parallelOffset);
          const style = edgeTone(edge.tone);
          const midpointX = coordinates.x1 + (coordinates.x2 - coordinates.x1) * .58;
          const midpointY = coordinates.y1 + (coordinates.y2 - coordinates.y1) * .58;
          const edgeX = coordinates.x2 - coordinates.x1;
          const edgeY = coordinates.y2 - coordinates.y1;
          const edgeLength = Math.hypot(edgeX, edgeY) || 1;
          const markerSide = parallelPosition < parallelIndices.length / 2 ? -1 : 1;
          const markerOffset = 3.2 * markerSide;
          const markerX = coordinates.x1 + edgeX * .27 - edgeY / edgeLength * markerOffset;
          const markerY = coordinates.y1 + edgeY * .27 + edgeX / edgeLength * markerOffset;
          const glyph = edge.weight === undefined ? edgeGlyph(edge.tone) : null;
          return (
            <g key={`${edge.from}-${edge.to}-${index}`}>
              <line
                {...coordinates}
                data-edge-tone={edge.tone}
                className={cn(style.stroke, "transition-colors motion-reduce:transition-none")}
                strokeWidth={style.width}
                strokeDasharray={style.dash}
                markerEnd={visual.directed ? `url(#${markerIds[edge.tone]})` : undefined}
                vectorEffect="non-scaling-stroke"
              />
              {glyph === null ? null : (
                <g aria-hidden="true" data-edge-marker={edge.tone}>
                  <circle cx={markerX} cy={markerY} r="2.4" className="fill-zinc-950 stroke-zinc-700" strokeWidth=".4" />
                  <text x={markerX} y={markerY} className={style.fill} fontSize="2.7" fontWeight="bold" textAnchor="middle" dominantBaseline="central">{glyph}</text>
                </g>
              )}
              {edge.weight === undefined ? null : (
                <g aria-hidden="true">
                  <circle cx={midpointX} cy={midpointY} r="3.6" className="fill-zinc-950 stroke-zinc-700" strokeWidth=".5" />
                  <text x={midpointX} y={midpointY} className="fill-zinc-200" fontSize="3" textAnchor="middle" dominantBaseline="central">{edge.weight}</text>
                </g>
              )}
            </g>
          );
        })}
        {visual.nodes.map((node) => (
          <g key={node.id} data-node-tone={node.tone} data-node-id={node.id} className="transition-colors motion-reduce:transition-none">
            {node.tone === "active" ? <circle cx={node.x} cy={node.y} r="8" fill="none" className="stroke-cyan-200" strokeWidth=".7" aria-hidden="true" /> : null}
            {node.tone === "colorB" ? (
              <rect x={node.x - 6} y={node.y - 6} width="12" height="12" rx="1.5" className={nodeToneClass(node.tone)} strokeWidth={nodeStrokeWidth(node.tone)} />
            ) : (
              <circle cx={node.x} cy={node.y} r="6" className={nodeToneClass(node.tone)} strokeWidth={nodeStrokeWidth(node.tone)} strokeDasharray={node.tone === "queued" ? "2 1.5" : undefined} />
            )}
            <text x={node.x} y={node.y} className="fill-current" fontSize={4.5} textAnchor="middle" dominantBaseline="central" aria-hidden="true">{node.label}</text>
            {nodeGlyph(node.tone) === null ? null : <text x={node.x + 7} y={node.y - 7.5} className={nodeGlyphClass(node.tone)} fontSize="4" fontWeight="bold" aria-hidden="true">{nodeGlyph(node.tone)}</text>}
            {node.badge === undefined ? null : (
              <g aria-hidden="true">
                <rect x={node.x - 5} y={node.badgePlacement === "above" ? node.y - 15 : node.y + 9.5} width="10" height="5.5" rx="2.5" className="fill-zinc-950 stroke-zinc-800" strokeWidth=".4" />
                <text x={node.x} y={node.badgePlacement === "above" ? node.y - 12.1 : node.y + 12.4} className="fill-zinc-300" fontSize="3.1" textAnchor="middle" dominantBaseline="central">{node.badge}</text>
              </g>
            )}
          </g>
        ))}
      </svg>
      <span className="sr-only">{t("trace.graphNodes")}</span>
      <ul id={summaryId} className="sr-only">
        {visual.nodes.map((node) => <li key={node.id}>{node.label}: {graphToneLabel(t, node.tone)}{node.badge === undefined ? "" : ` · ${node.badge}`}</li>)}
        {visual.edges.map((edge, index) => <li key={`${edge.from}-${edge.to}-${index}`}>{edge.from} {visual.directed ? "→" : "—"} {edge.to}{edge.weight === undefined ? "" : ` ${t("trace.graphWeight", { weight: edge.weight })}`}: {edgeToneLabel(t, edge.tone)}</li>)}
      </ul>
      <span className="sr-only">{t("trace.graphEdges")}</span>
    </VisualPanel>
  );
}

function edgeTone(tone: GuideTraceGraphEdgeTone): { readonly stroke: string; readonly fill: string; readonly width: number; readonly dash?: string } {
  switch (tone) {
    case "idle": return { stroke: "stroke-zinc-700", fill: "fill-zinc-700", width: .6 };
    case "active": return { stroke: "stroke-cyan-300", fill: "fill-cyan-300", width: 1.4 };
    case "tree": return { stroke: "stroke-emerald-300", fill: "fill-emerald-300", width: 1.4 };
    case "rejected": return { stroke: "stroke-rose-400", fill: "fill-rose-400", width: 1.2, dash: "3 2" };
  }
}

function edgeGlyph(tone: GuideTraceGraphEdgeTone): string | null {
  switch (tone) {
    case "active": return "◆";
    case "tree": return "✓";
    case "rejected": return "×";
    case "idle": return null;
  }
}

function graphToneLabel(t: TFunction<"programmingFundamentals">, tone: GuideTraceGraphNodeTone): string {
  switch (tone) {
    case "idle": return t("trace.graphTone.idle");
    case "active": return t("trace.graphTone.active");
    case "queued": return t("trace.graphTone.queued");
    case "settled": return t("trace.graphTone.settled");
    case "colorA": return t("trace.graphTone.colorA");
    case "colorB": return t("trace.graphTone.colorB");
    case "conflict": return t("trace.graphTone.conflict");
  }
}

function edgeToneLabel(t: TFunction<"programmingFundamentals">, tone: GuideTraceGraphEdgeTone): string {
  switch (tone) {
    case "idle": return t("trace.edgeTone.idle");
    case "active": return t("trace.edgeTone.active");
    case "tree": return t("trace.edgeTone.tree");
    case "rejected": return t("trace.edgeTone.rejected");
  }
}

function nodeToneClass(tone: GuideTraceGraphNodeTone): string {
  switch (tone) {
    case "idle": return "fill-zinc-900 stroke-zinc-600";
    case "queued": return "fill-zinc-900 stroke-cyan-300";
    case "active": return "fill-cyan-950 stroke-cyan-200";
    case "settled": return "fill-zinc-900 stroke-emerald-300";
    case "colorA": return "fill-violet-950 stroke-violet-300";
    case "colorB": return "fill-amber-950 stroke-amber-300";
    case "conflict": return "fill-rose-950 stroke-rose-400";
  }
}

function nodeStrokeWidth(tone: GuideTraceGraphNodeTone): number {
  return tone === "active" ? 1.6 : tone === "conflict" ? 1.8 : 1;
}

function nodeGlyph(tone: GuideTraceGraphNodeTone): string | null {
  switch (tone) {
    case "settled": return "✓";
    case "colorA": return "A";
    case "colorB": return "B";
    case "conflict": return "!";
    case "idle":
    case "active":
    case "queued": return null;
  }
}

function nodeGlyphClass(tone: GuideTraceGraphNodeTone): string {
  if (tone === "settled") return "fill-emerald-200";
  if (tone === "colorA") return "fill-violet-200";
  if (tone === "colorB") return "fill-amber-200";
  return "fill-rose-200";
}

function shortenedLine(x1: number, y1: number, x2: number, y2: number, radius: number): { readonly x1: number; readonly y1: number; readonly x2: number; readonly y2: number } {
  const dx = x2 - x1;
  const dy = y2 - y1;
  const length = Math.hypot(dx, dy);
  if (length === 0) return { x1, y1, x2, y2 };
  const offsetX = (dx / length) * radius;
  const offsetY = (dy / length) * radius;
  return { x1: x1 + offsetX, y1: y1 + offsetY, x2: x2 - offsetX, y2: y2 - offsetY };
}

function offsetLine(
  line: { readonly x1: number; readonly y1: number; readonly x2: number; readonly y2: number },
  offset: number
): { readonly x1: number; readonly y1: number; readonly x2: number; readonly y2: number } {
  if (offset === 0) return line;
  const dx = line.x2 - line.x1;
  const dy = line.y2 - line.y1;
  const length = Math.hypot(dx, dy);
  if (length === 0) return line;
  const x = (-dy / length) * offset;
  const y = (dx / length) * offset;
  return { x1: line.x1 + x, y1: line.y1 + y, x2: line.x2 + x, y2: line.y2 + y };
}

export function VisualPanel({ label, children }: { readonly label: string; readonly children: React.ReactNode }): React.JSX.Element {
  return <section className="rounded-md border border-zinc-800 bg-zinc-900/35 p-3"><h3 className="mb-2 font-mono text-[10px] uppercase tracking-[0.14em] text-zinc-500">{label}</h3>{children}</section>;
}

export function formatPrimitive(value: GuideTracePrimitive): string {
  if (value === null) return "null";
  if (typeof value === "boolean") return String(value);
  return String(value);
}

export function usePrefersReducedMotion(): boolean {
  const [reducedMotion, setReducedMotion] = useState(() =>
    typeof window !== "undefined" && window.matchMedia?.("(prefers-reduced-motion: reduce)").matches === true
  );
  useEffect(() => {
    const media = window.matchMedia?.("(prefers-reduced-motion: reduce)");
    if (media === undefined) return;
    const update = (): void => setReducedMotion(media.matches);
    media.addEventListener?.("change", update);
    return () => media.removeEventListener?.("change", update);
  }, []);
  return reducedMotion;
}
