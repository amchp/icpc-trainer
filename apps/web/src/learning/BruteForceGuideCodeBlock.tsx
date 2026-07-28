import { Check, ChevronLeft, ChevronRight, Clipboard, Pause, Play, RotateCcw } from "lucide-react";
import type { TFunction } from "i18next";
import { Highlight, themes, type Language } from "prism-react-renderer";
import { useEffect, useMemo, useRef, useState } from "react";
import { useTranslation } from "react-i18next";

import { cn } from "../lib.js";
import {
  getGuideTraceDefaultInputs,
  runGuideTrace,
  type GuideTraceDefinition,
  type GuideTraceFrame,
  type GuideTraceInputSchema,
  type GuideTraceInputValues,
  type GuideTracePrimitive,
  type GuideTraceVisual
} from "./BruteForceGuideTrace.js";

export type BruteForceGuideCodeBlockProps<S extends GuideTraceInputSchema = GuideTraceInputSchema> =
  | { readonly code: string; readonly language?: Language; readonly copyLabel?: string; readonly trace?: never }
  | {
      readonly trace: GuideTraceDefinition<S>;
      readonly copyLabel?: string;
      readonly code?: never;
      readonly language?: never;
    };

export function BruteForceGuideCodeBlock<const S extends GuideTraceInputSchema = GuideTraceInputSchema>(
  props: BruteForceGuideCodeBlockProps<S>
): React.JSX.Element {
  if (props.trace === undefined) {
    return <StaticGuideCodeBlock code={props.code} language={props.language} copyLabel={props.copyLabel} />;
  }
  return <InteractiveGuideCodeBlock trace={props.trace} copyLabel={props.copyLabel} />;
}

function StaticGuideCodeBlock({
  code,
  language = "cpp",
  copyLabel
}: {
  readonly code: string;
  readonly language?: Language;
  readonly copyLabel?: string;
}): React.JSX.Element {
  return (
    <div className="my-8 overflow-hidden rounded-lg border border-zinc-800 bg-[#0d1117] text-sm">
      <CodePane code={code} language={language} copyLabel={copyLabel} />
    </div>
  );
}

function InteractiveGuideCodeBlock<S extends GuideTraceInputSchema>({
  trace,
  copyLabel
}: {
  readonly trace: GuideTraceDefinition<S>;
  readonly copyLabel?: string;
}): React.JSX.Element {
  const { t } = useTranslation("bruteForce");
  const [inputs, setInputs] = useState<GuideTraceInputValues<S>>(() => getGuideTraceDefaultInputs(trace));
  const [frameIndex, setFrameIndex] = useState(0);
  const [playing, setPlaying] = useState(false);
  const reducedMotion = usePrefersReducedMotion();
  const reportedError = useRef<string | null>(null);
  const result = useMemo(() => runGuideTrace(trace, inputs), [inputs, trace]);
  const frames = result.valid ? result.frames : [];
  const frame = frames[frameIndex];
  const finalFrame = frameIndex >= frames.length - 1;
  const sidebarVisuals = frame?.visuals?.filter((visual) => visual.kind !== "tree");
  const wideVisuals = frame?.visuals?.filter((visual) => visual.kind === "tree");

  useEffect(() => {
    setInputs(getGuideTraceDefaultInputs(trace));
    setFrameIndex(0);
    setPlaying(false);
  }, [trace]);

  useEffect(() => {
    if (result.valid || reportedError.current === result.reason) return;
    reportedError.current = result.reason;
    if (import.meta.env.DEV || import.meta.env.MODE === "test") {
      console.error(`[Guide trace: ${trace.label}] ${result.reason}`);
    }
  }, [result, trace.label]);

  useEffect(() => {
    if (!playing || reducedMotion || finalFrame) return;
    const timer = window.setTimeout(() => setFrameIndex((current) => Math.min(frames.length - 1, current + 1)), trace.intervalMs ?? 1200);
    return () => window.clearTimeout(timer);
  }, [finalFrame, frames.length, frameIndex, playing, reducedMotion, trace.intervalMs]);

  useEffect(() => {
    if (reducedMotion || finalFrame) setPlaying(false);
  }, [finalFrame, reducedMotion]);

  if (!result.valid || frame === undefined) {
    return <StaticGuideCodeBlock code={trace.code} language={trace.language} copyLabel={copyLabel} />;
  }

  const moveTo = (nextIndex: number): void => {
    setPlaying(false);
    setFrameIndex(Math.max(0, Math.min(frames.length - 1, nextIndex)));
  };
  const reset = (): void => moveTo(0);
  const togglePlayback = (): void => {
    if (reducedMotion || finalFrame) return;
    setPlaying((current) => !current);
  };
  const updateInput = (name: string, value: boolean | string): void => {
    setPlaying(false);
    setFrameIndex(0);
    setInputs((current) => ({ ...current, [name]: value }));
  };

  return (
    <div
      className="my-8 min-w-0 overflow-hidden rounded-lg border border-zinc-800 bg-[#0d1117] text-sm"
      aria-label={trace.label}
    >
      <div className="grid min-w-0 lg:grid-cols-[minmax(0,1.35fr)_minmax(18rem,.65fr)]">
        <div className="min-w-0 border-b border-zinc-800 lg:border-b-0 lg:border-r">
          <CodePane code={trace.code} language={trace.language} copyLabel={copyLabel} activeLine={frame.line} />
        </div>
        <div className="min-w-0 bg-zinc-950/70 p-4 sm:p-5">
          {Object.keys(trace.inputs).length > 0 ? (
            <fieldset className="mb-5 grid gap-3 border-b border-zinc-800 pb-5">
              <legend className="mb-2 font-mono text-[10px] uppercase tracking-[0.16em] text-zinc-500">{t("trace.inputs")}</legend>
              {Object.entries(trace.inputs).map(([name, input]) => input.kind === "boolean" ? (
                <label key={name} className="flex cursor-pointer items-center justify-between gap-4 text-sm text-zinc-300">
                  <span>{input.label}</span>
                  <input
                    type="checkbox"
                    checked={Boolean(inputs[name])}
                    className="size-4 accent-blue-400"
                    onChange={(event) => updateInput(name, event.target.checked)}
                  />
                </label>
              ) : (
                <label key={name} className="grid gap-1.5 text-sm text-zinc-300">
                  <span>{input.label}</span>
                  <select
                    value={String(inputs[name])}
                    className="min-w-0 rounded-md border border-zinc-700 bg-zinc-900 px-2 py-1.5 text-zinc-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-400"
                    onChange={(event) => updateInput(name, event.target.value)}
                  >
                    {input.options.map((option) => <option key={option.value} value={option.value}>{option.label}</option>)}
                  </select>
                </label>
              ))}
            </fieldset>
          ) : null}

          <div className="flex flex-wrap items-center justify-between gap-3">
            <strong className="font-mono text-xs text-blue-300">{t("trace.stepCount", { current: frameIndex + 1, total: frames.length })}</strong>
            <div className="flex flex-wrap gap-1.5">
              <TraceButton label={t("trace.previous")} disabled={frameIndex === 0} onClick={() => moveTo(frameIndex - 1)}><ChevronLeft /></TraceButton>
              <TraceButton label={t("trace.next")} disabled={finalFrame} onClick={() => moveTo(frameIndex + 1)}><ChevronRight /></TraceButton>
              <TraceButton label={t("trace.reset")} onClick={reset}><RotateCcw /></TraceButton>
              <button
                type="button"
                disabled={finalFrame || reducedMotion}
                aria-pressed={playing}
                aria-describedby={reducedMotion ? `${trace.label.replace(/\W+/g, "-")}-reduced-motion` : undefined}
                className="inline-flex items-center gap-1.5 rounded-md bg-blue-500 px-2.5 py-2 text-xs font-semibold text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-300 disabled:opacity-40"
                onClick={togglePlayback}
              >
                {playing ? <Pause className="size-3.5" aria-hidden="true" /> : <Play className="size-3.5" aria-hidden="true" />}
                {playing ? t("trace.pause") : t("trace.play")}
              </button>
            </div>
          </div>
          {reducedMotion ? <p id={`${trace.label.replace(/\W+/g, "-")}-reduced-motion`} className="mt-3 text-xs leading-5 text-zinc-500">{t("trace.reducedMotion")}</p> : null}
          <p className="mt-5 border-l-2 border-blue-400 pl-3 leading-6 text-zinc-200" role="status" aria-live="polite">{frame.narration}</p>
          <TraceState frame={frame} visuals={sidebarVisuals} />
        </div>
      </div>
      {wideVisuals !== undefined && wideVisuals.length > 0 ? (
        <div className="border-t border-zinc-800 bg-zinc-950/40 p-4 sm:p-5" data-trace-wide-visuals>
          <div className="grid gap-4">
            {wideVisuals.map((visual, index) => <TraceVisual key={`${visual.kind}-${visual.label}-${index}`} visual={visual} />)}
          </div>
        </div>
      ) : null}
    </div>
  );
}

function TraceButton({
  label,
  disabled = false,
  onClick,
  children
}: {
  readonly label: string;
  readonly disabled?: boolean;
  readonly onClick: () => void;
  readonly children: React.ReactElement<{ className?: string; "aria-hidden"?: string }>;
}): React.JSX.Element {
  return (
    <button
      type="button"
      disabled={disabled}
      aria-label={label}
      className="rounded-md border border-zinc-700 p-2 text-zinc-300 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-400 disabled:opacity-40"
      onClick={onClick}
    >
      {children}
    </button>
  );
}

function CodePane({
  code,
  language,
  copyLabel,
  activeLine
}: {
  readonly code: string;
  readonly language: Language;
  readonly copyLabel?: string;
  readonly activeLine?: number;
}): React.JSX.Element {
  const { t } = useTranslation("bruteForce");
  const [copied, setCopied] = useState(false);
  const scrollPane = useRef<HTMLPreElement>(null);
  const activeRow = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const pane = scrollPane.current;
    const row = activeRow.current;
    if (pane === null || row === null) return;
    const top = row.offsetTop;
    const bottom = top + row.offsetHeight;
    if (top < pane.scrollTop) pane.scrollTop = top;
    else if (bottom > pane.scrollTop + pane.clientHeight) pane.scrollTop = bottom - pane.clientHeight;
  }, [activeLine]);

  const copy = async (): Promise<void> => {
    await navigator.clipboard.writeText(code);
    setCopied(true);
    window.setTimeout(() => setCopied(false), 1500);
  };

  return (
    <>
      <div className="flex items-center justify-between border-b border-zinc-800/80 bg-zinc-900/50 py-1.5 pl-4 pr-2">
        <span className="font-mono text-[10px] uppercase tracking-[0.18em] text-zinc-500">{language === "cpp" ? "C++" : language}</span>
        <button
          type="button"
          className={cn(
            "inline-flex items-center gap-1.5 rounded-md px-2 py-1.5 font-mono text-[11px] transition-colors motion-reduce:transition-none focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-400",
            copied ? "text-zinc-200" : "text-zinc-500 hover:bg-zinc-800 hover:text-zinc-200"
          )}
          aria-label={copyLabel ?? t("code.copyLabel")}
          onClick={() => void copy()}
        >
          {copied ? <Check className="size-3.5" aria-hidden="true" /> : <Clipboard className="size-3.5" aria-hidden="true" />}
          {copied ? t("code.copied") : t("code.copy")}
        </button>
      </div>
      <Highlight theme={themes.nightOwl} code={code} language={language}>
        {({ className, style, tokens, getLineProps, getTokenProps }) => (
          <pre
            ref={scrollPane}
            className={cn(className, "relative max-h-[32rem] overflow-auto py-5 font-mono text-[13px] leading-6 sm:py-6")}
            style={{ ...style, background: "transparent" }}
          >
            {tokens.map((line, index) => {
              const lineNumber = index + 1;
              const current = activeLine === lineNumber;
              return (
                <div
                  key={lineNumber}
                  ref={current ? activeRow : undefined}
                  {...getLineProps({ line })}
                  aria-current={current ? "step" : undefined}
                  data-guide-line={lineNumber}
                  className={cn(
                    "grid min-w-max grid-cols-[1.25rem_2rem_minmax(0,1fr)] px-3 transition-colors motion-reduce:transition-none sm:px-4",
                    current && "bg-blue-400/15"
                  )}
                >
                  <span aria-hidden="true" className={cn("select-none text-blue-300", !current && "invisible")}>→</span>
                  <span aria-hidden="true" className="select-none pr-3 text-right text-zinc-700">{lineNumber}</span>
                  <span className="pr-4">{line.map((token, tokenIndex) => <span key={tokenIndex} {...getTokenProps({ token })} />)}</span>
                </div>
              );
            })}
          </pre>
        )}
      </Highlight>
      <span className="sr-only" aria-live="polite">{copied ? t("code.announcement") : ""}</span>
    </>
  );
}

function TraceState({
  frame,
  visuals = frame.visuals
}: {
  readonly frame: GuideTraceFrame;
  readonly visuals?: readonly GuideTraceVisual[];
}): React.JSX.Element {
  const { t } = useTranslation("bruteForce");
  return (
    <div className="mt-5 grid gap-4">
      {frame.variables !== undefined && frame.variables.length > 0 ? (
        <div className="overflow-x-auto">
          <table className="w-full border-collapse text-left text-xs">
            <caption className="mb-2 text-left font-mono text-[10px] uppercase tracking-[0.16em] text-zinc-500">{t("trace.variables")}</caption>
            <thead><tr className="border-b border-zinc-800 text-zinc-500"><th className="py-1 pr-2 font-medium">{t("trace.name")}</th><th className="px-2 py-1 font-medium">{t("trace.type")}</th><th className="py-1 pl-2 font-medium">{t("trace.value")}</th></tr></thead>
            <tbody>{frame.variables.map((variable) => (
              <tr key={variable.name} className="border-b border-zinc-900 font-mono text-zinc-200">
                <th scope="row" className="py-2 pr-2 font-medium">{variable.name}</th>
                <td className="px-2 py-2 text-zinc-500">{variable.typeLabel ?? "—"}</td>
                <td className="py-2 pl-2">{formatPrimitive(variable.value)}</td>
              </tr>
            ))}</tbody>
          </table>
        </div>
      ) : null}
      {visuals?.map((visual, index) => <TraceVisual key={`${visual.kind}-${visual.label}-${index}`} visual={visual} />)}
    </div>
  );
}

function TraceVisual({ visual }: { readonly visual: GuideTraceVisual }): React.JSX.Element {
  const { t } = useTranslation("bruteForce");
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
    case "tree": {
      const depths = [...new Set(visual.nodes.map((node) => node.depth))].sort((a, b) => a - b);
      const completed = new Set(visual.completedIds ?? []);
      return (
        <VisualPanel label={visual.label}>
          <div className="max-w-full overflow-x-auto pb-1">
            <div className="min-w-max space-y-3" role="tree" aria-label={visual.label}>
              {depths.map((depth) => (
                <div key={depth} className="flex items-center justify-center gap-2" role="group" aria-label={t("trace.tree.depth", { depth })}>
                  {visual.nodes.filter((node) => node.depth === depth).map((node) => {
                    const active = visual.activeId === node.id;
                    return (
                      <div
                        key={node.id}
                        role="treeitem"
                        aria-current={active ? "step" : undefined}
                        aria-label={node.label}
                        className={cn(
                          "relative min-w-10 border px-2 py-1.5 text-center font-mono text-[10px]",
                          active && "border-cyan-300 bg-cyan-300/15 text-cyan-100",
                          !active && completed.has(node.id) && "border-emerald-500/50 bg-emerald-400/10 text-emerald-200",
                          !active && !completed.has(node.id) && "border-zinc-700 bg-zinc-950 text-zinc-400"
                        )}
                      >
                        {depth > 0 ? <span className="absolute -top-3 left-1/2 h-3 border-l border-zinc-700" aria-hidden="true" /> : null}
                        {node.label}
                      </div>
                    );
                  })}
                </div>
              ))}
            </div>
          </div>
        </VisualPanel>
      );
    }
    case "grid":
      return (
        <VisualPanel label={visual.label}>
          <div className="max-w-full overflow-x-auto">
            <table className="mx-auto border-collapse" aria-label={visual.label}>
              <tbody>
                {visual.cells.map((row, rowIndex) => (
                  <tr key={rowIndex}>
                    {row.map((cell, columnIndex) => (
                      <GridCell key={columnIndex} cell={cell} row={rowIndex + 1} column={columnIndex + 1} t={t} />
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </VisualPanel>
      );
  }
}

function GridCell({
  cell,
  row,
  column,
  t
}: {
  readonly cell: Extract<GuideTraceVisual, { readonly kind: "grid" }>["cells"][number][number];
  readonly row: number;
  readonly column: number;
  readonly t: TFunction<"bruteForce">;
}): React.JSX.Element {
  const empty = cell.value === null || cell.value === 0 || cell.value === "";
  const tone = cell.tone ?? "default";
  const visibleValue = empty ? "·" : formatPrimitive(cell.value);
  const accessibleValue = empty ? t("trace.grid.empty") : formatPrimitive(cell.value);
  return (
    <td
      aria-label={t("trace.grid.cell", {
        row,
        column,
        value: accessibleValue,
        state: t(`trace.grid.states.${tone}`)
      })}
      className={cn(
        "size-7 border border-zinc-700 p-0 text-center font-mono text-[10px]",
        row > 1 && (row - 1) % 3 === 0 && "border-t-2 border-t-zinc-500",
        column > 1 && (column - 1) % 3 === 0 && "border-l-2 border-l-zinc-500",
        tone === "default" && "bg-zinc-950 text-zinc-500",
        tone === "fixed" && "bg-zinc-900 text-zinc-200",
        tone === "active" && "bg-amber-400/20 text-amber-100",
        tone === "accepted" && "bg-emerald-400/20 text-emerald-100",
        tone === "rejected" && "bg-rose-400/20 text-rose-100"
      )}
    >
      {visibleValue}
    </td>
  );
}

function VisualPanel({ label, children }: { readonly label: string; readonly children: React.ReactNode }): React.JSX.Element {
  return <section className="rounded-md border border-zinc-800 bg-zinc-900/35 p-3"><h3 className="mb-2 font-mono text-[10px] uppercase tracking-[0.14em] text-zinc-500">{label}</h3>{children}</section>;
}

function formatPrimitive(value: GuideTracePrimitive): string {
  if (value === null) return "null";
  if (typeof value === "boolean") return String(value);
  return String(value);
}

function usePrefersReducedMotion(): boolean {
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
