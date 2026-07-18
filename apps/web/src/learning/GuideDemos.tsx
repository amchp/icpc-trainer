import { ChevronLeft, ChevronRight, Pause, Play, RotateCcw } from "lucide-react";
import { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";

import { cn } from "../lib.js";

function DemoPanel({ label, accent, children }: { readonly label: string; readonly accent: string; readonly children: React.ReactNode }): React.JSX.Element {
  return (
    <div className="relative my-10 rounded-lg border border-zinc-800 bg-zinc-900/25 p-6 sm:p-8">
      <span className={cn("absolute -top-2 left-5 bg-[#09090b] px-2 font-mono text-[10px] uppercase tracking-[0.18em]", accent)}>{label}</span>
      {children}
    </div>
  );
}

export function TypeExplorer(): React.JSX.Element {
  const { t } = useTranslation("programmingFundamentals");
  const types = { bool: ["true", t("demos.bool")], int: ["42", t("demos.integer")], double: ["3.1416", t("demos.decimal")], char: ["'A'", t("demos.character")] } as const;
  const [type, setType] = useState<keyof typeof types>("int");

  return (
    <DemoPanel label={t("demos.explore")} accent="text-cyan-300">
      <div className="flex flex-wrap gap-2" role="group" aria-label={t("demos.typeSelection")}>
        {(Object.keys(types) as Array<keyof typeof types>).map((key) => (
          <button
            type="button"
            key={key}
            aria-pressed={type === key}
            onClick={() => setType(key)}
            className={cn("rounded-md border px-3 py-1.5 font-mono text-xs transition-colors", type === key ? "border-cyan-400 bg-cyan-400/10 text-cyan-200" : "border-zinc-700 text-zinc-400 hover:border-zinc-500 hover:text-zinc-200")}
          >
            {key}
          </button>
        ))}
      </div>
      <div className="mt-7 grid gap-2 sm:grid-cols-[12rem_1fr] sm:items-baseline">
        <output className="font-mono text-4xl text-cyan-300">{types[type][0]}</output>
        <p className="m-0 text-zinc-400">{types[type][1]}</p>
      </div>
    </DemoPanel>
  );
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

export function LoopStepper(): React.JSX.Element {
  const { t } = useTranslation("programmingFundamentals");
  const [step, setStep] = useState(0);
  const [playing, setPlaying] = useState(false);
  const reducedMotion = usePrefersReducedMotion();
  const done = step === 5;

  useEffect(() => {
    if (!playing || reducedMotion) return;
    const timer = window.setInterval(() => {
      setStep((current) => Math.min(5, current + 1));
    }, 900);
    return () => window.clearInterval(timer);
  }, [playing, reducedMotion]);

  useEffect(() => {
    if (reducedMotion) setPlaying(false);
  }, [reducedMotion]);

  useEffect(() => {
    if (done) setPlaying(false);
  }, [done]);

  const reset = (): void => {
    setPlaying(false);
    setStep(0);
  };
  const summary = t("demos.loopSummary", {
    current: done ? t("demos.end") : `i = ${step + 1}`,
    printed: step === 0 ? t("demos.none") : [1, 2, 3, 4, 5].slice(0, step).join(", ")
  });

  return (
    <DemoPanel label={t("demos.runLoop")} accent="text-violet-300">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <span className="font-mono text-xs uppercase tracking-[0.14em] text-zinc-500">{t("demos.currentState")}</span>
          <output className="mt-2 block font-mono text-4xl text-violet-300">{done ? t("demos.end") : `i = ${step + 1}`}</output>
        </div>
        <div className="flex flex-wrap gap-2">
          <button type="button" disabled={step === 0} className="rounded-md border border-zinc-700 p-2 text-zinc-300 disabled:opacity-40" aria-label={t("demos.previousStep")} onClick={() => { setPlaying(false); setStep((value) => Math.max(0, value - 1)); }}><ChevronLeft aria-hidden="true" className="size-4" /></button>
          <button type="button" disabled={done} className="rounded-md border border-zinc-700 p-2 text-zinc-300 disabled:opacity-40" aria-label={t("demos.nextStep")} onClick={() => { setPlaying(false); setStep((value) => Math.min(5, value + 1)); }}><ChevronRight aria-hidden="true" className="size-4" /></button>
          <button type="button" className="rounded-md border border-zinc-700 p-2 text-zinc-300" aria-label={t("demos.resetLoop")} onClick={reset}><RotateCcw aria-hidden="true" className="size-4" /></button>
          <button
            type="button"
            disabled={done || reducedMotion}
            className="inline-flex items-center gap-2 rounded-md bg-violet-500 px-3 py-2 text-sm font-semibold text-white disabled:opacity-40"
            aria-label={playing ? t("demos.pauseLoop") : t("demos.playLoop")}
            aria-pressed={playing}
            aria-describedby={reducedMotion ? "loop-reduced-motion-note" : undefined}
            onClick={() => setPlaying((value) => !value)}
          >
            {playing ? <Pause aria-hidden="true" className="size-4" /> : <Play aria-hidden="true" className="size-4" />}
            {playing ? t("demos.pause") : t("demos.play")}
          </button>
        </div>
      </div>
      <div className="mt-7 flex gap-2" aria-hidden="true">{[1, 2, 3, 4, 5].map((value) => <span key={value} className={cn("grid size-9 place-items-center rounded-sm font-mono text-sm transition-colors motion-reduce:transition-none", value <= step ? "bg-violet-400 text-zinc-950" : "bg-zinc-900 text-zinc-600")}>{value}</span>)}</div>
      <p className="mt-4 text-sm text-zinc-400" aria-live="polite">{summary}</p>
      {reducedMotion ? <p id="loop-reduced-motion-note" className="mt-2 text-xs text-zinc-500">{t("demos.reducedMotion")}</p> : null}
    </DemoPanel>
  );
}

export function FunctionTrace(): React.JSX.Element {
  const { t } = useTranslation("programmingFundamentals");
  const [step, setStep] = useState(0);
  const stages = [t("demos.functionCall"), t("demos.functionParameters"), t("demos.functionCalculation"), t("demos.functionReturn")] as const;
  const summaries = [t("demos.functionSummary1"), t("demos.functionSummary2"), t("demos.functionSummary3"), t("demos.functionSummary4")] as const;

  return (
    <DemoPanel label={t("demos.traceFunction")} accent="text-emerald-300">
      <ol className="grid gap-2 sm:grid-cols-4" aria-label={t("demos.functionTraceSteps")}>
        {stages.map((stage, index) => (
          <li key={stage} aria-current={step === index ? "step" : undefined} className={cn("rounded-md border px-3 py-3 font-mono text-xs", step === index ? "border-emerald-400 bg-emerald-400/10 text-emerald-200" : index < step ? "border-emerald-900 text-zinc-400" : "border-zinc-800 text-zinc-600")}>
            <span className="mr-2 text-[10px]">{index + 1}</span>{stage}
          </li>
        ))}
      </ol>
      <p className="mt-5 text-sm text-zinc-300" role="status" aria-live="polite">{summaries[step]}</p>
      <div className="mt-5 flex gap-2">
        <button type="button" disabled={step === 0} className="rounded-md border border-zinc-700 px-3 py-2 text-sm disabled:opacity-40" onClick={() => setStep((value) => value - 1)}>{t("demos.previous")}</button>
        <button type="button" disabled={step === stages.length - 1} className="rounded-md bg-emerald-500 px-3 py-2 text-sm font-semibold text-zinc-950 disabled:opacity-40" onClick={() => setStep((value) => value + 1)}>{t("demos.next")}</button>
        <button type="button" className="rounded-md border border-zinc-700 px-3 py-2 text-sm" onClick={() => setStep(0)}>{t("demos.resetTrace")}</button>
      </div>
    </DemoPanel>
  );
}
