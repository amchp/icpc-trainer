import type { ContestFinderRefreshInput } from "@icpc-trainer/api";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Loader2, RefreshCw, UsersRound } from "lucide-react";
import { useCallback, useMemo, useRef, useState } from "react";

import { Button, Card } from "./components/ui.js";
import { ContestFinderContestTab } from "./ContestFinderContestTab.js";
import { ContestFinderFriendsTab } from "./ContestFinderFriendsTab.js";
import {
  ContestFinderRefreshPanel,
  type ContestFinderRefreshState
} from "./ContestFinderRefreshPanel.js";
import {
  contestFinderSearchText,
  normalizeContestFinderRows,
  type ContestFinderTabId,
  sortContestFinderRows
} from "./contestFinderModel.js";
import {
  defaultJudgeSourceFilters,
  judgeSourceFor,
  type JudgeSourceFilterId
} from "./JudgeSourceFilter.js";
import { judgeLabel } from "./judgeConfig.js";
import { useProviderStateSubscriptions } from "./providerRunObserver.js";
import { invalidateAfterContestFinderRefresh, queryKeys } from "./queryKeys.js";
import { trpc } from "./trpc.js";
import { useToaster } from "./Toaster.js";

type ContestFinderRefreshProvider = ContestFinderRefreshInput["provider"];

const refreshProviders: readonly ContestFinderRefreshProvider[] = ["codeforces", "qoj"];

const emptyRefreshState = (provider: ContestFinderRefreshProvider): ContestFinderRefreshState => ({
  provider,
  status: "idle",
  progress: 0,
  stepsLeft: 0,
  stepsTotal: 0,
  current: null,
  contestsUpserted: 0,
  friendsProcessed: 0,
  warnings: []
});

const emptyRefreshStates = (): Record<ContestFinderRefreshProvider, ContestFinderRefreshState> => ({
  codeforces: emptyRefreshState("codeforces"),
  qoj: emptyRefreshState("qoj")
});

export function ContestFinderPage(): React.JSX.Element {
  const toaster = useToaster();
  const queryClient = useQueryClient();
  const [activeTab, setActiveTab] = useState<ContestFinderTabId>("contest");
  const [searchQuery, setSearchQuery] = useState("");
  const [judgeSourceFilters, setJudgeSourceFilters] = useState<readonly JudgeSourceFilterId[]>(
    defaultJudgeSourceFilters
  );
  const [refreshStates, setRefreshStates] = useState<Record<ContestFinderRefreshProvider, ContestFinderRefreshState>>(
    emptyRefreshStates
  );
  const shownWarningsRef = useRef(new Set<string>());
  const invalidatedCompletedRefreshesRef = useRef(new Set<ContestFinderRefreshProvider>());

  const overviewQuery = useQuery({
    queryKey: queryKeys.contestFinderOverview,
    queryFn: () => trpc.contestFinder.overview.query()
  });
  const contests = useMemo(
    () => normalizeContestFinderRows(overviewQuery.data?.contests),
    [overviewQuery.data?.contests]
  );
  const normalizedSearchQuery = searchQuery.trim().toLowerCase();
  const selectedJudgeSources = useMemo(() => new Set(judgeSourceFilters), [judgeSourceFilters]);
  const filteredContests = useMemo(
    () =>
      contests
        .filter((contest) =>
          selectedJudgeSources.has(judgeSourceFor(contest)) &&
          (normalizedSearchQuery === "" || contestFinderSearchText(contest).includes(normalizedSearchQuery))
        )
        .sort(sortContestFinderRows),
    [contests, normalizedSearchQuery, selectedJudgeSources]
  );

  const setRefreshState = useCallback((event: ContestFinderRefreshState) => {
    setRefreshStates((current) => ({
      ...current,
      [event.provider]: event
    }));
    const latestWarning = event.warnings.at(-1);
    const warningKey = latestWarning === undefined ? null : `${event.provider}:${latestWarning}`;
    if (latestWarning !== undefined && warningKey !== null && !shownWarningsRef.current.has(warningKey)) {
      shownWarningsRef.current.add(warningKey);
      toaster.warning({
        title: `${judgeLabel(event.provider)} Contest Finder warning`,
        description: latestWarning
      });
    }
    if (event.status === "running") {
      invalidatedCompletedRefreshesRef.current.delete(event.provider);
    }
    if (event.status === "completed" && !invalidatedCompletedRefreshesRef.current.has(event.provider)) {
      invalidatedCompletedRefreshesRef.current.add(event.provider);
      invalidateAfterContestFinderRefresh(queryClient);
    }
  }, [queryClient, toaster]);
  const subscribeToRefreshState = useCallback((
    provider: ContestFinderRefreshProvider,
    handlers: {
      readonly onData: (state: ContestFinderRefreshState) => void;
      readonly onError: (error: Error) => void;
    }
  ) =>
    trpc.contestFinder.observeRefresh.subscribe(
      { provider },
      handlers
    ), []);
  const handleRefreshSubscriptionError = useCallback((
    provider: ContestFinderRefreshProvider,
    error: Error
  ) => {
    toaster.error({
      title: `${judgeLabel(provider)} Contest Finder status failed`,
      description: error.message
    });
  }, [toaster]);

  useProviderStateSubscriptions({
    providers: refreshProviders,
    subscribe: subscribeToRefreshState,
    onData: setRefreshState,
    onError: handleRefreshSubscriptionError
  });

  const refresh = async (): Promise<void> => {
    try {
      await trpc.contestFinder.refresh.mutate();
    } catch (error) {
      toaster.error({
        title: "Contest Finder refresh failed",
        description: error instanceof Error ? error.message : String(error)
      });
    }
  };

  const refreshStateList = refreshProviders.map((provider) => refreshStates[provider]);
  const refreshing = refreshStateList.some((state) => state.status === "running");

  return (
    <main className="mx-auto w-full max-w-6xl px-5 py-8 sm:px-8">
      <section className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Contest Finder</h1>
        </div>
        <Button type="button" disabled={refreshing} onClick={() => void refresh()}>
          {refreshing ? (
            <Loader2 className="size-4 animate-spin" aria-hidden="true" />
          ) : (
            <RefreshCw className="size-4" aria-hidden="true" />
          )}
          Refresh
        </Button>
      </section>

      <ContestFinderRefreshPanel states={refreshStateList} />

      {!overviewQuery.isLoading && contests.length === 0 ? (
        <section className="mb-6">
          <ContestFinderSetupPrompt />
        </section>
      ) : null}

      <section className="mb-6 flex gap-4 border-b border-zinc-800">
        <TabButton active={activeTab === "contest"} onClick={() => setActiveTab("contest")}>
          Contest
        </TabButton>
        <TabButton active={activeTab === "friends"} onClick={() => setActiveTab("friends")}>
          Friends
        </TabButton>
      </section>

      {activeTab === "contest" ? (
        <ContestFinderContestTab
          contests={filteredContests}
          allContests={contests}
          searchQuery={searchQuery}
          judgeSourceFilters={judgeSourceFilters}
          isLoading={overviewQuery.isLoading}
          error={overviewQuery.error}
          onSearchQueryChange={setSearchQuery}
          onJudgeSourceFiltersChange={setJudgeSourceFilters}
        />
      ) : (
        <ContestFinderFriendsTab />
      )}
    </main>
  );
}

function ContestFinderSetupPrompt(): React.JSX.Element {
  return (
    <Card className="p-5">
      <div className="flex items-start gap-3">
        <UsersRound className="mt-0.5 size-4 text-blue-300" aria-hidden="true" />
        <div>
          <p className="text-sm font-medium text-zinc-100">Add friends first.</p>
          <p className="mt-1 text-sm text-zinc-500">
            Add friends, then click Refresh to find contests those friends have done.
          </p>
        </div>
      </div>
    </Card>
  );
}

function TabButton({
  active,
  children,
  onClick
}: {
  readonly active: boolean;
  readonly children: React.ReactNode;
  readonly onClick: () => void;
}): React.JSX.Element {
  return (
    <button
      type="button"
      className={`border-b-2 px-1 pb-2 text-sm font-semibold transition ${
        active
          ? "border-blue-400 text-zinc-100"
          : "border-transparent text-zinc-500 hover:text-zinc-200"
      }`}
      onClick={onClick}
    >
      {children}
    </button>
  );
}
