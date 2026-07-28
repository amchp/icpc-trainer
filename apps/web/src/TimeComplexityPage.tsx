import { LEARNING_GUIDE_IDS, LEARNING_PROGRESS_STATUSES } from "@icpc-trainer/shared";
import { useAuth } from "@clerk/clerk-react";
import { Link } from "@tanstack/react-router";
import { Check, ChevronLeft, RotateCcw } from "lucide-react";
import { useEffect, useRef, useState, type ReactNode } from "react";
import { useTranslation } from "react-i18next";

import { appPaths } from "./appNavigation.js";
import { Button } from "./components/ui.js";
import { cn } from "./lib.js";
import { GuideCodeBlock } from "./learning/GuideCodeBlock.js";
import {
  ComplexityCurveChart,
  ComplexityGrowthMeters,
  ExactCountWorksheet,
  LocalLinearBenchmark,
  MemoryAllocationLab,
  MemoryModelExplorer,
  RuntimeEstimator
} from "./learning/complexity/ComplexityInteractions.js";
import { LinearithmicBigOFormula, QuadraticBigOFormula } from "./learning/complexity/MathFormula.js";
import { GuideSidebar } from "./learning/GuideSidebar.js";
import { PracticeQuestionSet } from "./learning/PracticeQuestionSet.js";
import { getTimeComplexitySnippets } from "./learning/snippets/timeComplexitySnippets.js";
import type { TimeComplexitySnippets } from "./learning/snippets/timeComplexitySnippets.types.js";
import { useLearningProgress, useSetLearningProgressStatus, useStartLearningGuide } from "./useLearningProgress.js";
import { useToaster } from "./Toaster.js";

const GUIDE_ID = LEARNING_GUIDE_IDS.TimeComplexity;

export function TimeComplexityPage(): React.JSX.Element {
  const { t, i18n } = useTranslation("timeComplexity");
  const { userId } = useAuth();
  const snippets = getTimeComplexitySnippets(i18n.resolvedLanguage ?? i18n.language);
  const sections = [
    ["count", t("sections.count")],
    ["notation", t("sections.notation")],
    ["memory", t("sections.memory")],
    ["compare", t("sections.compare")],
    ["tricks", t("sections.tricks")],
    ["recursion", t("sections.recursion")],
    ["growth", t("sections.growth")],
    ["budget", t("sections.budget")],
    ["benchmark", t("sections.benchmark")]
  ] as const;
  const progressQuery = useLearningProgress();
  const startGuide = useStartLearningGuide();
  const setStatus = useSetLearningProgressStatus();
  const toaster = useToaster();
  const startedForUser = useRef<string | null>(null);
  const progress = progressQuery.data?.find((row) => row.guideId === GUIDE_ID);
  const completed = progress?.status === LEARNING_PROGRESS_STATUSES.Completed;
  const [activeSection, setActiveSection] = useState<string>(sections[0][0]);
  const [inputSize, setInputSize] = useState(5);

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
    }, { rootMargin: "-20% 0px -65%", threshold: [0, 0.25, 0.6] });
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

  return (
    <main className="pb-24 text-zinc-200">
      <header className="relative overflow-hidden border-b border-zinc-800">
        <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_75%_20%,rgba(139,92,246,0.16),transparent_34rem)]" />
        <div className="relative mx-auto max-w-5xl px-5 pb-14 pt-10 sm:px-8 sm:pb-20 sm:pt-16">
          <Link to={appPaths.resources} className="inline-flex items-center gap-2 text-sm text-zinc-400 transition-colors hover:text-zinc-100">
            <ChevronLeft className="size-4" aria-hidden="true" /> {t("roadmap")}
          </Link>
          <p className="guide-rise mt-14 font-mono text-xs font-semibold uppercase tracking-[0.18em] text-violet-400">{t("eyebrow")}</p>
          <h1 className="guide-rise mt-4 max-w-4xl text-4xl font-semibold tracking-[-0.045em] text-zinc-50 [animation-delay:80ms] sm:text-6xl">{t("title")}</h1>
          <p className="guide-rise mt-6 max-w-3xl text-lg leading-8 text-zinc-400 [animation-delay:160ms]">{t("subtitle")}</p>
          <p className="guide-rise mt-12 border-l-2 border-violet-400 pl-5 text-2xl font-semibold tracking-tight text-violet-100 [animation-delay:240ms] sm:text-3xl">{t("heroQuestion")}</p>
        </div>
      </header>

      <div className="mx-auto max-w-7xl px-5 sm:px-8 lg:grid lg:grid-cols-[14rem_minmax(0,1fr)] lg:gap-12">
        <GuideSidebar sections={sections.map(([id, label]) => ({ id, label }))} activeSection={activeSection} label={t("sidebar.label")} progressLabel={(current, total) => t("sidebar.progress", { current, total })} />
        <div className="min-w-0">
          <GuideSection id="count" accent="text-cyan-300" title={t("count.title")}>
            <SearchScalingBrief />
            <p>{t("count.p1")}</p>
            <p>{t("count.p2")}</p>
            <ExactCountWorksheet />
          </GuideSection>

          <GuideSection id="notation" accent="text-violet-300" title={t("notation.title")}>
            <p>{t("notation.p1")}</p>
            <BigOIntroduction />
            <p>{t("notation.p2")}</p>
            <p>{t("notation.p3")}</p>
            <div className="my-8 grid gap-3 sm:grid-cols-2">
              <QuadraticBigOFormula label={t("notation.quadraticFormulaLabel")} />
              <LinearithmicBigOFormula label={t("notation.linearithmicFormulaLabel")} />
            </div>
            <ComplexityCurveChart />
            <OneSecondTable />
          </GuideSection>

          <GuideSection id="memory" accent="text-amber-300" title={t("memory.title")}>
            <p>{t("memory.p1")}</p>
            <p>{t("memory.p2")}</p>
            <MemoryAllocationLab n={inputSize} onNChange={setInputSize} />
            <MemoryModelExplorer n={inputSize} onNChange={setInputSize} />
            <MemoryQuestions snippets={snippets} />
          </GuideSection>

          <GuideSection id="compare" accent="text-blue-300" title={t("compare.title")}>
            <p>{t("compare.p1")}</p>
            <ConstraintInvestigation snippets={snippets} />
          </GuideSection>

          <GuideSection id="tricks" accent="text-cyan-300" title={t("tricks.title")}>
            <p>{t("tricks.p1")}</p>
            <LoopCountingTricks snippets={snippets} />
          </GuideSection>

          <GuideSection id="recursion" accent="text-rose-300" title={t("recursion.title")}>
            <p>{t("recursion.p1")}</p>
            <RecursionCountingGuide snippets={snippets} />
          </GuideSection>

          <GuideSection id="growth" accent="text-fuchsia-300" title={t("growth.title")}>
            <p>{t("growth.p1")}</p>
            <ComplexityGrowthMeters n={inputSize} onNChange={setInputSize} />
          </GuideSection>

          <GuideSection id="budget" accent="text-amber-300" title={t("budget.title")}>
            <p>{t("budget.p1")}</p>
            <RuntimeCalculationWalkthrough />
            <RuntimeEstimator n={inputSize} onNChange={setInputSize} />
          </GuideSection>

          <GuideSection id="benchmark" accent="text-emerald-300" title={t("benchmark.title")}>
            <p>{t("benchmark.p1")}</p>
            <LocalLinearBenchmark />
          </GuideSection>

          <section className="mt-20 border-t border-zinc-700 pt-10" aria-labelledby="complexity-finish-title">
            <p className="font-mono text-xs uppercase tracking-[0.18em] text-violet-400">{t("finish.eyebrow")}</p>
            <h2 id="complexity-finish-title" className="mt-3 text-3xl font-semibold tracking-tight text-zinc-50">{t("finish.title")}</h2>
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

function GuideSection({ id, title, accent, children }: { readonly id: string; readonly title: string; readonly accent: string; readonly children: ReactNode }): React.JSX.Element {
  return <section id={id} className="scroll-mt-20 border-t border-zinc-800 py-16 sm:py-20"><div className="min-w-0 max-w-4xl"><h2 className={cn("mb-8 text-3xl font-semibold tracking-tight sm:text-4xl", accent)}>{title}</h2><div className="guide-copy space-y-5 text-base leading-8 text-zinc-300">{children}</div></div></section>;
}

function SearchScalingBrief(): React.JSX.Element {
  const { t } = useTranslation("timeComplexity");
  const stages = [
    [t("count.scenarioTodayLabel"), t("count.scenarioToday")],
    [t("count.scenarioGrowthLabel"), t("count.scenarioGrowth")],
    [t("count.scenarioGoalLabel"), t("count.scenarioGoal")]
  ] as const;

  return (
    <section className="my-10 overflow-hidden rounded-xl border border-cyan-400/25 bg-gradient-to-br from-cyan-400/[0.08] via-zinc-950/80 to-violet-400/[0.06]" aria-labelledby="search-scaling-brief-title">
      <div className="border-b border-cyan-400/15 px-5 py-5 sm:px-7">
        <p className="font-mono text-[10px] font-semibold uppercase tracking-[0.18em] text-cyan-300">{t("count.scenarioEyebrow")}</p>
        <h3 id="search-scaling-brief-title" className="mt-2 text-xl font-semibold tracking-tight text-zinc-50 sm:text-2xl">{t("count.scenarioTitle")}</h3>
        <p className="mt-3 max-w-2xl text-sm leading-6 text-zinc-400">{t("count.scenarioDescription")}</p>
        <div className="mt-5 rounded-lg border border-cyan-400/20 bg-zinc-950/60 p-4">
          <p className="text-sm font-medium text-cyan-100">{t("count.resourcePrompt")}</p>
          <dl className="mt-4 grid gap-3 sm:grid-cols-2">
            <div className="border-l-2 border-violet-400 pl-3"><dt className="font-mono text-[10px] uppercase tracking-wide text-violet-300">{t("count.timeResourceLabel")}</dt><dd className="mt-1 text-sm leading-6 text-zinc-400">{t("count.timeResourceQuestion")}</dd></div>
            <div className="border-l-2 border-amber-400 pl-3"><dt className="font-mono text-[10px] uppercase tracking-wide text-amber-300">{t("count.memoryResourceLabel")}</dt><dd className="mt-1 text-sm leading-6 text-zinc-400">{t("count.memoryResourceQuestion")}</dd></div>
          </dl>
        </div>
      </div>
      <dl className="grid gap-px bg-zinc-800/80 sm:grid-cols-3">
        {stages.map(([label, description]) => (
          <div key={label} className="bg-zinc-950/90 px-5 py-5 sm:px-6">
            <dt className="font-mono text-[10px] uppercase tracking-[0.15em] text-zinc-500">{label}</dt>
            <dd className="mt-2 text-sm leading-6 text-zinc-300">{description}</dd>
          </div>
        ))}
      </dl>
      <p className="border-t border-cyan-400/15 px-5 py-4 text-sm leading-6 text-cyan-100/80 sm:px-7">
        <strong className="font-semibold text-cyan-200">{t("count.scenarioNoteTitle")}</strong>{" "}
        {t("count.scenarioNote")}
      </p>
    </section>
  );
}

function BigOIntroduction(): React.JSX.Element {
  const { t } = useTranslation("timeComplexity");
  const steps = [
    [t("notation.countLabel"), t("notation.countValue")],
    [t("notation.patternLabel"), t("notation.patternValue")],
    [t("notation.labelLabel"), t("notation.labelValue")]
  ] as const;

  return (
    <section className="my-8 overflow-hidden rounded-lg border border-violet-400/25 bg-violet-400/[0.04]" aria-labelledby="big-o-introduction-title">
      <div className="border-b border-violet-400/15 px-5 py-5 sm:px-6">
        <p className="font-mono text-[10px] font-semibold uppercase tracking-[0.18em] text-violet-300">{t("notation.eyebrow")}</p>
        <h3 id="big-o-introduction-title" className="mt-2 text-xl font-semibold text-zinc-100">{t("notation.introTitle")}</h3>
      </div>
      <ol className="grid gap-px bg-zinc-800/80 sm:grid-cols-3">
        {steps.map(([label, value], index) => (
          <li key={label} className="bg-zinc-950/90 px-5 py-5 sm:px-6">
            <span className="font-mono text-[10px] text-violet-300">0{index + 1}</span>
            <span className="mt-2 block text-xs uppercase tracking-wide text-zinc-500">{label}</span>
            <strong className="mt-2 block font-mono text-lg text-zinc-100">{value}</strong>
          </li>
        ))}
      </ol>
      <p className="border-t border-violet-400/15 px-5 py-4 text-sm leading-6 text-violet-100/80 sm:px-6">{t("notation.bridgeNote")}</p>
    </section>
  );
}

function RuntimeCalculationWalkthrough(): React.JSX.Element {
  const { t } = useTranslation("timeComplexity");
  const steps = [
    [t("budget.workStepLabel"), t("budget.workStepValue")],
    [t("budget.constantStepLabel"), t("budget.constantStepValue")],
    [t("budget.divideStepLabel"), t("budget.divideStepValue")]
  ] as const;

  return (
    <section className="my-10 overflow-hidden rounded-xl border border-violet-400/25 bg-violet-400/[0.04]" aria-labelledby="runtime-calculation-title">
      <div className="border-b border-violet-400/15 px-5 py-5 sm:px-7">
        <p className="font-mono text-[10px] font-semibold uppercase tracking-[0.18em] text-violet-300">{t("budget.walkthroughEyebrow")}</p>
        <h3 id="runtime-calculation-title" className="mt-2 text-xl font-semibold tracking-tight text-zinc-50 sm:text-2xl">{t("budget.walkthroughTitle")}</h3>
        <p className="mt-3 max-w-2xl text-sm leading-6 text-zinc-400">{t("budget.walkthroughDescription")}</p>
      </div>
      <ol className="grid gap-px bg-zinc-800/80 sm:grid-cols-3">
        {steps.map(([label, value], index) => (
          <li key={label} className="bg-zinc-950/90 px-5 py-5 sm:px-6">
            <span className="font-mono text-[10px] text-violet-300">0{index + 1}</span>
            <span className="mt-2 block text-xs uppercase tracking-wide text-zinc-500">{label}</span>
            <strong className="mt-2 block font-mono text-base text-zinc-100">{value}</strong>
          </li>
        ))}
      </ol>
      <p className="border-t border-violet-400/15 px-5 py-4 text-sm leading-6 text-violet-100/80 sm:px-7">{t("budget.walkthroughNote")}</p>
    </section>
  );
}

function ConstraintInvestigation({ snippets }: { readonly snippets: TimeComplexitySnippets }): React.JSX.Element {
  const { t } = useTranslation("timeComplexity");
  const questions = [
    {
      question: `${t("compare.caseSmallTitle")} — ${t("compare.caseSmallQuestion")}`,
      answerCode: snippets.pairScan,
      options: [t("compare.caseSmallChoiceA"), t("compare.caseSmallChoiceB"), t("compare.caseSmallChoiceC")],
      correctOption: 1,
      explanation: t("compare.caseSmallAnswer")
    },
    {
      question: `${t("compare.caseMillionTitle")} — ${t("compare.caseMillionQuestion")}`,
      answerCode: snippets.sortCopy,
      options: [t("compare.caseMillionChoiceA"), t("compare.caseMillionChoiceB"), t("compare.caseMillionChoiceC")],
      correctOption: 1,
      explanation: t("compare.caseMillionAnswer")
    },
    {
      question: `${t("compare.caseHugeTitle")} — ${t("compare.caseHugeQuestion")}`,
      answerCode: snippets.hashSet,
      options: [t("compare.caseHugeChoiceA"), t("compare.caseHugeChoiceB"), t("compare.caseHugeChoiceC")],
      correctOption: 1,
      explanation: t("compare.caseHugeAnswer")
    }
  ] as const;
  return (
    <section className="my-10" aria-labelledby="constraint-investigation-title">
      <div className="border-l-2 border-blue-400 pl-4">
        <p className="font-mono text-[10px] font-semibold uppercase tracking-[0.18em] text-blue-300">{t("compare.inquiryEyebrow")}</p>
        <h3 id="constraint-investigation-title" className="mt-2 text-xl font-semibold text-zinc-100">{t("compare.inquiryTitle")}</h3>
        <p className="mt-2 text-sm leading-6 text-zinc-400">{t("compare.inquiryDescription")}</p>
      </div>
      <PracticeQuestionSet label={t("compare.practiceLabel")} questions={questions} />
    </section>
  );
}

function MemoryQuestions({ snippets }: { readonly snippets: TimeComplexitySnippets }): React.JSX.Element {
  const { t } = useTranslation("timeComplexity");
  const questions = [
    {
      question: t("memory.questionInput"),
      answerCode: snippets.answerExamples.memoryInput,
      options: [t("memory.questionInputChoiceA"), t("memory.questionInputChoiceB"), t("memory.questionInputChoiceC")],
      correctOption: 0,
      explanation: t("memory.questionInputAnswer")
    },
    {
      question: t("memory.questionCopy"),
      answerCode: snippets.answerExamples.memoryCopy,
      options: [t("memory.questionCopyChoiceA"), t("memory.questionCopyChoiceB"), t("memory.questionCopyChoiceC")],
      correctOption: 1,
      explanation: t("memory.questionCopyAnswer")
    },
    {
      question: t("memory.questionHash"),
      answerCode: snippets.answerExamples.memoryHash,
      options: [t("memory.questionHashChoiceA"), t("memory.questionHashChoiceB"), t("memory.questionHashChoiceC")],
      correctOption: 1,
      explanation: t("memory.questionHashAnswer")
    }
  ] as const;
  return (
    <section className="my-10" aria-labelledby="memory-questions-title">
      <div className="border-l-2 border-amber-400 pl-4">
        <p className="font-mono text-[10px] font-semibold uppercase tracking-[0.18em] text-amber-300">{t("memory.questionsEyebrow")}</p>
        <h3 id="memory-questions-title" className="mt-2 text-xl font-semibold text-zinc-100">{t("memory.questionsTitle")}</h3>
        <p className="mt-2 max-w-2xl text-sm leading-6 text-zinc-400">{t("memory.questionsIntro")}</p>
      </div>
      <PracticeQuestionSet label={t("memory.practiceLabel")} questions={questions} />
    </section>
  );
}

function LoopCountingTricks({ snippets }: { readonly snippets: TimeComplexitySnippets }): React.JSX.Element {
  const { t } = useTranslation("timeComplexity");
  return (
    <>
      <div className="my-10 divide-y divide-zinc-800 border-y border-zinc-800">
        {([
          [t("tricks.rulePassesTitle"), t("tricks.rulePasses"), snippets.loopTricks.linear],
          [t("tricks.ruleNestedTitle"), t("tricks.ruleNested"), snippets.loopTricks.independentNested],
          [t("tricks.ruleSequenceTitle"), t("tricks.ruleSequence"), snippets.loopTricks.sequential]
        ] as const).map(([title, description, code]) => (
          <CodeTeachingExample key={title} title={title} description={description} code={code} accent="text-cyan-200" />
        ))}
      </div>
      <PracticeQuestionSet label={t("tricks.shortcutLabel")} questions={[
        { question: t("tricks.linearQuestion"), code: snippets.loopTricks.linear, options: ["O(1)", "O(log n)", "O(n)", "O(n²)"], correctOption: 2, explanation: t("tricks.linearAnswer") },
        { question: t("tricks.nestedQuestion"), code: snippets.loopTricks.independentNested, options: ["O(n)", "O(n log n)", "O(n²)", "O(2ⁿ)"], correctOption: 2, explanation: t("tricks.nestedAnswer") },
        { question: t("tricks.sequentialQuestion"), code: snippets.loopTricks.sequential, options: ["O(n)", "O(n log n)", "O(n²)", "O(2ⁿ)"], correctOption: 0, explanation: t("tricks.sequentialAnswer") }
      ]} />
      <div className="mt-12 border-l-2 border-rose-400 pl-4">
        <p className="font-mono text-[10px] font-semibold uppercase tracking-[0.18em] text-rose-300">{t("tricks.counterEyebrow")}</p>
        <h3 className="mt-2 text-xl font-semibold text-zinc-100">{t("tricks.counterTitle")}</h3>
        <p className="mt-2 text-sm leading-6 text-zinc-400">{t("tricks.counterIntro")}</p>
      </div>
      <PracticeQuestionSet label={t("tricks.counterLabel")} questions={[
        { question: t("tricks.triangularQuestion"), code: snippets.loopTricks.triangular, options: ["O(n)", "O(n log n)", "O(n²)", "O(n³)"], correctOption: 2, explanation: t("tricks.triangularAnswer") },
        { question: t("tricks.doublingQuestion"), code: snippets.loopTricks.doubling, options: ["O(1)", "O(log n)", "O(n)", "O(n²)"], correctOption: 1, explanation: t("tricks.doublingAnswer") },
        { question: t("tricks.nLogQuestion"), code: snippets.loopTricks.linearLogarithmic, options: ["O(log n)", "O(n)", "O(n log n)", "O(n²)"], correctOption: 2, explanation: t("tricks.nLogAnswer") }
      ]} />
    </>
  );
}

function RecursionCountingGuide({ snippets }: { readonly snippets: TimeComplexitySnippets }): React.JSX.Element {
  const { t } = useTranslation("timeComplexity");
  return (
    <>
      <div className="my-10 divide-y divide-zinc-800 border-y border-zinc-800">
        {([
          [t("recursion.callsTitle"), t("recursion.calls"), snippets.recursionTricks.countdown],
          [t("recursion.shrinkTitle"), t("recursion.shrink"), snippets.recursionTricks.halving],
          [t("recursion.repeatTitle"), t("recursion.repeat"), snippets.recursionTricks.branching]
        ] as const).map(([title, description, code]) => (
          <CodeTeachingExample key={title} title={title} description={description} code={code} accent="text-rose-200" />
        ))}
      </div>
      <PracticeQuestionSet label={t("recursion.practiceLabel")} questions={[
        { question: t("recursion.countdownQuestion"), code: snippets.recursionTricks.countdown, options: ["O(1)", "O(log n)", "O(n)", "O(n²)"], correctOption: 2, explanation: t("recursion.countdownAnswer") },
        { question: t("recursion.halvingQuestion"), code: snippets.recursionTricks.halving, options: ["O(1)", "O(log n)", "O(n)", "O(n²)"], correctOption: 1, explanation: t("recursion.halvingAnswer") },
        { question: t("recursion.branchingQuestion"), code: snippets.recursionTricks.branching, options: ["O(n)", "O(n log n)", "O(n²)", "O(2ⁿ)"], correctOption: 3, explanation: t("recursion.branchingAnswer") }
      ]} />
      <p className="border-l-2 border-rose-400 pl-4 text-sm leading-6 text-rose-100/80">{t("recursion.noMasterTheorem")}</p>
    </>
  );
}

function CodeTeachingExample({ title, description, code, accent }: { readonly title: string; readonly description: string; readonly code: string; readonly accent: string }): React.JSX.Element {
  return (
    <article className="py-8">
      <h3 className={cn("text-lg font-semibold", accent)}>{title}</h3>
      <p className="mt-2 max-w-2xl text-sm leading-6 text-zinc-400">{description}</p>
      <div className="mt-5"><GuideCodeBlock code={code} /></div>
    </article>
  );
}

function OneSecondTable(): React.JSX.Element {
  const { t } = useTranslation("timeComplexity");
  const rows = [
    ["O(1)", t("threshold.constantN")],
    ["O(log₂ n)", <span key="log-bound" className="inline-flex items-start">≥&nbsp;<GroupedPower label={t("threshold.logPowerLabel")} /></span>],
    ["O(√n)", "2.5 × 10¹⁷"],
    ["O(n)", "500,000,000"],
    ["O(n log₂ n)", "≈ 2 × 10⁷"],
    ["O(n²)", "≈ 22,360"],
    ["O(n³)", "≈ 793"],
    ["O(2ⁿ)", "28"],
    ["O(n!)", "12"]
  ] as const;
  return (
    <section className="my-14" aria-labelledby="one-second-title">
      <h3 id="one-second-title" className="text-2xl font-semibold text-zinc-100">{t("threshold.title")}</h3>
      <p className="mt-3 text-sm leading-6 text-zinc-400">{t("threshold.intro")}</p>
      <div className="mt-6 overflow-x-auto rounded-lg border border-zinc-800">
        <table className="w-full min-w-[28rem] border-collapse text-left text-sm">
          <caption className="sr-only">{t("threshold.caption")}</caption>
          <thead className="bg-zinc-900 text-xs uppercase tracking-wide text-zinc-500"><tr><th className="px-4 py-3">{t("threshold.complexity")}</th><th className="px-4 py-3">{t("threshold.largest")}</th></tr></thead>
          <tbody className="divide-y divide-zinc-800 bg-zinc-950/50">{rows.map(([complexity, largest]) => <tr key={complexity}><th scope="row" className="whitespace-nowrap px-4 py-3 font-mono font-medium text-violet-200">{complexity}</th><td className="whitespace-nowrap px-4 py-3 font-mono text-zinc-200">{largest}</td></tr>)}</tbody>
        </table>
      </div>
    </section>
  );
}

function GroupedPower({ label }: { readonly label: string }): React.JSX.Element {
  return (
    <span aria-label={label} className="inline-flex items-start">
      <span aria-hidden="true">
        2
        <sup className="ml-0.5 text-[0.72em] leading-none">
          10<sup className="text-[0.68em]">5</sup>
        </sup>
      </span>
    </span>
  );
}
