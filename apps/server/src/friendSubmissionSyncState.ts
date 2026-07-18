import {
  type FriendSubmissionSyncEvent,
  type FriendSubmissionSyncInput,
  type FriendSubmissionSyncProviderState
} from "@icpc-trainer/api";
import {
  FRIEND_SUBMISSION_SYNC_EVENT_TYPES,
  LOCALIZED_MESSAGE_CODES,
  PROVIDER_STATE_EVENT_TYPES,
  RUN_STATUSES,
  type LocalizedMessageReference
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

const isLocalizedMessageReference = (value: unknown): value is LocalizedMessageReference =>
  value !== null && typeof value === "object" && "code" in value &&
  Object.values(LOCALIZED_MESSAGE_CODES).includes(
    (value as { readonly code: string }).code as LOCALIZED_MESSAGE_CODES
  );

const warningMessages = (warnings: unknown): readonly LocalizedMessageReference[] =>
  Array.isArray(warnings)
    ? warnings.flatMap((warning) =>
        warning !== null &&
        typeof warning === "object" &&
        "message" in warning &&
        isLocalizedMessageReference(warning.message)
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
      current: { code: LOCALIZED_MESSAGE_CODES.FriendSyncPreparing }
    };
  }

  if (event.type === FRIEND_SUBMISSION_SYNC_EVENT_TYPES.FriendsSyncing) {
    return {
      ...withProgress(current, event),
      current: {
        code: event.friendsTotal === 0
          ? LOCALIZED_MESSAGE_CODES.FriendSyncNoFriends
          : LOCALIZED_MESSAGE_CODES.FriendSyncing
      }
    };
  }

  if (event.type === FRIEND_SUBMISSION_SYNC_EVENT_TYPES.FriendSyncing) {
    return {
      ...withProgress(current, event),
      current: {
        code: LOCALIZED_MESSAGE_CODES.FriendSyncingHandle,
        params: {
          handle: event.userHandle,
          current: event.friendIndex,
          total: event.friendsTotal
        }
      }
    };
  }

  if (event.type === FRIEND_SUBMISSION_SYNC_EVENT_TYPES.FriendSynced) {
    return {
      ...withProgress(current, event),
      current: {
        code: LOCALIZED_MESSAGE_CODES.FriendSyncedHandle,
        params: { handle: event.userHandle }
      },
      friendsProcessed: current.friendsProcessed + finiteNumber(event.friendsProcessed)
    };
  }

  if (event.type === FRIEND_SUBMISSION_SYNC_EVENT_TYPES.Warning) {
    const message = event.userHandle === undefined
      ? event.message
      : {
          ...event.message,
          params: { ...event.message.params, handle: event.userHandle }
        };
    const key = JSON.stringify(message);
    return {
      ...current,
      warnings: current.warnings.some((warning) => JSON.stringify(warning) === key)
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
    current: { code: LOCALIZED_MESSAGE_CODES.FriendSyncStatusUnavailable }
  };
};
