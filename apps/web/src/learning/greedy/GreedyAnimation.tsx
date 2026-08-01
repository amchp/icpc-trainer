import { ChevronLeft, ChevronRight, Pause, Play, RotateCcw } from "lucide-react";
import { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";

import { cn } from "../../lib.js";

export const greedyFieldClass: string = "min-w-0 rounded-md border border-zinc-700 bg-zinc-950 px-3 py-2 font-mono text-sm text-zinc-100 outline-none focus-visible:ring-2 focus-visible:ring-emerald-300";

export function usePrefersReducedMotion(): boolean {
  const [reduced, setReduced] = useState(false);
  useEffect(() => {
    const media = window.matchMedia("(prefers-reduced-motion: reduce)");
    const update = (): void => setReduced(media.matches);
    update();
    media.addEventListener("change", update);
    return () => media.removeEventListener("change", update);
  }, []);
  return reduced;
}

export function useStepPlayer(total: number): {
  readonly index: number;
  readonly playing: boolean;
  readonly reducedMotion: boolean;
  readonly last: number;
  readonly move: (next: number) => void;
  readonly toggle: () => void;
} {
  const [index, setIndex] = useState(0);
  const [playing, setPlaying] = useState(false);
  const reducedMotion = usePrefersReducedMotion();
  const last = Math.max(0, total - 1);
  useEffect(() => {
    setIndex(0);
    setPlaying(false);
  }, [total]);
  useEffect(() => {
    if (!playing || reducedMotion || index >= last) return;
    const timer = window.setTimeout(() => setIndex((current) => Math.min(last, current + 1)), 1_100);
    return () => window.clearTimeout(timer);
  }, [index, last, playing, reducedMotion]);
  useEffect(() => {
    if (index >= last || reducedMotion) setPlaying(false);
  }, [index, last, reducedMotion]);
  const move = (next: number): void => {
    setPlaying(false);
    setIndex(Math.max(0, Math.min(last, next)));
  };
  return { index, playing, reducedMotion, last, move, toggle: () => setPlaying((value) => !value) };
}

export function GreedyLabShell({ label, children }: { readonly label: string; readonly children: React.ReactNode }): React.JSX.Element {
  return (
    <section aria-label={label} className="my-8 min-w-0 overflow-hidden rounded-xl border border-emerald-400/25 bg-emerald-400/[0.025]">
      <div className="border-b border-zinc-800 px-4 py-2.5 font-mono text-[10px] font-semibold uppercase tracking-[0.16em] text-emerald-300">{label}</div>
      <div className="min-w-0 p-4">{children}</div>
    </section>
  );
}

export function GreedyErrorText({ children }: { readonly children: React.ReactNode }): React.JSX.Element {
  return <p role="alert" className="mt-3 text-sm text-rose-300">{children}</p>;
}

function IconButton({
  label,
  disabled = false,
  onClick,
  children
}: {
  readonly label: string;
  readonly disabled?: boolean;
  readonly onClick: () => void;
  readonly children: React.ReactElement<{ className?: string; "aria-hidden"?: boolean }>;
}): React.JSX.Element {
  return (
    <button type="button" aria-label={label} disabled={disabled} className="grid size-9 place-items-center rounded-md border border-zinc-700 text-zinc-300 outline-none focus-visible:ring-2 focus-visible:ring-emerald-300 disabled:opacity-40" onClick={onClick}>
      {children}
    </button>
  );
}

export function GreedyStepControls({
  total,
  player,
  narration
}: {
  readonly total: number;
  readonly player: ReturnType<typeof useStepPlayer>;
  readonly narration: string;
}): React.JSX.Element {
  const { t } = useTranslation("greedy");
  if (total === 0) return <p className="text-sm text-zinc-500">{t("controls.noSteps")}</p>;
  return (
    <div className="min-w-0">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <strong className="font-mono text-xs text-emerald-300">{t("controls.step", { current: player.index + 1, total })}</strong>
        <div className="flex flex-wrap gap-1.5">
          <IconButton label={t("controls.previous")} disabled={player.index === 0} onClick={() => player.move(player.index - 1)}><ChevronLeft className="size-4" aria-hidden="true" /></IconButton>
          <IconButton label={t("controls.next")} disabled={player.index === player.last} onClick={() => player.move(player.index + 1)}><ChevronRight className="size-4" aria-hidden="true" /></IconButton>
          <IconButton label={t("controls.reset")} onClick={() => player.move(0)}><RotateCcw className="size-4" aria-hidden="true" /></IconButton>
          <button
            type="button"
            disabled={player.reducedMotion || player.index === player.last}
            aria-pressed={player.playing}
            className="inline-flex min-h-9 items-center gap-1.5 rounded-md bg-emerald-400 px-3 py-2 text-xs font-semibold text-zinc-950 outline-none focus-visible:ring-2 focus-visible:ring-emerald-200 disabled:opacity-40"
            onClick={player.toggle}
          >
            {player.playing ? <Pause className="size-3.5" aria-hidden="true" /> : <Play className="size-3.5" aria-hidden="true" />}
            {player.playing ? t("controls.pause") : t("controls.play")}
          </button>
        </div>
      </div>
      {player.reducedMotion ? <p className="mt-3 text-xs text-zinc-500">{t("controls.reducedMotion")}</p> : null}
      <p aria-live="polite" role="status" className="mt-4 rounded-md border border-zinc-800 bg-zinc-950/70 px-3 py-2 text-sm leading-6 text-zinc-300">{narration}</p>
    </div>
  );
}

export function CoinChip({ value, tone }: { readonly value: number; readonly tone: "picked" | "candidate" | "idle" | "rejected" }): React.JSX.Element {
  return (
    <span className={cn(
      "inline-grid min-h-10 min-w-10 place-items-center rounded-full border px-2 font-mono text-xs font-semibold transition-colors motion-reduce:transition-none",
      tone === "picked" && "border-emerald-400/70 bg-emerald-400/15 text-emerald-200",
      tone === "candidate" && "border-amber-300 bg-amber-300/15 text-amber-100",
      tone === "idle" && "border-zinc-700 bg-zinc-900 text-zinc-400",
      tone === "rejected" && "border-zinc-800 bg-zinc-950 text-zinc-600"
    )}>{value}</span>
  );
}

export function CoinLane({
  label,
  coins,
  remaining,
  remainingLabel,
  tone
}: {
  readonly label: string;
  readonly coins: readonly number[];
  readonly remaining: number;
  readonly remainingLabel: string;
  readonly tone: "emerald" | "rose";
}): React.JSX.Element {
  return (
    <div className={cn("min-w-0 rounded-lg border p-4", tone === "emerald" ? "border-emerald-400/30 bg-emerald-400/[0.04]" : "border-rose-400/30 bg-rose-400/[0.04]")}>
      <div className="flex flex-wrap items-center justify-between gap-2">
        <strong className={cn("text-sm", tone === "emerald" ? "text-emerald-200" : "text-rose-200")}>{label}</strong>
        <span className="font-mono text-xs text-zinc-400">{remainingLabel}: {remaining}</span>
      </div>
      <div className="mt-3 flex min-h-10 min-w-0 gap-2 overflow-x-auto pb-1">
        {coins.length === 0 ? <span className="text-sm text-zinc-600">—</span> : coins.map((coin, index) => <CoinChip key={`${coin}-${index}`} value={coin} tone={tone === "emerald" ? "picked" : "candidate"} />)}
      </div>
    </div>
  );
}

export function IntervalTimeline({
  rows,
  min,
  max,
  cursor,
  label
}: {
  readonly rows: readonly { readonly id: string; readonly start: number; readonly finish: number; readonly tone: "accepted" | "rejected" | "candidate" | "idle" }[];
  readonly min: number;
  readonly max: number;
  readonly cursor: number | null;
  readonly label: string;
}): React.JSX.Element {
  const range = Math.max(1, max - min);
  const position = (value: number): number => ((value - min) / range) * 100;
  return (
    <div role="img" aria-label={label} className="min-w-0 overflow-x-auto rounded-lg border border-zinc-800 bg-zinc-950 p-3">
      <div className="relative min-w-[28rem] space-y-2">
        {cursor === null ? null : <span className="absolute bottom-0 top-0 z-10 border-l border-dashed border-amber-300" style={{ left: `${position(cursor)}%` }} aria-hidden="true" />}
        {rows.map((row) => (
          <div key={row.id} className="relative h-7 border-b border-zinc-800/70">
            <span className="absolute left-0 top-1 font-mono text-[10px] text-zinc-500">{row.id}</span>
            <span
              className={cn(
                "absolute top-1 h-5 rounded-sm border transition-colors motion-reduce:transition-none",
                row.tone === "accepted" && "border-emerald-400 bg-emerald-400/25",
                row.tone === "candidate" && "border-amber-300 bg-amber-300/25",
                row.tone === "rejected" && "border-zinc-700 bg-zinc-800/60",
                row.tone === "idle" && "border-zinc-700 bg-zinc-900"
              )}
              style={{ left: `${position(row.start)}%`, width: `${Math.max(1, position(row.finish) - position(row.start))}%` }}
            />
          </div>
        ))}
      </div>
    </div>
  );
}

export function BalanceTotals({ mineLabel, theirsLabel, mine, theirs, strictlyGreater }: { readonly mineLabel: string; readonly theirsLabel: string; readonly mine: number; readonly theirs: number; readonly strictlyGreater: boolean }): React.JSX.Element {
  return (
    <div className="grid grid-cols-2 gap-px overflow-hidden rounded-lg border border-zinc-800 bg-zinc-800">
      <div className="min-w-0 bg-zinc-950 p-4"><span className="text-xs text-zinc-500">{mineLabel}</span><strong className={cn("mt-1 block font-mono text-2xl", strictlyGreater ? "text-emerald-200" : "text-rose-200")}>{mine}</strong></div>
      <div className="min-w-0 bg-zinc-950 p-4"><span className="text-xs text-zinc-500">{theirsLabel}</span><strong className="mt-1 block font-mono text-2xl text-zinc-200">{theirs}</strong></div>
    </div>
  );
}

export function StringScanner({ input, cursor, matchedIndices, target, nextTargetIndex, label }: { readonly input: string; readonly cursor: number | null; readonly matchedIndices: readonly number[]; readonly target: string; readonly nextTargetIndex: number; readonly label: string }): React.JSX.Element {
  const matched = new Set(matchedIndices);
  return (
    <div role="img" aria-label={label} className="min-w-0 overflow-x-auto rounded-lg border border-zinc-800 bg-zinc-950 p-4">
      <div className="flex min-w-max gap-1.5">
        {[...input].map((letter, index) => <span key={index} className={cn("grid size-8 place-items-center rounded border font-mono text-sm transition-colors motion-reduce:transition-none", matched.has(index) ? "border-emerald-400 bg-emerald-400/15 text-emerald-200" : cursor === index ? "border-amber-300 bg-amber-300/15 text-amber-100" : cursor !== null && index < cursor ? "border-zinc-800 text-zinc-600" : "border-zinc-700 text-zinc-300")}>{letter}</span>)}
      </div>
      <div className="mt-4 flex gap-1.5" aria-hidden="true">
        {[...target].map((letter, index) => <span key={index} className={cn("grid size-8 place-items-center rounded border font-mono text-sm", index < nextTargetIndex ? "border-emerald-400 bg-emerald-400/15 text-emerald-200" : "border-zinc-700 text-zinc-600")}>{index < nextTargetIndex ? letter : "·"}</span>)}
      </div>
    </div>
  );
}

export function SignBlockStrip({ values, blocks, cursor, openStart, bestIndex, label }: { readonly values: readonly number[]; readonly blocks: readonly { readonly start: number; readonly end: number; readonly sign: 1 | -1; readonly chosenIndex: number }[]; readonly cursor: number | null; readonly openStart: number | null; readonly bestIndex: number | null; readonly label: string }): React.JSX.Element {
  const byIndex = (index: number) => blocks.find((block) => index >= block.start && index <= block.end);
  return (
    <div role="img" aria-label={label} className="min-w-0 overflow-x-auto rounded-lg border border-zinc-800 bg-zinc-950 p-4">
      <div className="flex min-w-max gap-2">
        {values.map((value, index) => {
          const block = byIndex(index);
          const chosen = block?.chosenIndex === index || bestIndex === index;
          const open = openStart !== null && index >= openStart;
          return <span key={index} className={cn("grid min-h-11 min-w-11 place-items-center rounded-md border px-2 font-mono text-sm transition-colors motion-reduce:transition-none", chosen ? "border-emerald-400 bg-emerald-400/15 text-emerald-100" : cursor === index ? "border-amber-300 bg-amber-300/15 text-amber-100" : block?.sign === 1 || (open && value > 0) ? "border-cyan-400/40 bg-cyan-400/[0.05] text-cyan-200" : block?.sign === -1 || open ? "border-violet-400/40 bg-violet-400/[0.05] text-violet-200" : "border-zinc-700 text-zinc-400")}>{value}</span>;
        })}
      </div>
    </div>
  );
}
