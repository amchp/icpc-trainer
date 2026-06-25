import {
  type JudgeSyncEvent,
  type JudgeSyncInput,
  JudgeSyncEventType,
  JudgeSyncStep,
  SyncStepStatus
} from "@icpc-trainer/api";
import { Effect } from "effect";

export type EmitSyncEvent = (event: JudgeSyncEvent) => Effect.Effect<void>;

export const startedEvent = (
  provider: JudgeSyncInput["provider"]
): JudgeSyncEvent => ({
  type: JudgeSyncEventType.Started,
  provider,
  stepsTotal: 0,
  stepsLeft: 0
});

export const syncStepEvent = (
  provider: JudgeSyncInput["provider"],
  step: JudgeSyncStep,
  stepStatus: SyncStepStatus.Running | SyncStepStatus.Completed | SyncStepStatus.Error,
  progress: {
    readonly processed: number;
    readonly total: number;
    readonly current?: string;
    readonly stepsTotal: number;
    readonly stepsLeft: number;
  }
): JudgeSyncEvent => ({
  type: JudgeSyncEventType.Step,
  provider,
  step,
  stepStatus,
  processed: progress.processed,
  total: progress.total,
  current: progress.current,
  stepsTotal: progress.stepsTotal,
  stepsLeft: progress.stepsLeft
});

export interface SyncStepProgress {
  readonly stepsTotal: number;
  readonly stepsLeft: () => number;
  readonly completed: () => number;
  readonly start: () => Effect.Effect<void>;
  readonly running: (processed: number, current?: string) => Effect.Effect<void>;
  readonly completeCurrent: (current?: string) => Effect.Effect<void>;
}

export const createSyncStepProgress = (
  provider: JudgeSyncInput["provider"],
  step: JudgeSyncStep,
  total: number,
  emit: EmitSyncEvent
): SyncStepProgress => {
  const stepsTotal = total;
  let completed = 0;
  const stepsLeft = (): number => Math.max(stepsTotal - completed, 0);
  const status = (): SyncStepStatus.Running | SyncStepStatus.Completed =>
    completed >= stepsTotal ? SyncStepStatus.Completed : SyncStepStatus.Running;

  return {
    stepsTotal,
    stepsLeft,
    completed: () => completed,
    start: () => emit(syncStepEvent(
      provider,
      step,
      total === 0 ? SyncStepStatus.Completed : SyncStepStatus.Running,
      { processed: 0, total, stepsTotal, stepsLeft: stepsLeft() }
    )),
    running: (processed, current) => emit(syncStepEvent(
      provider,
      step,
      SyncStepStatus.Running,
      { processed, total, current, stepsTotal, stepsLeft: stepsLeft() }
    )),
    completeCurrent: (current) => {
      completed += 1;
      return emit(syncStepEvent(
        provider,
        step,
        status(),
        { processed: completed, total, current, stepsTotal, stepsLeft: stepsLeft() }
      ));
    }
  };
};
