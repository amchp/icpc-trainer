import { LEARNING_GUIDE_IDS, LEARNING_PROGRESS_STATUSES } from "@icpc-trainer/shared";
import { useAuth } from "@clerk/clerk-react";
import { Link } from "@tanstack/react-router";
import { Check, ChevronLeft, RotateCcw } from "lucide-react";
import { useEffect, useRef, useState, type ReactNode } from "react";
import { useTranslation } from "react-i18next";

import { appPaths } from "./appNavigation.js";
import { Button } from "./components/ui.js";
import {
  ComplexityCurveChart,
  LocalLinearBenchmark,
  RuntimeEstimator
} from "./learning/complexity/ComplexityInteractions.js";
import {
  BigOSimplifierLab,
  ComplexityApproachComparison,
  ControlFlowCounterLab,
  FibonacciRecursionLab,
  OperationMemoryFormulaLab,
  StockMemoryEstimatorLab,
  TwoSumCapstoneLab,
  type ComplexityApproach
} from "./learning/complexity/ProblemFirstComplexityLabs.js";
import { GuideSidebar } from "./learning/GuideSidebar.js";
import { PracticeQuestionSet, type PracticeQuestion } from "./learning/PracticeQuestionSet.js";
import { ProblemFirstChallenge, type ProblemFirstChallengeProps } from "./learning/ProblemFirstChallenge.js";
import { useLearningProgress, useSetLearningProgressStatus, useStartLearningGuide } from "./useLearningProgress.js";
import { useToaster } from "./Toaster.js";

const GUIDE_ID = LEARNING_GUIDE_IDS.TimeComplexity;

export const problemFirstComplexityCode = {
  searchScan: `for (long long query : queries) {
  bool found = false;
  for (long long id : users) {
    if (id == query) { found = true; break; }
  }
}`,
  searchSorted: `vector<long long> index = users;
sort(index.begin(), index.end());
for (long long query : queries)
  bool found = binary_search(index.begin(), index.end(), query);`,
  searchHash: `unordered_set<long long> index(users.begin(), users.end());
for (long long query : queries)
  bool found = index.find(query) != index.end();`,
  duplicatePairs: `for (int i = 0; i < n; ++i)
  for (int j = i + 1; j < n; ++j)
    if (nums[i] == nums[j]) return true;`,
  duplicateSort: `vector<int> copy = nums;
sort(copy.begin(), copy.end());
for (int i = 1; i < n; ++i)
  if (copy[i] == copy[i - 1]) return true;`,
  duplicateHash: `unordered_set<int> seen;
for (int value : nums)
  if (!seen.insert(value).second) return true;`,
  stockPairs: `for (int buy = 0; buy < n; ++buy)
  for (int sell = buy + 1; sell < n; ++sell)
    best = max(best, price[sell] - price[buy]);`,
  stockSuffix: `vector<int> suffixMax(n);
for (int i = n - 1; i >= 0; --i)
  suffixMax[i] = max(price[i], i + 1 < n ? suffixMax[i + 1] : price[i]);`,
  stockMin: `int minimum = price[0];
for (int value : price) {
  best = max(best, value - minimum);
  minimum = min(minimum, value);
}`,
  fibonacciNaive: `long long fibonacci(int n) {
  if (n <= 1) return n;
  return fibonacci(n - 1) + fibonacci(n - 2);
}`,
  fibonacciTable: `long long fibonacci(int n) {
  vector<long long> values(n + 1);
  if (n >= 1) values[1] = 1;
  for (int index = 2; index <= n; ++index)
    values[index] = values[index - 1] + values[index - 2];
  return values[n];
}`,
  fibonacciIterative: `long long fibonacci(int n) {
  if (n <= 1) return n;
  long long previous = 0, current = 1;
  for (int index = 2; index <= n; ++index) {
    long long next = previous + current;
    previous = current;
    current = next;
  }
  return current;
}`,
  zerosShift: `for (int i = 0; i < n; ++i) {
  if (arr[i] == 0) {
    for (int j = n - 1; j > i; --j)
      arr[j] = arr[j - 1];
    ++i; // skip the zero just inserted
  }
}`,
  zerosBuffer: `vector<int> output;
for (int value : arr) {
  output.push_back(value);
  if (value == 0) output.push_back(0);
  if (output.size() >= arr.size()) break;
}
arr = output;
arr.resize(n);`,
  zerosBackward: `int write = n + zeroCount - 1;
for (int read = n - 1; read >= 0; --read) {
  if (write < n) arr[write] = arr[read];
  if (arr[read] == 0 && --write < n) arr[write] = 0;
  --write;
}`,
  twoSumPairs: `for (int i = 0; i < n; ++i)
  for (int j = i + 1; j < n; ++j)
    if (nums[i] + nums[j] == target) return {i, j};`,
  twoSumSort: `vector<pair<int, int>> values;
for (int i = 0; i < n; ++i) values.push_back({nums[i], i});
sort(values.begin(), values.end());
for (int left = 0, right = n - 1; left < right; )
  if (values[left].first + values[right].first < target) ++left;
  else if (values[left].first + values[right].first > target) --right;
  else return {values[left].second, values[right].second};`,
  twoSumHash: `unordered_map<int, int> seen;
for (int i = 0; i < n; ++i) {
  auto match = seen.find(target - nums[i]);
  if (match != seen.end()) return {match->second, i};
  seen[nums[i]] = i;
}`
} as const;

export function TimeComplexityPage(): React.JSX.Element {
  const { t } = useTranslation("timeComplexity");
  const { userId } = useAuth();
  const progressQuery = useLearningProgress();
  const startGuide = useStartLearningGuide();
  const setStatus = useSetLearningProgressStatus();
  const toaster = useToaster();
  const startedForUser = useRef<string | null>(null);
  const progress = progressQuery.data?.find((row) => row.guideId === GUIDE_ID);
  const completed = progress?.status === LEARNING_PROGRESS_STATUSES.Completed;
  const sections = (["search", "duplicates", "stock", "zeros", "power", "capstone"] as const).map((id) => ({
    id,
    label: t(`problemFirst.sections.${id}`)
  }));
  const [activeSection, setActiveSection] = useState<string>(sections[0]?.id ?? "search");
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
    for (const section of sections) {
      const element = document.getElementById(section.id);
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

  const common = commonChallengeProps(t);

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
          <p className="guide-rise mt-6 max-w-3xl text-lg leading-8 text-zinc-400 [animation-delay:160ms]">{t("problemFirst.subtitle")}</p>
          <p className="guide-rise mt-12 border-l-2 border-violet-400 pl-5 text-2xl font-semibold tracking-tight text-violet-100 [animation-delay:240ms] sm:text-3xl">{t("problemFirst.heroQuestion")}</p>
        </div>
      </header>

      <div className="mx-auto max-w-7xl px-5 sm:px-8 lg:grid lg:grid-cols-[14rem_minmax(0,1fr)] lg:gap-12">
        <GuideSidebar sections={sections} activeSection={activeSection} label={t("sidebar.label")} progressLabel={(current, total) => t("sidebar.progress", { current, total })} />
        <div className="min-w-0 max-w-5xl">
          <LessonSection id="search">
            <ProblemFirstChallenge
              {...common}
              accent="cyan"
              eyebrow={t("problemFirst.search.eyebrow")}
              title={t("problemFirst.search.title")}
              description={t("problemFirst.search.description")}
              constraints={t("problemFirst.search.constraints")}
              sample={t("problemFirst.search.sample")}
              toolTitle={t("problemFirst.search.toolTitle")}
              applicationTitle={t("problemFirst.search.applicationTitle")}
              applicationPrompt={t("problemFirst.search.applicationPrompt")}
              application={(
                <Application
                  approaches={searchApproaches(t)}
                  caveat={t("problemFirst.common.hashCaveat")}
                  questions={questions(t, "search")}
                  label={t("problemFirst.search.practiceLabel")}
                />
              )}
            >
              <p>{t("problemFirst.search.analysis")}</p>
              <OperationMemoryFormulaLab />
            </ProblemFirstChallenge>
          </LessonSection>

          <LessonSection id="duplicates">
            <ProblemFirstChallenge
              {...common}
              accent="violet"
              eyebrow={t("problemFirst.duplicates.eyebrow")}
              title={t("problemFirst.duplicates.title")}
              description={t("problemFirst.duplicates.description")}
              constraints={t("problemFirst.duplicates.constraints")}
              sample={t("problemFirst.duplicates.sample")}
              sourceUrl="https://leetcode.com/problems/contains-duplicate/"
              sourceLabel={t("problemFirst.common.openSource")}
              toolTitle={t("problemFirst.duplicates.toolTitle")}
              applicationTitle={t("problemFirst.duplicates.applicationTitle")}
              applicationPrompt={t("problemFirst.duplicates.applicationPrompt")}
              application={(
                <Application
                  approaches={duplicateApproaches(t)}
                  caveat={t("problemFirst.common.hashCaveat")}
                  questions={questions(t, "duplicates")}
                  label={t("problemFirst.duplicates.practiceLabel")}
                />
              )}
            >
              <p>{t("problemFirst.duplicates.analysis")}</p>
              <BigOSimplifierLab />
              <ComplexityCurveChart />
            </ProblemFirstChallenge>
          </LessonSection>

          <LessonSection id="stock">
            <ProblemFirstChallenge
              {...common}
              accent="emerald"
              eyebrow={t("problemFirst.stock.eyebrow")}
              title={t("problemFirst.stock.title")}
              description={t("problemFirst.stock.description")}
              constraints={t("problemFirst.stock.constraints")}
              sample={t("problemFirst.stock.sample")}
              sourceUrl="https://leetcode.com/problems/best-time-to-buy-and-sell-stock/"
              sourceLabel={t("problemFirst.common.openSource")}
              toolTitle={t("problemFirst.stock.toolTitle")}
              applicationTitle={t("problemFirst.stock.applicationTitle")}
              applicationPrompt={t("problemFirst.stock.applicationPrompt")}
              application={(
                <Application
                  approaches={stockApproaches(t)}
                  questions={questions(t, "stock")}
                  label={t("problemFirst.stock.practiceLabel")}
                />
              )}
            >
              <p>{t("problemFirst.stock.analysis")}</p>
              <div className="rounded-lg border border-zinc-800 bg-zinc-950/60 p-4 sm:p-6">
                <RuntimeEstimator n={inputSize} onNChange={setInputSize} />
                <StockMemoryEstimatorLab n={inputSize} onNChange={setInputSize} />
                <LocalLinearBenchmark />
              </div>
            </ProblemFirstChallenge>
          </LessonSection>

          <LessonSection id="zeros">
            <ProblemFirstChallenge
              {...common}
              accent="cyan"
              eyebrow={t("problemFirst.zeros.eyebrow")}
              title={t("problemFirst.zeros.title")}
              description={t("problemFirst.zeros.description")}
              constraints={t("problemFirst.zeros.constraints")}
              sample={t("problemFirst.zeros.sample")}
              sourceUrl="https://leetcode.com/problems/duplicate-zeros/"
              sourceLabel={t("problemFirst.common.openSource")}
              toolTitle={t("problemFirst.zeros.toolTitle")}
              applicationTitle={t("problemFirst.zeros.applicationTitle")}
              applicationPrompt={t("problemFirst.zeros.applicationPrompt")}
              application={(
                <Application
                  approaches={zeroApproaches(t)}
                  questions={questions(t, "zeros")}
                  label={t("problemFirst.zeros.practiceLabel")}
                />
              )}
            >
              <p>{t("problemFirst.zeros.analysis")}</p>
              <ControlFlowCounterLab />
            </ProblemFirstChallenge>
          </LessonSection>

          <LessonSection id="power">
            <ProblemFirstChallenge
              {...common}
              accent="orange"
              eyebrow={t("problemFirst.power.eyebrow")}
              title={t("problemFirst.power.title")}
              description={t("problemFirst.power.description")}
              constraints={t("problemFirst.power.constraints")}
              sample={t("problemFirst.power.sample")}
              sourceUrl="https://leetcode.com/problems/fibonacci-number/"
              sourceLabel={t("problemFirst.common.openSource")}
              toolTitle={t("problemFirst.power.toolTitle")}
              applicationTitle={t("problemFirst.power.applicationTitle")}
              applicationPrompt={t("problemFirst.power.applicationPrompt")}
              application={(
                <Application
                  approaches={fibonacciApproaches(t)}
                  questions={questions(t, "power")}
                  label={t("problemFirst.power.practiceLabel")}
                />
              )}
            >
              <p>{t("problemFirst.power.analysis")}</p>
              <FibonacciRecursionLab />
            </ProblemFirstChallenge>
          </LessonSection>

          <LessonSection id="capstone">
            <ProblemFirstChallenge
              {...common}
              accent="emerald"
              eyebrow={t("problemFirst.capstone.eyebrow")}
              title={t("problemFirst.capstone.title")}
              description={t("problemFirst.capstone.description")}
              constraints={t("problemFirst.capstone.constraints")}
              sample={t("problemFirst.capstone.sample")}
              sourceUrl="https://leetcode.com/problems/two-sum/"
              sourceLabel={t("problemFirst.common.openSource")}
              toolTitle={t("problemFirst.capstone.toolTitle")}
              applicationTitle={t("problemFirst.capstone.applicationTitle")}
              applicationPrompt={t("problemFirst.capstone.applicationPrompt")}
              application={(
                <Application
                  approaches={twoSumApproaches(t)}
                  caveat={t("problemFirst.common.hashCaveat")}
                  questions={questions(t, "capstone")}
                  label={t("problemFirst.capstone.practiceLabel")}
                />
              )}
            >
              <p>{t("problemFirst.capstone.analysis")}</p>
              <TwoSumCapstoneLab />
            </ProblemFirstChallenge>
          </LessonSection>

          <section className="mt-20 border-t border-zinc-700 pt-10" aria-labelledby="complexity-finish-title">
            <p className="font-mono text-xs uppercase tracking-[0.18em] text-violet-400">{t("finish.eyebrow")}</p>
            <h2 id="complexity-finish-title" className="mt-3 text-3xl font-semibold tracking-tight text-zinc-50">{t("finish.title")}</h2>
            <p className="mt-4 max-w-2xl leading-7 text-zinc-400">{t("problemFirst.finishDescription")}</p>
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

type Translate = ReturnType<typeof useTranslation<"timeComplexity">>["t"];
type LessonKey = "search" | "duplicates" | "stock" | "power" | "zeros" | "capstone";

function LessonSection({ id, children }: { readonly id: string; readonly children: ReactNode }): React.JSX.Element {
  return <section id={id} className="scroll-mt-20 border-t border-zinc-800 py-8 sm:py-12">{children}</section>;
}

function Application({
  approaches,
  caveat,
  questions: lessonQuestions,
  label
}: {
  readonly approaches: readonly ComplexityApproach[];
  readonly caveat?: string;
  readonly questions: readonly [PracticeQuestion, PracticeQuestion];
  readonly label: string;
}): React.JSX.Element {
  return (
    <>
      <ComplexityApproachComparison approaches={approaches} caveat={caveat} />
      <PracticeQuestionSet label={label} questions={lessonQuestions} />
    </>
  );
}

function commonChallengeProps(t: Translate): Pick<
  ProblemFirstChallengeProps,
  "problemStageLabel" | "constraintsLabel" | "sampleLabel" | "attemptPrompt" | "attemptStageLabel" | "revealLabel" |
  "hideLabel" | "applicationRevealLabel" | "applicationHideLabel" | "toolStageLabel" | "applicationStageLabel"
> {
  return {
    problemStageLabel: t("problemFirst.common.challenge"),
    constraintsLabel: t("problemFirst.common.constraints"),
    sampleLabel: t("problemFirst.common.sample"),
    attemptPrompt: t("problemFirst.common.attemptPrompt"),
    attemptStageLabel: t("problemFirst.common.yourTurn"),
    revealLabel: t("problemFirst.common.revealTool"),
    hideLabel: t("problemFirst.common.hideTool"),
    applicationRevealLabel: t("problemFirst.common.revealApplication"),
    applicationHideLabel: t("problemFirst.common.hideApplication"),
    toolStageLabel: t("problemFirst.common.analysisTool"),
    applicationStageLabel: t("problemFirst.common.compare")
  };
}

function approach(t: Translate, lesson: LessonKey, key: "a" | "b" | "c", implementation: string): ComplexityApproach {
  return {
    title: t(`problemFirst.${lesson}.approaches.${key}.title`),
    description: t(`problemFirst.${lesson}.approaches.${key}.description`),
    time: t(`problemFirst.${lesson}.approaches.${key}.time`),
    space: t(`problemFirst.${lesson}.approaches.${key}.space`),
    qualifier: key === "c" && (lesson === "search" || lesson === "duplicates" || lesson === "capstone")
      ? t("problemFirst.common.expectedQualifier")
      : undefined,
    code: implementation
  };
}

function searchApproaches(t: Translate): readonly ComplexityApproach[] {
  return [approach(t, "search", "a", problemFirstComplexityCode.searchScan), approach(t, "search", "b", problemFirstComplexityCode.searchSorted), approach(t, "search", "c", problemFirstComplexityCode.searchHash)];
}

function duplicateApproaches(t: Translate): readonly ComplexityApproach[] {
  return [approach(t, "duplicates", "a", problemFirstComplexityCode.duplicatePairs), approach(t, "duplicates", "b", problemFirstComplexityCode.duplicateSort), approach(t, "duplicates", "c", problemFirstComplexityCode.duplicateHash)];
}

function stockApproaches(t: Translate): readonly ComplexityApproach[] {
  return [approach(t, "stock", "a", problemFirstComplexityCode.stockPairs), approach(t, "stock", "b", problemFirstComplexityCode.stockSuffix), approach(t, "stock", "c", problemFirstComplexityCode.stockMin)];
}

function fibonacciApproaches(t: Translate): readonly ComplexityApproach[] {
  return [approach(t, "power", "a", problemFirstComplexityCode.fibonacciNaive), approach(t, "power", "b", problemFirstComplexityCode.fibonacciTable), approach(t, "power", "c", problemFirstComplexityCode.fibonacciIterative)];
}

function zeroApproaches(t: Translate): readonly ComplexityApproach[] {
  return [approach(t, "zeros", "a", problemFirstComplexityCode.zerosShift), approach(t, "zeros", "b", problemFirstComplexityCode.zerosBuffer), approach(t, "zeros", "c", problemFirstComplexityCode.zerosBackward)];
}

function twoSumApproaches(t: Translate): readonly ComplexityApproach[] {
  return [approach(t, "capstone", "a", problemFirstComplexityCode.twoSumPairs), approach(t, "capstone", "b", problemFirstComplexityCode.twoSumSort), approach(t, "capstone", "c", problemFirstComplexityCode.twoSumHash)];
}

function questions(t: Translate, lesson: LessonKey): readonly [PracticeQuestion, PracticeQuestion] {
  return [
    {
      question: t(`problemFirst.${lesson}.questions.first.question`),
      options: [
        t(`problemFirst.${lesson}.questions.first.a`),
        t(`problemFirst.${lesson}.questions.first.b`),
        t(`problemFirst.${lesson}.questions.first.c`)
      ],
      correctOption: 1,
      explanation: t(`problemFirst.${lesson}.questions.first.explanation`)
    },
    {
      question: t(`problemFirst.${lesson}.questions.second.question`),
      options: [
        t(`problemFirst.${lesson}.questions.second.a`),
        t(`problemFirst.${lesson}.questions.second.b`),
        t(`problemFirst.${lesson}.questions.second.c`)
      ],
      correctOption: 1,
      explanation: t(`problemFirst.${lesson}.questions.second.explanation`)
    }
  ];
}
