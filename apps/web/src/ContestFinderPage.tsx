import { useQuery } from "@tanstack/react-query";
import { Link } from "@tanstack/react-router";
import { UsersRound } from "lucide-react";
import { useMemo, useState } from "react";

import { appPaths } from "./appNavigation.js";
import { Card } from "./components/ui.js";
import { ContestFinderContestTab } from "./ContestFinderContestTab.js";
import { FriendSubmissionSyncPanel } from "./FriendSubmissionSyncPanel.js";
import {
  contestFinderSearchText,
  normalizeContestFinderRows,
  sortContestFinderRows
} from "./contestFinderModel.js";
import {
  defaultJudgeSourceFilters,
  judgeSourceFor,
  type JudgeSourceFilterId
} from "./JudgeSourceFilter.js";
import { queryKeys } from "./queryKeys.js";
import { trpc } from "./trpc.js";
import { useFriendSubmissionSync } from "./useFriendSubmissionSync.js";

export function ContestFinderPage(): React.JSX.Element {
  const friendSubmissionSync = useFriendSubmissionSync();
  const [searchQuery, setSearchQuery] = useState("");
  const [judgeSourceFilters, setJudgeSourceFilters] = useState<readonly JudgeSourceFilterId[]>(
    defaultJudgeSourceFilters
  );

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

  return (
    <main className="mx-auto w-full max-w-6xl px-5 py-8 sm:px-8">
      <section className="mb-6">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Contest Finder</h1>
          <p className="mt-1 text-sm text-zinc-500">
            Find contests your friends solved
          </p>
        </div>
      </section>

      <FriendSubmissionSyncPanel states={friendSubmissionSync.states} />

      {!overviewQuery.isLoading && contests.length === 0 ? (
        <section className="mb-6">
          <ContestFinderSetupPrompt />
        </section>
      ) : null}

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
            Add friends from{" "}
            <Link to={appPaths.friends} className="text-blue-300 hover:text-blue-200 hover:underline">
              Friends
            </Link>
            , then sync friend submissions.
          </p>
        </div>
      </div>
    </Card>
  );
}
