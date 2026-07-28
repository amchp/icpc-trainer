import { Check, ChevronRight, CornerUpLeft, Pause, Play, RotateCcw } from "lucide-react";
import { useEffect, useState } from "react";

import { cn } from "../lib.js";

const INITIAL = [
  [5, 3, 0, 0, 0, 8, 0, 0, 0],
  [6, 7, 2, 1, 0, 0, 3, 4, 0],
  [1, 0, 8, 3, 4, 0, 5, 0, 0],
  [0, 5, 0, 0, 0, 1, 4, 0, 3],
  [0, 2, 6, 8, 0, 0, 0, 0, 1],
  [0, 0, 0, 0, 2, 0, 0, 0, 6],
  [0, 6, 0, 5, 0, 0, 0, 8, 4],
  [0, 0, 0, 0, 1, 0, 0, 0, 0],
  [3, 4, 0, 2, 8, 6, 1, 0, 9]
] as const;

type SudokuEventKind = "start" | "reject" | "place" | "undo" | "solved";

export type SudokuSearchEvent = {
  readonly kind: SudokuEventKind;
  readonly row?: number;
  readonly column?: number;
  readonly digit?: number;
  readonly depth: number;
  readonly board: readonly (readonly number[])[];
  readonly tested: number;
  readonly rejected: number;
  readonly placed: number;
  readonly backtracked: number;
};

type SimulatorCopy = {
  readonly label: string;
  readonly description: string;
  readonly searchRule: string;
  readonly play: string;
  readonly pause: string;
  readonly next: string;
  readonly nextBacktrack: string;
  readonly reset: string;
  readonly complete: string;
  readonly progress: string;
  readonly start: string;
  readonly rejected: string;
  readonly placed: string;
  readonly undone: string;
  readonly solved: string;
  readonly candidateLabel: string;
  readonly counters: {
    readonly tested: string;
    readonly rejected: string;
    readonly backtracked: string;
  };
  readonly reducedMotion: string;
  readonly fixedCell: string;
  readonly tentativeCell: string;
  readonly rejectedCell: string;
  readonly backtrackedCell: string;
  readonly emptyCell: string;
};

const SEARCH_EVENTS = buildSudokuSearchEvents();

export function SudokuStrategySimulator({ copy }: { readonly copy: SimulatorCopy }): React.JSX.Element {
  const [step, setStep] = useState(0);
  const [playing, setPlaying] = useState(false);
  const reducedMotion = usePrefersReducedMotion();
  const event = SEARCH_EVENTS[step]!;
  const complete = event.kind === "solved";
  const nextBacktrack = SEARCH_EVENTS.findIndex((candidate, index) => index > step && candidate.kind === "undo");

  useEffect(() => {
    if (!playing || reducedMotion || complete) return;
    const timer = window.setTimeout(() => setStep((current) => Math.min(SEARCH_EVENTS.length - 1, current + 1)), 35);
    return () => window.clearTimeout(timer);
  }, [complete, playing, reducedMotion, step]);

  useEffect(() => {
    if (complete || reducedMotion) setPlaying(false);
  }, [complete, reducedMotion]);

  return (
    <section className="my-8 overflow-hidden rounded-lg border border-emerald-400/25 bg-[#0d1117]" aria-label={copy.label}>
      <div className="border-b border-zinc-800 bg-emerald-400/[0.05] p-4 sm:flex sm:items-center sm:justify-between sm:gap-5">
        <div>
          <h6 className="font-semibold text-emerald-100">{copy.label}</h6>
          <p className="mt-1 max-w-2xl text-xs leading-5 text-zinc-400">{copy.description}</p>
        </div>
        <div className="mt-4 flex flex-wrap gap-2 sm:mt-0">
          <Control label={copy.reset} onClick={() => { setPlaying(false); setStep(0); }}><RotateCcw /></Control>
          <Control label={copy.next} disabled={complete} onClick={() => { setPlaying(false); setStep((current) => Math.min(SEARCH_EVENTS.length - 1, current + 1)); }}><ChevronRight /></Control>
          <Control label={copy.nextBacktrack} disabled={nextBacktrack === -1} onClick={() => { setPlaying(false); setStep(nextBacktrack); }}><CornerUpLeft /></Control>
          <button
            type="button"
            disabled={complete || reducedMotion}
            aria-pressed={playing}
            className="inline-flex min-h-10 items-center gap-2 rounded-md bg-emerald-500 px-3 py-2 text-xs font-semibold text-zinc-950 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-200 disabled:opacity-40"
            onClick={() => setPlaying((current) => !current)}
          >
            {playing ? <Pause className="size-4" aria-hidden="true" /> : complete ? <Check className="size-4" aria-hidden="true" /> : <Play className="size-4" aria-hidden="true" />}
            {playing ? copy.pause : complete ? copy.complete : copy.play}
          </button>
        </div>
      </div>

      <div className="grid gap-5 p-4 sm:p-6 lg:grid-cols-[auto_1fr] lg:items-start">
        <div className="max-w-full overflow-x-auto">
          <table className="border-collapse" aria-label={copy.label}>
            <tbody>
              {event.board.map((row, rowIndex) => (
                <tr key={rowIndex}>
                  {row.map((boardValue, columnIndex) => {
                    const fixed = INITIAL[rowIndex]![columnIndex] !== 0;
                    const current = event.row === rowIndex && event.column === columnIndex;
                    const visibleValue = current && event.kind === "reject" ? event.digit! : boardValue;
                    const visibleLabel = current && event.kind === "undo" ? "↶" : visibleValue || "·";
                    const state = fixed
                      ? copy.fixedCell
                      : current && event.kind === "reject"
                        ? copy.rejectedCell
                        : current && event.kind === "place"
                          ? copy.tentativeCell
                          : current && event.kind === "undo"
                            ? copy.backtrackedCell
                            : boardValue === 0 ? copy.emptyCell : copy.tentativeCell;
                    return (
                      <td
                        key={columnIndex}
                        aria-label={`${rowIndex + 1}, ${columnIndex + 1}: ${visibleLabel}, ${state}`}
                        className={cn(
                          "size-8 border border-zinc-700 p-0 text-center font-mono text-xs sm:size-9",
                          rowIndex > 0 && rowIndex % 3 === 0 && "border-t-2 border-t-zinc-400",
                          columnIndex > 0 && columnIndex % 3 === 0 && "border-l-2 border-l-zinc-400",
                          fixed && "bg-zinc-900 text-zinc-200",
                          !fixed && boardValue === 0 && !current && "bg-zinc-950 text-zinc-700",
                          !fixed && boardValue !== 0 && !current && "bg-emerald-400/10 text-emerald-200",
                          current && event.kind === "reject" && "bg-rose-400/25 text-rose-100 ring-2 ring-inset ring-rose-300",
                          current && event.kind === "place" && "bg-emerald-300/30 text-emerald-50 ring-2 ring-inset ring-emerald-300",
                          current && event.kind === "undo" && "bg-amber-400/25 text-amber-100 ring-2 ring-inset ring-amber-300"
                        )}
                      >
                        {visibleLabel}
                      </td>
                    );
                  })}
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        <div className="grid gap-4">
          <div role={playing ? undefined : "status"} aria-live={playing ? "off" : "polite"} className="rounded-md border border-zinc-800 bg-zinc-900/55 p-4">
            <p className="font-mono text-[10px] uppercase tracking-[0.15em] text-emerald-300">
              {format(copy.progress, { current: step, total: SEARCH_EVENTS.length - 1 })}
            </p>
            <p className="mt-3 text-sm leading-6 text-zinc-300">{eventNarration(event, copy)}</p>
            <p className="mt-3 border-l border-zinc-700 pl-3 text-xs leading-5 text-zinc-500">{copy.searchRule}</p>
            {reducedMotion ? <p className="mt-3 text-xs leading-5 text-zinc-500">{copy.reducedMotion}</p> : null}
          </div>

          <section className="rounded-md border border-zinc-800 bg-zinc-900/35 p-3">
            <h6 className="font-mono text-[10px] uppercase tracking-[0.14em] text-zinc-500">{copy.candidateLabel}</h6>
            <div className="mt-3 grid grid-cols-9 gap-1">
              {Array.from({ length: 9 }, (_, index) => index + 1).map((digit) => (
                <span
                  key={digit}
                  aria-current={event.digit === digit ? "step" : undefined}
                  className={cn(
                    "grid aspect-square place-items-center border font-mono text-[10px]",
                    event.digit !== digit && "border-zinc-800 text-zinc-600",
                    event.digit === digit && event.kind === "reject" && "border-rose-400 bg-rose-400/15 text-rose-100",
                    event.digit === digit && event.kind === "place" && "border-emerald-400 bg-emerald-400/15 text-emerald-100",
                    event.digit === digit && event.kind === "undo" && "border-amber-400 bg-amber-400/15 text-amber-100"
                  )}
                >
                  {digit}
                </span>
              ))}
            </div>
          </section>

          <dl className="grid grid-cols-3 gap-px overflow-hidden rounded-md border border-zinc-800 bg-zinc-800 text-center">
            <Counter label={copy.counters.tested} value={event.tested} tone="text-zinc-100" />
            <Counter label={copy.counters.rejected} value={event.rejected} tone="text-rose-200" />
            <Counter label={copy.counters.backtracked} value={event.backtracked} tone="text-amber-200" />
          </dl>
        </div>
      </div>
    </section>
  );
}

export function buildSudokuSearchEvents(): readonly SudokuSearchEvent[] {
  const board: number[][] = INITIAL.map((row) => [...row]);
  const events: SudokuSearchEvent[] = [];
  let tested = 0;
  let rejected = 0;
  let placed = 0;
  let backtracked = 0;

  const record = (kind: SudokuEventKind, depth: number, row?: number, column?: number, digit?: number): void => {
    events.push({
      kind,
      depth,
      board: board.map((values) => [...values]),
      tested,
      rejected,
      placed,
      backtracked,
      ...(row === undefined ? {} : { row }),
      ...(column === undefined ? {} : { column }),
      ...(digit === undefined ? {} : { digit })
    });
  };

  record("start", 0);

  const solve = (depth: number): boolean => {
    const cell = chooseCell(board);
    if (cell === undefined) {
      record("solved", depth);
      return true;
    }

    for (let digit = 1; digit <= 9; digit += 1) {
      tested += 1;
      if (!isValid(board, cell.row, cell.column, digit)) {
        rejected += 1;
        record("reject", depth, cell.row, cell.column, digit);
        continue;
      }

      board[cell.row]![cell.column] = digit;
      placed += 1;
      record("place", depth, cell.row, cell.column, digit);
      if (solve(depth + 1)) return true;

      board[cell.row]![cell.column] = 0;
      backtracked += 1;
      record("undo", depth, cell.row, cell.column, digit);
    }
    return false;
  };

  solve(0);
  return events;
}

function chooseCell(board: readonly (readonly number[])[]): { readonly row: number; readonly column: number } | undefined {
  for (let row = 0; row < 9; row += 1) {
    for (let column = 0; column < 9; column += 1) {
      if (board[row]![column] === 0) return { row, column };
    }
  }
  return undefined;
}

function isValid(board: readonly (readonly number[])[], row: number, column: number, digit: number): boolean {
  for (let index = 0; index < 9; index += 1) {
    if (board[row]![index] === digit || board[index]![column] === digit) return false;
  }
  const boxRow = row - row % 3;
  const boxColumn = column - column % 3;
  for (let currentRow = boxRow; currentRow < boxRow + 3; currentRow += 1) {
    for (let currentColumn = boxColumn; currentColumn < boxColumn + 3; currentColumn += 1) {
      if (board[currentRow]![currentColumn] === digit) return false;
    }
  }
  return true;
}

function eventNarration(event: SudokuSearchEvent, copy: SimulatorCopy): string {
  if (event.kind === "start") return copy.start;
  if (event.kind === "solved") return copy.solved;
  const values = {
    value: event.digit!,
    row: event.row! + 1,
    column: event.column! + 1,
    depth: event.depth
  };
  if (event.kind === "reject") return format(copy.rejected, values);
  if (event.kind === "place") return format(copy.placed, values);
  return format(copy.undone, values);
}

function Counter({ label, value, tone }: { readonly label: string; readonly value: number; readonly tone: string }): React.JSX.Element {
  return (
    <div className="bg-zinc-950 px-2 py-3">
      <dt className="font-mono text-[9px] uppercase tracking-wide text-zinc-600">{label}</dt>
      <dd className={cn("mt-1 font-mono text-sm", tone)}>{value}</dd>
    </div>
  );
}

function format(template: string, values: Readonly<Record<string, string | number>>): string {
  return Object.entries(values).reduce((text, [key, value]) => text.replace(`{{${key}}}`, String(value)), template);
}

function Control({ label, disabled = false, onClick, children }: { readonly label: string; readonly disabled?: boolean; readonly onClick: () => void; readonly children: React.ReactElement<{ className?: string }> }): React.JSX.Element {
  return <button type="button" aria-label={label} disabled={disabled} className="grid size-10 place-items-center rounded-md border border-zinc-700 text-zinc-300 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-300 disabled:opacity-40" onClick={onClick}>{children}</button>;
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
