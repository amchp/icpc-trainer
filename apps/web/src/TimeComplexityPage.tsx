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
  MemoryModelExplorer,
  RuntimeEstimator
} from "./learning/complexity/ComplexityInteractions.js";
import { ConstantSpaceFormula, LinearithmicBigOFormula, QuadraticBigOFormula } from "./learning/complexity/MathFormula.js";
import { GuideSidebar } from "./learning/GuideSidebar.js";
import { getTimeComplexitySnippets } from "./learning/snippets/timeComplexitySnippets.js";
import { useLearningProgress, useSetLearningProgressStatus, useStartLearningGuide } from "./useLearningProgress.js";
import { useToaster } from "./Toaster.js";

const GUIDE_ID = LEARNING_GUIDE_IDS.TimeComplexity;

export function TimeComplexityPage(): React.JSX.Element {
  const { t, i18n } = useTranslation("timeComplexity");
  const { userId } = useAuth();
  const snippets = getTimeComplexitySnippets(i18n.resolvedLanguage ?? i18n.language);
  const sections = [
    ["count", t("sections.count")],
    ["compare", t("sections.compare")],
    ["memory", t("sections.memory")],
    ["notation", t("sections.notation")],
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
  const [inputSize, setInputSize] = useState(1000);

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
            <p>{t("count.p1")}</p>
            <p>{t("count.p2")}</p>
            <ExactCountWorksheet />
          </GuideSection>

          <GuideSection id="compare" accent="text-blue-300" title={t("compare.title")}>
            <p>{t("compare.p1")}</p>
            <ConstraintInvestigation />
            <details className="my-10 rounded-lg border border-blue-400/25 bg-blue-400/[0.035] p-5 sm:p-6">
              <summary className="cursor-pointer font-medium text-blue-200 marker:text-blue-400">{t("compare.revealReasoning")}</summary>
              <p className="mt-5 text-sm leading-6 text-zinc-400">{t("compare.reasoning")}</p>
              <div className="mt-8 space-y-8">
                <AlgorithmCard tag={t("compare.pairTag")} title={t("compare.pairTitle")} description={t("compare.pairDescription")} time="O(n²)" space="O(1)" code={snippets.pairScan} />
                <AlgorithmCard tag={t("compare.sortTag")} title={t("compare.sortTitle")} description={t("compare.sortDescription")} time="O(n log n)" space="O(n)" code={snippets.sortCopy} />
                <AlgorithmCard tag={t("compare.hashTag")} title={t("compare.hashTitle")} description={t("compare.hashDescription")} time={t("compare.expectedTime")} space="O(n)" code={snippets.hashSet} />
              </div>
              <div className="mt-6 space-y-4"><Callout color="border-amber-400" text={t("compare.expectedCaveat")} /><Callout color="border-cyan-400" text={t("compare.spaceConvention")} /></div>
            </details>
          </GuideSection>

          <GuideSection id="memory" accent="text-amber-300" title={t("memory.title")}>
            <p>{t("memory.p1")}</p>
            <p>{t("memory.p2")}</p>
            <MemoryQuestions />
            <details className="my-10 rounded-lg border border-amber-400/25 bg-amber-400/[0.035] p-5 sm:p-6">
              <summary className="cursor-pointer font-medium text-amber-200 marker:text-amber-400">{t("memory.revealModels")}</summary>
              <div className="mt-6 grid gap-4 sm:grid-cols-3">
                <Callout color="border-cyan-400" text={t("memory.vectorRule")} />
                <Callout color="border-amber-400" text={t("memory.hashRule")} />
                <Callout color="border-violet-400" text={t("memory.stackNote")} />
              </div>
              <MemoryModelExplorer n={inputSize} onNChange={setInputSize} />
            </details>
          </GuideSection>

          <GuideSection id="notation" accent="text-violet-300" title={t("notation.title")}>
            <p>{t("notation.p1")}</p>
            <div className="my-8 grid gap-3 sm:grid-cols-3">
              <QuadraticBigOFormula label={t("notation.quadraticFormulaLabel")} />
              <LinearithmicBigOFormula label={t("notation.linearithmicFormulaLabel")} />
              <ConstantSpaceFormula label={t("notation.constantFormulaLabel")} />
            </div>
            <p>{t("notation.p2")}</p>
            <ComplexityCurveChart />
            <OneSecondTable />
          </GuideSection>

          <GuideSection id="growth" accent="text-fuchsia-300" title={t("growth.title")}>
            <p>{t("growth.p1")}</p>
            <ComplexityGrowthMeters n={inputSize} onNChange={setInputSize} />
          </GuideSection>

          <GuideSection id="budget" accent="text-amber-300" title={t("budget.title")}>
            <p>{t("budget.p1")}</p>
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

function ConstraintInvestigation(): React.JSX.Element {
  const { t } = useTranslation("timeComplexity");
  const cases = [
    [t("compare.caseSmallTitle"), t("compare.caseSmallQuestion")],
    [t("compare.caseMillionTitle"), t("compare.caseMillionQuestion")],
    [t("compare.caseHugeTitle"), t("compare.caseHugeQuestion")]
  ] as const;
  return (
    <section className="my-10 border-y border-zinc-800 py-7" aria-labelledby="constraint-investigation-title">
      <h3 id="constraint-investigation-title" className="text-xl font-semibold text-zinc-100">{t("compare.inquiryTitle")}</h3>
      <p className="mt-2 text-sm leading-6 text-zinc-400">{t("compare.inquiryDescription")}</p>
      <ol className="mt-6 grid gap-4 sm:grid-cols-3">
        {cases.map(([title, question], index) => <li key={title} className="rounded-md border border-blue-400/20 bg-blue-400/[0.035] p-4"><span className="font-mono text-[10px] text-blue-300">0{index + 1}</span><strong className="mt-2 block text-sm text-zinc-100">{title}</strong><span className="mt-2 block text-sm leading-6 text-zinc-400">{question}</span></li>)}
      </ol>
    </section>
  );
}

function MemoryQuestions(): React.JSX.Element {
  const { t } = useTranslation("timeComplexity");
  const questions = [t("memory.questionInput"), t("memory.questionCopy"), t("memory.questionHash")];
  return (
    <section className="my-10" aria-labelledby="memory-questions-title">
      <h3 id="memory-questions-title" className="text-xl font-semibold text-zinc-100">{t("memory.questionsTitle")}</h3>
      <ol className="mt-5 space-y-3">
        {questions.map((question, index) => <li key={question} className="grid grid-cols-[2rem_1fr] gap-3 border-b border-zinc-800 pb-3 text-sm leading-6 text-zinc-300"><span className="font-mono text-amber-300">M{index + 1}</span><span>{question}</span></li>)}
      </ol>
    </section>
  );
}

function AlgorithmCard({ tag, title, description, time, space, code }: { readonly tag: string; readonly title: string; readonly description: string; readonly time: string; readonly space: string; readonly code: string }): React.JSX.Element {
  const { t } = useTranslation("timeComplexity");
  return (
    <article className="overflow-hidden rounded-lg border border-zinc-800 bg-zinc-950/55">
      <div className="grid gap-5 p-5 sm:grid-cols-[minmax(0,1fr)_auto] sm:items-start sm:p-6">
        <div><span className="font-mono text-[10px] font-semibold uppercase tracking-[0.16em] text-blue-300">{tag}</span><h3 className="mt-2 text-xl font-semibold text-zinc-100">{title}</h3><p className="mt-2 text-sm leading-6 text-zinc-400">{description}</p></div>
        <dl className="grid grid-cols-2 gap-4 text-sm sm:grid-cols-1"><div><dt className="text-xs text-zinc-500">{t("compare.time")}</dt><dd className="font-mono text-zinc-100">{time}</dd></div><div><dt className="text-xs text-zinc-500">{t("compare.space")}</dt><dd className="font-mono text-zinc-100">{space}</dd></div></dl>
      </div>
      <GuideCodeBlock code={code} />
    </article>
  );
}

function Callout({ color, text }: { readonly color: string; readonly text: string }): React.JSX.Element {
  return <p className={cn("border-l-2 pl-4 text-sm leading-6 text-zinc-400", color)}>{text}</p>;
}

function OneSecondTable(): React.JSX.Element {
  const { t } = useTranslation("timeComplexity");
  const rows = [
    ["O(1)", t("threshold.constantN"), t("threshold.constantNote")],
    ["O(log₂ n)", t("threshold.logN"), t("threshold.logNote")],
    ["O(√n)", "10¹⁶", t("threshold.sqrtNote")],
    ["O(n)", "100,000,000", t("threshold.linearNote")],
    ["O(n log₂ n)", "≈ 5 × 10⁶", t("threshold.nlognNote")],
    ["O(n²)", "10,000", t("threshold.quadraticNote")],
    ["O(n³)", "≈ 500", t("threshold.cubicNote")],
    ["O(2ⁿ)", "26", t("threshold.exponentialNote")],
    ["O(n!)", "11", t("threshold.factorialNote")]
  ] as const;
  return (
    <section className="my-14" aria-labelledby="one-second-title">
      <h3 id="one-second-title" className="text-2xl font-semibold text-zinc-100">{t("threshold.title")}</h3>
      <p className="mt-3 text-sm leading-6 text-zinc-400">{t("threshold.intro")}</p>
      <div className="mt-6 overflow-x-auto rounded-lg border border-zinc-800">
        <table className="w-full min-w-[38rem] border-collapse text-left text-sm">
          <caption className="sr-only">{t("threshold.caption")}</caption>
          <thead className="bg-zinc-900 text-xs uppercase tracking-wide text-zinc-500"><tr><th className="px-4 py-3">{t("threshold.complexity")}</th><th className="px-4 py-3">{t("threshold.largest")}</th><th className="px-4 py-3">{t("threshold.note")}</th></tr></thead>
          <tbody className="divide-y divide-zinc-800 bg-zinc-950/50">{rows.map(([complexity, largest, note]) => <tr key={complexity}><th scope="row" className="whitespace-nowrap px-4 py-3 font-mono font-medium text-violet-200">{complexity}</th><td className="whitespace-nowrap px-4 py-3 font-mono text-zinc-200">{largest}</td><td className="px-4 py-3 text-zinc-400">{note}</td></tr>)}</tbody>
        </table>
      </div>
    </section>
  );
}
