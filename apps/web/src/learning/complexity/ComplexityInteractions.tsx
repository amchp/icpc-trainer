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
import { BatchSearchWorkFormula, MemoryFormula, RuntimeFormula } from "./MathFormula.js";

export function ExactCountWorksheet(): React.JSX.Element {
  const { t, i18n } = useTranslation("timeComplexity");
  const snippets = getTimeComplexitySnippets(i18n.resolvedLanguage ?? i18n.language);
  const [passes, setPasses] = useState(["", ""]);
  const [comparisons, setComparisons] = useState("");
  const [variables, setVariables] = useState("");
  const [attempts, setAttempts] = useState(0);
  const [correct, setCorrect] = useState(false);

  const check = (): void => {
    const matches = passes.every((value, index) => Number(value) === [4, 5][index]) && Number(comparisons) === 9 && Number(variables) === 2;
    setCorrect(matches);
    if (!matches) setAttempts((current) => current + 1);
  };

  const reveal = (): void => {
    setPasses(["4", "5"]);
    setComparisons("9");
    setVariables("2");
    setCorrect(true);
  };

  return (
    <section className="my-10 rounded-lg border border-cyan-400/25 bg-cyan-400/[0.04] p-4 sm:p-5" aria-labelledby="exact-count-title">
      <h3 id="exact-count-title" className="text-xl font-semibold text-zinc-100">{t("count.worksheetTitle")}</h3>
      <p className="mt-2 text-sm leading-6 text-zinc-400">{t("count.worksheetDescription")}</p>
      <div className="mt-5 overflow-hidden rounded-md border border-zinc-800 bg-zinc-950">
        <GuideCodeBlock code={snippets.countTrace} />
      </div>
      <ol className="mt-5 grid gap-3 text-sm leading-6 text-zinc-300 sm:grid-cols-3">
        {[t("count.questionStart"), t("count.questionStop"), t("count.questionWork")].map((question, index) => (
          <li key={question} className="border-l border-cyan-400/50 pl-3"><span className="font-mono text-[10px] text-cyan-400">Q{index + 1}</span><span className="mt-1 block">{question}</span></li>
        ))}
      </ol>
      <div className="mt-5 overflow-x-auto">
        <table className="w-full min-w-[30rem] border-collapse text-left text-sm">
          <caption className="mb-3 text-left text-sm font-medium text-zinc-200">{t("count.traceCaption")}</caption>
          <thead className="border-y border-zinc-800 text-xs uppercase tracking-wide text-zinc-500"><tr><th className="px-3 py-2">{t("count.search")}</th><th className="px-3 py-2">{t("count.jValues")}</th><th className="px-3 py-2">{t("count.passComparisons")}</th></tr></thead>
          <tbody className="divide-y divide-zinc-800/80">
            {[
              { query: 31, visits: "18, 42, 7, 31" },
              { query: 50, visits: "18, 42, 7, 31, 99" }
            ].map(({ query, visits }, index) => (
              <tr key={query}>
                <th scope="row" className="px-3 py-3 font-mono text-cyan-200">{query}</th>
                <td className="px-3 py-3 font-mono text-zinc-400">{visits}</td>
                <td className="w-40 px-3 py-3"><Input aria-label={t("count.passLabel", { query })} inputMode="numeric" type="number" min="0" value={passes[index]} onChange={(event) => { const next = [...passes]; next[index] = event.target.value; setPasses(next); setCorrect(false); }} /></td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <div className="mt-5 grid gap-4 sm:grid-cols-2">
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
            <div className="mt-5"><BatchSearchWorkFormula label={t("count.formulaLabel")} /></div>
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

const CHART_FAMILIES = ["constant", "logarithmic", "linear", "linearithmic", "quadratic", "cubic", "exponential", "factorial"] as const;
const CHART_COLORS: Readonly<Record<(typeof CHART_FAMILIES)[number], string>> = {
  constant: "#67e8f9",
  logarithmic: "#60a5fa",
  linear: "#a78bfa",
  linearithmic: "#c084fc",
  quadratic: "#fbbf24",
  cubic: "#fb923c",
  exponential: "#fb7185",
  factorial: "#f87171"
};
const CHART_INPUTS = [10, 100, 1000, 10_000, 100_000, 1_000_000] as const;
const CHART_INPUT_LABELS = ["10", "100", "1k", "10k", "100k", "1M"] as const;

export function ComplexityCurveChart(): React.JSX.Element {
  const { t } = useTranslation("timeComplexity");
  const labels: Readonly<Record<(typeof CHART_FAMILIES)[number], string>> = {
    constant: t("notation.familyConstant"), logarithmic: t("notation.familyLog"), linear: t("notation.familyLinear"),
    linearithmic: t("notation.familyNLogN"), quadratic: t("notation.familyQuadratic"), exponential: t("notation.familyExponential"),
    cubic: t("notation.familyCubic"), factorial: t("notation.familyFactorial")
  };
  const points = (family: (typeof CHART_FAMILIES)[number]): string => {
    const visible: Array<{ x: number; y: number }> = [];
    let previous: { x: number; log10: number } | null = null;
    for (const [index, n] of CHART_INPUTS.entries()) {
      const x = 14 + index * (140 / (CHART_INPUTS.length - 1));
      const log10 = Math.max(0, log10OperationCount(family, n));
      if (log10 <= 18) {
        visible.push({ x, y: 48 - (log10 / 18) * 40 });
        previous = { x, log10 };
        continue;
      }
      if (previous) {
        const ratio = (18 - previous.log10) / (log10 - previous.log10);
        visible.push({ x: previous.x + ratio * (x - previous.x), y: 8 });
      }
      break;
    }
    return visible.map(({ x, y }) => `${x.toFixed(2)},${y.toFixed(2)}`).join(" ");
  };

  return (
    <figure className="my-10 border-y border-zinc-800 py-5">
      <p className="mb-4 max-w-3xl text-sm leading-6 text-zinc-400">{t("notation.chartIntro")}</p>
      <svg viewBox="0 0 160 62" className="h-auto w-full" role="img" aria-labelledby="complexity-chart-title complexity-chart-description" data-n-max="1000000">
        <title id="complexity-chart-title">{t("notation.chartLabel")}</title>
        <desc id="complexity-chart-description">{t("notation.chartDescription")}</desc>
        {[0, 6, 12, 18].map((exponent) => {
          const y = 48 - (exponent / 18) * 40;
          return <g key={exponent}><line x1="14" x2="154" y1={y} y2={y} stroke="#3f3f46" strokeWidth="0.35" strokeDasharray="2 2" /><text x="12" y={y + 0.8} fill="#71717a" fontSize="2.0" textAnchor="end">10^{exponent}</text></g>;
        })}
        {CHART_FAMILIES.map((family) => (
          <polyline key={family} data-testid={`curve-${family}`} points={points(family)} fill="none" stroke={CHART_COLORS[family]} strokeWidth="1.35" vectorEffect="non-scaling-stroke" />
        ))}
        {CHART_INPUT_LABELS.map((label, index) => {
          const x = 14 + index * (140 / (CHART_INPUT_LABELS.length - 1));
          return <text key={label} x={x} y="55" fill="#71717a" fontSize="2.0" textAnchor="middle">{label}</text>;
        })}
        <text x="84" y="60" fill="#a1a1aa" fontSize="2.2" textAnchor="middle">{t("notation.chartXAxis")}</text>
      </svg>
      <figcaption>
        <ul className="mt-4 flex flex-wrap gap-x-5 gap-y-2 text-xs text-zinc-400" aria-label={t("notation.chartDescription")}>
          {CHART_FAMILIES.map((family) => <li key={family} className="inline-flex items-center gap-2"><span className="size-2 rounded-full" style={{ backgroundColor: CHART_COLORS[family] }} aria-hidden="true" />{labels[family]}</li>)}
        </ul>
        <p className="mt-3 text-sm leading-6 text-zinc-500">{t("notation.chartNote")}</p>
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
      <OperationRateAnchor />
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
      <div className="mt-5 space-y-3.5" aria-label={t("growth.metersLabel")}>
        {METER_FAMILIES.map((family) => {
          const estimate = operationEstimate(family, n);
          const operationText = formatLog10Value(estimate.log10, locale);
          const duration = formatDuration(estimate.log10 - Math.log10(DEFAULT_OPERATIONS_PER_SECOND), locale, t("budget.universe"));
          return (
            <div key={family}>
              <div className="mb-1.5 flex flex-wrap items-baseline justify-between gap-x-4 gap-y-1">
                <strong className="font-mono text-sm text-zinc-100">{familyLabel(family)}</strong>
                <span className="text-right text-sm font-medium text-violet-200">{duration}</span>
              </div>
              <div className="relative h-2.5 rounded-full bg-zinc-800" role="progressbar" aria-label={`${familyLabel(family)}: ${operationText} modeled operations`} aria-valuemin={0} aria-valuemax={18} aria-valuenow={Math.min(18, Math.max(0, estimate.log10))}>
                <div className={cn("h-full rounded-full", estimate.exceedsVisualCap ? "bg-rose-400" : "bg-violet-400")} style={{ width: `${meterWidthPercent(estimate.log10)}%` }} />
                <span className="absolute inset-y-[-0.2rem] w-px bg-cyan-200/80" style={{ left: `${(Math.log10(DEFAULT_OPERATIONS_PER_SECOND) / 18) * 100}%` }} aria-hidden="true" />
              </div>
              <div className="mt-1.5 flex flex-wrap justify-between gap-x-4 gap-y-1 text-[11px] leading-4 text-zinc-500">
                <span>{t("growth.operations", { value: operationText })}</span>
                <span>{t("growth.fullScale")}</span>
              </div>
            </div>
          );
        })}
      </div>
      <p className="mt-5 text-xs leading-5 text-zinc-500">{t("growth.scaleNote")}</p>
    </div>
  );
}

export function RuntimeEstimator({ n, onNChange }: { readonly n: number; readonly onNChange: (n: number) => void }): React.JSX.Element {
  const { t, i18n } = useTranslation("timeComplexity");
  const locale = i18n.resolvedLanguage ?? i18n.language;
  const [family, setFamily] = useState<ComplexityFamily>("quadratic");
  const [constant, setConstant] = useState("1");
  const runtime = runtimeLog10Seconds(family, n, Number(constant), DEFAULT_OPERATIONS_PER_SECOND);
  const runtimeValid = Number.isFinite(runtime) && Number(constant) >= 0.000001 && Number(constant) <= 1e12;

  return (
    <section className="my-10 rounded-lg border border-zinc-800 bg-zinc-950/65 p-4 sm:p-5" aria-labelledby="runtime-estimator-title">
      <h3 id="runtime-estimator-title" className="text-lg font-semibold text-zinc-100">{t("budget.runtimeTitle")}</h3>
      <p className="mt-2 text-sm leading-6 text-zinc-400">{t("budget.runtimeQuestion")}</p>
      <OperationRateAnchor compact />
      <div className="mt-4"><RuntimeFormula label={t("budget.formulaLabel")} /></div>
      <div className="mt-5 grid gap-3 sm:grid-cols-3">
        <Label className="sm:col-span-1"><span className="mb-2 block text-sm text-zinc-300">{t("budget.family")}</span><Select value={family} onChange={(event) => setFamily(event.target.value as ComplexityFamily)}>{COMPLEXITY_FAMILIES.map((item) => <option key={item} value={item}>{BIG_O_LABELS[item]}</option>)}</Select></Label>
        <Label><span className="mb-2 block text-sm text-zinc-300">{t("budget.n")}</span><Input type="number" min="1" max="1000000000" value={n} onChange={(event) => { const value = Number(event.target.value); if (isValidInputSize(value)) onNChange(value); }} /></Label>
        <Label><span className="mb-2 block text-sm text-zinc-300">{t("budget.constant")}</span><Input type="number" min="0.000001" max="1000000000000" step="any" value={constant} onChange={(event) => setConstant(event.target.value)} /></Label>
      </div>
      <div className="mt-5 border-l-2 border-violet-400 pl-4" aria-live="polite">
        <span className="block text-xs uppercase tracking-wide text-zinc-500">{t("budget.runtimeResult")}</span>
        <strong className="mt-1 block text-xl text-violet-200">{runtimeValid ? formatDuration(runtime, locale, t("budget.universe")) : "—"}</strong>
        <span className="mt-2 block font-mono text-xs text-zinc-400">{t("budget.bigO")}: {BIG_O_LABELS[family]}</span>
      </div>
      {!runtimeValid ? <p className="mt-4 text-sm text-red-300" role="alert">{t("budget.invalid")}</p> : null}
    </section>
  );
}

function OperationRateAnchor({ compact = false }: { readonly compact?: boolean }): React.JSX.Element {
  const { t } = useTranslation("timeComplexity");
  return (
    <aside className={cn("flex flex-wrap items-baseline justify-between gap-x-4 gap-y-1 rounded-lg border border-cyan-400/25 bg-cyan-400/[0.055] px-4 py-2.5", compact ? "mt-4" : "mb-5")} aria-label={t("budget.rateAnchorLabel")}>
      <p className="font-mono text-[10px] font-semibold uppercase tracking-[0.17em] text-cyan-300">{t("budget.rateAnchorEyebrow")}</p>
      <strong className="font-mono text-base text-cyan-100">{t("budget.rateAnchorValue")}</strong>
      <p className="w-full text-xs leading-5 text-zinc-400">{t("budget.rateAnchorMnemonic")}</p>
    </aside>
  );
}

type SpacePrediction = "constant" | "linear" | "quadratic";

export function MemoryAllocationLab({ n, onNChange }: { readonly n: number; readonly onNChange: (n: number) => void }): React.JSX.Element {
  const { t, i18n } = useTranslation("timeComplexity");
  const locale = i18n.resolvedLanguage ?? i18n.language;
  const [strategy, setStrategy] = useState<MemoryStrategy>("pair");
  const [prediction, setPrediction] = useState<SpacePrediction | null>(null);
  const [checked, setChecked] = useState(false);
  const sourceBytes = n * 8;
  const auxiliaryBytes = strategy === "pair" ? 12 : n * (strategy === "sort" ? 8 : 32);
  const totalBytes = sourceBytes + auxiliaryBytes;
  const correctPrediction: SpacePrediction = strategy === "pair" ? "constant" : "linear";
  const sampleIds = [18, 42, 7, 31, 99, 104, 205, 311];
  const visibleCells = Math.min(n, sampleIds.length);
  const maxBarBytes = Math.max(sourceBytes, auxiliaryBytes);
  const rawBytes = (value: number): string => `${value.toLocaleString(locale)} B`;
  const chooseStrategy = (next: MemoryStrategy): void => {
    setStrategy(next);
    setPrediction(null);
    setChecked(false);
  };

  return (
    <section className="my-10 border-y border-amber-400/25" aria-labelledby="memory-allocation-lab-title">
      <div className="border-b border-amber-400/15 py-6">
        <p className="font-mono text-[10px] font-semibold uppercase tracking-[0.18em] text-amber-300">{t("memory.labEyebrow")}</p>
        <h3 id="memory-allocation-lab-title" className="mt-2 text-xl font-semibold tracking-tight text-zinc-50 sm:text-2xl">{t("memory.labTitle")}</h3>
        <p className="mt-3 max-w-2xl text-sm leading-6 text-zinc-400">{t("memory.labDescription")}</p>
      </div>

      <div className="grid gap-5 border-b border-amber-400/15 py-6 sm:grid-cols-[minmax(0,14rem)_1fr] sm:items-end">
        <Label>
          <span className="mb-2 block text-sm font-medium text-zinc-200">{t("memory.userCount")}</span>
          <Input type="number" min="1" max="1000000000" value={n} onChange={(event) => { const value = Number(event.target.value); if (isValidInputSize(value)) onNChange(value); }} />
        </Label>
        <div>
          <p className="mb-2 text-sm font-medium text-zinc-400">{t("memory.userPresets")}</p>
          <div className="flex flex-wrap gap-2">
            {[5, 10, 1000, 1_000_000].map((value) => (
              <button key={value} type="button" className="rounded-md border border-zinc-700 px-3 py-2 font-mono text-xs text-zinc-300 transition-colors hover:border-amber-400 hover:text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber-400" aria-label={t("memory.useUsers", { value: value.toLocaleString(locale) })} onClick={() => onNChange(value)}>
                {value.toLocaleString(locale)}
              </button>
            ))}
          </div>
        </div>
      </div>

      <figure className="py-7" aria-label={t("memory.arrayLabel", { value: n.toLocaleString(locale) })}>
        <figcaption className="flex flex-wrap items-baseline justify-between gap-2">
          <span className="text-sm font-medium text-zinc-200">{t("memory.sourceArray")}</span>
          <span className="font-mono text-xs text-cyan-200">{t("memory.arrayFormula", { value: n.toLocaleString(locale), bytes: rawBytes(sourceBytes) })}</span>
        </figcaption>
        <div className="mt-4 flex flex-wrap gap-2">
          {Array.from({ length: visibleCells }, (_, index) => (
            <div key={index} className="min-w-16 rounded-md border border-cyan-400/25 bg-cyan-400/[0.06] px-3 py-2 text-center">
              <span className="block font-mono text-xs text-cyan-100">{sampleIds[index]}</span>
              <span className="mt-1 block font-mono text-[10px] text-zinc-500">8 B</span>
            </div>
          ))}
          {n > sampleIds.length ? (
            <div className="min-w-20 rounded-md border border-dashed border-zinc-700 px-3 py-2 text-center">
              <span className="block text-xs text-zinc-400">…</span>
              <span className="mt-1 block font-mono text-[10px] text-zinc-500">{t("memory.totalItems", { value: n.toLocaleString(locale) })}</span>
            </div>
          ) : null}
        </div>
        <p className="mt-4 text-xs leading-5 text-zinc-500">{t("memory.byteReminder")}</p>
      </figure>

      <div className="border-y border-amber-400/15 py-7">
        <Label>
          <span className="mb-2 block text-sm font-medium text-zinc-200">{t("memory.labStrategy")}</span>
          <Select value={strategy} onChange={(event) => chooseStrategy(event.target.value as MemoryStrategy)}>
            <option value="pair">{t("memory.pairModel")}</option>
            <option value="sort">{t("memory.sortModel")}</option>
            <option value="hash">{t("memory.hashModel")}</option>
          </Select>
        </Label>
        <p className="mt-3 border-l-2 border-amber-400/50 pl-4 text-sm leading-6 text-zinc-400">{t(`memory.${strategy}Explanation`)}</p>
        <div className="mt-5 space-y-4">
          <AllocationBar label={t("memory.inputMemory")} value={rawBytes(sourceBytes)} width={Math.max(4, (sourceBytes / maxBarBytes) * 100)} color="bg-cyan-400" />
          <AllocationBar label={t("memory.auxiliaryMemory")} value={rawBytes(auxiliaryBytes)} width={Math.max(4, (auxiliaryBytes / maxBarBytes) * 100)} color="bg-amber-400" />
        </div>
        <dl className="mt-5 grid gap-4 sm:grid-cols-3">
          <MemoryNumber label={t("memory.inputMemory")} value={rawBytes(sourceBytes)} />
          <MemoryNumber label={t("memory.auxiliaryMemory")} value={rawBytes(auxiliaryBytes)} />
          <MemoryNumber label={t("memory.totalMemory")} value={rawBytes(totalBytes)} />
        </dl>
      </div>

      <div className="py-7">
        <p className="text-sm font-medium text-zinc-200">{t("memory.predictionQuestion")}</p>
        <p className="mt-1 text-sm leading-6 text-zinc-500">{t("memory.predictionHint")}</p>
        <div className="mt-4 flex flex-wrap gap-2">
          {([
            ["constant", "O(1)"],
            ["linear", "O(n)"],
            ["quadratic", "O(n²)"]
          ] as const).map(([value, label]) => (
            <button key={value} type="button" aria-pressed={prediction === value} className={cn("rounded-md border px-4 py-2 font-mono text-sm transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber-400", prediction === value ? "border-amber-400 bg-amber-400/10 text-amber-100" : "border-zinc-700 text-zinc-400 hover:border-zinc-500 hover:text-zinc-100")} onClick={() => { setPrediction(value); setChecked(false); }}>
              {label}
            </button>
          ))}
        </div>
        <div className="mt-4 flex flex-wrap items-center gap-4">
          <Button type="button" disabled={prediction === null} onClick={() => setChecked(true)}>{t("memory.checkPrediction")}</Button>
          {checked && prediction ? (
            <p className={cn("text-sm leading-6", prediction === correctPrediction ? "text-emerald-200" : "text-amber-200")} role="status">
              {prediction === correctPrediction ? t(`memory.predictionCorrect.${strategy}`) : t(`memory.predictionIncorrect.${strategy}`)}
            </p>
          ) : null}
        </div>
      </div>
    </section>
  );
}

function AllocationBar({ label, value, width, color }: { readonly label: string; readonly value: string; readonly width: number; readonly color: string }): React.JSX.Element {
  return (
    <div>
      <div className="mb-2 flex items-center justify-between gap-4 text-xs"><span className="text-zinc-400">{label}</span><span className="font-mono text-zinc-200">{value}</span></div>
      <div className="h-3 overflow-hidden rounded-full bg-zinc-800"><div className={cn("h-full rounded-full transition-[width] motion-reduce:transition-none", color)} style={{ width: `${Math.min(100, width)}%` }} /></div>
    </div>
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
    <section className="my-10 border-y border-amber-400/25 py-7" aria-labelledby="memory-model-title">
      <h3 id="memory-model-title" className="text-xl font-semibold text-zinc-100">{t("memory.explorerTitle")}</h3>
      <p className="mt-2 text-sm leading-6 text-zinc-400">{t("memory.explorerDescription")}</p>
      <ol className="mt-5 divide-y divide-zinc-800 border-y border-zinc-800">
        {([
          [t("memory.stepItemsLabel"), t("memory.stepItemsValue")],
          [t("memory.stepBytesLabel"), t("memory.stepBytesValue")],
          [t("memory.stepGrowthLabel"), t("memory.stepGrowthValue")]
        ] as const).map(([label, value], index) => (
          <li key={label} className="grid gap-1 py-4 sm:grid-cols-[2rem_minmax(0,1fr)_minmax(0,1fr)] sm:items-baseline sm:gap-4">
            <span className="font-mono text-xs text-amber-300">0{index + 1}</span>
            <span className="text-sm text-zinc-400">{label}</span>
            <strong className="font-mono text-sm font-medium text-zinc-100">{value}</strong>
          </li>
        ))}
      </ol>
      <div className="mt-5"><MemoryFormula label={t("memory.formulaLabel")} /></div>
      <div className="mt-5 grid gap-3 sm:grid-cols-3">
        <Label><span className="mb-2 block text-sm text-zinc-300">{t("memory.strategy")}</span><Select value={strategy} onChange={(event) => selectStrategy(event.target.value as MemoryStrategy)}><option value="pair">{t("memory.pairModel")}</option><option value="sort">{t("memory.sortModel")}</option><option value="hash">{t("memory.hashModel")}</option></Select></Label>
        <Label><span className="mb-2 block text-sm text-zinc-300">{t("budget.n")}</span><Input type="number" min="1" max="1000000000" value={n} onChange={(event) => { const value = Number(event.target.value); if (isValidInputSize(value)) onNChange(value); }} /></Label>
        <Label><span className="mb-2 block text-sm text-zinc-300">{t("budget.limit")}</span><Input type="number" min="1" max="1000000000" step="any" value={limitMiB} onChange={(event) => setLimitMiB(event.target.value)} /></Label>
        {strategy === "pair" ? (
          <div className="border-l-2 border-amber-400/40 pl-3"><span className="block text-xs uppercase tracking-wide text-zinc-500">{t("memory.fixedBytes")}</span><strong className="mt-1 block font-mono text-zinc-100">12 B</strong></div>
        ) : (
          <Label><span className="mb-2 block text-sm text-zinc-300">{t("budget.bytesPerItem")}</span><Input type="number" min="1" max="1000000000" step="any" value={bytesPerItem} onChange={(event) => setBytesPerItem(event.target.value)} /></Label>
        )}
      </div>
      <p className="mt-4 border-l border-amber-400/50 pl-3 text-sm leading-6 text-amber-100/80">{t(`memory.${strategy}Explanation`)}</p>
      {memory ? (
        <div className="mt-5" aria-live="polite">
          <dl className="grid gap-5 sm:grid-cols-3">
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
  return <div className="border-l-2 border-zinc-800 pl-3"><dt className="text-xs uppercase tracking-wide text-zinc-500">{label}</dt><dd className="mt-1 font-mono text-sm text-zinc-100">{value}</dd></div>;
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
