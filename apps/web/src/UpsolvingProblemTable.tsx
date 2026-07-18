import type { UpsolvingProblemRow } from "@icpc-trainer/api";
import {
  getCoreRowModel,
  getSortedRowModel,
  useReactTable,
  type SortingState
} from "@tanstack/react-table";
import { useDeferredValue, useMemo, useState } from "react";
import { useTranslation } from "react-i18next";

import { Card } from "./components/ui.js";
import { useLocale } from "./i18n/LocaleProvider.js";
import {
  defaultJudgeSourceFilters,
  emptyJudgeSourceCounts,
  judgeSourceForLink,
  type JudgeSourceFilterId
} from "./JudgeSourceFilter.js";
import { UpsolvingProblemTableFilters } from "./UpsolvingProblemTableFilters.js";
import { UpsolvingProblemTableGrid } from "./UpsolvingProblemTableGrid.js";
import {
  createUpsolvingProblemColumns,
  statusCountsFor,
  toSearchableUpsolvingProblemRow,
  type UpsolvingStatusFilter
} from "./upsolvingProblemTableModel.js";

export function UpsolvingProblemTable({
  rows
}: {
  readonly rows: readonly UpsolvingProblemRow[];
}): React.JSX.Element {
  const { t } = useTranslation("upsolving");
  const { locale } = useLocale();
  const [searchQuery, setSearchQuery] = useState("");
  const deferredSearchQuery = useDeferredValue(searchQuery);
  const [statusFilter, setStatusFilter] = useState<UpsolvingStatusFilter>("upsolved");
  const [judgeSourceFilters, setJudgeSourceFilters] = useState<readonly JudgeSourceFilterId[]>(
    defaultJudgeSourceFilters
  );
  const [sorting, setSorting] = useState<SortingState>([
    { id: "rating", desc: false }
  ]);
  const tableRows = useMemo(
    () => rows.map(toSearchableUpsolvingProblemRow),
    [rows]
  );
  const judgeSourceCounts = useMemo(
    () =>
      tableRows.reduce<Record<JudgeSourceFilterId, number>>((counts, row) => {
        const source = judgeSourceForLink(row.judge, row.problemLink);
        return {
          ...counts,
          [source]: counts[source] + 1
        };
      }, emptyJudgeSourceCounts()),
    [tableRows]
  );
  const selectedJudgeSources = useMemo(() => new Set(judgeSourceFilters), [judgeSourceFilters]);
  const normalizedSearchQuery = deferredSearchQuery.trim().toLowerCase();
  const filteredRows = useMemo(
    () =>
      tableRows.filter((row) => {
        const matchesJudgeSource = selectedJudgeSources.has(judgeSourceForLink(row.judge, row.problemLink));
        const matchesStatus = statusFilter === "all" || row.status === statusFilter;
        const matchesSearch =
          normalizedSearchQuery === "" || row.searchText.includes(normalizedSearchQuery);

        return matchesJudgeSource && matchesStatus && matchesSearch;
      }),
    [normalizedSearchQuery, selectedJudgeSources, statusFilter, tableRows]
  );
  const statusCounts = useMemo(() => statusCountsFor(tableRows), [tableRows]);
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
        statusFilter={statusFilter}
        judgeSourceFilters={judgeSourceFilters}
        judgeSourceCounts={judgeSourceCounts}
        statusCounts={statusCounts}
        visibleCount={visibleRows.length}
        onSearchQueryChange={setSearchQuery}
        onStatusFilterChange={setStatusFilter}
        onJudgeSourceFiltersChange={setJudgeSourceFilters}
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
