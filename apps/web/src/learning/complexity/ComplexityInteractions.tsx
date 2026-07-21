import { Check, Gauge, RotateCcw } from "lucide-react";
import { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";

import { Button, Input, Label, Select } from "../../components/ui.js";
import { cn } from "../../lib.js";
import { GuideCodeBlock } from "../GuideCodeBlock.js";
import { getTimeComplexitySnippets } from "../snippets/timeComplexitySnippets.js";
import {
  BIG_O_LABELS,
  COMPLEXITY_FAMILIES,
  DEFAULT_OPERATIONS_PER_SECOND,
  formatBytes,
  formatDuration,
  formatLog10Value,
  isValidInputSize,
  log10OperationCount,
  memoryModelEstimate,
  METER_FAMILIES,
  meterWidthPercent,
  operationEstimate,
  runtimeLog10Seconds,
  type ComplexityFamily,
  type MemoryStrategy
} from "./complexityMath.js";
import { MemoryFormula, PairCountFormula, RuntimeFormula } from "./MathFormula.js";

export function ExactCountWorksheet(): React.JSX.Element {
  const { t, i18n } = useTranslation("timeComplexity");
  const snippets = getTimeComplexitySnippets(i18n.resolvedLanguage ?? i18n.language);
  const [passes, setPasses] = useState(["", "", "", ""]);
  const [comparisons, setComparisons] = useState("");
  const [variables, setVariables] = useState("");
  const [attempts, setAttempts] = useState(0);
  const [correct, setCorrect] = useState(false);

  const check = (): void => {
    const matches = passes.every((value, index) => Number(value) === [4, 3, 2, 1][index]) && Number(comparisons) === 10 && Number(variables) === 2;
    setCorrect(matches);
    if (!matches) setAttempts((current) => current + 1);
  };

  const reveal = (): void => {
    setPasses(["4", "3", "2", "1"]);
    setComparisons("10");
    setVariables("2");
    setCorrect(true);
  };

  return (
    <section className="my-10 rounded-lg border border-cyan-400/25 bg-cyan-400/[0.04] p-5 sm:p-7" aria-labelledby="exact-count-title">
      <h3 id="exact-count-title" className="text-xl font-semibold text-zinc-100">{t("count.worksheetTitle")}</h3>
      <p className="mt-2 text-sm leading-6 text-zinc-400">{t("count.worksheetDescription")}</p>
      <div className="mt-6 overflow-hidden rounded-md border border-zinc-800 bg-zinc-950">
        <GuideCodeBlock code={snippets.countTrace} />
      </div>
      <ol className="mt-6 grid gap-3 text-sm leading-6 text-zinc-300 sm:grid-cols-3">
        {[t("count.questionStart"), t("count.questionStop"), t("count.questionWork")].map((question, index) => (
          <li key={question} className="border-l border-cyan-400/50 pl-3"><span className="font-mono text-[10px] text-cyan-400">Q{index + 1}</span><span className="mt-1 block">{question}</span></li>
        ))}
      </ol>
      <div className="mt-6 overflow-x-auto">
        <table className="w-full min-w-[30rem] border-collapse text-left text-sm">
          <caption className="mb-3 text-left text-sm font-medium text-zinc-200">{t("count.traceCaption")}</caption>
          <thead className="border-y border-zinc-800 text-xs uppercase tracking-wide text-zinc-500"><tr><th className="px-3 py-2">i</th><th className="px-3 py-2">{t("count.jValues")}</th><th className="px-3 py-2">{t("count.passComparisons")}</th></tr></thead>
          <tbody className="divide-y divide-zinc-800/80">
            {[0, 1, 2, 3].map((i) => (
              <tr key={i}>
                <th scope="row" className="px-3 py-3 font-mono text-cyan-200">{i}</th>
                <td className="px-3 py-3 font-mono text-zinc-400">{Array.from({ length: 4 - i }, (_, offset) => i + offset + 1).join(", ")}</td>
                <td className="w-40 px-3 py-3"><Input aria-label={t("count.passLabel", { i })} inputMode="numeric" type="number" min="0" value={passes[i]} onChange={(event) => { const next = [...passes]; next[i] = event.target.value; setPasses(next); setCorrect(false); }} /></td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <div className="mt-6 grid gap-4 sm:grid-cols-2">
        <Label>
          <span className="mb-2 block text-sm font-medium text-cyan-200">{t("count.comparisons")}</span>
          <Input inputMode="numeric" type="number" min="0" value={comparisons} onChange={(event) => { setComparisons(event.target.value); setCorrect(false); }} />
        </Label>
        <Label>
          <span className="mb-2 block text-sm font-medium text-cyan-200">{t("count.variables")}</span>
          <Input inputMode="numeric" type="number" min="0" value={variables} onChange={(event) => { setVariables(event.target.value); setCorrect(false); }} />
        </Label>
      </div>
      <div className="mt-5 flex flex-wrap gap-3">
        <Button type="button" onClick={check}>{t("count.check")}</Button>
        {attempts >= 2 && !correct ? <Button type="button" variant="secondary" onClick={reveal}>{t("count.reveal")}</Button> : null}
      </div>
      <div className="mt-4 min-h-12" aria-live="polite">
        {correct ? (
          <div>
            <p className="flex items-start gap-2 text-sm leading-6 text-emerald-200"><Check className="mt-1 size-4 shrink-0" aria-hidden="true" />{t("count.correct")}</p>
            <div className="mt-5"><PairCountFormula label={t("count.formulaLabel")} /></div>
            <p className="mt-3 text-sm leading-6 text-zinc-400">{t("count.formulaQuestion")}</p>
          </div>
        ) : attempts > 0 ? (
          <div className="text-sm leading-6 text-amber-200">
            <p>{t("count.incorrect")}</p>
            <p className="mt-1 font-medium">{t("count.hint")}</p>
          </div>
        ) : null}
      </div>
    </section>
  );
}

const CHART_FAMILIES = ["constant", "logarithmic", "linear", "linearithmic", "quadratic", "exponential", "factorial"] as const;
const CHART_COLORS: Readonly<Record<(typeof CHART_FAMILIES)[number], string>> = {
  constant: "#67e8f9",
  logarithmic: "#60a5fa",
  linear: "#a78bfa",
  linearithmic: "#c084fc",
  quadratic: "#fbbf24",
  exponential: "#fb7185",
  factorial: "#f87171"
};

export function ComplexityCurveChart(): React.JSX.Element {
  const { t } = useTranslation("timeComplexity");
  const labels: Readonly<Record<(typeof CHART_FAMILIES)[number], string>> = {
    constant: t("notation.familyConstant"), logarithmic: t("notation.familyLog"), linear: t("notation.familyLinear"),
    linearithmic: t("notation.familyNLogN"), quadratic: t("notation.familyQuadratic"), exponential: t("notation.familyExponential"),
    factorial: t("notation.familyFactorial")
  };
  const maxLog = log10OperationCount("factorial", 10);
  const points = (family: (typeof CHART_FAMILIES)[number]): string => Array.from({ length: 10 }, (_, index) => {
    const n = index + 1;
    const x = 8 + index * (84 / 9);
    const y = 92 - (Math.max(0, log10OperationCount(family, n)) / maxLog) * 80;
    return `${x.toFixed(2)},${y.toFixed(2)}`;
  }).join(" ");

  return (
    <figure className="my-10 border-y border-zinc-800 py-7">
      <svg viewBox="0 0 100 100" className="h-auto w-full" role="img" aria-labelledby="complexity-chart-title complexity-chart-description">
        <title id="complexity-chart-title">{t("notation.chartLabel")}</title>
        <desc id="complexity-chart-description">{t("notation.chartDescription")}</desc>
        {[20, 40, 60, 80].map((y) => <line key={y} x1="8" x2="94" y1={y} y2={y} stroke="#3f3f46" strokeWidth="0.35" strokeDasharray="2 2" />)}
        {CHART_FAMILIES.map((family) => (
          <polyline key={family} points={points(family)} fill="none" stroke={CHART_COLORS[family]} strokeWidth="1.35" vectorEffect="non-scaling-stroke" />
        ))}
      </svg>
      <figcaption>
        <ul className="mt-5 flex flex-wrap gap-x-5 gap-y-2 text-xs text-zinc-400" aria-label={t("notation.chartDescription")}>
          {CHART_FAMILIES.map((family) => <li key={family} className="inline-flex items-center gap-2"><span className="size-2 rounded-full" style={{ backgroundColor: CHART_COLORS[family] }} aria-hidden="true" />{labels[family]}</li>)}
        </ul>
        <p className="mt-4 text-sm leading-6 text-zinc-500">{t("notation.chartNote")}</p>
      </figcaption>
    </figure>
  );
}

const familyLabel = (family: ComplexityFamily): string => BIG_O_LABELS[family];

export function ComplexityGrowthMeters({ n, onNChange }: { readonly n: number; readonly onNChange: (n: number) => void }): React.JSX.Element {
  const { t, i18n } = useTranslation("timeComplexity");
  const [rawN, setRawN] = useState(String(n));
  useEffect(() => setRawN(String(n)), [n]);
  const valid = isValidInputSize(Number(rawN));
  const applyN = (raw: string): void => {
    setRawN(raw);
    const value = Number(raw);
    if (isValidInputSize(value)) onNChange(value);
  };
  const setPreset = (value: number): void => applyN(String(value));
  const locale = i18n.resolvedLanguage ?? i18n.language;

  return (
    <div className="my-10">
      <div className="grid gap-5 border-y border-zinc-800 py-6 sm:grid-cols-[minmax(0,16rem)_1fr] sm:items-end">
        <Label>
          <span className="mb-2 block text-sm font-medium text-zinc-200">{t("growth.inputLabel")}</span>
          <Input aria-invalid={!valid} inputMode="numeric" type="number" min="1" max="1000000000" step="1" value={rawN} onChange={(event) => applyN(event.target.value)} />
        </Label>
        <div>
          <p className="mb-2 text-sm font-medium text-zinc-400">{t("growth.presets")}</p>
          <div className="flex flex-wrap gap-2">
            {[10, 1000, 1_000_000, 100_000_000].map((value) => (
              <button key={value} type="button" className="rounded-md border border-zinc-700 px-3 py-2 font-mono text-xs text-zinc-300 hover:border-violet-400 hover:text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-violet-400" aria-label={t("growth.preset", { value: value.toLocaleString(locale) })} onClick={() => setPreset(value)}>
                {value.toLocaleString(locale)}
              </button>
            ))}
          </div>
        </div>
      </div>
      {!valid ? <p className="mt-3 text-sm text-red-300" role="alert">{t("growth.invalid")}</p> : null}
      <div className="mt-7 space-y-5" aria-label={t("growth.metersLabel")}>
        {METER_FAMILIES.map((family) => {
          const estimate = operationEstimate(family, n);
          const operationText = formatLog10Value(estimate.log10, locale);
          const duration = formatDuration(estimate.log10 - Math.log10(DEFAULT_OPERATIONS_PER_SECOND), locale, t("budget.universe"));
          return (
            <div key={family}>
              <div className="mb-2 flex flex-wrap items-baseline justify-between gap-x-4 gap-y-1">
                <strong className="font-mono text-sm text-zinc-100">{familyLabel(family)}</strong>
                <span className="text-right text-xs text-zinc-400">{t("growth.operations", { value: operationText })} · {t("growth.duration", { value: duration })}</span>
              </div>
              <div className="h-2.5 overflow-hidden rounded-full bg-zinc-800" role="progressbar" aria-label={`${familyLabel(family)}: ${operationText}`} aria-valuemin={0} aria-valuemax={18} aria-valuenow={Math.min(18, Math.max(0, estimate.log10))}>
                <div className={cn("h-full rounded-full", estimate.exceedsVisualCap ? "bg-rose-400" : "bg-violet-400")} style={{ width: `${meterWidthPercent(estimate.log10)}%` }} />
              </div>
            </div>
          );
        })}
      </div>
      <p className="mt-5 font-mono text-xs text-zinc-500">{t("growth.capNote")}</p>
    </div>
  );
}

export function RuntimeEstimator({ n, onNChange }: { readonly n: number; readonly onNChange: (n: number) => void }): React.JSX.Element {
  const { t, i18n } = useTranslation("timeComplexity");
  const locale = i18n.resolvedLanguage ?? i18n.language;
  const [family, setFamily] = useState<ComplexityFamily>("quadratic");
  const [constant, setConstant] = useState("1");
  const [rate, setRate] = useState("100000000");
  const runtime = runtimeLog10Seconds(family, n, Number(constant), Number(rate));
  const runtimeValid = Number.isFinite(runtime) && Number(constant) >= 0.000001 && Number(constant) <= 1e12 && Number(rate) >= 1 && Number(rate) <= 1e15;

  return (
    <section className="my-10 rounded-lg border border-zinc-800 bg-zinc-950/65 p-5 sm:p-7" aria-labelledby="runtime-estimator-title">
      <h3 id="runtime-estimator-title" className="text-xl font-semibold text-zinc-100">{t("budget.runtimeTitle")}</h3>
      <p className="mt-2 text-sm leading-6 text-zinc-400">{t("budget.runtimeQuestion")}</p>
      <div className="mt-5"><RuntimeFormula label={t("budget.formulaLabel")} /></div>
      <div className="mt-6 grid gap-4 sm:grid-cols-2">
        <Label className="sm:col-span-2"><span className="mb-2 block text-sm text-zinc-300">{t("budget.family")}</span><Select value={family} onChange={(event) => setFamily(event.target.value as ComplexityFamily)}>{COMPLEXITY_FAMILIES.map((item) => <option key={item} value={item}>{BIG_O_LABELS[item]}</option>)}</Select></Label>
        <Label><span className="mb-2 block text-sm text-zinc-300">{t("budget.n")}</span><Input type="number" min="1" max="1000000000" value={n} onChange={(event) => { const value = Number(event.target.value); if (isValidInputSize(value)) onNChange(value); }} /></Label>
        <Label><span className="mb-2 block text-sm text-zinc-300">{t("budget.constant")}</span><Input type="number" min="0.000001" max="1000000000000" step="any" value={constant} onChange={(event) => setConstant(event.target.value)} /></Label>
        <Label className="sm:col-span-2"><span className="mb-2 block text-sm text-zinc-300">{t("budget.rate")}</span><Input type="number" min="1" max="1000000000000000" step="any" value={rate} onChange={(event) => setRate(event.target.value)} /></Label>
      </div>
      <div className="mt-6 border-l-2 border-violet-400 pl-4" aria-live="polite">
        <span className="block text-xs uppercase tracking-wide text-zinc-500">{t("budget.runtimeResult")}</span>
        <strong className="mt-1 block text-2xl text-violet-200">{runtimeValid ? formatDuration(runtime, locale, t("budget.universe")) : "—"}</strong>
        <span className="mt-2 block font-mono text-xs text-zinc-400">{t("budget.bigO")}: {BIG_O_LABELS[family]}</span>
      </div>
      {!runtimeValid ? <p className="mt-4 text-sm text-red-300" role="alert">{t("budget.invalid")}</p> : null}
    </section>
  );
}

const MEMORY_DEFAULT_BYTES: Readonly<Record<MemoryStrategy, number>> = { pair: 8, sort: 8, hash: 32 };

export function MemoryModelExplorer({ n, onNChange }: { readonly n: number; readonly onNChange: (n: number) => void }): React.JSX.Element {
  const { t, i18n } = useTranslation("timeComplexity");
  const locale = i18n.resolvedLanguage ?? i18n.language;
  const [strategy, setStrategy] = useState<MemoryStrategy>("sort");
  const [bytesPerItem, setBytesPerItem] = useState("8");
  const [limitMiB, setLimitMiB] = useState("256");
  const memory = memoryModelEstimate(strategy, n, Number(bytesPerItem), Number(limitMiB));
  const selectStrategy = (next: MemoryStrategy): void => {
    setStrategy(next);
    setBytesPerItem(String(MEMORY_DEFAULT_BYTES[next]));
  };

  return (
    <section className="my-10 rounded-lg border border-amber-400/25 bg-amber-400/[0.035] p-5 sm:p-7" aria-labelledby="memory-model-title">
      <h3 id="memory-model-title" className="text-xl font-semibold text-zinc-100">{t("memory.explorerTitle")}</h3>
      <p className="mt-2 text-sm leading-6 text-zinc-400">{t("memory.explorerDescription")}</p>
      <div className="mt-5"><MemoryFormula label={t("memory.formulaLabel")} /></div>
      <div className="mt-6 grid gap-4 sm:grid-cols-2">
        <Label className="sm:col-span-2"><span className="mb-2 block text-sm text-zinc-300">{t("memory.strategy")}</span><Select value={strategy} onChange={(event) => selectStrategy(event.target.value as MemoryStrategy)}><option value="pair">{t("memory.pairModel")}</option><option value="sort">{t("memory.sortModel")}</option><option value="hash">{t("memory.hashModel")}</option></Select></Label>
        <Label><span className="mb-2 block text-sm text-zinc-300">{t("budget.n")}</span><Input type="number" min="1" max="1000000000" value={n} onChange={(event) => { const value = Number(event.target.value); if (isValidInputSize(value)) onNChange(value); }} /></Label>
        <Label><span className="mb-2 block text-sm text-zinc-300">{t("budget.limit")}</span><Input type="number" min="1" max="1000000000" step="any" value={limitMiB} onChange={(event) => setLimitMiB(event.target.value)} /></Label>
        {strategy === "pair" ? (
          <div className="rounded-md border border-zinc-800 bg-zinc-950/70 px-3 py-3 sm:col-span-2"><span className="block text-xs uppercase tracking-wide text-zinc-500">{t("memory.fixedBytes")}</span><strong className="mt-1 block font-mono text-zinc-100">8 B</strong></div>
        ) : (
          <Label className="sm:col-span-2"><span className="mb-2 block text-sm text-zinc-300">{t("budget.bytesPerItem")}</span><Input type="number" min="1" max="1000000000" step="any" value={bytesPerItem} onChange={(event) => setBytesPerItem(event.target.value)} /></Label>
        )}
      </div>
      <p className="mt-4 border-l border-amber-400/50 pl-3 text-sm leading-6 text-amber-100/80">{t(`memory.${strategy}Explanation`)}</p>
      {memory ? (
        <div className="mt-6" aria-live="polite">
          <dl className="grid gap-px overflow-hidden rounded-md border border-zinc-800 bg-zinc-800 sm:grid-cols-3">
            <MemoryNumber label={t("memory.inputMemory")} value={formatBytes(memory.inputBytes, locale)} />
            <MemoryNumber label={t("memory.auxiliaryMemory")} value={formatBytes(memory.auxiliaryBytes, locale)} />
            <MemoryNumber label={t("memory.totalMemory")} value={formatBytes(memory.totalBytes, locale)} />
          </dl>
          <p className={cn("mt-5 inline-flex items-center gap-2 text-sm font-medium", memory.fits ? "text-emerald-300" : "text-rose-300")}><span aria-hidden="true">{memory.fits ? "✓" : "!"}</span>{memory.fits ? t("budget.fits") : t("budget.exceeds")}</p>
        </div>
      ) : <p className="mt-4 text-sm text-red-300" role="alert">{t("budget.invalid")}</p>}
      <p className="mt-5 text-xs leading-5 text-zinc-500">{t("memory.limitNote")}</p>
    </section>
  );
}

function MemoryNumber({ label, value }: { readonly label: string; readonly value: string }): React.JSX.Element {
  return <div className="bg-zinc-950 p-4"><dt className="text-xs uppercase tracking-wide text-zinc-500">{label}</dt><dd className="mt-2 font-mono text-sm text-zinc-100">{value}</dd></div>;
}

export function RuntimeMemoryEstimators({ n, onNChange }: { readonly n: number; readonly onNChange: (n: number) => void }): React.JSX.Element {
  return <div><RuntimeEstimator n={n} onNChange={onNChange} /><MemoryModelExplorer n={n} onNChange={onNChange} /></div>;
}

interface BenchmarkResult { readonly name: "direct" | "mixed"; readonly milliseconds: number; readonly checksum: number }

const nextFrame = (): Promise<void> => new Promise((resolve) => window.setTimeout(resolve, 0));

export function LocalLinearBenchmark(): React.JSX.Element {
  const { t, i18n } = useTranslation("timeComplexity");
  const [running, setRunning] = useState(false);
  const [results, setResults] = useState<readonly BenchmarkResult[]>([]);

  const run = async (): Promise<void> => {
    setRunning(true);
    setResults([]);
    await nextFrame();
    const values = Array.from({ length: 50_000 }, (_, index) => (index * 17 + 13) % 10_007);
    const workloads = [
      { name: "direct" as const, work: () => { let sum = 0; for (const value of values) sum = (sum + value) % 1_000_000_007; return sum; } },
      { name: "mixed" as const, work: () => { let sum = 0; for (const value of values) sum = (sum + ((value * 31) ^ (value >>> 2))) % 1_000_000_007; return sum; } }
    ];
    for (const workload of workloads) workload.work();
    const measured: BenchmarkResult[] = [];
    for (const workload of workloads) {
      let checksum = 0;
      let milliseconds = 0;
      for (let batch = 0; batch < 4; batch += 1) {
        const started = performance.now();
        checksum = (checksum + workload.work()) % 1_000_000_007;
        milliseconds += performance.now() - started;
        await nextFrame();
      }
      measured.push({ name: workload.name, milliseconds, checksum });
    }
    setResults(measured);
    setRunning(false);
  };

  return (
    <div className="my-10 rounded-lg border border-zinc-800 bg-zinc-950/65 p-5 sm:p-7">
      <Button type="button" disabled={running} onClick={() => void run()}>{running ? <RotateCcw className="size-4 animate-spin motion-reduce:animate-none" aria-hidden="true" /> : <Gauge className="size-4" aria-hidden="true" />}{running ? t("benchmark.running") : t("benchmark.run")}</Button>
      <div className="mt-6 grid gap-4 sm:grid-cols-2" aria-live="polite">
        {results.map((result) => (
          <section key={result.name} className="border-l-2 border-cyan-400 pl-4">
            <h3 className="font-medium text-zinc-100">{t(`benchmark.${result.name}`)}</h3>
            <p className="mt-2 font-mono text-lg text-cyan-200">{t("benchmark.timing", { value: result.milliseconds.toLocaleString(i18n.resolvedLanguage ?? i18n.language, { maximumFractionDigits: 2 }) })}</p>
            <p className="mt-1 text-xs text-zinc-500">{t("benchmark.checksum", { value: result.checksum })}</p>
          </section>
        ))}
      </div>
      <p className="mt-6 text-xs leading-5 text-zinc-500">{t("benchmark.disclaimer")}</p>
    </div>
  );
}
