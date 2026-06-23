import type { UpsolvingContestRow } from "@icpc-trainer/api";
import {
  getCoreRowModel,
  getSortedRowModel,
  useReactTable,
  type SortingState
} from "@tanstack/react-table";
import { useDeferredValue, useMemo, useState } from "react";

import { Card } from "./components/ui.js";
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
  contests,
  refreshingContestIds,
  onRefetchContest
}: {
  readonly contests: readonly UpsolvingContestRow[];
  readonly refreshingContestIds: readonly number[];
  readonly onRefetchContest: (contest: UpsolvingContestRow) => void;
}): React.JSX.Element {
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
  const columns = useMemo(
    () => createContestColumns({ refreshingContestIds, onRefetchContest }),
    [onRefetchContest, refreshingContestIds]
  );
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
        contestCount={filteredRows.length}
        judgeSourceFilters={judgeSourceFilters}
        judgeSourceCounts={judgeSourceCounts}
        onSearchQueryChange={setSearchQuery}
        onJudgeSourceFiltersChange={setJudgeSourceFilters}
      />

      {contests.length === 0 ? (
        <div className="border-t border-zinc-800 px-5 py-12 text-sm text-zinc-500">
          No simulated contests yet. Run sync to load contests and problems.
        </div>
      ) : visibleRows.length === 0 ? (
        <div className="border-t border-zinc-800 px-5 py-12 text-sm text-zinc-500">
          No contests match the current filters.
        </div>
      ) : (
        <ContestsTableGrid table={table} />
      )}
    </Card>
  );
}
