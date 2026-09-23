import { TableLoadState, type TableLoadingState } from "./TableLoadState.js";
import type { UpsolvingContestRow } from "@icpc-trainer/api";
import {
  getCoreRowModel,
  getSortedRowModel,
  useReactTable,
  type OnChangeFn,
  type SortingState
} from "@tanstack/react-table";
import { useDeferredValue, useMemo, useState } from "react";
import { useTranslation } from "react-i18next";

import { Card } from "./components/ui.js";
import { useLocale } from "./i18n/LocaleProvider.js";
import { ContestsTableFilters } from "./ContestsTableFilters.js";
import { ContestsTableGrid } from "./ContestsTableGrid.js";
import {
  defaultJudgeSourceFilters,
  judgeSourceFor
} from "./JudgeSourceFilter.js";
import {
  createContestColumns,
  toSearchableContestRow
} from "./contestsTableModel.js";
import type { JudgeFilterState } from "./urlTableFilters.js";

export function ContestsTable({
  contests,
  loadingState,
  filters,
  onFiltersChange
}: {
  readonly contests: readonly UpsolvingContestRow[];
  readonly loadingState?: TableLoadingState;
  readonly filters?: JudgeFilterState;
  readonly onFiltersChange?: OnChangeFn<JudgeFilterState>;
}): React.JSX.Element {
  const { t } = useTranslation("contests");
  const { locale } = useLocale();
  const [localFilters, setLocalFilters] = useState<JudgeFilterState>({
    searchQuery: "",
    judgeSourceFilters: defaultJudgeSourceFilters
  });
  const activeFilters = filters ?? localFilters;
  const setFilters = onFiltersChange ?? setLocalFilters;
  const { searchQuery, judgeSourceFilters } = activeFilters;
  const deferredSearchQuery = useDeferredValue(searchQuery);
  const [sorting, setSorting] = useState<SortingState>([
    { id: "missingCount", desc: false }
  ]);
  const tableRows = useMemo(
    () => contests.map(toSearchableContestRow),
    [contests]
  );
  const selectedJudgeSources = useMemo(() => new Set(judgeSourceFilters), [judgeSourceFilters]);
  const normalizedSearchQuery = deferredSearchQuery.trim().toLowerCase();
  const filteredRows = useMemo(
    () =>
      tableRows.filter((row) =>
        selectedJudgeSources.has(judgeSourceFor(row)) &&
        (normalizedSearchQuery === "" || row.searchText.includes(normalizedSearchQuery))
      ),
    [normalizedSearchQuery, selectedJudgeSources, tableRows]
  );
  const columns = useMemo(() => createContestColumns(t, locale), [locale, t]);
  const table = useReactTable({
    data: filteredRows,
    columns,
    state: {
      sorting
    },
    onSortingChange: setSorting,
    getCoreRowModel: getCoreRowModel(),
    getSortedRowModel: getSortedRowModel()
  });
  const visibleRows = table.getRowModel().rows;

  return (
    <Card className="overflow-hidden">
      <ContestsTableFilters
        searchQuery={searchQuery}
        judgeSourceFilters={judgeSourceFilters}
        visibleCount={visibleRows.length}
        onSearchQueryChange={(value) => setFilters((current) => ({
          ...current,
          searchQuery: value
        }))}
        onJudgeSourceFiltersChange={(value) => setFilters((current) => ({
          ...current,
          judgeSourceFilters: value
        }))}
      />

      {loadingState?.isPartial && visibleRows.length === 0 ? null : contests.length === 0 ? (
        <div className="border-t border-zinc-800 px-5 py-12 text-sm text-zinc-500">
          {t("empty")}
        </div>
      ) : visibleRows.length === 0 ? (
        <div className="border-t border-zinc-800 px-5 py-12 text-sm text-zinc-500">
          {t("noMatch")}
        </div>
      ) : (
        <ContestsTableGrid table={table} />
      )}
      {loadingState ? <TableLoadState query={loadingState} /> : null}
    </Card>
  );
}
