import type { JudgeSyncEvent, JudgeSyncInput, JudgeSyncSummary } from "@icpc-trainer/api";
import { createContext, useCallback, useContext, useMemo, useRef, useState, type ReactNode } from "react";

import { useToaster } from "./Toaster.js";
import { trpc } from "./trpc.js";

type SyncStatus = "idle" | "running" | "completed" | "error";
type SyncStepStatus = "pending" | "running" | "completed" | "error";

interface SyncStepProgress {
  readonly status: SyncStepStatus;
  readonly total: number;
  readonly processed: number;
  readonly progress: number;
  readonly current?: string;
}

interface SyncSteps {
  readonly submissions: SyncStepProgress;
  readonly contests: SyncStepProgress;
}

interface SyncContextValue {
  readonly status: SyncStatus;
  readonly latestEvent: JudgeSyncEvent | null;
  readonly events: readonly JudgeSyncEvent[];
  readonly summary: JudgeSyncSummary | null;
  readonly stepsTotal: number;
  readonly stepsLeft: number;
  readonly progress: number;
  readonly steps: SyncSteps;
  readonly startSync: (providers: readonly JudgeSyncInput["provider"][]) => void;
}

const SyncContext = createContext<SyncContextValue | null>(null);

const emptyStep = (): SyncStepProgress => ({
  status: "pending",
  total: 0,
  processed: 0,
  progress: 0
});

const stepProgress = (processed: number, total: number): number =>
  total === 0 ? 0 : Math.round((processed / total) * 100);

const syncStep = (
  status: SyncStepStatus,
  processed: number,
  total: number,
  current?: string
): SyncStepProgress => {
  const safeTotal = Math.max(total, 0);
  const safeProcessed = Math.max(0, Math.min(processed, safeTotal));

  return {
    status,
    total: safeTotal,
    processed: safeProcessed,
    progress: stepProgress(safeProcessed, safeTotal),
    current
  };
};

const emptySteps = (): SyncSteps => ({
  submissions: emptyStep(),
  contests: emptyStep()
});

const emptySummary = (): JudgeSyncSummary => ({
  usersProcessed: 0,
  submissionsFetched: 0,
  submissionsInserted: 0,
  submissionsUpdated: 0,
  submissionsSkipped: 0,
  contestsSynced: 0,
  errors: 0
});

const addSummary = (left: JudgeSyncSummary, right: JudgeSyncSummary): JudgeSyncSummary => ({
  usersProcessed: left.usersProcessed + right.usersProcessed,
  submissionsFetched: left.submissionsFetched + right.submissionsFetched,
  submissionsInserted: left.submissionsInserted + right.submissionsInserted,
  submissionsUpdated: left.submissionsUpdated + right.submissionsUpdated,
  submissionsSkipped: left.submissionsSkipped + right.submissionsSkipped,
  contestsSynced: left.contestsSynced + right.contestsSynced,
  errors: left.errors + right.errors
});

const aggregateStatus = (steps: readonly SyncStepProgress[]): SyncStepStatus => {
  if (steps.some((step) => step.status === "error")) {
    return "error";
  }
  if (steps.some((step) => step.status === "running")) {
    return "running";
  }
  if (steps.length > 0 && steps.every((step) => step.status === "completed")) {
    return "completed";
  }
  return "pending";
};

const aggregateStep = (steps: readonly SyncStepProgress[]): SyncStepProgress => {
  const processed = steps.reduce((total, step) => total + step.processed, 0);
  const total = steps.reduce((sum, step) => sum + step.total, 0);
  const current = steps.find((step) => step.status === "running" && step.current !== undefined)?.current;

  return syncStep(aggregateStatus(steps), processed, total, current);
};

const aggregateSteps = (providerSteps: ReadonlyMap<JudgeSyncInput["provider"], SyncSteps>): SyncSteps => {
  const steps = [...providerSteps.values()];

  return {
    submissions: aggregateStep(steps.map((step) => step.submissions)),
    contests: aggregateStep(steps.map((step) => step.contests))
  };
};

const applyEventToSteps = (current: SyncSteps, event: JudgeSyncEvent): SyncSteps => {
  if (event.type === "submissions.syncing") {
    return {
      ...current,
      submissions: syncStep(event.usersTotal === 0 ? "completed" : "running", 0, event.usersTotal)
    };
  }

  if (event.type === "submissions.userSyncing") {
    return {
      ...current,
      submissions: syncStep("running", event.userIndex - 1, event.usersTotal, event.userHandle)
    };
  }

  if (event.type === "submissions.userSynced") {
    const processed = current.submissions.processed + 1;
    return {
      ...current,
      submissions: syncStep(
        processed >= current.submissions.total ? "completed" : "running",
        processed,
        current.submissions.total,
        event.userHandle
      )
    };
  }

  if (event.type === "contests.syncing") {
    return {
      ...current,
      contests: syncStep(event.contestsTotal === 0 ? "completed" : "running", 0, event.contestsTotal)
    };
  }

  if (event.type === "contests.contestSyncing") {
    return {
      ...current,
      contests: syncStep(
        "running",
        event.contestsTotal - event.contestsLeft,
        event.contestsTotal,
        event.contestJudgeId
      )
    };
  }

  if (event.type === "contests.contestSynced") {
    const processed = current.contests.processed + 1;
    return {
      ...current,
      contests: syncStep(
        processed >= current.contests.total ? "completed" : "running",
        processed,
        current.contests.total,
        event.contestJudgeId
      )
    };
  }

  if (event.type === "error") {
    if (event.step === "submissions") {
      return {
        ...current,
        submissions: { ...current.submissions, status: "error", current: event.userHandle }
      };
    }

    if (event.step === "contests") {
      return {
        ...current,
        contests: { ...current.contests, status: "error", current: event.contestJudgeId }
      };
    }
  }

  if (event.type === "completed") {
    return {
      submissions: syncStep("completed", current.submissions.total, current.submissions.total),
      contests: syncStep("completed", current.contests.total, current.contests.total)
    };
  }

  return current;
};

export function SyncProvider({ children }: { readonly children: ReactNode }): React.JSX.Element {
  const toaster = useToaster();
  const [status, setStatus] = useState<SyncStatus>("idle");
  const [events, setEvents] = useState<readonly JudgeSyncEvent[]>([]);
  const [latestEvent, setLatestEvent] = useState<JudgeSyncEvent | null>(null);
  const [summary, setSummary] = useState<JudgeSyncSummary | null>(null);
  const [stepsTotal, setStepsTotal] = useState(0);
  const [stepsLeft, setStepsLeft] = useState(0);
  const [steps, setSteps] = useState<SyncSteps>(emptySteps);
  const subscriptionsRef = useRef<Array<{ unsubscribe: () => void }>>([]);
  const providerStepsRef = useRef(new Map<JudgeSyncInput["provider"], SyncSteps>());
  const completedProvidersRef = useRef(new Set<JudgeSyncInput["provider"]>());
  const summaryRef = useRef<JudgeSyncSummary>(emptySummary());

  const startSync = useCallback((providers: readonly JudgeSyncInput["provider"][]) => {
    if (subscriptionsRef.current.length > 0 || providers.length === 0) {
      return;
    }

    const uniqueProviders = [...new Set(providers)];
    setStatus("running");
    setEvents([]);
    setLatestEvent(null);
    setSummary(null);
    setStepsTotal(0);
    setStepsLeft(0);
    setSteps(emptySteps());
    providerStepsRef.current = new Map(uniqueProviders.map((provider) => [provider, emptySteps()]));
    completedProvidersRef.current = new Set();
    summaryRef.current = emptySummary();

    subscriptionsRef.current = uniqueProviders.map((provider) =>
      trpc.judges.sync.subscribe(
        { provider },
        {
          onData: (event) => {
            setEvents((current) => [...current, event]);
            setLatestEvent(event);

            if (event.type === "error") {
              toaster.error({
                title: `Could not sync ${event.provider}`,
                description: event.message
              });
            }

            const currentSteps = providerStepsRef.current.get(provider) ?? emptySteps();
            providerStepsRef.current.set(provider, applyEventToSteps(currentSteps, event));
            const nextSteps = aggregateSteps(providerStepsRef.current);
            setSteps(nextSteps);

            const nextStepsTotal = nextSteps.submissions.total + nextSteps.contests.total;
            const nextStepsLeft = nextStepsTotal - nextSteps.submissions.processed - nextSteps.contests.processed;
            setStepsTotal(nextStepsTotal);
            setStepsLeft(Math.max(nextStepsLeft, 0));

            if (event.type === "completed") {
              summaryRef.current = addSummary(summaryRef.current, event.summary);
              completedProvidersRef.current.add(provider);

              if (completedProvidersRef.current.size === uniqueProviders.length) {
                setSummary(summaryRef.current);
                setStatus(summaryRef.current.errors > 0 ? "error" : "completed");
                for (const subscription of subscriptionsRef.current) {
                  subscription.unsubscribe();
                }
                subscriptionsRef.current = [];
              }
            }
          },
          onError: (error) => {
            const errorEvent: JudgeSyncEvent = {
              type: "error",
              provider,
              phase: "database",
              message: error.message,
              stepsTotal,
              stepsLeft
            };
            setLatestEvent(errorEvent);
            setEvents((current) => [...current, errorEvent]);
            toaster.error({
              title: `Could not sync ${provider}`,
              description: error.message
            });
            setStatus("error");
            const currentSteps = providerStepsRef.current.get(provider) ?? emptySteps();
            providerStepsRef.current.set(provider, {
              submissions: currentSteps.submissions.status === "running"
                ? { ...currentSteps.submissions, status: "error" }
                : currentSteps.submissions,
              contests: currentSteps.contests.status === "running"
                ? { ...currentSteps.contests, status: "error" }
                : currentSteps.contests
            });
            setSteps(aggregateSteps(providerStepsRef.current));
            for (const subscription of subscriptionsRef.current) {
              subscription.unsubscribe();
            }
            subscriptionsRef.current = [];
          }
        }
      )
    );
  }, [stepsLeft, stepsTotal, toaster]);

  const progress = stepsTotal === 0 ? 0 : Math.round(((stepsTotal - stepsLeft) / stepsTotal) * 100);

  const value = useMemo<SyncContextValue>(() => ({
    status,
    latestEvent,
    events,
    summary,
    stepsTotal,
    stepsLeft,
    progress,
    steps,
    startSync
  }), [events, latestEvent, progress, startSync, status, steps, stepsLeft, stepsTotal, summary]);

  return <SyncContext.Provider value={value}>{children}</SyncContext.Provider>;
}

export function useSync(): SyncContextValue {
  const context = useContext(SyncContext);
  if (!context) {
    throw new Error("useSync must be used inside SyncProvider.");
  }
  return context;
}
