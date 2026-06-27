import type { FriendSubmissionSyncInput } from "@icpc-trainer/api";
import { JUDGE_PROVIDERS, JUDGES, RUN_STATUSES } from "@icpc-trainer/shared";
import { useQueryClient } from "@tanstack/react-query";
import { useCallback, useRef, useState } from "react";

import { type FriendSubmissionSyncState } from "./FriendSubmissionSyncPanel.js";
import { judgeLabel } from "./judgeConfig.js";
import { useProviderStateSubscriptions } from "./providerRunObserver.js";
import { invalidateAfterFriendSubmissionSync } from "./queryKeys.js";
import { trpc } from "./trpc.js";
import { useToaster } from "./Toaster.js";

type FriendSubmissionSyncProvider = FriendSubmissionSyncInput["provider"];

const syncProviders: readonly FriendSubmissionSyncProvider[] = JUDGE_PROVIDERS;

const emptySyncState = (provider: FriendSubmissionSyncProvider): FriendSubmissionSyncState => ({
  provider,
  status: RUN_STATUSES.Idle,
  progress: 0,
  stepsLeft: 0,
  stepsTotal: 0,
  current: null,
  friendsProcessed: 0,
  warnings: []
});

const emptySyncStates = (): Record<FriendSubmissionSyncProvider, FriendSubmissionSyncState> => ({
  codeforces: emptySyncState(JUDGES.Codeforces),
  qoj: emptySyncState(JUDGES.Qoj)
});

export function useFriendSubmissionSync(): {
  readonly states: readonly FriendSubmissionSyncState[];
  readonly syncing: boolean;
  readonly syncFriendSubmissions: () => Promise<void>;
} {
  const toaster = useToaster();
  const queryClient = useQueryClient();
  const [syncStates, setSyncStates] = useState<Record<FriendSubmissionSyncProvider, FriendSubmissionSyncState>>(
    emptySyncStates
  );
  const shownWarningsRef = useRef(new Set<string>());
  const invalidatedCompletedSyncsRef = useRef(new Set<FriendSubmissionSyncProvider>());

  const setSyncState = useCallback((event: FriendSubmissionSyncState) => {
    setSyncStates((current) => ({
      ...current,
      [event.provider]: event
    }));
    const latestWarning = event.warnings.at(-1);
    const warningKey = latestWarning === undefined ? null : `${event.provider}:${latestWarning}`;
    if (latestWarning !== undefined && warningKey !== null && !shownWarningsRef.current.has(warningKey)) {
      shownWarningsRef.current.add(warningKey);
      toaster.warning({
        title: `${judgeLabel(event.provider)} friend submission sync warning`,
        description: latestWarning
      });
    }
    if (event.status === RUN_STATUSES.Running) {
      invalidatedCompletedSyncsRef.current.delete(event.provider);
    }
    if (event.status === RUN_STATUSES.Completed && !invalidatedCompletedSyncsRef.current.has(event.provider)) {
      invalidatedCompletedSyncsRef.current.add(event.provider);
      invalidateAfterFriendSubmissionSync(queryClient);
    }
  }, [queryClient, toaster]);

  const subscribeToSyncState = useCallback((
    provider: FriendSubmissionSyncProvider,
    handlers: {
      readonly onData: (state: FriendSubmissionSyncState) => void;
      readonly onError: (error: Error) => void;
    }
  ) =>
    trpc.contestFinder.observeFriendSubmissionSync.subscribe(
      { provider },
      handlers
    ), []);

  const handleSyncSubscriptionError = useCallback((
    provider: FriendSubmissionSyncProvider,
    error: Error
  ) => {
    toaster.error({
      title: `${judgeLabel(provider)} friend submission sync status failed`,
      description: error.message
    });
  }, [toaster]);

  useProviderStateSubscriptions({
    providers: syncProviders,
    subscribe: subscribeToSyncState,
    onData: setSyncState,
    onError: handleSyncSubscriptionError
  });

  const syncFriendSubmissions = useCallback(async (): Promise<void> => {
    try {
      await trpc.contestFinder.syncFriendSubmissions.mutate();
    } catch (error) {
      toaster.error({
        title: "Friend submission sync failed",
        description: error instanceof Error ? error.message : String(error)
      });
    }
  }, [toaster]);

  const states = syncProviders.map((provider) => syncStates[provider]);
  const syncing = states.some((state) => state.status === RUN_STATUSES.Running);

  return {
    states,
    syncing,
    syncFriendSubmissions
  };
}
