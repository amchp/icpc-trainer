import {
  JudgeSyncEventType,
  JudgeSyncStep,
  SyncRunStatus,
  SyncStepStatus
} from "@icpc-trainer/api";
import { describe, expect, it } from "vitest";

import { applyJudgeSyncEventToState, emptyProviderState } from "../judges/sync/syncState.js";

const summary = {
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
};

describe("Judge Sync state reducer", () => {
  it("applies progress and terminal events", () => {
    const started = applyJudgeSyncEventToState(emptyProviderState("codeforces"), {
      type: JudgeSyncEventType.Started,
      provider: "codeforces",
      stepsTotal: 2,
      stepsLeft: 2
    });

    const stepped = applyJudgeSyncEventToState(started, {
      type: JudgeSyncEventType.Step,
      provider: "codeforces",
      step: JudgeSyncStep.Submissions,
      stepStatus: SyncStepStatus.Running,
      processed: 10,
      total: 3,
      current: "tourist",
      stepsTotal: 2,
      stepsLeft: 1
    });

    const completed = applyJudgeSyncEventToState(stepped, {
      type: JudgeSyncEventType.Completed,
      provider: "codeforces",
      stepsTotal: 2,
      stepsLeft: 0,
      summary
    });

    expect(stepped.steps.submissions).toMatchObject({
      status: SyncStepStatus.Running,
      processed: 3,
      total: 3,
      current: "tourist"
    });
    expect(completed.status).toBe(SyncRunStatus.Completed);
    expect(completed.summary).toBe(summary);
  });

  it("marks completed runs with errors as error state", () => {
    const state = applyJudgeSyncEventToState(emptyProviderState("qoj"), {
      type: JudgeSyncEventType.Completed,
      provider: "qoj",
      stepsTotal: 1,
      stepsLeft: 0,
      summary: { ...summary, errors: 1 }
    });

    expect(state.status).toBe(SyncRunStatus.Error);
  });
});
