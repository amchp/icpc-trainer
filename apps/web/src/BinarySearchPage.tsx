import { LEARNING_GUIDE_IDS, LEARNING_PROGRESS_STATUSES } from "@icpc-trainer/shared";
import { useAuth } from "@clerk/clerk-react";
import { Link } from "@tanstack/react-router";
import { Check, ChevronLeft, ExternalLink, RotateCcw } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { useTranslation } from "react-i18next";

import { appPaths } from "./appNavigation.js";
import { Button } from "./components/ui.js";
import "./i18n/registerBinarySearchResources.js";
import { cn } from "./lib.js";
import {
  BinarySearchToolTrace,
  ClosestValueLab,
  ConditionPatternLab,
  FirstBadVersionLab,
  FirstOccurrenceLab,
  MagicPowderLab,
  MotivationLab,
  NumericSearchLab
} from "./learning/BinarySearchInteractions.js";
import { GuideSidebar } from "./learning/GuideSidebar.js";
import { ProblemFirstChallenge } from "./learning/ProblemFirstChallenge.js";
import { useToaster } from "./Toaster.js";
import { useLearningProgress, useSetLearningProgressStatus, useStartLearningGuide } from "./useLearningProgress.js";

const GUIDE_ID = LEARNING_GUIDE_IDS.BinarySearch;

export function BinarySearchPage(): React.JSX.Element {
  const { t } = useTranslation("binarySearch");
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
    ["first", t("sections.first")],
    ["closest", t("sections.closest")],
    ["numeric", t("sections.numeric")],
    ["bad", t("sections.bad")],
    ["answer", t("sections.answer")],
    ["practice", t("sections.practice")]
  ] as const;
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
    <main className="min-w-0 overflow-x-clip pb-24 text-zinc-200">
      <header className="relative mx-auto max-w-6xl px-5 pb-12 pt-10 sm:px-8 sm:pb-16 sm:pt-16">
        <div className="pointer-events-none absolute right-8 top-14 hidden size-52 opacity-35 sm:block" aria-hidden="true">
          <div className="absolute inset-x-0 top-1/2 h-px bg-gradient-to-r from-transparent via-rose-400 to-transparent" />
          {[15, 35, 50, 66, 85].map((left, index) => <span key={left} className={cn("absolute top-1/2 size-3 -translate-x-1/2 -translate-y-1/2 rotate-45 border", index === 2 ? "border-cyan-200 bg-cyan-400" : "border-rose-400 bg-zinc-950")} style={{ left: `${left}%` }} />)}
        </div>
        <Link to={appPaths.resources} className="relative inline-flex items-center gap-2 text-sm text-zinc-400 transition-colors hover:text-zinc-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-rose-300">
          <ChevronLeft className="size-4" aria-hidden="true" /> {t("roadmap")}
        </Link>
        <div className="relative mt-12 grid gap-8 lg:grid-cols-[1fr_17rem] lg:items-end">
          <div>
            <p className="guide-rise font-mono text-xs font-semibold uppercase tracking-[0.18em] text-rose-400">{t("eyebrow")}</p>
            <h1 className="guide-rise mt-4 max-w-4xl text-4xl font-semibold tracking-[-0.05em] text-zinc-50 [animation-delay:80ms] sm:text-6xl">{t("title")}</h1>
            <p className="guide-rise mt-6 max-w-2xl text-lg leading-8 text-zinc-400 [animation-delay:160ms]">{t("subtitle")}</p>
          </div>
          <div className="guide-rise border-l border-rose-400/60 pl-5 text-sm leading-6 text-zinc-400 [animation-delay:240ms]">
            <strong className="block text-zinc-100">{t("heroNoteTitle")}</strong>
            {t("heroNote")}
          </div>
        </div>
        <div className="mt-14 grid grid-cols-2 gap-x-6 gap-y-4 sm:grid-cols-4" aria-label={t("conceptsLabel")}>
          <ConceptStripe color="bg-rose-400" label={t("concepts.condition")} delay="0ms" />
          <ConceptStripe color="bg-cyan-400" label={t("concepts.sentinels")} delay="90ms" />
          <ConceptStripe color="bg-rose-300" label={t("concepts.halve")} delay="180ms" />
          <ConceptStripe color="bg-cyan-300" label={t("concepts.verify")} delay="270ms" />
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
          <GuideSection id="recognize" title={t("sections.recognize")}>
            <figure className="overflow-hidden rounded-2xl border border-zinc-800 bg-zinc-950 shadow-2xl shadow-black/25">
              <img
                src="/learning/binary-search/dinosaur-sorted-objects.webp"
                alt={t("recognize.imageAlt")}
                width="1600"
                height="878"
                loading="lazy"
                className="block h-auto w-full"
              />
              <figcaption className="border-t border-zinc-800 bg-zinc-950/95 p-5 sm:p-7">
                <span className="font-mono text-[10px] font-semibold uppercase tracking-[0.16em] text-cyan-300">{t("recognize.storyLabel")}</span>
                <p className="mt-3 max-w-4xl text-base leading-8 text-zinc-300">{t("recognize.intro")}</p>
              </figcaption>
            </figure>
            <MotivationLab />
          </GuideSection>

          <GuideSection id="first" title={t("sections.first")}>
            <ProblemFirstChallenge
              accent="rose"
              {...challengeLabels}
              eyebrow={t("first.eyebrow")}
              title={t("first.title")}
              description={t("first.description")}
              constraints={t("first.constraints")}
              sample={t("first.sample")}
              sourceUrl="https://leetcode.com/problems/binary-search/"
              toolTitle={t("first.toolTitle")}
              applicationTitle={t("first.applicationTitle")}
              application={<><p>{t("first.toolText")}</p><FirstOccurrenceLab /></>}
            >
              <p>{t("first.toolText")}</p>
              <BinarySearchToolTrace orientation="false-true" example="first" />
            </ProblemFirstChallenge>
          </GuideSection>

          <GuideSection id="closest" title={t("sections.closest")}>
            <ProblemFirstChallenge
              accent="cyan"
              {...challengeLabels}
              eyebrow={t("closest.eyebrow")}
              title={t("closest.title")}
              description={t("closest.description")}
              constraints={t("closest.constraints")}
              sample={t("closest.sample")}
              toolTitle={t("closest.toolTitle")}
              applicationTitle={t("closest.applicationTitle")}
              application={<><p>{t("closest.toolText")}</p><ClosestValueLab /></>}
            >
              <p>{t("closest.toolText")}</p>
              <BinarySearchToolTrace orientation="true-false" example="closest" />
            </ProblemFirstChallenge>
          </GuideSection>

          <GuideSection id="numeric" title={t("sections.numeric")}>
            <ProblemFirstChallenge
              accent="rose"
              {...challengeLabels}
              eyebrow={t("numeric.eyebrow")}
              title={t("numeric.title")}
              description={t("numeric.description")}
              constraints={t("numeric.constraints")}
              sample={t("numeric.sample")}
              toolTitle={t("numeric.toolTitle")}
              applicationTitle={t("numeric.applicationTitle")}
              application={<><p>{t("numeric.toolText")}</p><NumericSearchLab /></>}
            >
              <p>{t("numeric.toolText")}</p>
              <BinarySearchToolTrace orientation="true-false" example="numeric" />
            </ProblemFirstChallenge>
          </GuideSection>

          <GuideSection id="bad" title={t("sections.bad")}>
            <ProblemFirstChallenge
              accent="cyan"
              {...challengeLabels}
              eyebrow={t("bad.eyebrow")}
              title={t("bad.title")}
              description={t("bad.description")}
              constraints={t("bad.constraints")}
              sample={t("bad.sample")}
              sourceUrl="https://leetcode.com/problems/first-bad-version/"
              toolTitle={t("bad.toolTitle")}
              applicationTitle={t("bad.applicationTitle")}
              application={<><p>{t("bad.toolText")}</p><FirstBadVersionLab /></>}
            >
              <p>{t("bad.toolText")}</p>
              <BinarySearchToolTrace orientation="false-true" example="bad" />
            </ProblemFirstChallenge>
          </GuideSection>

          <GuideSection id="answer" title={t("sections.answer")}>
            <ProblemFirstChallenge
              accent="rose"
              {...challengeLabels}
              eyebrow={t("magic.eyebrow")}
              title={t("magic.title")}
              description={t("magic.description")}
              constraints={t("magic.constraints")}
              sample={t("magic.sample")}
              sourceUrl="https://codeforces.com/problemset/problem/670/D2"
              toolTitle={t("magic.toolTitle")}
              applicationTitle={t("magic.applicationTitle")}
              application={<><p>{t("magic.toolText")}</p><MagicPowderLab /></>}
            >
              <p>{t("magic.toolText")}</p>
              <BinarySearchToolTrace orientation="true-false" example="magic" />
            </ProblemFirstChallenge>
          </GuideSection>

          <GuideSection id="practice" title={t("sections.practice")}>
            <p>{t("practice.intro")}</p>
            <ol className="mt-8 divide-y divide-zinc-800 overflow-hidden rounded-xl border border-zinc-800 bg-zinc-950/65">
              <PracticeLink number="01" title={t("practice.links.koko")} tag={t("practice.minimum")} difficulty="LeetCode · Medium" url="https://leetcode.com/problems/koko-eating-bananas/" />
              <PracticeLink number="02" title={t("practice.links.median")} tag={t("practice.maximum")} difficulty="Codeforces · 1400" url="https://codeforces.com/problemset/problem/1201/C" />
              <PracticeLink number="03" title={t("practice.links.scuza")} tag={t("practice.boundary")} difficulty="Codeforces · 1200" url="https://codeforces.com/problemset/problem/1742/E" />
              <PracticeLink number="04" title={t("practice.links.ruler")} tag={t("practice.interactive")} difficulty="Codeforces · 1500" url="https://codeforces.com/problemset/problem/1999/G1" />
              <PracticeLink number="05" title={t("practice.links.interview")} tag={t("practice.interactive")} difficulty="Codeforces · 1300" url="https://codeforces.com/problemset/problem/1807/E" />
              <PracticeLink number="06" title={t("practice.links.packing")} tag={t("practice.minimum")} difficulty={t("practice.unranked")} url="https://codeforces.com/edu/course/2/lesson/6/2/practice/contest/283932/problem/A" />
            </ol>
            <aside className="mt-12 rounded-xl border border-zinc-800 bg-zinc-950/45 p-5 sm:p-7">
              <p className="font-mono text-[10px] font-semibold uppercase tracking-[0.16em] text-cyan-300">{t("recognize.conditionTransitionEyebrow")}</p>
              <h3 className="mt-3 text-2xl font-semibold tracking-tight text-zinc-50">{t("recognize.conditionTransitionTitle")}</h3>
              <p className="mt-3 max-w-3xl text-sm leading-7 text-zinc-400">{t("recognize.conditionTransition")}</p>
              <ConditionPatternLab />
            </aside>
          </GuideSection>

          <section className="mt-20 border-t border-zinc-700 pt-10" aria-labelledby="binary-search-finish-title">
            <p className="font-mono text-xs uppercase tracking-[0.18em] text-rose-400">{t("finish.eyebrow")}</p>
            <h2 id="binary-search-finish-title" className="mt-3 text-3xl font-semibold tracking-tight text-zinc-50">{t("finish.title")}</h2>
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

function GuideSection({ id, title, children }: { readonly id: string; readonly title: string; readonly children: React.ReactNode }): React.JSX.Element {
  return (
    <section id={id} className="scroll-mt-20 border-t border-zinc-800 py-16 sm:py-20">
      <div className="min-w-0 max-w-5xl">
        <h2 className="mb-8 text-3xl font-semibold tracking-tight text-rose-300 sm:text-4xl">{title}</h2>
        <div className="guide-copy space-y-5 text-base leading-8 text-zinc-300">{children}</div>
      </div>
    </section>
  );
}

function ConceptStripe({ color, label, delay }: { readonly color: string; readonly label: string; readonly delay: string }): React.JSX.Element {
  return <div><span className={cn("guide-grow block h-1.5 rounded-sm", color)} style={{ animationDelay: delay }} /><span className="mt-2 block font-mono text-[10px] uppercase tracking-wide text-zinc-500">{label}</span></div>;
}

function PracticeLink({ number, title, tag, difficulty, url }: { readonly number: string; readonly title: string; readonly tag: string; readonly difficulty: string; readonly url: string }): React.JSX.Element {
  return (
    <li>
      <a href={url} target="_blank" rel="noreferrer" className="group grid gap-3 px-5 py-5 outline-none transition-colors hover:bg-rose-400/[0.04] focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-rose-300 sm:grid-cols-[2rem_minmax(0,1fr)_auto] sm:items-center">
        <span className="font-mono text-xs text-rose-300">{number}</span>
        <span><strong className="block text-zinc-100">{title}</strong><span className="mt-1 block text-xs text-zinc-500">{tag} · {difficulty}</span></span>
        <ExternalLink className="size-4 text-zinc-600 transition-colors group-hover:text-rose-300" aria-hidden="true" />
      </a>
    </li>
  );
}
