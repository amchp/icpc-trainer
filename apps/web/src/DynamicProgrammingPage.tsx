import { LEARNING_GUIDE_IDS, LEARNING_PROGRESS_STATUSES } from "@icpc-trainer/shared";
import { useAuth } from "@clerk/clerk-react";
import { Link } from "@tanstack/react-router";
import { ArrowRight, Check, ChevronLeft, ExternalLink, RotateCcw } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { useTranslation } from "react-i18next";

import { appPaths } from "./appNavigation.js";
import { Button } from "./components/ui.js";
import "./i18n/registerDynamicProgrammingResources.js";
import { GuideSidebar } from "./learning/GuideSidebar.js";
import { DagDpPlayer, FibonacciDpPlayer, GridDpPlayer, KnapsackDpPlayer, NonAdjacentDpPlayer } from "./learning/dp/DpInteractions.js";
import { ProblemFirstChallenge } from "./learning/ProblemFirstChallenge.js";
import { useToaster } from "./Toaster.js";
import { useLearningProgress, useSetLearningProgressStatus, useStartLearningGuide } from "./useLearningProgress.js";

const GUIDE_ID = LEARNING_GUIDE_IDS.DynamicProgramming;
const ARCS = ["fibonacci", "nonAdjacent", "grid", "knapsack", "dag"] as const;
type Arc = typeof ARCS[number];

const RECURSION_TREE_LABELS = {
  fibonacci: {
    a: "S6", b: "S5", c: "S4", d: "S3", e: "S2", f: "S1", g: "S0"
  },
  nonAdjacent: {
    a: "i6", b: "i5", c: "i4", d: "i3", e: "i2", f: "i1", g: "i0"
  },
  grid: {
    a: "(a,b)", b: "(c,d)", c: "(e,f)", d: "(g,h)", e: "(j,k)", f: "(p,q)", g: "(u,v)"
  },
  knapsack: {
    a: "A", b: "B", c: "C", d: "D", e: "E", f: "F", g: "G"
  },
  dag: {
    a: "A", b: "B", c: "C", d: "D", e: "E", f: "F", g: "G"
  }
} as const satisfies Record<Arc, Record<StateKey, string>>;

type StateKey = "a" | "b" | "c" | "d" | "e" | "f" | "g";
type TreeMode = "without-memory" | "with-memory";

interface RecursiveTreeNode {
  readonly id: string;
  readonly state: StateKey;
  readonly repeated: boolean;
  readonly children: readonly RecursiveTreeNode[];
}

interface PositionedTreeNode extends RecursiveTreeNode {
  readonly x: number;
  readonly y: number;
}

const STATE_DEPENDENCIES: Readonly<Record<StateKey, readonly StateKey[]>> = {
  a: ["b", "c"],
  b: ["c", "d"],
  c: ["d", "e"],
  d: ["e", "f"],
  e: ["f", "g"],
  f: [],
  g: []
};

function buildRecursionTree(mode: TreeMode): RecursiveTreeNode {
  const seen = new Set<StateKey>();
  const visit = (state: StateKey, id: string): RecursiveTreeNode => {
    const repeated = seen.has(state);
    if (!repeated) seen.add(state);
    return {
      id,
      state,
      repeated,
      children: repeated && mode === "with-memory"
        ? []
        : STATE_DEPENDENCIES[state].map((child, index) => visit(child, `${id}-${index}`))
    };
  };
  return visit("a", "root");
}

function positionRecursionTree(root: RecursiveTreeNode): readonly PositionedTreeNode[] {
  const positioned: PositionedTreeNode[] = [];
  const maxDepth = 6;
  let nextLeaf = 0;
  const leafCount = (node: RecursiveTreeNode): number => node.children.length === 0
    ? 1
    : node.children.reduce((total, child) => total + leafCount(child), 0);
  const totalLeaves = leafCount(root);
  const visit = (node: RecursiveTreeNode, depth: number): number => {
    const childXs = node.children.map((child) => visit(child, depth + 1));
    const x = childXs.length === 0 ? ((nextLeaf++ + 0.5) / totalLeaves) * 100 : childXs.reduce((sum, childX) => sum + childX, 0) / childXs.length;
    positioned.push({ ...node, x, y: 7 + (depth / maxDepth) * 86 });
    return x;
  };
  visit(root, 0);
  return positioned;
}

const SOURCE_URLS: Partial<Record<Arc, string>> = {
  grid: "https://cses.fi/problemset/task/1638",
  knapsack: "https://cses.fi/problemset/task/1158"
};
const ACCENTS = ["emerald", "cyan", "violet", "rose", "rose"] as const;

export function DynamicProgrammingPage(): React.JSX.Element {
  const { t } = useTranslation("dynamicProgramming");
  const { userId } = useAuth();
  const progressQuery = useLearningProgress();
  const startGuide = useStartLearningGuide();
  const setStatus = useSetLearningProgressStatus();
  const toaster = useToaster();
  const startedForUser = useRef<string | null>(null);
  const completed = progressQuery.data?.find(({ guideId }) => guideId === GUIDE_ID)?.status === LEARNING_PROGRESS_STATUSES.Completed;
  const sections = [...ARCS.map((id) => ({ id, label: t(`sections.${id}`) })), { id: "synthesis", label: t("sections.synthesis") }];
  const [activeSection, setActiveSection] = useState<string>(ARCS[0]);

  useEffect(() => {
    if (userId === null || userId === undefined || startedForUser.current === userId) return;
    startedForUser.current = userId;
    startGuide.mutate(GUIDE_ID, { onError: () => toaster.error({ title: t("progress.saveError"), description: t("progress.saveErrorDescription") }) });
  }, [startGuide, t, toaster, userId]);

  useEffect(() => {
    const observer = new IntersectionObserver((entries) => {
      const visible = entries.filter(({ isIntersecting }) => isIntersecting).sort((left, right) => right.intersectionRatio - left.intersectionRatio)[0];
      if (visible?.target.id) setActiveSection(visible.target.id);
    }, { rootMargin: "-20% 0px -65%", threshold: [0, 0.25, 0.6] });
    for (const { id } of sections) {
      const section = document.getElementById(id);
      if (section) observer.observe(section);
    }
    return () => observer.disconnect();
  }, []);

  const changeStatus = (): void => {
    const status = completed ? LEARNING_PROGRESS_STATUSES.InProgress : LEARNING_PROGRESS_STATUSES.Completed;
    setStatus.mutate({ guideId: GUIDE_ID, status }, {
      onSuccess: () => toaster.success({
        title: completed ? t("progress.inProgress") : t("progress.completed"),
        description: completed ? t("progress.inProgressDescription") : t("progress.completedDescription")
      }),
      onError: () => toaster.error({ title: t("progress.updateError"), description: t("progress.updateErrorDescription") })
    });
  };

  const challengeLabels = {
    constraintsLabel: t("challenge.constraints"), sampleLabel: t("challenge.sample"), sourceLabel: t("challenge.source"),
    problemStageLabel: t("challenge.problemStage"), attemptStageLabel: t("challenge.attemptStage"),
    revealLabel: t("challenge.reveal"), hideLabel: t("challenge.hide"),
    applicationRevealLabel: t("challenge.applicationReveal"), applicationHideLabel: t("challenge.applicationHide"),
    toolStageLabel: t("challenge.toolStage"), applicationStageLabel: t("challenge.applicationStage")
  } as const;

  return (
    <main className="min-w-0 overflow-x-clip pb-24 text-zinc-200">
      <header className="mx-auto max-w-6xl px-5 pb-12 pt-10 sm:px-8 sm:pb-16 sm:pt-16">
        <Link to={appPaths.resources} className="inline-flex items-center gap-2 text-sm text-zinc-400 transition-colors hover:text-zinc-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-violet-300">
          <ChevronLeft className="size-4" aria-hidden="true" /> {t("roadmap")}
        </Link>
        <div className="mt-12 grid gap-8 lg:grid-cols-[1fr_18rem] lg:items-end">
          <div>
            <p className="guide-rise font-mono text-xs font-semibold uppercase tracking-[0.18em] text-violet-300">{t("eyebrow")}</p>
            <h1 className="guide-rise mt-4 max-w-4xl text-4xl font-semibold tracking-[-0.05em] text-zinc-50 [animation-delay:80ms] sm:text-6xl">{t("title")}</h1>
            <p className="guide-rise mt-6 max-w-3xl text-lg leading-8 text-zinc-400 [animation-delay:160ms]">{t("subtitle")}</p>
          </div>
          <div className="guide-rise border-l border-violet-300/60 pl-5 text-sm leading-6 text-zinc-400 [animation-delay:240ms]">
            <strong className="block text-zinc-100">{t("heroNoteTitle")}</strong>{t("heroNote")}
          </div>
        </div>
        <div className="mt-14 grid grid-cols-2 gap-x-5 gap-y-4 sm:grid-cols-5" aria-label={t("conceptsLabel")}>
          {(["sequence", "decisions", "board", "budget", "dependencies"] as const).map((concept, index) => (
            <div key={concept}>
              <span className="guide-grow block h-1.5 rounded-sm bg-violet-400" style={{ animationDelay: `${index * 80}ms` }} />
              <span className="mt-2 block font-mono text-[10px] uppercase tracking-wide text-zinc-500">{t(`concepts.${concept}`)}</span>
            </div>
          ))}
        </div>
      </header>

      <div className="mx-auto max-w-7xl px-5 sm:px-8 lg:grid lg:grid-cols-[14rem_minmax(0,1fr)] lg:gap-12">
        <GuideSidebar sections={sections} activeSection={activeSection} label={t("sidebar.label")} progressLabel={(current, total) => t("sidebar.progress", { current, total })} />
        <div className="min-w-0">
          {ARCS.map((arc, index) => (
            <GuideSection key={arc} id={arc} title={t(`sections.${arc}`)}>
              <ProblemFirstChallenge
                accent={ACCENTS[index]}
                {...challengeLabels}
                eyebrow={t(`${arc}.eyebrow`)}
                title={t(`${arc}.title`)}
                description={t(`${arc}.description`)}
                constraints={t(`${arc}.constraints`)}
                sample={t(`${arc}.sample`)}
                attemptPrompt={t(`${arc}.attempt`)}
                {...(SOURCE_URLS[arc] === undefined ? {} : { sourceUrl: SOURCE_URLS[arc] })}
                toolTitle={t(`${arc}.toolTitle`)}
                applicationTitle={t(`${arc}.applicationTitle`)}
                applicationPrompt={t(`${arc}.applicationPrompt`)}
                application={<Application arc={arc} />}
              >
                <p>{t(`${arc}.toolIntro`)}</p>
                {arc === "knapsack" ? <StateCollisionLesson /> : null}
                {arc === "dag" ? <DagAbstractionLesson /> : null}
                {arc === "knapsack" ? null : <MemoizationDiagram arc={arc} />}
                {arc === "fibonacci" ? <RecursiveDpStructure /> : null}
              </ProblemFirstChallenge>
            </GuideSection>
          ))}

          <section id="synthesis" className="scroll-mt-20 border-t border-zinc-700 py-16 sm:py-20" aria-labelledby="dp-synthesis-title">
            <p className="font-mono text-xs uppercase tracking-[0.18em] text-violet-300">{t("synthesis.eyebrow")}</p>
            <h2 id="dp-synthesis-title" className="mt-3 text-3xl font-semibold tracking-tight text-zinc-50 sm:text-4xl">{t("synthesis.title")}</h2>
            <p className="mt-4 max-w-3xl leading-7 text-zinc-400">{t("synthesis.intro")}</p>
            <ol className="mt-8 grid gap-3 sm:grid-cols-2">
              {(["state", "base", "transition", "order", "answer"] as const).map((item, index) => (
                <li key={item} className="rounded-lg border border-zinc-800 bg-zinc-950/60 p-4">
                  <span className="font-mono text-[10px] text-violet-300">{String(index + 1).padStart(2, "0")}</span>
                  <strong className="ml-3 text-sm text-zinc-200">{t(`synthesis.${item}`)}</strong>
                </li>
              ))}
            </ol>
            <p className="mt-8 max-w-3xl rounded-lg border-l-2 border-violet-300 bg-violet-300/[0.05] px-5 py-4 text-sm leading-7 text-zinc-300">{t("synthesis.completion")}</p>
            <div className="mt-8 flex flex-wrap items-center gap-4">
              <Button type="button" disabled={setStatus.isPending} onClick={changeStatus}>{completed ? <RotateCcw className="size-4" aria-hidden="true" /> : <Check className="size-4" aria-hidden="true" />}{completed ? t("synthesis.markProgress") : t("synthesis.markComplete")}</Button>
              <Link to={appPaths.resources} className="text-sm font-medium text-zinc-300 underline decoration-zinc-600 underline-offset-4 hover:text-white">{t("synthesis.back")}</Link>
            </div>
          </section>
        </div>
      </div>
    </main>
  );
}

function StateTransitionLens({ arc }: { readonly arc: Arc }): React.JSX.Element {
  const { t } = useTranslation("dynamicProgramming");
  return (
    <dl className="my-7 grid gap-3 sm:grid-cols-2" data-state-transition-lens={arc}>
      {(["state", "base", "transition", "order", "answer"] as const).map((item) => (
        <div key={item} className="rounded-lg border border-zinc-800 bg-zinc-950/55 p-4 last:sm:col-span-2">
          <dt className="font-mono text-[10px] font-semibold uppercase tracking-[0.16em] text-violet-300">{t(`lens.${item}`)}</dt>
          <dd className="mt-2 text-sm leading-7 text-zinc-300">{t(`${arc}.${item}`)}</dd>
        </div>
      ))}
    </dl>
  );
}

function Application({ arc }: { readonly arc: Arc }): React.JSX.Element {
  const { t } = useTranslation("dynamicProgramming");
  return <>
    <StateTransitionLens arc={arc} />
    <p>{t(`${arc}.application`)}</p>
    <ArcPlayer arc={arc} />
    <ImplementationMission arc={arc} />
    <p className="rounded-lg border-l-2 border-zinc-700 bg-zinc-950/50 px-4 py-3 font-mono text-xs leading-6 text-zinc-300">{t(`${arc}.complexity`)}</p>
    <aside className="rounded-lg border border-amber-400/25 bg-amber-400/[0.04] px-4 py-3 text-sm leading-7 text-amber-100/85">{t(`${arc}.pitfall`)}</aside>
    {arc !== "grid" && arc !== "knapsack" ? null : (
      <a href={SOURCE_URLS[arc]} target="_blank" rel="noreferrer" className="inline-flex items-center gap-2 font-semibold text-violet-200 underline decoration-zinc-600 underline-offset-4">
        {t(`${arc}.solve`)}<ExternalLink className="size-4" aria-hidden="true" />
      </a>
    )}
  </>;
}

function MemoizationDiagram({ arc }: { readonly arc: Arc }): React.JSX.Element {
  const { t } = useTranslation("dynamicProgramming");
  return (
    <section
      data-memoization-diagram={arc}
      aria-label={t("memoization.label", { technique: t(`sections.${arc}`) })}
      className="my-7 overflow-hidden rounded-xl border border-zinc-800 bg-zinc-950/60"
    >
      <div className="border-b border-zinc-800 px-5 py-4">
        <p className="font-mono text-[10px] font-semibold uppercase tracking-[0.16em] text-violet-300">{t("memoization.eyebrow")}</p>
        <h5 className="mt-2 text-lg font-semibold text-zinc-100">{t("memoization.title")}</h5>
        <p className="mt-2 max-w-3xl text-sm leading-6 text-zinc-400">{t(`${arc}.memoWhy`)}</p>
      </div>
      <div className="grid items-stretch gap-px bg-zinc-800">
        <div className="min-w-0 bg-zinc-950/90 p-5">
          <p className="font-mono text-[10px] font-semibold uppercase tracking-[0.14em] text-amber-300">{t("memoization.withoutMemory")}</p>
          <RecursionTree arc={arc} mode="without-memory" />
        </div>
        <div className="flex flex-col items-center justify-center gap-2 bg-zinc-950 px-3 py-5 text-center">
          <span className="font-mono text-[10px] font-semibold uppercase tracking-[0.12em] text-violet-300">{t("memoization.remember")}</span>
          <ArrowRight className="size-5 rotate-90 text-violet-300" aria-hidden="true" />
          <span className="text-xs leading-5 text-zinc-500">{t("memoization.collapse")}</span>
        </div>
        <div className="min-w-0 bg-emerald-400/[0.035] p-5">
          <p className="font-mono text-[10px] font-semibold uppercase tracking-[0.14em] text-emerald-300">{t("memoization.withMemory")}</p>
          <RecursionTree arc={arc} mode="with-memory" />
        </div>
      </div>
      <div className="flex flex-wrap items-center justify-center gap-x-3 gap-y-2 border-t border-zinc-800 bg-zinc-950 px-5 py-4 text-center">
        <span
          data-memo-complexity-before
          aria-label={t("memoization.beforeComplexity", { complexity: t("memoization.genericBefore") })}
          className="font-mono text-xs text-amber-200 line-through decoration-amber-300/70"
        >
          {t("memoization.genericBefore")}
        </span>
        <ArrowRight className="size-4 text-zinc-600" aria-hidden="true" />
        <span
          data-memo-complexity-after
          aria-label={t("memoization.afterComplexity", { complexity: t("memoization.genericAfter") })}
          className="font-mono text-xs font-semibold text-emerald-300"
        >
          {t("memoization.genericAfter")}
        </span>
        <span className="text-sm text-zinc-400">{t("memoization.complexityResult")}</span>
      </div>
    </section>
  );
}

function RecursionTree({ arc, mode }: { readonly arc: Arc; readonly mode: TreeMode }): React.JSX.Element {
  const { t } = useTranslation("dynamicProgramming");
  const labels = RECURSION_TREE_LABELS[arc];
  const tree = buildRecursionTree(mode);
  const nodes = positionRecursionTree(tree);
  const positions = Object.fromEntries(nodes.map(({ id, x, y }) => [id, { x, y }]));
  const edges = nodes.flatMap((node) => node.children.map((child) => ({ from: node.id, to: child.id })));
  const computedCount = nodes.filter(({ repeated }) => !repeated).length;

  return (
    <div className="mt-3 overflow-x-auto pb-2">
      <figure
        data-recursion-tree={mode}
        data-tree-request-count={nodes.length}
        data-tree-computed-count={computedCount}
        aria-label={t(`memoization.${mode === "without-memory" ? "withoutTreeLabel" : "withTreeLabel"}`)}
        className="relative mx-auto h-80 min-w-[32rem]"
      >
        <svg aria-hidden="true" className="absolute inset-0 size-full overflow-visible" viewBox="0 0 100 100" preserveAspectRatio="none">
          {edges.map(({ from, to }) => {
            const start = positions[from];
            const end = positions[to];
            if (start === undefined || end === undefined) return null;
            return (
              <line
                key={`${from}-${to}`}
                data-tree-edge={`${from}:${to}`}
                data-edge-from={from}
                x1={start.x}
                y1={start.y + 3}
                x2={end.x}
                y2={end.y - 3}
                vectorEffect="non-scaling-stroke"
                className={mode === "with-memory" ? "stroke-emerald-900" : "stroke-zinc-700"}
              />
            );
          })}
        </svg>
        {nodes.map(({ id, state, x, y, repeated }) => {
          const memoHit = mode === "with-memory" && repeated;
          const recalculated = mode === "without-memory" && repeated;
          return (
            <span
              key={id}
              data-node-id={id}
              data-tree-node={labels[state]}
              data-recalculated={recalculated}
              data-memo-hit={memoHit}
              style={{ left: `${x}%`, top: `${y}%` }}
              className={[
                "absolute z-10 min-w-8 -translate-x-1/2 -translate-y-1/2 rounded border px-1 py-0.5 text-center font-mono text-[9px] leading-3.5 shadow-[0_0_0_2px_rgba(9,9,11,0.9)]",
                repeated
                  ? "border-amber-300/60 bg-amber-300/10 text-amber-100"
                  : mode === "with-memory"
                    ? "border-emerald-400/45 bg-emerald-400/10 text-emerald-100"
                    : "border-zinc-700 bg-zinc-900 text-zinc-300"
              ].join(" ")}
            >
              <span className="whitespace-nowrap">{labels[state]}</span>
              {repeated ? (
                <span className="block text-[8px] font-semibold text-amber-300">
                  <span aria-hidden="true">{memoHit ? "memo" : "↺"}</span>
                  <span className="sr-only">{memoHit ? t("memoization.memoHit") : t("memoization.recalculated")}</span>
                </span>
              ) : null}
            </span>
          );
        })}
        <figcaption className="sr-only">{t("memoization.treeSavings", { requests: nodes.length, computed: computedCount })}</figcaption>
      </figure>
      <p className={`mt-2 text-center font-mono text-[10px] ${mode === "with-memory" ? "text-emerald-300" : "text-amber-300"}`}>
        {mode === "with-memory"
          ? t("memoization.withMemoryCount", { requests: nodes.length, states: computedCount })
          : t("memoization.withoutMemoryCount", { requests: nodes.length })}
      </p>
    </div>
  );
}

function RecursiveDpStructure(): React.JSX.Element {
  const { t } = useTranslation("dynamicProgramming");
  return (
    <section data-dp-structure="fibonacci" className="my-7 overflow-hidden rounded-xl border border-violet-300/20 bg-violet-300/[0.035]">
      <div className="border-b border-violet-300/15 px-5 py-4">
        <strong className="text-sm text-zinc-100">{t("implementation.structureTitle")}</strong>
        <p className="mt-1 text-xs leading-5 text-zinc-500">{t("implementation.structureIntro")}</p>
      </div>
      <pre data-generic-dp-skeleton aria-label={t("implementation.skeletonLabel")} className="overflow-x-auto p-5 font-mono text-[12px] leading-6 text-zinc-300 sm:text-[13px]"><code><span className="text-violet-200">int go(State state)</span> {"{\n"}<span className="text-amber-200">  if (isBaseCase(state))</span> {"{\n    return baseAnswer(state);\n  }\n\n"}<span className="text-cyan-200">  int&amp; ans = dp[state];</span>{"\n"}<span className="text-emerald-200">  if (ans != UNCOMPUTED) return ans;</span>{"\n\n"}<span className="text-zinc-500">  // {t("implementation.transitionsComment")}</span>{"\n  ans = combineTransitions(state);\n  return ans;\n}"}</code></pre>
      <p className="border-t border-violet-300/15 px-5 py-4 text-sm leading-6 text-zinc-400">{t("implementation.structureNote")}</p>
    </section>
  );
}

function StateCollisionLesson(): React.JSX.Element {
  const { t } = useTranslation("dynamicProgramming");
  return (
    <section data-state-collision-demo="knapsack" className="my-7 overflow-hidden rounded-xl border border-rose-300/20 bg-rose-300/[0.03]">
      <div className="border-b border-rose-300/15 px-5 py-4">
        <p className="font-mono text-[10px] font-semibold uppercase tracking-[0.16em] text-rose-300">{t("knapsack.stateCollision.eyebrow")}</p>
        <h5 className="mt-2 text-lg font-semibold text-zinc-100">{t("knapsack.stateCollision.title")}</h5>
        <p className="mt-2 text-sm leading-6 text-zinc-400">{t("knapsack.stateCollision.intro")}</p>
      </div>
      <div className="grid gap-px bg-zinc-800 sm:grid-cols-[1fr_auto_1fr]">
        <div className="bg-zinc-950 p-4 text-center"><code className="text-sm text-zinc-200">{t("knapsack.stateCollision.caseA")}</code></div>
        <div className="flex items-center justify-center bg-rose-400/[0.04] px-4 py-3 text-center">
          <div><code className="text-rose-200">dp[3]</code><strong className="mt-1 block text-xs text-rose-300">{t("knapsack.stateCollision.wa")}</strong></div>
        </div>
        <div className="bg-zinc-950 p-4 text-center"><code className="text-sm text-zinc-200">{t("knapsack.stateCollision.caseB")}</code></div>
      </div>
      <div className="grid gap-3 border-t border-zinc-800 p-5 sm:grid-cols-2">
        <code className="rounded border border-emerald-400/30 bg-emerald-400/[0.06] px-3 py-2 text-center text-emerald-200">state(3, 4)</code>
        <code className="rounded border border-emerald-400/30 bg-emerald-400/[0.06] px-3 py-2 text-center text-emerald-200">state(3, 1)</code>
        <p className="text-sm leading-6 text-zinc-400 sm:col-span-2">{t("knapsack.stateCollision.conclusion")}</p>
      </div>
    </section>
  );
}

function DagAbstractionLesson(): React.JSX.Element {
  const { t } = useTranslation("dynamicProgramming");
  return (
    <section data-dp-dag-abstraction className="my-7 rounded-xl border border-cyan-300/20 bg-cyan-300/[0.03] p-5">
      <p className="text-sm leading-6 text-zinc-300">{t("dag.abstraction.intro")}</p>
      <div className="mt-4 grid gap-3 sm:grid-cols-3">
        {(["state", "transition", "acyclic"] as const).map((concept, index) => (
          <div key={concept} className="rounded-lg border border-zinc-800 bg-zinc-950/70 p-4">
            <span className="font-mono text-[10px] text-cyan-300">0{index + 1}</span>
            <strong className="mt-2 block text-sm text-zinc-100">{t(`dag.abstraction.${concept}.title`)}</strong>
            <p className="mt-1 text-xs leading-5 text-zinc-500">{t(`dag.abstraction.${concept}.description`)}</p>
          </div>
        ))}
      </div>
      <p className="mt-4 border-l-2 border-cyan-300/40 pl-4 text-sm leading-6 text-cyan-100/80">{t("dag.abstraction.order")}</p>
    </section>
  );
}

function ImplementationMission({ arc }: { readonly arc: Arc }): React.JSX.Element {
  const { t } = useTranslation("dynamicProgramming");
  return (
    <section data-implementation-mission={arc} className="rounded-xl border border-emerald-400/25 bg-emerald-400/[0.04] p-5">
      <p className="font-mono text-[10px] font-semibold uppercase tracking-[0.16em] text-emerald-300">{t("implementation.eyebrow")}</p>
      <h5 className="mt-2 text-lg font-semibold text-zinc-100">{t("implementation.title")}</h5>
      <p className="mt-2 text-sm leading-6 text-zinc-300">{t(`${arc}.implementationTask`)}</p>
      <div className="mt-5 border-t border-emerald-400/15 pt-4">
        <strong className="text-sm text-emerald-100">{t("implementation.coachTitle")}</strong>
        <p className="mt-1 text-sm leading-6 text-emerald-100/80">{t("implementation.coach")}</p>
      </div>
    </section>
  );
}

function ArcPlayer({ arc }: { readonly arc: Arc }): React.JSX.Element {
  if (arc === "fibonacci") return <FibonacciDpPlayer />;
  if (arc === "nonAdjacent") return <NonAdjacentDpPlayer />;
  if (arc === "grid") return <GridDpPlayer />;
  if (arc === "knapsack") return <KnapsackDpPlayer />;
  return <DagDpPlayer />;
}

function GuideSection({ id, title, children }: { readonly id: string; readonly title: string; readonly children: React.ReactNode }): React.JSX.Element {
  return <section id={id} className="scroll-mt-20 border-t border-zinc-800 py-16 sm:py-20"><div className="min-w-0 max-w-5xl"><h2 className="mb-8 text-3xl font-semibold tracking-tight text-violet-200 sm:text-4xl">{title}</h2><div className="guide-copy space-y-5 text-base leading-8 text-zinc-300">{children}</div></div></section>;
}
