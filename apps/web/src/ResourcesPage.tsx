import { LEARNING_GUIDE_IDS, LEARNING_PROGRESS_STATUSES, type LearningProgressStatus } from "@icpc-trainer/shared";
import { useTranslation } from "react-i18next";

import { appPaths } from "./appNavigation.js";
import { RoadmapBranchFan, RoadmapConnector, RoadmapNode } from "./ResourcesRoadmapNode.js";
import { useLearningProgress } from "./useLearningProgress.js";

export function ResourcesPage(): React.JSX.Element {
  const { t } = useTranslation("resources");
  const progressQuery = useLearningProgress();
  const guideStatus = (guideId: LEARNING_GUIDE_IDS): LearningProgressStatus | undefined =>
    progressQuery.data?.find((row) => row.guideId === guideId)?.status;
  const introduction = guideStatus(LEARNING_GUIDE_IDS.Introduction);
  const fundamentals = guideStatus(LEARNING_GUIDE_IDS.ProgrammingFundamentals);
  const timeComplexity = guideStatus(LEARNING_GUIDE_IDS.TimeComplexity);
  const dataStructures = guideStatus(LEARNING_GUIDE_IDS.DataStructures);
  const bruteForce = guideStatus(LEARNING_GUIDE_IDS.BruteForce);
  const binarySearch = guideStatus(LEARNING_GUIDE_IDS.BinarySearch);
  const greedy = guideStatus(LEARNING_GUIDE_IDS.Greedy);
  const graphTheory = guideStatus(LEARNING_GUIDE_IDS.GraphTheory);
  const guides = [introduction, fundamentals, timeComplexity, dataStructures, greedy, bruteForce, binarySearch, graphTheory];
  const completedCount = guides.filter((status) => status === LEARNING_PROGRESS_STATUSES.Completed).length;
  const statusLabel = (status: LearningProgressStatus | undefined): string =>
    progressQuery.isLoading
      ? t("status.loading")
      : status === LEARNING_PROGRESS_STATUSES.Completed
        ? t("status.completed")
        : status === LEARNING_PROGRESS_STATUSES.InProgress
          ? t("status.inProgress")
          : t("status.available");

  return (
    <main className="mx-auto w-full max-w-4xl px-5 py-7 sm:px-8 sm:py-9">
      <header className="max-w-3xl">
        {/* The count rides with the eyebrow so the roadmap itself does not need a header bar. */}
        <div className="flex flex-wrap items-baseline gap-x-3 gap-y-1">
          <p className="font-mono text-[11px] uppercase tracking-[0.16em] text-blue-300">{t("eyebrow")}</p>
          <span aria-hidden="true" className="text-zinc-700">·</span>
          <p className="font-mono text-[10px] text-zinc-500">{t("completedCount", { completed: completedCount, total: guides.length })}</p>
        </div>
        <h1 className="mt-2 text-2xl font-semibold tracking-[-0.035em] text-zinc-100 sm:text-3xl">{t("title")}</h1>
        <p className="mt-2 max-w-2xl text-[15px] leading-6 text-zinc-400">{t("subtitle")}</p>
      </header>

      {progressQuery.isError ? (
        <div className="mt-5 flex flex-wrap items-center gap-4 border-y border-red-500/30 py-3 text-sm text-red-200">
          <span>{t("progressError")}</span>
          <button type="button" className="font-medium text-white underline underline-offset-4" onClick={() => void progressQuery.refetch()}>
            {t("retry")}
          </button>
        </div>
      ) : null}

      <section className="relative mt-6 overflow-hidden rounded-xl border border-zinc-800 bg-[#0c0c0d] px-4 py-5 sm:px-6" aria-label={t("sequenceLabel")}>
        <div className="relative grid gap-3">
          {/* The ordered spine reads top to bottom, then fans out into the parallel branches. */}
          <div className="mx-auto flex w-full max-w-[19rem] flex-col">
            <RoadmapNode
              to={appPaths.introduction}
              step="01"
              accent="cyan"
              title={t("introduction")}
              status={statusLabel(introduction)}
              completed={introduction === LEARNING_PROGRESS_STATUSES.Completed}
            />
            <RoadmapConnector />
            <RoadmapNode
              to={appPaths.programmingFundamentals}
              step="02"
              accent="blue"
              title={t("fundamentals")}
              status={statusLabel(fundamentals)}
              completed={fundamentals === LEARNING_PROGRESS_STATUSES.Completed}
            />
            <RoadmapConnector />
            <RoadmapNode
              to={appPaths.timeComplexity}
              step="03"
              accent="violet"
              title={t("timeComplexity")}
              status={statusLabel(timeComplexity)}
              completed={timeComplexity === LEARNING_PROGRESS_STATUSES.Completed}
            />
          </div>

          <div className="xl:hidden">
            <RoadmapConnector />
          </div>
          <RoadmapBranchFan />

          {/* `items-start` keeps every card at its natural height while Graph Theory continues
              beneath Data Structures without stretching the other step-04 branches. */}
          <div className="mx-auto grid w-full max-w-[17rem] items-start gap-3 sm:max-w-none sm:grid-cols-2 xl:grid-cols-4">
            <RoadmapNode
              to={appPaths.dataStructures}
              step="04"
              accent="rose"
              title={t("dataStructures")}
              status={statusLabel(dataStructures)}
              completed={dataStructures === LEARNING_PROGRESS_STATUSES.Completed}
            />
            <RoadmapNode
              to={appPaths.greedy}
              step="04"
              accent="emerald"
              title={t("greedy")}
              status={statusLabel(greedy)}
              completed={greedy === LEARNING_PROGRESS_STATUSES.Completed}
            />
            <RoadmapNode
              to={appPaths.bruteForce}
              step="04"
              accent="orange"
              title={t("bruteForce")}
              status={statusLabel(bruteForce)}
              completed={bruteForce === LEARNING_PROGRESS_STATUSES.Completed}
            />
            <RoadmapNode
              to={appPaths.binarySearch}
              step="04"
              accent="amber"
              title={t("binarySearch")}
              status={statusLabel(binarySearch)}
              completed={binarySearch === LEARNING_PROGRESS_STATUSES.Completed}
            />
            <div className="flex flex-col xl:col-start-1">
              <RoadmapConnector />
              <RoadmapNode
                to={appPaths.graphTheory}
                step="05"
                accent="emerald"
                title={t("graphTheory")}
                status={statusLabel(graphTheory)}
                completed={graphTheory === LEARNING_PROGRESS_STATUSES.Completed}
              />
            </div>
          </div>
        </div>
      </section>
    </main>
  );
}
