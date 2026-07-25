import { LEARNING_GUIDE_IDS, LEARNING_PROGRESS_STATUSES } from "@icpc-trainer/shared";
import { useAuth } from "@clerk/clerk-react";
import { Link } from "@tanstack/react-router";
import { Check, ChevronLeft, ExternalLink, RotateCcw } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { useTranslation } from "react-i18next";

import { appPaths } from "./appNavigation.js";
import { Button } from "./components/ui.js";
import { cn } from "./lib.js";
import { GuideCodeBlock } from "./learning/GuideCodeBlock.js";
import { BooleanExpressionPlayground, LogicalOperatorGuide, TypeExplorer } from "./learning/GuideDemos.js";
import { GuideSidebar } from "./learning/GuideSidebar.js";
import { useProgrammingFundamentalsTraces } from "./learning/GuideTraces.js";
import { PracticeQuestionSet } from "./learning/PracticeQuestionSet.js";
import { getProgrammingFundamentalsSnippets } from "./learning/snippets/programmingFundamentalsSnippets.js";
import { useLearningProgress, useSetLearningProgressStatus, useStartLearningGuide } from "./useLearningProgress.js";
import { useToaster } from "./Toaster.js";

const GUIDE_ID = LEARNING_GUIDE_IDS.ProgrammingFundamentals;
const accents = {
  intro: "text-blue-300",
  representation: "text-cyan-300",
  conditionals: "text-amber-300",
  iteration: "text-violet-300",
  functions: "text-emerald-300"
} as const;
type Accent = (typeof accents)[keyof typeof accents];
type HookAnswer = "yes" | "notYet";

export function ProgrammingFundamentalsPage(): React.JSX.Element {
  const { t, i18n } = useTranslation("programmingFundamentals");
  const traces = useProgrammingFundamentalsTraces();
  const snippets = getProgrammingFundamentalsSnippets(i18n.resolvedLanguage ?? i18n.language);
  const { userId } = useAuth();
  const sections = [
    ["bloques", t("sections.blocks")], ["representacion", t("sections.representation")], ["operadores", t("sections.operators")],
    ["condicionales", t("sections.conditionals")], ["iteracion", t("sections.iteration")], ["vectores", t("sections.vectors")],
    ["funciones", t("sections.functions")], ["recursion", t("sections.recursion")], ["compilacion", t("sections.compilation")]
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

  return (
    <main className="pb-24 text-zinc-200">
      <header className="mx-auto max-w-5xl px-5 pb-12 pt-10 sm:px-8 sm:pb-16 sm:pt-16">
        <Link to={appPaths.resources} className="inline-flex items-center gap-2 text-sm text-zinc-400 transition-colors hover:text-zinc-100">
          <ChevronLeft className="size-4" aria-hidden="true" /> {t("roadmap")}
        </Link>
        <div className="mt-12 grid gap-8 lg:grid-cols-[1fr_15rem] lg:items-end">
          <div>
            <p className="guide-rise font-mono text-xs font-semibold uppercase tracking-[0.18em] text-blue-400">{t("eyebrow")}</p>
            <h1 className="guide-rise mt-4 max-w-3xl text-4xl font-semibold tracking-[-0.045em] text-zinc-50 [animation-delay:80ms] sm:text-6xl">
              {t("title")}
            </h1>
            <p className="guide-rise mt-6 max-w-2xl text-lg leading-8 text-zinc-400 [animation-delay:160ms]">
              {t("subtitle")}
            </p>
          </div>
          <div className="guide-rise border-l border-zinc-700 pl-5 text-sm leading-6 text-zinc-400 [animation-delay:240ms]">
            <strong className="block text-zinc-100">{t("cppTitle")}</strong>
            {t("cppDescription")}
          </div>
        </div>
        <div className="mt-14 grid grid-cols-2 gap-x-6 gap-y-4 sm:grid-cols-4" aria-label={t("blocksLabel")}>
          <ConceptStripe color="bg-cyan-400" label={t("concepts.representation")} delay="0ms" />
          <ConceptStripe color="bg-amber-400" label={t("concepts.conditionals")} delay="90ms" />
          <ConceptStripe color="bg-violet-400" label={t("concepts.iteration")} delay="180ms" />
          <ConceptStripe color="bg-emerald-400" label={t("concepts.functions")} delay="270ms" />
        </div>
        <ProgrammingSelfCheck />
      </header>

      <div className="mx-auto max-w-7xl px-5 sm:px-8 lg:grid lg:grid-cols-[14rem_minmax(0,1fr)] lg:gap-12">
        <GuideSidebar
          sections={sections.map(([id, label]) => ({ id, label }))}
          activeSection={activeSection}
          label={t("sidebar.label")}
          progressLabel={(current, total) => t("sidebar.progress", { current, total })}
        />
        <div className="min-w-0">
        <GuideSection id="bloques" accent={accents.intro} title={t("blocks.title")}>
          <p>{t("blocks.p1")}</p>
          <p>{t("blocks.p2Start")} <Term color="text-cyan-300">{t("blocks.representation")}</Term> {t("blocks.representationText")} <Term color="text-amber-300">{t("blocks.conditionals")}</Term> {t("blocks.conditionalsText")} <Term color="text-violet-300">{t("blocks.iteration")}</Term> {t("blocks.iterationText")} <Term color="text-emerald-300">{t("blocks.functions")}</Term> {t("blocks.functionsText")}</p>
          <div className="my-10 grid gap-px overflow-hidden rounded-lg border border-zinc-800 bg-zinc-800 sm:grid-cols-4">
            <Block color="bg-cyan-400" symbol="01" title={t("blocks.represent")} />
            <Block color="bg-amber-400" symbol="?" title={t("blocks.decide")} />
            <Block color="bg-violet-400" symbol="↻" title={t("blocks.repeat")} />
            <Block color="bg-emerald-400" symbol="f(x)" title={t("blocks.reuse")} />
          </div>
        </GuideSection>

        <GuideSection id="representacion" accent={accents.representation} title={t("representation.title")}>
          <div className="my-10 divide-y divide-zinc-800 border-y border-zinc-800 sm:my-14">
            <div className="px-3 py-10 sm:px-8 sm:py-14">
              <p className="mx-auto max-w-4xl text-center text-3xl font-semibold leading-tight tracking-[-0.035em] text-zinc-50 [text-wrap:balance] sm:text-5xl">
                {t("openingQuestions.numbers")}
              </p>
            </div>
            <div className="px-3 py-10 sm:px-8 sm:py-14">
              <p className="mx-auto max-w-4xl text-center text-3xl font-semibold leading-tight tracking-[-0.035em] text-zinc-50 [text-wrap:balance] sm:text-5xl">
                {t("openingQuestions.alphabet")}
              </p>
            </div>
          </div>
          <p>{t("representation.p1")}</p>
          <TypeExplorer />
          <RepresentationResearch />
          <GuideCodeBlock code={`bool listo = true;\nint problemas = 5;\ndouble promedio = 2.5;\nchar categoria = 'A';`} />
          <PracticeQuestionSet questions={[
            { question: t("representation.question"), options: ["bool", "int", "double", "char"], correctOption: 1, explanation: t("representation.explanation") },
            { question: t("representation.question2"), options: ["bool", "int", "double", "char"], correctOption: 0, explanation: t("representation.explanation2") },
            { question: t("representation.question3"), options: ["bool", "int", "double", "char"], correctOption: 2, explanation: t("representation.explanation3") },
            { question: t("representation.question4"), options: ["bool", "int", "double", "char"], correctOption: 3, explanation: t("representation.explanation4") }
          ]} />
        </GuideSection>

        <GuideSection id="operadores" accent={accents.representation} title={t("operators.title")}>
          <p>{t("operators.p1")}</p>
          <BasicOperatorGrid />
          <GuideCodeBlock code={`int a = 5, b = 2;\nint suma = a + b;        // 7\nint resta = a - b;       // 3\nint producto = a * b;    // 10\nint cociente = a / b;    // 2\nint residuo = a % b;     // 1`} />
          <div className="!mt-14 border-t border-zinc-800 pt-8">
            <p className="font-mono text-[10px] font-semibold uppercase tracking-[0.18em] text-cyan-400">{t("representation.conversionsEyebrow")}</p>
            <h3 className="mt-3 text-2xl font-semibold tracking-tight text-zinc-100">{t("representation.conversionsTitle")}</h3>
            <p>{t("representation.conversionsP1")}</p>
            <p>{t("representation.conversionsP2")}</p>
            <div role="region" aria-label={t("representation.conversionExamplesLabel")} className="my-8 grid border-y border-zinc-800 sm:grid-cols-2">
              <ConversionNote expression="int + double → double" title={t("representation.arithmeticInteractionTitle")} description={t("representation.arithmeticInteractionDescription")} code={t("representation.arithmeticInteractionCode")} />
              <ConversionNote expression="char + int → int" title={t("representation.characterInteractionTitle")} description={t("representation.characterInteractionDescription")} code={t("representation.characterInteractionCode")} />
              <ConversionNote expression="result → variable type" title={t("representation.assignmentInteractionTitle")} description={t("representation.assignmentInteractionDescription")} code={t("representation.assignmentInteractionCode")} />
              <ConversionNote expression="comparison → bool" title={t("representation.comparisonInteractionTitle")} description={t("representation.comparisonInteractionDescription")} code={t("representation.comparisonInteractionCode")} />
            </div>
            <p>{t("representation.conversionsWarning")}</p>
          </div>
          <PracticeQuestionSet questions={[
            { question: t("operators.question"), code: snippets.operatorQuestions.integerDivision, options: ["2", "2.5", "Error"], correctOption: 0, explanation: t("operators.explanation") },
            { question: t("operators.question2"), code: snippets.operatorQuestions.decimalDivision, options: ["2", "2.5", "Error"], correctOption: 1, explanation: t("operators.explanation2") }
          ]} />
        </GuideSection>

        <GuideSection id="condicionales" accent={accents.conditionals} title={t("conditionals.title")}>
          <div className="my-10 border-y border-zinc-800 px-3 py-10 sm:my-14 sm:px-8 sm:py-14">
            <p className="mx-auto max-w-4xl text-center text-3xl font-semibold leading-tight tracking-[-0.035em] text-zinc-50 [text-wrap:balance] sm:text-5xl">
              {t("openingQuestions.decisions")}
            </p>
          </div>
          <p>{t("conditionals.p1")}</p>
          <IfStructureGuide />
          <GuideCodeBlock trace={traces.conditionals} />
          <div className="!mt-14 border-t border-zinc-800 pt-10">
            <p className="font-mono text-[10px] font-semibold uppercase tracking-[0.18em] text-amber-400">{t("conditionals.logicEyebrow")}</p>
            <h3 className="mt-3 text-2xl font-semibold tracking-tight text-zinc-100">{t("conditionals.logicTitle")}</h3>
            <p className="mt-4">{t("conditionals.logicP1")}</p>

            <div className="my-8 grid gap-x-8 gap-y-6 border-y border-zinc-800 py-7 sm:grid-cols-2">
              <ComparisonNote operators="&lt;  &gt;  &lt;=  &gt;=" title={t("conditionals.relationalTitle")} description={t("conditionals.relationalDescription")} />
              <ComparisonNote operators="==  !=" title={t("conditionals.equalityTitle")} description={t("conditionals.equalityDescription")} />
            </div>

            <h4 className="text-lg font-semibold text-zinc-100">{t("conditionals.truthTableTitle")}</h4>
            <p className="mt-2 text-sm leading-6 text-zinc-400">{t("conditionals.truthTableDescription")}</p>
            <TruthTables
              andCaption={t("conditionals.andTruthTableCaption")}
              orCaption={t("conditionals.orTruthTableCaption")}
              notCaption={t("conditionals.notTruthTableCaption")}
              resultLabel={t("conditionals.resultLabel")}
            />

            <div className="my-8 grid gap-6 border-y border-zinc-800 py-7 sm:grid-cols-2">
              <div>
                <h4 className="font-mono text-sm font-semibold text-amber-300">{t("conditionals.shortCircuitTitle")}</h4>
                <p className="mt-2 text-sm leading-6 text-zinc-400">{t("conditionals.shortCircuitDescription")}</p>
              </div>
              <div>
                <h4 className="font-mono text-sm font-semibold text-amber-300">{t("conditionals.precedenceTitle")}</h4>
                <p className="mt-2 text-sm leading-6 text-zinc-400">{t("conditionals.precedenceDescription")}</p>
              </div>
            </div>

            <LogicalOperatorGuide />

            <BooleanExpressionPlayground />
            <p>{t("conditionals.logicSummary")}</p>
          </div>
        </GuideSection>

        <GuideSection id="iteracion" accent={accents.iteration} title={t("iteration.title")}>
          <OpeningQuestion>{t("openingQuestions.iteration")}</OpeningQuestion>
          <p>{t("iteration.p1")}</p>
          <ForAnatomyGuide />
          <GuideCodeBlock trace={traces.forLoop} />
          <p>{t("iteration.whileExplanation")}</p>
          <WhileAnatomyGuide />
          <GuideCodeBlock trace={traces.whileLoop} />
          <PracticeQuestionSet questions={[
            { question: t("iteration.printQuestion"), code: snippets.iterationQuestions.noIterations, options: ["5 4 3 2 1", "5 6", t("iteration.nothing")], correctOption: 2, explanation: t("iteration.explanation") },
            { question: t("iteration.printQuestion"), code: snippets.iterationQuestions.counting, options: ["1 2 3", "1 2", t("iteration.nothing")], correctOption: 0, explanation: t("iteration.explanation2") },
            { question: t("iteration.printQuestion"), code: snippets.iterationQuestions.doublingFor, options: ["1 2 4 8", "1 2 3 4 5 6 7 8", "2 4 8 16"], correctOption: 0, explanation: t("iteration.doublingForExplanation") },
            { question: t("iteration.printQuestion"), code: snippets.iterationQuestions.whileCountdown, options: ["3 2 1", "3 2 1 0", "1 2 3"], correctOption: 0, explanation: t("iteration.whileCountdownExplanation") },
            { question: t("iteration.printQuestion"), code: snippets.iterationQuestions.whileDoubling, options: ["1 2 4 8", "1 2 4 8 16", "2 4 8"], correctOption: 0, explanation: t("iteration.whileDoublingExplanation") },
            { question: t("iteration.printQuestion"), code: snippets.iterationQuestions.infiniteFor, options: [t("iteration.foreverOutput"), t("iteration.onceOutput"), t("iteration.nothing")], correctOption: 0, explanation: t("iteration.infiniteForExplanation") },
            { question: t("iteration.emptyPartQuestion"), code: snippets.iterationQuestions.emptyForPart, options: [t("iteration.initializationPart"), t("iteration.conditionPart"), t("iteration.updatePart")], correctOption: 1, explanation: t("iteration.emptyPartExplanation") }
          ]} />
          <div className="!mt-14 border-t border-zinc-800 pt-8">
            <p className="font-mono text-[10px] font-semibold uppercase tracking-[0.18em] text-violet-400">{t("iteration.loopControlEyebrow")}</p>
            <h3 className="mt-3 text-2xl font-semibold tracking-tight text-zinc-100">{t("iteration.loopControlTitle")}</h3>
            <p className="mt-4">{t("iteration.loopControlDescription")}</p>
            <GuideCodeBlock trace={traces.loopControl} />
          </div>
          <PracticeQuestionSet questions={[
            { question: t("iteration.printQuestion"), code: snippets.iterationQuestions.continueControl, options: ["1 2", "1 2 4 5", "3 4 5"], correctOption: 1, explanation: t("iteration.continueExplanation") },
            { question: t("iteration.printQuestion"), code: snippets.iterationQuestions.breakControl, options: ["1 2", "1 2 3 4 5", "3 4 5"], correctOption: 0, explanation: t("iteration.breakExplanation") }
          ]} />
        </GuideSection>

        <GuideSection id="vectores" accent={accents.iteration} title={t("vectors.title")}>
          <p>{t("vectors.p1")}</p>
          <p>{t("vectors.operationsDescription")}</p>
          <GuideCodeBlock code={snippets.vectorOperations.code} />
          <p>{t("vectors.traversalDescription")}</p>
          <GuideCodeBlock trace={traces.vectorTraversal} />
          <PracticeQuestionSet questions={[
            { question: t("vectors.question2"), code: snippets.vectorQuestions.sizeAfterPushPop, options: ["2", "3", "4"], correctOption: 1, explanation: t("vectors.explanation2") },
            { question: t("vectors.question2"), code: snippets.vectorQuestions.indexUpdate, options: ["1", "4", "5"], correctOption: 2, explanation: t("vectors.explanation3") },
            { question: t("vectors.question2"), code: snippets.vectorQuestions.growFromBack, options: ["4", "6", "8"], correctOption: 2, explanation: t("vectors.explanation4") },
            { question: t("vectors.question2"), code: snippets.vectorQuestions.sumTraversal, options: ["6", "10", "12"], correctOption: 2, explanation: t("vectors.explanation5") }
          ]} />
        </GuideSection>

        <GuideSection id="funciones" accent={accents.functions} title={t("functions.title")}>
          <OpeningQuestion>{t("openingQuestions.functions")}</OpeningQuestion>
          <p>{t("functions.p1")}</p>
          <FunctionAnatomyGuide />
          <GuideCodeBlock trace={traces.functionCall} />
          <EarlyReturnComparison
            earlyReturnCode={snippets.functionExamples.earlyReturn}
            helperVariableCode={snippets.functionExamples.helperVariable}
          />
        </GuideSection>

        <GuideSection id="recursion" accent={accents.functions} title={t("recursion.title")}>
          <p>{t("recursion.p1")}</p>
          <RecursionAnatomyGuide />
          <GuideCodeBlock trace={traces.countdown} />
          <div className="!mt-14 border-t border-zinc-800 pt-8">
            <h3 className="text-2xl font-semibold tracking-tight text-zinc-100">{t("recursion.examplesTitle")}</h3>
            <p className="mt-4">{t("recursion.examplesDescription")}</p>
            <GuideCodeBlock trace={traces.recursion} />
            <GuideCodeBlock trace={traces.fibonacci} />
          </div>
          <PracticeQuestionSet questions={[
            { question: t("recursion.question"), code: snippets.recursionQuestions.baseCase, options: [t("recursion.parameter"), t("recursion.baseCase"), t("recursion.multiplication")], correctOption: 1, explanation: t("recursion.explanation") },
            { question: t("recursion.question2"), code: snippets.recursionQuestions.factorialCall, options: ["3", "6", "9"], correctOption: 1, explanation: t("recursion.explanation2") },
            { question: t("recursion.question2"), code: snippets.recursionQuestions.countdownCall, options: ["4 3 2 1", "1 2 3 4", "4 3 2 1 0"], correctOption: 0, explanation: t("recursion.explanation3") },
            { question: t("recursion.question2"), code: snippets.recursionQuestions.fibonacciCall, options: ["3", "5", "8"], correctOption: 1, explanation: t("recursion.explanation4") },
            { question: t("recursion.question3"), code: snippets.recursionQuestions.missingBaseCase, options: [t("recursion.stopsAtZero"), t("recursion.keepsCalling"), t("recursion.compileError")], correctOption: 1, explanation: t("recursion.explanation5") }
          ]} />
        </GuideSection>

        <GuideSection id="compilacion" accent={accents.intro} title={t("compilation.title")}>
          <OpeningQuestion>{t("compilation.openingQuestion")}</OpeningQuestion>
          <p>{t("compilation.p1")}</p>
          <CompilationPipeline />
          <h3 className="!mt-12 text-2xl font-semibold tracking-tight text-zinc-100">{t("compilation.sourceTitle")}</h3>
          <p>{t("compilation.sourceDescription")}</p>
          <GuideCodeBlock code={snippets.compilation.source} />
          <div className="my-8 grid gap-6 border-y border-zinc-800 py-7 sm:grid-cols-2">
            <div>
              <h4 className="font-mono text-sm font-semibold text-cyan-300">#include &lt;bits/stdc++.h&gt;</h4>
              <p className="mt-2 text-sm leading-6 text-zinc-400">{t("compilation.bitsDescription")}</p>
            </div>
            <div>
              <h4 className="font-mono text-sm font-semibold text-violet-300">using namespace std;</h4>
              <p className="mt-2 text-sm leading-6 text-zinc-400">{t("compilation.namespaceDescription")}</p>
              <p className="mt-2 text-sm leading-6 text-zinc-500">{t("compilation.namespaceAlternative")}</p>
            </div>
          </div>
          <h3 className="!mt-12 text-2xl font-semibold tracking-tight text-zinc-100">{t("compilation.commandTitle")}</h3>
          <p>{t("compilation.commandDescription")}</p>
          <GuideCodeBlock code={snippets.compilation.commands} language="bash" />
          <div className="my-8 grid gap-6 border-y border-zinc-800 py-7 sm:grid-cols-2">
            <div>
              <h4 className="font-mono text-sm font-semibold text-cyan-300">{t("compilation.compileLabel")}</h4>
              <p className="mt-2 text-sm leading-6 text-zinc-400">{t("compilation.compileDescription")}</p>
            </div>
            <div>
              <h4 className="font-mono text-sm font-semibold text-emerald-300">{t("compilation.runLabel")}</h4>
              <p className="mt-2 text-sm leading-6 text-zinc-400">{t("compilation.runDescription")}</p>
            </div>
          </div>
          <p>{t("compilation.recompileNote")}</p>
          <PracticeQuestionSet questions={[
            { question: t("compilation.question"), code: snippets.compilation.question, options: [t("compilation.sourceOption"), t("compilation.compilerOption"), t("compilation.executableOption")], correctOption: 2, explanation: t("compilation.explanation") }
          ]} />
        </GuideSection>

        <section className="mt-20 border-t border-zinc-700 pt-10" aria-labelledby="guide-finish-title">
          <p className="font-mono text-xs uppercase tracking-[0.18em] text-blue-400">{t("finish.eyebrow")}</p>
          <h2 id="guide-finish-title" className="mt-3 text-3xl font-semibold tracking-tight text-zinc-50">{t("finish.title")}</h2>
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

function ProgrammingSelfCheck(): React.JSX.Element {
  const { t } = useTranslation("programmingFundamentals");
  const [answers, setAnswers] = useState<Partial<Record<number, HookAnswer>>>({});
  const tasks = [
    {
      concept: t("hook.tasks.sudoku.concept"),
      title: t("hook.tasks.sudoku.title"),
      description: t("hook.tasks.sudoku.description"),
      image: "/learning/fundamentals/sudoku-iteration.webp",
      problem: t("hook.tasks.sudoku.problem"),
      problemUrl: "https://leetcode.com/problems/valid-sudoku/"
    },
    {
      concept: t("hook.tasks.password.concept"),
      title: t("hook.tasks.password.title"),
      description: t("hook.tasks.password.description"),
      image: "/learning/fundamentals/password-conditionals.webp",
      problem: t("hook.tasks.password.problem"),
      problemUrl: "https://leetcode.com/problems/strong-password-checker-ii/"
    },
    {
      concept: t("hook.tasks.folders.concept"),
      title: t("hook.tasks.folders.title"),
      description: t("hook.tasks.folders.description"),
      image: "/learning/fundamentals/folders-recursion.webp",
      problem: t("hook.tasks.folders.problem"),
      problemUrl: "https://leetcode.com/problems/maximum-depth-of-n-ary-tree/"
    }
  ];
  const answeredCount = Object.keys(answers).length;
  const hasGap = Object.values(answers).includes("notYet");
  const summary = hasGap
    ? t("hook.gap")
    : answeredCount === tasks.length
      ? t("hook.ready")
      : t("hook.prompt");

  const answerTask = (index: number, answer: HookAnswer): void => {
    setAnswers((current) => ({ ...current, [index]: answer }));
  };

  return (
    <section
      className="guide-rise mt-14 overflow-hidden rounded-xl border border-zinc-800 bg-zinc-950/70 [animation-delay:320ms]"
      aria-labelledby="programming-self-check-title"
    >
      <div className="px-5 py-6 sm:px-7 sm:py-7">
        <p className="font-mono text-xs font-semibold uppercase tracking-[0.18em] text-violet-300">{t("hook.eyebrow")}</p>
        <h2 id="programming-self-check-title" className="mt-3 text-2xl font-semibold tracking-tight text-zinc-50 sm:text-3xl">
          {t("hook.title")}
        </h2>
        <p className="mt-3 max-w-3xl leading-7 text-zinc-400">{t("hook.intro")}</p>
      </div>

      <div className="grid border-t border-zinc-800 md:grid-cols-3">
        {tasks.map((task, index) => (
          <fieldset
            key={task.title}
            className="min-w-0 border-zinc-800 p-5 max-md:border-t max-md:first:border-t-0 md:border-l md:first:border-l-0 sm:p-6"
          >
            <legend className="sr-only">{task.title}</legend>
            <div className="-mx-5 -mt-5 mb-5 overflow-hidden border-b border-zinc-800 bg-black sm:-mx-6 sm:-mt-6">
              <img
                src={task.image}
                alt=""
                className="h-44 w-full object-cover"
                width="900"
                height="550"
                loading="eager"
              />
            </div>
            <span className="font-mono text-[10px] font-semibold uppercase tracking-[0.16em] text-zinc-500">{task.concept}</span>
            <h3 className="mt-2 text-base font-semibold leading-6 text-zinc-100 md:min-h-12">{task.title}</h3>
            <p className="mt-2 min-h-20 text-sm leading-6 text-zinc-400">{task.description}</p>
            <a
              href={task.problemUrl}
              target="_blank"
              rel="noreferrer"
              className="mt-4 inline-flex items-start gap-1.5 text-xs font-semibold text-blue-300 underline decoration-blue-500/50 underline-offset-4 transition-colors hover:text-blue-200 md:min-h-10"
            >
              {task.problem}
              <ExternalLink className="size-3.5 shrink-0" aria-hidden="true" />
            </a>
            <p className="mt-5 text-xs font-medium text-zinc-300">{t("hook.question")}</p>
            <div className="mt-3 grid grid-cols-2 gap-2">
              <SelfCheckButton
                selected={answers[index] === "yes"}
                onClick={() => answerTask(index, "yes")}
              >
                {t("hook.yes")}
              </SelfCheckButton>
              <SelfCheckButton
                selected={answers[index] === "notYet"}
                onClick={() => answerTask(index, "notYet")}
              >
                {t("hook.notYet")}
              </SelfCheckButton>
            </div>
          </fieldset>
        ))}
      </div>

      <p
        className={cn(
          "border-t px-5 py-5 text-sm leading-6 sm:px-7",
          hasGap ? "border-amber-900/60 bg-amber-950/20 text-amber-200" : "border-zinc-800 bg-zinc-900/40 text-zinc-300"
        )}
        aria-live="polite"
      >
        {summary}
      </p>
    </section>
  );
}

function SelfCheckButton({ selected, onClick, children }: { selected: boolean; onClick: () => void; children: React.ReactNode }): React.JSX.Element {
  return (
    <button
      type="button"
      className={cn(
        "min-h-10 rounded-md border px-3 py-2 text-xs font-semibold transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-400",
        selected
          ? "border-blue-400 bg-blue-400/15 text-blue-100"
          : "border-zinc-700 bg-zinc-900 text-zinc-400 hover:border-zinc-500 hover:text-zinc-100"
      )}
      aria-pressed={selected}
      onClick={onClick}
    >
      {children}
    </button>
  );
}

function GuideSection({ id, title, accent, children }: { id: string; title: string; accent: Accent; children: React.ReactNode }): React.JSX.Element {
  return (
    <section id={id} className="scroll-mt-20 border-t border-zinc-800 py-16 sm:py-20">
      <div className="min-w-0 max-w-4xl">
        <h2 className={cn("mb-8 text-3xl font-semibold tracking-tight sm:text-4xl", accent)}>{title}</h2>
        <div className="guide-copy space-y-5 text-base leading-8 text-zinc-300">{children}</div>
      </div>
    </section>
  );
}

function ConceptStripe({ color, label, delay }: { color: string; label: string; delay: string }): React.JSX.Element {
  return (
    <div>
      <span className={cn("guide-grow block h-1.5 rounded-sm", color)} style={{ animationDelay: delay }} />
      <span className="mt-2 block font-mono text-[10px] uppercase tracking-wide text-zinc-500">{label}</span>
    </div>
  );
}

function Term({ color, children }: { color: string; children: React.ReactNode }): React.JSX.Element { return <strong className={cn("font-semibold", color)}>{children}</strong>; }
function Block({ color, symbol, title }: { color: string; symbol: string; title: string }): React.JSX.Element { return <div className="bg-zinc-950 p-6 text-center"><span className={cn("mx-auto grid size-12 place-items-center rounded-sm font-mono font-bold text-zinc-950", color)}>{symbol}</span><strong className="mt-3 block text-sm text-zinc-200">{title}</strong></div>; }
function ConversionNote({ expression, title, description, code }: { expression: string; title: string; description: string; code: string }): React.JSX.Element {
  return (
    <article className="flex min-w-0 flex-col border-b border-zinc-800 py-6 last:border-b-0 sm:px-6 sm:[&:nth-child(-n+2)]:border-b sm:[&:nth-last-child(-n+2)]:border-b-0 sm:odd:pl-0 sm:even:border-l sm:even:pr-0">
      <code className="text-sm font-semibold text-cyan-300">{expression}</code>
      <h4 className="mt-3 text-sm font-semibold text-zinc-100">{title}</h4>
      <p className="mt-1 text-sm leading-6 text-zinc-400">{description}</p>
      <pre className="mt-4 overflow-hidden whitespace-pre-wrap break-words border-l-2 border-cyan-700 bg-zinc-950/50 px-3 py-2.5 text-xs leading-5 text-zinc-300"><code className="block !whitespace-pre-wrap [overflow-wrap:anywhere]">{code}</code></pre>
    </article>
  );
}
function ComparisonNote({ operators, title, description }: { operators: string; title: string; description: string }): React.JSX.Element { return <div><code className="whitespace-pre text-sm font-semibold text-amber-300">{operators}</code><h4 className="mt-3 text-sm font-semibold text-zinc-100">{title}</h4><p className="mt-1 text-sm leading-6 text-zinc-400">{description}</p></div>; }
function OpeningQuestion({ children }: { children: React.ReactNode }): React.JSX.Element { return <div className="my-10 border-y border-zinc-800 px-3 py-10 sm:my-14 sm:px-8 sm:py-14"><p className="mx-auto max-w-4xl text-center text-3xl font-semibold leading-tight tracking-[-0.035em] text-zinc-50 [text-wrap:balance] sm:text-5xl">{children}</p></div>; }

function RepresentationResearch(): React.JSX.Element {
  const { t, i18n } = useTranslation("programmingFundamentals");
  const spanish = i18n.resolvedLanguage?.startsWith("es") ?? false;
  const articles = [
    [t("representation.research.boolean"), spanish ? "https://es.wikipedia.org/wiki/Tipo_de_dato_l%C3%B3gico" : "https://en.wikipedia.org/wiki/Boolean_data_type", "bool"],
    [t("representation.research.integer"), spanish ? "https://es.wikipedia.org/wiki/Tipo_de_dato_entero" : "https://en.wikipedia.org/wiki/Integer_(computer_science)", "int"],
    [t("representation.research.floatingPoint"), spanish ? "https://es.wikipedia.org/wiki/Coma_flotante" : "https://en.wikipedia.org/wiki/Floating-point_arithmetic", "double"],
    [t("representation.research.character"), spanish ? "https://es.wikipedia.org/wiki/Car%C3%A1cter_(tipo_de_dato)" : "https://en.wikipedia.org/wiki/Character_encoding", "char"]
  ] as const;

  return (
    <aside className="my-10 overflow-hidden rounded-lg border border-cyan-400/25 bg-cyan-400/[0.045]" aria-labelledby="why-bits-title">
      <div className="border-b border-cyan-400/15 px-5 py-5 sm:px-6">
        <h3 id="why-bits-title" className="text-lg font-semibold text-cyan-100">{t("representation.whyBitsTitle")}</h3>
        <p className="mt-2 text-sm leading-6 text-zinc-300">{t("representation.whyBitsDescription")}</p>
      </div>
      <div className="px-5 py-5 sm:px-6">
        <h4 className="text-sm font-semibold text-zinc-100">{t("representation.researchTitle")}</h4>
        <p className="mt-1 text-sm leading-6 text-zinc-400">{t("representation.researchDescription")}</p>
        <div className="mt-4 grid gap-2 sm:grid-cols-2">
          {articles.map(([label, href, type]) => (
            <a
              key={type}
              href={href}
              target="_blank"
              rel="noreferrer"
              aria-label={`${type}: ${label}`}
              className="group flex min-h-11 items-center justify-between gap-3 rounded-md border border-zinc-700 bg-zinc-950/80 px-3 py-2 text-sm text-zinc-300 transition-colors hover:border-cyan-400/60 hover:text-cyan-100"
            >
              <span><code className="mr-2 text-xs font-semibold text-cyan-300">{type}</code>{label}</span>
              <ExternalLink className="size-3.5 shrink-0 text-zinc-500 transition-colors group-hover:text-cyan-300" aria-hidden="true" />
            </a>
          ))}
        </div>
      </div>
    </aside>
  );
}

function BasicOperatorGrid(): React.JSX.Element {
  const { t } = useTranslation("programmingFundamentals");
  const operations = [
    ["+", t("operators.addition")],
    ["-", t("operators.subtraction")],
    ["*", t("operators.multiplication")],
    ["/", t("operators.division")],
    ["%", t("operators.remainder")]
  ] as const;

  return (
    <div className="my-7">
      <div role="list" aria-label={t("operators.referenceLabel")} className="grid grid-cols-2 gap-px overflow-hidden rounded-lg border border-zinc-800 bg-zinc-800 sm:grid-cols-5">
        {operations.map(([symbol, label], index) => (
          <div role="listitem" key={symbol} className={cn("bg-zinc-950 px-3 py-4 text-center", index === operations.length - 1 && "col-span-2 sm:col-span-1")}>
            <code className="text-xl font-semibold text-cyan-300">{symbol}</code>
            <span className="mt-1 block text-xs text-zinc-400">{label}</span>
          </div>
        ))}
      </div>
      <div className="mt-3 flex items-start gap-3 border-l-2 border-cyan-500 pl-4">
        <code className="shrink-0 font-semibold text-cyan-300">5 % 2 = 1</code>
        <p className="text-sm leading-6 text-zinc-400">{t("operators.remainderDescription")}</p>
      </div>
    </div>
  );
}

function CompilationPipeline(): React.JSX.Element {
  const { t } = useTranslation("programmingFundamentals");
  const steps = [
    [t("compilation.sourceMarker"), t("compilation.pipelineSource"), t("compilation.pipelineSourceDescription"), "text-cyan-300"],
    [t("compilation.compilerMarker"), t("compilation.pipelineCompiler"), t("compilation.pipelineCompilerDescription"), "text-amber-300"],
    [t("compilation.executableMarker"), t("compilation.pipelineExecutable"), t("compilation.pipelineExecutableDescription"), "text-emerald-300"],
    [t("compilation.runMarker"), t("compilation.pipelineRun"), t("compilation.pipelineRunDescription"), "text-violet-300"]
  ] as const;
  return (
    <div className="my-10 grid border-y border-zinc-800 sm:grid-cols-4">
      {steps.map(([marker, title, description, color], index) => (
        <div key={title} className={cn("relative border-t border-zinc-800 px-4 py-6 first:border-t-0 sm:border-l sm:border-t-0 sm:first:border-l-0", index > 0 && "sm:pl-6")}>
          <code className={cn("text-sm font-semibold", color)}>{marker}</code>
          <strong className="mt-3 block text-sm text-zinc-100">{title}</strong>
          <p className="mt-1 text-xs leading-5 text-zinc-500">{description}</p>
        </div>
      ))}
    </div>
  );
}

function IfStructureGuide(): React.JSX.Element {
  const { t } = useTranslation("programmingFundamentals");
  return (
    <div className="my-8 grid gap-6 border-y border-zinc-800 py-6 sm:grid-cols-[minmax(16rem,.8fr)_minmax(0,1.2fr)] sm:items-start">
      <code className="block overflow-x-auto whitespace-nowrap font-mono text-sm leading-7 text-zinc-300">
        <span className="block"><span className="text-violet-300">if</span> (<span className="text-amber-300">{t("conditionals.structureExpression")}</span>) {"{"}</span>
        <span className="block pl-4 text-zinc-500">{t("conditionals.structureBody")}</span>
        <span className="block">{"}"}</span>
      </code>
      <div className="space-y-2 text-sm leading-6 text-zinc-400">
        <p>{t("conditionals.structureDescription")}</p>
        <p>{t("conditionals.structureBranches")}</p>
      </div>
    </div>
  );
}

function ForAnatomyGuide(): React.JSX.Element {
  const { t } = useTranslation("programmingFundamentals");
  const parts = [
    ["int i = 0", t("iteration.initializationPart"), t("iteration.initializationDescription"), "border-cyan-400/50", "text-cyan-300"],
    ["i < n", t("iteration.conditionPart"), t("iteration.conditionDescription"), "border-amber-400/50", "text-amber-300"],
    ["++i", t("iteration.updatePart"), t("iteration.updateDescription"), "border-emerald-400/50", "text-emerald-300"]
  ] as const;
  return (
    <div className="my-8 border-y border-zinc-800 py-6">
      <h3 className="text-lg font-semibold text-zinc-100">{t("iteration.anatomyTitle")}</h3>
      <div className="mt-5 overflow-x-auto pb-2">
        <code className="whitespace-nowrap font-mono text-base text-zinc-400">
          <span className="text-violet-300">for</span> (
          <span className="text-cyan-300">int i = 0</span>; <span className="text-amber-300">i &lt; n</span>; <span className="text-emerald-300">++i</span>)
        </code>
      </div>
      <div className="mt-4 grid gap-5 sm:grid-cols-3">
        {parts.map(([code, title, description, borderColor, textColor]) => (
          <div key={code} className={cn("border-l pl-3", borderColor)}>
            <code className={cn("text-xs", textColor)}>{code}</code>
            <strong className={cn("mt-1 block text-sm", textColor)}>{title}</strong>
            <p className="mt-1 text-xs leading-5 text-zinc-500">{description}</p>
          </div>
        ))}
      </div>
      <p className="mt-5 text-sm leading-6 text-zinc-400"><code className="text-violet-300">for (;;)</code> {t("iteration.emptyForDescription")}</p>
    </div>
  );
}

function WhileAnatomyGuide(): React.JSX.Element {
  const { t } = useTranslation("programmingFundamentals");
  const variable = t("iteration.whileVariable");
  const parts = [
    [`int ${variable} = 3`, t("iteration.whileStartPart"), t("iteration.whileStartDescription"), "border-cyan-400/50", "text-cyan-300"],
    [`${variable} > 0`, t("iteration.whileConditionPart"), t("iteration.whileConditionDescription"), "border-amber-400/50", "text-amber-300"],
    [`--${variable}`, t("iteration.whileUpdatePart"), t("iteration.whileUpdateDescription"), "border-emerald-400/50", "text-emerald-300"]
  ] as const;
  return (
    <div className="my-8 border-y border-zinc-800 py-6">
      <h3 className="text-lg font-semibold text-zinc-100">{t("iteration.whileAnatomyTitle")}</h3>
      <code className="mt-5 block overflow-x-auto whitespace-nowrap font-mono text-base leading-7 text-zinc-300">
        <span className="block text-cyan-300">int {variable} = 3;</span>
        <span className="block"><span className="text-violet-300">while</span> (<span className="text-amber-300">{variable} &gt; 0</span>) {"{"}</span>
        <span className="block pl-4">cout &lt;&lt; {variable} &lt;&lt; ' ';</span>
        <span className="block pl-4 text-emerald-300">--{variable};</span>
        <span className="block">{"}"}</span>
      </code>
      <div className="mt-5 grid gap-5 sm:grid-cols-3">
        {parts.map(([code, title, description, borderColor, textColor]) => (
          <div key={code} className={cn("border-l pl-3", borderColor)}>
            <code className={cn("text-xs", textColor)}>{code}</code>
            <strong className={cn("mt-1 block text-sm", textColor)}>{title}</strong>
            <p className="mt-1 text-xs leading-5 text-zinc-500">{description}</p>
          </div>
        ))}
      </div>
    </div>
  );
}

function FunctionAnatomyGuide(): React.JSX.Element {
  const { t } = useTranslation("programmingFundamentals");
  return (
    <div className="my-8 border-y border-zinc-800 py-6">
      <h3 className="text-lg font-semibold text-zinc-100">{t("functions.anatomyTitle")}</h3>
      <code className="mt-5 block overflow-x-auto whitespace-nowrap font-mono text-base">
        <span className="text-emerald-300">int</span> <span className="text-zinc-200">{t("functions.exampleName")}</span>(<span className="text-cyan-300">{t("functions.exampleParameters")}</span>)
      </code>
      <div className="mt-5 grid gap-5 sm:grid-cols-2">
        <div className="border-l border-emerald-400/50 pl-3">
          <strong className="text-sm text-emerald-200">{t("functions.outputTitle")}</strong>
          <p className="mt-1 text-sm leading-6 text-zinc-400">{t("functions.outputDescription")}</p>
        </div>
        <div className="border-l border-cyan-400/50 pl-3">
          <strong className="text-sm text-cyan-200">{t("functions.inputTitle")}</strong>
          <p className="mt-1 text-sm leading-6 text-zinc-400">{t("functions.inputDescription")}</p>
        </div>
      </div>
      <p className="mt-5 text-sm leading-6 text-zinc-500">{t("functions.voidDescription")}</p>
    </div>
  );
}

function EarlyReturnComparison({ earlyReturnCode, helperVariableCode }: { earlyReturnCode: string; helperVariableCode: string }): React.JSX.Element {
  const { t } = useTranslation("programmingFundamentals");
  const examples = [
    [t("functions.earlyReturnDirectTitle"), t("functions.earlyReturnDirectDescription"), earlyReturnCode, "text-emerald-300"],
    [t("functions.helperVariableTitle"), t("functions.helperVariableDescription"), helperVariableCode, "text-amber-300"]
  ] as const;

  return (
    <div className="!mt-14 border-t border-zinc-800 pt-8">
      <p className="font-mono text-[10px] font-semibold uppercase tracking-[0.18em] text-emerald-400">{t("functions.earlyReturnEyebrow")}</p>
      <h3 className="mt-3 text-2xl font-semibold tracking-tight text-zinc-100">{t("functions.earlyReturnTitle")}</h3>
      <p className="mt-4">{t("functions.earlyReturnDescription")}</p>
      <div role="region" aria-label={t("functions.earlyReturnComparisonLabel")} className="mt-7 grid border-y border-zinc-800 lg:grid-cols-2">
        {examples.map(([title, description, code, color]) => (
          <article key={title} className="min-w-0 py-6 first:border-b first:border-zinc-800 lg:first:border-b-0 lg:first:pr-6 lg:last:border-l lg:last:border-zinc-800 lg:last:pl-6">
            <h4 className={cn("text-base font-semibold", color)}>{title}</h4>
            <p className="mt-2 text-sm leading-6 text-zinc-400">{description}</p>
            <div className="[&>div]:mb-0 [&>div]:mt-5">
              <GuideCodeBlock code={code} />
            </div>
          </article>
        ))}
      </div>
    </div>
  );
}

function RecursionAnatomyGuide(): React.JSX.Element {
  const { t } = useTranslation("programmingFundamentals");
  return (
    <div className="my-8 border-y border-zinc-800 py-6">
      <h3 className="text-lg font-semibold text-zinc-100">{t("recursion.structureTitle")}</h3>
      <code className="mt-5 block overflow-x-auto whitespace-nowrap font-mono text-sm leading-7 text-zinc-300">
        <span className="block"><span className="text-violet-300">void</span> countdown(<span className="text-cyan-300">int n</span>) {"{"}</span>
        <span className="block pl-4 text-amber-300">if (n == 0) return;</span>
        <span className="block pl-4">cout &lt;&lt; n &lt;&lt; ' ';</span>
        <span className="block pl-4 text-emerald-300">countdown(n - 1);</span>
        <span className="block">{"}"}</span>
      </code>
      <div className="mt-5 grid gap-5 sm:grid-cols-2">
        <div className="border-l border-amber-400/50 pl-3">
          <strong className="text-sm text-amber-200">{t("recursion.baseCaseTitle")}</strong>
          <p className="mt-1 text-sm leading-6 text-zinc-400">{t("recursion.baseCaseDescription")}</p>
        </div>
        <div className="border-l border-emerald-400/50 pl-3">
          <strong className="text-sm text-emerald-200">{t("recursion.recursiveStepTitle")}</strong>
          <p className="mt-1 text-sm leading-6 text-zinc-400">{t("recursion.recursiveStepDescription")}</p>
        </div>
      </div>
    </div>
  );
}

function TruthTables({ andCaption, orCaption, notCaption, resultLabel }: { andCaption: string; orCaption: string; notCaption: string; resultLabel: string }): React.JSX.Element {
  return (
    <div className="my-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
      <BinaryTruthTable operator="&&" caption={andCaption} operation={(a, b) => a && b} />
      <BinaryTruthTable operator="||" caption={orCaption} operation={(a, b) => a || b} />
      <div className="self-start overflow-hidden rounded-md border border-zinc-500">
        <table className="w-full border-collapse text-center font-mono text-xs">
          <caption className="sr-only">{notCaption}</caption>
          <thead><tr><th className="border border-zinc-500 px-3 py-3 font-medium text-amber-300">!A</th><TruthHeading value={false} /><TruthHeading value /></tr></thead>
          <tbody className="bg-zinc-950">
            <tr><th scope="row" className="border border-zinc-500 px-3 py-3 font-medium text-zinc-400">{resultLabel}</th><TruthCell value /><TruthCell value={false} /></tr>
          </tbody>
        </table>
      </div>
    </div>
  );
}

function BinaryTruthTable({ operator, caption, operation }: { operator: "&&" | "||"; caption: string; operation: (a: boolean, b: boolean) => boolean }): React.JSX.Element {
  return (
    <div className="overflow-hidden rounded-md border border-zinc-500">
      <table className="w-full border-collapse text-center font-mono text-xs">
        <caption className="sr-only">{caption}</caption>
        <thead><tr><th className="border border-zinc-500 px-3 py-3 font-medium text-amber-300"><span className="text-zinc-400">A↓ B→</span> {operator}</th><TruthHeading value={false} /><TruthHeading value /></tr></thead>
        <tbody className="bg-zinc-950">
          {[false, true].map((a) => <tr key={String(a)}><TruthHeading value={a} scope="row" /><TruthCell value={operation(a, false)} /><TruthCell value={operation(a, true)} /></tr>)}
        </tbody>
      </table>
    </div>
  );
}

function TruthHeading({ value, scope = "col" }: { value: boolean; scope?: "col" | "row" }): React.JSX.Element { return <th scope={scope} className="border border-zinc-500 px-3 py-3 font-medium text-zinc-400">{String(value)}</th>; }
function TruthCell({ value }: { value: boolean }): React.JSX.Element { return <td className={cn("border border-zinc-500 px-3 py-3", value ? "text-emerald-300" : "text-zinc-400")}>{String(value)}</td>; }
