import { LEARNING_GUIDE_IDS, LEARNING_PROGRESS_STATUSES } from "@icpc-trainer/shared";
import { useAuth } from "@clerk/clerk-react";
import { Link } from "@tanstack/react-router";
import { Check, ChevronLeft, ExternalLink, FileCode2, RotateCcw } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { useTranslation } from "react-i18next";

import { appPaths } from "./appNavigation.js";
import { Button } from "./components/ui.js";
import { cn } from "./lib.js";
import { GuideCodeBlock } from "./learning/GuideCodeBlock.js";
import { GuideSidebar } from "./learning/GuideSidebar.js";
import { ChompGame } from "./learning/games/ChompGame.js";
import { PlateGame } from "./learning/games/PlateGame.js";
import { StonesGame } from "./learning/games/StonesGame.js";
import { useLearningProgress, useSetLearningProgressStatus, useStartLearningGuide } from "./useLearningProgress.js";
import { useToaster } from "./Toaster.js";

const GUIDE_ID = LEARNING_GUIDE_IDS.Introduction;

const sectionIds = ["contest-loop", "icpc", "plate-game", "languages", "workstation", "stones", "first-submission", "practice", "chomp", "next"] as const;

const watermelonSource = `#include <bits/stdc++.h>
using namespace std;

int main() {
    int weight;
    cin >> weight;
    cout << (weight > 2 && weight % 2 == 0 ? "YES" : "NO") << '\\n';
}`;

export function IntroductionPage(): React.JSX.Element {
  const { t } = useTranslation("introduction");
  const { userId } = useAuth();
  const progressQuery = useLearningProgress();
  const startGuide = useStartLearningGuide();
  const setStatus = useSetLearningProgressStatus();
  const toaster = useToaster();
  const startedForUser = useRef<string | null>(null);
  const progress = progressQuery.data?.find((row) => row.guideId === GUIDE_ID);
  const completed = progress?.status === LEARNING_PROGRESS_STATUSES.Completed;
  const [activeSection, setActiveSection] = useState<string>(sectionIds[0]);
  const sections = [
    [sectionIds[0], t("sections.mentalModel")], [sectionIds[1], t("sections.icpc")], [sectionIds[2], t("sections.plate")],
    [sectionIds[3], t("sections.languages")], [sectionIds[4], t("sections.setup")], [sectionIds[5], t("sections.stones")],
    [sectionIds[6], t("sections.codeforces")], [sectionIds[7], t("sections.practice")], [sectionIds[8], t("sections.chomp")],
    [sectionIds[9], t("sections.roadmap")]
  ] as const;

  useEffect(() => {
    if (userId === null || userId === undefined || startedForUser.current === userId) return;
    startedForUser.current = userId;
    startGuide.mutate(GUIDE_ID, {
      onError: () => toaster.error({ title: t("progress.saveError"), description: t("progress.saveErrorDescription") })
    });
  }, [startGuide, t, toaster, userId]);

  useEffect(() => {
    const observer = new IntersectionObserver((entries) => {
      const visible = entries.filter((entry) => entry.isIntersecting).sort((left, right) => right.intersectionRatio - left.intersectionRatio)[0];
      if (visible?.target.id) setActiveSection(visible.target.id);
    }, { rootMargin: "-20% 0px -65%", threshold: [0, 0.25, 0.6] });
    for (const id of sectionIds) {
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
        <div className="pointer-events-none absolute inset-0 opacity-20 [background-image:linear-gradient(to_right,#3f3f46_1px,transparent_1px),linear-gradient(to_bottom,#3f3f46_1px,transparent_1px)] [background-size:42px_42px] [mask-image:linear-gradient(to_bottom,black,transparent)]" />
        <div className="relative mx-auto max-w-6xl px-5 pb-14 pt-10 sm:px-8 sm:pb-20 sm:pt-16">
          <Link to={appPaths.resources} className="inline-flex items-center gap-2 text-sm text-zinc-400 transition-colors hover:text-zinc-100">
            <ChevronLeft className="size-4" aria-hidden="true" /> {t("roadmap")}
          </Link>
          <div className="mt-12">
            <p className="font-mono text-xs font-semibold uppercase tracking-[0.18em] text-cyan-300">{t("eyebrow")}</p>
            <h1 className="mt-4 max-w-4xl text-5xl font-semibold tracking-[-0.055em] text-zinc-50 sm:text-7xl">{t("title")}</h1>
            <p className="mt-6 max-w-2xl text-lg leading-8 text-zinc-400">{t("subtitle")}</p>
          </div>
        </div>
      </header>

      <div className="mx-auto max-w-7xl px-5 sm:px-8 lg:grid lg:grid-cols-[14rem_minmax(0,1fr)] lg:gap-12">
        <GuideSidebar
          sections={sections.map(([id, label]) => ({ id, label }))}
          activeSection={activeSection}
          label={t("routeLabel")}
          progressLabel={(current, total) => t("routeProgress", { current, total })}
        />

        <div className="min-w-0">
          <LessonSection id="contest-loop" title={t("mentalModel.title")}>
            <p>{t("mentalModel.p1")}</p>
            <article className="my-10 border-y border-zinc-800 py-8" aria-labelledby="watermelon-problem-title">
              <header>
                <h3 id="watermelon-problem-title" className="text-xl font-semibold text-zinc-50">{t("mentalModel.problemTitle")}</h3>
                <dl className="mt-3 flex flex-wrap gap-x-6 gap-y-1 font-mono text-xs text-zinc-500">
                  <div className="flex gap-2"><dt>{t("mentalModel.timeLimitLabel")}</dt><dd className="text-zinc-300">{t("mentalModel.timeLimit")}</dd></div>
                  <div className="flex gap-2"><dt>{t("mentalModel.memoryLimitLabel")}</dt><dd className="text-zinc-300">{t("mentalModel.memoryLimit")}</dd></div>
                </dl>
                <p className="mt-3 text-sm leading-7 text-blue-200">{t("mentalModel.limitsGuide")}</p>
              </header>

              <section className="mt-8" aria-labelledby="watermelon-statement-title">
                <h4 id="watermelon-statement-title" className="font-semibold text-zinc-100">{t("mentalModel.statementTitle")}</h4>
                <p className="mt-3 text-sm leading-7 text-zinc-400">{t("mentalModel.statementP1")}</p>
                <p className="mt-3 text-sm leading-7 text-zinc-400">{t("mentalModel.statementP2")}</p>
                <p className="mt-3 text-sm leading-7 text-blue-200">{t("mentalModel.statementGuide")}</p>
              </section>

              <section className="mt-8" aria-labelledby="watermelon-input-title">
                <h4 id="watermelon-input-title" className="font-semibold text-zinc-100">{t("mentalModel.inputTitle")}</h4>
                <p className="mt-3 text-sm leading-7 text-zinc-400">{t("mentalModel.inputText")}</p>
                <p className="mt-3 text-sm leading-7 text-blue-200">{t("mentalModel.inputGuide")}</p>
              </section>

              <section className="mt-8" aria-labelledby="watermelon-output-title">
                <h4 id="watermelon-output-title" className="font-semibold text-zinc-100">{t("mentalModel.outputTitle")}</h4>
                <p className="mt-3 text-sm leading-7 text-zinc-400">{t("mentalModel.outputText")}</p>
                <p className="mt-3 text-sm leading-7 text-blue-200">{t("mentalModel.outputGuide")}</p>
              </section>

              <section className="mt-8" aria-labelledby="watermelon-example-title">
                <h4 id="watermelon-example-title" className="font-semibold text-zinc-100">{t("mentalModel.exampleTitle")}</h4>
                <div className="mt-3 grid gap-3 sm:grid-cols-2">
                  <CommandBlock label={t("mentalModel.sampleInputLabel")} command={t("mentalModel.sampleInput")} />
                  <CommandBlock label={t("mentalModel.sampleOutputLabel")} command={t("mentalModel.sampleOutput")} />
                </div>
                <p className="mt-4 text-sm leading-7 text-zinc-400"><strong className="text-zinc-200">{t("mentalModel.noteTitle")}</strong> {t("mentalModel.noteText")}</p>
                <p className="mt-3 text-sm leading-7 text-blue-200">{t("mentalModel.exampleGuide")}</p>
              </section>
            </article>
            <p>{t("mentalModel.p2")}</p>
            <p>{t("mentalModel.p3")}</p>
            <p>{t("mentalModel.p4")}</p>
            <h3 className="text-base font-semibold text-zinc-100">{t("mentalModel.verdictsTitle")}</h3>
            <ul className="mt-4 grid gap-2 text-sm sm:grid-cols-2">
              {[t("mentalModel.verdicts.ac"), t("mentalModel.verdicts.wa"), t("mentalModel.verdicts.tle"), t("mentalModel.verdicts.rte"), t("mentalModel.verdicts.ce")].map((verdict) => <li key={verdict} className="border-l-2 border-zinc-700 pl-3 font-mono text-zinc-400">{verdict}</li>)}
            </ul>
          </LessonSection>

          <LessonSection id="icpc" title={t("icpc.title")}>
            <p>{t("icpc.p1")}</p><p>{t("icpc.p2")}</p><p>{t("icpc.p3")}</p><p>{t("icpc.p4")}</p>
            <h3 className="pt-3 text-base font-semibold text-zinc-100">{t("icpc.levelsTitle")}</h3>
            <ol className="grid gap-6" aria-label={t("icpc.levelsTitle")}>
              {([
                [t("icpc.levels.university.title"), t("icpc.levels.university.description")],
                [t("icpc.levels.national.title"), t("icpc.levels.national.description")],
                [t("icpc.levels.regional.title"), t("icpc.levels.regional.description")],
                [t("icpc.levels.regionalChampionship.title"), t("icpc.levels.regionalChampionship.description")],
                [t("icpc.levels.worldFinals.title"), t("icpc.levels.worldFinals.description")]
              ] as const).map(([level, description], index) => (
                <li key={level} className="flex items-start gap-3">
                  <span className="pt-1 font-mono text-xs text-blue-300">{String(index + 1).padStart(2, "0")}</span>
                  <div>
                    <h4 className="font-semibold text-zinc-100">{level}</h4>
                    <p className="mt-1 text-sm leading-7 text-zinc-400">{description}</p>
                  </div>
                </li>
              ))}
            </ol>
            <div className="my-8 grid grid-cols-3 gap-px overflow-hidden rounded-lg border border-zinc-800 bg-zinc-800">
              {[t("icpc.statTeam"), t("icpc.statComputer"), t("icpc.statTime")].map((label) => <strong key={label} className="bg-zinc-950 px-3 py-6 text-center text-sm text-blue-200 sm:text-lg">{label}</strong>)}
            </div>
            <ExternalAnchor href="https://icpc.global/help/about-icpc">{t("icpc.official")}</ExternalAnchor>
          </LessonSection>

          <LessonSection id="plate-game" title={t("plateLesson.title")}>
            <p>{t("plateLesson.intro")}</p><p>{t("plateLesson.p2")}</p><PlateGame />
          </LessonSection>

          <LessonSection id="languages" title={t("languages.title")}>
            <p>{t("languages.intro")}</p>
            <div className="my-8 grid gap-x-10 gap-y-10 md:grid-cols-2">
              <section aria-labelledby="cpp-language-title">
                <h3 id="cpp-language-title" className="text-lg font-semibold text-zinc-100">{t("languages.cppTitle")}</h3>
                <h4 className="mt-5 font-medium text-emerald-300">{t("languages.prosTitle")}</h4>
                <ul className="mt-3 list-disc space-y-2 pl-5 text-zinc-300">
                  <li>{t("languages.cppPros.speed")}</li>
                  <li>{t("languages.cppPros.library")}</li>
                  <li>{t("languages.cppPros.debugging")}</li>
                </ul>
                <h4 className="mt-6 font-medium text-amber-300">{t("languages.consTitle")}</h4>
                <ul className="mt-3 list-disc space-y-2 pl-5 text-zinc-300">
                  <li>{t("languages.cppCons.syntax")}</li>
                  <li>{t("languages.cppCons.safety")}</li>
                </ul>
              </section>

              <section aria-labelledby="python-language-title">
                <h3 id="python-language-title" className="text-lg font-semibold text-zinc-100">{t("languages.pythonTitle")}</h3>
                <h4 className="mt-5 font-medium text-emerald-300">{t("languages.prosTitle")}</h4>
                <ul className="mt-3 list-disc space-y-2 pl-5 text-zinc-300">
                  <li>{t("languages.pythonPros.concise")}</li>
                  <li>{t("languages.pythonPros.features")}</li>
                  <li>{t("languages.pythonPros.useCases")}</li>
                </ul>
                <h4 className="mt-6 font-medium text-amber-300">{t("languages.consTitle")}</h4>
                <ul className="mt-3 list-disc space-y-2 pl-5 text-zinc-300">
                  <li>{t("languages.pythonCons.performance")}</li>
                  <li>{t("languages.pythonCons.types")}</li>
                </ul>
              </section>
            </div>
            <p>{t("languages.choice")}</p>
          </LessonSection>

          <LessonSection id="workstation" title={t("setup.title")}>
            <p>{t("setup.intro")}</p>
            <p>{t("setup.p2")}</p>
            <p>{t("setup.p3")}</p>
            <div className="my-10 grid gap-4 xl:grid-cols-2">
              <InstallerCard title={t("setup.windows")} support={t("setup.windowsSupport")} description={t("setup.windowsChanges")} command={t("setup.windowsCommand")} source="/setup/install-cpp-vscode.ps1" recovery={t("setup.windowsRecovery")} />
              <InstallerCard title={t("setup.mac")} support={t("setup.macSupport")} description={t("setup.macChanges")} command={t("setup.macCommand")} source="/setup/install-cpp-vscode-macos.sh" recovery={t("setup.macRecovery")} />
            </div>
            <p className="text-sm text-emerald-200">{t("setup.verify")}</p>
            <aside className="mt-8 border-l-2 border-amber-400 bg-amber-400/5 px-5 py-4">
              <strong className="text-amber-200">{t("setup.fallbackTitle")}</strong>
              <p className="mt-2 text-sm leading-7 text-zinc-400">{t("setup.fallback")}</p>
              <ExternalAnchor href="https://ide.usaco.guide/">{t("setup.fallbackLink")}</ExternalAnchor>
            </aside>
          </LessonSection>

          <LessonSection id="stones" title={t("stonesLesson.title")}>
            <p>{t("stonesLesson.intro")}</p><p>{t("stonesLesson.optimalPlay")}</p><StonesGame />
          </LessonSection>

          <LessonSection id="first-submission" title={t("codeforces.title")}>
            <p>{t("codeforces.intro")}</p>
            <p>{t("codeforces.p2")}</p>
            <p>{t("codeforces.p3")}</p>
            <section className="my-10" aria-labelledby="codeforces-signup-title">
              <h3 id="codeforces-signup-title" className="text-lg font-semibold text-zinc-100">{t("codeforces.signupTitle")}</h3>
              <p className="mt-4 leading-8 text-zinc-300">{t("codeforces.signupIntro")}</p>
              <ol className="mt-5 list-decimal space-y-3 pl-5 leading-7 text-zinc-300">
                <li>{t("codeforces.signupStep1")}</li>
                <li>{t("codeforces.signupStep2")}</li>
                <li>{t("codeforces.signupStep3")}</li>
                <li>{t("codeforces.signupStep4")}</li>
              </ol>
              <ExternalAnchor href="https://codeforces.com/register">{t("codeforces.signupLink")}</ExternalAnchor>
            </section>
            <div className="my-10 space-y-12">
              <section aria-labelledby="codeforces-areas-title">
                <h3 id="codeforces-areas-title" className="text-lg font-semibold text-zinc-100">{t("codeforces.anatomyTitle")}</h3>
                <p className="mt-4 leading-8 text-zinc-300">{t("codeforces.anatomyIntro")}</p>
                <div className="mt-8 space-y-9">
                  <PlatformSection id="codeforces-contests-title" href="https://codeforces.com/contests" label={t("codeforces.contests")} description={t("codeforces.contestsText")}>
                    <div className="mt-7">
                      <h5 className="font-semibold text-zinc-100">{t("codeforces.difficultyTitle")}</h5>
                      <p className="mt-3 leading-8 text-zinc-300">{t("codeforces.difficultyText")}</p>
                    </div>
                  </PlatformSection>
                  <PlatformSection id="codeforces-gym-title" href="https://codeforces.com/gyms" label={t("codeforces.gym")} description={t("codeforces.gymText")} />
                  <PlatformSection id="codeforces-problemset-title" href="https://codeforces.com/problemset" label={t("codeforces.problemset")} description={t("codeforces.problemsetText")} />
                </div>
              </section>
              <section aria-labelledby="codeforces-compiler-title">
                <h3 id="codeforces-compiler-title" className="text-lg font-semibold text-zinc-100">{t("codeforces.languageTitle")}</h3>
                <p className="mt-4 leading-8 text-zinc-300">{t("codeforces.cpp")}</p>
                <p className="mt-5 leading-8 text-zinc-300">{t("codeforces.python")}</p>
                <ExternalAnchor href="https://codeforces.com/blog/entry/121114">{t("codeforces.compilerList")}</ExternalAnchor>
              </section>
            </div>
            <h3 className="text-lg font-semibold text-zinc-100">{t("codeforces.stepsTitle")}</h3>
            <ol className="my-5 grid gap-2 text-sm text-zinc-300">
              {[t("codeforces.step1"), t("codeforces.step2"), t("codeforces.step3"), t("codeforces.step4"), t("codeforces.step5")].map((step) => <li key={step} className="border-l-2 border-blue-400/50 bg-blue-400/[0.04] px-4 py-3">{step}</li>)}
            </ol>
            <GuideCodeBlock code={watermelonSource} />
            <div className="mt-4 grid gap-3 xl:grid-cols-2">
              <CommandBlock label={t("codeforces.windowsCompile")} command={t("codeforces.windowsCompileCommand")} />
              <CommandBlock label={t("codeforces.macCompile")} command={t("codeforces.macCompileCommand")} />
            </div>
            <div className="mt-6"><ExternalAnchor href="https://codeforces.com/problemset/problem/4/A">{t("codeforces.problemLink")}</ExternalAnchor></div>
            <details className="mt-8 border border-zinc-800 bg-zinc-900/40 p-4">
              <summary className="cursor-pointer font-medium text-zinc-200">{t("codeforces.recoveryTitle")}</summary>
              <p className="mt-3 text-sm leading-7 text-zinc-400">{t("codeforces.recovery")}</p>
            </details>
          </LessonSection>

          <LessonSection id="practice" title={t("practice.title")}>
            <p>{t("practice.intro")}</p>
            <p>{t("practice.p2")}</p>
            <p>{t("practice.p3")}</p>
            <p className="my-8 overflow-x-auto border-y border-emerald-400/30 py-5 font-mono text-sm text-emerald-200 sm:text-base">{t("practice.doctrine")}</p>
            <p>{t("practice.note")}</p>
          </LessonSection>

          <LessonSection id="chomp" title={t("chompLesson.title")}>
            <p>{t("chompLesson.intro")}</p><p>{t("chompLesson.p2")}</p><p>{t("chompLesson.p3")}</p><ChompGame />
          </LessonSection>

          <LessonSection id="next" title={t("future.title")}>
            <p>{t("future.intro")}</p>
            <p>{t("future.p2")}</p>
            <p>{t("future.p3")}</p>
            <ol className="my-10 grid gap-2 sm:grid-cols-2" aria-label={t("future.title")}>
              {[t("future.fundamentals"), t("future.complexity"), t("future.dataStructures"), t("future.bruteForce"), t("future.binarySearch"), t("future.dynamicProgramming"), t("future.greedy"), t("future.graphs"), t("future.strings"), t("future.geometry")].map((topic, index) => {
                return <li key={topic}><div className="border border-zinc-800 p-4"><span className="font-mono text-[10px] text-zinc-600">{String(index + 1).padStart(2, "0")}</span><strong className="mt-2 block text-sm text-zinc-100">{topic}</strong><span className="mt-2 block font-mono text-[10px] uppercase tracking-wider text-zinc-600">{t("future.future")}</span></div></li>;
              })}
            </ol>
          </LessonSection>

          <section className="mt-20 border-t border-zinc-700 pt-10" aria-labelledby="introduction-finish-title">
            <p className="font-mono text-xs uppercase tracking-[0.18em] text-cyan-300">{t("finish.eyebrow")}</p>
            <h2 id="introduction-finish-title" className="mt-3 text-3xl font-semibold tracking-tight text-zinc-50">{t("finish.title")}</h2>
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

function LessonSection({ id, title, children }: {
  readonly id: string;
  readonly title: string;
  readonly children: React.ReactNode;
}): React.JSX.Element {
  return (
    <section id={id} className="scroll-mt-20 border-t border-zinc-800 py-16 sm:py-20">
      <div className="min-w-0 max-w-4xl">
        <h2 className="mb-8 text-3xl font-semibold tracking-[-0.035em] text-zinc-50 sm:text-4xl">{title}</h2>
        <div className="guide-copy space-y-5 text-base leading-8 text-zinc-300">{children}</div>
      </div>
    </section>
  );
}

function ExternalAnchor({ href, children }: { readonly href: string; readonly children: React.ReactNode }): React.JSX.Element {
  return <a href={href} target="_blank" rel="noreferrer" className="mt-4 inline-flex items-center gap-2 text-sm font-medium text-cyan-200 underline decoration-cyan-700 underline-offset-4 hover:text-cyan-100">{children}<ExternalLink className="size-3.5" aria-hidden="true" /></a>;
}

function PlatformSection({ id, href, label, description, children }: {
  readonly id: string;
  readonly href: string;
  readonly label: string;
  readonly description: string;
  readonly children?: React.ReactNode;
}): React.JSX.Element {
  return (
    <section aria-labelledby={id}>
      <h4 id={id}><ExternalAnchor href={href}>{label}</ExternalAnchor></h4>
      <p className="mt-3 leading-8 text-zinc-300">{description}</p>
      {children}
    </section>
  );
}

function CommandBlock({ label, command }: { readonly label: string; readonly command: string }): React.JSX.Element {
  return <div className="min-w-0"><p className="font-mono text-[10px] uppercase tracking-[0.14em] text-zinc-500">{label}</p><pre className="mt-2 overflow-x-auto rounded-md border border-zinc-800 bg-zinc-950 p-4 text-xs leading-6 text-zinc-300"><code>{command}</code></pre></div>;
}

function InstallerCard({ title, support, description, command, source, recovery }: {
  readonly title: string;
  readonly support: string;
  readonly description: string;
  readonly command: string;
  readonly source: string;
  readonly recovery: string;
}): React.JSX.Element {
  const { t } = useTranslation("introduction");
  return (
    <article className="flex flex-col border border-zinc-700 bg-zinc-900/50 p-5">
      <p className="font-mono text-[10px] uppercase tracking-[0.15em] text-emerald-300">{support}</p>
      <h3 className="mt-2 text-xl font-semibold text-zinc-50">{title}</h3>
      <p className="mt-4 text-sm leading-7 text-zinc-400">{description}</p>
      <pre className="mt-5 overflow-x-auto rounded-md bg-zinc-950 p-4 text-xs leading-6 text-zinc-300"><code>{command}</code></pre>
      <details className="mt-5 text-sm">
        <summary className="cursor-pointer font-medium text-zinc-200">{t("setup.inspect")}</summary>
        <p className="mt-2 leading-6 text-zinc-500">{description}</p>
      </details>
      <div className="mt-auto flex flex-wrap gap-3 pt-6">
        <a href={source} target="_blank" rel="noreferrer" className="inline-flex items-center gap-2 rounded-md border border-zinc-700 px-3 py-2 text-sm text-zinc-200 hover:border-zinc-500"><FileCode2 className="size-4" aria-hidden="true" />{t("setup.viewSource")}</a>
        <a href={source} download className="rounded-md bg-emerald-400 px-3 py-2 text-sm font-semibold text-zinc-950 hover:bg-emerald-300">{t("setup.download")}</a>
      </div>
      <details className="mt-5 border-t border-zinc-800 pt-4 text-sm">
        <summary className="cursor-pointer font-medium text-zinc-300">{t("setup.recoveryTitle")}</summary>
        <p className="mt-2 leading-6 text-zinc-500">{recovery}</p>
      </details>
    </article>
  );
}
