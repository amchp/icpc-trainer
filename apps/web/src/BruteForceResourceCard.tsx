import { LEARNING_GUIDE_IDS, LEARNING_PROGRESS_STATUSES } from "@icpc-trainer/shared";
import { Link } from "@tanstack/react-router";
import { ArrowRight, Check } from "lucide-react";
import { useTranslation } from "react-i18next";

import { appPaths } from "./appNavigation.js";
import "./i18n/registerBruteForceResources.js";
import { cn } from "./lib.js";
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
    <section className="mt-6 rounded-xl border border-orange-400/30 bg-orange-400/[0.035] p-5 sm:p-6" aria-label={t("resourceCard.sectionLabel")}>
      <p className="font-mono text-[10px] uppercase tracking-[0.16em] text-orange-300">{t("resourceCard.next")}</p>
      <Link to={appPaths.bruteForce} className="group mt-3 flex items-center gap-5 rounded-lg border border-orange-400/70 bg-zinc-900/95 px-5 py-5 outline-none transition-colors hover:bg-orange-400/[0.08] focus-visible:ring-2 focus-visible:ring-orange-300">
        <div className="min-w-0 flex-1">
          <h2 className="text-lg font-semibold text-zinc-50">{t("resourceCard.title")}</h2>
          <p className="mt-2 text-sm leading-6 text-zinc-400">{t("resourceCard.description")}</p>
          <p className={cn("mt-4 inline-flex items-center gap-2 font-mono text-[10px] uppercase tracking-[0.14em]", completed ? "text-emerald-300" : "text-orange-300")}>
            <span className={cn("size-1.5 rounded-full", completed ? "bg-emerald-400" : "bg-orange-400")} aria-hidden="true" />{status}
          </p>
        </div>
        {completed ? <Check className="size-5 shrink-0 text-emerald-300" aria-hidden="true" /> : <ArrowRight className="size-5 shrink-0 text-orange-300 transition-transform group-hover:translate-x-1" aria-hidden="true" />}
      </Link>
    </section>
  );
}
