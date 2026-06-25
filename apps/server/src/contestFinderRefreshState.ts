import {
  type ContestFinderRefreshEvent,
  type ContestFinderRefreshInput,
  type ContestFinderRefreshProviderState
} from "@icpc-trainer/api";
import {
  CONTEST_FINDER_REFRESH_EVENT_TYPES,
  PROVIDER_STATE_EVENT_TYPES,
  RUN_STATUSES
} from "@icpc-trainer/shared";

type Provider = ContestFinderRefreshInput["provider"];

const finiteNumber = (value: unknown): number =>
  typeof value === "number" && Number.isFinite(value) ? value : 0;

const progressValue = (stepsTotal: unknown, stepsLeft: unknown): number => {
  const total = Math.max(finiteNumber(stepsTotal), 0);
  const left = Math.max(0, Math.min(finiteNumber(stepsLeft), total));
  return total === 0 ? 100 : Math.round(((total - left) / total) * 100);
};

export const emptyContestFinderRefreshState = (provider: Provider): ContestFinderRefreshProviderState => ({
  type: PROVIDER_STATE_EVENT_TYPES.State,
  provider,
  status: RUN_STATUSES.Idle,
  progress: 0,
  stepsTotal: 0,
  stepsLeft: 0,
  current: null,
  contestsUpserted: 0,
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
  current: ContestFinderRefreshProviderState,
  event: ContestFinderRefreshEvent,
  status: ContestFinderRefreshProviderState["status"] = RUN_STATUSES.Running
): ContestFinderRefreshProviderState => {
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

export const applyContestFinderRefreshEventToState = (
  current: ContestFinderRefreshProviderState,
  event: ContestFinderRefreshEvent
): ContestFinderRefreshProviderState => {
  if (event.type === CONTEST_FINDER_REFRESH_EVENT_TYPES.Started) {
    return {
      ...withProgress(emptyContestFinderRefreshState(event.provider), event),
      status: RUN_STATUSES.Running,
      current: "Preparing refresh"
    };
  }

  if (event.type === CONTEST_FINDER_REFRESH_EVENT_TYPES.CatalogSyncing) {
    return {
      ...withProgress(current, event),
      current: "Refreshing contest catalog"
    };
  }

  if (event.type === CONTEST_FINDER_REFRESH_EVENT_TYPES.CatalogSynced) {
    return {
      ...withProgress(current, event),
      current: "Contest catalog refreshed",
      contestsUpserted: current.contestsUpserted + finiteNumber(event.contestsUpserted)
    };
  }

  if (event.type === CONTEST_FINDER_REFRESH_EVENT_TYPES.FriendsSyncing) {
    return {
      ...withProgress(current, event),
      current: event.friendsTotal === 0 ? "No friends to refresh" : "Refreshing friends"
    };
  }

  if (event.type === CONTEST_FINDER_REFRESH_EVENT_TYPES.FriendsFriendSyncing) {
    return {
      ...withProgress(current, event),
      current: `${event.userHandle} (${event.friendIndex}/${event.friendsTotal})`
    };
  }

  if (event.type === CONTEST_FINDER_REFRESH_EVENT_TYPES.FriendsFriendSynced) {
    return {
      ...withProgress(current, event),
      current: `${event.userHandle} refreshed`,
      friendsProcessed: current.friendsProcessed + finiteNumber(event.friendsProcessed)
    };
  }

  if (event.type === CONTEST_FINDER_REFRESH_EVENT_TYPES.Warning) {
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

  if (event.type === CONTEST_FINDER_REFRESH_EVENT_TYPES.Completed) {
    const summary = event.summary as Partial<{
      readonly contestsUpserted: unknown;
      readonly friendsProcessed: unknown;
      readonly warnings: unknown;
    }> | undefined;
    return {
      ...withProgress(current, event, RUN_STATUSES.Completed),
      progress: 100,
      stepsLeft: 0,
      current: null,
      contestsUpserted: finiteNumber(summary?.contestsUpserted),
      friendsProcessed: finiteNumber(summary?.friendsProcessed),
      warnings: warningMessages(summary?.warnings)
    };
  }

  return {
    ...current,
    status: RUN_STATUSES.Error,
    current: "Refresh status unavailable"
  };
};
