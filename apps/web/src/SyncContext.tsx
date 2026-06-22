import type { JudgeSyncEvent, JudgeSyncInput, JudgeSyncSummary } from "@icpc-trainer/api";
import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState, type ReactNode } from "react";

import { syncObservableProviders } from "./judgeConfig.js";
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

interface ProviderSyncProgress {
  readonly provider: JudgeSyncInput["provider"];
  readonly status: SyncStatus;
  readonly latestEvent: JudgeSyncEvent | null;
  readonly summary: JudgeSyncSummary | null;
  readonly stepsTotal: number;
  readonly stepsLeft: number;
  readonly progress: number;
  readonly steps: SyncSteps;
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
  readonly providers: readonly ProviderSyncProgress[];
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

const eventSummary = (event: JudgeSyncEvent | undefined): JudgeSyncSummary | null =>
  event?.type === "completed" ? event.summary : null;

const syncProgress = (stepsTotal: number, stepsLeft: number): number =>
  stepsTotal === 0 ? 0 : Math.round(((stepsTotal - stepsLeft) / stepsTotal) * 100);

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

const providerStatus = (
  provider: JudgeSyncInput["provider"],
  events: readonly JudgeSyncEvent[],
  runningProviders: ReadonlySet<JudgeSyncInput["provider"]>
): SyncStatus => {
  if (runningProviders.has(provider)) {
    return "running";
  }

  const latest = events.at(-1);
  if (latest?.type === "completed") {
    return latest.summary.errors > 0 ? "error" : "completed";
  }
  if (latest?.type === "error") {
    return "error";
  }

  return "idle";
};

const providerProgresses = (
  providerSteps: ReadonlyMap<JudgeSyncInput["provider"], SyncSteps>,
  providerEvents: ReadonlyMap<JudgeSyncInput["provider"], readonly JudgeSyncEvent[]>,
  runningProviders: ReadonlySet<JudgeSyncInput["provider"]>
): readonly ProviderSyncProgress[] => {
  const providers = new Set<JudgeSyncInput["provider"]>([
    ...providerSteps.keys(),
    ...providerEvents.keys(),
    ...runningProviders
  ]);

  return [...providers].map((provider) => {
    const steps = providerSteps.get(provider) ?? emptySteps();
    const events = providerEvents.get(provider) ?? [];
    const latestEvent = events.at(-1) ?? null;
    const detailedStepsTotal = steps.submissions.total + steps.contests.total;
    const detailedStepsLeft = Math.max(
      detailedStepsTotal - steps.submissions.processed - steps.contests.processed,
      0
    );
    const stepsTotal = latestEvent?.stepsTotal ?? detailedStepsTotal;
    const stepsLeft = Math.max(Math.min(latestEvent?.stepsLeft ?? detailedStepsLeft, stepsTotal), 0);

    return {
      provider,
      status: providerStatus(provider, events, runningProviders),
      latestEvent,
      summary: eventSummary(latestEvent ?? undefined),
      stepsTotal,
      stepsLeft,
      progress: syncProgress(stepsTotal, stepsLeft),
      steps
    };
  });
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
  const [providers, setProviders] = useState<readonly ProviderSyncProgress[]>([]);
  const subscriptionsRef = useRef<Array<{ unsubscribe: () => void }>>([]);
  const providerStepsRef = useRef(new Map<JudgeSyncInput["provider"], SyncSteps>());
  const providerEventsRef = useRef(new Map<JudgeSyncInput["provider"], JudgeSyncEvent[]>());
  const runningProvidersRef = useRef(new Set<JudgeSyncInput["provider"]>());
  const summaryRef = useRef<JudgeSyncSummary>(emptySummary());

  const publishAggregateState = useCallback(() => {
    const nextSteps = aggregateSteps(providerStepsRef.current);
    setSteps(nextSteps);
    setProviders(providerProgresses(providerStepsRef.current, providerEventsRef.current, runningProvidersRef.current));

    const nextStepsTotal = nextSteps.submissions.total + nextSteps.contests.total;
    const nextStepsLeft = nextStepsTotal - nextSteps.submissions.processed - nextSteps.contests.processed;
    setStepsTotal(nextStepsTotal);
    setStepsLeft(Math.max(nextStepsLeft, 0));

    const nextEvents = [...providerEventsRef.current.values()].flat();
    setEvents(nextEvents);

    if (runningProvidersRef.current.size > 0) {
      setStatus("running");
      setSummary(null);
      return;
    }

    if (nextEvents.length === 0) {
      setStatus("idle");
      setLatestEvent(null);
      setSummary(null);
      return;
    }

    setSummary(summaryRef.current);
    setStatus(summaryRef.current.errors > 0 ? "error" : "completed");
  }, []);

  const replayProviderEvents = useCallback((provider: JudgeSyncInput["provider"], replayedEvents: readonly JudgeSyncEvent[]) => {
    let nextSteps = emptySteps();
    for (const event of replayedEvents) {
      nextSteps = applyEventToSteps(nextSteps, event);
    }
    providerStepsRef.current.set(provider, nextSteps);
    providerEventsRef.current.set(provider, [...replayedEvents]);
  }, []);

  const handleProviderEvent = useCallback((provider: JudgeSyncInput["provider"], event: JudgeSyncEvent) => {
    providerEventsRef.current.set(provider, [
      ...(providerEventsRef.current.get(provider) ?? []),
      event
    ]);
    setLatestEvent(event);

    if (event.type === "started") {
      runningProvidersRef.current.add(provider);
    }

    if (event.type === "error") {
      toaster.error({
        title: `Could not sync ${event.provider}`,
        description: event.message
      });
    }

    const currentSteps = providerStepsRef.current.get(provider) ?? emptySteps();
    providerStepsRef.current.set(provider, applyEventToSteps(currentSteps, event));

    if (event.type === "completed") {
      summaryRef.current = addSummary(summaryRef.current, event.summary);
      runningProvidersRef.current.delete(provider);
    }

    publishAggregateState();
  }, [publishAggregateState, toaster]);

  useEffect(() => {
    subscriptionsRef.current = syncObservableProviders.map((provider) =>
      trpc.judges.observeSync.subscribe(
        { provider },
        {
          onData: (event) => {
            if (event.type === "snapshot") {
              if (event.running) {
                runningProvidersRef.current.add(provider);
                replayProviderEvents(provider, event.events);
                setLatestEvent(event.events.at(-1) ?? null);
              } else {
                runningProvidersRef.current.delete(provider);
                providerStepsRef.current.delete(provider);
                providerEventsRef.current.delete(provider);
              }
              publishAggregateState();
              return;
            }

            handleProviderEvent(provider, event);
          },
          onError: (error) => {
            const errorEvent: JudgeSyncEvent = {
              type: "error",
              provider,
              phase: "database",
              message: error.message,
              stepsTotal: 0,
              stepsLeft: 0
            };
            handleProviderEvent(provider, errorEvent);
          }
        }
      )
    );

    return () => {
      for (const subscription of subscriptionsRef.current) {
        subscription.unsubscribe();
      }
      subscriptionsRef.current = [];
    };
  }, [handleProviderEvent, publishAggregateState, replayProviderEvents]);

  const startSync = useCallback((providers: readonly JudgeSyncInput["provider"][]) => {
    const uniqueProviders = [...new Set(providers)];
    if (uniqueProviders.length === 0 || runningProvidersRef.current.size > 0 || status === "running") {
      return;
    }

    setEvents([]);
    setLatestEvent(null);
    setSummary(null);
    setStepsTotal(0);
    setStepsLeft(0);
    setSteps(emptySteps());
    setProviders(uniqueProviders.map((provider) => ({
      provider,
      status: "running",
      latestEvent: null,
      summary: null,
      stepsTotal: 0,
      stepsLeft: 0,
      progress: 0,
      steps: emptySteps()
    })));
    providerStepsRef.current = new Map(uniqueProviders.map((provider) => [provider, emptySteps()]));
    providerEventsRef.current = new Map(uniqueProviders.map((provider) => [provider, []]));
    runningProvidersRef.current = new Set(uniqueProviders);
    summaryRef.current = emptySummary();
    setStatus("running");

    for (const provider of uniqueProviders) {
      void trpc.judges.startSync.mutate({ provider }).catch((error: unknown) => {
        const message = error instanceof Error ? error.message : String(error);
        runningProvidersRef.current.delete(provider);
        setStatus("error");
        toaster.error({
          title: `Could not sync ${provider}`,
          description: message
        });
      });
    }
  }, [status, toaster]);

  const progress = syncProgress(stepsTotal, stepsLeft);

  const value = useMemo<SyncContextValue>(() => ({
    status,
    latestEvent,
    events,
    summary,
    stepsTotal,
    stepsLeft,
    progress,
    steps,
    providers,
    startSync
  }), [events, latestEvent, progress, providers, startSync, status, steps, stepsLeft, stepsTotal, summary]);

  return <SyncContext.Provider value={value}>{children}</SyncContext.Provider>;
}

export function useSync(): SyncContextValue {
  const context = useContext(SyncContext);
  if (!context) {
    throw new Error("useSync must be used inside SyncProvider.");
  }
  return context;
}
