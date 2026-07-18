import { LEARNING_GUIDE_IDS, LEARNING_PROGRESS_STATUSES } from "@icpc-trainer/shared";
import { useAuth } from "@clerk/clerk-react";
import { Link } from "@tanstack/react-router";
import { Check, ChevronLeft, RotateCcw } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { useTranslation } from "react-i18next";

import { appPaths } from "./appNavigation.js";
import { Button } from "./components/ui.js";
import { cn } from "./lib.js";
import { GuideCodeBlock } from "./learning/GuideCodeBlock.js";
import { FunctionTrace, LoopStepper, TypeExplorer } from "./learning/GuideDemos.js";
import { GuideSidebar } from "./learning/GuideSidebar.js";
import { PracticeQuestionSet } from "./learning/PracticeQuestionSet.js";
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
export function ProgrammingFundamentalsPage(): React.JSX.Element {
  const { t } = useTranslation("programmingFundamentals");
  const { userId } = useAuth();
  const sections = [
    ["bloques", t("sections.blocks")], ["representacion", t("sections.representation")], ["operadores", t("sections.operators")],
    ["condicionales", t("sections.conditionals")], ["iteracion", t("sections.iteration")], ["funciones", t("sections.functions")],
    ["vectores", t("sections.vectors")], ["recursion", t("sections.recursion")]
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
      </header>

      <div className="mx-auto max-w-7xl px-5 sm:px-8 lg:grid lg:grid-cols-[14rem_minmax(0,1fr)] lg:gap-12">
        <GuideSidebar sections={sections.map(([id, label]) => ({ id, label }))} activeSection={activeSection} />
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
          <p>{t("representation.p1")}</p>
          <TypeExplorer />
          <GuideCodeBlock code={`bool listo = true;\nint problemas = 5;\ndouble promedio = 2.5;\nchar categoria = 'A';`} />
          <PracticeQuestionSet questions={[
            { question: t("representation.question"), options: ["bool", "int", "double"], correctOption: 1, explanation: t("representation.explanation") },
            { question: t("representation.question2"), options: ["bool", "int", "double"], correctOption: 0, explanation: t("representation.explanation2") }
          ]} />
        </GuideSection>

        <GuideSection id="operadores" accent={accents.representation} title={t("operators.title")}>
          <p>{t("operators.p1")}</p>
          <GuideCodeBlock code={`int a = 5, b = 2;\nint suma = a + b;       // 7\nint cociente = a / b;   // 2\nint residuo = a % b;    // 1\ndouble exacto = double(a) / b; // 2.5`} />
          <div className="my-10 grid gap-8 border-y border-zinc-800 py-8 sm:grid-cols-2">
            <div><h3 className="text-sm font-semibold text-zinc-100">{t("operators.comparisons")}</h3><p className="mt-2 text-sm text-zinc-400"><code>&lt;</code>, <code>&gt;</code>, <code>&lt;=</code>, <code>&gt;=</code>, <code>==</code>, <code>!=</code> {t("operators.comparisonsText")}</p></div>
            <div><h3 className="text-sm font-semibold text-zinc-100">{t("operators.logic")}</h3><p className="mt-2 text-sm text-zinc-400"><code>&amp;&amp;</code>, <code>||</code>, <code>!</code>: {t("operators.logicText")}</p></div>
          </div>
          <PracticeQuestionSet questions={[
            { question: t("operators.question"), options: ["2", "2.5", "Error"], correctOption: 0, explanation: t("operators.explanation") },
            { question: t("operators.question2"), options: ["2", "2.5", "Error"], correctOption: 1, explanation: t("operators.explanation2") }
          ]} />
        </GuideSection>

        <GuideSection id="condicionales" accent={accents.conditionals} title={t("conditionals.title")}>
          <p>{t("conditionals.p1")}</p>
          <ConditionalDemo />
          <GuideCodeBlock code={`if (esta_lloviendo) {\n  cout << "Lleva paraguas";\n} else if (esta_nevando) {\n  cout << "No salgas";\n} else {\n  cout << "Sal tranquilo";\n}`} />
        </GuideSection>

        <GuideSection id="iteracion" accent={accents.iteration} title={t("iteration.title")}>
          <p>{t("iteration.p1")}</p>
          <LoopStepper />
          <GuideCodeBlock code={`for (int i = 1; i <= 5; ++i) {\n  cout << i << ' ';\n}\n// imprime: 1 2 3 4 5`} />
          <p>{t("iteration.whileExplanation")}</p>
          <GuideCodeBlock code={`int restantes = 3;\nwhile (restantes > 0) {\n  cout << restantes << ' ';\n  --restantes;\n}\n// imprime: 3 2 1`} />
          <PracticeQuestionSet questions={[
            { question: t("iteration.question"), options: ["5 4 3 2 1", "5 6", t("iteration.nothing")], correctOption: 2, explanation: t("iteration.explanation") },
            { question: t("iteration.question2"), options: ["1 2 3", "1 2", t("iteration.nothing")], correctOption: 0, explanation: t("iteration.explanation2") }
          ]} />
        </GuideSection>

        <GuideSection id="funciones" accent={accents.functions} title={t("functions.title")}>
          <p>{t("functions.p1")}</p>
          <GuideCodeBlock code={`int sumar(int x, int y) {\n  int resultado = x + y;\n  return resultado;\n}\n\nint total = sumar(7, 3); // 10`} />
          <FunctionTrace />
        </GuideSection>

        <GuideSection id="vectores" accent={accents.iteration} title={t("vectors.title")}>
          <p>{t("vectors.p1")}</p>
          <GuideCodeBlock code={`vector<int> valores = {1, 2, 3};\nvalores.push_back(4);\n\nfor (int i = 0; i < valores.size(); ++i) {\n  if (i == 2) continue;\n  cout << valores[i] << ' ';\n}\n// imprime: 1 2 4`} />
          <p><code>continue</code> {t("vectors.p2Start")} <code>break</code> {t("vectors.p2End")}</p>
          <PracticeQuestionSet questions={[
            { question: t("vectors.question"), options: ["1 2", "1 2 4 5", "3 4 5"], correctOption: 1, explanation: t("vectors.explanation") },
            { question: t("vectors.question2"), options: ["2", "3", "4"], correctOption: 1, explanation: t("vectors.explanation2") }
          ]} />
        </GuideSection>

        <GuideSection id="recursion" accent={accents.functions} title={t("recursion.title")}>
          <p>{t("recursion.p1")}</p>
          <RecursionDemo />
          <GuideCodeBlock code={`int factorial(int x) {\n  if (x == 1) return 1;\n  return x * factorial(x - 1);\n}`} />
          <PracticeQuestionSet questions={[
            { question: t("recursion.question"), options: [t("recursion.parameter"), t("recursion.baseCase"), t("recursion.multiplication")], correctOption: 1, explanation: t("recursion.explanation") },
            { question: t("recursion.question2"), options: ["3", "6", "9"], correctOption: 1, explanation: t("recursion.explanation2") }
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

function DemoPanel({ label, accent, children }: { label: string; accent: string; children: React.ReactNode }): React.JSX.Element {
  return (
    <div className="relative my-10 rounded-lg border border-zinc-800 bg-zinc-900/25 p-6 sm:p-8">
      <span className={cn("absolute -top-2 left-5 bg-[#09090b] px-2 font-mono text-[10px] uppercase tracking-[0.18em]", accent)}>{label}</span>
      {children}
    </div>
  );
}
function Term({ color, children }: { color: string; children: React.ReactNode }): React.JSX.Element { return <strong className={cn("font-semibold", color)}>{children}</strong>; }
function Block({ color, symbol, title }: { color: string; symbol: string; title: string }): React.JSX.Element { return <div className="bg-zinc-950 p-6 text-center"><span className={cn("mx-auto grid size-12 place-items-center rounded-sm font-mono font-bold text-zinc-950", color)}>{symbol}</span><strong className="mt-3 block text-sm text-zinc-200">{title}</strong></div>; }

function ConditionalDemo(): React.JSX.Element {
  const { t } = useTranslation("programmingFundamentals");
  const [rain, setRain] = useState(false); const [snow, setSnow] = useState(false);
  const result = rain ? t("demos.umbrella") : snow ? t("demos.stayIn") : t("demos.goOut");
  return <DemoPanel label={t("demos.simulate")} accent="text-amber-300"><div className="grid gap-7 sm:grid-cols-2"><div className="space-y-3">{[[t("demos.raining"), rain, setRain], [t("demos.snowing"), snow, setSnow]].map(([label, checked, setter]) => <label key={String(label)} className="flex cursor-pointer items-center justify-between border-b border-zinc-800 py-3 text-sm"><span>{String(label)}</span><input type="checkbox" checked={Boolean(checked)} onChange={(event) => (setter as React.Dispatch<React.SetStateAction<boolean>>)(event.target.checked)} className="size-4 accent-amber-400" /></label>)}</div><div className="flex min-h-28 items-center border-l-2 border-amber-400 pl-6"><div><span className="font-mono text-xs uppercase tracking-[0.14em] text-zinc-500">{t("demos.selectedBranch")}</span><output className="mt-2 block text-2xl font-semibold text-amber-200">{result}</output></div></div></div></DemoPanel>;
}

function RecursionDemo(): React.JSX.Element {
  const { t } = useTranslation("programmingFundamentals");
  const [depth, setDepth] = useState(1); const calls = [4, 3, 2, 1].slice(0, depth);
  return <DemoPanel label={t("demos.callStack")} accent="text-emerald-300"><div className="flex min-h-64 flex-col-reverse justify-start gap-2">{calls.map((value, index) => <div key={value} className="flex items-center justify-between rounded-r-md border-l-2 border-emerald-400 bg-emerald-400/5 px-4 py-3 font-mono text-sm" style={{ marginLeft: `${index * 18}px` }}><span>factorial({value})</span><span className="text-emerald-300">{value === 1 ? "return 1" : `${value} × factorial(${value - 1})`}</span></div>)}</div><div className="mt-5 flex gap-2"><button type="button" className="rounded-md border border-zinc-700 px-3 py-2 text-sm transition-colors hover:border-zinc-500 disabled:opacity-40" disabled={depth === 1} onClick={() => setDepth((value) => value - 1)}>{t("demos.previous")}</button><button type="button" className="rounded-md bg-emerald-500 px-3 py-2 text-sm font-semibold text-zinc-950 transition-colors hover:bg-emerald-400 disabled:opacity-40" disabled={depth === 4} onClick={() => setDepth((value) => value + 1)}>{t("demos.nextCall")}</button></div></DemoPanel>;
}
