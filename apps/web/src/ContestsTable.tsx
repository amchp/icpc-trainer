import type { UpsolvingContestRow } from "@icpc-trainer/api";
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
import { ContestsTableFilters } from "./ContestsTableFilters.js";
import { ContestsTableGrid } from "./ContestsTableGrid.js";
import {
  defaultJudgeSourceFilters,
  emptyJudgeSourceCounts,
  judgeSourceFor,
  type JudgeSourceFilterId
} from "./JudgeSourceFilter.js";
import {
  createContestColumns,
  toSearchableContestRow
} from "./contestsTableModel.js";

export function ContestsTable({
  contests
}: {
  readonly contests: readonly UpsolvingContestRow[];
}): React.JSX.Element {
  const { t } = useTranslation("contests");
  const { locale } = useLocale();
  const [searchQuery, setSearchQuery] = useState("");
  const [judgeSourceFilters, setJudgeSourceFilters] = useState<readonly JudgeSourceFilterId[]>(
    defaultJudgeSourceFilters
  );
  const deferredSearchQuery = useDeferredValue(searchQuery);
  const [sorting, setSorting] = useState<SortingState>([
    { id: "missingCount", desc: false }
  ]);
  const tableRows = useMemo(
    () => contests.map(toSearchableContestRow),
    [contests]
  );
  const judgeSourceCounts = useMemo(
    () =>
      tableRows.reduce<Record<JudgeSourceFilterId, number>>(
        (counts, row) => {
          const source = judgeSourceFor(row);
          return {
          ...counts,
          [source]: counts[source] + 1
          };
        },
        emptyJudgeSourceCounts()
      ),
    [tableRows]
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
        judgeSourceCounts={judgeSourceCounts}
        visibleCount={visibleRows.length}
        onSearchQueryChange={setSearchQuery}
        onJudgeSourceFiltersChange={setJudgeSourceFilters}
      />

      {contests.length === 0 ? (
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
    </Card>
  );
}
