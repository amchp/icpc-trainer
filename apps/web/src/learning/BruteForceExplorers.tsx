import { Check, ChevronDown, Play, RotateCcw, Undo2, X } from "lucide-react";
import { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";

import "../i18n/registerBruteForceResources.js";
import { cn } from "../lib.js";

const fieldClass = "min-h-11 rounded-md border border-zinc-700 bg-zinc-950 px-3 py-2 font-mono text-sm text-zinc-100 outline-none focus-visible:border-cyan-400 focus-visible:ring-2 focus-visible:ring-cyan-400/30";

export function SimpleSimulationDemo(): React.JSX.Element {
  const { t } = useTranslation("bruteForce");
  const states = ["red", "yellow", "green"] as const;
  const [step, setStep] = useState(0);
  const state = states[step % states.length]!;
  const nextState = states[(step + 1) % states.length]!;

  return (
    <figure className="my-7 overflow-hidden rounded-xl border border-cyan-400/25 bg-cyan-400/[0.035]">
      <figcaption className="border-b border-zinc-800 px-4 py-2.5">
        <span className="font-mono text-[10px] uppercase tracking-[0.16em] text-cyan-300">{t("simulationDemo.label")}</span>
      </figcaption>
      <div className="grid gap-4 p-4 sm:grid-cols-[13rem_1fr] sm:items-center">
        <div className="mx-auto flex flex-col items-center gap-3 rounded-xl border border-zinc-700 bg-zinc-950 p-4" aria-label={t("simulationDemo.lightLabel")}>
          {states.map((light) => (
            <span
              key={light}
              className={cn(
                "size-10 rounded-full border transition-colors",
                light === state ? lightColor(light) : "border-zinc-700 bg-zinc-900"
              )}
              aria-label={t(`simulationDemo.states.${light}`)}
              data-active={light === state ? "true" : "false"}
            />
          ))}
        </div>
        <div>
          <div className="grid grid-cols-[1fr_auto_1fr] items-center gap-3 font-mono text-xs">
            <TapeCell label={t("simulationDemo.current")} value={t(`simulationDemo.states.${state}`)} active />
            <span className="text-zinc-600">→</span>
            <TapeCell label={t("simulationDemo.rule")} value={t(`simulationDemo.states.${nextState}`)} />
          </div>
          <p className="mt-4 text-sm leading-6 text-zinc-300" aria-live="polite">
            {t("simulationDemo.observation", { step, state: t(`simulationDemo.states.${state}`) })}
          </p>
          <div className="mt-4 flex flex-wrap gap-2">
            <button type="button" className={actionClass("cyan")} onClick={() => setStep((value) => value + 1)}>
              <Play className="size-4" aria-hidden="true" /> {t("simulationDemo.next")}
            </button>
            <button type="button" className={secondaryClass} onClick={() => setStep(0)}>
              <RotateCcw className="size-4" aria-hidden="true" /> {t("simulationDemo.reset")}
            </button>
          </div>
        </div>
      </div>
    </figure>
  );
}

type Direction = "N" | "E" | "S" | "W";
interface AliceVisit { readonly x: number; readonly y: number; readonly cycle: number; readonly move: number }
export interface AliceSimulation { readonly found: AliceVisit | null; readonly visits: readonly AliceVisit[] }

export function simulateAlice(moves: readonly Direction[], targetX: number, targetY: number, cycles = 21): AliceSimulation {
  const visits: AliceVisit[] = [{ x: 0, y: 0, cycle: 0, move: 0 }];
  if (targetX === 0 && targetY === 0) return { found: visits[0]!, visits };
  let x = 0;
  let y = 0;
  for (let cycle = 1; cycle <= cycles; cycle += 1) {
    for (let move = 0; move < moves.length; move += 1) {
      const direction = moves[move]!;
      if (direction === "N") y += 1;
      if (direction === "S") y -= 1;
      if (direction === "E") x += 1;
      if (direction === "W") x -= 1;
      const visit = { x, y, cycle, move: move + 1 };
      visits.push(visit);
      if (x === targetX && y === targetY) return { found: visit, visits };
    }
  }
  return { found: null, visits };
}

export function AliceMoveSimulator(): React.JSX.Element {
  const { t } = useTranslation("bruteForce");
  const [moves, setMoves] = useState<Direction[]>(["N", "N", "E"]);
  const [targetX, setTargetX] = useState(1);
  const [targetY, setTargetY] = useState(2);
  const [result, setResult] = useState<AliceSimulation | null>(null);
  const [visibleStep, setVisibleStep] = useState(0);
  const lastStep = Math.max(0, (result?.visits.length ?? 1) - 1);
  const last = result?.visits[Math.min(visibleStep, lastStep)] ?? { x: 0, y: 0, cycle: 0, move: 0 };
  const animating = result !== null && visibleStep < lastStep;

  useEffect(() => {
    if (result === null || visibleStep >= result.visits.length - 1) return;
    if (typeof window.matchMedia === "function" && window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
      setVisibleStep(result.visits.length - 1);
      return;
    }
    const duration = Math.max(35, Math.min(180, Math.floor(3500 / result.visits.length)));
    const timeout = window.setTimeout(() => setVisibleStep((current) => current + 1), duration);
    return () => window.clearTimeout(timeout);
  }, [result, visibleStep]);

  const addMove = (move: Direction): void => {
    if (moves.length < 10) setMoves((current) => [...current, move]);
    setResult(null);
    setVisibleStep(0);
  };

  const run = (): void => {
    setVisibleStep(0);
    setResult(simulateAlice(moves, targetX, targetY));
  };

  return (
    <figure className="my-7 overflow-hidden rounded-xl border border-cyan-400/25 bg-zinc-950/80" aria-label={t("alice.simulator.label")}>
      <figcaption className="border-b border-zinc-800 px-4 py-2.5">
        <span className="font-mono text-[10px] uppercase tracking-[0.16em] text-cyan-300">{t("alice.simulator.label")}</span>
      </figcaption>
      <div className="grid gap-5 p-4 lg:grid-cols-[minmax(0,1fr)_20rem]">
        <div>
          <fieldset>
            <legend className="font-mono text-[10px] uppercase tracking-[0.14em] text-zinc-500">{t("alice.simulator.moves")}</legend>
            <div className="mt-3 flex flex-wrap gap-2">
              {(["N", "E", "S", "W"] as const).map((direction) => (
                <button key={direction} type="button" className={secondaryClass} onClick={() => addMove(direction)} aria-label={t("alice.simulator.addMove", { direction })}>{direction}</button>
              ))}
              <button type="button" className={secondaryClass} onClick={() => { setMoves((current) => current.slice(0, -1)); setResult(null); setVisibleStep(0); }} disabled={moves.length === 0}>
                <Undo2 className="size-4" aria-hidden="true" /> {t("alice.simulator.undo")}
              </button>
            </div>
          </fieldset>
          <div className="mt-4 flex min-h-12 flex-wrap items-center gap-2 rounded-md border border-zinc-800 bg-zinc-900/50 p-3" aria-label={t("alice.simulator.sequence")}>
            {moves.length > 0 ? moves.map((move, index) => <span key={`${move}-${index}`} className="grid size-8 place-items-center rounded border border-cyan-400/35 bg-cyan-400/10 font-mono text-xs text-cyan-100">{move}</span>) : <span className="text-sm text-zinc-500">{t("alice.simulator.empty")}</span>}
          </div>
          <div className="mt-5 flex flex-wrap items-end gap-3">
            <SelectField
              label={t("alice.simulator.targetX")}
              value={String(targetX)}
              options={numberOptions(1, 10)}
              onChange={(value) => { setTargetX(Number(value)); setResult(null); setVisibleStep(0); }}
              className="w-24"
            />
            <SelectField
              label={t("alice.simulator.targetY")}
              value={String(targetY)}
              options={numberOptions(1, 10)}
              onChange={(value) => { setTargetY(Number(value)); setResult(null); setVisibleStep(0); }}
              className="w-24"
            />
            <button type="button" className={actionClass("cyan")} disabled={moves.length === 0} onClick={run}>
              <Play className="size-4" aria-hidden="true" /> {t("alice.simulator.run")}
            </button>
          </div>
        </div>
        <div className="rounded-lg border border-zinc-800 bg-zinc-900/40 p-4">
          <span className="font-mono text-[10px] uppercase tracking-[0.14em] text-zinc-500">{t("alice.simulator.execution")}</span>
          <div className="mt-3 grid grid-cols-2 gap-2">
            <TapeCell label={t("alice.simulator.position")} value={`(${last.x}, ${last.y})`} active />
            <TapeCell label={t("alice.simulator.checked")} value={String(visibleStep)} />
          </div>
          <div className={cn("mt-3 rounded-md border px-3 py-3 text-sm leading-6", result === null || animating ? "border-zinc-800 text-zinc-400" : result.found ? "border-emerald-400/40 bg-emerald-400/10 text-emerald-100" : "border-rose-400/40 bg-rose-400/10 text-rose-100")} aria-live="polite">
            {result === null
              ? t("alice.simulator.ready")
              : animating
                ? t("alice.simulator.animating", { current: visibleStep, total: lastStep })
                : result.found
                  ? t("alice.simulator.found", { cycle: result.found.cycle, move: result.found.move })
                  : t("alice.simulator.notFound")}
          </div>
          <AliceBoard
            visits={result?.visits ?? [{ x: 0, y: 0, cycle: 0, move: 0 }]}
            visibleStep={visibleStep}
            targetX={targetX}
            targetY={targetY}
            label={t("alice.simulator.path")}
            startLabel={t("path.start")}
            targetLabel={t("path.target")}
          />
        </div>
      </div>
    </figure>
  );
}

interface PlateConstraint { readonly left: string; readonly relation: "<" | ">"; readonly right: string }
export interface KitchenSearch { readonly error: "lineCount" | "syntax" | null; readonly candidates: readonly { readonly order: string; readonly valid: boolean }[]; readonly solutions: readonly string[] }

const plateOrders = permutations(["A", "B", "C", "D", "E"]).map((values) => values.join(""));

export function exploreKitchen(input: string): KitchenSearch {
  const lines = input.split(/\r?\n/).map((line) => line.trim()).filter(Boolean);
  if (lines.length !== 5) return { error: "lineCount", candidates: [], solutions: [] };
  const constraints: PlateConstraint[] = [];
  for (const line of lines) {
    const match = /^([A-E])\s*([<>])\s*([A-E])$/.exec(line);
    if (!match || match[1] === match[3]) return { error: "syntax", candidates: [], solutions: [] };
    constraints.push({ left: match[1]!, relation: match[2] as "<" | ">", right: match[3]! });
  }
  const candidates = plateOrders.map((order) => ({
    order,
    valid: constraints.every(({ left, relation, right }) => relation === "<" ? order.indexOf(left) < order.indexOf(right) : order.indexOf(left) > order.indexOf(right))
  }));
  return { error: null, candidates, solutions: candidates.filter((candidate) => candidate.valid).map((candidate) => candidate.order) };
}

export function KitchenPermutationExplorer(): React.JSX.Element {
  const { t } = useTranslation("bruteForce");
  const [constraints, setConstraints] = useState<PlateConstraint[]>([
    { left: "D", relation: ">", right: "B" },
    { left: "A", relation: ">", right: "D" },
    { left: "E", relation: "<", right: "C" },
    { left: "A", relation: ">", right: "B" },
    { left: "B", relation: ">", right: "C" }
  ]);
  const [search, setSearch] = useState<KitchenSearch | null>(null);
  const plateOptions = ["A", "B", "C", "D", "E"].map((plate) => ({ value: plate, label: plate }));
  const relationOptions = [
    { value: "<", label: t("kitchen.explorer.before") },
    { value: ">", label: t("kitchen.explorer.after") }
  ];
  const updateConstraint = (index: number, field: keyof PlateConstraint, value: string): void => {
    setConstraints((current) => current.map((constraint, currentIndex) => currentIndex === index
      ? { ...constraint, [field]: value } as PlateConstraint
      : constraint));
    setSearch(null);
  };
  const input = constraints.map(({ left, relation, right }) => `${left}${relation}${right}`).join("\n");

  return (
    <figure className="my-7 overflow-hidden rounded-xl border border-violet-400/25 bg-zinc-950/80" aria-label={t("kitchen.explorer.label")}>
      <figcaption className="border-b border-zinc-800 px-4 py-2.5">
        <span className="font-mono text-[10px] uppercase tracking-[0.16em] text-violet-300">{t("kitchen.explorer.label")}</span>
      </figcaption>
      <div className="grid gap-5 p-4 lg:grid-cols-[18rem_1fr]">
        <div>
          <p className="text-xs text-zinc-400">{t("kitchen.explorer.input")}</p>
          <div className="mt-2 grid gap-1.5">
            {constraints.map((constraint, index) => (
              <div key={index} className="grid grid-cols-[1.4rem_1fr_1.75fr_1fr] items-center gap-1.5">
                <span className="font-mono text-[10px] text-zinc-600">{index + 1}</span>
                <SelectField
                  label={t("kitchen.explorer.leftPlate", { number: index + 1 })}
                  value={constraint.left}
                  options={plateOptions}
                  onChange={(value) => updateConstraint(index, "left", value)}
                  hideLabel
                />
                <SelectField
                  label={t("kitchen.explorer.relation", { number: index + 1 })}
                  value={constraint.relation}
                  options={relationOptions}
                  onChange={(value) => updateConstraint(index, "relation", value)}
                  hideLabel
                />
                <SelectField
                  label={t("kitchen.explorer.rightPlate", { number: index + 1 })}
                  value={constraint.right}
                  options={plateOptions}
                  onChange={(value) => updateConstraint(index, "right", value)}
                  hideLabel
                />
              </div>
            ))}
          </div>
          <button type="button" className={cn(actionClass("violet"), "mt-2.5 w-full justify-center")} onClick={() => setSearch(exploreKitchen(input))}>
            <Play className="size-4" aria-hidden="true" /> {t("kitchen.explorer.run")}
          </button>
        </div>
        <div>
          <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
            <TapeCell label={t("kitchen.explorer.generated")} value={String(search?.candidates.length ?? 0)} active={search?.error === null && search !== null} />
            <TapeCell label={t("kitchen.explorer.valid")} value={String(search?.solutions.length ?? 0)} />
            <TapeCell label={t("kitchen.explorer.answer")} value={search?.solutions[0] ?? "—"} />
          </div>
          {search?.error ? <p className="mt-3 rounded-md border border-rose-400/40 bg-rose-400/10 px-3 py-2 text-sm text-rose-100" role="alert">{t(`kitchen.explorer.errors.${search.error}`)}</p> : null}
          {/* auto-fill at a 2.75rem floor: five-letter orders always fit their chip, so the
              grid loses a column rather than spilling the label when the panel narrows. */}
          <div className="mt-3 grid gap-1 [grid-template-columns:repeat(auto-fill,minmax(2.75rem,1fr))]" aria-label={t("kitchen.explorer.candidates")}>
            {(search?.candidates ?? plateOrders.map((order) => ({ order, valid: false }))).map((candidate, index) => (
              <span key={candidate.order} aria-label={search === null ? `${index + 1}: ${candidate.order}` : t("kitchen.explorer.candidateState", { order: candidate.order, state: t(candidate.valid ? "kitchen.explorer.accepted" : "kitchen.explorer.rejected") })} className={cn("rounded border px-1 py-0.5 text-center font-mono text-[10px] leading-4", search === null ? "border-zinc-800 text-zinc-600" : candidate.valid ? "border-emerald-400/50 bg-emerald-400/10 text-emerald-100" : "border-rose-400/20 bg-rose-400/[0.035] text-zinc-500")}>{candidate.order}</span>
            ))}
          </div>
        </div>
      </div>
    </figure>
  );
}

interface SignCandidate { readonly mask: number; readonly signs: readonly number[]; readonly sum: number }
export interface SignSearch { readonly evaluated: number; readonly matches: number; readonly solution: readonly number[] | null; readonly distribution: readonly { readonly sum: number; readonly count: number }[]; readonly samples: readonly SignCandidate[] }

export function exploreSigns(ones: number, twos: number): SignSearch {
  const values = [...Array.from({ length: ones }, () => 1), ...Array.from({ length: twos }, () => 2)];
  const evaluated = 1 << values.length;
  let matches = 0;
  let solution: number[] | null = null;
  let solutionCandidate: SignCandidate | null = null;
  const samples: SignCandidate[] = [];
  const distribution = new Map<number, number>();
  for (let mask = 0; mask < evaluated; mask += 1) {
    const signs = values.map((value, bit) => (mask & (1 << bit)) !== 0 ? value : -value);
    const sum = signs.reduce((total, value) => total + value, 0);
    const candidate = { mask, signs, sum };
    if (mask < 6 || mask === evaluated - 1) samples.push(candidate);
    distribution.set(sum, (distribution.get(sum) ?? 0) + 1);
    if (sum === 0) {
      matches += 1;
      solution ??= signs;
      solutionCandidate ??= candidate;
    }
  }
  if (solutionCandidate !== null && !samples.some(({ mask }) => mask === solutionCandidate?.mask)) samples.splice(Math.min(6, samples.length), 0, solutionCandidate);
  return { evaluated, matches, solution, samples, distribution: [...distribution.entries()].sort(([a], [b]) => a - b).map(([sum, count]) => ({ sum, count })) };
}

export function SignDecisionExplorer(): React.JSX.Element {
  const { t } = useTranslation("bruteForce");
  const [ones, setOnes] = useState(2);
  const [twos, setTwos] = useState(1);
  const [search, setSearch] = useState<SignSearch | null>(null);
  const maxCount = Math.max(1, ...(search?.distribution.map(({ count }) => count) ?? [1]));

  return (
    <figure className="my-7 overflow-hidden rounded-xl border border-violet-400/25 bg-zinc-950/80" aria-label={t("sakurako.explorer.label")}>
      <figcaption className="border-b border-zinc-800 px-4 py-2.5">
        <span className="font-mono text-[10px] uppercase tracking-[0.16em] text-violet-300">{t("sakurako.explorer.label")}</span>
      </figcaption>
      <div className="grid gap-5 p-4 lg:grid-cols-[14rem_1fr]">
        <div>
          <SelectField
            label={t("sakurako.explorer.ones")}
            value={String(ones)}
            options={numberOptions(0, 9)}
            onChange={(value) => { setOnes(Number(value)); setSearch(null); }}
          />
          <SelectField
            label={t("sakurako.explorer.twos")}
            value={String(twos)}
            options={numberOptions(0, 9)}
            onChange={(value) => { setTwos(Number(value)); setSearch(null); }}
            className="mt-3"
          />
          <button type="button" className={cn(actionClass("violet"), "mt-4 w-full justify-center")} onClick={() => setSearch(exploreSigns(ones, twos))}>
            <Play className="size-4" aria-hidden="true" /> {t("sakurako.explorer.run")}
          </button>
        </div>
        <div>
          <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
            <TapeCell label={t("sakurako.explorer.evaluated")} value={String(search?.evaluated ?? 0)} active={search !== null} />
            <TapeCell label={t("sakurako.explorer.matches")} value={String(search?.matches ?? 0)} />
            <TapeCell label={t("sakurako.explorer.result")} value={search === null ? "—" : search.solution ? t("sakurako.explorer.yes") : t("sakurako.explorer.no")} />
          </div>
          {search ? (
            <>
              <div className="mt-5 overflow-hidden rounded-md border border-zinc-800" aria-label={t("sakurako.explorer.tape")}>
                {search.samples.map((candidate) => (
                  <div key={candidate.mask} className="grid grid-cols-[6.5rem_minmax(0,1fr)_auto] items-center gap-2 border-b border-zinc-800 px-3 py-2 text-xs last:border-b-0">
                    <span className="font-mono text-zinc-500">{t("sakurako.explorer.candidate", { number: candidate.mask + 1 })}</span>
                    <span className="truncate font-mono text-zinc-200">{candidate.signs.map((value) => value > 0 ? `+${value}` : String(value)).join(" ")}</span>
                    <span className={cn("font-mono", candidate.sum === 0 ? "text-emerald-300" : "text-rose-300")}>{candidate.sum} · {t(candidate.sum === 0 ? "sakurako.explorer.accepted" : "sakurako.explorer.rejected")}</span>
                  </div>
                ))}
              </div>
              <div className="mt-5 flex h-28 items-end gap-1 overflow-x-auto border-b border-zinc-700 pb-px" aria-label={t("sakurako.explorer.distribution")} role="list">
                {search.distribution.map(({ sum, count }) => <div key={sum} role="listitem" aria-label={t("sakurako.explorer.distributionItem", { sum, count })} className="flex min-w-7 flex-1 flex-col items-center justify-end gap-1"><span className="w-full rounded-t bg-violet-400/55" style={{ height: `${Math.max(4, (count / maxCount) * 80)}px` }} /><span className="font-mono text-[9px] text-zinc-500">{sum}</span></div>)}
              </div>
              <p className={cn("mt-4 flex items-start gap-2 rounded-md border px-3 py-3 text-sm leading-6", search.solution ? "border-emerald-400/40 bg-emerald-400/10 text-emerald-100" : "border-rose-400/40 bg-rose-400/10 text-rose-100")} aria-live="polite">
                {search.solution ? <Check className="mt-1 size-4 shrink-0" aria-hidden="true" /> : <X className="mt-1 size-4 shrink-0" aria-hidden="true" />}
                {search.solution ? t("sakurako.explorer.solution", { signs: search.solution.map((value) => value > 0 ? `+${value}` : String(value)).join(" ") }) : t("sakurako.explorer.noSolution")}
              </p>
            </>
          ) : <p className="mt-5 text-sm text-zinc-500">{t("sakurako.explorer.ready")}</p>}
        </div>
      </div>
    </figure>
  );
}

function AliceBoard({
  visits,
  visibleStep,
  targetX,
  targetY,
  label,
  startLabel,
  targetLabel
}: {
  readonly visits: readonly AliceVisit[];
  readonly visibleStep: number;
  readonly targetX: number;
  readonly targetY: number;
  readonly label: string;
  readonly startLabel: string;
  readonly targetLabel: string;
}): React.JSX.Element {
  const points = [...visits.map(({ x, y }) => [x, y] as const), [targetX, targetY] as const];
  const xs = points.map(([x]) => x);
  const ys = points.map(([, y]) => y);
  const minX = Math.min(...xs, 0) - 1;
  const maxX = Math.max(...xs, 0) + 1;
  const minY = Math.min(...ys, 0) - 1;
  const maxY = Math.max(...ys, 0) + 1;
  const width = Math.max(2, maxX - minX);
  const height = Math.max(2, maxY - minY);
  const mapX = (x: number): number => ((x - minX) / width) * 240 + 30;
  const mapY = (y: number): number => 270 - ((y - minY) / height) * 240;
  const current = visits[Math.min(visibleStep, visits.length - 1)] ?? visits[0]!;
  const visibleVisits = visits.slice(0, Math.min(visibleStep + 1, visits.length));
  const gridSize = Math.max(1, Math.ceil(Math.max(width, height) / 10));
  const xGrid = gridValues(minX, maxX, gridSize);
  const yGrid = gridValues(minY, maxY, gridSize);
  return (
    <svg className="mt-3 aspect-[5/4] w-full rounded-md border border-zinc-800 bg-zinc-950" viewBox="0 0 300 300" role="img" aria-label={label}>
      <g aria-hidden="true">
        {xGrid.map((x) => <line key={`x-${x}`} x1={mapX(x)} y1="30" x2={mapX(x)} y2="270" stroke="rgb(63 63 70 / .55)" strokeWidth="1" />)}
        {yGrid.map((y) => <line key={`y-${y}`} x1="30" y1={mapY(y)} x2="270" y2={mapY(y)} stroke="rgb(63 63 70 / .55)" strokeWidth="1" />)}
        {minX <= 0 && maxX >= 0 ? <line x1={mapX(0)} y1="25" x2={mapX(0)} y2="275" stroke="rgb(113 113 122 / .8)" strokeWidth="1.5" /> : null}
        {minY <= 0 && maxY >= 0 ? <line x1="25" y1={mapY(0)} x2="275" y2={mapY(0)} stroke="rgb(113 113 122 / .8)" strokeWidth="1.5" /> : null}
        <polyline
          points={visibleVisits.map(({ x, y }) => `${mapX(x)},${mapY(y)}`).join(" ")}
          fill="none"
          stroke="rgb(34 211 238 / .65)"
          strokeWidth="3"
          strokeLinecap="round"
          strokeLinejoin="round"
          vectorEffect="non-scaling-stroke"
        />
      </g>
      <g transform={`translate(${mapX(0)} ${mapY(0)})`}>
        <circle r="5" fill="rgb(161 161 170)" />
        <text x="8" y="-8" fill="rgb(161 161 170)" fontSize="10">{startLabel}</text>
      </g>
      <g transform={`translate(${mapX(targetX)} ${mapY(targetY)})`}>
        <circle r="8" fill="rgb(52 211 153 / .18)" stroke="rgb(52 211 153)" strokeWidth="2" />
        <text x="10" y="-10" fill="rgb(110 231 183)" fontSize="10">{targetLabel}</text>
      </g>
      <g
        className="transition-transform duration-100 ease-linear motion-reduce:transition-none"
        style={{ transform: `translate(${mapX(current.x)}px, ${mapY(current.y)}px)` }}
      >
        <circle r="11" fill="rgb(34 211 238 / .18)" />
        <circle r="6" fill="rgb(34 211 238)" stroke="rgb(207 250 254)" strokeWidth="2" />
      </g>
    </svg>
  );
}

function SelectField({
  label,
  value,
  options,
  onChange,
  className,
  hideLabel = false
}: {
  readonly label: string;
  readonly value: string;
  readonly options: readonly { readonly value: string; readonly label: string }[];
  readonly onChange: (value: string) => void;
  readonly className?: string;
  readonly hideLabel?: boolean;
}): React.JSX.Element {
  return (
    <label className={cn("grid min-w-0 gap-1 text-xs text-zinc-400", className)}>
      <span className={hideLabel ? "sr-only" : undefined}>{label}</span>
      <span className="relative min-w-0">
        <select
          aria-label={hideLabel ? label : undefined}
          className={cn(fieldClass, "w-full cursor-pointer appearance-none pr-9")}
          value={value}
          onChange={(event) => onChange(event.target.value)}
        >
          {options.map((option) => <option key={option.value} value={option.value}>{option.label}</option>)}
        </select>
        <ChevronDown className="pointer-events-none absolute right-3 top-1/2 size-4 -translate-y-1/2 text-zinc-500" aria-hidden="true" />
      </span>
    </label>
  );
}

function numberOptions(min: number, max: number): readonly { readonly value: string; readonly label: string }[] {
  return Array.from({ length: max - min + 1 }, (_, index) => {
    const value = String(min + index);
    return { value, label: value };
  });
}

function gridValues(min: number, max: number, step: number): number[] {
  const first = Math.ceil(min / step) * step;
  return Array.from({ length: Math.floor((max - first) / step) + 1 }, (_, index) => first + (index * step));
}

function TapeCell({ label, value, active = false }: { readonly label: string; readonly value: string; readonly active?: boolean }): React.JSX.Element {
  return <div className={cn("min-w-0 rounded-md border p-3", active ? "border-cyan-400/35 bg-cyan-400/[0.07]" : "border-zinc-800 bg-zinc-950")}><span className="block truncate font-mono text-[9px] uppercase tracking-wide text-zinc-500">{label}</span><strong className="mt-1 block truncate font-mono text-xs text-zinc-100">{value}</strong></div>;
}

function permutations<T>(values: readonly T[]): T[][] {
  if (values.length === 0) return [[]];
  return values.flatMap((value, index) => permutations([...values.slice(0, index), ...values.slice(index + 1)]).map((rest) => [value, ...rest]));
}

function lightColor(light: "red" | "green" | "yellow"): string {
  if (light === "red") return "border-rose-300 bg-rose-400 shadow-[0_0_24px_rgb(251_113_133/.35)]";
  if (light === "green") return "border-emerald-300 bg-emerald-400 shadow-[0_0_24px_rgb(52_211_153/.35)]";
  return "border-amber-200 bg-amber-300 shadow-[0_0_24px_rgb(252_211_77/.35)]";
}

function actionClass(color: "cyan" | "violet"): string {
  return cn("inline-flex min-h-11 items-center gap-2 rounded-md border px-4 py-2 text-sm font-semibold outline-none disabled:cursor-not-allowed disabled:opacity-40 focus-visible:ring-2", color === "cyan" ? "border-cyan-400/55 bg-cyan-400/10 text-cyan-100 hover:bg-cyan-400/20 focus-visible:ring-cyan-300" : "border-violet-400/55 bg-violet-400/10 text-violet-100 hover:bg-violet-400/20 focus-visible:ring-violet-300");
}

const secondaryClass = "inline-flex min-h-11 items-center gap-2 rounded-md border border-zinc-700 bg-zinc-900 px-3 py-2 text-sm font-semibold text-zinc-200 outline-none hover:border-zinc-500 hover:bg-zinc-800 disabled:cursor-not-allowed disabled:opacity-40 focus-visible:ring-2 focus-visible:ring-zinc-400";
