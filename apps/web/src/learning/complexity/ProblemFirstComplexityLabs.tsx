import { RotateCcw } from "lucide-react";
import { useState } from "react";
import { useTranslation } from "react-i18next";

import { cn } from "../../lib.js";
import { GuideCodeBlock } from "../GuideCodeBlock.js";

export interface ComplexityApproach {
  readonly title: string;
  readonly description: string;
  readonly time: string;
  readonly space: string;
  readonly qualifier?: string;
  readonly code: string;
}

export function ComplexityApproachComparison({
  approaches,
  caveat
}: {
  readonly approaches: readonly ComplexityApproach[];
  readonly caveat?: string;
}): React.JSX.Element {
  const { t } = useTranslation("timeComplexity");

  return (
    <section aria-label={t("problemFirst.comparison.label")} className="my-7">
      <div className="grid gap-4">
        {approaches.map((approach, index) => (
          <article key={approach.title} className="min-w-0 overflow-hidden rounded-lg border border-zinc-800 bg-zinc-950/65">
            <div className="p-5">
              <p className="font-mono text-[10px] uppercase tracking-[0.16em] text-violet-300">
                {t("problemFirst.comparison.candidate", { number: index + 1 })}
              </p>
              <h6 className="mt-2 text-lg font-semibold text-zinc-100">{approach.title}</h6>
              <p className="mt-2 text-sm leading-6 text-zinc-400">{approach.description}</p>
              <dl className="mt-4 grid grid-cols-2 gap-px overflow-hidden rounded-md border border-zinc-800 bg-zinc-800">
                <div className="bg-zinc-900 p-3">
                  <dt className="font-mono text-[10px] uppercase tracking-wide text-zinc-500">{t("problemFirst.comparison.time")}</dt>
                  <dd className="mt-1 break-words font-mono text-sm text-cyan-200">{approach.time}</dd>
                </div>
                <div className="bg-zinc-900 p-3">
                  <dt className="font-mono text-[10px] uppercase tracking-wide text-zinc-500">{t("problemFirst.comparison.space")}</dt>
                  <dd className="mt-1 break-words font-mono text-sm text-amber-200">{approach.space}</dd>
                </div>
              </dl>
              {approach.qualifier === undefined ? null : (
                <p className="mt-3 text-xs leading-5 text-amber-200/90">{approach.qualifier}</p>
              )}
            </div>
            <div className="border-t border-zinc-800 px-4 [&>div]:my-4">
              <GuideCodeBlock code={approach.code} />
            </div>
          </article>
        ))}
      </div>
      {caveat === undefined ? null : (
        <p className="mt-4 border-l-2 border-amber-400 pl-4 text-sm leading-6 text-amber-100/85">{caveat}</p>
      )}
    </section>
  );
}

export function OperationMemoryFormulaLab(): React.JSX.Element {
  const { t, i18n } = useTranslation("timeComplexity");
  const [users, setUsers] = useState(5);
  const [queries, setQueries] = useState(2);
  const locale = i18n.resolvedLanguage ?? i18n.language;
  const format = new Intl.NumberFormat(locale);
  const comparisons = users * queries;
  const inputBytes = (users + queries) * 8;

  return (
    <section aria-labelledby="resource-formula-title" className="my-7 overflow-hidden rounded-lg border border-cyan-400/30 bg-cyan-400/[0.04]">
      <div className="p-5 sm:p-6">
        <p className="font-mono text-[10px] uppercase tracking-[0.16em] text-cyan-300">{t("problemFirst.labs.resources.eyebrow")}</p>
        <h5 id="resource-formula-title" className="mt-2 text-xl font-semibold text-zinc-100">{t("problemFirst.labs.resources.title")}</h5>
        <p className="mt-2 text-sm leading-6 text-zinc-400">{t("problemFirst.labs.resources.description")}</p>
        <div className="mt-4 grid gap-3 sm:grid-cols-2">
          <label className="grid gap-2 text-sm text-zinc-300">
            <span>{t("problemFirst.labs.resources.users")}</span>
            <input
              type="number"
              min="1"
              max="1000000"
              value={users}
              onChange={(event) => setUsers(clampInteger(event.target.value, 1, 1_000_000))}
              className="min-h-11 rounded-md border border-zinc-700 bg-zinc-950 px-3 text-zinc-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-cyan-300"
            />
          </label>
          <label className="grid gap-2 text-sm text-zinc-300">
            <span>{t("problemFirst.labs.resources.queries")}</span>
            <input
              type="number"
              min="1"
              max="1000000"
              value={queries}
              onChange={(event) => setQueries(clampInteger(event.target.value, 1, 1_000_000))}
              className="min-h-11 rounded-md border border-zinc-700 bg-zinc-950 px-3 text-zinc-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-cyan-300"
            />
          </label>
        </div>
      </div>
      <div className="border-y border-zinc-800 px-4 [&>div]:my-4 sm:px-6">
        <GuideCodeBlock code={`for (long long query : queries)\n  for (long long id : users)\n    if (id == query) break; // one modeled comparison`} />
      </div>
      <dl className="grid gap-px bg-zinc-800 sm:grid-cols-2" aria-live="polite">
        <div className="bg-zinc-950 p-4">
          <dt className="font-mono text-[10px] uppercase tracking-wide text-zinc-500">{t("problemFirst.labs.resources.time")}</dt>
          <dd className="mt-2 font-mono text-lg text-cyan-200">T(n, q) = qn</dd>
          <dd className="mt-1 text-sm text-zinc-400">
            {format.format(queries)} × {format.format(users)} = {format.format(comparisons)} {t("problemFirst.labs.resources.comparisons")}
          </dd>
        </div>
        <div className="bg-zinc-950 p-4">
          <dt className="font-mono text-[10px] uppercase tracking-wide text-zinc-500">{t("problemFirst.labs.resources.memory")}</dt>
          <dd className="mt-2 font-mono text-lg text-amber-200">M(n, q) = 8n + 8q + c_fixed</dd>
          <dd className="mt-1 text-sm text-zinc-400">
            8({format.format(users)} + {format.format(queries)}) = {format.format(inputBytes)} B
          </dd>
        </div>
      </dl>
      <p className="px-5 py-4 text-sm leading-6 text-zinc-400 sm:px-6">{t("problemFirst.labs.resources.note")}</p>
    </section>
  );
}

const bigOExamples = {
  linear: { formula: "7n + 12", dominant: "n", bigO: "O(n)" },
  linearithmic: { formula: "2n log₂ n + 8n", dominant: "n log n", bigO: "O(n log n)" },
  quadratic: { formula: "3n² + 4n + 20", dominant: "n²", bigO: "O(n²)" }
} as const;

export function BigOSimplifierLab(): React.JSX.Element {
  const { t } = useTranslation("timeComplexity");
  const [example, setExample] = useState<keyof typeof bigOExamples>("quadratic");
  const active = bigOExamples[example];

  return (
    <section aria-labelledby="big-o-simplifier-title" className="my-7 rounded-lg border border-violet-400/30 bg-violet-400/[0.04] p-5 sm:p-6">
      <p className="font-mono text-[10px] uppercase tracking-[0.16em] text-violet-300">{t("problemFirst.labs.bigO.eyebrow")}</p>
      <h5 id="big-o-simplifier-title" className="mt-2 text-xl font-semibold text-zinc-100">{t("problemFirst.labs.bigO.title")}</h5>
      <p className="mt-2 text-sm leading-6 text-zinc-400">{t("problemFirst.labs.bigO.description")}</p>
      <div className="mt-5 flex flex-wrap gap-2" role="group" aria-label={t("problemFirst.labs.bigO.examples")}>
        {(Object.keys(bigOExamples) as Array<keyof typeof bigOExamples>).map((key) => (
          <button
            key={key}
            type="button"
            aria-pressed={example === key}
            onClick={() => setExample(key)}
            className={cn(
              "min-h-11 rounded-md border px-4 font-mono text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-violet-300",
              example === key ? "border-violet-400 bg-violet-400/15 text-violet-100" : "border-zinc-700 text-zinc-400 hover:text-zinc-100"
            )}
          >
            {bigOExamples[key].formula}
          </button>
        ))}
      </div>
      <ol className="mt-5 grid gap-px overflow-hidden rounded-md border border-zinc-800 bg-zinc-800 sm:grid-cols-3" aria-live="polite">
        <li className="bg-zinc-950 p-4">
          <span className="font-mono text-[10px] uppercase tracking-wide text-zinc-500">01 · {t("problemFirst.labs.bigO.formula")}</span>
          <strong className="mt-2 block font-mono text-lg text-zinc-100">{active.formula}</strong>
        </li>
        <li className="bg-zinc-950 p-4">
          <span className="font-mono text-[10px] uppercase tracking-wide text-zinc-500">02 · {t("problemFirst.labs.bigO.dominant")}</span>
          <strong className="mt-2 block font-mono text-lg text-violet-200">{active.dominant}</strong>
        </li>
        <li className="bg-zinc-950 p-4">
          <span className="font-mono text-[10px] uppercase tracking-wide text-zinc-500">03 · {t("problemFirst.labs.bigO.label")}</span>
          <strong className="mt-2 block font-mono text-lg text-cyan-200">{active.bigO}</strong>
        </li>
      </ol>
      <p className="mt-4 text-sm leading-6 text-zinc-400">{t("problemFirst.labs.bigO.note")}</p>
    </section>
  );
}

type StockMemoryStrategy = "pairs" | "suffix" | "running";

export function StockMemoryEstimatorLab({
  n,
  onNChange
}: {
  readonly n: number;
  readonly onNChange: (n: number) => void;
}): React.JSX.Element {
  const { t, i18n } = useTranslation("timeComplexity");
  const [strategy, setStrategy] = useState<StockMemoryStrategy>("suffix");
  const locale = i18n.resolvedLanguage ?? i18n.language;
  const format = new Intl.NumberFormat(locale);
  const inputBytes = 4 * n;
  const auxiliaryBytes = strategy === "suffix" ? 4 * n + 4 : 12;
  const totalBytes = inputBytes + auxiliaryBytes;
  const formula = strategy === "suffix" ? "4n + (4n + 4) = 8n + 4" : "4n + 12";
  const bytes = (value: number): string => `${format.format(value)} B`;

  return (
    <section aria-labelledby="stock-memory-estimator-title" className="my-10 rounded-lg border border-amber-400/30 bg-amber-400/[0.04] p-5 sm:p-7">
      <p className="font-mono text-[10px] uppercase tracking-[0.16em] text-amber-300">{t("problemFirst.labs.stockMemory.eyebrow")}</p>
      <h3 id="stock-memory-estimator-title" className="mt-2 text-xl font-semibold text-zinc-100">{t("problemFirst.labs.stockMemory.title")}</h3>
      <p className="mt-2 text-sm leading-6 text-zinc-400">{t("problemFirst.labs.stockMemory.description")}</p>
      <div className="mt-5 grid gap-3 sm:grid-cols-2">
        <label className="grid gap-2 text-sm text-zinc-300">
          <span>{t("problemFirst.labs.stockMemory.inputSize")}</span>
          <input
            type="number"
            min="1"
            max="1000000000"
            value={n}
            onChange={(event) => onNChange(clampInteger(event.target.value, 1, 1_000_000_000))}
            className="min-h-11 rounded-md border border-zinc-700 bg-zinc-950 px-3 text-zinc-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber-300"
          />
        </label>
        <label className="grid gap-2 text-sm text-zinc-300">
          <span>{t("problemFirst.labs.stockMemory.strategy")}</span>
          <select
            value={strategy}
            onChange={(event) => setStrategy(event.target.value as StockMemoryStrategy)}
            className="min-h-11 rounded-md border border-zinc-700 bg-zinc-950 px-3 text-zinc-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber-300"
          >
            <option value="pairs">{t("problemFirst.labs.stockMemory.pairs")}</option>
            <option value="suffix">{t("problemFirst.labs.stockMemory.suffix")}</option>
            <option value="running">{t("problemFirst.labs.stockMemory.running")}</option>
          </select>
        </label>
      </div>
      <dl className="mt-5 grid gap-4 sm:grid-cols-3" aria-live="polite">
        <div className="border-l-2 border-cyan-400/35 pl-4">
          <dt className="text-xs uppercase tracking-wide text-zinc-500">{t("problemFirst.labs.stockMemory.input")}</dt>
          <dd className="mt-2 font-mono text-sm text-cyan-100">{bytes(inputBytes)}</dd>
        </div>
        <div className="border-l-2 border-amber-400/35 pl-4">
          <dt className="text-xs uppercase tracking-wide text-zinc-500">{t("problemFirst.labs.stockMemory.auxiliary")}</dt>
          <dd className="mt-2 font-mono text-sm text-amber-100">{bytes(auxiliaryBytes)}</dd>
        </div>
        <div className="border-l-2 border-violet-400/35 pl-4">
          <dt className="text-xs uppercase tracking-wide text-zinc-500">{t("problemFirst.labs.stockMemory.total")}</dt>
          <dd className="mt-2 font-mono text-sm text-violet-100">{bytes(totalBytes)}</dd>
        </div>
      </dl>
      <p className="mt-5 font-mono text-sm text-zinc-200">{t("problemFirst.labs.stockMemory.formula")}: {formula}</p>
      <p className="mt-3 text-xs leading-5 text-zinc-500">{t("problemFirst.labs.stockMemory.note")}</p>
    </section>
  );
}

export function ControlFlowCounterLab(): React.JSX.Element {
  const { t, i18n } = useTranslation("timeComplexity");
  const [length, setLength] = useState(8);
  const [zeros, setZeros] = useState(3);
  const format = new Intl.NumberFormat(i18n.resolvedLanguage ?? i18n.language);
  const conditionChecks = length;
  const shiftUpperBound = length * zeros;
  const totalUpperBound = conditionChecks + shiftUpperBound;

  const changeLength = (raw: string): void => {
    const next = clampInteger(raw, 1, 10_000);
    setLength(next);
    setZeros((current) => Math.min(current, next));
  };

  return (
    <section aria-labelledby="control-flow-counter-title" className="my-7 overflow-hidden rounded-lg border border-orange-400/30 bg-orange-400/[0.04]">
      <div className="p-5 sm:p-6">
        <p className="font-mono text-[10px] uppercase tracking-[0.16em] text-orange-300">{t("problemFirst.labs.control.eyebrow")}</p>
        <h5 id="control-flow-counter-title" className="mt-2 text-xl font-semibold text-zinc-100">{t("problemFirst.labs.control.title")}</h5>
        <p className="mt-2 text-sm leading-6 text-zinc-400">{t("problemFirst.labs.control.description")}</p>
        <div className="mt-4 grid gap-3 sm:grid-cols-2">
          <label className="grid gap-2 text-sm text-zinc-300">
            <span>{t("problemFirst.labs.control.length")}</span>
            <input
              type="number"
              min="1"
              max="10000"
              value={length}
              onChange={(event) => changeLength(event.target.value)}
              className="min-h-11 rounded-md border border-zinc-700 bg-zinc-950 px-3 text-zinc-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-orange-300"
            />
          </label>
          <label className="grid gap-2 text-sm text-zinc-300">
            <span>{t("problemFirst.labs.control.zeros")}</span>
            <input
              type="number"
              min="0"
              max={length}
              value={zeros}
              onChange={(event) => setZeros(clampInteger(event.target.value, 0, length))}
              className="min-h-11 rounded-md border border-zinc-700 bg-zinc-950 px-3 text-zinc-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-orange-300"
            />
          </label>
        </div>
      </div>
      <div className="border-y border-zinc-800 px-4 [&>div]:my-4 sm:px-6">
        <GuideCodeBlock code={`for (int i = 0; i < n; ++i) {\n  if (arr[i] == 0) {            // checked at most n times\n    for (int j = n - 1; j > i; --j)\n      arr[j] = arr[j - 1];      // up to n shifts per zero\n    ++i;                        // skip the inserted zero\n  }\n}`} />
      </div>
      <dl className="grid gap-px bg-zinc-800 sm:grid-cols-3" aria-live="polite">
        {([
          [t("problemFirst.labs.control.ifChecks"), `≤ ${format.format(conditionChecks)}`],
          [t("problemFirst.labs.control.bodyWork"), `≤ ${format.format(shiftUpperBound)}`],
          [t("problemFirst.labs.control.total"), `≤ ${format.format(totalUpperBound)}`]
        ] as const).map(([label, value]) => (
          <div key={label} className="bg-zinc-950 p-4">
            <dt className="font-mono text-[10px] uppercase tracking-wide text-zinc-500">{label}</dt>
            <dd className="mt-2 font-mono text-lg text-orange-200">{value}</dd>
          </div>
        ))}
      </dl>
      <p className="px-5 py-4 text-sm leading-6 text-zinc-400 sm:px-6">
        {t("problemFirst.labs.control.formula", { zeros: format.format(zeros) })}
      </p>
    </section>
  );
}

function clampInteger(raw: string, min: number, max: number): number {
  const value = Number(raw);
  if (!Number.isFinite(value)) return min;
  return Math.min(max, Math.max(min, Math.trunc(value)));
}

interface FibonacciTreeNode {
  readonly id: string;
  readonly value: number;
  readonly depth: number;
  x: number;
}

interface FibonacciTreeEdge {
  readonly id: string;
  readonly from: FibonacciTreeNode;
  readonly to: FibonacciTreeNode;
}

const fibonacciTree = (() => {
  let nextId = 0;
  let nextLeaf = 0;
  const nodes: FibonacciTreeNode[] = [];
  const edges: FibonacciTreeEdge[] = [];

  const build = (value: number, depth: number): FibonacciTreeNode => {
    const node: FibonacciTreeNode = { id: `fib-node-${nextId}`, value, depth, x: 0 };
    nextId += 1;
    nodes.push(node);
    if (value <= 1) {
      node.x = nextLeaf;
      nextLeaf += 1;
      return node;
    }
    const left = build(value - 1, depth + 1);
    const right = build(value - 2, depth + 1);
    node.x = (left.x + right.x) / 2;
    edges.push(
      { id: `${node.id}-${left.id}`, from: node, to: left },
      { id: `${node.id}-${right.id}`, from: node, to: right }
    );
    return node;
  };

  build(6, 0);
  return { nodes, edges, leafCount: nextLeaf };
})();

const FIBONACCI_TREE_DEPTH = Math.max(...fibonacciTree.nodes.map((node) => node.depth));
const fibonacciNodeX = (node: FibonacciTreeNode): number => 28 + (node.x / (fibonacciTree.leafCount - 1)) * 724;
const fibonacciNodeY = (node: FibonacciTreeNode): number => 28 + node.depth * 52;

export function FibonacciRecursionLab(): React.JSX.Element {
  const { t } = useTranslation("timeComplexity");
  const [step, setStep] = useState(0);
  const visibleNodes = fibonacciTree.nodes.filter((node) => node.depth <= step);
  const visibleEdges = fibonacciTree.edges.filter((edge) => edge.to.depth <= step);
  const currentLayerNodes = visibleNodes.filter((node) => node.depth === step);

  return (
    <section aria-labelledby="recursion-shape-title" className="my-7 rounded-lg border border-rose-400/30 bg-rose-400/[0.04] p-5 sm:p-6">
      <p className="font-mono text-[10px] uppercase tracking-[0.16em] text-rose-300">{t("problemFirst.labs.recursion.eyebrow")}</p>
      <h5 id="recursion-shape-title" className="mt-2 text-xl font-semibold text-zinc-100">{t("problemFirst.labs.recursion.title")}</h5>
      <p className="mt-2 text-sm leading-6 text-zinc-400">{t("problemFirst.labs.recursion.description")}</p>
      <div
        role="region"
        aria-label={t("problemFirst.labs.recursion.naiveAnimation")}
        data-testid="fibonacci-naive-animation"
        className="mt-5 max-h-[18rem] overflow-y-auto rounded-md border border-rose-400/20 bg-zinc-950/80 p-4"
      >
        <div className="flex items-center justify-between gap-4">
          <span className="font-mono text-[10px] uppercase tracking-[0.14em] text-rose-300">{t("problemFirst.labs.recursion.treePath")}</span>
          <span className="font-mono text-[10px] text-zinc-500">{t("problemFirst.labs.recursion.recurrence")}</span>
        </div>
        <svg viewBox="0 0 780 320" className="mt-4 h-auto w-full" aria-hidden="true">
          {visibleEdges.map((edge) => (
            <line
              key={edge.id}
              data-fibonacci-edge
              x1={fibonacciNodeX(edge.from)}
              y1={fibonacciNodeY(edge.from)}
              x2={fibonacciNodeX(edge.to)}
              y2={fibonacciNodeY(edge.to)}
              className={cn("stroke-rose-400/35 [stroke-width:1.5]", edge.to.depth === step && "recursion-tree-edge-enter")}
            />
          ))}
          {visibleNodes.map((node) => {
            const currentLayer = node.depth === step;
            return (
              <g
                key={node.id}
                data-fibonacci-node
                data-current-layer={currentLayer ? "true" : undefined}
                transform={`translate(${fibonacciNodeX(node)} ${fibonacciNodeY(node)})`}
                className={currentLayer ? "recursion-tree-node-enter" : undefined}
              >
                <circle r="15" className={currentLayer ? "fill-rose-400/25 stroke-rose-300" : "fill-zinc-900 stroke-zinc-700"} strokeWidth="1.5" />
                <text y="4" textAnchor="middle" className={currentLayer ? "fill-rose-100 text-[11px] font-semibold" : "fill-zinc-500 text-[11px]"}>{node.value}</text>
              </g>
            );
          })}
        </svg>
        <div className="sr-only">
          <p aria-live="polite">
            {t("problemFirst.labs.recursion.layerSummary", {
              layer: step + 1,
              calls: visibleNodes.length,
              nodes: currentLayerNodes.map((node) => t("problemFirst.labs.recursion.callLabel", { value: node.value })).join(", ")
            })}
          </p>
          <ul aria-label={t("problemFirst.labs.recursion.visibleRelationships")}>
            {visibleEdges.map((edge) => (
              <li key={edge.id}>
                {t("problemFirst.labs.recursion.callRelationship", { parent: edge.from.value, child: edge.to.value })}
              </li>
            ))}
          </ul>
        </div>
        <p className="mt-2 border-l border-rose-400/40 pl-3 text-xs leading-5 text-rose-100/75">{t("problemFirst.labs.recursion.naiveScale")}</p>
      </div>
      <div className="mt-4 grid gap-px overflow-hidden rounded-md border border-zinc-800 bg-zinc-800 sm:grid-cols-3" aria-live="polite">
        {([
          [t("problemFirst.labs.recursion.treeDepth"), `${step + 1}/${FIBONACCI_TREE_DEPTH + 1}`],
          [t("problemFirst.labs.recursion.calls"), visibleNodes.length],
          [t("problemFirst.labs.recursion.depth"), step + 1]
        ] as const).map(([label, value]) => (
          <div key={label} className="bg-zinc-950 p-4">
            <span className="font-mono text-[10px] uppercase tracking-wide text-zinc-500">{label}</span>
            <strong className="mt-1 block font-mono text-xl text-rose-200">{value}</strong>
          </div>
        ))}
      </div>
      <div className="mt-5 flex flex-wrap gap-2">
        <button
          type="button"
          disabled={step >= FIBONACCI_TREE_DEPTH}
          onClick={() => setStep((current) => Math.min(FIBONACCI_TREE_DEPTH, current + 1))}
          className="min-h-11 rounded-md bg-rose-500 px-4 text-sm font-semibold text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-rose-300 disabled:opacity-40"
        >
          {t("problemFirst.labs.recursion.nextLayer")}
        </button>
        <button
          type="button"
          onClick={() => setStep(0)}
          className="inline-flex min-h-11 items-center gap-2 rounded-md border border-zinc-700 px-4 text-sm text-zinc-300 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-rose-300"
        >
          <RotateCcw aria-hidden="true" className="size-4" />{t("problemFirst.labs.recursion.reset")}
        </button>
      </div>
    </section>
  );
}

export function DuplicateZerosMemoryLab(): React.JSX.Element {
  const { t, i18n } = useTranslation("timeComplexity");
  const [length, setLength] = useState(8);
  const [strategy, setStrategy] = useState<"shift" | "buffer" | "backward">("buffer");
  const inputBytes = length * 4;
  const extraBytes = strategy === "buffer" ? length * 4 : 4;
  const totalBytes = inputBytes + extraBytes;
  const format = new Intl.NumberFormat(i18n.resolvedLanguage ?? i18n.language);

  return (
    <section aria-labelledby="memory-ledger-title" className="my-7 rounded-lg border border-amber-400/30 bg-amber-400/[0.04] p-5 sm:p-6">
      <p className="font-mono text-[10px] uppercase tracking-[0.16em] text-amber-300">{t("problemFirst.labs.memory.eyebrow")}</p>
      <h5 id="memory-ledger-title" className="mt-2 text-xl font-semibold text-zinc-100">{t("problemFirst.labs.memory.title")}</h5>
      <p className="mt-2 text-sm leading-6 text-zinc-400">{t("problemFirst.labs.memory.description")}</p>
      <div className="mt-5 grid gap-3 sm:grid-cols-2">
        <label className="grid gap-2 text-sm text-zinc-300">
          <span>{t("problemFirst.labs.memory.length", { value: format.format(length) })}</span>
          <input
            type="range"
            min="1"
            max="10000"
            step="1"
            value={length}
            onChange={(event) => setLength(Number(event.target.value))}
            className="w-full accent-amber-400"
          />
        </label>
        <label className="grid gap-2 text-sm text-zinc-300">
          <span>{t("problemFirst.labs.memory.strategy")}</span>
          <select
            value={strategy}
            onChange={(event) => setStrategy(event.target.value as typeof strategy)}
            className="min-h-11 rounded-md border border-zinc-700 bg-zinc-950 px-3 text-zinc-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber-300"
          >
            <option value="shift">{t("problemFirst.labs.memory.shift")}</option>
            <option value="buffer">{t("problemFirst.labs.memory.buffer")}</option>
            <option value="backward">{t("problemFirst.labs.memory.backward")}</option>
          </select>
        </label>
      </div>
      <dl className="mt-5 grid gap-px overflow-hidden rounded-md border border-zinc-800 bg-zinc-800 sm:grid-cols-3" aria-live="polite">
        {([
          [t("problemFirst.labs.memory.input"), inputBytes],
          [t("problemFirst.labs.memory.extra"), extraBytes],
          [t("problemFirst.labs.memory.total"), totalBytes]
        ] as const).map(([label, value]) => (
          <div key={label} className="bg-zinc-950 p-4">
            <dt className="font-mono text-[10px] uppercase tracking-wide text-zinc-500">{label}</dt>
            <dd className="mt-1 font-mono text-lg text-amber-200">{format.format(value)} B</dd>
          </div>
        ))}
      </dl>
      <p className="mt-4 text-sm leading-6 text-zinc-400">{t("problemFirst.labs.memory.convention")}</p>
    </section>
  );
}

type CapstoneChoice = "quadratic" | "sort" | "hash";

export function TwoSumCapstoneLab(): React.JSX.Element {
  const { t } = useTranslation("timeComplexity");
  const [classification, setClassification] = useState<Record<CapstoneChoice, string>>({
    quadratic: "",
    sort: "",
    hash: ""
  });
  const [ranking, setRanking] = useState("");
  const [reviewed, setReviewed] = useState(false);

  const reset = (): void => {
    setClassification({ quadratic: "", sort: "", hash: "" });
    setRanking("");
    setReviewed(false);
  };

  return (
    <section aria-labelledby="capstone-classifier-title" className="my-7 rounded-lg border border-emerald-400/30 bg-emerald-400/[0.04] p-5 sm:p-6">
      <p className="font-mono text-[10px] uppercase tracking-[0.16em] text-emerald-300">{t("problemFirst.labs.capstone.eyebrow")}</p>
      <h5 id="capstone-classifier-title" className="mt-2 text-xl font-semibold text-zinc-100">{t("problemFirst.labs.capstone.title")}</h5>
      <p className="mt-2 text-sm leading-6 text-zinc-400">{t("problemFirst.labs.capstone.description")}</p>
      <div className="mt-5 grid gap-3">
        {(["quadratic", "sort", "hash"] as const).map((key) => (
          <label key={key} className="grid gap-2 rounded-md border border-zinc-800 bg-zinc-950/70 p-4 text-sm text-zinc-300 sm:grid-cols-[minmax(0,1fr)_minmax(15rem,1fr)] sm:items-center">
            <span className="font-medium text-zinc-100">{t(`problemFirst.labs.capstone.${key}`)}</span>
            <select
              aria-label={t("problemFirst.labs.capstone.classify", { approach: t(`problemFirst.labs.capstone.${key}`) })}
              value={classification[key]}
              onChange={(event) => {
                setClassification((current) => ({ ...current, [key]: event.target.value }));
                setReviewed(false);
              }}
              className="min-h-11 min-w-0 rounded-md border border-zinc-700 bg-zinc-900 px-3 text-zinc-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-300"
            >
              <option value="">{t("problemFirst.labs.capstone.choose")}</option>
              <option value="O(n²) / O(1) / worst">O(n²) / O(1) / {t("problemFirst.labs.capstone.worst")}</option>
              <option value="O(n log n) / O(n) / worst">O(n log n) / O(n) / {t("problemFirst.labs.capstone.worst")}</option>
              <option value="O(n) / O(n) / expected">O(n) / O(n) / {t("problemFirst.labs.capstone.expected")}</option>
            </select>
          </label>
        ))}
        <label className="grid gap-2 text-sm text-zinc-300">
          <span>{t("problemFirst.labs.capstone.rank")}</span>
          <select
            value={ranking}
            onChange={(event) => {
              setRanking(event.target.value);
              setReviewed(false);
            }}
            className="min-h-11 rounded-md border border-zinc-700 bg-zinc-950 px-3 text-zinc-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-300"
          >
            <option value="">{t("problemFirst.labs.capstone.choose")}</option>
            <option value="hash-sort-quadratic">{t("problemFirst.labs.capstone.rankCorrect")}</option>
            <option value="quadratic-sort-hash">{t("problemFirst.labs.capstone.rankReverse")}</option>
            <option value="sort-hash-quadratic">{t("problemFirst.labs.capstone.rankMixed")}</option>
          </select>
        </label>
      </div>
      <div className="mt-5 flex flex-wrap gap-2">
        <button type="button" onClick={() => setReviewed(true)} className="min-h-11 rounded-md bg-emerald-500 px-4 text-sm font-semibold text-zinc-950 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-300">
          {t("problemFirst.labs.capstone.check")}
        </button>
        <button type="button" onClick={reset} className="inline-flex min-h-11 items-center gap-2 rounded-md border border-zinc-700 px-4 text-sm text-zinc-300 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-300">
          <RotateCcw aria-hidden="true" className="size-4" />{t("problemFirst.labs.capstone.reset")}
        </button>
      </div>
      {reviewed ? (
        <div role="status" className="mt-4 rounded-md border border-emerald-400/30 bg-zinc-950/70 p-4 text-sm leading-6 text-zinc-300">
          <p>{t("problemFirst.labs.capstone.feedback")}</p>
          <ul className="mt-3 grid gap-1 font-mono text-xs text-emerald-200">
            <li>{t("problemFirst.labs.capstone.quadratic")}: O(n²) / O(1) / {t("problemFirst.labs.capstone.worst")}</li>
            <li>{t("problemFirst.labs.capstone.sort")}: O(n log n) / O(n) / {t("problemFirst.labs.capstone.worst")}</li>
            <li>{t("problemFirst.labs.capstone.hash")}: O(n) / O(n) / {t("problemFirst.labs.capstone.expected")}</li>
            <li>{t("problemFirst.labs.capstone.rankCorrect")}</li>
          </ul>
        </div>
      ) : null}
    </section>
  );
}
