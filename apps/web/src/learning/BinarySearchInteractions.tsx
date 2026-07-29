import { ChevronLeft, ChevronRight, Pause, Play, RotateCcw } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { useTranslation } from "react-i18next";

import { cn } from "../lib.js";
import {
  checkMagicPowder,
  classifyConditionPattern,
  expandDiscreteTrace,
  isNonDecreasing,
  parseIntegerList,
  runDiscreteSearch,
  traceClosestValue,
  traceContinuousSquareRoot,
  traceFirstOccurrence,
  traceMagicPowder,
  type ConditionPattern,
  type ContinuousSearchStep,
  type DiscreteSearchFrame,
  type DiscreteSearchTrace,
  type MagicIngredient,
  type SearchOrientation,
  type SearchStepPhase
} from "./binarySearchModel.js";

const fieldClass = "min-w-0 rounded-md border border-zinc-700 bg-zinc-950 px-3 py-2 font-mono text-sm text-zinc-100 outline-none focus-visible:ring-2 focus-visible:ring-cyan-300";
const MAX_ITEMS = 12;

function usePrefersReducedMotion(): boolean {
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

function useStepPlayer(total: number) {
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

function StepControls({
  total,
  player
}: {
  readonly total: number;
  readonly player: ReturnType<typeof useStepPlayer>;
}): React.JSX.Element {
  const { t } = useTranslation("binarySearch");
  if (total === 0) return <p className="text-sm text-zinc-500">{t("controls.noSteps")}</p>;
  return (
    <div className="flex flex-wrap items-center justify-between gap-3">
      <strong className="font-mono text-xs text-cyan-300">{t("controls.step", { current: player.index + 1, total })}</strong>
      <div className="flex flex-wrap gap-1.5">
        <IconButton label={t("controls.previous")} disabled={player.index === 0} onClick={() => player.move(player.index - 1)}><ChevronLeft /></IconButton>
        <IconButton label={t("controls.next")} disabled={player.index === player.last} onClick={() => player.move(player.index + 1)}><ChevronRight /></IconButton>
        <IconButton label={t("controls.reset")} onClick={() => player.move(0)}><RotateCcw /></IconButton>
        <button
          type="button"
          disabled={player.reducedMotion || player.index === player.last}
          aria-pressed={player.playing}
          className="inline-flex min-h-9 items-center gap-1.5 rounded-md bg-cyan-500 px-3 py-2 text-xs font-semibold text-zinc-950 outline-none focus-visible:ring-2 focus-visible:ring-cyan-200 disabled:opacity-40"
          onClick={player.toggle}
        >
          {player.playing ? <Pause className="size-3.5" aria-hidden="true" /> : <Play className="size-3.5" aria-hidden="true" />}
          {player.playing ? t("controls.pause") : t("controls.play")}
        </button>
      </div>
      {player.reducedMotion ? <p className="w-full text-xs text-zinc-500">{t("controls.reducedMotion")}</p> : null}
    </div>
  );
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
    <button
      type="button"
      aria-label={label}
      disabled={disabled}
      className="grid size-9 place-items-center rounded-md border border-zinc-700 text-zinc-300 outline-none focus-visible:ring-2 focus-visible:ring-cyan-300 disabled:opacity-40"
      onClick={onClick}
    >
      {children}
    </button>
  );
}

function LabShell({ label, children }: { readonly label: string; readonly children: React.ReactNode }): React.JSX.Element {
  return (
    <section aria-label={label} className="my-8 min-w-0 overflow-hidden rounded-xl border border-cyan-400/25 bg-cyan-400/[0.025]">
      <div className="border-b border-zinc-800 px-4 py-2.5 font-mono text-[10px] font-semibold uppercase tracking-[0.16em] text-cyan-300">{label}</div>
      <div className="p-4">{children}</div>
    </section>
  );
}

function ErrorText({ children }: { readonly children: React.ReactNode }): React.JSX.Element {
  return <p role="alert" className="mt-3 text-sm text-rose-300">{children}</p>;
}

function parseTarget(raw: string): number | null {
  const value = Number(raw);
  return Number.isSafeInteger(value) && Math.abs(value) <= 1_000_000_000 ? value : null;
}

function patternTextKey(pattern: ConditionPattern): "falseTrue" | "trueFalse" | "constantFalse" | "constantTrue" | "nonMonotone" {
  switch (pattern) {
    case "false-true": return "falseTrue";
    case "true-false": return "trueFalse";
    case "constant-false": return "constantFalse";
    case "constant-true": return "constantTrue";
    case "non-monotone": return "nonMonotone";
  }
}

export function MotivationLab(): React.JSX.Element {
  const { t } = useTranslation("binarySearch");
  const [rawValues, setRawValues] = useState("2, 4, 7, 9, 12, 18, 25");
  const [rawTarget, setRawTarget] = useState("10");
  const values = parseIntegerList(rawValues, MAX_ITEMS);
  const target = parseTarget(rawTarget);
  const valid = values !== null && target !== null && isNonDecreasing(values);
  const insertionTrace = valid
    ? runDiscreteSearch({ left: -1, right: values.length, orientation: "false-true", condition: (index) => values[index]! >= target })
    : null;
  const insertionIndex = insertionTrace?.boundary ?? 0;
  const linearChecks = valid ? (insertionIndex < values.length ? insertionIndex + 1 : values.length) : 0;
  const insertionFrames = insertionTrace === null ? [] : expandDiscreteTrace(insertionTrace);
  const insertionPlayer = useStepPlayer(insertionFrames.length);
  const insertionFrame = insertionFrames[insertionPlayer.index];

  return (
    <LabShell label={t("recognize.binary")}>
      <div className="mt-5 overflow-hidden rounded-xl border border-zinc-800">
        <div className="grid min-w-0 lg:grid-cols-[minmax(0,18rem)_minmax(0,1fr)]">
          <div className="min-w-0 border-b border-zinc-800 p-4 lg:border-b-0 lg:border-r">
        <div className="grid gap-4 sm:grid-cols-[1fr_9rem]">
          <label className="grid gap-1.5 text-sm text-zinc-300">
            <span>{t("recognize.valuesLabel")}</span>
            <input aria-label={t("recognize.valuesLabel")} className={fieldClass} value={rawValues} onChange={(event) => setRawValues(event.target.value)} />
          </label>
          <label className="grid gap-1.5 text-sm text-zinc-300">
            <span>{t("recognize.targetLabel")}</span>
            <input aria-label={t("recognize.targetLabel")} className={fieldClass} value={rawTarget} onChange={(event) => setRawTarget(event.target.value)} />
          </label>
        </div>
        {values === null || target === null ? <ErrorText>{t("controls.invalidList")}</ErrorText> : !isNonDecreasing(values) ? <ErrorText>{t("controls.unsorted")}</ErrorText> : null}
            {valid && insertionTrace !== null ? <div className="mt-4"><StepControls total={insertionFrames.length} player={insertionPlayer} /></div> : null}
          </div>
          <div className="min-w-0 bg-zinc-950/70 p-4">
            {valid && insertionTrace !== null && insertionFrame !== undefined ? <DiscreteStepReadout trace={insertionTrace} frame={insertionFrame} /> : null}
          </div>
        </div>
        {valid && insertionTrace !== null && values !== null ? (
          <div className="border-t border-zinc-800 p-4">
              <p className="mb-4 font-mono text-sm text-amber-200">{t("recognize.condition", { target })}</p>
              {insertionFrame === undefined ? null : <DiscreteStepVisual trace={insertionTrace} frame={insertionFrame} values={values} />}
            <p className="mt-4 rounded-md border border-rose-400/25 bg-rose-400/[0.04] px-4 py-2.5 text-sm font-semibold text-rose-100">{t("recognize.insertion", { index: insertionIndex })}</p>
            <div className="mt-4 grid grid-cols-2 gap-px overflow-hidden rounded-md border border-zinc-800 bg-zinc-800">
              <div className="bg-zinc-950 p-4"><span className="block text-xs text-zinc-500">{t("recognize.linear")}</span><strong className="mt-1 block font-mono text-xl text-zinc-100">{linearChecks}</strong></div>
              <div className="bg-zinc-950 p-4"><span className="block text-xs text-zinc-500">{t("recognize.binary")}</span><strong className="mt-1 block font-mono text-xl text-cyan-200">{insertionTrace.probes}</strong></div>
            </div>
            <p className="mt-3 text-xs text-zinc-500">{t("recognize.compare", { linear: linearChecks, binary: insertionTrace.probes })}</p>
          </div>
        ) : null}
      </div>
    </LabShell>
  );
}

export function ConditionPatternLab(): React.JSX.Element {
  const { t } = useTranslation("binarySearch");
  const [pattern, setPattern] = useState<readonly boolean[]>([false, true, true, false, false, true, false, true, true, false]);
  const classification = classifyConditionPattern(pattern);
  return (
    <LabShell label={t("recognize.conditionTitle")}>
      <p className="text-sm leading-6 text-zinc-400">{t("recognize.conditionHelp")}</p>
      <div className="mt-5 grid grid-cols-5 gap-2 sm:grid-cols-10" role="group" aria-label={t("recognize.conditionTitle")}>
        {pattern.map((value, index) => (
          <button
            key={index}
            type="button"
            aria-label={t("recognize.toggle", { index })}
            aria-pressed={value}
            className={cn(
              "grid size-11 place-items-center rounded-md border font-mono text-sm outline-none focus-visible:ring-2 focus-visible:ring-cyan-300",
              value ? "border-cyan-400 bg-cyan-400/15 text-cyan-100" : "border-zinc-700 bg-zinc-950 text-zinc-500"
            )}
            onClick={() => setPattern((current) => current.map((item, itemIndex) => itemIndex === index ? !item : item))}
          >
            {value ? "1" : "0"}
          </button>
        ))}
      </div>
      <p className={cn("mt-5 border-l-2 pl-4 text-sm leading-6", classification === "non-monotone" ? "border-rose-400 text-rose-200" : "border-emerald-400 text-emerald-200")}>
        {t(`recognize.pattern.${patternTextKey(classification)}`)}
      </p>
      <button type="button" className="mt-5 text-left text-xs text-zinc-500 underline decoration-zinc-700 underline-offset-4 hover:text-zinc-300" onClick={() => setPattern([false, true, true, false, false, true, false, true, true, false])}>
        {t("recognize.counterexample")}
      </button>
    </LabShell>
  );
}

export function BinarySearchToolTrace({
  orientation,
  example
}: {
  readonly orientation: SearchOrientation;
  readonly example: "first" | "closest" | "numeric" | "bad" | "magic";
}): React.JSX.Element {
  if (example === "numeric") return <ContinuousBinarySearchToolTrace />;
  return <DiscreteBinarySearchToolTrace orientation={orientation} example={example} />;
}

function DiscreteBinarySearchToolTrace({
  orientation,
  example
}: {
  readonly orientation: SearchOrientation;
  readonly example: "first" | "closest" | "bad" | "magic";
}): React.JSX.Element {
  const { t } = useTranslation("binarySearch");
  const toolExample = useMemo(() => createToolExample(example, orientation), [example, orientation]);
  const { trace, values, codeKey, visualKind } = toolExample;
  const frames = useMemo(() => expandDiscreteTrace(trace), [trace]);
  const player = useStepPlayer(frames.length);
  const frame = frames[player.index];
  const code = t(`tool.${codeKey}`);
  const finished = frame?.phase === "move-bound" && frame.probe === trace.probes;
  const answerPointer = trace.orientation === "false-true" ? "right" : "left";

  return (
    <LabShell label={orientation === "false-true" ? t("tool.titleFalseTrue") : t("tool.titleTrueFalse")}>
      <p className="mb-5 text-sm leading-6 text-zinc-400">{orientation === "false-true" ? t("tool.falseTrueRule") : t("tool.trueFalseRule")}</p>
      <div className="overflow-hidden rounded-xl border border-zinc-800" data-tool-visual={visualKind}>
        <div className="grid min-w-0 lg:grid-cols-[minmax(0,37rem)_minmax(0,1fr)]">
          <ReadableCode code={code} label={t("tool.codeLabel")} frame={frame} />
          <div className="min-w-0 border-t border-zinc-800 bg-zinc-950/70 p-4 lg:border-l lg:border-t-0">
            <p className="font-mono text-[10px] font-semibold uppercase tracking-[0.16em] text-rose-300">{t("tool.visualizerLabel")}</p>
            <div className="mt-3"><StepControls total={frames.length} player={player} /></div>
            {frame === undefined ? null : <DiscreteStepReadout trace={trace} frame={frame} />}
          </div>
        </div>
        <div className="border-t border-zinc-800 p-4 sm:p-5">
          {frame === undefined ? null : <DiscreteStepVisual trace={trace} frame={frame} values={values} />}
          {finished ? (
            <p className="mt-4 rounded-md border border-rose-400/35 bg-rose-400/[0.07] px-4 py-2.5 font-mono text-sm font-semibold text-rose-100">
              {t("tool.boundaryWithPointer", { pointer: answerPointer, value: trace.boundary })}
            </p>
          ) : null}
        </div>
      </div>
    </LabShell>
  );
}

function ContinuousBinarySearchToolTrace(): React.JSX.Element {
  const { t } = useTranslation("binarySearch");
  const trace = useMemo(() => traceContinuousSquareRoot(10, { kind: "epsilon", epsilon: 1e-3 }), []);
  const frames = useMemo(() => trace.steps.flatMap((step, index) => ([
    { phase: "calculate-mid" as const, probe: index + 1, step },
    { phase: "evaluate-condition" as const, probe: index + 1, step },
    { phase: "move-bound" as const, probe: index + 1, step }
  ])), [trace.steps]);
  const player = useStepPlayer(frames.length);
  const frame = frames[player.index];
  const finished = frame?.phase === "move-bound" && player.index === player.last;

  return (
    <LabShell label={t("tool.titleContinuous")}>
      <p className="mb-5 text-sm leading-6 text-zinc-400">{t("tool.continuousRule")}</p>
      <div className="overflow-hidden rounded-xl border border-zinc-800" data-tool-visual="number-line">
        <div className="grid min-w-0 lg:grid-cols-[minmax(0,37rem)_minmax(0,1fr)]">
          <ReadableCode code={t("tool.codeNumeric")} label={t("tool.codeLabel")} frame={frame} />
          <div className="min-w-0 border-t border-zinc-800 bg-zinc-950/70 p-4 lg:border-l lg:border-t-0">
            <p className="font-mono text-[10px] font-semibold uppercase tracking-[0.16em] text-rose-300">{t("tool.visualizerLabel")}</p>
            <div className="mt-3"><StepControls total={frames.length} player={player} /></div>
            {frame === undefined ? null : <ContinuousStepReadout frame={frame} />}
          </div>
        </div>
        <div className="border-t border-zinc-800 p-4 sm:p-5">
          {frame === undefined ? null : <ContinuousStepVisual frame={frame} initialRight={11} />}
          {finished ? (
            <p className="mt-4 rounded-md border border-rose-400/35 bg-rose-400/[0.07] px-4 py-2.5 font-mono text-sm font-semibold text-rose-100">
              {t("numeric.toolResult", { value: trace.result.toFixed(6) })}
            </p>
          ) : null}
        </div>
      </div>
    </LabShell>
  );
}

type ToolCodeKey = "codeFirstOccurrence" | "codeClosestLast" | "codeClosestFirst" | "codeBad" | "codeMagic";

function createToolExample(
  example: "first" | "closest" | "bad" | "magic",
  orientation: SearchOrientation
): {
  readonly trace: DiscreteSearchTrace;
  readonly values?: readonly number[];
  readonly codeKey: ToolCodeKey;
  readonly visualKind: "array" | "number-line";
} {
  if (example === "first") {
    const values = [1, 2, 2, 4, 4, 4, 4, 6, 7, 7, 12, 20] as const;
    return {
      values,
      codeKey: "codeFirstOccurrence",
      visualKind: "array",
      trace: runDiscreteSearch({
        left: -1,
        right: values.length,
        orientation: "false-true",
        condition: (index) => values[index]! >= 7
      })
    };
  }
  if (example === "closest") {
    const values = [3, 5, 10, 13, 18, 25] as const;
    return {
      values,
      codeKey: orientation === "false-true" ? "codeClosestFirst" : "codeClosestLast",
      visualKind: "array",
      trace: runDiscreteSearch({
        left: -1,
        right: values.length,
        orientation,
        condition: orientation === "false-true"
          ? (index) => values[index]! > 15
          : (index) => values[index]! <= 15
      })
    };
  }
  if (example === "bad") {
    return {
      codeKey: "codeBad",
      visualKind: "number-line",
      trace: runDiscreteSearch({
        left: 0,
        right: 100,
        orientation: "false-true",
        condition: (version) => version >= 63
      })
    };
  }
  return {
    codeKey: "codeMagic",
    visualKind: "number-line",
    trace: runDiscreteSearch({
      left: 0,
      right: 16,
      orientation: "true-false",
      condition: (cookies) => cookies <= 4
    })
  };
}

type SynchronizedCodeFrame = {
  readonly phase: SearchStepPhase;
  readonly step: { readonly conditionResult: boolean };
};

function codeLineForFrame(frame: SynchronizedCodeFrame | undefined): number | null {
  if (frame === undefined) return null;
  if (frame.phase === "calculate-mid") return 3;
  if (frame.phase === "evaluate-condition") return 4;
  return frame.step.conditionResult ? 6 : 8;
}

function ReadableCode({ code, label, frame }: { readonly code: string; readonly label: string; readonly frame: SynchronizedCodeFrame | undefined }): React.JSX.Element {
  const { t } = useTranslation("binarySearch");
  const activeLine = codeLineForFrame(frame);
  return (
    <div className="min-w-0 bg-[#0d1117]">
      <div className="flex flex-wrap items-center justify-between gap-2 border-b border-zinc-800 px-4 py-2">
        <span className="font-mono text-xs font-semibold uppercase tracking-[0.15em] text-zinc-400">{label}</span>
        {activeLine === null ? null : (
          <span className="rounded-full border border-amber-300/35 bg-amber-300/[0.06] px-2.5 py-1 font-mono text-[9px] font-semibold uppercase tracking-wide text-amber-200">
            {t("tool.activeCodeLine", { line: activeLine + 1 })}
          </span>
        )}
      </div>
      <pre className="max-w-full overflow-x-auto p-4 text-[12.5px] leading-5 text-zinc-200">
        <code className="guide-code block min-w-max whitespace-pre border-0 bg-transparent p-0 font-mono text-inherit">
          {code.split("\n").map((line, index) => (
            <span
              key={`${index}-${line}`}
              data-active-code-line={activeLine === index ? "true" : "false"}
              aria-current={activeLine === index ? "step" : undefined}
              className={cn(
                "block border-l-2 px-3 transition-colors duration-300 motion-reduce:transition-none",
                activeLine === index ? "border-amber-300 bg-amber-300/[0.09] text-amber-100" : "border-transparent"
              )}
            >
              <span aria-hidden="true" className="mr-2 inline-block w-4 select-none text-right text-[10px] text-zinc-600">{index + 1}</span>
              {line || " "}
            </span>
          ))}
        </code>
      </pre>
    </div>
  );
}

function phaseLabelKey(phase: SearchStepPhase): "calculate" | "evaluate" | "move" {
  if (phase === "calculate-mid") return "calculate";
  if (phase === "evaluate-condition") return "evaluate";
  return "move";
}

function DiscreteStepReadout({ trace, frame }: { readonly trace: DiscreteSearchTrace; readonly frame: DiscreteSearchFrame }): React.JSX.Element {
  const { t } = useTranslation("binarySearch");
  const { phase, probe, step } = frame;
  const visibleLeft = phase === "move-bound" ? step.nextLeft : step.left;
  const visibleRight = phase === "move-bound" ? step.nextRight : step.right;
  const answerPointer = phase === "move-bound" && probe === trace.probes
    ? trace.orientation === "false-true" ? "right" : "left"
    : null;
  const phaseKey = phaseLabelKey(phase);
  const narration = phase === "calculate-mid"
    ? t("tool.calculate", { left: step.left, right: step.right, mid: step.mid })
    : phase === "evaluate-condition"
      ? t("tool.evaluate", {
        mid: step.mid,
        result: step.conditionResult ? t("controls.trueValue") : t("controls.falseValue")
      })
      : t("tool.move", {
        bound: step.movedBound,
        mid: step.mid,
        result: step.conditionResult ? t("controls.trueValue") : t("controls.falseValue")
      });
  return (
    <div className="mt-3">
      <div className="min-w-0">
        <div className="grid grid-cols-3 gap-2" aria-label={t("tool.phaseLabel")}>
          {(["calculate", "evaluate", "move"] as const).map((key, index) => (
            <div key={key} className={cn(
              "rounded-md border px-2 py-1.5 text-center font-mono text-[9px] font-semibold uppercase tracking-wide transition-colors",
              phaseKey === key ? "border-cyan-300 bg-cyan-300/10 text-cyan-100" : "border-zinc-800 text-zinc-600"
            )}>
              {index + 1}. {t(`tool.phases.${key}`)}
            </div>
          ))}
        </div>
        <div className="mt-3 rounded-lg border border-cyan-400/20 bg-cyan-400/[0.035] p-3">
          <span className="font-mono text-[10px] font-semibold uppercase tracking-[0.15em] text-cyan-300">{t("tool.probe", { probe })}</span>
          <p className="mt-1.5 text-sm font-medium leading-6 text-zinc-100" role="status" aria-live="polite">{narration}</p>
          {phase === "calculate-mid" ? (
            <p className="mt-2 overflow-x-auto rounded-md bg-zinc-950 px-3 py-1.5 font-mono text-[13px] text-amber-200">
              mid = {step.left} + floor(({step.right} − {step.left}) / 2) = {step.mid}
            </p>
          ) : phase === "move-bound" ? (
            <p className="mt-2 font-mono text-[13px] font-semibold text-rose-200">
              {step.movedBound} ← mid &nbsp;({step.mid})
            </p>
          ) : null}
        </div>
      </div>
      <PointerSummary left={visibleLeft} mid={step.mid} right={visibleRight} answerPointer={answerPointer} />
    </div>
  );
}

function DiscreteStepVisual({ trace, frame, values }: { readonly trace: DiscreteSearchTrace; readonly frame: DiscreteSearchFrame; readonly values?: readonly number[] }): React.JSX.Element {
  const { t } = useTranslation("binarySearch");
  const { phase, probe, step } = frame;
  const start = trace.initialLeft;
  const end = trace.initialRight;
  const visibleLeft = phase === "move-bound" ? step.nextLeft : step.left;
  const visibleRight = phase === "move-bound" ? step.nextRight : step.right;
  const answerPointer = phase === "move-bound" && probe === trace.probes
    ? trace.orientation === "false-true" ? "right" : "left"
    : null;
  const cells: number[] = [];
  if (values !== undefined && end - start <= 18) {
    for (let value = start; value <= end; value += 1) cells.push(value);
  }
  return (
    <>
      {cells.length > 0 ? (
        <div className="max-w-full overflow-x-auto pb-3" data-search-visual="array">
          <div className="flex min-w-max gap-1.5" role="img" aria-label={t("tool.rangeAria", { left: visibleLeft, mid: step.mid, right: visibleRight })}>
            {cells.map((position) => {
              const sentinel = position === start || position === end;
              const isMid = position === step.mid;
              const discarded = position < visibleLeft || position > visibleRight;
              return (
                <div key={position} className="w-12 shrink-0">
                  <div className="flex min-h-9 flex-col justify-end gap-0.5 text-center font-mono text-[8px] font-bold uppercase">
                    {position === visibleLeft ? <span className="rounded bg-rose-400/15 px-1 py-0.5 text-rose-200">left{answerPointer === "left" ? ` · ${t("tool.answer")}` : ""} ↓</span> : null}
                    {isMid ? <span className="rounded bg-amber-300/15 px-1 py-0.5 text-amber-200">mid ↓</span> : null}
                    {position === visibleRight ? <span className="rounded bg-cyan-300/15 px-1 py-0.5 text-cyan-200">right{answerPointer === "right" ? ` · ${t("tool.answer")}` : ""} ↓</span> : null}
                  </div>
                  <div className={cn(
                    "relative overflow-hidden rounded-md border text-center font-mono transition-all duration-500 motion-reduce:transition-none",
                    isMid ? "border-amber-300 bg-amber-300/10 text-amber-100" : "border-zinc-700 bg-zinc-950 text-zinc-200",
                    discarded && "border-zinc-800 text-zinc-600 opacity-55"
                  )}>
                    <span className="block border-b border-inherit px-1 py-1 text-[9px] text-zinc-500">{sentinel ? t("controls.sentinel") : position}</span>
                    <span className="block px-1 py-1.5 text-[13px] font-semibold">{sentinel ? "S" : values?.[position] ?? position}</span>
                    {discarded ? <CrossedOut /> : null}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      ) : (
        <RangeNumberLine
          initialLeft={start}
          initialRight={end}
          left={visibleLeft}
          mid={step.mid}
          right={visibleRight}
          answerPointer={answerPointer}
        />
      )}
    </>
  );
}

function PointerSummary({
  left,
  mid,
  right,
  answerPointer = null
}: {
  readonly left: number | string;
  readonly mid: number | string;
  readonly right: number | string;
  readonly answerPointer?: "left" | "right" | null;
}): React.JSX.Element {
  const { t } = useTranslation("binarySearch");
  return (
    <dl className="mt-3 grid gap-1.5 sm:grid-cols-3 lg:grid-cols-1">
      <PointerCard label={`${t("tool.pointers.left")}${answerPointer === "left" ? ` · ${t("tool.answer")}` : ""}`} variable="left" value={left} tone="rose" />
      <PointerCard label={t("tool.pointers.mid")} variable="mid" value={mid} tone="amber" />
      <PointerCard label={`${t("tool.pointers.right")}${answerPointer === "right" ? ` · ${t("tool.answer")}` : ""}`} variable="right" value={right} tone="cyan" />
    </dl>
  );
}

function PointerCard({ label, variable, value, tone }: { readonly label: string; readonly variable: string; readonly value: number | string; readonly tone: "rose" | "amber" | "cyan" }): React.JSX.Element {
  return (
    <div className={cn(
      "rounded-md border px-3 py-2",
      tone === "rose" && "border-rose-400/35 bg-rose-400/[0.04]",
      tone === "amber" && "border-amber-300/35 bg-amber-300/[0.04]",
      tone === "cyan" && "border-cyan-300/35 bg-cyan-300/[0.04]"
    )}>
      <dt className="text-[10px] font-semibold uppercase tracking-[0.12em] text-zinc-500">{label}</dt>
      <dd className={cn(
        "mt-0.5 font-mono text-base font-bold",
        tone === "rose" && "text-rose-200",
        tone === "amber" && "text-amber-200",
        tone === "cyan" && "text-cyan-200"
      )}>{variable} = {value}</dd>
    </div>
  );
}

function CrossedOut(): React.JSX.Element {
  return (
    <span className="pointer-events-none absolute inset-0" aria-hidden="true">
      <span className="absolute left-0 top-1/2 h-px w-full rotate-[32deg] bg-rose-400/80" />
      <span className="absolute left-0 top-1/2 h-px w-full -rotate-[32deg] bg-rose-400/80" />
    </span>
  );
}

function RangeNumberLine({
  initialLeft,
  initialRight,
  left,
  mid,
  right,
  answerPointer = null
}: {
  readonly initialLeft: number;
  readonly initialRight: number;
  readonly left: number;
  readonly mid: number;
  readonly right: number;
  readonly answerPointer?: "left" | "right" | null;
}): React.JSX.Element {
  const { t } = useTranslation("binarySearch");
  const width = initialRight - initialLeft;
  const percent = (value: number): number => width === 0 ? 0 : ((value - initialLeft) / width) * 100;
  const leftPercent = percent(left);
  const midPercent = percent(mid);
  const rightPercent = percent(right);
  return (
    <div className="mt-7" data-search-visual="number-line" role="img" aria-label={t("tool.rangeAria", { left, mid, right })}>
      <div className="relative h-28">
        <PointerMarker pointer="left" lane={0} label={`left${answerPointer === "left" ? ` · ${t("tool.answer")}` : ""}`} value={left} percent={leftPercent} tone="rose" />
        <PointerMarker pointer="mid" lane={1} label="mid" value={mid} percent={midPercent} tone="amber" />
        <PointerMarker pointer="right" lane={2} label={`right${answerPointer === "right" ? ` · ${t("tool.answer")}` : ""}`} value={right} percent={rightPercent} tone="cyan" />
        <div className="absolute inset-x-0 bottom-2 h-4 overflow-hidden rounded-full border border-zinc-700 bg-zinc-900">
          <span className="absolute inset-y-0 left-0 bg-[repeating-linear-gradient(135deg,rgba(244,63,94,.4)_0_4px,transparent_4px_8px)] transition-[width] duration-500 motion-reduce:transition-none" style={{ width: `${leftPercent}%` }} />
          <span className="absolute inset-y-0 right-0 bg-[repeating-linear-gradient(45deg,rgba(244,63,94,.4)_0_4px,transparent_4px_8px)] transition-[width] duration-500 motion-reduce:transition-none" style={{ width: `${100 - rightPercent}%` }} />
          <span className="absolute inset-y-0 bg-cyan-300/15 transition-all duration-500 motion-reduce:transition-none" style={{ left: `${leftPercent}%`, width: `${Math.max(0, rightPercent - leftPercent)}%` }} />
        </div>
      </div>
      <div className="flex justify-between font-mono text-[10px] text-zinc-600">
        <span>{initialLeft}</span>
        <span className="uppercase tracking-wide text-zinc-500">{t("controls.range")}</span>
        <span>{initialRight}</span>
      </div>
    </div>
  );
}

function PointerMarker({
  pointer,
  lane,
  label,
  value,
  percent,
  tone
}: {
  readonly pointer: "left" | "mid" | "right";
  readonly lane: 0 | 1 | 2;
  readonly label: string;
  readonly value: number;
  readonly percent: number;
  readonly tone: "rose" | "amber" | "cyan";
}): React.JSX.Element {
  const markerPercent = Math.max(0, Math.min(100, percent));
  const horizontalAlignment = markerPercent < 12 ? "translate-x-0" : markerPercent > 88 ? "-translate-x-full" : "-translate-x-1/2";
  return (
    <span
      data-pointer-lane={pointer}
      data-pointer-lane-index={lane}
      className={cn(
        "absolute inset-y-0 z-10 w-0 font-mono text-[9px] font-bold uppercase transition-[left] duration-500 motion-reduce:transition-none",
        tone === "rose" && "text-rose-200",
        tone === "amber" && "text-amber-200",
        tone === "cyan" && "text-cyan-200"
      )}
      style={{ left: `${markerPercent}%` }}
    >
      <span className={cn(
        "absolute whitespace-nowrap rounded border bg-zinc-950 px-1.5 py-1 text-center leading-none",
        horizontalAlignment,
        tone === "rose" && "border-rose-400/50",
        tone === "amber" && "border-amber-300/50",
        tone === "cyan" && "border-cyan-300/50"
      )} style={{ bottom: `${26 + lane * 24}px` }}>{label} = {value}</span>
      <span className="absolute bottom-6 left-0 w-px bg-current" style={{ height: `${8 + lane * 24}px` }} />
      <span className="absolute bottom-[21px] left-0 size-1.5 -translate-x-1/2 rounded-full bg-current" />
    </span>
  );
}

function ArrayInputs({
  rawValues,
  rawTarget,
  onValues,
  onTarget
}: {
  readonly rawValues: string;
  readonly rawTarget: string;
  readonly onValues: (value: string) => void;
  readonly onTarget: (value: string) => void;
}): React.JSX.Element {
  const { t } = useTranslation("binarySearch");
  return (
    <div className="grid gap-4 sm:grid-cols-[1fr_9rem]">
      <label className="grid gap-1.5 text-sm text-zinc-300">
        <span>{t("controls.values")}</span>
        <input className={fieldClass} value={rawValues} onChange={(event) => onValues(event.target.value)} />
      </label>
      <label className="grid gap-1.5 text-sm text-zinc-300">
        <span>{t("controls.target")}</span>
        <input className={fieldClass} value={rawTarget} onChange={(event) => onTarget(event.target.value)} />
      </label>
    </div>
  );
}

function ArrayTraceView({
  trace,
  values,
  controls,
  result
}: {
  readonly trace: DiscreteSearchTrace;
  readonly values: readonly number[];
  readonly controls: React.ReactNode;
  readonly result: React.ReactNode;
}): React.JSX.Element {
  const { t } = useTranslation("binarySearch");
  const frames = expandDiscreteTrace(trace);
  const player = useStepPlayer(frames.length);
  const frame = frames[player.index];
  return (
    <div className="mt-5 overflow-hidden rounded-xl border border-zinc-800">
      <div className="grid min-w-0 lg:grid-cols-[minmax(0,18rem)_minmax(0,1fr)]">
        <div className="min-w-0 border-b border-zinc-800 p-4 lg:border-b-0 lg:border-r">
          {controls}
          <div className="mt-4"><StepControls total={frames.length} player={player} /></div>
        </div>
        <div className="min-w-0 bg-zinc-950/70 p-4">
          {frame === undefined ? null : <DiscreteStepReadout trace={trace} frame={frame} />}
        </div>
      </div>
      <div className="border-t border-zinc-800 p-4">
        {frame === undefined ? null : <DiscreteStepVisual trace={trace} frame={frame} values={values} />}
        <div className="mt-5 rounded-md border border-rose-400/25 bg-rose-400/[0.04] px-4 py-2.5">
          <span className="block font-mono text-[10px] uppercase tracking-[0.14em] text-rose-300">{t("controls.result")}</span>
          <strong className="mt-1 block text-sm text-rose-100">{result}</strong>
          <span className="mt-1 block font-mono text-[10px] text-zinc-500">{t("controls.probes", { count: trace.probes })}</span>
        </div>
      </div>
    </div>
  );
}

export function FirstOccurrenceLab(): React.JSX.Element {
  const { t } = useTranslation("binarySearch");
  const [rawValues, setRawValues] = useState("1, 2, 2, 4, 4, 4, 4, 6, 7, 7, 12, 20");
  const [rawTarget, setRawTarget] = useState("7");
  const values = parseIntegerList(rawValues, MAX_ITEMS);
  const target = parseTarget(rawTarget);
  const valid = values !== null && target !== null && isNonDecreasing(values);
  const result = valid ? traceFirstOccurrence(values, target) : null;
  return (
    <LabShell label={t("first.applicationTitle")}>
      {result === null || values === null ? null : (
        <ArrayTraceView
          trace={result.trace}
          values={values}
          controls={(
            <>
              <ArrayInputs rawValues={rawValues} rawTarget={rawTarget} onValues={setRawValues} onTarget={setRawTarget} />
              {values === null || target === null ? <ErrorText>{t("controls.invalidList")}</ErrorText> : !isNonDecreasing(values) ? <ErrorText>{t("controls.unsorted")}</ErrorText> : null}
            </>
          )}
          result={result.index >= 0 ? t("first.found", { index: result.index }) : t("first.missing")}
        />
      )}
      {result !== null && values !== null ? null : (
        <>
          <ArrayInputs rawValues={rawValues} rawTarget={rawTarget} onValues={setRawValues} onTarget={setRawTarget} />
          {values === null || target === null ? <ErrorText>{t("controls.invalidList")}</ErrorText> : !isNonDecreasing(values) ? <ErrorText>{t("controls.unsorted")}</ErrorText> : null}
        </>
      )}
    </LabShell>
  );
}

export function ClosestValueLab(): React.JSX.Element {
  const { t } = useTranslation("binarySearch");
  const [rawValues, setRawValues] = useState("3, 5, 10, 13, 18, 25");
  const [rawTarget, setRawTarget] = useState("15");
  const values = parseIntegerList(rawValues, MAX_ITEMS);
  const target = parseTarget(rawTarget);
  const valid = values !== null && values.length > 0 && target !== null && isNonDecreasing(values);
  const result = valid ? traceClosestValue(values, target) : null;
  const trace = result?.leftTrace;
  return (
    <LabShell label={t("closest.applicationTitle")}>
      {result === null || trace === undefined || values === null || target === null ? null : (
        <ArrayTraceView
          trace={trace}
          values={values}
          controls={(
            <>
              <ArrayInputs rawValues={rawValues} rawTarget={rawTarget} onValues={setRawValues} onTarget={setRawTarget} />
              {values === null || target === null ? <ErrorText>{t("controls.invalidList")}</ErrorText> : values.length === 0 ? <ErrorText>{t("controls.emptyClosest")}</ErrorText> : !isNonDecreasing(values) ? <ErrorText>{t("controls.unsorted")}</ErrorText> : null}
            </>
          )}
          result={(
            <span>
              {t("closest.answer", { value: result.value, target })}
              <span className="mt-1 block font-normal text-zinc-400">
                {t("closest.leftCandidate")}: {result.leftIndex >= 0 ? values[result.leftIndex] : t("closest.missingCandidate")} · {t("closest.rightCandidate")}: {result.rightIndex < values.length ? values[result.rightIndex] : t("closest.missingCandidate")}
              </span>
            </span>
          )}
        />
      )}
      {result !== null && trace !== undefined && values !== null && target !== null ? null : (
        <>
          <ArrayInputs rawValues={rawValues} rawTarget={rawTarget} onValues={setRawValues} onTarget={setRawTarget} />
          {values === null || target === null ? <ErrorText>{t("controls.invalidList")}</ErrorText> : values.length === 0 ? <ErrorText>{t("controls.emptyClosest")}</ErrorText> : !isNonDecreasing(values) ? <ErrorText>{t("controls.unsorted")}</ErrorText> : null}
        </>
      )}
    </LabShell>
  );
}

export function NumericSearchLab(): React.JSX.Element {
  const { t } = useTranslation("binarySearch");
  const [mode, setMode] = useState<"epsilon" | "iterations">("epsilon");
  const [rawX, setRawX] = useState("10");
  const [rawEpsilon, setRawEpsilon] = useState("0.000001");
  const [rawIterations, setRawIterations] = useState("40");
  const x = Number(rawX);
  const doubleValid = Number.isFinite(x) && x >= 0 && x <= 1_000_000_000_000;
  const epsilon = Number(rawEpsilon);
  const iterations = Number(rawIterations);
  const extraValid = mode === "epsilon"
    ? Number.isFinite(epsilon) && epsilon >= 1e-12 && epsilon <= 1e-1
    : Number.isInteger(iterations) && iterations >= 1 && iterations <= 100;
  const continuousResult = doubleValid && extraValid
    ? traceContinuousSquareRoot(x, mode === "epsilon" ? { kind: "epsilon", epsilon } : { kind: "iterations", iterations })
    : null;
  const continuousFrames = continuousResult === null
    ? []
    : continuousResult.steps.flatMap((step, index) => ([
      { phase: "calculate-mid" as const, probe: index + 1, step },
      { phase: "evaluate-condition" as const, probe: index + 1, step },
      { phase: "move-bound" as const, probe: index + 1, step }
    ]));
  const player = useStepPlayer(continuousFrames.length);
  const continuousFrame = continuousFrames[player.index];
  const probeCount = continuousResult?.steps.length ?? 0;

  return (
    <LabShell label={t("numeric.applicationTitle")}>
      <div className="mt-5 overflow-hidden rounded-xl border border-zinc-800">
        <div className="grid min-w-0 lg:grid-cols-[minmax(0,18rem)_minmax(0,1fr)]">
          <div className="min-w-0 border-b border-zinc-800 p-4 lg:border-b-0 lg:border-r">
            <div className="flex flex-wrap gap-2" role="group" aria-label={t("numeric.mode")}>
              {(["epsilon", "iterations"] as const).map((value) => (
                <button key={value} type="button" aria-pressed={mode === value} className={cn("rounded-full border px-3 py-1.5 text-xs", mode === value ? "border-cyan-400 bg-cyan-400/10 text-cyan-100" : "border-zinc-700 text-zinc-500")} onClick={() => setMode(value)}>
                  {value === "epsilon" ? t("numeric.epsilonMode") : t("numeric.iterationsMode")}
                </button>
              ))}
            </div>
            <div className="mt-5 grid gap-4">
              <label className="grid gap-1.5 text-sm text-zinc-300">
                <span>{t("numeric.x")}</span>
                <input className={fieldClass} value={rawX} onChange={(event) => setRawX(event.target.value)} />
              </label>
              {mode === "epsilon" ? (
                <label className="grid gap-1.5 text-sm text-zinc-300">
                  <span>{t("numeric.epsilon")}</span>
                  <input className={fieldClass} value={rawEpsilon} onChange={(event) => setRawEpsilon(event.target.value)} />
                </label>
              ) : mode === "iterations" ? (
                <label className="grid gap-1.5 text-sm text-zinc-300">
                  <span>{t("numeric.iterations")}</span>
                  <input className={fieldClass} value={rawIterations} onChange={(event) => setRawIterations(event.target.value)} />
                </label>
              ) : null}
            </div>
            {!doubleValid ? <ErrorText>{t("numeric.invalidDouble")}</ErrorText> : mode === "epsilon" && !extraValid ? <ErrorText>{t("numeric.invalidEpsilon")}</ErrorText> : mode === "iterations" && !extraValid ? <ErrorText>{t("numeric.invalidIterations")}</ErrorText> : null}
            {continuousResult === null ? null : <div className="mt-4"><StepControls total={continuousFrames.length} player={player} /></div>}
          </div>
          <div className="min-w-0 bg-zinc-950/70 p-4">
            {continuousFrame === undefined ? null : <ContinuousStepReadout frame={continuousFrame} />}
          </div>
        </div>
        {continuousResult === null ? null : (
          <div className="border-t border-zinc-800 p-4">
          {continuousFrame === undefined ? null : <ContinuousStepVisual frame={continuousFrame} initialRight={Math.max(1, x + 1)} />}
          <div className="mt-5 grid gap-px overflow-hidden rounded-md border border-zinc-800 bg-zinc-800 sm:grid-cols-3">
            <Metric label={t("numeric.approximation")} value={continuousResult.result.toPrecision(12)} />
            <Metric label={t("numeric.absoluteError")} value={Math.abs(continuousResult.result - Math.sqrt(x)).toPrecision(5)} />
            <Metric label={t("controls.probes", { count: probeCount })} value={mode === "epsilon" ? "ε" : String(iterations)} />
          </div>
          {continuousResult?.stagnated ? <ErrorText>{t("numeric.stagnated")}</ErrorText> : null}
          <p className="mt-4 text-xs leading-5 text-zinc-500">{t("numeric.practical")}</p>
          </div>
        )}
      </div>
    </LabShell>
  );
}

function ContinuousStepReadout({
  frame
}: {
  readonly frame: { readonly phase: SearchStepPhase; readonly probe: number; readonly step: ContinuousSearchStep };
}): React.JSX.Element {
  const { t } = useTranslation("binarySearch");
  const { phase, probe, step } = frame;
  const visibleLeft = phase === "move-bound" && step.conditionResult ? step.mid : step.left;
  const visibleRight = phase === "move-bound" && !step.conditionResult ? step.mid : step.right;
  const phaseKey = phaseLabelKey(phase);
  const narration = phase === "calculate-mid"
    ? t("tool.calculateContinuous", {
      left: step.left.toPrecision(6),
      right: step.right.toPrecision(6),
      mid: step.mid.toPrecision(6)
    })
    : phase === "evaluate-condition"
      ? t("tool.evaluateContinuous", {
        mid: step.mid.toPrecision(6),
        result: step.conditionResult ? t("controls.trueValue") : t("controls.falseValue")
      })
      : t("tool.moveContinuous", {
        bound: step.conditionResult ? "left" : "right",
        mid: step.mid.toPrecision(6)
      });
  return (
    <div className="mt-3">
      <div className="grid grid-cols-3 gap-2" aria-label={t("tool.phaseLabel")}>
        {(["calculate", "evaluate", "move"] as const).map((key, index) => (
          <div key={key} className={cn(
            "rounded-md border px-2 py-1.5 text-center font-mono text-[9px] font-semibold uppercase tracking-wide",
            phaseKey === key ? "border-cyan-300 bg-cyan-300/10 text-cyan-100" : "border-zinc-800 text-zinc-600"
          )}>{index + 1}. {t(`tool.phases.${key}`)}</div>
        ))}
      </div>
      <div className="mt-3 rounded-lg border border-cyan-400/20 bg-cyan-400/[0.035] p-3">
        <span className="font-mono text-[10px] font-semibold uppercase tracking-[0.15em] text-cyan-300">{t("tool.probe", { probe })}</span>
        <p className="mt-2 text-sm font-medium leading-6 text-zinc-100" role="status" aria-live="polite">{narration}</p>
        {phase === "calculate-mid" ? (
          <p className="mt-3 overflow-x-auto rounded-md bg-zinc-950 px-3 py-2 font-mono text-sm text-amber-200">
            mid = {step.left.toPrecision(6)} + ({step.right.toPrecision(6)} − {step.left.toPrecision(6)}) / 2 = {step.mid.toPrecision(6)}
          </p>
        ) : phase === "move-bound" ? (
          <p className="mt-3 font-mono text-sm font-semibold text-rose-200">
            {step.conditionResult ? "left" : "right"} ← mid &nbsp;({step.mid.toPrecision(6)})
          </p>
        ) : null}
      </div>
      <PointerSummary
        left={visibleLeft.toPrecision(6)}
        mid={step.mid.toPrecision(6)}
        right={visibleRight.toPrecision(6)}
      />
    </div>
  );
}

function ContinuousStepVisual({
  frame,
  initialRight
}: {
  readonly frame: { readonly phase: SearchStepPhase; readonly probe: number; readonly step: ContinuousSearchStep };
  readonly initialRight: number;
}): React.JSX.Element {
  const { t } = useTranslation("binarySearch");
  const { phase, step } = frame;
  const visibleLeft = phase === "move-bound" && step.conditionResult ? step.mid : step.left;
  const visibleRight = phase === "move-bound" && !step.conditionResult ? step.mid : step.right;
  return (
    <>
      <RangeNumberLine initialLeft={0} initialRight={initialRight} left={visibleLeft} mid={step.mid} right={visibleRight} />
      <p className="mt-3 font-mono text-xs text-zinc-400">{t("numeric.width")}: {Math.max(0, visibleRight - visibleLeft).toExponential(4)}</p>
    </>
  );
}

function Metric({ label, value }: { readonly label: string; readonly value: string }): React.JSX.Element {
  return <div className="bg-zinc-950 p-4"><span className="block text-[10px] uppercase tracking-wide text-zinc-600">{label}</span><strong className="mt-1 block break-all font-mono text-sm text-zinc-200">{value}</strong></div>;
}

export function FirstBadVersionLab(): React.JSX.Element {
  const { t } = useTranslation("binarySearch");
  const [rawN, setRawN] = useState("100");
  const [rawBad, setRawBad] = useState("63");
  const n = Number(rawN);
  const bad = Number(rawBad);
  const validN = Number.isInteger(n) && n >= 1 && n <= 1_000_000_000;
  const validBad = validN && Number.isInteger(bad) && bad >= 1 && bad <= n;
  const trace = validBad ? runDiscreteSearch({ left: 0, right: n, orientation: "false-true", condition: (version) => version >= bad }) : null;
  const frames = trace === null ? [] : expandDiscreteTrace(trace);
  const player = useStepPlayer(frames.length);
  const frame = frames[player.index];
  return (
    <LabShell label={t("bad.applicationTitle")}>
      <div className="mt-5 overflow-hidden rounded-xl border border-zinc-800">
        <div className="grid min-w-0 lg:grid-cols-[minmax(0,18rem)_minmax(0,1fr)]">
          <div className="min-w-0 border-b border-zinc-800 p-4 lg:border-b-0 lg:border-r">
            <div className="grid gap-4">
              <label className="grid gap-1.5 text-sm text-zinc-300"><span>{t("bad.n")}</span><input className={fieldClass} value={rawN} onChange={(event) => setRawN(event.target.value)} /></label>
              <label className="grid gap-1.5 text-sm text-zinc-300"><span>{t("bad.firstBad")}</span><input className={fieldClass} value={rawBad} onChange={(event) => setRawBad(event.target.value)} /></label>
            </div>
            {!validN ? <ErrorText>{t("bad.invalidN")}</ErrorText> : !validBad ? <ErrorText>{t("bad.invalidBad")}</ErrorText> : null}
            {trace === null ? null : <div className="mt-4"><StepControls total={frames.length} player={player} /></div>}
          </div>
          <div className="min-w-0 bg-zinc-950/70 p-4">
            {frame === undefined || trace === null ? null : <DiscreteStepReadout trace={trace} frame={frame} />}
          </div>
        </div>
      {trace === null ? null : (
        <div className="border-t border-zinc-800 p-4">
          {frame === undefined ? null : <DiscreteStepVisual trace={trace} frame={frame} />}
          {frame === undefined || frame.phase === "calculate-mid" ? null : (
            <p className="mt-4 border-l-2 border-rose-400 pl-3 text-sm text-zinc-200" role="status">
              {t("bad.call", { version: frame.step.mid, result: frame.step.conditionResult ? t("controls.trueValue") : t("controls.falseValue") })}
            </p>
          )}
          <p className="mt-5 rounded-md border border-rose-400/25 bg-rose-400/[0.04] px-4 py-2.5 text-sm text-rose-100">{t("bad.answer", { version: trace.boundary, calls: trace.probes })}</p>
        </div>
      )}
      </div>
    </LabShell>
  );
}

interface EditableIngredient {
  readonly need: string;
  readonly stock: string;
}

const magicPresets: Record<string, { readonly powder: string; readonly ingredients: readonly EditableIngredient[] }> = {
  first: { powder: "1000000000", ingredients: [{ need: "1", stock: "1000000000" }] },
  second: { powder: "1", ingredients: Array.from({ length: 10 }, () => ({ need: "1000000000", stock: "1" })) },
  third: { powder: "1", ingredients: [{ need: "2", stock: "11" }, { need: "1", stock: "3" }, { need: "4", stock: "16" }] },
  fourth: { powder: "3", ingredients: [{ need: "4", stock: "11" }, { need: "3", stock: "12" }, { need: "5", stock: "14" }, { need: "6", stock: "20" }] }
};

function parseBoundedBigInt(value: string, minimum: bigint): bigint | null {
  if (!/^\d+$/.test(value.trim())) return null;
  const parsed = BigInt(value.trim());
  return parsed >= minimum && parsed <= 1_000_000_000n ? parsed : null;
}

export function MagicPowderLab(): React.JSX.Element {
  const { t } = useTranslation("binarySearch");
  const [rawPowder, setRawPowder] = useState("1");
  const [rows, setRows] = useState<readonly EditableIngredient[]>(magicPresets.third!.ingredients);
  const powder = parseBoundedBigInt(rawPowder, 0n);
  const ingredients = rows.map((row): MagicIngredient | null => {
    const need = parseBoundedBigInt(row.need, 1n);
    const stock = parseBoundedBigInt(row.stock, 1n);
    return need === null || stock === null ? null : { need, stock };
  });
  const validIngredients = ingredients.every((value): value is MagicIngredient => value !== null);
  const result = powder !== null && validIngredients ? traceMagicPowder(powder, ingredients) : null;
  const frames = result === null ? [] : expandDiscreteTrace(result.trace);
  const player = useStepPlayer(frames.length);
  const frame = frames[player.index];
  const candidateCheck = frame === undefined || powder === null || !validIngredients
    ? null
    : checkMagicPowder(BigInt(frame.step.mid), powder, ingredients);

  const updateRow = (index: number, key: keyof EditableIngredient, value: string): void => {
    setRows((current) => current.map((row, rowIndex) => rowIndex === index ? { ...row, [key]: value } : row));
  };
  const applyPreset = (key: string): void => {
    const preset = magicPresets[key];
    if (preset === undefined) return;
    setRawPowder(preset.powder);
    setRows(preset.ingredients.map((row) => ({ ...row })));
  };

  return (
    <LabShell label={t("magic.applicationTitle")}>
      <div className="mt-5 overflow-hidden rounded-xl border border-zinc-800">
        <div className="grid min-w-0 lg:grid-cols-[minmax(0,18rem)_minmax(0,1fr)]">
          <div className="min-w-0 border-b border-zinc-800 p-4 lg:border-b-0 lg:border-r">
            <div className="grid gap-4">
              <label className="grid gap-1.5 text-sm text-zinc-300"><span>{t("magic.powder")}</span><input className={fieldClass} value={rawPowder} onChange={(event) => setRawPowder(event.target.value)} /></label>
              <label className="grid gap-1.5 text-sm text-zinc-300">
                <span>{t("magic.preset")}</span>
                <select className={fieldClass} defaultValue="third" onChange={(event) => applyPreset(event.target.value)}>
                  {(["first", "second", "third", "fourth"] as const).map((key) => <option key={key} value={key}>{t(`magic.presets.${key}`)}</option>)}
                </select>
              </label>
            </div>
            <div className="mt-5 space-y-2">
              {rows.map((row, index) => (
                <fieldset key={index} className="grid gap-3 rounded-md border border-zinc-800 bg-zinc-950/60 p-3 sm:items-end">
                  <legend className="px-1 font-mono text-[10px] uppercase tracking-wide text-zinc-500">{t("magic.ingredient", { index: index + 1 })}</legend>
                  <span className="hidden font-mono text-xs text-zinc-600 sm:block">#{index + 1}</span>
                  <label className="grid gap-1 text-xs text-zinc-400"><span>{t("magic.need")}</span><input className={fieldClass} value={row.need} onChange={(event) => updateRow(index, "need", event.target.value)} /></label>
                  <label className="grid gap-1 text-xs text-zinc-400"><span>{t("magic.stock")}</span><input className={fieldClass} value={row.stock} onChange={(event) => updateRow(index, "stock", event.target.value)} /></label>
                  <button type="button" disabled={rows.length === 1} className="min-h-10 rounded-md border border-zinc-700 px-3 text-xs text-zinc-400 disabled:opacity-30" onClick={() => setRows((current) => current.filter((_, rowIndex) => rowIndex !== index))}>{t("magic.remove")}</button>
                </fieldset>
              ))}
            </div>
            <button type="button" disabled={rows.length >= MAX_ITEMS} className="mt-3 rounded-md border border-cyan-400/40 px-3 py-2 text-xs text-cyan-200 disabled:opacity-30" onClick={() => setRows((current) => [...current, { need: "1", stock: "1" }])}>{t("magic.add")}</button>
            {powder === null ? <ErrorText>{t("magic.invalidPowder")}</ErrorText> : !validIngredients ? <ErrorText>{t("magic.invalidIngredient")}</ErrorText> : null}
            {result === null ? null : <div className="mt-4"><StepControls total={frames.length} player={player} /></div>}
          </div>
          <div className="min-w-0 bg-zinc-950/70 p-4">
            {frame === undefined || result === null ? null : <DiscreteStepReadout trace={result.trace} frame={frame} />}
          </div>
        </div>
      {result === null ? null : (
        <div className="border-t border-zinc-800 p-4">
          {frame === undefined ? null : <DiscreteStepVisual trace={result.trace} frame={frame} />}
          {frame === undefined || frame.phase === "calculate-mid" || candidateCheck === null ? null : (
            <div className="mt-5">
              <p className="border-l-2 border-cyan-400 pl-3 text-sm text-zinc-200" role="status" aria-live="polite">
                {t("magic.candidate", { cookies: frame.step.mid.toLocaleString() })} → {candidateCheck.feasible ? t("magic.feasible") : t("magic.infeasible")}
              </p>
              <div className="mt-4 max-h-72 overflow-auto rounded-md border border-zinc-800">
                <table className="w-full min-w-[34rem] border-collapse text-left text-xs">
                  <thead className="sticky top-0 bg-zinc-900 text-zinc-500"><tr><th className="p-3">#</th><th className="p-3">{t("magic.required")}</th><th className="p-3">{t("magic.deficit")}</th><th className="p-3">{t("magic.used")}</th></tr></thead>
                  <tbody>{candidateCheck.checks.map((check) => <tr key={check.index} className="border-t border-zinc-800 font-mono text-zinc-300"><th className="p-3">{check.index + 1}</th><td className="p-3">{check.required.toString()}</td><td className="p-3">{check.deficit.toString()}</td><td className="p-3">{check.used.toString()}</td></tr>)}</tbody>
                </table>
              </div>
            </div>
          )}
          <p className="mt-5 rounded-md border border-rose-400/25 bg-rose-400/[0.04] px-4 py-2.5 text-sm text-rose-100">{t("magic.answer", { cookies: result.result.toString() })}</p>
        </div>
      )}
      </div>
    </LabShell>
  );
}
