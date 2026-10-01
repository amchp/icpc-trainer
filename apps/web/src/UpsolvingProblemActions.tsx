import type { UpsolvingProblemRow } from "@icpc-trainer/api";
import type { UpsolvingManualProblemStatus } from "@icpc-trainer/shared";
import { Clock3, Pencil, RotateCcw } from "lucide-react";
import { useTranslation } from "react-i18next";

import { Button } from "./components/ui.js";

export function UpsolvingProblemActions({ problem, saving, onChange }: {
  readonly problem: UpsolvingProblemRow;
  readonly saving: boolean;
  readonly onChange: (row: UpsolvingProblemRow, status: UpsolvingManualProblemStatus | null) => void;
}): React.JSX.Element {
  const { t } = useTranslation("upsolving");
  const reviewLater = problem.status === "review_later";
  const inProgress = problem.status === "in_progress";
  const disabled = saving || problem.status === "solved";
  const params = { problem: problem.problemName };
  const buttonClassName = "size-8 shrink-0 rounded-md p-0 text-zinc-500 focus-visible:ring-zinc-400 disabled:opacity-30";
  const ReviewIcon = reviewLater ? RotateCcw : Clock3;
  const ProgressIcon = inProgress ? RotateCcw : Pencil;

  return (
    <div role="group" aria-label={t("actionsFor", params)} className="flex items-center gap-0.5">
      <Button
        variant="ghost"
        className={buttonClassName}
        aria-label={t(reviewLater ? "actions.standard" : "actions.reviewLater", params)}
        title={t(reviewLater ? "actions.standard" : "actions.reviewLater", params)}
        disabled={disabled}
        onClick={() => onChange(problem, reviewLater ? null : "review_later")}
      >
        <ReviewIcon className="size-4" aria-hidden="true" />
      </Button>
      <Button
        variant="ghost"
        className={buttonClassName}
        aria-label={t(inProgress ? "actions.standard" : "actions.inProgress", params)}
        title={t(inProgress ? "actions.standard" : "actions.inProgress", params)}
        disabled={disabled}
        onClick={() => onChange(problem, inProgress ? null : "in_progress")}
      >
        <ProgressIcon className="size-4" aria-hidden="true" />
      </Button>
    </div>
  );
}
