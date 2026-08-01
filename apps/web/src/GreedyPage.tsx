import { LEARNING_GUIDE_IDS, LEARNING_PROGRESS_STATUSES } from "@icpc-trainer/shared";
import { useAuth } from "@clerk/clerk-react";
import { Link } from "@tanstack/react-router";
import { Check, ChevronDown, ChevronLeft, ExternalLink, RotateCcw } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { useTranslation } from "react-i18next";

import { appPaths } from "./appNavigation.js";
import { Button } from "./components/ui.js";
import "./i18n/registerGreedyResources.js";
import { cn } from "./lib.js";
import {
  ActivitySelectionLab,
  ActivitySelectionTool,
  AlternatingLab,
  AlternatingTool,
  ChatRoomLab,
  ChatRoomTool,
  CoinChangeLab,
  CoinChangeTool,
  CoinCounterexampleLab,
  TwinsLab,
  TwinsTool
} from "./learning/greedy/GreedyInteractions.js";
import { GuideSidebar } from "./learning/GuideSidebar.js";
import { ProblemFirstChallenge } from "./learning/ProblemFirstChallenge.js";
import { useToaster } from "./Toaster.js";
import { useLearningProgress, useSetLearningProgressStatus, useStartLearningGuide } from "./useLearningProgress.js";

const GUIDE_ID = LEARNING_GUIDE_IDS.Greedy;

export function GreedyPage(): React.JSX.Element {
  const { t } = useTranslation("greedy");
  const { userId } = useAuth();
  const progressQuery = useLearningProgress();
  const startGuide = useStartLearningGuide();
  const setStatus = useSetLearningProgressStatus();
  const toaster = useToaster();
  const startedForUser = useRef<string | null>(null);
  const progress = progressQuery.data?.find((row) => row.guideId === GUIDE_ID);
  const completed = progress?.status === LEARNING_PROGRESS_STATUSES.Completed;
  const sections = [
    ["recognize", t("sections.recognize")],
    ["coins", t("sections.coins")],
    ["fails", t("sections.fails")],
    ["activities", t("sections.activities")],
    ["twins", t("sections.twins")],
    ["chat", t("sections.chat")],
    ["alternating", t("sections.alternating")],
    ["practice", t("sections.practice")]
  ] as const;
  const [activeSection, setActiveSection] = useState<string>(sections[0][0]);
  const [failureRevealed, setFailureRevealed] = useState(false);

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
    <main className="min-w-0 overflow-x-clip pb-24 text-zinc-200">
      <header className="relative mx-auto max-w-6xl px-5 pb-12 pt-10 sm:px-8 sm:pb-16 sm:pt-16">
        <Link to={appPaths.resources} className="relative inline-flex items-center gap-2 text-sm text-zinc-400 transition-colors motion-reduce:transition-none hover:text-zinc-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-300">
          <ChevronLeft className="size-4" aria-hidden="true" /> {t("roadmap")}
        </Link>
        <div className="relative mt-12 grid gap-8 lg:grid-cols-[1fr_17rem] lg:items-end">
          <div>
            <p className="guide-rise font-mono text-xs font-semibold uppercase tracking-[0.18em] text-emerald-400 motion-reduce:animate-none">{t("eyebrow")}</p>
            <h1 className="guide-rise mt-4 max-w-4xl text-4xl font-semibold tracking-[-0.05em] text-zinc-50 motion-reduce:animate-none [animation-delay:80ms] sm:text-6xl">{t("title")}</h1>
            <p className="guide-rise mt-6 max-w-2xl text-lg leading-8 text-zinc-400 motion-reduce:animate-none [animation-delay:160ms]">{t("subtitle")}</p>
          </div>
          <div className="guide-rise border-l border-emerald-400/60 pl-5 text-sm leading-6 text-zinc-400 motion-reduce:animate-none [animation-delay:240ms]">
            <strong className="block text-zinc-100">{t("heroNoteTitle")}</strong>
            {t("heroNote")}
          </div>
        </div>
        <div className="mt-14 grid grid-cols-2 gap-x-6 gap-y-4 sm:grid-cols-4" aria-label={t("conceptsLabel")}>
          <ConceptStripe color="bg-emerald-400" label={t("concepts.state")} delay="0ms" />
          <ConceptStripe color="bg-amber-400" label={t("concepts.choices")} delay="90ms" />
          <ConceptStripe color="bg-emerald-300" label={t("concepts.rule")} delay="180ms" />
          <ConceptStripe color="bg-amber-300" label={t("concepts.safety")} delay="270ms" />
        </div>
      </header>

      <div className="mx-auto max-w-7xl px-5 sm:px-8 lg:grid lg:grid-cols-[14rem_minmax(0,1fr)] lg:gap-12">
        <GuideSidebar sections={sections.map(([id, label]) => ({ id, label }))} activeSection={activeSection} label={t("sidebar.label")} progressLabel={(current, total) => t("sidebar.progress", { current, total })} />
        <div className="min-w-0">
          <GuideSection id="recognize" title={t("sections.recognize")} accent="amber">
            <div className="rounded-2xl border border-zinc-800 bg-zinc-950 p-5 shadow-2xl shadow-black/25 sm:p-7">
              <span className="font-mono text-[10px] font-semibold uppercase tracking-[0.16em] text-emerald-300">{t("recognize.introLabel")}</span>
              <p className="mt-3 text-lg font-medium leading-8 text-zinc-100">{t("recognize.intro")}</p>
              <p className="mt-4 max-w-4xl text-base leading-8 text-zinc-400">{t("recognize.method")}</p>
            </div>
          </GuideSection>

          <GuideSection id="coins" title={t("sections.coins")} accent="emerald">
            <ProblemFirstChallenge accent="emerald" {...challengeLabels} eyebrow={t("coins.eyebrow")} title={t("coins.title")} description={t("coins.description")} constraints={t("coins.constraints")} sample={t("coins.sample")} toolTitle={t("coins.toolTitle")} applicationTitle={t("coins.applicationTitle")} application={<><p>{t("coins.applicationText")}</p><CoinChangeLab /></>}>
              <p>{t("coins.toolText")}</p>
              <StrategyExample title={t("coins.exampleTitle")} intro={t("coins.exampleIntro")} items={[
                [t("recognize.recipe.state"), t("coins.example.state")],
                [t("recognize.recipe.choices"), t("coins.example.choices")],
                [t("recognize.recipe.rule"), t("coins.example.rule")],
                [t("recognize.recipe.update"), t("coins.example.update")],
                [t("recognize.recipe.safety"), t("coins.example.safety")]
              ]} />
              <CoinChangeTool />
            </ProblemFirstChallenge>
          </GuideSection>

          <GuideSection id="fails" title={t("sections.fails")} accent="rose">
            <div className="overflow-hidden rounded-xl border border-zinc-800 bg-zinc-950/70">
              <div className="p-5 sm:p-7"><p className="font-mono text-[10px] font-semibold uppercase tracking-[0.18em] text-rose-300">{t("fails.eyebrow")}</p><h3 className="mt-3 text-2xl font-semibold tracking-tight text-zinc-50">{t("fails.title")}</h3><p className="mt-4 leading-7 text-zinc-300">{t("fails.prompt")}</p></div>
              <div className="border-t border-zinc-800">
                <button type="button" aria-label={failureRevealed ? t("fails.hide") : t("fails.reveal")} aria-expanded={failureRevealed} aria-controls="greedy-counterexample-panel" className="group flex min-h-14 w-full items-center justify-between gap-4 px-5 py-5 text-left text-sm font-semibold text-zinc-200 transition-colors motion-reduce:transition-none hover:text-zinc-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-300 sm:px-7" onClick={() => setFailureRevealed((value) => !value)}>
                  <span className="flex items-center gap-3"><span aria-hidden="true" className="h-4 w-px bg-rose-400" /><span>{failureRevealed ? t("fails.hide") : t("fails.reveal")}</span></span>
                  <ChevronDown className={cn("size-4 text-zinc-500 transition-transform motion-reduce:transition-none", failureRevealed && "rotate-180")} aria-hidden="true" />
                </button>
              </div>
              {failureRevealed ? <section id="greedy-counterexample-panel" className="border-t border-zinc-800 p-5 sm:p-7"><h4 className="text-xl font-semibold text-rose-200">{t("fails.panelTitle")}</h4><p className="mt-3 text-sm leading-7 text-zinc-400">{t("fails.explanation")}</p><CoinCounterexampleLab /></section> : null}
            </div>
          </GuideSection>

          <GuideSection id="activities" title={t("sections.activities")} accent="cyan">
            <ProblemFirstChallenge accent="cyan" {...challengeLabels} eyebrow={t("activities.eyebrow")} title={t("activities.title")} description={t("activities.description")} constraints={t("activities.constraints")} sample={t("activities.sample")} toolTitle={t("activities.toolTitle")} applicationTitle={t("activities.applicationTitle")} application={<><p>{t("activities.applicationText")}</p><ActivitySelectionLab /></>}>
              <p>{t("activities.toolText")}</p>
              <StrategyExample title={t("activities.exampleTitle")} intro={t("activities.exampleIntro")} items={[
                [t("recognize.recipe.state"), t("activities.example.state")],
                [t("recognize.recipe.choices"), t("activities.example.choices")],
                [t("recognize.recipe.rule"), t("activities.example.rule")],
                [t("recognize.recipe.update"), t("activities.example.update")],
                [t("recognize.recipe.safety"), t("activities.example.safety")]
              ]} />
              <ActivitySelectionTool />
            </ProblemFirstChallenge>
          </GuideSection>

          <GuideSection id="twins" title={t("sections.twins")} accent="violet">
            <ProblemFirstChallenge accent="violet" {...challengeLabels} eyebrow={t("twins.eyebrow")} title={t("twins.title")} description={t("twins.description")} constraints={t("twins.constraints")} sample={t("twins.sample")} sourceUrl="https://codeforces.com/problemset/problem/160/A" toolTitle={t("twins.toolTitle")} applicationTitle={t("twins.applicationTitle")} application={<><p>{t("twins.applicationText")}</p><TwinsLab /></>}>
              <p>{t("twins.toolText")}</p><TwinsTool />
            </ProblemFirstChallenge>
          </GuideSection>

          <GuideSection id="chat" title={t("sections.chat")} accent="rose">
            <ProblemFirstChallenge accent="rose" {...challengeLabels} eyebrow={t("chat.eyebrow")} title={t("chat.title")} description={t("chat.description")} constraints={t("chat.constraints")} sample={t("chat.sample")} sourceUrl="https://codeforces.com/problemset/problem/58/A" toolTitle={t("chat.toolTitle")} applicationTitle={t("chat.applicationTitle")} application={<><p>{t("chat.applicationText")}</p><ChatRoomLab /></>}>
              <p>{t("chat.toolText")}</p><ChatRoomTool />
            </ProblemFirstChallenge>
          </GuideSection>

          <GuideSection id="alternating" title={t("sections.alternating")} accent="orange">
            <ProblemFirstChallenge accent="orange" {...challengeLabels} eyebrow={t("alternating.eyebrow")} title={t("alternating.title")} description={t("alternating.description")} constraints={t("alternating.constraints")} sample={t("alternating.sample")} sourceUrl="https://codeforces.com/problemset/problem/1343/C" toolTitle={t("alternating.toolTitle")} applicationTitle={t("alternating.applicationTitle")} application={<><p>{t("alternating.applicationText")}</p><AlternatingLab /></>}>
              <p>{t("alternating.toolText")}</p><AlternatingTool />
            </ProblemFirstChallenge>
          </GuideSection>

          <GuideSection id="practice" title={t("sections.practice")} accent="violet">
            <p>{t("practice.intro")}</p>
            <ol className="mt-8 divide-y divide-zinc-800 overflow-hidden rounded-xl border border-zinc-800 bg-zinc-950/65">
              <PracticeLink number="01" title={t("practice.links.twins")} tag={t("practice.exchange")} difficulty="Codeforces · 900" url="https://codeforces.com/problemset/problem/160/A" />
              <PracticeLink number="02" title={t("practice.links.chat")} tag={t("practice.earliest")} difficulty="Codeforces · 1000" url="https://codeforces.com/problemset/problem/58/A" />
              <PracticeLink number="03" title={t("practice.links.alternating")} tag={t("practice.blocks")} difficulty="Codeforces · 1200" url="https://codeforces.com/problemset/problem/1343/C" />
            </ol>
          </GuideSection>

          <section className="mt-20 border-t border-zinc-700 pt-10" aria-labelledby="greedy-finish-title">
            <p className="font-mono text-xs uppercase tracking-[0.18em] text-emerald-400">{t("finish.eyebrow")}</p>
            <h2 id="greedy-finish-title" className="mt-3 text-3xl font-semibold tracking-tight text-zinc-50">{t("finish.title")}</h2>
            <p className="mt-4 max-w-2xl leading-7 text-zinc-400">{t("finish.description")}</p>
            <div className="mt-8 flex flex-wrap items-center gap-4"><Button type="button" disabled={setStatus.isPending} onClick={changeStatus}>{completed ? <RotateCcw className="size-4" aria-hidden="true" /> : <Check className="size-4" aria-hidden="true" />}{completed ? t("finish.markProgress") : t("finish.markComplete")}</Button><Link to={appPaths.resources} className="text-sm font-medium text-zinc-300 underline decoration-zinc-600 underline-offset-4 hover:text-white">{t("finish.back")}</Link></div>
          </section>
        </div>
      </div>
    </main>
  );
}

const sectionAccents = {
  amber: { border: "border-amber-400/30", bar: "bg-amber-400", text: "text-amber-300" },
  cyan: { border: "border-cyan-400/30", bar: "bg-cyan-400", text: "text-cyan-300" },
  emerald: { border: "border-emerald-400/30", bar: "bg-emerald-400", text: "text-emerald-300" },
  orange: { border: "border-orange-400/30", bar: "bg-orange-400", text: "text-orange-300" },
  rose: { border: "border-rose-400/30", bar: "bg-rose-400", text: "text-rose-300" },
  violet: { border: "border-violet-400/30", bar: "bg-violet-400", text: "text-violet-300" }
} as const;

function GuideSection({ id, title, accent, children }: { readonly id: string; readonly title: string; readonly accent: keyof typeof sectionAccents; readonly children: React.ReactNode }): React.JSX.Element {
  const styles = sectionAccents[accent];
  return <section id={id} className={cn("scroll-mt-20 border-t py-16 sm:py-20", styles.border)}><div className="min-w-0 max-w-5xl"><div className="mb-8 flex items-center gap-4"><span className={cn("h-9 w-1.5 shrink-0 rounded-full", styles.bar)} aria-hidden="true" /><h2 className={cn("text-3xl font-semibold tracking-tight sm:text-4xl", styles.text)}>{title}</h2></div><div className="guide-copy min-w-0 space-y-5 text-base leading-8 text-zinc-300">{children}</div></div></section>;
}

function StrategyExample({ title, intro, items }: { readonly title: string; readonly intro: string; readonly items: readonly (readonly [string, string])[] }): React.JSX.Element {
  const colors = ["border-cyan-400/35 bg-cyan-400/[0.04]", "border-amber-400/35 bg-amber-400/[0.04]", "border-emerald-400/35 bg-emerald-400/[0.04]", "border-violet-400/35 bg-violet-400/[0.04]", "border-rose-400/35 bg-rose-400/[0.04]"] as const;
  const labels = ["text-cyan-300", "text-amber-300", "text-emerald-300", "text-violet-300", "text-rose-300"] as const;
  return <aside className="my-7 rounded-xl border border-zinc-700 bg-zinc-950/80 p-4 sm:p-5"><h5 className="text-lg font-semibold text-zinc-50">{title}</h5><p className="mt-2 text-sm leading-6 text-zinc-400">{intro}</p><dl className="mt-5 grid min-w-0 gap-3 sm:grid-cols-2"><div className={cn("min-w-0 rounded-lg border p-4 sm:col-span-2", colors[0])}><dt className={cn("font-mono text-[10px] font-semibold uppercase tracking-[0.16em]", labels[0])}>{items[0]?.[0]}</dt><dd className="mt-2 text-sm leading-6 text-zinc-200">{items[0]?.[1]}</dd></div>{items.slice(1).map(([label, description], index) => <div key={label} className={cn("min-w-0 rounded-lg border p-4", colors[index + 1])}><dt className={cn("font-mono text-[10px] font-semibold uppercase tracking-[0.16em]", labels[index + 1])}>{label}</dt><dd className="mt-2 text-sm leading-6 text-zinc-200">{description}</dd></div>)}</dl></aside>;
}

function ConceptStripe({ color, label, delay }: { readonly color: string; readonly label: string; readonly delay: string }): React.JSX.Element {
  return <div><span className={cn("guide-grow block h-1.5 rounded-sm motion-reduce:animate-none", color)} style={{ animationDelay: delay }} /><span className="mt-2 block font-mono text-[10px] uppercase tracking-wide text-zinc-500">{label}</span></div>;
}

function PracticeLink({ number, title, tag, difficulty, url }: { readonly number: string; readonly title: string; readonly tag: string; readonly difficulty: string; readonly url: string }): React.JSX.Element {
  return <li><a href={url} target="_blank" rel="noreferrer" className="group grid gap-3 px-5 py-5 outline-none transition-colors motion-reduce:transition-none hover:bg-emerald-400/[0.04] focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-emerald-300 sm:grid-cols-[2rem_minmax(0,1fr)_auto] sm:items-center"><span className="font-mono text-xs text-emerald-300">{number}</span><span className="min-w-0"><strong className="block text-zinc-100">{title}</strong><span className="mt-1 block text-xs text-zinc-500">{tag} · {difficulty}</span></span><ExternalLink className="size-4 text-zinc-600 transition-colors motion-reduce:transition-none group-hover:text-emerald-300" aria-hidden="true" /></a></li>;
}
