import { ChevronLeft, ChevronRight, Pause, Play, RotateCcw } from "lucide-react";
import { useEffect, useId, useState } from "react";
import { useTranslation } from "react-i18next";

import { cn } from "../lib.js";
import type { GuideTraceVisual } from "./guideTrace.js";
import { TraceVisual, usePrefersReducedMotion } from "./GuideTraceVisuals.js";

export interface ScenarioFrame {
  readonly narration: string;
  readonly visuals: readonly GuideTraceVisual[];
}

export interface ScenarioPreset {
  readonly id: string;
  readonly label: string;
  readonly description: string;
  readonly frames: readonly ScenarioFrame[];
}

export interface ScenarioPlayerProps {
  readonly label: string;
  readonly presets: readonly ScenarioPreset[];
  readonly intervalMs?: number;
  readonly accent?: "emerald" | "cyan" | "violet" | "amber" | "rose";
}

const accentClasses = {
  emerald: { tab: "border-emerald-300 text-emerald-100", counter: "text-emerald-300", play: "bg-emerald-500 focus-visible:ring-emerald-300" },
  cyan: { tab: "border-cyan-300 text-cyan-100", counter: "text-cyan-300", play: "bg-cyan-500 focus-visible:ring-cyan-300" },
  violet: { tab: "border-violet-300 text-violet-100", counter: "text-violet-300", play: "bg-violet-500 focus-visible:ring-violet-300" },
  amber: { tab: "border-amber-300 text-amber-100", counter: "text-amber-300", play: "bg-amber-500 focus-visible:ring-amber-300" },
  rose: { tab: "border-rose-300 text-rose-100", counter: "text-rose-300", play: "bg-rose-500 focus-visible:ring-rose-300" }
} as const;

export function ScenarioPlayer({ label, presets, intervalMs = 1400, accent = "emerald" }: ScenarioPlayerProps): React.JSX.Element {
  const { t } = useTranslation("programmingFundamentals");
  const [selectedId, setSelectedId] = useState(() => presets[0]?.id ?? "");
  const [frameIndex, setFrameIndex] = useState(0);
  const [playing, setPlaying] = useState(false);
  const reducedMotion = usePrefersReducedMotion();
  const rawId = useId().replace(/:/g, "");
  const reducedMotionId = `scenario-${rawId}-reduced-motion`;
  const selectedPreset = presets.find((preset) => preset.id === selectedId) ?? presets[0];
  const frames = selectedPreset?.frames ?? [];
  const frame = frames[frameIndex];
  const finalFrame = frameIndex >= frames.length - 1;
  const colors = accentClasses[accent];
  const graphWithSidebar = frame?.visuals[0]?.kind === "graph" && frame.visuals.length > 1;

  useEffect(() => {
    if (!playing || reducedMotion || finalFrame) return;
    const timer = window.setTimeout(() => setFrameIndex((current) => Math.min(frames.length - 1, current + 1)), intervalMs);
    return () => window.clearTimeout(timer);
  }, [finalFrame, frameIndex, frames.length, intervalMs, playing, reducedMotion]);

  useEffect(() => {
    if (reducedMotion || finalFrame) setPlaying(false);
  }, [finalFrame, reducedMotion]);

  const moveTo = (nextIndex: number): void => {
    setPlaying(false);
    setFrameIndex(Math.max(0, Math.min(frames.length - 1, nextIndex)));
  };
  const selectPreset = (id: string): void => {
    setSelectedId(id);
    setFrameIndex(0);
    setPlaying(false);
  };

  return (
    <section aria-label={label} data-scenario-player="true" className="my-8 min-w-0 overflow-hidden rounded-xl border border-zinc-800 bg-zinc-950/70">
      {selectedPreset === undefined || frame === undefined ? (
        <p className="p-5 text-sm text-zinc-400">{t("scenario.unavailable")}</p>
      ) : (
        <>
          <div className="border-b border-zinc-800 p-4 sm:p-5">
            <div className="overflow-x-auto overflow-y-hidden border-b border-zinc-800 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
              <div role="tablist" aria-label={t("scenario.presets")} className="-mb-px flex min-w-max gap-5">
              {presets.map((preset, presetIndex) => {
                const selected = preset.id === selectedPreset.id;
                return (
                  <button
                    key={preset.id}
                    type="button"
                    role="tab"
                    aria-selected={selected}
                    tabIndex={selected ? 0 : -1}
                    data-scenario-preset={preset.id}
                    className={cn(
                      "min-h-10 whitespace-nowrap border-b-2 border-transparent px-1 pb-2.5 pt-1 text-sm font-semibold outline-none transition-colors motion-reduce:transition-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-zinc-300",
                      selected ? colors.tab : "text-zinc-500 hover:border-zinc-600 hover:text-zinc-200"
                    )}
                    onClick={() => selectPreset(preset.id)}
                    onKeyDown={(event) => {
                      let nextIndex: number | undefined;
                      if (event.key === "ArrowLeft") nextIndex = (presetIndex - 1 + presets.length) % presets.length;
                      if (event.key === "ArrowRight") nextIndex = (presetIndex + 1) % presets.length;
                      if (event.key === "Home") nextIndex = 0;
                      if (event.key === "End") nextIndex = presets.length - 1;
                      if (nextIndex === undefined) return;
                      event.preventDefault();
                      const nextPreset = presets[nextIndex];
                      if (nextPreset === undefined) return;
                      selectPreset(nextPreset.id);
                      const tabs = event.currentTarget.parentElement?.querySelectorAll<HTMLElement>("[role='tab']");
                      tabs?.[nextIndex]?.focus();
                    }}
                  >
                    {preset.label}
                  </button>
                );
              })}
              </div>
            </div>
            <p className="mt-3 text-sm leading-6 text-zinc-400">{selectedPreset.description}</p>
          </div>
          <div className="grid min-w-0 gap-5 p-4 sm:p-5">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <strong className={cn("font-mono text-xs", colors.counter)}>{t("trace.stepCount", { current: frameIndex + 1, total: frames.length })}</strong>
              <div className="flex flex-wrap gap-1.5">
                <ScenarioButton label={t("trace.previous")} disabled={frameIndex === 0} onClick={() => moveTo(frameIndex - 1)}><ChevronLeft /></ScenarioButton>
                <ScenarioButton label={t("trace.next")} disabled={finalFrame} onClick={() => moveTo(frameIndex + 1)}><ChevronRight /></ScenarioButton>
                <ScenarioButton label={t("trace.reset")} onClick={() => moveTo(0)}><RotateCcw /></ScenarioButton>
                <button
                  type="button"
                  disabled={finalFrame || reducedMotion}
                  aria-pressed={playing}
                  aria-describedby={reducedMotion ? reducedMotionId : undefined}
                  className={cn("inline-flex items-center gap-1.5 rounded-md px-2.5 py-2 text-xs font-semibold text-white focus-visible:outline-none focus-visible:ring-2 disabled:opacity-40", colors.play)}
                  onClick={() => {
                    if (!reducedMotion && !finalFrame) setPlaying((current) => !current);
                  }}
                >
                  {playing ? <Pause className="size-3.5" aria-hidden="true" /> : <Play className="size-3.5" aria-hidden="true" />}
                  {playing ? t("trace.pause") : t("trace.play")}
                </button>
              </div>
            </div>
            {reducedMotion ? <p id={reducedMotionId} className="text-xs leading-5 text-zinc-500">{t("trace.reducedMotion")}</p> : null}
            <p className="border-l-2 border-zinc-600 pl-3 leading-6 text-zinc-200" role="status" aria-live="polite">{frame.narration}</p>
            {graphWithSidebar ? (
              <div className="grid min-w-0 gap-4 lg:grid-cols-[minmax(0,1.35fr)_minmax(16rem,.65fr)] lg:items-start">
                <TraceVisual visual={frame.visuals[0]!} />
                <div className="grid min-w-0 gap-4">
                  {frame.visuals.slice(1).map((visual, index) => <TraceVisual key={`${visual.kind}-${visual.label}-${index + 1}`} visual={visual} />)}
                </div>
              </div>
            ) : (
              <div className="grid min-w-0 gap-4">
                {frame.visuals.map((visual, index) => <TraceVisual key={`${visual.kind}-${visual.label}-${index}`} visual={visual} />)}
              </div>
            )}
          </div>
        </>
      )}
    </section>
  );
}

function ScenarioButton({ label, disabled = false, onClick, children }: {
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
      className="rounded-md border border-zinc-700 p-2 text-zinc-300 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-zinc-300 disabled:opacity-40"
      onClick={onClick}
    >
      {children}
    </button>
  );
}
