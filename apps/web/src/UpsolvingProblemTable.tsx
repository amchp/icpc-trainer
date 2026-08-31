import type { UpsolvingProblemRow } from "@icpc-trainer/api";
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
import {
  defaultJudgeSourceFilters,
  judgeSourceForLink,
} from "./JudgeSourceFilter.js";
import { UpsolvingProblemTableFilters } from "./UpsolvingProblemTableFilters.js";
import { UpsolvingProblemTableGrid } from "./UpsolvingProblemTableGrid.js";
import {
  createUpsolvingProblemColumns,
  defaultUpsolvingStatusFilters,
  toSearchableUpsolvingProblemRow
} from "./upsolvingProblemTableModel.js";
import type { UpsolvingFilterState } from "./urlTableFilters.js";

export function UpsolvingProblemTable({
  rows,
  filters,
  onFiltersChange
}: {
  readonly rows: readonly UpsolvingProblemRow[];
  readonly filters?: UpsolvingFilterState;
  readonly onFiltersChange?: OnChangeFn<UpsolvingFilterState>;
}): React.JSX.Element {
  const { t } = useTranslation("upsolving");
  const { locale } = useLocale();
  const [localFilters, setLocalFilters] = useState<UpsolvingFilterState>({
    searchQuery: "",
    statusFilters: defaultUpsolvingStatusFilters,
    judgeSourceFilters: defaultJudgeSourceFilters
  });
  const activeFilters = filters ?? localFilters;
  const setFilters = onFiltersChange ?? setLocalFilters;
  const { searchQuery, statusFilters, judgeSourceFilters } = activeFilters;
  const deferredSearchQuery = useDeferredValue(searchQuery);
  const [sorting, setSorting] = useState<SortingState>([
    { id: "rating", desc: false }
  ]);
  const tableRows = useMemo(
    () => rows.map(toSearchableUpsolvingProblemRow),
    [rows]
  );
  const selectedJudgeSources = useMemo(() => new Set(judgeSourceFilters), [judgeSourceFilters]);
  const selectedStatuses = useMemo(() => new Set(statusFilters), [statusFilters]);
  const normalizedSearchQuery = deferredSearchQuery.trim().toLowerCase();
  const filteredRows = useMemo(
    () =>
      tableRows.filter((row) => {
        const matchesJudgeSource = selectedJudgeSources.has(judgeSourceForLink(row.judge, row.problemLink));
        const matchesStatus = row.status !== "new" && selectedStatuses.has(row.status);
        const matchesSearch =
          normalizedSearchQuery === "" || row.searchText.includes(normalizedSearchQuery);

        return matchesJudgeSource && matchesStatus && matchesSearch;
      }),
    [normalizedSearchQuery, selectedJudgeSources, selectedStatuses, tableRows]
  );
  const columns = useMemo(() => createUpsolvingProblemColumns(t, locale), [locale, t]);

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
      <UpsolvingProblemTableFilters
        searchQuery={searchQuery}
        statusFilters={statusFilters}
        judgeSourceFilters={judgeSourceFilters}
        visibleCount={visibleRows.length}
        onSearchQueryChange={(value) => setFilters((current) => ({
          ...current,
          searchQuery: value
        }))}
        onStatusFilterChange={(value) => setFilters((current) => ({
          ...current,
          statusFilters: value
        }))}
        onJudgeSourceFiltersChange={(value) => setFilters((current) => ({
          ...current,
          judgeSourceFilters: value
        }))}
      />

      {rows.length === 0 ? (
        <div className="border-t border-zinc-800 px-5 py-12 text-sm text-zinc-500">
          {t("empty")}
        </div>
      ) : visibleRows.length === 0 ? (
        <div className="border-t border-zinc-800 px-5 py-12 text-sm text-zinc-500">
          {t("noMatch")}
        </div>
      ) : (
        <UpsolvingProblemTableGrid table={table} />
      )}
    </Card>
  );
}
