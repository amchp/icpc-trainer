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
  type ContestJudgeFilter,
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
  const [judgeFilter, setJudgeFilter] = useState<ContestJudgeFilter>("all");
  const deferredSearchQuery = useDeferredValue(searchQuery);
  const [sorting, setSorting] = useState<SortingState>([
    { id: "missingCount", desc: false }
  ]);
  const tableRows = useMemo(
    () => contests.map(toSearchableContestRow),
    [contests]
  );
  const judgeCounts = useMemo(
    () =>
      tableRows.reduce<Record<ContestJudgeFilter, number>>(
        (counts, row) => ({
          ...counts,
          all: counts.all + 1,
          [row.judge]: counts[row.judge] + 1
        }),
        { all: 0, codeforces: 0, qoj: 0 }
      ),
    [tableRows]
  );
  const normalizedSearchQuery = deferredSearchQuery.trim().toLowerCase();
  const filteredRows = useMemo(
    () =>
      tableRows.filter((row) =>
        (judgeFilter === "all" || row.judge === judgeFilter) &&
        (normalizedSearchQuery === "" || row.searchText.includes(normalizedSearchQuery))
      ),
    [judgeFilter, normalizedSearchQuery, tableRows]
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
        judgeFilter={judgeFilter}
        judgeCounts={judgeCounts}
        onSearchQueryChange={setSearchQuery}
        onJudgeFilterChange={setJudgeFilter}
      />

      {contests.length === 0 ? (
        <div className="border-t border-zinc-800 px-5 py-12 text-sm text-zinc-500">
          No synced contests yet. Run sync to load contests and problems.
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
