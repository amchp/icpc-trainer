import { LEARNING_GUIDE_IDS, LEARNING_PROGRESS_STATUSES } from "@icpc-trainer/shared";
import { useAuth } from "@clerk/clerk-react";
import { Link } from "@tanstack/react-router";
import { Check, ChevronLeft, ExternalLink, RotateCcw } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { useTranslation } from "react-i18next";

import { appPaths } from "./appNavigation.js";
import { Button } from "./components/ui.js";
import "./i18n/registerGraphTheoryResources.js";
import { cn } from "./lib.js";
import { GuideSidebar } from "./learning/GuideSidebar.js";
import {
  BfsLayerConceptPlayer,
  BipartiteToolTrace,
  ConnectivityConceptPlayer,
  DijkstraToolTrace,
  GraphRepresentationPrimer,
  GridBfsToolTrace,
  GridDfsToolTrace,
  IndegreeConceptPlayer,
  KahnToolTrace,
  LabyrinthProblemAnimation,
  RelaxationConceptPlayer,
  RoomsProblemAnimation,
  RoutesProblemAnimation,
  ScheduleProblemAnimation,
  TeamsProblemAnimation
} from "./learning/graph/GraphTheoryInteractions.js";
import { ProblemFirstChallenge } from "./learning/ProblemFirstChallenge.js";
import { useToaster } from "./Toaster.js";
import { useLearningProgress, useSetLearningProgressStatus, useStartLearningGuide } from "./useLearningProgress.js";

const GUIDE_ID = LEARNING_GUIDE_IDS.GraphTheory;

export function GraphTheoryPage(): React.JSX.Element {
  const { t } = useTranslation("graphTheory");
  const { userId } = useAuth();
  const progressQuery = useLearningProgress();
  const startGuide = useStartLearningGuide();
  const setStatus = useSetLearningProgressStatus();
  const toaster = useToaster();
  const startedForUser = useRef<string | null>(null);
  const progress = progressQuery.data?.find((row) => row.guideId === GUIDE_ID);
  const completed = progress?.status === LEARNING_PROGRESS_STATUSES.Completed;
  const sections = [
    ["rooms", t("sections.rooms")], ["labyrinth", t("sections.labyrinth")], ["teams", t("sections.teams")],
    ["schedule", t("sections.schedule")], ["routes", t("sections.routes")], ["practice", t("sections.practice")]
  ] as const;
  const [activeSection, setActiveSection] = useState<string>(sections[0][0]);

  useEffect(() => {
    if (userId === null || userId === undefined || startedForUser.current === userId) return;
    startedForUser.current = userId;
    startGuide.mutate(GUIDE_ID, { onError: () => toaster.error({ title: t("progress.saveError"), description: t("progress.saveErrorDescription") }) });
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
      onSuccess: () => toaster.success({ title: completed ? t("progress.inProgress") : t("progress.completed"), description: completed ? t("progress.inProgressDescription") : t("progress.completedDescription") }),
      onError: () => toaster.error({ title: t("progress.updateError"), description: t("progress.updateErrorDescription") })
    });
  };

  const challengeLabels = {
    constraintsLabel: t("challenge.constraints"), sampleLabel: t("challenge.sample"), sourceLabel: t("challenge.source"),
    problemStageLabel: t("challenge.problemStage"), attemptPrompt: t("challenge.attempt"), attemptStageLabel: t("challenge.attemptStage"),
    revealLabel: t("challenge.reveal"), hideLabel: t("challenge.hide"), applicationPrompt: t("challenge.applicationPrompt"),
    applicationRevealLabel: t("challenge.applicationReveal"), applicationHideLabel: t("challenge.applicationHide"),
    toolStageLabel: t("challenge.toolStage"), applicationStageLabel: t("challenge.applicationStage")
  } as const;

  return (
    <main className="min-w-0 overflow-x-clip pb-24 text-zinc-200">
      <header className="relative mx-auto max-w-6xl px-5 pb-12 pt-10 sm:px-8 sm:pb-16 sm:pt-16">
        <Link to={appPaths.resources} className="relative inline-flex items-center gap-2 text-sm text-zinc-400 transition-colors hover:text-zinc-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-300">
          <ChevronLeft className="size-4" aria-hidden="true" /> {t("roadmap")}
        </Link>
        <div className="relative mt-12 grid gap-8 lg:grid-cols-[1fr_17rem] lg:items-end">
          <div>
            <p className="guide-rise font-mono text-xs font-semibold uppercase tracking-[0.18em] text-emerald-400">{t("eyebrow")}</p>
            <h1 className="guide-rise mt-4 max-w-4xl text-4xl font-semibold tracking-[-0.05em] text-zinc-50 [animation-delay:80ms] sm:text-6xl">{t("title")}</h1>
            <p className="guide-rise mt-6 max-w-2xl text-lg leading-8 text-zinc-400 [animation-delay:160ms]">{t("subtitle")}</p>
          </div>
          <div className="guide-rise border-l border-emerald-400/60 pl-5 text-sm leading-6 text-zinc-400 [animation-delay:240ms]">
            <strong className="block text-zinc-100">{t("heroNoteTitle")}</strong>{t("heroNote")}
          </div>
        </div>
        <div className="mt-14 grid grid-cols-2 gap-x-6 gap-y-4 sm:grid-cols-4" aria-label={t("conceptsLabel")}>
          <ConceptStripe color="bg-emerald-400" label={t("concepts.model")} delay="0ms" />
          <ConceptStripe color="bg-cyan-400" label={t("concepts.traverse")} delay="90ms" />
          <ConceptStripe color="bg-violet-400" label={t("concepts.invariant")} delay="180ms" />
          <ConceptStripe color="bg-rose-400" label={t("concepts.prove")} delay="270ms" />
        </div>
      </header>

      <div className="mx-auto max-w-7xl px-5 sm:px-8 lg:grid lg:grid-cols-[14rem_minmax(0,1fr)] lg:gap-12">
        <GuideSidebar sections={sections.map(([id, label]) => ({ id, label }))} activeSection={activeSection} label={t("sidebar.label")} progressLabel={(current, total) => t("sidebar.progress", { current, total })} />
        <div className="min-w-0">
          <GuideSection id="rooms" title={t("sections.rooms")}>
            <ProblemFirstChallenge accent="emerald" {...challengeLabels} eyebrow={t("rooms.eyebrow")} title={t("rooms.title")} description={t("rooms.description")} constraints={t("rooms.constraints")} sample={t("rooms.sample")} sourceUrl="https://cses.fi/problemset/task/1192" toolTitle={t("rooms.toolTitle")} applicationTitle={t("rooms.applicationTitle")} application={<Application arc="rooms" explanation={t("rooms.explanation")} animation={<RoomsProblemAnimation />} />}>
              <ToolFoundation arc="rooms" /><p>{t("rooms.toolText")}</p><ConnectivityConceptPlayer /><GridDfsToolTrace />
            </ProblemFirstChallenge>
          </GuideSection>

          <GuideSection id="labyrinth" title={t("sections.labyrinth")}>
            <ProblemFirstChallenge accent="cyan" {...challengeLabels} eyebrow={t("labyrinth.eyebrow")} title={t("labyrinth.title")} description={t("labyrinth.description")} constraints={t("labyrinth.constraints")} sample={t("labyrinth.sample")} sourceUrl="https://cses.fi/problemset/task/1193" toolTitle={t("labyrinth.toolTitle")} applicationTitle={t("labyrinth.applicationTitle")} application={<Application arc="labyrinth" explanation={t("labyrinth.explanation")} animation={<LabyrinthProblemAnimation />} />}>
              <GraphRepresentationPrimer /><ToolFoundation arc="labyrinth" /><p>{t("labyrinth.toolText")}</p><BfsLayerConceptPlayer /><GridBfsToolTrace />
            </ProblemFirstChallenge>
          </GuideSection>

          <GuideSection id="teams" title={t("sections.teams")}>
            <ProblemFirstChallenge accent="violet" {...challengeLabels} eyebrow={t("teams.eyebrow")} title={t("teams.title")} description={t("teams.description")} constraints={t("teams.constraints")} sample={t("teams.sample")} sourceUrl="https://cses.fi/problemset/task/1668" toolTitle={t("teams.toolTitle")} applicationTitle={t("teams.applicationTitle")} application={<Application arc="teams" explanation={t("teams.explanation")} animation={<TeamsProblemAnimation />} />}>
              <ToolFoundation arc="teams" /><p>{t("teams.toolText")}</p><BipartiteToolTrace />
            </ProblemFirstChallenge>
          </GuideSection>

          <GuideSection id="schedule" title={t("sections.schedule")}>
            <ProblemFirstChallenge accent="emerald" {...challengeLabels} eyebrow={t("schedule.eyebrow")} title={t("schedule.title")} description={t("schedule.description")} constraints={t("schedule.constraints")} sample={t("schedule.sample")} sourceUrl="https://cses.fi/problemset/task/1679" toolTitle={t("schedule.toolTitle")} applicationTitle={t("schedule.applicationTitle")} application={<Application arc="schedule" explanation={t("schedule.explanation")} animation={<ScheduleProblemAnimation />} />}>
              <ToolFoundation arc="schedule" /><p>{t("schedule.toolText")}</p><IndegreeConceptPlayer /><KahnToolTrace />
            </ProblemFirstChallenge>
          </GuideSection>

          <GuideSection id="routes" title={t("sections.routes")}>
            <ProblemFirstChallenge accent="rose" {...challengeLabels} eyebrow={t("routes.eyebrow")} title={t("routes.title")} description={t("routes.description")} constraints={t("routes.constraints")} sample={t("routes.sample")} sourceUrl="https://cses.fi/problemset/task/1671" toolTitle={t("routes.toolTitle")} applicationTitle={t("routes.applicationTitle")} application={<Application arc="routes" explanation={`${t("routes.explanation")} ${t("routes.correction")}`} animation={<RoutesProblemAnimation />} />}>
              <ToolFoundation arc="routes" /><p>{t("routes.toolText")}</p><RelaxationConceptPlayer /><DijkstraToolTrace />
            </ProblemFirstChallenge>
          </GuideSection>

          <GuideSection id="practice" title={t("sections.practice")}>
            <p>{t("practice.intro")}</p>
            <ol className="mt-8 divide-y divide-zinc-800 overflow-hidden rounded-xl border border-zinc-800 bg-zinc-950/65">
              <PracticeLink number="01" title={t("practice.links.messageRoute")} url="https://cses.fi/problemset/task/1667" difficulty="CSES" tag={t("practice.tag")} />
              <PracticeLink number="02" title={t("practice.links.roundTrip")} url="https://cses.fi/problemset/task/1669" difficulty="CSES" tag={t("practice.tag")} />
              <PracticeLink number="03" title={t("practice.links.monsters")} url="https://cses.fi/problemset/task/1194" difficulty="CSES" tag={t("practice.tag")} />
              <PracticeLink number="04" title={t("practice.links.highScore")} url="https://cses.fi/problemset/task/1673" difficulty="CSES" tag={t("practice.tag")} />
              <PracticeLink number="05" title={t("practice.links.flightDiscount")} url="https://cses.fi/problemset/task/1195" difficulty="CSES" tag={t("practice.tag")} />
              <PracticeLink number="06" title={t("practice.links.maze")} url="https://codeforces.com/problemset/problem/377/A" difficulty="Codeforces · 1600" tag={t("practice.tag")} />
            </ol>
            <aside className="mt-12 rounded-xl border border-zinc-800 bg-zinc-950/45 p-5 sm:p-7">
              <p className="font-mono text-[10px] font-semibold uppercase tracking-[0.16em] text-cyan-300">{t("comparison.eyebrow")}</p>
              <h3 className="mt-3 text-2xl font-semibold tracking-tight text-zinc-50">{t("comparison.title")}</h3>
              <p className="mt-3 max-w-3xl text-sm leading-7 text-zinc-400">{t("comparison.intro")}</p>
              <div className="mt-6 overflow-x-auto"><table className="w-full min-w-[38rem] border-collapse text-left text-sm">
                <thead><tr className="border-b border-zinc-700 text-zinc-400"><th className="p-3">{t("comparison.algorithm")}</th><th className="p-3">{t("comparison.applies")}</th><th className="p-3">{t("comparison.complexity")}</th></tr></thead>
                <tbody>{(["dijkstra", "bellman", "floyd"] as const).map((algorithm) => <tr key={algorithm} className="border-b border-zinc-800 align-top"><th className="p-3 font-semibold text-zinc-100">{t(`comparison.${algorithm}.name`)}</th><td className="p-3 text-zinc-400">{t(`comparison.${algorithm}.applies`)}</td><td className="p-3 font-mono text-xs text-zinc-300">{t(`comparison.${algorithm}.complexity`)}</td></tr>)}</tbody>
              </table></div>
            </aside>
          </GuideSection>

          <section className="mt-20 border-t border-zinc-700 pt-10" aria-labelledby="graph-theory-finish-title">
            <p className="font-mono text-xs uppercase tracking-[0.18em] text-emerald-400">{t("finish.eyebrow")}</p>
            <h2 id="graph-theory-finish-title" className="mt-3 text-3xl font-semibold tracking-tight text-zinc-50">{t("finish.title")}</h2>
            <p className="mt-4 max-w-2xl leading-7 text-zinc-400">{t("finish.description")}</p>
            <div className="mt-8 flex flex-wrap items-center gap-4">
              <Button type="button" disabled={setStatus.isPending} onClick={changeStatus}>{completed ? <RotateCcw className="size-4" aria-hidden="true" /> : <Check className="size-4" aria-hidden="true" />}{completed ? t("finish.markProgress") : t("finish.markComplete")}</Button>
              <Link to={appPaths.resources} className="text-sm font-medium text-zinc-300 underline decoration-zinc-600 underline-offset-4 hover:text-white">{t("finish.back")}</Link>
            </div>
          </section>
        </div>
      </div>
    </main>
  );
}

function Application({ arc, explanation, animation }: { readonly arc: "rooms" | "labyrinth" | "teams" | "schedule" | "routes"; readonly explanation: string; readonly animation: React.ReactNode }): React.JSX.Element {
  const { t } = useTranslation("graphTheory");
  return <><p>{explanation}</p>{animation}<dl className="space-y-5 text-sm leading-7">
    {(["correctness", "complexity", "warning"] as const).map((item) => <div key={item}><dt className="font-semibold text-emerald-200">{t(`${arc}.pitfalls.${item}`)}</dt><dd className="mt-1 text-zinc-400">{t(`${arc}.pitfalls.${item}Text`)}</dd></div>)}
  </dl></>;
}

const foundationContent = {
  rooms: { title: "rooms.foundation.title", items: [["rooms.foundation.node.term", "rooms.foundation.node.definition"], ["rooms.foundation.edge.term", "rooms.foundation.edge.definition"], ["rooms.foundation.dfs.term", "rooms.foundation.dfs.definition"]] },
  labyrinth: { title: "labyrinth.foundation.title", items: [["labyrinth.foundation.bfs.term", "labyrinth.foundation.bfs.definition"], ["labyrinth.foundation.queue.term", "labyrinth.foundation.queue.definition"], ["labyrinth.foundation.parent.term", "labyrinth.foundation.parent.definition"]] },
  teams: { title: "teams.foundation.title", items: [["teams.foundation.bipartite.term", "teams.foundation.bipartite.definition"], ["teams.foundation.twoColour.term", "teams.foundation.twoColour.definition"], ["teams.foundation.conflict.term", "teams.foundation.conflict.definition"]] },
  schedule: { title: "schedule.foundation.title", items: [["schedule.foundation.directed.term", "schedule.foundation.directed.definition"], ["schedule.foundation.dag.term", "schedule.foundation.dag.definition"], ["schedule.foundation.indegree.term", "schedule.foundation.indegree.definition"]] },
  routes: { title: "routes.foundation.title", items: [["routes.foundation.weighted.term", "routes.foundation.weighted.definition"], ["routes.foundation.relaxation.term", "routes.foundation.relaxation.definition"], ["routes.foundation.nonnegative.term", "routes.foundation.nonnegative.definition"]] }
} as const;

function ToolFoundation({ arc }: { readonly arc: keyof typeof foundationContent }): React.JSX.Element {
  const { t } = useTranslation("graphTheory");
  const content = foundationContent[arc];
  return (
    <aside className="not-prose my-6 rounded-lg border border-zinc-800 bg-zinc-950/60 p-4 sm:p-5">
      <h5 className="font-mono text-[10px] font-semibold uppercase tracking-[0.16em] text-emerald-300">{t(content.title)}</h5>
      <dl className="mt-4 grid gap-4 sm:grid-cols-3">
        {content.items.map(([term, definition]) => (
          <div key={term} className="border-l-2 border-zinc-700 pl-3">
            <dt className="text-sm font-semibold text-zinc-100">{t(term)}</dt>
            <dd className="mt-1 text-sm leading-6 text-zinc-400">{t(definition)}</dd>
          </div>
        ))}
      </dl>
    </aside>
  );
}

function GuideSection({ id, title, children }: { readonly id: string; readonly title: string; readonly children: React.ReactNode }): React.JSX.Element {
  return <section id={id} className="scroll-mt-20 border-t border-zinc-800 py-16 sm:py-20"><div className="min-w-0 max-w-5xl"><h2 className="mb-8 text-3xl font-semibold tracking-tight text-emerald-300 sm:text-4xl">{title}</h2><div className="guide-copy space-y-5 text-base leading-8 text-zinc-300">{children}</div></div></section>;
}

function ConceptStripe({ color, label, delay }: { readonly color: string; readonly label: string; readonly delay: string }): React.JSX.Element {
  return <div><span className={cn("guide-grow block h-1.5 rounded-sm", color)} style={{ animationDelay: delay }} /><span className="mt-2 block font-mono text-[10px] uppercase tracking-wide text-zinc-500">{label}</span></div>;
}

function PracticeLink({ number, title, tag, difficulty, url }: { readonly number: string; readonly title: string; readonly tag: string; readonly difficulty: string; readonly url: string }): React.JSX.Element {
  return <li><a href={url} target="_blank" rel="noreferrer" className="group grid gap-3 px-5 py-5 outline-none transition-colors hover:bg-emerald-400/[0.04] focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-emerald-300 sm:grid-cols-[2rem_minmax(0,1fr)_auto] sm:items-center"><span className="font-mono text-xs text-emerald-300">{number}</span><span><strong className="block text-zinc-100">{title}</strong><span className="mt-1 block text-xs text-zinc-500">{tag} · {difficulty}</span></span><ExternalLink className="size-4 text-zinc-600 transition-colors group-hover:text-emerald-300" aria-hidden="true" /></a></li>;
}
