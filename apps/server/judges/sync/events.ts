import {
  type JudgeSyncEvent,
  type JudgeSyncInput,
  type JudgeSyncSummary,
  JudgeSyncEventType,
  JudgeSyncStep
} from "@icpc-trainer/api";
import { type DatabaseService, DatabaseServiceTag } from "@icpc-trainer/db";
import {
  JUDGE_RESOURCES,
  SYNC_ERROR_PHASES,
  SYNC_OPERATION_PHASES,
  type SyncOperationPhase
} from "@icpc-trainer/shared";
import { Data, Effect } from "effect";

import type { JudgeError } from "../judges.js";

export type MutableJudgeSyncSummary = {
  -readonly [Key in keyof JudgeSyncSummary]: JudgeSyncSummary[Key];
};

export interface SyncOperationContext {
  readonly provider: JudgeSyncInput["provider"];
  readonly phase: SyncOperationPhase;
  readonly step?: JudgeSyncStep;
  readonly action: string;
  readonly userHandle?: string;
  readonly contestJudgeId?: string;
  readonly judgeId?: string;
}

type JudgeSyncErrorPhase = JudgeSyncStep | SYNC_ERROR_PHASES;

export class SyncOperationError extends Data.TaggedError("SyncOperationError")<SyncOperationContext & {
  readonly cause: unknown;
}> {}

export const emptySummary = (): MutableJudgeSyncSummary => ({
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

const causeMessage = (cause: unknown): string | undefined => {
  if (cause === undefined || cause === null) {
    return undefined;
  }

  if (typeof cause === "string") {
    return cause;
  }

  if (cause instanceof Error) {
    return cause.message;
  }

  if (typeof cause === "object" && "comment" in cause && typeof cause.comment === "string") {
    return cause.comment;
  }

  return String(cause);
};

const isJudgeError = (error: unknown): error is JudgeError => {
  if (typeof error !== "object" || error === null || !("_tag" in error)) {
    return false;
  }

  return [
    "JudgeCredentialError",
    "JudgeNotFoundError",
    "JudgeAPIError",
    "JudgeUnavailableError"
  ].includes(String(error._tag));
};

const formatSyncJudgeError = (error: JudgeError): string => {
  const detail = "cause" in error ? causeMessage(error.cause) : undefined;
  const suffix = detail === undefined || detail === "" ? "" : ` ${detail}`;

  switch (error._tag) {
    case "JudgeCredentialError":
      return `Credential error for ${error.judgeId}.${suffix}`;
    case "JudgeNotFoundError":
      return `${error.resource === JUDGE_RESOURCES.Contest ? "Contest" : "User"} not found on judge: ${error.judgeId}.`;
    case "JudgeAPIError":
      return `Judge API rejected the request for ${error.judgeId}.${suffix}`;
    case "JudgeUnavailableError":
      if (detail !== undefined && /\bAPI is unavailable\b/i.test(detail)) {
        return detail;
      }
      return `Judge is unavailable for ${error.judgeId}.${suffix}`;
  }
};

const rawErrorMessage = (error: unknown): string => {
  if (isJudgeError(error)) {
    return formatSyncJudgeError(error);
  }

  if (error instanceof Error) {
    return error.message;
  }

  if (error === undefined || error === null || String(error).trim() === "") {
    return "Unknown error.";
  }

  return String(error);
};

const syncErrorMessage = (
  provider: JudgeSyncInput["provider"],
  action: string,
  error: unknown
): string => `Could not sync ${provider} ${action}: ${rawErrorMessage(error)}`;

const eventPhase = (phase: SyncOperationPhase): JudgeSyncErrorPhase =>
  phase === SYNC_OPERATION_PHASES.Submissions
    ? JudgeSyncStep.Submissions
    : phase === SYNC_OPERATION_PHASES.Contests
      ? JudgeSyncStep.Contests
      : phase === SYNC_OPERATION_PHASES.RegularCatalog
        ? JudgeSyncStep.RegularCatalog
        : SYNC_ERROR_PHASES.Database;

const eventStep = (step: SyncOperationContext["step"]): JudgeSyncStep | undefined =>
  step;

export const syncOperationErrorEvent = (
  error: SyncOperationError,
  stepsTotal: number,
  stepsLeft: number
): JudgeSyncEvent => ({
  type: JudgeSyncEventType.Error,
  provider: error.provider,
  phase: eventPhase(error.phase),
  step: eventStep(error.step),
  message: syncErrorMessage(error.provider, error.action, error.cause),
  userHandle: error.userHandle,
  contestJudgeId: error.contestJudgeId,
  judgeId: error.judgeId,
  stepsTotal,
  stepsLeft
});

export const syncEffect = <A>(
  context: SyncOperationContext,
  run: () => A
): Effect.Effect<A, SyncOperationError> =>
  Effect.try({
    try: run,
    catch: (cause) => new SyncOperationError({ ...context, cause })
  });

export const runJudgeOperation = <A>(
  database: DatabaseService,
  context: SyncOperationContext,
  effect: Effect.Effect<A, unknown, DatabaseServiceTag>
): Effect.Effect<A, SyncOperationError> =>
  Effect.provideService(effect, DatabaseServiceTag, database).pipe(
    Effect.mapError((cause) => new SyncOperationError({ ...context, cause }))
  );

export const finalEvent = (
  provider: JudgeSyncInput["provider"],
  stepsTotal: number,
  summary: JudgeSyncSummary
): JudgeSyncEvent => ({
  type: JudgeSyncEventType.Completed,
  provider,
  stepsTotal,
  stepsLeft: 0,
  summary
});
