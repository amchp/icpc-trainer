import { LEARNING_GUIDE_IDS, LEARNING_PROGRESS_STATUSES } from "@icpc-trainer/shared";
import { useAuth } from "@clerk/clerk-react";
import { Link } from "@tanstack/react-router";
import { Check, ChevronLeft, ExternalLink, RotateCcw } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { useTranslation } from "react-i18next";

import { appPaths } from "./appNavigation.js";
import { Button } from "./components/ui.js";
import "./i18n/registerBruteForceResources.js";
import { cn } from "./lib.js";
import { AliceMoveSimulator, KitchenPermutationExplorer, SignDecisionExplorer, SimpleSimulationDemo } from "./learning/BruteForceExplorers.js";
import { BruteForceGuideCodeBlock } from "./learning/BruteForceGuideCodeBlock.js";
import { useBruteForceGuideTraces } from "./learning/BruteForceGuideTraces.js";
import { GuideSidebar } from "./learning/GuideSidebar.js";
import { ProblemFirstChallenge } from "./learning/ProblemFirstChallenge.js";
import { SudokuStrategySimulator } from "./learning/SudokuStrategySimulator.js";
import { useToaster } from "./Toaster.js";
import { useLearningProgress, useSetLearningProgressStatus, useStartLearningGuide } from "./useLearningProgress.js";

const GUIDE_ID = LEARNING_GUIDE_IDS.BruteForce;
type SectionAccent = "text-orange-300" | "text-cyan-300" | "text-violet-300" | "text-emerald-300";

export function BruteForcePage(): React.JSX.Element {
  const { t } = useTranslation("bruteForce");
  const { userId } = useAuth();
  const traces = useBruteForceGuideTraces();
  const sections = [
    ["bounds", t("sections.budget")],
    ["simulation", t("sections.simulate")],
    ["permutations", t("sections.permutations")],
    ["subsets", t("sections.subsets")],
    ["backtracking", t("sections.backtracking")],
    ["practice", t("sections.practice")]
  ] as const;
  const progressQuery = useLearningProgress();
  const startGuide = useStartLearningGuide();
  const setStatus = useSetLearningProgressStatus();
  const toaster = useToaster();
  const startedForUser = useRef<string | null>(null);
  const progress = progressQuery.data?.find((row) => row.guideId === GUIDE_ID);
  const completed = progress?.status === LEARNING_PROGRESS_STATUSES.Completed;
  const [activeSection, setActiveSection] = useState<string>(sections[0][0]);

  useEffect(() => {
    if (userId === null || userId === undefined || startedForUser.current === userId) return;
    startedForUser.current = userId;
    startGuide.mutate(GUIDE_ID, {
      onError: () => toaster.error({ title: t("progress.saveError"), description: t("progress.saveErrorDescription") })
    });
  }, [startGuide, t, toaster, userId]);

  useEffect(() => {
    const observer = new IntersectionObserver((entries) => {
      const visible = entries.filter((entry) => entry.isIntersecting).sort((a, b) => b.intersectionRatio - a.intersectionRatio)[0];
      if (visible?.target.id) setActiveSection(visible.target.id);
    }, { rootMargin: "-20% 0px -65%", threshold: [0, .25, .6] });
    for (const [id] of sections) {
      const element = document.getElementById(id);
      if (element) observer.observe(element);
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
    constraintsLabel: t("challenge.constraints"),
    sampleLabel: t("challenge.sample"),
    sourceLabel: t("challenge.source"),
    problemStageLabel: t("challenge.problemStage"),
    attemptPrompt: t("challenge.attempt"),
    attemptStageLabel: t("challenge.attemptStage"),
    revealLabel: t("challenge.reveal"),
    hideLabel: t("challenge.hide"),
    applicationPrompt: t("challenge.applicationPrompt"),
    applicationRevealLabel: t("challenge.applicationReveal"),
    applicationHideLabel: t("challenge.applicationHide"),
    toolStageLabel: t("challenge.toolStage"),
    applicationStageLabel: t("challenge.applicationStage")
  } as const;

  return (
    <main className="overflow-x-clip pb-24 text-zinc-200">
      <header className="relative mx-auto max-w-5xl px-5 pb-12 pt-10 sm:px-8 sm:pb-16 sm:pt-16">
        <Link to={appPaths.resources} className="relative inline-flex items-center gap-2 text-sm text-zinc-400 transition-colors hover:text-zinc-100">
          <ChevronLeft className="size-4" aria-hidden="true" /> {t("roadmap")}
        </Link>
        <div className="relative mt-12 grid gap-8 lg:grid-cols-[1fr_16rem] lg:items-end">
          <div>
            <p className="guide-rise font-mono text-xs font-semibold uppercase tracking-[0.18em] text-orange-400">{t("eyebrow")}</p>
            <h1 className="guide-rise mt-4 max-w-3xl text-4xl font-semibold tracking-[-0.05em] text-zinc-50 [animation-delay:80ms] sm:text-6xl">
              {t("title")}
            </h1>
            <p className="guide-rise mt-6 max-w-2xl text-lg leading-8 text-zinc-400 [animation-delay:160ms]">{t("subtitle")}</p>
          </div>
          <div className="guide-rise border-l border-orange-400/60 pl-5 text-sm leading-6 text-zinc-400 [animation-delay:240ms]">
            <strong className="block text-zinc-100">{t("heroNoteTitle")}</strong>
            {t("heroNote")}
          </div>
        </div>
        <div className="mt-14 grid grid-cols-2 gap-x-6 gap-y-4 sm:grid-cols-4" aria-label={t("conceptsLabel")}>
          <ConceptStripe color="bg-orange-400" label={t("concepts.count")} delay="0ms" />
          <ConceptStripe color="bg-cyan-400" label={t("concepts.simulate")} delay="90ms" />
          <ConceptStripe color="bg-violet-400" label={t("concepts.generate")} delay="180ms" />
          <ConceptStripe color="bg-emerald-400" label={t("concepts.undo")} delay="270ms" />
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
          <GuideSection id="bounds" accent="text-orange-300" title={t("sections.budget")}>
            <p>{t("bounds.p1")}</p>
            <p>{t("bounds.p2")}</p>
            <SmallBoundsCue />
          </GuideSection>

          <GuideSection id="simulation" accent="text-cyan-300" title={t("sections.simulate")}>
            <ProblemFirstChallenge
              accent="cyan"
              {...challengeLabels}
              eyebrow={t("alice.eyebrow")}
              title={t("alice.title")}
              description={t("alice.description")}
              constraints={t("alice.constraints")}
              sample={t("alice.sample")}
              sourceUrl="https://codeforces.com/problemset/problem/2028/A"
              toolTitle={t("alice.toolTitle")}
              applicationTitle={t("alice.applicationTitle")}
              application={(
                <>
                  <p>{t("alice.application")}</p>
                  <AliceMoveSimulator />
                  <p>{t("alice.why")}</p>
                  <ComplexityNote>{t("alice.complexity")}</ComplexityNote>
                </>
              )}
            >
              <p>{t("alice.toolExplanation")}</p>
              <SimulationRecipe />
              <SimpleSimulationDemo />
            </ProblemFirstChallenge>
          </GuideSection>

          <GuideSection id="permutations" accent="text-violet-300" title={t("sections.permutations")}>
            <ProblemFirstChallenge
              accent="violet"
              {...challengeLabels}
              eyebrow={t("kitchen.eyebrow")}
              title={t("kitchen.title")}
              description={t("kitchen.description")}
              constraints={t("kitchen.constraints")}
              sample={t("kitchen.sample")}
              sourceUrl="https://codeforces.com/gym/102219/problem/J"
              toolTitle={t("kitchen.toolTitle")}
              applicationTitle={t("kitchen.applicationTitle")}
              application={(
                <>
                  <p>{t("kitchen.application")}</p>
                  <KitchenPermutationExplorer />
                  <p>{t("kitchen.why")}</p>
                  <ComplexityNote>{t("kitchen.complexity")}</ComplexityNote>
                </>
              )}
            >
              <p>{t("kitchen.toolExplanation")}</p>
              <PermutationSet />
              <MethodLabel marker="↳" title={t("kitchen.recursiveTitle")} />
              <BruteForceGuideCodeBlock trace={traces.recursivePermutation} />
              <MethodLabel marker="++" title={t("kitchen.iterativeTitle")} />
              <BruteForceGuideCodeBlock trace={traces.iterativePermutation} />
              <PermutationOrderTable />
              <p>{t("kitchen.comparison")}</p>
            </ProblemFirstChallenge>
          </GuideSection>

          <GuideSection id="subsets" accent="text-violet-300" title={t("sections.subsets")}>
            <ProblemFirstChallenge
              accent="violet"
              {...challengeLabels}
              eyebrow={t("sakurako.eyebrow")}
              title={t("sakurako.title")}
              description={t("sakurako.description")}
              constraints={t("sakurako.constraints")}
              sample={t("sakurako.sample")}
              sourceUrl="https://codeforces.com/problemset/problem/2008/A"
              toolTitle={t("sakurako.toolTitle")}
              applicationTitle={t("sakurako.applicationTitle")}
              application={(
                <>
                  <p>{t("sakurako.application")}</p>
                  <SignDecisionExplorer />
                  <p>{t("sakurako.why")}</p>
                  <ComplexityNote>{t("sakurako.complexity")}</ComplexityNote>
                </>
              )}
            >
              <p>{t("sakurako.toolExplanation")}</p>
              <MethodLabel marker="↳" title={t("sakurako.recursiveTitle")} />
              <BruteForceGuideCodeBlock trace={traces.recursiveSubset} />
              <MethodLabel marker="01" title={t("sakurako.bitmaskTitle")} />
              <BruteForceGuideCodeBlock trace={traces.bitmaskSubset} />
              <BitmaskDecisionTable />
            </ProblemFirstChallenge>
          </GuideSection>

          <GuideSection id="backtracking" accent="text-emerald-300" title={t("sections.backtracking")}>
            <ProblemFirstChallenge
              accent="emerald"
              {...challengeLabels}
              eyebrow={t("sudoku.eyebrow")}
              title={t("sudoku.title")}
              description={t("sudoku.description")}
              constraints={t("sudoku.constraints")}
              sample={t("sudoku.sample")}
              sourceUrl="https://leetcode.com/problems/sudoku-solver/"
              toolTitle={t("sudoku.toolTitle")}
              applicationTitle={t("sudoku.applicationTitle")}
              application={(
                <>
                  <p>{t("sudoku.application")}</p>
                  <SudokuStrategySimulator copy={{
                    label: t("sudoku.simulator.label"),
                    description: t("sudoku.simulator.description"),
                    searchRule: t("sudoku.simulator.searchRule"),
                    play: t("sudoku.simulator.play"),
                    pause: t("sudoku.simulator.pause"),
                    next: t("sudoku.simulator.next"),
                    nextBacktrack: t("sudoku.simulator.nextBacktrack"),
                    reset: t("sudoku.simulator.reset"),
                    complete: t("sudoku.simulator.complete"),
                    progress: t("sudoku.simulator.progress"),
                    start: t("sudoku.simulator.start"),
                    rejected: t("sudoku.simulator.rejected"),
                    placed: t("sudoku.simulator.placed"),
                    undone: t("sudoku.simulator.undone"),
                    solved: t("sudoku.simulator.solved"),
                    candidateLabel: t("sudoku.simulator.candidateLabel"),
                    counters: {
                      tested: t("sudoku.simulator.counters.tested"),
                      rejected: t("sudoku.simulator.counters.rejected"),
                      backtracked: t("sudoku.simulator.counters.backtracked")
                    },
                    reducedMotion: t("sudoku.simulator.reducedMotion"),
                    fixedCell: t("sudoku.simulator.fixedCell"),
                    tentativeCell: t("sudoku.simulator.tentativeCell"),
                    rejectedCell: t("sudoku.simulator.rejectedCell"),
                    backtrackedCell: t("sudoku.simulator.backtrackedCell"),
                    emptyCell: t("sudoku.simulator.emptyCell")
                  }} />
                  <p className="border-l-2 border-emerald-400/60 pl-4 text-sm text-emerald-100">{t("sudoku.focus")}</p>
                  <ComplexityNote>{t("sudoku.complexity")}</ComplexityNote>
                </>
              )}
            >
              <p>{t("sudoku.toolExplanation")}</p>
              <BacktrackingSketch />
            </ProblemFirstChallenge>
          </GuideSection>

          <GuideSection id="practice" accent="text-orange-300" title={t("sections.practice")}>
            <ol className="divide-y divide-zinc-800 overflow-hidden rounded-xl border border-zinc-800 bg-zinc-950/65">
              <PracticeLink number="01" title={t("practice.string")} url="https://codeforces.com/problemset/problem/23/A" />
              <PracticeLink number="02" title={t("practice.chocolate")} url="https://codeforces.com/gym/105164/problem/C" />
              <PracticeLink number="03" title={t("practice.barbells")} url="https://open.kattis.com/problems/barbells" />
            </ol>
          </GuideSection>

          <section className="mt-20 border-t border-zinc-700 pt-10" aria-labelledby="brute-force-finish-title">
            <p className="font-mono text-xs uppercase tracking-[0.18em] text-orange-400">{t("finish.eyebrow")}</p>
            <h2 id="brute-force-finish-title" className="mt-3 text-3xl font-semibold tracking-tight text-zinc-50">{t("finish.title")}</h2>
            <p className="mt-4 max-w-2xl leading-7 text-zinc-400">{t("finish.description")}</p>
            <div className="mt-8 flex flex-wrap items-center gap-4">
              <Button type="button" disabled={setStatus.isPending} onClick={changeStatus}>
                {completed ? <RotateCcw className="size-4" aria-hidden="true" /> : <Check className="size-4" aria-hidden="true" />}
                {completed ? t("finish.markProgress") : t("finish.markComplete")}
              </Button>
              <Link to={appPaths.resources} className="text-sm font-medium text-zinc-300 underline decoration-zinc-600 underline-offset-4 hover:text-white">{t("finish.back")}</Link>
            </div>
          </section>
        </div>
      </div>
    </main>
  );
}

function GuideSection({ id, title, accent, children }: { readonly id: string; readonly title: string; readonly accent: SectionAccent; readonly children: React.ReactNode }): React.JSX.Element {
  return (
    <section id={id} className="scroll-mt-20 border-t border-zinc-800 py-16 sm:py-20">
      <div className="min-w-0 max-w-5xl">
        <h2 className={cn("mb-8 text-3xl font-semibold tracking-tight sm:text-4xl", accent)}>{title}</h2>
        <div className="guide-copy space-y-5 text-base leading-8 text-zinc-300">{children}</div>
      </div>
    </section>
  );
}

function ConceptStripe({ color, label, delay }: { readonly color: string; readonly label: string; readonly delay: string }): React.JSX.Element {
  return <div><span className={cn("guide-grow block h-1.5 rounded-sm", color)} style={{ animationDelay: delay }} /><span className="mt-2 block font-mono text-[10px] uppercase tracking-wide text-zinc-500">{label}</span></div>;
}

function MethodLabel({ marker, title }: { readonly marker: string; readonly title: string }): React.JSX.Element {
  return <h5 className="!mt-10 flex items-center gap-3 text-base font-semibold text-zinc-100"><span className="grid size-8 shrink-0 place-items-center rounded-md border border-violet-400/40 font-mono text-xs text-violet-300">{marker}</span>{title}</h5>;
}

function ComplexityNote({ children }: { readonly children: React.ReactNode }): React.JSX.Element {
  return <p className="rounded-md border border-zinc-800 bg-zinc-900/55 px-4 py-3 font-mono text-xs leading-6 text-zinc-300">{children}</p>;
}

function SmallBoundsCue(): React.JSX.Element {
  const { t } = useTranslation("bruteForce");
  return (
    <figure className="my-7 overflow-hidden rounded-xl border border-orange-400/25 bg-orange-400/[0.035]">
      <figcaption className="border-b border-zinc-800 px-5 py-4 font-mono text-[10px] uppercase tracking-[0.16em] text-orange-300">{t("bounds.cue.label")}</figcaption>
      <div className="grid gap-px bg-zinc-800 sm:grid-cols-[1fr_auto_1fr] sm:items-stretch">
        <div className="bg-zinc-950 p-5">
          <span className="font-mono text-3xl font-semibold text-zinc-50">n ≤ 10</span>
          <p className="mt-2 text-sm leading-6 text-zinc-400">{t("bounds.cue.constraint")}</p>
        </div>
        <div className="grid place-items-center bg-zinc-950 px-5 py-3 font-mono text-xl text-orange-300" aria-hidden="true">→</div>
        <div className="bg-zinc-950 p-5">
          <strong className="text-base text-orange-100">{t("bounds.cue.question")}</strong>
          <p className="mt-2 text-sm leading-6 text-zinc-400">{t("bounds.cue.answer")}</p>
        </div>
      </div>
    </figure>
  );
}

function SimulationRecipe(): React.JSX.Element {
  const { t } = useTranslation("bruteForce");
  return (
    <ol className="my-7 grid gap-px overflow-hidden rounded-lg border border-cyan-400/20 bg-zinc-800 sm:grid-cols-3">
      {(["state", "transition", "observation"] as const).map((key, index) => (
        <li key={key} className="bg-zinc-950 p-4">
          <span className="font-mono text-[10px] text-cyan-300">0{index + 1}</span>
          <strong className="mt-2 block text-sm text-zinc-100">{t(`alice.recipe.${key}.title`)}</strong>
          <span className="mt-1 block text-xs leading-5 text-zinc-400">{t(`alice.recipe.${key}.description`)}</span>
        </li>
      ))}
    </ol>
  );
}

function PermutationSet(): React.JSX.Element {
  const { t } = useTranslation("bruteForce");
  return (
    <figure className="my-7 rounded-lg border border-violet-400/20 bg-violet-400/[0.04] p-5">
      <figcaption className="font-mono text-[10px] uppercase tracking-[0.16em] text-violet-300">{t("kitchen.setLabel")}</figcaption>
      <p className="mt-3 text-sm leading-6 text-zinc-300">{t("kitchen.setExplanation")}</p>
      <div className="mt-4 grid grid-cols-3 gap-2 sm:grid-cols-6">
        {["ABC", "ACB", "BAC", "BCA", "CAB", "CBA"].map((value) => <span key={value} className="border border-zinc-700 bg-zinc-950 px-2 py-2 text-center font-mono text-xs text-violet-200">{value}</span>)}
      </div>
    </figure>
  );
}

function PermutationOrderTable(): React.JSX.Element {
  const { t } = useTranslation("bruteForce");
  const rows = [["ABC", "ACB"], ["ACB", "BAC"], ["BAC", "BCA"], ["BCA", "CAB"], ["CAB", "CBA"], ["CBA", "—"]];
  return (
    <figure className="my-8 overflow-hidden rounded-lg border border-zinc-800">
      <figcaption className="bg-zinc-900/70 px-4 py-3 font-mono text-[10px] uppercase tracking-[0.16em] text-violet-300">{t("kitchen.orderTable.title")}</figcaption>
      <p className="border-b border-zinc-800 px-4 py-3 text-sm leading-6 text-zinc-400">{t("kitchen.orderTable.description")}</p>
      <table className="w-full text-left text-sm">
        <thead><tr className="border-b border-zinc-800 text-zinc-500"><th className="px-4 py-2 font-medium">{t("kitchen.orderTable.current")}</th><th className="px-4 py-2 font-medium">{t("kitchen.orderTable.next")}</th></tr></thead>
        <tbody>{rows.map(([current, next]) => <tr key={current} className="border-b border-zinc-900 font-mono"><td className="px-4 py-2 text-zinc-200">{current}</td><td className="px-4 py-2 text-violet-200">{next}</td></tr>)}</tbody>
      </table>
    </figure>
  );
}

function BitmaskDecisionTable(): React.JSX.Element {
  const { t } = useTranslation("bruteForce");
  return (
    <figure className="my-8 overflow-hidden rounded-lg border border-zinc-800">
      <figcaption className="bg-zinc-900/70 px-4 py-3 font-mono text-[10px] uppercase tracking-[0.16em] text-violet-300">{t("sakurako.maskTable.title")}</figcaption>
      <p className="border-b border-zinc-800 px-4 py-3 text-sm leading-6 text-zinc-400">{t("sakurako.maskTable.description")}</p>
      <div className="grid grid-cols-4 gap-px bg-zinc-800 sm:grid-cols-8">
        {Array.from({ length: 8 }, (_, mask) => (
          <div key={mask} className="bg-zinc-950 p-3 text-center">
            <span className="block font-mono text-[10px] text-zinc-500">{mask}</span>
            <strong className="mt-1 block font-mono text-xs text-violet-200">{mask.toString(2).padStart(3, "0")}</strong>
          </div>
        ))}
      </div>
    </figure>
  );
}

function BacktrackingSketch(): React.JSX.Element {
  const { t } = useTranslation("bruteForce");
  return (
    <figure className="my-7 overflow-x-auto rounded-lg border border-emerald-400/20 bg-emerald-400/[0.04] p-5">
      <figcaption className="font-mono text-[10px] uppercase tracking-[0.16em] text-emerald-300">{t("sudoku.sketchLabel")}</figcaption>
      <div className="mt-5 flex min-w-max items-center gap-2 text-center text-xs">
        <span className="border border-zinc-700 bg-zinc-950 px-3 py-2 text-zinc-200">{t("sudoku.sketch.choose")}</span>
        <span className="text-zinc-600">→</span>
        <span className="border border-rose-400/40 bg-rose-400/10 px-3 py-2 text-rose-200">{t("sudoku.sketch.reject")}</span>
        <span className="text-zinc-600">↩</span>
        <span className="border border-emerald-400/40 bg-emerald-400/10 px-3 py-2 text-emerald-200">{t("sudoku.sketch.accept")}</span>
        <span className="text-zinc-600">→</span>
        <span className="border border-zinc-700 bg-zinc-950 px-3 py-2 text-zinc-200">{t("sudoku.sketch.deeper")}</span>
      </div>
    </figure>
  );
}

function PracticeLink({ number, title, url }: { readonly number: string; readonly title: string; readonly url: string }): React.JSX.Element {
  return (
    <li>
      <a href={url} target="_blank" rel="noreferrer" className="group flex items-center gap-4 px-5 py-4 text-zinc-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-orange-300">
        <span className="font-mono text-[10px] text-orange-300">{number}</span>
        <span className="flex-1 font-semibold group-hover:text-orange-200">{title}</span>
        <ExternalLink className="size-4 text-zinc-500 group-hover:text-orange-300" aria-hidden="true" />
      </a>
    </li>
  );
}
