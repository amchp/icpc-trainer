import { LEARNING_GUIDE_IDS, LEARNING_PROGRESS_STATUSES } from "@icpc-trainer/shared";
import { useAuth } from "@clerk/clerk-react";
import { Link } from "@tanstack/react-router";
import { ArrowLeft, ArrowRight, Check, ChevronDown, ChevronLeft, ExternalLink, Pause, Play, RotateCcw } from "lucide-react";
import { useEffect, useId, useRef, useState } from "react";
import { useTranslation } from "react-i18next";

import { appPaths } from "./appNavigation.js";
import { Button } from "./components/ui.js";
import { cn } from "./lib.js";
import { DataStructureSimulator, type DataStructureSimulatorKind } from "./learning/DataStructureSimulator.js";
import { GuideCodeBlock } from "./learning/GuideCodeBlock.js";
import { GuideSidebar } from "./learning/GuideSidebar.js";
import { useLearningProgress, useSetLearningProgressStatus, useStartLearningGuide } from "./useLearningProgress.js";
import { useToaster } from "./Toaster.js";

const GUIDE_ID = LEARNING_GUIDE_IDS.DataStructures;

const accentStyles = {
  cyan: { text: "text-cyan-300", bar: "bg-cyan-400", edge: "border-cyan-400/45" },
  blue: { text: "text-blue-300", bar: "bg-blue-400", edge: "border-blue-400/45" },
  violet: { text: "text-violet-300", bar: "bg-violet-400", edge: "border-violet-400/45" },
  amber: { text: "text-amber-300", bar: "bg-amber-400", edge: "border-amber-400/45" },
  emerald: { text: "text-emerald-300", bar: "bg-emerald-400", edge: "border-emerald-400/45" },
  rose: { text: "text-rose-300", bar: "bg-rose-400", edge: "border-rose-400/45" }
} as const;

type Accent = keyof typeof accentStyles;

interface LessonArc {
  readonly id: string;
  readonly number: string;
  readonly accent: Accent;
  readonly source: string;
  readonly title: string;
  readonly summary: string;
  readonly sample: string;
  readonly walkthrough: string;
  readonly input: string;
  readonly output: string;
  readonly toolTitle: string;
  readonly explanation: string;
  readonly operations: readonly {
    readonly name: string;
    readonly description: string;
    readonly cost: string;
  }[];
  readonly connection: {
    readonly idea: readonly string[];
    readonly complexity: string;
  };
  readonly officialLink?: { readonly label: string; readonly href: string };
}

export function DataStructuresPage(): React.JSX.Element {
  const { t, i18n } = useTranslation("dataStructures");
  const language = i18n.resolvedLanguage ?? i18n.language;
  const { userId } = useAuth();
  const progressQuery = useLearningProgress();
  const startGuide = useStartLearningGuide();
  const setStatus = useSetLearningProgressStatus();
  const toaster = useToaster();
  const startedForUser = useRef<string | null>(null);
  const progress = progressQuery.data?.find((row) => row.guideId === GUIDE_ID);
  const completed = progress?.status === LEARNING_PROGRESS_STATUSES.Completed;

  const sections = [
    ["numeric", t("sections.numeric")],
    ["vector", t("sections.vector")],
    ["stack", t("sections.stack")],
    ["queue", t("sections.queue")],
    ["set", t("sections.set")],
    ["map", t("sections.map")],
    ["ranges", t("sections.ranges")],
    ["reference", t("sections.reference")]
  ] as const;
  const [activeSection, setActiveSection] = useState<string>(sections[0][0]);

  useEffect(() => {
    if (userId === null || userId === undefined || startedForUser.current === userId) return;
    startedForUser.current = userId;
    startGuide.mutate(GUIDE_ID, {
      onError: () => toaster.error({
        title: t("progress.saveError"),
        description: t("progress.saveErrorDescription")
      })
    });
  }, [startGuide, t, toaster, userId]);

  useEffect(() => {
    const observer = new IntersectionObserver((entries) => {
      const visible = entries
        .filter((entry) => entry.isIntersecting)
        .sort((a, b) => b.intersectionRatio - a.intersectionRatio)[0];
      if (visible?.target.id) setActiveSection(visible.target.id);
    }, { rootMargin: "-20% 0px -65%", threshold: [0, .25, .6] });
    for (const [id] of sections) {
      const element = document.getElementById(id);
      if (element) observer.observe(element);
    }
    return () => observer.disconnect();
  }, []);

  const arcs: readonly LessonArc[] = [
    {
      id: "numeric",
      number: "01",
      accent: "cyan",
      source: t("numeric.source"),
      title: t("numeric.title"),
      summary: t("numeric.summary"),
      sample: t("numeric.sample"),
      walkthrough: t("numeric.walkthrough"),
      input: t("numeric.input"),
      output: t("numeric.output"),
      toolTitle: t("numeric.toolTitle"),
      explanation: t("numeric.explanation"),
      operations: [],
      connection: {
        idea: [t("numeric.reasoning.model"), t("numeric.reasoning.process"), t("numeric.reasoning.why")],
        complexity: t("numeric.reasoning.complexity")
      },
    },
    {
      id: "vector",
      number: "02",
      accent: "blue",
      source: t("vector.source"),
      title: t("vector.title"),
      summary: t("vector.summary"),
      sample: t("vector.sample"),
      walkthrough: t("vector.walkthrough"),
      input: t("vector.input"),
      output: t("vector.output"),
      toolTitle: t("vector.toolTitle"),
      explanation: t("vector.explanation"),
      operations: [
        { name: "values[index]", description: t("vector.operations.index"), cost: "O(1)" },
        { name: "push_back(value)", description: t("vector.operations.pushBack"), cost: t("cost.amortizedConstant") },
        { name: "sort(begin, end)", description: t("vector.operations.sort"), cost: "O(n log n)" }
      ],
      connection: {
        idea: [t("vector.reasoning.model"), t("vector.reasoning.process"), t("vector.reasoning.why")],
        complexity: t("vector.reasoning.complexity")
      },
      officialLink: { label: t("vector.link"), href: "https://codeforces.com/problemset/problem/706/B" },
    },
    {
      id: "stack",
      number: "03",
      accent: "violet",
      source: t("stack.source"),
      title: t("stack.title"),
      summary: t("stack.summary"),
      sample: t("stack.sample"),
      walkthrough: t("stack.walkthrough"),
      input: t("stack.input"),
      output: t("stack.output"),
      toolTitle: t("stack.toolTitle"),
      explanation: t("stack.explanation"),
      operations: [
        { name: "empty()", description: t("stack.operations.empty"), cost: "O(1)" },
        { name: "push(value)", description: t("stack.operations.push"), cost: "O(1)" },
        { name: "top()", description: t("stack.operations.top"), cost: "O(1)" },
        { name: "pop()", description: t("stack.operations.pop"), cost: "O(1)" },
        { name: "size()", description: t("stack.operations.size"), cost: "O(1)" }
      ],
      connection: {
        idea: [t("stack.reasoning.model"), t("stack.reasoning.process"), t("stack.reasoning.why")],
        complexity: t("stack.reasoning.complexity")
      },
      officialLink: { label: t("stack.link"), href: "https://leetcode.com/problems/valid-parentheses/" }
    },
    {
      id: "queue",
      number: "04",
      accent: "amber",
      source: t("queue.source"),
      title: t("queue.title"),
      summary: t("queue.summary"),
      sample: t("queue.sample"),
      walkthrough: t("queue.walkthrough"),
      input: t("queue.input"),
      output: t("queue.output"),
      toolTitle: t("queue.toolTitle"),
      explanation: t("queue.explanation"),
      operations: [
        { name: "empty()", description: t("queue.operations.empty"), cost: "O(1)" },
        { name: "push(value)", description: t("queue.operations.push"), cost: "O(1)" },
        { name: "front()", description: t("queue.operations.front"), cost: "O(1)" },
        { name: "back()", description: t("queue.operations.back"), cost: "O(1)" },
        { name: "pop()", description: t("queue.operations.pop"), cost: "O(1)" },
        { name: "size()", description: t("queue.operations.size"), cost: "O(1)" }
      ],
      connection: {
        idea: [t("queue.reasoning.model"), t("queue.reasoning.process"), t("queue.reasoning.why")],
        complexity: t("queue.reasoning.complexity")
      },
      officialLink: { label: t("queue.link"), href: "https://leetcode.com/problems/number-of-recent-calls/" }
    },
    {
      id: "set",
      number: "05",
      accent: "emerald",
      source: t("set.source"),
      title: t("set.title"),
      summary: t("set.summary"),
      sample: t("set.sample"),
      walkthrough: t("set.walkthrough"),
      input: t("set.input"),
      output: t("set.output"),
      toolTitle: t("set.toolTitle"),
      explanation: t("set.explanation"),
      operations: [
        { name: "insert(value)", description: t("set.operations.insert"), cost: "O(log n)" },
        { name: "count(value)", description: t("set.operations.count"), cost: "O(log n)" },
        { name: "lower_bound(value)", description: t("set.operations.lowerBound"), cost: "O(log n)" },
        { name: "upper_bound(value)", description: t("set.operations.upperBound"), cost: "O(log n)" },
        { name: "erase(value)", description: t("set.operations.erase"), cost: "O(log n)" },
        { name: "size()", description: t("set.operations.size"), cost: "O(1)" }
      ],
      connection: {
        idea: [t("set.reasoning.model"), t("set.reasoning.process"), t("set.reasoning.why")],
        complexity: t("set.reasoning.complexity")
      },
      officialLink: { label: t("set.link"), href: "https://codeforces.com/problemset/problem/443/A" }
    },
    {
      id: "map",
      number: "06",
      accent: "rose",
      source: t("map.source"),
      title: t("map.title"),
      summary: t("map.summary"),
      sample: t("map.sample"),
      walkthrough: t("map.walkthrough"),
      input: t("map.input"),
      output: t("map.output"),
      toolTitle: t("map.toolTitle"),
      explanation: t("map.explanation"),
      operations: [
        { name: "map[key]", description: t("map.operations.index"), cost: "O(log n)" },
        { name: "emplace(key, value)", description: t("map.operations.emplace"), cost: "O(log n)" },
        { name: "count(key)", description: t("map.operations.count"), cost: "O(log n)" },
        { name: "lower_bound(key)", description: t("map.operations.lowerBound"), cost: "O(log n)" },
        { name: "upper_bound(key)", description: t("map.operations.upperBound"), cost: "O(log n)" },
        { name: "erase(key)", description: t("map.operations.erase"), cost: "O(log n)" },
        { name: "size()", description: t("map.operations.size"), cost: "O(1)" }
      ],
      connection: {
        idea: [t("map.reasoning.model"), t("map.reasoning.process"), t("map.reasoning.why")],
        complexity: t("map.reasoning.complexity")
      },
      officialLink: { label: t("map.link"), href: "https://codeforces.com/problemset/problem/4/C" }
    },
    {
      id: "ranges",
      number: "07",
      accent: "cyan",
      source: t("ranges.source"),
      title: t("ranges.title"),
      summary: t("ranges.summary"),
      sample: t("ranges.sample"),
      walkthrough: t("ranges.walkthrough"),
      input: t("ranges.input"),
      output: t("ranges.output"),
      toolTitle: t("ranges.toolTitle"),
      explanation: t("ranges.explanation"),
      operations: [],
      connection: {
        idea: [t("ranges.reasoning.model"), t("ranges.reasoning.process"), t("ranges.reasoning.why")],
        complexity: t("ranges.reasoning.complexity")
      },
      officialLink: { label: t("ranges.link"), href: "https://leetcode.com/problems/min-stack/" },
    }
  ];

  const changeStatus = (): void => {
    const status = completed
      ? LEARNING_PROGRESS_STATUSES.InProgress
      : LEARNING_PROGRESS_STATUSES.Completed;
    setStatus.mutate({ guideId: GUIDE_ID, status }, {
      onSuccess: () => toaster.success({
        title: completed ? t("progress.inProgress") : t("progress.completed"),
        description: completed
          ? t("progress.inProgressDescription")
          : t("progress.completedDescription")
      }),
      onError: () => toaster.error({
        title: t("progress.updateError"),
        description: t("progress.updateErrorDescription")
      })
    });
  };

  return (
    <main className="min-w-0 overflow-x-clip pb-24 text-zinc-200">
      <header className="mx-auto max-w-6xl px-5 pb-12 pt-10 sm:px-8 sm:pb-16 sm:pt-16">
        <Link
          to={appPaths.resources}
          className="inline-flex items-center gap-2 text-sm text-zinc-400 transition-colors hover:text-zinc-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-violet-300"
        >
          <ChevronLeft className="size-4" aria-hidden="true" />
          {t("roadmap")}
        </Link>
        <div className="mt-12 grid gap-10 lg:grid-cols-[minmax(0,1fr)_minmax(18rem,.58fr)] lg:items-end">
          <div>
            <p className="guide-rise font-mono text-xs font-semibold uppercase tracking-[0.18em] text-violet-300">
              {t("eyebrow")}
            </p>
            <h1 className="guide-rise mt-4 max-w-4xl text-4xl font-semibold tracking-[-0.05em] text-zinc-50 [animation-delay:80ms] sm:text-6xl">
              {t("title")}
            </h1>
            <p className="guide-rise mt-6 max-w-2xl text-lg leading-8 text-zinc-400 [animation-delay:160ms]">
              {t("subtitle")}
            </p>
          </div>
          <figure className="guide-rise overflow-hidden rounded-lg border border-cyan-400/25 bg-[#071216] [animation-delay:240ms]">
            <figcaption className="flex items-center gap-2 border-b border-cyan-400/15 px-5 py-4 text-sm leading-6 text-cyan-100/80">
              <span aria-hidden="true" className="font-mono text-cyan-400/70">$</span>
              {t("heroPrompt")}
            </figcaption>
            <div className="px-5 py-6">
              <p className="font-mono text-xl font-semibold tracking-[-0.04em] text-zinc-100 sm:text-2xl">
                1,000,000,000 × 1,000,000,000
              </p>
              <p className="mt-3 font-mono text-sm font-semibold uppercase tracking-[0.12em] text-cyan-300">
                {t("heroAnswer")}
              </p>
            </div>
          </figure>
        </div>
      </header>

      <div className="mx-auto max-w-7xl px-5 sm:px-8 lg:grid lg:grid-cols-[14rem_minmax(0,1fr)] lg:gap-12">
        <GuideSidebar
          sections={sections.map(([id, label]) => ({ id, label }))}
          activeSection={activeSection}
          label={t("sidebar.label")}
          progressLabel={(current, total) => t("sidebar.progress", { current, total })}
        />
        <div className="min-w-0">
          {arcs.map((arc) => (
            <ProblemLesson key={`${language}-${arc.id}`} arc={arc} />
          ))}

          <ContainerReference />

          <section className="mt-20 border-t border-zinc-700 pt-10" aria-labelledby="data-structures-finish-title">
            <p className="font-mono text-xs uppercase tracking-[0.18em] text-violet-300">{t("finish.eyebrow")}</p>
            <h2 id="data-structures-finish-title" className="mt-3 text-3xl font-semibold tracking-tight text-zinc-50">
              {t("finish.title")}
            </h2>
            <p className="mt-4 max-w-2xl leading-7 text-zinc-400">{t("finish.description")}</p>
            <div className="mt-8 flex flex-wrap items-center gap-4">
              <Button type="button" disabled={setStatus.isPending} onClick={changeStatus}>
                {completed
                  ? <RotateCcw className="size-4" aria-hidden="true" />
                  : <Check className="size-4" aria-hidden="true" />}
                {completed ? t("finish.markProgress") : t("finish.markComplete")}
              </Button>
              <Link
                to={appPaths.resources}
                className="text-sm font-medium text-zinc-300 underline decoration-zinc-600 underline-offset-4 hover:text-white"
              >
                {t("finish.back")}
              </Link>
            </div>
          </section>
        </div>
      </div>
    </main>
  );
}

function ProblemLesson({ arc }: { readonly arc: LessonArc }): React.JSX.Element {
  const { t } = useTranslation("dataStructures");
  const accent = accentStyles[arc.accent];
  return (
    <section id={arc.id} className="scroll-mt-20 border-t border-zinc-800 py-16 sm:py-20">
      <div className="min-w-0 max-w-4xl">
        <div className="overflow-hidden rounded-xl border border-zinc-800 bg-zinc-950/35">
          <div className="p-5 sm:p-7">
            <div className="flex items-start gap-5 sm:gap-8">
              <div aria-hidden="true" className="shrink-0">
                <span className={cn("guide-grow block h-1 w-9 rounded-full sm:w-12", accent.bar)} />
                <span className={cn("mt-4 block font-mono text-4xl font-semibold leading-none tracking-tight sm:text-6xl", accent.text)}>
                  {arc.number}
                </span>
              </div>
              <div className="min-w-0 flex-1">
                <p className={cn("font-mono text-[10px] font-semibold uppercase tracking-[0.16em]", accent.text)}>
                  {arc.source}
                </p>
                <p className="mt-4 font-mono text-[10px] uppercase tracking-[0.16em] text-zinc-500">
                  {t("lesson.challenge")}
                </p>
                <h2 className="mt-2 text-3xl font-semibold tracking-[-0.04em] text-zinc-50 sm:text-4xl">
                  {arc.title}
                </h2>
                <p className="mt-4 max-w-3xl text-base leading-8 text-zinc-300">{arc.summary}</p>
              </div>
            </div>
          </div>

          <dl className="grid gap-px border-t border-zinc-800 bg-zinc-800 sm:grid-cols-2">
            <div className="bg-zinc-950/75 p-5 sm:p-6">
              <dt className="font-mono text-[10px] uppercase tracking-[0.14em] text-zinc-500">
                {t("lesson.input")}
              </dt>
              <dd className="mt-2 text-sm leading-6 text-zinc-300">{arc.input}</dd>
            </div>
            <div className="bg-zinc-950/75 p-5 sm:p-6">
              <dt className="font-mono text-[10px] uppercase tracking-[0.14em] text-zinc-500">
                {t("lesson.output")}
              </dt>
              <dd className="mt-2 text-sm leading-6 text-zinc-300">{arc.output}</dd>
            </div>
            <div className="bg-zinc-950/75 p-5 sm:col-span-2 sm:p-6">
              <dt className="font-mono text-[10px] uppercase tracking-[0.14em] text-zinc-500">
                {t("lesson.sample")}
              </dt>
              <dd className="mt-2 font-mono text-sm leading-6 text-zinc-200">{arc.sample}</dd>
              <dd className="mt-4 rounded-lg border border-zinc-800 bg-zinc-900/70 p-4">
                <p className={cn("font-mono text-[10px] font-semibold uppercase tracking-[0.14em]", accent.text)}>
                  {t("lesson.walkthrough")}
                </p>
                {arc.id === "numeric" ? (
                  <div className="mt-3 grid gap-4 sm:grid-cols-[8rem_minmax(0,1fr)] sm:items-center">
                    <NumericGridVisual />
                    <p className="text-sm leading-6 text-zinc-300">{arc.walkthrough}</p>
                  </div>
                ) : (
                  <p className="mt-2 text-sm leading-6 text-zinc-300">{arc.walkthrough}</p>
                )}
              </dd>
            </div>
          </dl>
          {arc.officialLink === undefined ? null : (
            <div className="border-t border-zinc-800 px-5 py-4 sm:px-6">
              <a
                href={arc.officialLink.href}
                target="_blank"
                rel="noreferrer"
                className={cn("inline-flex items-center gap-2 text-sm font-semibold underline underline-offset-4", accent.text)}
              >
                {arc.officialLink.label}
                <ExternalLink className="size-3.5" aria-hidden="true" />
              </a>
            </div>
          )}
        </div>

        <ThinkingPause accent={arc.accent} />
        <TopicDisclosure arc={arc} />
      </div>
    </section>
  );
}

function NumericGridVisual(): React.JSX.Element {
  const { t } = useTranslation("dataStructures");
  return (
    <div
      role="img"
      aria-label={t("numeric.gridLabel")}
      className="grid w-fit grid-cols-4 gap-1 rounded-lg border border-cyan-400/30 bg-cyan-400/[0.04] p-2"
    >
      {Array.from({ length: 12 }, (_, index) => (
        <span
          key={index}
          aria-hidden="true"
          className="size-5 rounded-[3px] border border-cyan-300/55 bg-cyan-400/30 shadow-[inset_0_0_8px_rgba(34,211,238,.12)]"
        />
      ))}
    </div>
  );
}

function ThinkingPause({ accent }: { readonly accent: Accent }): React.JSX.Element {
  const { t } = useTranslation("dataStructures");
  const accentStyle = accentStyles[accent];
  const reactId = useId().replace(/:/g, "");
  const titleId = `thinking-pause-${reactId}`;

  return (
    <aside className="mt-12" aria-labelledby={titleId}>
      <div className="flex items-center gap-4">
        <span aria-hidden="true" className="h-px flex-1 bg-zinc-800" />
        <p className={cn("font-mono text-[10px] font-semibold uppercase tracking-[0.16em]", accentStyle.text)}>
          {t("lesson.thinkEyebrow")}
        </p>
        <span aria-hidden="true" className="h-px flex-1 bg-zinc-800" />
      </div>
      <h3 id={titleId} className="mt-5 text-center text-xl font-semibold text-zinc-100">
        {t("lesson.thinkTitle")}
      </h3>
      <p className="mx-auto mt-2 max-w-xl text-center text-sm leading-6 text-zinc-500">{t("lesson.thinkIntro")}</p>
    </aside>
  );
}

function OverflowExperiment(): React.JSX.Element {
  const { t, i18n } = useTranslation("dataStructures");
  const [leftInput, setLeftInput] = useState("1000000000");
  const [rightInput, setRightInput] = useState("1000000000");
  const spanish = (i18n.resolvedLanguage ?? i18n.language).startsWith("es");
  const parseOperand = (value: string): bigint | null => {
    if (!/^\d+$/.test(value)) return null;
    const parsed = BigInt(value);
    return parsed <= 1_000_000_000n ? parsed : null;
  };
  const left = parseOperand(leftInput);
  const right = parseOperand(rightInput);
  const valid = left !== null && right !== null;
  const product = valid ? left * right : 0n;
  const bitsFor = (value: bigint): number => value === 0n ? 1 : value.toString(2).length;
  const leftBits = valid ? bitsFor(left) : 0;
  const rightBits = valid ? bitsFor(right) : 0;
  const requiredBits = valid ? bitsFor(product) : 0;
  const fits = valid && product <= 2_147_483_647n;
  const code = spanish
    ? `int filas = 20;
int columnas = 30;
cout << filas * columnas << '\\n'; // 600

filas = 1000000000;
columnas = 1000000000;
cout << filas * columnas << '\\n'; // no es 10^18: comportamiento indefinido`
    : `int rows = 20;
int columns = 30;
cout << rows * columns << '\\n'; // 600

rows = 1000000000;
columns = 1000000000;
cout << rows * columns << '\\n'; // not 10^18: undefined behavior`;

  return (
    <section className="my-10 overflow-hidden rounded-lg border border-zinc-800 bg-zinc-950/50" aria-labelledby="overflow-experiment-title">
      <div className="px-5 py-5 sm:px-6">
        <p className="font-mono text-[10px] font-semibold uppercase tracking-[0.16em] text-amber-300">
          {t("numeric.demoEyebrow")}
        </p>
        <h3 id="overflow-experiment-title" className="mt-2 text-xl font-semibold text-zinc-50">
          {t("numeric.demoTitle")}
        </h3>
        <p className="mt-2 max-w-3xl text-sm leading-6 text-zinc-400">{t("numeric.demoDescription")}</p>
      </div>
      <div className="border-t border-zinc-800 px-4 pb-1 sm:px-5">
        <GuideCodeBlock code={code} />
      </div>
      <div className="border-t border-zinc-800 px-5 py-6 sm:px-6">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div>
            <p className="font-mono text-[10px] uppercase tracking-[0.14em] text-zinc-500">
              {t("numeric.bits.choose")}
            </p>
            <div className="mt-2 flex flex-wrap items-center gap-2" role="group" aria-label={t("numeric.bits.choose")}>
              <label className="sr-only" htmlFor="overflow-left-operand">{t("numeric.bits.leftOperand")}</label>
              <input
                id="overflow-left-operand"
                type="text"
                inputMode="numeric"
                pattern="[0-9]*"
                maxLength={10}
                value={leftInput}
                onChange={(event) => setLeftInput(event.target.value)}
                className="w-32 rounded-md border border-zinc-700 bg-zinc-950 px-3 py-2 font-mono text-sm text-zinc-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber-300"
              />
              <span className="font-mono text-zinc-500" aria-hidden="true">×</span>
              <label className="sr-only" htmlFor="overflow-right-operand">{t("numeric.bits.rightOperand")}</label>
              <input
                id="overflow-right-operand"
                type="text"
                inputMode="numeric"
                pattern="[0-9]*"
                maxLength={10}
                value={rightInput}
                onChange={(event) => setRightInput(event.target.value)}
                className="w-32 rounded-md border border-zinc-700 bg-zinc-950 px-3 py-2 font-mono text-sm text-zinc-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber-300"
              />
            </div>
            <p className={cn("mt-2 text-xs", valid ? "text-zinc-500" : "text-rose-300")}>
              {valid ? t("numeric.bits.inputHint") : t("numeric.bits.invalidInput")}
            </p>
          </div>
          <div className="text-right">
            <p className="font-mono text-[10px] uppercase tracking-[0.14em] text-zinc-500">
              {t("numeric.bits.result")}
            </p>
            <strong className={cn("mt-1 block font-mono text-lg", fits ? "text-emerald-300" : "text-amber-200")}>
              {valid ? product.toString() : "—"}
            </strong>
          </div>
        </div>

        {valid ? <div className="mt-6 border-t border-zinc-800 pt-6" aria-live="polite">
          <div className="rounded-lg border border-zinc-800 bg-zinc-950/70 p-4 sm:p-5">
            <p className="font-mono text-[10px] font-semibold uppercase tracking-[0.14em] text-zinc-500">
              {t("numeric.bits.operandsTitle")}
            </p>
            <div className="mt-5 space-y-4">
              <BitStrip
                label={left.toString()}
                bits={leftBits}
                tone="cyan"
                bitLabel={t("numeric.bits.inputBits", { count: leftBits })}
              />
              <div className="flex items-center gap-3 pl-1" aria-hidden="true">
                <span className="font-mono text-lg text-zinc-500">×</span>
                <span className="h-px flex-1 bg-zinc-800" />
              </div>
              <BitStrip
                label={right.toString()}
                bits={rightBits}
                tone="violet"
                bitLabel={t("numeric.bits.inputBits", { count: rightBits })}
              />
            </div>
            <div className="my-5 flex items-center gap-3">
              <span className="rounded-md border border-amber-400/30 bg-amber-400/10 px-3 py-2 font-mono text-xs font-semibold text-amber-200">
                {leftBits} + {rightBits} → {requiredBits} {t("numeric.bits.bits")}
              </span>
              <p className="text-xs leading-5 text-zinc-500">{t("numeric.bits.growth")}</p>
            </div>
            <BitStrip
              label={product.toString()}
              bits={requiredBits}
              tone={fits ? "emerald" : "overflow"}
              bitLabel={t("numeric.bits.productBits", { count: requiredBits })}
            />
          </div>
          <div className="mt-5 flex flex-wrap items-baseline justify-between gap-2 border-t border-zinc-800 pt-5">
            <p className="text-sm font-medium text-zinc-200">{t("numeric.bits.capacity")}</p>
            <p className="font-mono text-xs text-zinc-500">31 {t("numeric.bits.bits")} · −2³¹ … 2³¹−1</p>
          </div>
          <div className="mt-4 grid gap-3 text-sm sm:grid-cols-3">
            <p className="text-zinc-400">
              {t("numeric.bits.available")} <strong className="font-mono text-zinc-200">31</strong>
            </p>
            <p className="text-zinc-400">
              {t("numeric.bits.required")} <strong className="font-mono text-zinc-200">{requiredBits}</strong>
            </p>
            <p className={fits ? "text-emerald-300" : "text-rose-300"}>
              {fits ? t("numeric.bits.fits") : t("numeric.bits.overflow", { count: requiredBits - 31 })}
            </p>
          </div>
          <p className="mt-4 border-t border-zinc-800 pt-4 text-sm leading-6 text-zinc-400">
            {fits
              ? t("numeric.bits.fitsExplanation", { product: product.toString() })
              : t("numeric.bits.overflowExplanation", { product: product.toString(), count: requiredBits })}
          </p>
        </div> : null}
      </div>
    </section>
  );
}

function BitStrip({
  label,
  bits,
  bitLabel,
  tone
}: {
  readonly label: string;
  readonly bits: number;
  readonly bitLabel: string;
  readonly tone: "cyan" | "violet" | "emerald" | "overflow";
}): React.JSX.Element {
  const baseTone = {
    cyan: "border-cyan-300/70 bg-cyan-400/40",
    violet: "border-violet-300/70 bg-violet-400/40",
    emerald: "border-emerald-300/70 bg-emerald-400/40",
    overflow: "border-amber-300/70 bg-amber-400/40"
  }[tone];

  return (
    <div className="min-w-0" data-bit-strip>
      <div className="flex min-w-0 flex-wrap items-baseline justify-between gap-x-4 gap-y-1">
        <strong className="min-w-0 break-all font-mono text-sm text-zinc-200" data-bit-strip-label>{label}</strong>
        <span className="shrink-0 font-mono text-[11px] text-zinc-400">{bitLabel}</span>
      </div>
      <div className="max-w-full overflow-x-auto pb-1" data-bit-strip-drawing>
        <div className="mt-2 flex min-w-max gap-1" aria-hidden="true">
          {Array.from({ length: bits }, (_, index) => (
            <span
              key={index}
              className={cn(
                "h-6 w-1.5 shrink-0 rounded-[2px] border",
                tone === "overflow" && index >= 31
                  ? "border-rose-300/70 bg-rose-400/45"
                  : baseTone,
                tone === "overflow" && index === 31 && "ml-2"
              )}
            />
          ))}
        </div>
      </div>
    </div>
  );
}

function TopicDisclosure({ arc }: { readonly arc: LessonArc }): React.JSX.Element {
  const { t } = useTranslation("dataStructures");
  const reactId = useId();
  const [open, setOpen] = useState(false);
  const contentId = `${arc.id}-toolkit-${reactId.replace(/:/g, "")}`;
  const accent = accentStyles[arc.accent];
  const simulatorKind: DataStructureSimulatorKind | null = arc.id === "ranges"
    ? "struct"
    : arc.id === "vector" || arc.id === "stack" || arc.id === "queue" || arc.id === "set" || arc.id === "map"
      ? arc.id
      : null;

  return (
    <div className="mt-10 border-t border-zinc-800">
      <button
        type="button"
        className="group flex min-h-14 w-full items-center justify-between gap-4 py-5 text-left text-sm font-semibold text-zinc-200 transition-colors hover:text-zinc-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-violet-300"
        aria-expanded={open}
        aria-controls={contentId}
        onClick={() => setOpen((current) => !current)}
      >
        <span className="flex items-center gap-3">
          <span aria-hidden="true" className={cn("h-4 w-px", accent.bar)} />
          <span className={cn("font-mono text-[10px] uppercase tracking-[0.14em]", accent.text)}>
            {t("lesson.toolbox")}
          </span>
          <span>{open ? t("lesson.hideToolkit") : t("lesson.revealToolkit")}</span>
        </span>
        <ChevronDown
          className={cn("size-4 shrink-0 text-zinc-500 transition-transform motion-reduce:transition-none group-hover:text-zinc-300", open && "rotate-180")}
          aria-hidden="true"
        />
      </button>
      <div id={contentId} hidden={!open} className="pb-2">
        <p className={cn("font-mono text-[10px] font-semibold uppercase tracking-[0.16em]", accent.text)}>
          {t("lesson.tool")}
        </p>
        <h3 className="mt-3 text-2xl font-semibold tracking-tight text-zinc-100">{arc.toolTitle}</h3>
        <p className="mt-4 max-w-3xl text-base leading-8 text-zinc-300">{arc.explanation}</p>
        {arc.id === "stack" ? <BookStackVisual /> : null}
        {arc.id === "ranges" ? <StructPrimer /> : null}
        {arc.operations.length === 0 ? null : <ToolOperations operations={arc.operations} accent={arc.accent} />}
        {simulatorKind === null ? null : <DataStructureSimulator kind={simulatorKind} accent={arc.accent} />}
        {arc.id === "numeric" ? (
          <>
            <OverflowExperiment />
            <NumericTypeReference />
          </>
        ) : null}
        {arc.id === "vector" ? <VectorToolLab /> : null}
        {arc.id === "queue" ? <DequeMiniLesson /> : null}
        {arc.id === "set" ? <SetVariantsLesson /> : null}
        {arc.id === "map" ? <MapVariantsLesson /> : null}
        {arc.id === "ranges" ? <CustomStructureBlueprint /> : null}
        <ProblemConnectionDisclosure problemId={arc.id} problemTitle={arc.title} connection={arc.connection} accent={arc.accent} />
      </div>
    </div>
  );
}

function ToolOperations({
  operations,
  accent
}: {
  readonly operations: readonly {
    readonly name: string;
    readonly description: string;
    readonly cost: string;
  }[];
  readonly accent: Accent;
}): React.JSX.Element {
  const { t } = useTranslation("dataStructures");
  const titleId = `tool-operations-${useId().replace(/:/g, "")}`;
  const accentStyle = accentStyles[accent];
  return (
    <section className="my-8" aria-labelledby={titleId}>
      <h4 id={titleId} className="font-mono text-[10px] uppercase tracking-[0.14em] text-zinc-500">
        {t("lesson.operations")}
      </h4>
      <dl className="mt-4 divide-y divide-zinc-800 border-y border-zinc-800">
        {operations.map((operation) => (
          <div key={operation.name} className="grid gap-2 py-4 sm:grid-cols-[13rem_minmax(0,1fr)_auto] sm:items-start sm:gap-8">
            <dt className={cn("font-mono text-sm font-semibold", accentStyle.text)}>{operation.name}</dt>
            <dd className="text-sm leading-6 text-zinc-400">{operation.description}</dd>
            <dd className="w-fit rounded border border-zinc-700 bg-zinc-900 px-2 py-1 font-mono text-[11px] font-semibold text-zinc-300">
              {operation.cost}
            </dd>
          </div>
        ))}
      </dl>
    </section>
  );
}

function ProblemConnectionDisclosure({
  problemId,
  problemTitle,
  connection,
  accent
}: {
  readonly problemId: string;
  readonly problemTitle: string;
  readonly connection: LessonArc["connection"];
  readonly accent: Accent;
}): React.JSX.Element {
  const { t } = useTranslation("dataStructures");
  const [open, setOpen] = useState(false);
  const contentId = `problem-connection-${useId().replace(/:/g, "")}`;
  const accentStyle = accentStyles[accent];
  return (
    <div className="mt-8 border-t border-zinc-700">
      <button
        type="button"
        aria-expanded={open}
        aria-controls={contentId}
        onClick={() => setOpen((current) => !current)}
        className="group my-4 flex min-h-16 w-full items-center justify-between gap-4 rounded-lg border border-zinc-700 bg-zinc-900/55 px-4 py-4 text-left text-sm font-semibold text-zinc-200 transition-colors hover:border-zinc-500 hover:bg-zinc-900 hover:text-zinc-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-violet-300"
      >
        <span className="flex items-center gap-3">
          <span className={cn("font-mono text-[10px] uppercase tracking-[0.14em]", accentStyle.text)}>
            {t("lesson.connectionEyebrow")}
          </span>
          <span>{open ? t("lesson.hideConnection") : t("lesson.revealConnection")}</span>
        </span>
        <ChevronDown className={cn("size-4 shrink-0 text-zinc-500 transition-transform motion-reduce:transition-none group-hover:text-zinc-300", open && "rotate-180")} aria-hidden="true" />
      </button>
      <div id={contentId} hidden={!open} className="mb-2 pb-2 pt-4">
        <h4 className="text-xl font-semibold text-zinc-100">{t("lesson.connectionTitle")}</h4>
        <p className="mt-3 max-w-3xl text-base leading-7 text-zinc-400">{t("lesson.connectionDescription")}</p>

        <article className="mt-8 max-w-3xl border-y border-zinc-800 py-6">
          <div className="space-y-4">
            {connection.idea.map((paragraph) => (
              <p key={paragraph} className="text-base leading-7 text-zinc-300">{paragraph}</p>
            ))}
          </div>
        </article>

        {problemId === "numeric" ? null : (
          <ProblemSolutionDemo problemId={problemId} problemTitle={problemTitle} accent={accent} />
        )}

        <article className="mt-7 max-w-3xl border-t border-zinc-800 pt-6">
          <p className={cn("font-mono text-[10px] font-semibold uppercase tracking-[0.12em]", accentStyle.text)}>
            {t("lesson.connectionComplexity")}
          </p>
          <p className="mt-3 text-base leading-7 text-zinc-300">{connection.complexity}</p>
        </article>
      </div>
    </div>
  );
}

interface WalkthroughStep {
  readonly id: string;
  readonly phase: string;
  readonly message: string;
  readonly visual: React.JSX.Element;
}

function SolutionStepPlayer({
  steps,
  accent
}: {
  readonly steps: readonly WalkthroughStep[];
  readonly accent: Accent;
}): React.JSX.Element {
  const { t } = useTranslation("dataStructures");
  const [current, setCurrent] = useState(0);
  const [playing, setPlaying] = useState(false);
  const accentStyle = accentStyles[accent];
  const lastIndex = steps.length - 1;
  const step = steps[current] ?? steps[0]!;

  useEffect(() => {
    if (!playing) return;
    if (current >= lastIndex) {
      setPlaying(false);
      return;
    }
    const timeout = window.setTimeout(() => setCurrent((index) => Math.min(index + 1, lastIndex)), 850);
    return () => window.clearTimeout(timeout);
  }, [current, lastIndex, playing]);

  const moveTo = (index: number): void => {
    setPlaying(false);
    setCurrent(Math.max(0, Math.min(index, lastIndex)));
  };

  const togglePlayback = (): void => {
    if (playing) {
      setPlaying(false);
      return;
    }
    if (current >= lastIndex) setCurrent(0);
    setPlaying(true);
  };

  return (
    <div className="mt-5 border-t border-zinc-800 pt-5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <p className={cn("font-mono text-[10px] font-semibold uppercase tracking-[0.14em]", accentStyle.text)}>{step.phase}</p>
          <p className="mt-1 text-xs text-zinc-500">{t("lesson.animation.progress", { current: current + 1, total: steps.length })}</p>
        </div>
        <div className="flex flex-wrap gap-2" role="group" aria-label={t("lesson.animation.controls")}>
          <button
            type="button"
            aria-label={t("lesson.animation.reset")}
            disabled={current === 0 && !playing}
            onClick={() => moveTo(0)}
            className="rounded-md border border-zinc-700 p-2 text-zinc-400 hover:text-zinc-100 disabled:cursor-not-allowed disabled:opacity-35"
          >
            <RotateCcw className="size-4" aria-hidden="true" />
          </button>
          <button
            type="button"
            aria-label={t("lesson.animation.previous")}
            disabled={current === 0}
            onClick={() => moveTo(current - 1)}
            className="rounded-md border border-zinc-700 p-2 text-zinc-400 hover:text-zinc-100 disabled:cursor-not-allowed disabled:opacity-35"
          >
            <ArrowLeft className="size-4" aria-hidden="true" />
          </button>
          <button
            type="button"
            aria-label={playing ? t("lesson.animation.pause") : t("lesson.animation.play")}
            onClick={togglePlayback}
            className={cn("rounded-md border p-2", accentStyle.edge, accentStyle.text)}
          >
            {playing ? <Pause className="size-4 fill-current" aria-hidden="true" /> : <Play className="size-4 fill-current" aria-hidden="true" />}
          </button>
          <button
            type="button"
            aria-label={t("lesson.animation.next")}
            disabled={current >= lastIndex}
            onClick={() => moveTo(current + 1)}
            className="rounded-md border border-zinc-700 p-2 text-zinc-400 hover:text-zinc-100 disabled:cursor-not-allowed disabled:opacity-35"
          >
            <ArrowRight className="size-4" aria-hidden="true" />
          </button>
        </div>
      </div>
      <div
        role="progressbar"
        aria-label={t("lesson.animation.progressLabel")}
        aria-valuemin={1}
        aria-valuemax={steps.length}
        aria-valuenow={current + 1}
        className="mt-4 h-1 overflow-hidden rounded-full bg-zinc-800"
      >
        <span
          className={cn("block h-full origin-left transition-transform duration-300 motion-reduce:transition-none", accentStyle.bar)}
          style={{ transform: `scaleX(${(current + 1) / steps.length})` }}
        />
      </div>
      <div aria-live="polite" aria-atomic="true" className="mt-5 min-h-48">
        <div key={step.id} className="guide-rise">
          <p className="text-sm font-medium leading-6 text-zinc-200">{step.message}</p>
          <div className="mt-4">{step.visual}</div>
        </div>
      </div>
    </div>
  );
}

function ProblemSolutionDemo({
  problemId,
  problemTitle,
  accent
}: {
  readonly problemId: string;
  readonly problemTitle: string;
  readonly accent: Accent;
}): React.JSX.Element {
  const { t } = useTranslation("dataStructures");
  const accentStyle = accentStyles[accent];
  const titleId = `solution-demo-${useId().replace(/:/g, "")}`;

  return (
    <section
      aria-labelledby={titleId}
      className="my-8 max-w-3xl overflow-hidden rounded-xl border border-zinc-800 bg-zinc-950/60"
    >
      <div className="border-b border-zinc-800 px-5 py-5 sm:px-6">
        <p className={cn("font-mono text-[10px] font-semibold uppercase tracking-[0.15em]", accentStyle.text)}>
          {t("lesson.solutionDemoEyebrow")}
        </p>
        <h5 id={titleId} className="mt-2 text-lg font-semibold text-zinc-100">{t("lesson.solutionDemoTitle")}: {problemTitle}</h5>
        <p className="mt-2 max-w-2xl text-sm leading-6 text-zinc-400">{t("lesson.solutionDemoDescription")}</p>
      </div>
      <div className="p-5 sm:p-6">
        {problemId === "vector" ? <VectorSolutionDemo accent={accent} /> : null}
        {problemId === "stack" ? <StackSolutionDemo accent={accent} /> : null}
        {problemId === "queue" ? <QueueSolutionDemo accent={accent} /> : null}
        {problemId === "set" ? <SetSolutionDemo accent={accent} /> : null}
        {problemId === "map" ? <MapSolutionDemo accent={accent} /> : null}
        {problemId === "ranges" ? <RangesSolutionDemo accent={accent} /> : null}
      </div>
    </section>
  );
}

function SolutionTextInput({
  label,
  value,
  onChange,
  invalid,
  hint
}: {
  readonly label: string;
  readonly value: string;
  readonly onChange: (value: string) => void;
  readonly invalid: boolean;
  readonly hint: string;
}): React.JSX.Element {
  const inputId = `solution-input-${useId().replace(/:/g, "")}`;
  const hintId = `${inputId}-hint`;
  return (
    <div className="grid gap-2 text-sm text-zinc-400">
      <label htmlFor={inputId}>{label}</label>
      <input
        id={inputId}
        type="text"
        value={value}
        aria-invalid={invalid}
        aria-describedby={hintId}
        onChange={(event) => onChange(event.target.value)}
        className="w-full rounded-md border border-zinc-700 bg-zinc-950 px-3 py-2.5 font-mono text-zinc-100 outline-none focus-visible:ring-2 focus-visible:ring-zinc-300"
      />
      <span id={hintId} className={cn("text-xs leading-5", invalid ? "text-rose-300" : "text-zinc-600")}>{hint}</span>
    </div>
  );
}

function parseIntegerList(value: string, min: number, max: number, maxItems = 8): readonly number[] | null {
  const parts = value.split(",").map((part) => part.trim());
  if (parts.length === 0 || parts.length > maxItems || parts.some((part) => !/^-?\d+$/.test(part))) return null;
  const values = parts.map(Number);
  return values.every((candidate) => Number.isSafeInteger(candidate) && candidate >= min && candidate <= max)
    ? values
    : null;
}

function NumberChips({
  values,
  accent,
  activeCount,
  muted
}: {
  readonly values: readonly number[];
  readonly accent: Accent;
  readonly activeCount?: number;
  readonly muted?: boolean;
}): React.JSX.Element {
  const accentStyle = accentStyles[accent];
  return (
    <ol className="flex min-h-12 flex-wrap gap-2">
      {values.length === 0 ? <li className="text-sm text-zinc-600">∅</li> : values.map((value, index) => {
        const active = activeCount === undefined || index < activeCount;
        return (
          <li
            key={`${value}-${index}`}
            data-active={active}
            className={cn(
              "min-w-12 rounded-md border px-3 py-2.5 text-center font-mono text-sm transition-colors",
              active && !muted ? cn(accentStyle.edge, "bg-zinc-900 text-zinc-100") : "border-zinc-800 bg-zinc-950 text-zinc-600"
            )}
          >
            {value}
          </li>
        );
      })}
    </ol>
  );
}

function VectorSolutionDemo({ accent }: { readonly accent: Accent }): React.JSX.Element {
  const { t } = useTranslation("dataStructures");
  const [pricesInput, setPricesInput] = useState("3, 10, 8, 6");
  const [queriesInput, setQueriesInput] = useState("1, 6, 9, 10");
  const prices = parseIntegerList(pricesInput, 1, 100_000);
  const queries = parseIntegerList(queriesInput, 0, 1_000_000_000);
  const valid = prices !== null && queries !== null;
  const steps: WalkthroughStep[] = [];

  if (valid) {
    steps.push({
      id: "original",
      phase: t("vector.solutionDemo.sortPhase"),
      message: t("vector.solutionDemo.original"),
      visual: <VectorSortState remaining={prices} sorted={[]} accent={accent} />
    });
    const remaining = [...prices];
    const sorted: number[] = [];
    while (remaining.length > 0) {
      const value = Math.min(...remaining);
      remaining.splice(remaining.indexOf(value), 1);
      sorted.push(value);
      steps.push({
        id: `sort-${sorted.length}`,
        phase: t("vector.solutionDemo.sortPhase"),
        message: t("vector.solutionDemo.extract", { value }),
        visual: <VectorSortState remaining={[...remaining]} sorted={[...sorted]} accent={accent} />
      });
    }
    steps.push({
      id: "sorted",
      phase: t("vector.solutionDemo.sortPhase"),
      message: t("vector.solutionDemo.sortComplete"),
      visual: <VectorQueryState prices={sorted} answers={[]} accent={accent} />
    });
    const answers: number[] = [];
    for (const query of queries) {
      const count = sorted.filter((price) => price <= query).length;
      answers.push(count);
      steps.push({
        id: `query-${answers.length}`,
        phase: t("vector.solutionDemo.queryPhase"),
        message: t("vector.solutionDemo.query", { query, count, position: count }),
        visual: <VectorQueryState prices={sorted} activeCount={count} answers={[...answers]} accent={accent} />
      });
    }
  }

  return (
    <>
      <div className="grid gap-4 sm:grid-cols-2">
        <SolutionTextInput label={t("vector.solutionDemo.pricesInput")} value={pricesInput} onChange={setPricesInput} invalid={prices === null} hint={t("vector.solutionDemo.pricesHint")} />
        <SolutionTextInput label={t("vector.solutionDemo.queriesInput")} value={queriesInput} onChange={setQueriesInput} invalid={queries === null} hint={t("vector.solutionDemo.queriesHint")} />
      </div>
      {!valid ? <p className="mt-4 text-sm text-rose-300">{t("vector.solutionDemo.invalid")}</p> : (
        <SolutionStepPlayer key={`${pricesInput}|${queriesInput}`} steps={steps} accent={accent} />
      )}
    </>
  );
}

function VectorSortState({ remaining, sorted, accent }: { readonly remaining: readonly number[]; readonly sorted: readonly number[]; readonly accent: Accent }): React.JSX.Element {
  const { t } = useTranslation("dataStructures");
  return (
    <div className="grid gap-5 sm:grid-cols-2">
      <div><p className="mb-3 text-xs uppercase tracking-[0.12em] text-zinc-500">{t("vector.solutionDemo.remaining")}</p><NumberChips values={remaining} accent={accent} muted /></div>
      <div><p className="mb-3 text-xs uppercase tracking-[0.12em] text-zinc-500">{t("vector.solutionDemo.sorted")}</p><NumberChips values={sorted} accent={accent} /></div>
    </div>
  );
}

function VectorQueryState({ prices, activeCount, answers, accent }: { readonly prices: readonly number[]; readonly activeCount?: number; readonly answers: readonly number[]; readonly accent: Accent }): React.JSX.Element {
  const { t } = useTranslation("dataStructures");
  return (
    <div>
      <p className="mb-3 text-xs uppercase tracking-[0.12em] text-zinc-500">{t("vector.solutionDemo.sorted")}</p>
      <NumberChips values={prices} activeCount={activeCount} accent={accent} />
      <p className="mt-4 text-sm font-semibold text-zinc-200">{t("vector.solutionDemo.answers")}: {answers.length === 0 ? "—" : answers.join(", ")}</p>
    </div>
  );
}

function StackSolutionDemo({ accent }: { readonly accent: Accent }): React.JSX.Element {
  const { t } = useTranslation("dataStructures");
  const [sequence, setSequence] = useState("([{}])");
  const steps: WalkthroughStep[] = [];
  const stack: string[] = [];
  const pairs: Record<string, string> = { ")": "(", "]": "[", "}": "{" };
  const closing: Record<string, string> = { "(": ")", "[": "]", "{": "}" };
  let valid = sequence.length > 0;
  if (valid) {
    steps.push({ id: "start", phase: t("stack.solutionDemo.scanPhase"), message: t("stack.solutionDemo.start"), visual: <BracketState sequence={sequence} currentIndex={-1} stack={[]} accent={accent} /> });
    for (let index = 0; index < sequence.length; index += 1) {
      const symbol = sequence[index]!;
      if (symbol === "(" || symbol === "[" || symbol === "{") {
        stack.push(symbol);
        steps.push({ id: `symbol-${index}`, phase: t("stack.solutionDemo.scanPhase"), message: t("stack.solutionDemo.pushStep", { symbol }), visual: <BracketState sequence={sequence} currentIndex={index} stack={[...stack]} accent={accent} /> });
        continue;
      }
      const opening = stack.at(-1);
      if (opening === undefined) {
        valid = false;
        steps.push({ id: `symbol-${index}`, phase: t("stack.solutionDemo.invalid"), message: t("stack.solutionDemo.unexpected", { symbol }), visual: <BracketState sequence={sequence} currentIndex={index} stack={[...stack]} accent={accent} invalid /> });
        break;
      }
      if (opening !== pairs[symbol]) {
        valid = false;
        steps.push({ id: `symbol-${index}`, phase: t("stack.solutionDemo.invalid"), message: t("stack.solutionDemo.mismatch", { expected: closing[opening] ?? "", received: symbol }), visual: <BracketState sequence={sequence} currentIndex={index} stack={[...stack]} accent={accent} invalid /> });
        break;
      }
      stack.pop();
      steps.push({ id: `symbol-${index}`, phase: t("stack.solutionDemo.scanPhase"), message: t("stack.solutionDemo.popStep", { symbol, opening }), visual: <BracketState sequence={sequence} currentIndex={index} stack={[...stack]} accent={accent} /> });
    }
    if (valid) {
      const complete = stack.length === 0;
      steps.push({ id: "complete", phase: complete ? t("stack.solutionDemo.valid") : t("stack.solutionDemo.invalid"), message: complete ? t("stack.solutionDemo.empty") : t("stack.solutionDemo.pending", { symbols: stack.join(" ") }), visual: <BracketState sequence={sequence} currentIndex={sequence.length} stack={[...stack]} accent={accent} invalid={!complete} /> });
    }
  }

  return (
    <>
      <label className="grid gap-2 text-sm text-zinc-400">
        <span>{t("stack.solutionDemo.sequence")}</span>
        <input
          type="text"
          required
          aria-invalid={sequence.length === 0}
          value={sequence}
          maxLength={16}
          onChange={(event) => setSequence(event.target.value.replace(/[^()[\]{}]/g, ""))}
          className="rounded-md border border-zinc-700 bg-zinc-950 px-3 py-2.5 font-mono text-zinc-100 outline-none focus-visible:ring-2 focus-visible:ring-zinc-300"
        />
      </label>
      {sequence.length === 0 ? <p className="mt-4 text-sm text-rose-300">{t("stack.solutionDemo.required")}</p> : <SolutionStepPlayer key={sequence} steps={steps} accent={accent} />}
    </>
  );
}

function BracketState({ sequence, currentIndex, stack, accent, invalid = false }: { readonly sequence: string; readonly currentIndex: number; readonly stack: readonly string[]; readonly accent: Accent; readonly invalid?: boolean }): React.JSX.Element {
  const { t } = useTranslation("dataStructures");
  const accentStyle = accentStyles[accent];
  return (
    <div className="grid gap-6 sm:grid-cols-[minmax(0,1fr)_12rem]">
      <div className="flex flex-wrap gap-2">
        {[...sequence].map((symbol, index) => <span key={`${symbol}-${index}`} className={cn("flex size-10 items-center justify-center rounded-md border font-mono", index === currentIndex ? invalid ? "border-rose-400 bg-rose-400/10 text-rose-300" : cn(accentStyle.edge, accentStyle.text, "bg-zinc-900") : index < currentIndex ? "border-zinc-800 text-zinc-600" : "border-zinc-700 text-zinc-300")}>{symbol}</span>)}
      </div>
      <div><p className="mb-3 text-xs uppercase tracking-[0.12em] text-zinc-500">{t("stack.solutionDemo.stack")}</p><div className="flex min-h-12 flex-col-reverse gap-1">{stack.length === 0 ? <span className="text-sm text-zinc-600">∅</span> : stack.map((symbol, index) => <span key={`${symbol}-${index}`} className={cn("rounded border bg-zinc-900 px-3 py-2 text-center font-mono", accentStyle.edge, accentStyle.text)}>{symbol}</span>)}</div></div>
    </div>
  );
}

function QueueSolutionDemo({ accent }: { readonly accent: Accent }): React.JSX.Element {
  const { t } = useTranslation("dataStructures");
  const [pingsInput, setPingsInput] = useState("1, 100, 3001, 3002");
  const pings = parseIntegerList(pingsInput, 1, 1_000_000_000);
  const valid = pings !== null && pings.every((time, index) => index === 0 || time > pings[index - 1]!);
  const steps: WalkthroughStep[] = [];
  if (valid && pings !== null) {
    const queue: number[] = [];
    const answers: number[] = [];
    steps.push({ id: "start", phase: t("queue.solutionDemo.processPhase"), message: t("queue.solutionDemo.start"), visual: <QueueState queue={[]} answers={[]} accent={accent} /> });
    for (const time of pings) {
      queue.push(time);
      const start = time - 3000;
      const removed: number[] = [];
      while (queue.length > 0 && queue[0]! < start) removed.push(queue.shift()!);
      answers.push(queue.length);
      const message = removed.length === 0 ? t("queue.solutionDemo.keepStep", { time, start, count: queue.length }) : t("queue.solutionDemo.removeStep", { time, removed: removed.join(", "), start, count: queue.length });
      steps.push({ id: `ping-${time}`, phase: t("queue.solutionDemo.processPhase"), message, visual: <QueueState queue={[...queue]} answers={[...answers]} windowStart={start} windowEnd={time} accent={accent} /> });
    }
  }

  return (
    <>
      <SolutionTextInput label={t("queue.solutionDemo.pingsInput")} value={pingsInput} onChange={setPingsInput} invalid={!valid} hint={t("queue.solutionDemo.pingsHint")} />
      {!valid ? <p className="mt-4 text-sm text-rose-300">{t("queue.solutionDemo.invalid")}</p> : <SolutionStepPlayer key={pingsInput} steps={steps} accent={accent} />}
    </>
  );
}

function QueueState({ queue, answers, windowStart, windowEnd, accent }: { readonly queue: readonly number[]; readonly answers: readonly number[]; readonly windowStart?: number; readonly windowEnd?: number; readonly accent: Accent }): React.JSX.Element {
  const { t } = useTranslation("dataStructures");
  return <div>{windowStart === undefined ? null : <p className="mb-3 text-sm text-zinc-400">{t("queue.solutionDemo.window", { start: windowStart, end: windowEnd ?? windowStart })}</p>}<NumberChips values={queue} accent={accent} /><p className="mt-3 text-sm text-zinc-300">{t("queue.solutionDemo.queue")}: {queue.length === 0 ? "∅" : queue.join(", ")}</p><p className="mt-2 text-sm text-zinc-400">{t("queue.solutionDemo.answers")}: {answers.length === 0 ? "—" : answers.join(", ")}</p></div>;
}

function SetSolutionDemo({ accent }: { readonly accent: Accent }): React.JSX.Element {
  const { t } = useTranslation("dataStructures");
  const [text, setText] = useState("{a, b, a, c}");
  const steps: WalkthroughStep[] = [];
  const letters = new Set<string>();
  steps.push({ id: "start", phase: t("set.solutionDemo.processPhase"), message: t("set.solutionDemo.start"), visual: <SetState text={text} currentIndex={-1} letters={[]} accent={accent} /> });
  for (let index = 0; index < text.length; index += 1) {
    const symbol = text[index]!;
    let message: string;
    if (!/[a-z]/.test(symbol)) message = t("set.solutionDemo.ignoreStep", { symbol: symbol === " " ? "␠" : symbol });
    else if (letters.has(symbol)) message = t("set.solutionDemo.duplicateStep", { symbol });
    else {
      letters.add(symbol);
      message = t("set.solutionDemo.insertStep", { symbol });
    }
    steps.push({ id: `char-${index}`, phase: t("set.solutionDemo.processPhase"), message, visual: <SetState text={text} currentIndex={index} letters={[...letters].sort()} accent={accent} /> });
  }
  const finalLetters = [...letters].sort();
  const countMessage = t(finalLetters.length === 1 ? "set.solutionDemo.count_one" : "set.solutionDemo.count_other", { count: finalLetters.length });
  steps.push({
    id: "answer",
    phase: t("set.solutionDemo.queryPhase"),
    message: countMessage,
    visual: <SetState text={text} currentIndex={text.length} letters={finalLetters} answer={finalLetters.length} accent={accent} />
  });

  return (
    <>
      <label className="grid gap-2 text-sm text-zinc-400">
        <span>{t("set.solutionDemo.text")}</span>
        <input
          type="text"
          value={text}
          maxLength={40}
          onChange={(event) => setText(event.target.value.toLowerCase().replace(/[^a-z{},\s]/g, ""))}
          className="rounded-md border border-zinc-700 bg-zinc-950 px-3 py-2.5 font-mono text-zinc-100 outline-none focus-visible:ring-2 focus-visible:ring-zinc-300"
        />
      </label>
      <SolutionStepPlayer key={text} steps={steps} accent={accent} />
    </>
  );
}

function SetState({ text, currentIndex, letters, answer, accent }: { readonly text: string; readonly currentIndex: number; readonly letters: readonly string[]; readonly answer?: number; readonly accent: Accent }): React.JSX.Element {
  const { t } = useTranslation("dataStructures");
  const accentStyle = accentStyles[accent];
  return <div className="grid gap-5 sm:grid-cols-[minmax(0,1fr)_14rem]"><div className="flex flex-wrap gap-1">{[...text].map((symbol, index) => <span key={`${symbol}-${index}`} className={cn("flex min-w-8 items-center justify-center rounded border px-2 py-2 font-mono text-sm", index === currentIndex ? cn(accentStyle.edge, accentStyle.text, "bg-zinc-900") : index < currentIndex ? "border-zinc-800 text-zinc-600" : "border-zinc-700 text-zinc-300")}>{symbol === " " ? "·" : symbol}</span>)}</div><div><p className="mb-3 text-xs uppercase tracking-[0.12em] text-zinc-500">{t("set.solutionDemo.unique")}</p><div className="flex min-h-12 flex-wrap gap-2">{letters.length === 0 ? <span className="text-zinc-600">∅</span> : letters.map((letter) => <span key={letter} className={cn("flex size-10 items-center justify-center rounded-full border bg-zinc-900 font-mono", accentStyle.edge, accentStyle.text)}>{letter}</span>)}</div>{answer === undefined ? null : <p className="mt-4 text-sm text-zinc-300">{t("set.solutionDemo.answer")}: <strong className={accentStyle.text}>{answer}</strong></p>}</div></div>;
}

function MapSolutionDemo({ accent }: { readonly accent: Accent }): React.JSX.Element {
  const { t } = useTranslation("dataStructures");
  const [requestsInput, setRequestsInput] = useState("abacaba, acaba, abacaba, abacaba");
  const requests = requestsInput.split(",").map((name) => name.trim());
  const valid = requests.length > 0 && requests.length <= 8 && requests.every((name) => /^[a-z]{1,32}$/.test(name));
  const steps: WalkthroughStep[] = [];
  if (valid) {
    const counts = new Map<string, number>();
    const answers: string[] = [];
    steps.push({ id: "start", phase: t("map.solutionDemo.processPhase"), message: t("map.solutionDemo.start"), visual: <MapState counts={new Map(counts)} answers={[]} accent={accent} /> });
    for (const name of requests) {
      const previous = counts.get(name) ?? 0;
      const answer = previous === 0 ? "OK" : `${name}${previous}`;
      answers.push(answer);
      counts.set(name, previous + 1);
      const message = previous === 0 ? t("map.solutionDemo.newStep", { name }) : t("map.solutionDemo.repeatStep", { name, previous, answer, next: previous + 1 });
      steps.push({ id: `request-${answers.length}`, phase: t("map.solutionDemo.processPhase"), message, visual: <MapState counts={new Map(counts)} answers={[...answers]} active={name} accent={accent} /> });
    }
  }

  return (
    <>
      <SolutionTextInput label={t("map.solutionDemo.requestsInput")} value={requestsInput} onChange={setRequestsInput} invalid={!valid} hint={t("map.solutionDemo.requestsHint")} />
      {!valid ? <p className="mt-4 text-sm text-rose-300">{t("map.solutionDemo.invalid")}</p> : <SolutionStepPlayer key={requestsInput} steps={steps} accent={accent} />}
    </>
  );
}

function MapState({ counts, answers, active, accent }: { readonly counts: ReadonlyMap<string, number>; readonly answers: readonly string[]; readonly active?: string; readonly accent: Accent }): React.JSX.Element {
  const { t } = useTranslation("dataStructures");
  const accentStyle = accentStyles[accent];
  return <div className="grid gap-5 sm:grid-cols-2"><div><p className="mb-3 text-xs uppercase tracking-[0.12em] text-zinc-500">{t("map.solutionDemo.counts")}</p><div className="space-y-2">{counts.size === 0 ? <span className="text-sm text-zinc-600">∅</span> : [...counts].map(([name, count]) => <div key={name} className={cn("flex justify-between rounded border bg-zinc-900 px-3 py-2 font-mono text-sm", name === active ? accentStyle.edge : "border-zinc-800")}><span>{name}</span><span className={name === active ? accentStyle.text : "text-zinc-400"}>{count}</span></div>)}</div></div><div><p className="mb-3 text-xs uppercase tracking-[0.12em] text-zinc-500">{t("map.solutionDemo.answers")}</p><p className="break-words font-mono text-sm text-zinc-300">{answers.length === 0 ? "—" : answers.join(", ")}</p></div></div>;
}

type MinStackOperation =
  | { readonly kind: "push"; readonly value: number }
  | { readonly kind: "pop" | "top" | "getMin" };

function parseMinStackOperations(input: string): readonly MinStackOperation[] | null {
  const tokens = input.split(",").map((token) => token.trim());
  if (tokens.length === 0 || tokens.length > 10 || tokens.some((token) => token.length === 0)) return null;

  const operations: MinStackOperation[] = [];
  for (const token of tokens) {
    const push = /^push\(\s*(-?\d+)\s*\)$/.exec(token);
    if (push) {
      const value = Number(push[1]);
      if (!Number.isSafeInteger(value) || value < -1_000_000_000 || value > 1_000_000_000) return null;
      operations.push({ kind: "push", value });
      continue;
    }
    if (token === "pop()" || token === "top()" || token === "getMin()") {
      operations.push({ kind: token.slice(0, -2) as "pop" | "top" | "getMin" });
      continue;
    }
    return null;
  }
  return operations;
}

function RangesSolutionDemo({ accent }: { readonly accent: Accent }): React.JSX.Element {
  const { t } = useTranslation("dataStructures");
  const [operationsInput, setOperationsInput] = useState("push(5), push(2), push(4), getMin(), pop(), getMin(), pop(), getMin()");
  const operations = parseMinStackOperations(operationsInput);
  const steps: WalkthroughStep[] = [];
  let valid = operations !== null;
  if (operations !== null) {
    const stack: Array<readonly [number, number]> = [];
    const answers: string[] = [];
    steps.push({ id: "start", phase: t("ranges.solutionDemo.processPhase"), message: t("ranges.solutionDemo.start"), visual: <MinStackState stack={[]} answers={[]} accent={accent} /> });
    for (let index = 0; index < operations.length; index += 1) {
      const operation = operations[index]!;
      if (operation.kind === "push") {
        const minimum = Math.min(operation.value, stack.at(-1)?.[1] ?? operation.value);
        stack.push([operation.value, minimum]);
        steps.push({ id: `operation-${index}`, phase: t("ranges.solutionDemo.processPhase"), message: t("ranges.solutionDemo.pushStep", { value: operation.value, minimum }), visual: <MinStackState stack={[...stack]} answers={[...answers]} accent={accent} /> });
        continue;
      }
      const top = stack.at(-1);
      if (top === undefined) {
        valid = false;
        break;
      }
      if (operation.kind === "pop") {
        const removed = stack.pop()!;
        const revealed = stack.at(-1);
        const message = revealed === undefined
          ? t("ranges.solutionDemo.popLastStep", { value: removed[0] })
          : t("ranges.solutionDemo.popStep", { value: removed[0], minimum: revealed[1] });
        steps.push({ id: `operation-${index}`, phase: t("ranges.solutionDemo.processPhase"), message, visual: <MinStackState stack={[...stack]} answers={[...answers]} accent={accent} /> });
        continue;
      }
      const answer = operation.kind === "top" ? top[0] : top[1];
      answers.push(`${operation.kind} → ${answer}`);
      const message = operation.kind === "top"
        ? t("ranges.solutionDemo.topStep", { value: answer })
        : t("ranges.solutionDemo.minimumStep", { minimum: answer });
      steps.push({ id: `operation-${index}`, phase: t("ranges.solutionDemo.queryPhase"), message, visual: <MinStackState stack={[...stack]} answers={[...answers]} accent={accent} /> });
    }
  }

  return (
    <>
      <SolutionTextInput label={t("ranges.solutionDemo.operationsInput")} value={operationsInput} onChange={setOperationsInput} invalid={!valid} hint={t("ranges.solutionDemo.operationsHint")} />
      {!valid ? <p className="mt-4 text-sm text-rose-300">{t("ranges.solutionDemo.invalid")}</p> : <SolutionStepPlayer key={operationsInput} steps={steps} accent={accent} />}
    </>
  );
}

function MinStackState({ stack, answers, accent }: { readonly stack: readonly (readonly [number, number])[]; readonly answers: readonly string[]; readonly accent: Accent }): React.JSX.Element {
  const { t } = useTranslation("dataStructures");
  const accentStyle = accentStyles[accent];
  return <div className="grid gap-5 sm:grid-cols-[minmax(0,1fr)_13rem]"><div><p className="mb-3 text-xs uppercase tracking-[0.12em] text-zinc-500">{t("ranges.solutionDemo.stack")}</p><div className="flex min-h-16 flex-col-reverse gap-2">{stack.length === 0 ? <span className="text-zinc-600">∅</span> : stack.map(([value, minimum], index) => <div key={`${value}-${index}`} className={cn("flex items-center justify-between rounded border bg-zinc-900 px-4 py-3 font-mono text-sm", index === stack.length - 1 ? accentStyle.edge : "border-zinc-800")}><span>({value}, {minimum})</span>{index === stack.length - 1 ? <span className={cn("text-xs", accentStyle.text)}>{t("ranges.solutionDemo.top")}</span> : null}</div>)}</div></div><div><p className="mb-3 text-xs uppercase tracking-[0.12em] text-zinc-500">{t("ranges.solutionDemo.answers")}</p><p className="break-words font-mono text-sm leading-7 text-zinc-300">{answers.length === 0 ? "—" : answers.join(", ")}</p></div></div>;
}

function BookStackVisual(): React.JSX.Element {
  const { t } = useTranslation("dataStructures");
  const books = [
    { label: t("stack.visual.topBook"), className: "w-[82%] border-violet-300/70 bg-violet-400/20 text-violet-100" },
    { label: t("stack.visual.middleBook"), className: "w-[94%] border-cyan-300/60 bg-cyan-400/15 text-cyan-100" },
    { label: t("stack.visual.bottomBook"), className: "w-full border-amber-300/60 bg-amber-400/15 text-amber-100" }
  ] as const;

  return (
    <figure className="my-8 overflow-hidden rounded-xl border border-violet-400/25 bg-[#0d0a16]" aria-labelledby="book-stack-title">
      <figcaption className="border-b border-violet-400/15 px-5 py-4 sm:px-6">
        <p className="font-mono text-[10px] font-semibold uppercase tracking-[0.15em] text-violet-300">
          {t("stack.visual.eyebrow")}
        </p>
        <h4 id="book-stack-title" className="mt-2 text-lg font-semibold text-zinc-100">
          {t("stack.visual.title")}
        </h4>
        <p className="mt-2 max-w-3xl text-sm leading-6 text-zinc-400">{t("stack.visual.description")}</p>
      </figcaption>
      <div className="grid gap-8 px-5 py-7 sm:grid-cols-[minmax(0,1fr)_14rem] sm:items-center sm:px-7">
        <div className="mx-auto flex w-full max-w-md flex-col items-center gap-2" aria-label={t("stack.visual.label")}>
          {books.map((book, index) => (
            <div
              key={book.label}
              className={cn(
                "relative rounded-sm border px-5 py-3 text-center text-sm font-semibold shadow-[0_8px_18px_rgba(0,0,0,.22)]",
                book.className
              )}
            >
              {index === 0 ? (
                <span className="absolute -right-3 -top-3 rounded bg-violet-300 px-2 py-1 font-mono text-[9px] font-bold uppercase tracking-wide text-violet-950">
                  top()
                </span>
              ) : null}
              <span className="mr-3 inline-block h-3 w-1 rounded-full bg-current opacity-50" aria-hidden="true" />
              {book.label}
            </div>
          ))}
          <div className="h-2 w-[108%] rounded-full bg-zinc-700" aria-hidden="true" />
        </div>
        <div className="space-y-4 text-sm">
          <div className="rounded-lg border border-violet-400/30 bg-violet-400/10 p-4">
            <p className="flex items-center justify-between gap-3 font-mono text-xs font-semibold text-violet-200">
              <span>push(book)</span>
              <span className="rounded border border-violet-300/30 px-2 py-0.5 text-[10px]">O(1)</span>
            </p>
            <p className="mt-1 leading-5 text-zinc-400">{t("stack.visual.push")}</p>
          </div>
          <div className="rounded-lg border border-rose-400/30 bg-rose-400/10 p-4">
            <p className="flex items-center justify-between gap-3 font-mono text-xs font-semibold text-rose-200">
              <span>pop()</span>
              <span className="rounded border border-rose-300/30 px-2 py-0.5 text-[10px]">O(1)</span>
            </p>
            <p className="mt-1 leading-5 text-zinc-400">{t("stack.visual.pop")}</p>
          </div>
        </div>
      </div>
    </figure>
  );
}

function DequeMiniLesson(): React.JSX.Element {
  const { t } = useTranslation("dataStructures");
  const operations = [
    { name: "push_front(value)", description: t("queue.deque.operations.pushFront"), cost: "O(1)" },
    { name: "push_back(value)", description: t("queue.deque.operations.pushBack"), cost: "O(1)" },
    { name: "front() / back()", description: t("queue.deque.operations.ends"), cost: "O(1)" },
    { name: "pop_front()", description: t("queue.deque.operations.popFront"), cost: "O(1)" },
    { name: "pop_back()", description: t("queue.deque.operations.popBack"), cost: "O(1)" },
    { name: "deque[index]", description: t("queue.deque.operations.index"), cost: "O(1)" }
  ] as const;

  return (
    <section className="my-10 overflow-hidden rounded-xl border border-amber-400/25 bg-amber-400/[0.035]" aria-labelledby="deque-mini-title">
      <div className="px-5 py-5 sm:px-6">
        <p className="font-mono text-[10px] font-semibold uppercase tracking-[0.15em] text-amber-300">
          {t("queue.deque.eyebrow")}
        </p>
        <h4 id="deque-mini-title" className="mt-2 text-xl font-semibold text-zinc-100">{t("queue.deque.title")}</h4>
        <p className="mt-2 max-w-3xl text-sm leading-6 text-zinc-400">{t("queue.deque.description")}</p>
      </div>
      <div className="border-y border-amber-400/15 bg-zinc-950/55 px-5 py-6 sm:px-7">
        <div className="flex min-w-0 items-center justify-center gap-2 overflow-x-auto" aria-label={t("queue.deque.visualLabel")}>
          <span className="shrink-0 font-mono text-xs text-amber-300">← front</span>
          {["A", "B", "C", "D"].map((value) => (
            <span key={value} className="grid size-11 shrink-0 place-items-center rounded-md border border-zinc-700 bg-zinc-900 font-mono text-sm text-zinc-200">
              {value}
            </span>
          ))}
          <span className="shrink-0 font-mono text-xs text-amber-300">back →</span>
        </div>
      </div>
      <div className="px-5 pb-1 sm:px-6">
        <ToolOperations operations={operations} accent="amber" />
        <DataStructureSimulator kind="deque" accent="amber" />
        <p className="mb-6 border-l-2 border-amber-400/50 pl-4 text-sm leading-6 text-zinc-400">
          {t("queue.deque.middleNote")}
        </p>
      </div>
    </section>
  );
}

function SetVariantsLesson(): React.JSX.Element {
  const { t } = useTranslation("dataStructures");
  return (
    <section className="my-10" aria-labelledby="set-variants-title">
      <p className="font-mono text-[10px] font-semibold uppercase tracking-[0.15em] text-emerald-300">
        {t("set.variants.eyebrow")}
      </p>
      <h4 id="set-variants-title" className="mt-2 text-xl font-semibold text-zinc-100">{t("set.variants.title")}</h4>
      <p className="mt-2 max-w-3xl text-sm leading-6 text-zinc-400">{t("set.variants.description")}</p>
      <div className="mt-5 grid gap-4 sm:grid-cols-2">
        <article className="rounded-xl border border-emerald-400/30 bg-emerald-400/[0.04] p-5">
          <h5 className="font-mono text-sm font-semibold text-emerald-200">set&lt;T&gt;</h5>
          <p className="mt-3 text-sm leading-6 text-zinc-400">{t("set.variants.ordered")}</p>
          <p className="mt-4 font-mono text-xs text-zinc-300">{t("set.variants.orderedCost")}</p>
        </article>
        <article className="rounded-xl border border-cyan-400/25 bg-cyan-400/[0.035] p-5">
          <h5 className="font-mono text-sm font-semibold text-cyan-200">unordered_set&lt;T&gt;</h5>
          <p className="mt-3 text-sm leading-6 text-zinc-400">{t("set.variants.unordered")}</p>
          <p className="mt-4 font-mono text-xs text-zinc-300">{t("set.variants.unorderedCost")}</p>
        </article>
      </div>
    </section>
  );
}

function MapVariantsLesson(): React.JSX.Element {
  const { t, i18n } = useTranslation("dataStructures");
  const spanish = (i18n.resolvedLanguage ?? i18n.language).startsWith("es");
  const code = spanish
    ? `unordered_map<string, int> frecuencias;
frecuencias["rojo"]++;
bool tiene_azul = frecuencias.count("azul");
frecuencias.erase("rojo");`
    : `unordered_map<string, int> frequencies;
frequencies["red"]++;
bool has_blue = frequencies.count("blue");
frequencies.erase("red");`;

  return (
    <section className="my-10" aria-labelledby="map-variants-title">
      <p className="font-mono text-[10px] font-semibold uppercase tracking-[0.15em] text-rose-300">
        {t("map.variants.eyebrow")}
      </p>
      <h4 id="map-variants-title" className="mt-2 text-xl font-semibold text-zinc-100">{t("map.variants.title")}</h4>
      <p className="mt-2 max-w-3xl text-sm leading-6 text-zinc-400">{t("map.variants.description")}</p>
      <div className="mt-5 grid gap-4 sm:grid-cols-2">
        <article className="rounded-xl border border-rose-400/30 bg-rose-400/[0.04] p-5">
          <h5 className="font-mono text-sm font-semibold text-rose-200">map&lt;K, V&gt;</h5>
          <p className="mt-3 text-sm leading-6 text-zinc-400">{t("map.variants.ordered")}</p>
          <p className="mt-4 font-mono text-xs text-zinc-300">{t("map.variants.orderedCost")}</p>
        </article>
        <article className="rounded-xl border border-cyan-400/25 bg-cyan-400/[0.035] p-5">
          <h5 className="font-mono text-sm font-semibold text-cyan-200">unordered_map&lt;K, V&gt;</h5>
          <p className="mt-3 text-sm leading-6 text-zinc-400">{t("map.variants.unordered")}</p>
          <p className="mt-4 font-mono text-xs text-zinc-300">{t("map.variants.unorderedCost")}</p>
        </article>
      </div>
      <div className="mt-5">
        <GuideCodeBlock code={code} />
      </div>
    </section>
  );
}

function StructPrimer(): React.JSX.Element {
  const { t, i18n } = useTranslation("dataStructures");
  const spanish = (i18n.resolvedLanguage ?? i18n.language).startsWith("es");
  const code = spanish
    ? `struct Contador {
  int valor = 0;

  void agregar(int cantidad) {
    valor += cantidad;
  }

  int obtener() const {
    return valor;
  }
};

Contador visitas;
visitas.agregar(3);
cout << visitas.obtener(); // 3`
    : `struct Counter {
  int value = 0;

  void add(int amount) {
    value += amount;
  }

  int get() const {
    return value;
  }
};

Counter visits;
visits.add(3);
cout << visits.get(); // 3`;

  const parts = [
    ["01", t("ranges.struct.fieldsTitle"), t("ranges.struct.fields")],
    ["02", t("ranges.struct.methodsTitle"), t("ranges.struct.methods")],
    ["03", t("ranges.struct.instanceTitle"), t("ranges.struct.instance")]
  ] as const;

  return (
    <section className="my-8 overflow-hidden rounded-xl border border-cyan-400/25 bg-cyan-400/[0.035]" aria-labelledby="struct-primer-title">
      <div className="px-5 py-5 sm:px-6">
        <p className="font-mono text-[10px] font-semibold uppercase tracking-[0.15em] text-cyan-300">
          {t("ranges.struct.eyebrow")}
        </p>
        <h4 id="struct-primer-title" className="mt-2 text-xl font-semibold text-zinc-100">{t("ranges.struct.title")}</h4>
        <p className="mt-2 max-w-3xl text-sm leading-6 text-zinc-400">{t("ranges.struct.description")}</p>
      </div>
      <div className="border-y border-cyan-400/15 px-4 pb-1 sm:px-5">
        <GuideCodeBlock code={code} />
      </div>
      <div className="px-5 pb-1 sm:px-6">
        <ToolOperations
          accent="cyan"
          operations={[
            { name: spanish ? "agregar(cantidad)" : "add(amount)", description: t("ranges.struct.addOperation"), cost: "O(1)" },
            { name: spanish ? "obtener()" : "get()", description: t("ranges.struct.getOperation"), cost: "O(1)" }
          ]}
        />
      </div>
      <ol className="grid gap-px bg-cyan-400/15 sm:grid-cols-3">
        {parts.map(([number, title, description]) => (
          <li key={number} className="bg-zinc-950/85 p-5">
            <span className="font-mono text-[10px] font-semibold text-cyan-300">{number}</span>
            <h5 className="mt-2 text-sm font-semibold text-zinc-100">{title}</h5>
            <p className="mt-2 text-xs leading-5 text-zinc-400">{description}</p>
          </li>
        ))}
      </ol>
    </section>
  );
}

function CustomStructureBlueprint(): React.JSX.Element {
  const { t } = useTranslation("dataStructures");
  const steps = [
    ["01", t("ranges.blueprint.stateTitle"), t("ranges.blueprint.state")],
    ["02", t("ranges.blueprint.invariantTitle"), t("ranges.blueprint.invariant")],
    ["03", t("ranges.blueprint.operationsTitle"), t("ranges.blueprint.operations")],
    ["04", t("ranges.blueprint.resultTitle"), t("ranges.blueprint.result")]
  ] as const;

  return (
    <section className="my-10 overflow-hidden rounded-xl border border-cyan-400/25 bg-[#061216]" aria-labelledby="custom-structure-title">
      <div className="border-b border-cyan-400/15 px-5 py-5 sm:px-6">
        <p className="font-mono text-[10px] font-semibold uppercase tracking-[0.15em] text-cyan-300">
          {t("ranges.blueprint.eyebrow")}
        </p>
        <h4 id="custom-structure-title" className="mt-2 text-xl font-semibold text-zinc-100">{t("ranges.blueprint.title")}</h4>
        <p className="mt-2 max-w-3xl text-sm leading-6 text-zinc-400">{t("ranges.blueprint.description")}</p>
      </div>
      <ol className="grid gap-px bg-cyan-400/15 sm:grid-cols-2">
        {steps.map(([number, title, description]) => (
          <li key={number} className="bg-zinc-950/90 p-5 sm:p-6">
            <span className="font-mono text-xs font-semibold text-cyan-300">{number}</span>
            <h5 className="mt-2 font-semibold text-zinc-100">{title}</h5>
            <p className="mt-2 text-sm leading-6 text-zinc-400">{description}</p>
          </li>
        ))}
      </ol>
    </section>
  );
}

function IteratorPrimer(): React.JSX.Element {
  const { t, i18n } = useTranslation("dataStructures");
  const spanish = (i18n.resolvedLanguage ?? i18n.language).startsWith("es");
  const values = [4, 7, 9, 12] as const;
  const [iteratorIndex, setIteratorIndex] = useState(0);
  const atEnd = iteratorIndex === values.length;
  const code = spanish
    ? `vector<int> valores = {4, 7, 9, 12};
auto it = valores.begin(); // apunta a 4
++it;                    // ahora apunta a 7
cout << *it;             // lee 7
int indice = it - valores.begin(); // 1`
    : `vector<int> values = {4, 7, 9, 12};
auto it = values.begin(); // points to 4
++it;                    // now points to 7
cout << *it;             // reads 7
int index = it - values.begin(); // 1`;
  const operations = [
    { name: "begin()", description: t("vector.iterators.begin"), cost: "O(1)" },
    { name: "end()", description: t("vector.iterators.end"), cost: "O(1)" },
    { name: "*it", description: t("vector.iterators.dereference"), cost: "O(1)" },
    { name: "++it", description: t("vector.iterators.advance"), cost: "O(1)" },
    { name: "--it", description: t("vector.iterators.retreat"), cost: "O(1)" },
    { name: "it - begin()", description: t("vector.iterators.distance"), cost: "O(1)" }
  ] as const;

  return (
    <section className="overflow-hidden rounded-xl border border-blue-400/25 bg-[#07101d]" aria-labelledby="iterator-primer-title">
      <div className="px-5 py-5 sm:px-6">
        <h4 id="iterator-primer-title" className="text-xl font-semibold text-zinc-100">{t("vector.iterators.title")}</h4>
        <p className="mt-2 max-w-3xl text-sm leading-6 text-zinc-400">{t("vector.iterators.description")}</p>
      </div>
      <div className="border-y border-blue-400/15 bg-zinc-950/55 px-5 py-6 sm:px-7">
        <div className="max-w-full overflow-x-auto pb-2" aria-label={t("vector.iterators.visualLabel")}>
          <div className="flex min-w-max items-end gap-2">
            {values.map((value, index) => (
              <div key={value} className="w-16 shrink-0 text-center">
                <div className="mb-2 h-6 font-mono text-[10px] font-semibold">
                  {index === 0 ? <span className="text-cyan-300">begin()</span> : null}
                  {index === iteratorIndex ? <span className="rounded bg-blue-400/15 px-2 py-1 text-blue-200">it</span> : null}
                </div>
                <div className={cn(
                  "rounded-md border px-3 py-3 font-mono text-sm",
                  index === iteratorIndex ? "border-blue-400 bg-blue-400/15 text-blue-100" : "border-zinc-700 bg-zinc-900 text-zinc-300"
                )}>
                  {value}
                </div>
                <span className="mt-1 block font-mono text-[9px] text-zinc-600">{index}</span>
              </div>
            ))}
            <div className="w-20 shrink-0 text-center">
              <div className="mb-2 h-6 font-mono text-[10px] font-semibold text-rose-300">
                end(){atEnd ? <span className="ml-1 rounded bg-blue-400/15 px-1.5 py-1 text-blue-200">it</span> : null}
              </div>
              <div className={cn(
                "rounded-md border border-dashed px-2 py-3 font-mono text-xs",
                atEnd ? "border-blue-400 bg-blue-400/10 text-blue-100" : "border-rose-400/40 text-rose-200"
              )}>
                {t("vector.iterators.noValue")}
              </div>
              <span className="mt-1 block font-mono text-[9px] text-zinc-600">4</span>
            </div>
          </div>
        </div>
        <div className="mt-5 grid gap-4 rounded-lg border border-blue-400/20 bg-blue-400/[0.04] p-4 sm:grid-cols-[minmax(0,1fr)_auto] sm:items-center">
          <div aria-live="polite">
            <p className="font-mono text-[10px] font-semibold uppercase tracking-[0.14em] text-blue-300">
              {t("vector.iterators.demoTitle")}
            </p>
            <p className="mt-2 text-sm leading-6 text-zinc-400">{t("vector.iterators.demoDescription")}</p>
            <p className="mt-3 font-mono text-sm text-zinc-200">
              {atEnd
                ? t("vector.iterators.atEnd")
                : t("vector.iterators.current", { index: iteratorIndex, value: values[iteratorIndex]! })}
            </p>
          </div>
          <div className="flex flex-wrap gap-2" role="group" aria-label={t("vector.iterators.controls")}>
            <button
              type="button"
              disabled={iteratorIndex === 0}
              onClick={() => setIteratorIndex((current) => Math.max(0, current - 1))}
              aria-label={t("vector.iterators.movePrevious")}
              className="inline-flex items-center gap-2 rounded-md border border-zinc-700 px-3 py-2 font-mono text-xs text-zinc-200 hover:border-blue-400/60 disabled:cursor-not-allowed disabled:opacity-35"
            >
              <ArrowLeft className="size-3.5" aria-hidden="true" /> --it
            </button>
            <button
              type="button"
              disabled={atEnd}
              onClick={() => setIteratorIndex((current) => Math.min(values.length, current + 1))}
              aria-label={t("vector.iterators.moveNext")}
              className="inline-flex items-center gap-2 rounded-md border border-blue-400/60 bg-blue-400/10 px-3 py-2 font-mono text-xs font-semibold text-blue-200 hover:bg-blue-400/15 disabled:cursor-not-allowed disabled:opacity-35"
            >
              ++it <ArrowRight className="size-3.5" aria-hidden="true" />
            </button>
            <button
              type="button"
              onClick={() => setIteratorIndex(0)}
              className="inline-flex items-center gap-2 rounded-md border border-zinc-700 px-3 py-2 text-xs text-zinc-300 hover:border-zinc-500"
            >
              <RotateCcw className="size-3.5" aria-hidden="true" /> {t("vector.iterators.reset")}
            </button>
          </div>
        </div>
        <p className="mt-4 border-l-2 border-rose-400/60 pl-4 text-xs leading-5 text-zinc-400">
          {t("vector.iterators.endWarning")}
        </p>
      </div>
      <div className="px-4 pb-1 sm:px-5">
        <GuideCodeBlock code={code} />
      </div>
      <div className="px-5 pb-1 sm:px-6">
        <ToolOperations operations={operations} accent="blue" />
      </div>
    </section>
  );
}

function VectorToolLab(): React.JSX.Element {
  const { t, i18n } = useTranslation("dataStructures");
  const [target, setTarget] = useState(5);
  const spanish = (i18n.resolvedLanguage ?? i18n.language).startsWith("es");
  const values = [1, 3, 3, 6, 8, 10] as const;
  const targets = [0, 3, 5, 10, 12] as const;
  const lowerIndex = values.findIndex((value) => value >= target);
  const upperIndex = values.findIndex((value) => value > target);
  const lower = lowerIndex === -1 ? values.length : lowerIndex;
  const upper = upperIndex === -1 ? values.length : upperIndex;
  const sortCode = spanish
    ? `vector<int> valores = {8, 3, 6, 1};
sort(valores.begin(), valores.end());
// valores ahora es {1, 3, 6, 8}`
    : `vector<int> values = {8, 3, 6, 1};
sort(values.begin(), values.end());
// values is now {1, 3, 6, 8}`;
  const boundsCode = spanish
    ? `auto no_menor = lower_bound(valores.begin(), valores.end(), objetivo);
auto mayor = upper_bound(valores.begin(), valores.end(), objetivo);`
    : `auto not_less = lower_bound(values.begin(), values.end(), target);
auto greater = upper_bound(values.begin(), values.end(), target);`;

  return (
    <section className="my-8 space-y-8" aria-labelledby="vector-tool-lab-title">
      <div>
        <h4 id="vector-tool-lab-title" className="text-lg font-semibold text-zinc-100">
          {t("vector.lab.sortTitle")}
        </h4>
        <p className="mt-2 max-w-3xl text-sm leading-6 text-zinc-400">{t("vector.lab.sortDescription")}</p>
        <GuideCodeBlock code={sortCode} />
      </div>

      <IteratorPrimer />

      <ToolOperations
        accent="blue"
        operations={[
          { name: "lower_bound(...)", description: t("vector.operations.lowerBound"), cost: "O(log n)" },
          { name: "upper_bound(...)", description: t("vector.operations.upperBound"), cost: "O(log n)" }
        ]}
      />

      <div className="border-t border-zinc-800 pt-8">
        <h4 className="text-lg font-semibold text-zinc-100">{t("vector.lab.boundsTitle")}</h4>
        <p className="mt-2 max-w-3xl text-sm leading-6 text-zinc-400">{t("vector.lab.boundsDescription")}</p>
        <GuideCodeBlock code={boundsCode} />
      </div>

      <div className="overflow-hidden rounded-lg border border-zinc-800 bg-zinc-950/50" aria-label={t("vector.lab.explorerLabel")}>
        <div className="border-b border-zinc-800 px-5 py-5">
          <p className="font-mono text-[10px] uppercase tracking-[0.14em] text-blue-300">{t("vector.lab.explorerEyebrow")}</p>
          <h4 className="mt-2 font-semibold text-zinc-100">{t("vector.lab.explorerTitle")}</h4>
          <div className="mt-4 flex flex-wrap gap-2" role="group" aria-label={t("vector.lab.chooseTarget")}>
            {targets.map((candidate) => (
              <button
                key={candidate}
                type="button"
                aria-pressed={target === candidate}
                onClick={() => setTarget(candidate)}
                className={cn(
                  "min-w-10 rounded-md border px-3 py-2 font-mono text-xs focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-300",
                  target === candidate ? "border-blue-400 bg-blue-400/15 text-blue-200" : "border-zinc-700 text-zinc-400 hover:border-zinc-500"
                )}
              >
                {candidate}
              </button>
            ))}
          </div>
        </div>

        <div className="px-5 py-6">
          <div className="overflow-x-auto pb-3">
            <div className="flex min-w-max items-end gap-2">
              {values.map((value, index) => {
                const isLower = index === lower;
                const isUpper = index === upper;
                return (
                  <div key={`${value}-${index}`} className="w-14 shrink-0 text-center">
                    <div className="mb-2 flex h-6 items-center justify-center gap-1 font-mono text-[9px]">
                      {isLower ? <span className="rounded bg-cyan-400/15 px-1 text-cyan-300">L</span> : null}
                      {isUpper ? <span className="rounded bg-violet-400/15 px-1 text-violet-300">U</span> : null}
                    </div>
                    <div className={cn(
                      "rounded-md border px-3 py-3 font-mono text-sm",
                      isLower && isUpper
                        ? "border-fuchsia-400 bg-fuchsia-400/10 text-fuchsia-200"
                        : isLower
                          ? "border-cyan-400 bg-cyan-400/10 text-cyan-200"
                          : isUpper
                            ? "border-violet-400 bg-violet-400/10 text-violet-200"
                            : "border-zinc-700 bg-zinc-900 text-zinc-300"
                    )}>
                      {value}
                    </div>
                    <span className="mt-1 block font-mono text-[9px] text-zinc-600">{index}</span>
                  </div>
                );
              })}
              <div className="w-16 shrink-0 text-center">
                <div className="mb-2 flex h-6 items-center justify-center gap-1 font-mono text-[9px]">
                  {lower === values.length ? <span className="rounded bg-cyan-400/15 px-1 text-cyan-300">L</span> : null}
                  {upper === values.length ? <span className="rounded bg-violet-400/15 px-1 text-violet-300">U</span> : null}
                </div>
                <div className="rounded-md border border-dashed border-zinc-700 px-2 py-3 font-mono text-xs text-zinc-500">end()</div>
                <span className="mt-1 block font-mono text-[9px] text-zinc-600">{values.length}</span>
              </div>
            </div>
          </div>

          <div className="mt-6 grid gap-x-8 gap-y-5 border-t border-zinc-800 pt-5 sm:grid-cols-2">
            <div className="border-l-2 border-cyan-400/50 pl-4">
              <p className="font-mono text-xs font-semibold text-cyan-300">lower_bound({target}) → {lower}</p>
              <p className="mt-2 text-sm leading-6 text-zinc-400">{t("vector.lab.lowerMeaning", { target })}</p>
            </div>
            <div className="border-l-2 border-violet-400/50 pl-4">
              <p className="font-mono text-xs font-semibold text-violet-300">upper_bound({target}) → {upper}</p>
              <p className="mt-2 text-sm leading-6 text-zinc-400">{t("vector.lab.upperMeaning", { target })}</p>
            </div>
          </div>

          <div className="mt-6 rounded-lg border border-blue-400/25 bg-blue-400/[0.045] p-4 sm:p-5">
            <h5 className="text-sm font-semibold text-blue-100">{t("vector.lab.iteratorResultTitle")}</h5>
            <p className="mt-2 max-w-3xl text-sm leading-6 text-zinc-400">{t("vector.lab.iteratorResultDescription")}</p>
            <div className="mt-4 grid gap-2 font-mono text-xs sm:grid-cols-2">
              <p className="rounded-md border border-zinc-800 bg-zinc-950/75 px-3 py-2 text-zinc-300">
                it - begin() <span className="text-zinc-600">→</span> {t("vector.lab.countBefore")}
              </p>
              <p className="rounded-md border border-zinc-800 bg-zinc-950/75 px-3 py-2 text-zinc-300">
                end() - it <span className="text-zinc-600">→</span> {t("vector.lab.countAfter")}
              </p>
            </div>
          </div>

          <div className="mt-6 grid grid-cols-2 border-t border-zinc-800 lg:grid-cols-4">
            {[
              [`< ${target}`, lower, t("vector.lab.less")],
              [`≤ ${target}`, upper, t("vector.lab.lessEqual")],
              [`≥ ${target}`, values.length - lower, t("vector.lab.greaterEqual")],
              [`> ${target}`, values.length - upper, t("vector.lab.greater")]
            ].map(([relation, count, label], index) => (
              <div
                key={String(relation)}
                className={cn(
                  "py-4 pr-4",
                  index % 2 === 1 && "border-l border-zinc-800 pl-4",
                  "lg:border-l lg:pl-4 lg:first:border-l-0 lg:first:pl-0"
                )}
              >
                <p className="font-mono text-lg font-semibold text-zinc-100">{String(relation)} → {String(count)}</p>
                <p className="mt-1 text-xs leading-5 text-zinc-500">{String(label)}</p>
              </div>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}

function NumericTypeReference(): React.JSX.Element {
  const { t } = useTranslation("dataStructures");
  const rows = [
    ["short", t("numeric.types.integer"), "16", "−2¹⁵ … 2¹⁵−1", t("numeric.types.shortApprox")],
    ["int", t("numeric.types.integer"), "32", "−2³¹ … 2³¹−1", t("numeric.types.intApprox")],
    ["long long", t("numeric.types.integer"), "64", "−2⁶³ … 2⁶³−1", t("numeric.types.longLongApprox")],
    ["unsigned int", t("numeric.types.unsigned"), "32", "0 … 2³²−1", t("numeric.types.unsignedApprox")],
    ["float", t("numeric.types.floating"), "32", "≈ 2⁻¹²⁶ … 2¹²⁸", t("numeric.types.floatApprox")],
    ["double", t("numeric.types.floating"), "64", "≈ 2⁻¹⁰²² … 2¹⁰²⁴", t("numeric.types.doubleApprox")]
  ] as const;

  return (
    <section className="my-8" aria-labelledby="numeric-type-reference-title">
      <h4 id="numeric-type-reference-title" className="text-lg font-semibold text-zinc-100">
        {t("numeric.types.title")}
      </h4>
      <p className="mt-2 max-w-3xl text-sm leading-6 text-zinc-400">{t("numeric.types.description")}</p>
      <div className="mt-5 max-w-full overflow-x-auto rounded-lg border border-zinc-800">
        <table className="min-w-[50rem] border-collapse text-left text-xs">
          <thead className="bg-zinc-900 text-zinc-400">
            <tr>
              {[t("numeric.types.keyword"), t("numeric.types.family"), t("numeric.types.bits"), t("numeric.types.power"), t("numeric.types.approximation")].map((heading) => (
                <th key={heading} className="border-b border-zinc-700 px-4 py-3 font-mono font-medium">{heading}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {rows.map(([keyword, family, bits, power, approximation]) => (
              <tr key={keyword} className="border-b border-zinc-800 bg-zinc-950/40 last:border-b-0">
                <th scope="row" className="px-4 py-3 font-mono font-semibold text-cyan-300">{keyword}</th>
                <td className="px-4 py-3 text-zinc-300">{family}</td>
                <td className="px-4 py-3 font-mono text-zinc-300">{bits}</td>
                <td className="px-4 py-3 font-mono text-zinc-300">{power}</td>
                <td className="px-4 py-3 text-zinc-300">{approximation}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <p className="mt-4 border-l-2 border-cyan-400 pl-4 text-sm leading-6 text-zinc-400">
        {t("numeric.types.note")}
      </p>
    </section>
  );
}

function ContainerReference(): React.JSX.Element {
  const { t } = useTranslation("dataStructures");
  const na = t("reference.notAvailable");
  const summaries = [
    { name: "array<T, n>", summary: t("reference.summaries.array"), operations: ["values[index]", "size()"], accent: "cyan" },
    { name: "vector<T>", summary: t("reference.summaries.vector"), operations: ["values[index]", "push_back", "sort"], accent: "blue" },
    { name: "stack<T>", summary: t("reference.summaries.stack"), operations: ["push", "top", "pop"], accent: "violet" },
    { name: "queue<T>", summary: t("reference.summaries.queue"), operations: ["push", "front", "pop"], accent: "amber" },
    { name: "deque<T>", summary: t("reference.summaries.deque"), operations: ["push_front", "push_back", "front", "back"], accent: "amber" },
    { name: "set<T> / unordered_set<T>", summary: t("reference.summaries.set"), operations: ["insert", "count", "erase", "lower_bound*"], accent: "emerald" },
    { name: "map<K, V> / unordered_map<K, V>", summary: t("reference.summaries.map"), operations: ["map[key]", "count", "erase", "lower_bound*"], accent: "rose" },
    { name: "struct Name", summary: t("reference.summaries.struct"), operations: [t("reference.summaries.fields"), t("reference.summaries.methods"), t("reference.summaries.instance")], accent: "cyan" }
  ] satisfies readonly {
    readonly name: string;
    readonly summary: string;
    readonly operations: readonly string[];
    readonly accent: Accent;
  }[];
  const rows = [
    ["array", "O(1)", "O(n)", na, na, t("reference.sequenceNote")],
    ["vector", "O(1)", "O(n)", t("reference.vectorInsert"), t("reference.vectorErase"), t("reference.vectorNote")],
    ["stack", na, na, "O(1)", "O(1)", t("reference.adapterNote")],
    ["queue", na, na, "O(1)", "O(1)", t("reference.adapterNote")],
    ["deque", "O(1)", "O(n)", t("reference.endOperation"), t("reference.endOperation"), t("reference.dequeNote")],
    ["set", na, "O(log n)", "O(log n)", "O(log n)", t("reference.orderedNote")],
    ["unordered_set", na, `O(1) ${t("reference.average")} / O(n) ${t("reference.worst")}`, `O(1) ${t("reference.average")} / O(n) ${t("reference.worst")}`, `O(1) ${t("reference.average")} / O(n) ${t("reference.worst")}`, t("reference.hashedNote")],
    ["map", na, "O(log n)", "O(log n)", "O(log n)", t("reference.orderedNote")],
    ["unordered_map", na, `O(1) ${t("reference.average")} / O(n) ${t("reference.worst")}`, `O(1) ${t("reference.average")} / O(n) ${t("reference.worst")}`, `O(1) ${t("reference.average")} / O(n) ${t("reference.worst")}`, t("reference.hashedNote")]
  ] as const;

  return (
    <section id="reference" className="scroll-mt-20 border-t border-zinc-800 py-16 sm:py-20">
      <p className="font-mono text-[10px] font-semibold uppercase tracking-[0.16em] text-violet-300">
        {t("reference.eyebrow")}
      </p>
      <h2 className="mt-3 text-3xl font-semibold tracking-[-0.035em] text-zinc-50 sm:text-4xl">
        {t("reference.title")}
      </h2>
      <p className="mt-4 max-w-3xl leading-7 text-zinc-400">{t("reference.description")}</p>
      <section className="mt-8" aria-labelledby="container-summary-title">
        <h3 id="container-summary-title" className="text-xl font-semibold text-zinc-100">
          {t("reference.summaryTitle")}
        </h3>
        <p className="mt-2 max-w-3xl text-sm leading-6 text-zinc-400">{t("reference.summaryDescription")}</p>
        <div className="mt-5 grid gap-4 sm:grid-cols-2">
          {summaries.map((item) => {
            const accent = accentStyles[item.accent];
            return (
              <article key={item.name} className={cn("rounded-xl border bg-zinc-950/45 p-5", accent.edge)}>
                <h4 className={cn("font-mono text-sm font-semibold", accent.text)}>{item.name}</h4>
                <p className="mt-3 text-sm leading-6 text-zinc-400">{item.summary}</p>
                <div className="mt-4 flex flex-wrap gap-2" aria-label={t("reference.commonOperations", { container: item.name })}>
                  {item.operations.map((operation) => (
                    <code key={operation} className="rounded-md border border-zinc-700 bg-zinc-900 px-2 py-1 text-[11px] text-zinc-300">
                      {operation}
                    </code>
                  ))}
                </div>
              </article>
            );
          })}
        </div>
        <p className="mt-4 text-xs leading-5 text-zinc-500">{t("reference.orderedOnly")}</p>
      </section>
      <h3 className="mt-10 text-xl font-semibold text-zinc-100">{t("reference.complexityTitle")}</h3>
      <div className="mt-8 max-w-full overflow-x-auto rounded-lg border border-zinc-800">
        <table className="min-w-[58rem] border-collapse text-left text-xs">
          <thead className="bg-zinc-900 text-zinc-400">
            <tr>
              {[t("reference.container"), t("reference.access"), t("reference.search"), t("reference.insert"), t("reference.erase"), t("reference.note")].map((heading) => (
                <th key={heading} className="border-b border-zinc-700 px-4 py-3 font-mono font-medium">{heading}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {rows.map(([container, access, search, insert, erase, note]) => (
              <tr key={container} className="border-b border-zinc-800 bg-zinc-950/40 last:border-b-0">
                <th scope="row" className="px-4 py-3 font-mono font-semibold text-cyan-300">{container}</th>
                <td className="px-4 py-3 font-mono text-zinc-300">{access}</td>
                <td className="px-4 py-3 font-mono text-zinc-300">{search}</td>
                <td className="px-4 py-3 font-mono text-zinc-300">{insert}</td>
                <td className="px-4 py-3 font-mono text-zinc-300">{erase}</td>
                <td className="px-4 py-3 text-zinc-400">{note}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </section>
  );
}
