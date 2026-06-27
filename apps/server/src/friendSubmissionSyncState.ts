import {
  type FriendSubmissionSyncEvent,
  type FriendSubmissionSyncInput,
  type FriendSubmissionSyncProviderState
} from "@icpc-trainer/api";
import {
  FRIEND_SUBMISSION_SYNC_EVENT_TYPES,
  PROVIDER_STATE_EVENT_TYPES,
  RUN_STATUSES
} from "@icpc-trainer/shared";

type Provider = FriendSubmissionSyncInput["provider"];

const finiteNumber = (value: unknown): number =>
  typeof value === "number" && Number.isFinite(value) ? value : 0;

const progressValue = (stepsTotal: unknown, stepsLeft: unknown): number => {
  const total = Math.max(finiteNumber(stepsTotal), 0);
  const left = Math.max(0, Math.min(finiteNumber(stepsLeft), total));
  return total === 0 ? 100 : Math.round(((total - left) / total) * 100);
};

export const emptyFriendSubmissionSyncState = (provider: Provider): FriendSubmissionSyncProviderState => ({
  type: PROVIDER_STATE_EVENT_TYPES.State,
  provider,
  status: RUN_STATUSES.Idle,
  progress: 0,
  stepsTotal: 0,
  stepsLeft: 0,
  current: null,
  friendsProcessed: 0,
  warnings: []
});

const warningMessages = (warnings: unknown): readonly string[] =>
  Array.isArray(warnings)
    ? warnings.flatMap((warning) =>
        warning !== null &&
        typeof warning === "object" &&
        "message" in warning &&
        typeof warning.message === "string"
          ? [warning.message]
          : []
      )
    : [];

const withProgress = (
  current: FriendSubmissionSyncProviderState,
  event: FriendSubmissionSyncEvent,
  status: FriendSubmissionSyncProviderState["status"] = RUN_STATUSES.Running
): FriendSubmissionSyncProviderState => {
  const stepsTotal = Math.max(finiteNumber(event.stepsTotal), 0);
  const stepsLeft = Math.max(0, Math.min(finiteNumber(event.stepsLeft), stepsTotal));
  return {
    ...current,
    status,
    progress: progressValue(stepsTotal, stepsLeft),
    stepsTotal,
    stepsLeft
  };
};

export const applyFriendSubmissionSyncEventToState = (
  current: FriendSubmissionSyncProviderState,
  event: FriendSubmissionSyncEvent
): FriendSubmissionSyncProviderState => {
  if (event.type === FRIEND_SUBMISSION_SYNC_EVENT_TYPES.Started) {
    return {
      ...withProgress(emptyFriendSubmissionSyncState(event.provider), event),
      status: RUN_STATUSES.Running,
      current: "Preparing friend submission sync"
    };
  }

  if (event.type === FRIEND_SUBMISSION_SYNC_EVENT_TYPES.FriendsSyncing) {
    return {
      ...withProgress(current, event),
      current: event.friendsTotal === 0 ? "No friends to sync" : "Syncing friend submissions"
    };
  }

  if (event.type === FRIEND_SUBMISSION_SYNC_EVENT_TYPES.FriendSyncing) {
    return {
      ...withProgress(current, event),
      current: `${event.userHandle} (${event.friendIndex}/${event.friendsTotal})`
    };
  }

  if (event.type === FRIEND_SUBMISSION_SYNC_EVENT_TYPES.FriendSynced) {
    return {
      ...withProgress(current, event),
      current: `${event.userHandle} synced`,
      friendsProcessed: current.friendsProcessed + finiteNumber(event.friendsProcessed)
    };
  }

  if (event.type === FRIEND_SUBMISSION_SYNC_EVENT_TYPES.Warning) {
    const message = event.userHandle === undefined
      ? event.message
      : `${event.userHandle}: ${event.message}`;
    return {
      ...current,
      warnings: current.warnings.includes(message)
        ? current.warnings
        : [...current.warnings, message]
    };
  }

  if (event.type === FRIEND_SUBMISSION_SYNC_EVENT_TYPES.Completed) {
    const summary = event.summary as Partial<{
      readonly friendsProcessed: unknown;
      readonly warnings: unknown;
    }> | undefined;
    return {
      ...withProgress(current, event, RUN_STATUSES.Completed),
      progress: 100,
      stepsLeft: 0,
      current: null,
      friendsProcessed: finiteNumber(summary?.friendsProcessed),
      warnings: warningMessages(summary?.warnings)
    };
  }

  return {
    ...current,
    status: RUN_STATUSES.Error,
    current: "Sync status unavailable"
  };
};
