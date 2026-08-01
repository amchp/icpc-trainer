import { LEARNING_GUIDE_IDS, LEARNING_PROGRESS_STATUSES } from "@icpc-trainer/shared";
import type { ReactNode } from "react";

export function Link({ children, to, className }: { children: ReactNode; to: string; className?: string }): React.JSX.Element {
  return <a href={to} className={className}>{children}</a>;
}

export function useNavigate() {
  return () => undefined;
}

export function useParams() {
  return {} as Record<string, string>;
}

const done = new URLSearchParams(window.location.search).get("done")?.split(",") ?? [];
const status = (key: string) => done.includes(key) ? LEARNING_PROGRESS_STATUSES.Completed : LEARNING_PROGRESS_STATUSES.InProgress;

export function useLearningProgress() {
  return {
    data: [
      { guideId: LEARNING_GUIDE_IDS.Introduction, status: status("1") },
      { guideId: LEARNING_GUIDE_IDS.ProgrammingFundamentals, status: status("2") },
      { guideId: LEARNING_GUIDE_IDS.TimeComplexity, status: status("3") },
      { guideId: LEARNING_GUIDE_IDS.DataStructures, status: status("4") },
      { guideId: LEARNING_GUIDE_IDS.BruteForce, status: status("5") },
      { guideId: LEARNING_GUIDE_IDS.BinarySearch, status: status("6") },
      { guideId: LEARNING_GUIDE_IDS.GraphTheory, status: status("7") }
    ],
    isLoading: false,
    isError: false,
    refetch: () => undefined
  };
}

const noopMutation = { mutate: () => undefined, isPending: false };

export function useStartLearningGuide() {
  return noopMutation;
}

export function useSetLearningProgressStatus() {
  return noopMutation;
}

/** Clerk stand-in: the preview runs signed out, so no progress mutation ever fires. */
export function useAuth() {
  return { userId: null };
}

export function useToaster() {
  return { success: () => undefined, error: () => undefined, info: () => undefined };
}
