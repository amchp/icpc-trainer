import { useQuery } from "@tanstack/react-query";
import { Link } from "@tanstack/react-router";
import { UsersRound } from "lucide-react";
import { useMemo, useState } from "react";
import { useTranslation } from "react-i18next";

import { appPaths } from "./appNavigation.js";
import { Card } from "./components/ui.js";
import { useLocale } from "./i18n/LocaleProvider.js";
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
import { ContestRouteTabs } from "./SectionRouteTabs.js";
import { trpc } from "./trpc.js";
import { useFriendSubmissionSync } from "./useFriendSubmissionSync.js";

export function ContestFinderPage(): React.JSX.Element {
  const { t } = useTranslation("contestFinder");
  const { locale } = useLocale();
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
        .sort((left, right) => sortContestFinderRows(left, right, locale)),
    [contests, locale, normalizedSearchQuery, selectedJudgeSources]
  );

  return (
    <main className="mx-auto w-full max-w-6xl px-5 py-8 sm:px-8">
      <ContestRouteTabs />
      <section className="mb-6">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">{t("title")}</h1>
          <p className="mt-1 text-sm text-zinc-500">
            {t("subtitle")}
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
  const { t } = useTranslation("contestFinder");
  return (
    <Card className="p-5">
      <div className="flex items-start gap-3">
        <UsersRound className="mt-0.5 size-4 text-blue-300" aria-hidden="true" />
        <div>
          <p className="text-sm font-medium text-zinc-100">{t("addFriendsTitle")}</p>
          <p className="mt-1 text-sm text-zinc-500">
            {t("addFriendsBefore")}{" "}
            <Link to={appPaths.friends} className="text-blue-300 hover:text-blue-200 hover:underline">
              {t("addFriendsLink")}
            </Link>
            {t("addFriendsAfter")}
          </p>
        </div>
      </div>
    </Card>
  );
}
