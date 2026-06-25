import {
  type JudgeSyncEvent,
  type JudgeSyncInput,
  type JudgeSyncProviderState,
  type JudgeSyncStepState,
  JudgeSyncEventType,
  SyncRunStatus,
  SyncStepStatus
} from "@icpc-trainer/api";
import { PROVIDER_STATE_EVENT_TYPES } from "@icpc-trainer/shared";

const emptySyncStep = (): JudgeSyncStepState => ({
  status: SyncStepStatus.Pending,
  total: 0,
  processed: 0
});

const emptySyncSteps = (): JudgeSyncProviderState["steps"] => ({
  submissions: emptySyncStep(),
  contests: emptySyncStep(),
  regularCatalog: emptySyncStep()
});

export const emptyProviderState = (provider: JudgeSyncInput["provider"]): JudgeSyncProviderState => ({
  type: PROVIDER_STATE_EVENT_TYPES.State,
  provider,
  status: SyncRunStatus.Idle,
  stepsTotal: 0,
  stepsLeft: 0,
  latestEvent: null,
  summary: null,
  steps: emptySyncSteps()
});

const finiteNumber = (value: unknown): number =>
  typeof value === "number" && Number.isFinite(value) ? value : 0;

const syncStep = (
  status: JudgeSyncStepState["status"],
  processed: unknown,
  total: unknown,
  current?: string
): JudgeSyncStepState => {
  const safeTotal = Math.max(finiteNumber(total), 0);
  const safeProcessed = Math.max(0, Math.min(finiteNumber(processed), safeTotal));

  return current === undefined
    ? { status, total: safeTotal, processed: safeProcessed }
    : { status, total: safeTotal, processed: safeProcessed, current };
};

const withEventProgress = (
  state: JudgeSyncProviderState,
  event: JudgeSyncEvent,
  status: JudgeSyncProviderState["status"] = SyncRunStatus.Running
): JudgeSyncProviderState => {
  const stepsTotal = Math.max(finiteNumber(event.stepsTotal), 0);
  const stepsLeft = Math.max(0, Math.min(finiteNumber(event.stepsLeft), stepsTotal));

  return {
    ...state,
    status,
    stepsTotal,
    stepsLeft,
    latestEvent: event
  };
};

export const applyJudgeSyncEventToState = (
  current: JudgeSyncProviderState,
  event: JudgeSyncEvent
): JudgeSyncProviderState => {
  switch (event.type) {
    case JudgeSyncEventType.Started:
      return {
        ...withEventProgress(emptyProviderState(event.provider), event),
        status: SyncRunStatus.Running
      };
    case JudgeSyncEventType.Step:
      return {
        ...withEventProgress(current, event),
        steps: {
          ...current.steps,
          [event.step]: syncStep(event.stepStatus, event.processed, event.total, event.current)
        }
      };
    case JudgeSyncEventType.Error:
      return event.step === undefined
        ? withEventProgress(current, event)
        : {
            ...withEventProgress(current, event),
            steps: {
              ...current.steps,
              [event.step]: syncStep(
                SyncStepStatus.Error,
                current.steps[event.step].processed,
                current.steps[event.step].total,
                event.userHandle ?? event.contestJudgeId
              )
            }
          };
    case JudgeSyncEventType.Completed:
      return {
        ...withEventProgress(current, event, event.summary.errors > 0 ? SyncRunStatus.Error : SyncRunStatus.Completed),
        summary: event.summary,
        steps: {
          submissions: syncStep(SyncStepStatus.Completed, current.steps.submissions.total, current.steps.submissions.total),
          contests: syncStep(SyncStepStatus.Completed, current.steps.contests.total, current.steps.contests.total),
          regularCatalog: syncStep(
            SyncStepStatus.Completed,
            current.steps.regularCatalog.total,
            current.steps.regularCatalog.total
          )
        }
      };
  }
};
