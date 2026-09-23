import { TableLoadState, type TableLoadingState } from "./TableLoadState.js";
import type { ContestFinderRow } from "@icpc-trainer/api";
import { Search } from "lucide-react";
import { useTranslation } from "react-i18next";

import {
  Card,
  Input,
  Label,
  Skeleton,
  TableCount
} from "./components/ui.js";
import { localizedErrorMessage } from "./i18n/localizedMessage.js";
import { formatNumber } from "./i18n/format.js";
import { useLocale } from "./i18n/LocaleProvider.js";
import { JudgeDisplay } from "./JudgeDisplay.js";
import {
  JudgeSourceFilterDropdown,
  type JudgeSourceFilterId
} from "./JudgeSourceFilter.js";
import { VirtualGridTable } from "./VirtualGridTable.js";

const contestFinderGridTemplateColumns = "minmax(18rem, 1fr) 7rem 8rem";

export function ContestFinderContestTab({
  contests,
  searchQuery,
  judgeSourceFilters,
  isLoading,
  loadingState,
  error,
  onSearchQueryChange,
  onJudgeSourceFiltersChange
}: {
  readonly contests: readonly ContestFinderRow[];
  readonly searchQuery: string;
  readonly judgeSourceFilters: readonly JudgeSourceFilterId[];
  readonly isLoading: boolean;
  readonly loadingState?: TableLoadingState;
  readonly error: Error | null;
  readonly onSearchQueryChange: (value: string) => void;
  readonly onJudgeSourceFiltersChange: (value: readonly JudgeSourceFilterId[]) => void;
}): React.JSX.Element {
  const { t } = useTranslation(["contestFinder", "contests"]);
  const { locale } = useLocale();
  return (
    <Card className="overflow-hidden">
      <div className="grid gap-3 border-b border-zinc-800 p-4 sm:grid-cols-[minmax(0,1fr)_auto] sm:items-center">
        <Label className="relative">
          <span className="sr-only">{t("contestFinder:searchLabel")}</span>
          <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-zinc-600" aria-hidden="true" />
          <Input
            value={searchQuery}
            onChange={(event) => onSearchQueryChange(event.target.value)}
            placeholder={t("contestFinder:searchPlaceholder")}
            className="pl-9"
          />
        </Label>
        <div className="flex flex-wrap items-center justify-end gap-2">
          <JudgeSourceFilterDropdown
            selectedSources={judgeSourceFilters}
            onChange={onJudgeSourceFiltersChange}
          />
          <TableCount count={contests.length} itemName={t("contests:contestCount", { count: 1 })} pluralItemName={t("contests:contestCount", { count: 2 })} />
        </div>
      </div>

      {isLoading ? (
        <div className="p-5">
          <Skeleton className="h-64" />
        </div>
      ) : error && !loadingState?.isPartial ? (
        <div className="p-5 text-sm text-red-300">{localizedErrorMessage(error)}</div>
      ) : loadingState?.isPartial && contests.length === 0 ? null : contests.length === 0 ? (
        <div className="p-8 text-sm text-zinc-500">
          {t("contestFinder:empty")}
        </div>
      ) : (
        <VirtualGridTable
          rows={contests}
          estimateSize={78}
          getRowKey={(contest) => `${contest.judge}:${contest.judgeId}`}
          gridTemplateColumns={contestFinderGridTemplateColumns}
          headerGroups={[[t("contestFinder:columns.contest"), t("contestFinder:columns.judge"), t("contestFinder:columns.friends")]]}
          minWidthClassName="min-w-[34rem]"
          showRowNumbers={false}
          renderCells={(contest) => [
            <div className="min-w-0">
              <a
                href={contest.link}
                target="_blank"
                rel="noreferrer"
                className="line-clamp-2 font-medium text-blue-300 hover:text-blue-200 hover:underline"
              >
                {contest.name}
              </a>
            </div>,
            <JudgeDisplay judge={contest.judge} />,
            formatNumber(contest.friendCount, locale)
          ]}
        />
      )}
      {loadingState ? <TableLoadState query={loadingState} /> : null}
    </Card>
  );
}
