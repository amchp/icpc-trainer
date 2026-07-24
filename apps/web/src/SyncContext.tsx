import type {
  JudgeSyncEvent,
  JudgeSyncInput,
  JudgeSyncProviderState,
  JudgeSyncStepState,
  JudgeSyncSummary
} from "@icpc-trainer/api";
import {
  JUDGE_SYNC_EVENT_TYPES as JudgeSyncEventType,
  PROVIDER_STATE_EVENT_TYPES,
  RUN_STATUSES as SyncRunStatus,
  SYNC_ERROR_PHASES,
  SYNC_STEP_STATUSES as SyncStepStatus,
  LOCALIZED_MESSAGE_CODES,
  type AppLocale,
  type LocalizedMessageReference,
  type RunStatus
} from "@icpc-trainer/shared";
import type { TFunction } from "i18next";
import { useQueryClient } from "@tanstack/react-query";
import { createContext, useCallback, useContext, useMemo, useRef, useState, type ReactNode } from "react";
import { useTranslation } from "react-i18next";

import { formatNumber } from "./i18n/format.js";
import { useLocale } from "./i18n/LocaleProvider.js";
import { localizedMessageText } from "./i18n/localizedMessage.js";
import { judgeLabel, syncObservableProviders } from "./judgeConfig.js";
import { useProviderStateSubscriptions } from "./providerRunObserver.js";
import { invalidateAfterJudgeSync } from "./queryKeys.js";
import { useToaster } from "./Toaster.js";
import { trpc } from "./trpc.js";

type SyncStatus = RunStatus;

interface SyncStepProgress extends JudgeSyncStepState {
  readonly progress: number;
}

interface SyncSteps {
  readonly submissions: SyncStepProgress;
  readonly contests: SyncStepProgress;
  readonly regularCatalog: SyncStepProgress;
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
  status: SyncStepStatus.Pending,
  total: 0,
  processed: 0,
  progress: 0
});

const emptySummary = (): JudgeSyncSummary => ({
  usersProcessed: 0,
  submissionsFetched: 0,
  submissionsInserted: 0,
  submissionsUpdated: 0,
  submissionsSkipped: 0,
  contestsSynced: 0,
  regularContestsImported: 0,
  regularProblemsImported: 0,
  regularPendingSubmissionsRetried: 0,
  errors: 0
});

const addSummary = (left: JudgeSyncSummary, right: JudgeSyncSummary): JudgeSyncSummary => ({
  usersProcessed: left.usersProcessed + right.usersProcessed,
  submissionsFetched: left.submissionsFetched + right.submissionsFetched,
  submissionsInserted: left.submissionsInserted + right.submissionsInserted,
  submissionsUpdated: left.submissionsUpdated + right.submissionsUpdated,
  submissionsSkipped: left.submissionsSkipped + right.submissionsSkipped,
  contestsSynced: left.contestsSynced + right.contestsSynced,
  regularContestsImported: left.regularContestsImported + right.regularContestsImported,
  regularProblemsImported: left.regularProblemsImported + right.regularProblemsImported,
  regularPendingSubmissionsRetried: left.regularPendingSubmissionsRetried + right.regularPendingSubmissionsRetried,
  errors: left.errors + right.errors
});

export const completionSummaryDescription = (
  summary: JudgeSyncSummary,
  t: TFunction<"shell">,
  locale: AppLocale
): string => {
  const changedContests = summary.contestsSynced + summary.regularContestsImported;
  const contests = t("syncProgress.completion.contests", {
    value: t("syncProgress.completion.contest", { count: changedContests, value: formatNumber(changedContests, locale) })
  });
  const problems = t("syncProgress.completion.problems", {
    value: t("syncProgress.completion.problem", {
      count: summary.regularProblemsImported,
      value: formatNumber(summary.regularProblemsImported, locale)
    })
  });
  const submissions = t("syncProgress.completion.submissions", {
    inserted: t("syncProgress.completion.inserted", {
      count: summary.submissionsInserted,
      value: formatNumber(summary.submissionsInserted, locale)
    }),
    updated: t("syncProgress.completion.updated", {
      count: summary.submissionsUpdated,
      value: formatNumber(summary.submissionsUpdated, locale)
    })
  });

  return t("syncProgress.completion.description", { contests, problems, submissions });
};

const completionKey = (
  provider: JudgeSyncInput["provider"],
  summary: JudgeSyncSummary
): string => [
  provider,
  summary.usersProcessed,
  summary.submissionsFetched,
  summary.submissionsInserted,
  summary.submissionsUpdated,
  summary.submissionsSkipped,
  summary.contestsSynced,
  summary.regularContestsImported,
  summary.regularProblemsImported,
  summary.regularPendingSubmissionsRetried,
  summary.errors
].join(":");

const stepProgress = (processed: number, total: number): number =>
  total === 0 ? 0 : Math.round((processed / total) * 100);

const toStepProgress = (step: JudgeSyncStepState): SyncStepProgress => ({
  ...step,
  progress: stepProgress(step.processed, step.total)
});

const syncProgress = (stepsTotal: number, stepsLeft: number): number =>
  stepsTotal === 0 ? 0 : Math.round(((stepsTotal - stepsLeft) / stepsTotal) * 100);

const aggregateStatus = (steps: readonly SyncStepProgress[]): SyncStepProgress["status"] => {
  if (steps.some((step) => step.status === SyncStepStatus.Error)) {
    return SyncStepStatus.Error;
  }
  if (steps.some((step) => step.status === SyncStepStatus.Running)) {
    return SyncStepStatus.Running;
  }
  if (steps.length > 0 && steps.every((step) => step.status === SyncStepStatus.Completed)) {
    return SyncStepStatus.Completed;
  }
  return SyncStepStatus.Pending;
};

const aggregateStep = (steps: readonly SyncStepProgress[]): SyncStepProgress => {
  const processed = steps.reduce((total, step) => total + step.processed, 0);
  const total = steps.reduce((sum, step) => sum + step.total, 0);
  const current = steps.find((step) => step.status === SyncStepStatus.Running && step.current !== undefined)?.current;

  return {
    status: aggregateStatus(steps),
    total,
    processed: Math.max(0, Math.min(processed, total)),
    progress: stepProgress(processed, total),
    current
  };
};

const stateSteps = (state: JudgeSyncProviderState): SyncSteps => ({
  submissions: toStepProgress(state.steps.submissions),
  contests: toStepProgress(state.steps.contests),
  regularCatalog: toStepProgress(state.steps.regularCatalog)
});

const aggregateSteps = (providerStates: readonly JudgeSyncProviderState[]): SyncSteps => {
  const steps = providerStates.map(stateSteps);

  return {
    submissions: aggregateStep(steps.map((step) => step.submissions)),
    contests: aggregateStep(steps.map((step) => step.contests)),
    regularCatalog: aggregateStep(steps.map((step) => step.regularCatalog))
  };
};

const providerProgress = (state: JudgeSyncProviderState): ProviderSyncProgress => ({
  provider: state.provider,
  status: state.status,
  latestEvent: state.latestEvent,
  summary: state.summary,
  stepsTotal: state.stepsTotal,
  stepsLeft: state.stepsLeft,
  progress: syncProgress(state.stepsTotal, state.stepsLeft),
  steps: stateSteps(state)
});

const optimisticProviderState = (provider: JudgeSyncInput["provider"]): JudgeSyncProviderState => ({
  type: PROVIDER_STATE_EVENT_TYPES.State,
  provider,
  status: SyncRunStatus.Running,
  stepsTotal: 0,
  stepsLeft: 0,
  latestEvent: null,
  summary: null,
  steps: {
    submissions: emptyStep(),
    contests: emptyStep(),
    regularCatalog: emptyStep()
  }
});

const errorProviderState = (
  provider: JudgeSyncInput["provider"],
  message: LocalizedMessageReference
): JudgeSyncProviderState => {
  const latestEvent: JudgeSyncEvent = {
    type: JudgeSyncEventType.Error,
    provider,
    phase: SYNC_ERROR_PHASES.Database,
    message,
    stepsTotal: 0,
    stepsLeft: 0
  };

  return {
    ...optimisticProviderState(provider),
    status: SyncRunStatus.Error,
    latestEvent,
    summary: {
      ...emptySummary(),
      errors: 1
    }
  };
};

export function SyncProvider({ children }: { readonly children: ReactNode }): React.JSX.Element {
  const { t } = useTranslation("shell");
  const { locale } = useLocale();
  const toaster = useToaster();
  const queryClient = useQueryClient();
  const [providerStates, setProviderStates] = useState<ReadonlyMap<JudgeSyncInput["provider"], JudgeSyncProviderState>>(
    () => new Map()
  );
  const [latestEvent, setLatestEvent] = useState<JudgeSyncEvent | null>(null);
  const shownErrorsRef = useRef(new Set<string>());
  const invalidatedCompletionsRef = useRef(new Set<string>());
  const runningProvidersRef = useRef(new Set<JudgeSyncInput["provider"]>());

  const setProviderState = useCallback((state: JudgeSyncProviderState) => {
    setProviderStates((current) => {
      const next = new Map(current);
      next.set(state.provider, state);
      return next;
    });

    if (state.latestEvent !== null) {
      setLatestEvent(state.latestEvent);
    }

    if (state.status === SyncRunStatus.Running) {
      runningProvidersRef.current.add(state.provider);
    }

    if (state.latestEvent?.type === JudgeSyncEventType.Error) {
      const key = `${state.provider}:${JSON.stringify(state.latestEvent.message)}`;
      if (!shownErrorsRef.current.has(key)) {
        shownErrorsRef.current.add(key);
        toaster.error({
          title: t("syncProgress.error", { judge: state.provider }),
          description: localizedMessageText(state.latestEvent.message)
        });
      }
    }

    if (state.latestEvent?.type === JudgeSyncEventType.Completed) {
      const key = completionKey(state.provider, state.latestEvent.summary);
      if (!invalidatedCompletionsRef.current.has(key)) {
        invalidatedCompletionsRef.current.add(key);
        invalidateAfterJudgeSync(queryClient);
        if (state.latestEvent.summary.errors === 0 && runningProvidersRef.current.has(state.provider)) {
          toaster.success({
            title: t("syncProgress.complete", { judge: judgeLabel(state.provider) }),
            description: completionSummaryDescription(state.latestEvent.summary, t, locale)
          });
        }
      }
    }

    if (state.status === SyncRunStatus.Completed || state.status === SyncRunStatus.Error) {
      runningProvidersRef.current.delete(state.provider);
    }
  }, [locale, queryClient, t, toaster]);

  const subscribeToSyncState = useCallback((
    provider: JudgeSyncInput["provider"],
    handlers: {
      readonly onData: (state: JudgeSyncProviderState) => void;
      readonly onError: (error: Error) => void;
    }
  ) =>
    trpc.judges.observeSync.subscribe(
      { provider },
      handlers
    ), []);
  const handleSyncSubscriptionError = useCallback((
    provider: JudgeSyncInput["provider"],
    error: Error
  ) => {
    setProviderState(errorProviderState(provider, {
      code: LOCALIZED_MESSAGE_CODES.Unavailable
    }));
  }, [setProviderState]);

  useProviderStateSubscriptions({
    providers: syncObservableProviders,
    subscribe: subscribeToSyncState,
    onData: setProviderState,
    onError: handleSyncSubscriptionError
  });

  const startSync = useCallback((providers: readonly JudgeSyncInput["provider"][]) => {
    const uniqueProviders = [...new Set(providers)];
    const hasRunningProvider = [...providerStates.values()].some((state) => state.status === SyncRunStatus.Running);
    if (uniqueProviders.length === 0 || hasRunningProvider) {
      return;
    }

    shownErrorsRef.current.clear();
    invalidatedCompletionsRef.current.clear();
    for (const provider of uniqueProviders) {
      runningProvidersRef.current.add(provider);
    }
    setProviderStates((current) => {
      const next = new Map(current);
      for (const provider of uniqueProviders) {
        next.set(provider, optimisticProviderState(provider));
      }
      return next;
    });
    setLatestEvent(null);

    for (const provider of uniqueProviders) {
      void trpc.judges.startSync.mutate({ provider }).catch((error: unknown) => {
        setProviderState(errorProviderState(provider, {
          code: LOCALIZED_MESSAGE_CODES.GenericError,
          technicalDetail: error instanceof Error ? error.message : String(error)
        }));
      });
    }
  }, [providerStates, setProviderState]);

  const providerStateList = useMemo(() => [...providerStates.values()], [providerStates]);
  const providers = useMemo(
    () => providerStateList.map(providerProgress),
    [providerStateList]
  );
  const events = useMemo(
    () => providerStateList.flatMap((state) => state.latestEvent === null ? [] : [state.latestEvent]),
    [providerStateList]
  );
  const summary = useMemo(
    () => {
      const summaries = providerStateList.flatMap((state) => state.summary === null ? [] : [state.summary]);
      return summaries.length === 0 ? null : summaries.reduce(addSummary, emptySummary());
    },
    [providerStateList]
  );
  const status = useMemo<SyncStatus>(() => {
    if (providerStateList.some((state) => state.status === SyncRunStatus.Running)) {
      return "running";
    }
    if (providerStateList.some((state) => state.status === SyncRunStatus.Error)) {
      return "error";
    }
    if (providerStateList.some((state) => state.status === SyncRunStatus.Completed)) {
      return "completed";
    }
    return "idle";
  }, [providerStateList]);
  const steps = useMemo(() => aggregateSteps(providerStateList), [providerStateList]);
  const stepsTotal = providerStateList.reduce((total, state) => total + state.stepsTotal, 0);
  const stepsLeft = providerStateList.reduce((total, state) => total + state.stepsLeft, 0);
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
