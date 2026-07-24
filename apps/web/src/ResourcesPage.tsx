import { LEARNING_GUIDE_IDS, LEARNING_PROGRESS_STATUSES, type LearningProgressStatus } from "@icpc-trainer/shared";
import { Link } from "@tanstack/react-router";
import { ArrowDown, ArrowRight, Check, LockKeyhole } from "lucide-react";
import { useTranslation } from "react-i18next";

import { appPaths } from "./appNavigation.js";
import { cn } from "./lib.js";
import { useLearningProgress } from "./useLearningProgress.js";

export function ResourcesPage(): React.JSX.Element {
  const { t } = useTranslation("resources");
  const progressQuery = useLearningProgress();
  const introduction = progressQuery.data?.find(
    (row) => row.guideId === LEARNING_GUIDE_IDS.Introduction
  );
  const completedCount = introduction?.status === LEARNING_PROGRESS_STATUSES.Completed ? 1 : 0;

  const statusLabel = (status: LearningProgressStatus | undefined): string =>
    status === LEARNING_PROGRESS_STATUSES.Completed
      ? t("status.completed")
      : status === LEARNING_PROGRESS_STATUSES.InProgress
        ? t("status.inProgress")
        : t("status.available");

  return (
    <main className="mx-auto w-full max-w-6xl px-5 py-10 sm:px-8 sm:py-14">
      <header className="max-w-3xl">
        <p className="font-mono text-[11px] uppercase tracking-[0.16em] text-blue-300">{t("eyebrow")}</p>
        <h1 className="mt-3 text-3xl font-semibold tracking-[-0.035em] text-zinc-100 sm:text-4xl">
          {t("title")}
        </h1>
        <p className="mt-4 max-w-2xl leading-7 text-zinc-400">
          {t("subtitle")}
        </p>
      </header>

      {progressQuery.isError ? (
        <div className="mt-6 flex flex-wrap items-center gap-4 border-y border-red-500/30 py-3 text-sm text-red-200">
          <span>{t("progressError")}</span>
          <button
            type="button"
            className="font-medium text-white underline underline-offset-4"
            onClick={() => void progressQuery.refetch()}
          >
            {t("retry")}
          </button>
        </div>
      ) : null}

      <section className="relative mt-10 overflow-hidden rounded-xl border border-zinc-800 bg-[#0c0c0d] px-5 py-7 sm:px-8 sm:py-8" aria-label={t("sequenceLabel")}>
        <div className="pointer-events-none absolute inset-0 opacity-[0.1] [background-image:linear-gradient(to_right,#71717a_1px,transparent_1px),linear-gradient(to_bottom,#71717a_1px,transparent_1px)] [background-size:32px_32px] [mask-image:radial-gradient(ellipse_70%_90%_at_50%_50%,black_30%,transparent_100%)]" />

        <div className="relative flex items-baseline justify-between gap-4 border-b border-zinc-800/80 pb-4">
          <p className="font-mono text-[10px] uppercase tracking-[0.16em] text-zinc-500">{t("sequence")}</p>
          <p className="font-mono text-[10px] text-zinc-600">{t("completedCount", { completed: completedCount, total: 1 })}</p>
        </div>

        <div className="relative mt-7 grid items-stretch gap-5 md:grid-cols-[minmax(0,1fr)_6rem_minmax(0,1fr)] md:gap-6">
          <Link
            to={appPaths.introduction}
            className="group mx-auto flex w-full max-w-sm flex-col rounded-lg border border-cyan-400/80 bg-zinc-900/95 px-5 py-5 shadow-[0_0_0_4px_rgba(34,211,238,0.06)] transition-all hover:bg-zinc-800 hover:shadow-[0_0_0_5px_rgba(34,211,238,0.1)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-cyan-300"
          >
            <div className="flex items-center justify-between gap-4">
              <span className={cn("font-mono text-[11px]", introduction?.status === LEARNING_PROGRESS_STATUSES.Completed ? "text-emerald-300/80" : "text-cyan-300/80")}>01</span>
              {introduction?.status === LEARNING_PROGRESS_STATUSES.Completed ? (
                <Check className="size-4 shrink-0 text-emerald-300" aria-hidden="true" />
              ) : (
                <ArrowRight className="size-4 shrink-0 text-cyan-300 transition-transform group-hover:translate-x-1" aria-hidden="true" />
              )}
            </div>
            <h2 className="mt-3 text-lg font-semibold text-zinc-50">{t("introduction")}</h2>
            <p className="mt-2 text-sm leading-6 text-zinc-400">
              {t("introductionDescription")}
            </p>
            <p className={cn(
              "mt-auto inline-flex items-center gap-2 pt-5 font-mono text-[10px] uppercase tracking-[0.14em]",
              introduction?.status === LEARNING_PROGRESS_STATUSES.Completed ? "text-emerald-300" : "text-cyan-300"
            )}>
              <span aria-hidden="true" className={cn("size-1.5 rounded-full", introduction?.status === LEARNING_PROGRESS_STATUSES.Completed ? "bg-emerald-400" : "bg-cyan-400")} />
              {progressQuery.isLoading ? t("status.loading") : statusLabel(introduction?.status)}
            </p>
          </Link>

          <div className="flex min-h-14 items-center justify-center text-zinc-500" aria-hidden="true">
            <div className="hidden w-full items-center md:flex">
              <span className="flex-1 border-t border-dashed border-zinc-600" />
              <ArrowRight className="-ml-px size-5 shrink-0" strokeWidth={1.5} />
            </div>
            <div className="flex h-full flex-col items-center md:hidden">
              <span className="flex-1 border-l border-dashed border-zinc-600" />
              <ArrowDown className="-mt-px size-5 shrink-0" strokeWidth={1.5} />
            </div>
          </div>

          <article
            className="mx-auto flex w-full max-w-sm flex-col rounded-lg border border-zinc-800 bg-zinc-900/60 px-5 py-5 text-zinc-500"
            aria-labelledby="fundamentals-title"
          >
            <div className="flex items-center justify-between gap-4">
              <span className="font-mono text-[11px] text-zinc-600">02</span>
              <LockKeyhole className="size-4 shrink-0 text-zinc-600" aria-hidden="true" />
            </div>
            <h2 id="fundamentals-title" className="mt-3 text-lg font-semibold text-zinc-300">{t("fundamentals")}</h2>
            <p className="mt-2 text-sm leading-6 text-zinc-400">
              {t("fundamentalsDescription")}
            </p>
            <p className="mt-auto inline-flex items-center gap-2 pt-5 font-mono text-[10px] uppercase tracking-[0.14em] text-zinc-500">
              <LockKeyhole className="size-3" aria-hidden="true" />
              {t("comingSoon")}
            </p>
          </article>
        </div>
      </section>
    </main>
  );
}
