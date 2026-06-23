import type { ContestFinderRefreshEvent, ContestFinderRefreshInput } from "@icpc-trainer/api";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Loader2, RefreshCw } from "lucide-react";
import { useEffect, useMemo, useState } from "react";

import { Button } from "./components/ui.js";
import { ContestFinderContestTab } from "./ContestFinderContestTab.js";
import { ContestFinderFriendsTab } from "./ContestFinderFriendsTab.js";
import {
  ContestFinderRefreshPanel,
  type ContestFinderRefreshState
} from "./ContestFinderRefreshPanel.js";
import {
  contestFinderSearchText,
  type ContestFinderJudgeFilter,
  type ContestFinderTabId,
  sortContestFinderRows
} from "./contestFinderModel.js";
import { judgeLabel } from "./judgeConfig.js";
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

const progressValue = (stepsTotal: number, stepsLeft: number): number =>
  stepsTotal === 0 ? 100 : Math.round(((stepsTotal - stepsLeft) / stepsTotal) * 100);

const applyRefreshEvent = (
  current: ContestFinderRefreshState,
  event: ContestFinderRefreshEvent
): ContestFinderRefreshState => {
  if (event.type === "started") {
    return {
      ...emptyRefreshState(event.provider),
      status: "running",
      progress: progressValue(event.stepsTotal, event.stepsLeft),
      stepsLeft: event.stepsLeft,
      stepsTotal: event.stepsTotal,
      current: "Preparing refresh"
    };
  }

  if (event.type === "catalog.syncing") {
    return {
      ...current,
      status: "running",
      progress: progressValue(event.stepsTotal, event.stepsLeft),
      stepsLeft: event.stepsLeft,
      stepsTotal: event.stepsTotal,
      current: "Refreshing contest catalog"
    };
  }

  if (event.type === "catalog.synced") {
    return {
      ...current,
      status: "running",
      progress: progressValue(event.stepsTotal, event.stepsLeft),
      stepsLeft: event.stepsLeft,
      stepsTotal: event.stepsTotal,
      current: "Contest catalog refreshed",
      contestsUpserted: current.contestsUpserted + event.contestsUpserted
    };
  }

  if (event.type === "friends.syncing") {
    return {
      ...current,
      status: "running",
      progress: progressValue(event.stepsTotal, event.stepsLeft),
      stepsLeft: event.stepsLeft,
      stepsTotal: event.stepsTotal,
      current: event.friendsTotal === 0 ? "No friends to refresh" : "Refreshing friends"
    };
  }

  if (event.type === "friends.friendSyncing") {
    return {
      ...current,
      status: "running",
      progress: progressValue(event.stepsTotal, event.stepsLeft),
      stepsLeft: event.stepsLeft,
      stepsTotal: event.stepsTotal,
      current: `${event.userHandle} (${event.friendIndex}/${event.friendsTotal})`
    };
  }

  if (event.type === "friends.friendSynced") {
    return {
      ...current,
      status: "running",
      progress: progressValue(event.stepsTotal, event.stepsLeft),
      stepsLeft: event.stepsLeft,
      stepsTotal: event.stepsTotal,
      current: `${event.userHandle} refreshed`,
      friendsProcessed: current.friendsProcessed + event.friendsProcessed
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

  return {
    ...current,
    status: "completed",
    progress: 100,
    stepsLeft: 0,
    stepsTotal: event.stepsTotal,
    current: null,
    contestsUpserted: event.summary.contestsUpserted,
    friendsProcessed: event.summary.friendsProcessed,
    warnings: event.summary.warnings.map((warning) => warning.message)
  };
};

const replayRefreshEvents = (
  provider: ContestFinderRefreshProvider,
  events: readonly ContestFinderRefreshEvent[]
): ContestFinderRefreshState =>
  events.reduce(applyRefreshEvent, emptyRefreshState(provider));

const emptyRefreshStates = (): Record<ContestFinderRefreshProvider, ContestFinderRefreshState> => ({
  codeforces: emptyRefreshState("codeforces"),
  qoj: emptyRefreshState("qoj")
});

export function ContestFinderPage(): React.JSX.Element {
  const toaster = useToaster();
  const queryClient = useQueryClient();
  const [activeTab, setActiveTab] = useState<ContestFinderTabId>("contest");
  const [searchQuery, setSearchQuery] = useState("");
  const [judgeFilter, setJudgeFilter] = useState<ContestFinderJudgeFilter>("all");
  const [refreshStates, setRefreshStates] = useState<Record<ContestFinderRefreshProvider, ContestFinderRefreshState>>(
    emptyRefreshStates
  );

  const overviewQuery = useQuery({
    queryKey: ["contestFinder", "overview"],
    queryFn: () => trpc.contestFinder.overview.query()
  });
  const contests = overviewQuery.data?.contests ?? [];
  const normalizedSearchQuery = searchQuery.trim().toLowerCase();
  const filteredContests = useMemo(
    () =>
      contests
        .filter((contest) =>
          (judgeFilter === "all" || contest.judge === judgeFilter) &&
          (normalizedSearchQuery === "" || contestFinderSearchText(contest).includes(normalizedSearchQuery))
        )
        .sort(sortContestFinderRows),
    [contests, judgeFilter, normalizedSearchQuery]
  );

  useEffect(() => {
    const subscriptions = refreshProviders.map((provider) =>
      trpc.contestFinder.observeRefresh.subscribe(
        { provider },
        {
          onData: (event) => {
            if (event.type === "snapshot") {
              setRefreshStates((current) => ({
                ...current,
                [provider]: event.running
                  ? replayRefreshEvents(provider, event.events)
                  : emptyRefreshState(provider)
              }));
              return;
            }

            setRefreshStates((current) => ({
              ...current,
              [provider]: applyRefreshEvent(current[provider], event)
            }));
            if (event.type === "warning") {
              toaster.warning({
                title: `${judgeLabel(provider)} Contest Finder warning`,
                description: event.message
              });
            }
            if (event.type === "completed") {
              void queryClient.invalidateQueries({ queryKey: ["contestFinder", "overview"] });
            }
          },
          onError: (error) => {
            toaster.error({
              title: `${judgeLabel(provider)} Contest Finder status failed`,
              description: error.message
            });
          }
        }
      )
    );

    return () => {
      for (const subscription of subscriptions) {
        subscription.unsubscribe();
      }
    };
  }, [queryClient, toaster]);

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
          totalCount={contests.length}
          searchQuery={searchQuery}
          judgeFilter={judgeFilter}
          isLoading={overviewQuery.isLoading}
          error={overviewQuery.error}
          onSearchQueryChange={setSearchQuery}
          onJudgeFilterChange={setJudgeFilter}
        />
      ) : (
        <ContestFinderFriendsTab />
      )}
    </main>
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
