import {
  type ContestFinderRefreshEvent,
  type ContestFinderRefreshInput,
  type ContestFinderRefreshProviderState
} from "@icpc-trainer/api";

type Provider = ContestFinderRefreshInput["provider"];

const finiteNumber = (value: unknown): number =>
  typeof value === "number" && Number.isFinite(value) ? value : 0;

const progressValue = (stepsTotal: unknown, stepsLeft: unknown): number => {
  const total = Math.max(finiteNumber(stepsTotal), 0);
  const left = Math.max(0, Math.min(finiteNumber(stepsLeft), total));
  return total === 0 ? 100 : Math.round(((total - left) / total) * 100);
};

export const emptyContestFinderRefreshState = (provider: Provider): ContestFinderRefreshProviderState => ({
  type: "state",
  provider,
  status: "idle",
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
  status: ContestFinderRefreshProviderState["status"] = "running"
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
  if (event.type === "started") {
    return {
      ...withProgress(emptyContestFinderRefreshState(event.provider), event),
      status: "running",
      current: "Preparing refresh"
    };
  }

  if (event.type === "catalog.syncing") {
    return {
      ...withProgress(current, event),
      current: "Refreshing contest catalog"
    };
  }

  if (event.type === "catalog.synced") {
    return {
      ...withProgress(current, event),
      current: "Contest catalog refreshed",
      contestsUpserted: current.contestsUpserted + finiteNumber(event.contestsUpserted)
    };
  }

  if (event.type === "friends.syncing") {
    return {
      ...withProgress(current, event),
      current: event.friendsTotal === 0 ? "No friends to refresh" : "Refreshing friends"
    };
  }

  if (event.type === "friends.friendSyncing") {
    return {
      ...withProgress(current, event),
      current: `${event.userHandle} (${event.friendIndex}/${event.friendsTotal})`
    };
  }

  if (event.type === "friends.friendSynced") {
    return {
      ...withProgress(current, event),
      current: `${event.userHandle} refreshed`,
      friendsProcessed: current.friendsProcessed + finiteNumber(event.friendsProcessed)
    };
  }

  if (event.type === "warning") {
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

  if (event.type === "completed") {
    const summary = event.summary as Partial<{
      readonly contestsUpserted: unknown;
      readonly friendsProcessed: unknown;
      readonly warnings: unknown;
    }> | undefined;
    return {
      ...withProgress(current, event, "completed"),
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
    status: "error",
    current: "Refresh status unavailable"
  };
};
