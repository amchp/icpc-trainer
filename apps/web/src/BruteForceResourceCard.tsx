import { LEARNING_GUIDE_IDS, LEARNING_PROGRESS_STATUSES } from "@icpc-trainer/shared";
import { useTranslation } from "react-i18next";

import { appPaths } from "./appNavigation.js";
import "./i18n/registerBruteForceResources.js";
import { RoadmapNode } from "./ResourcesRoadmapNode.js";
import { useLearningProgress } from "./useLearningProgress.js";

export function BruteForceResourceCard(): React.JSX.Element {
  const { t } = useTranslation("bruteForce");
  const progressQuery = useLearningProgress();
  const progress = progressQuery.data?.find((row) => row.guideId === LEARNING_GUIDE_IDS.BruteForce);
  const completed = progress?.status === LEARNING_PROGRESS_STATUSES.Completed;
  const status = progressQuery.isLoading
    ? t("resourceCard.status.loading")
    : completed
      ? t("resourceCard.status.completed")
      : progress?.status === LEARNING_PROGRESS_STATUSES.InProgress
        ? t("resourceCard.status.inProgress")
        : t("resourceCard.status.available");

  return (
    <RoadmapNode
      to={appPaths.bruteForce}
      step="04"
      accent="orange"
      title={t("resourceCard.title")}
      description={t("resourceCard.description")}
      status={status}
      completed={completed}
    />
  );
}
