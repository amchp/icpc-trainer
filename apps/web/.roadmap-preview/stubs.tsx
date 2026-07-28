import { LEARNING_GUIDE_IDS, LEARNING_PROGRESS_STATUSES } from "@icpc-trainer/shared";
import type { ReactNode } from "react";

export function Link({ children, to, className }: { children: ReactNode; to: string; className?: string }): React.JSX.Element {
  return <a href={to} className={className}>{children}</a>;
}

const done = new URLSearchParams(window.location.search).get("done")?.split(",") ?? [];
const status = (key: string) => done.includes(key) ? LEARNING_PROGRESS_STATUSES.Completed : LEARNING_PROGRESS_STATUSES.InProgress;

export function useLearningProgress() {
  return {
    data: [
      { guideId: LEARNING_GUIDE_IDS.Introduction, status: status("1") },
      { guideId: LEARNING_GUIDE_IDS.ProgrammingFundamentals, status: status("2") },
      { guideId: LEARNING_GUIDE_IDS.TimeComplexity, status: status("3") },
      { guideId: LEARNING_GUIDE_IDS.DataStructures, status: status("4") }
    ],
    isLoading: false,
    isError: false,
    refetch: () => undefined
  };
}
