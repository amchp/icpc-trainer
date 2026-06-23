import type { UpsolvingProblemRow } from "@icpc-trainer/api";
import {
  getCoreRowModel,
  getSortedRowModel,
  useReactTable,
  type SortingState
} from "@tanstack/react-table";
import { useDeferredValue, useMemo, useState } from "react";

import { Card } from "./components/ui.js";
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
  const [searchQuery, setSearchQuery] = useState("");
  const deferredSearchQuery = useDeferredValue(searchQuery);
  const [statusFilter, setStatusFilter] = useState<UpsolvingStatusFilter>("new");
  const [sorting, setSorting] = useState<SortingState>([
    { id: "rating", desc: false }
  ]);
  const tableRows = useMemo(
    () => rows.map(toSearchableUpsolvingProblemRow),
    [rows]
  );
  const normalizedSearchQuery = deferredSearchQuery.trim().toLowerCase();
  const filteredRows = useMemo(
    () =>
      tableRows.filter((row) => {
        const matchesStatus = statusFilter === "all" || row.status === statusFilter;
        const matchesSearch =
          normalizedSearchQuery === "" || row.searchText.includes(normalizedSearchQuery);

        return matchesStatus && matchesSearch;
      }),
    [normalizedSearchQuery, statusFilter, tableRows]
  );
  const statusCounts = useMemo(() => statusCountsFor(tableRows), [tableRows]);
  const columns = useMemo(() => createUpsolvingProblemColumns(), []);

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
        statusCounts={statusCounts}
        onSearchQueryChange={setSearchQuery}
        onStatusFilterChange={setStatusFilter}
      />

      {rows.length === 0 ? (
        <div className="border-t border-zinc-800 px-5 py-12 text-sm text-zinc-500">
          No simulated contests yet. Run sync to load contests and problems.
        </div>
      ) : visibleRows.length === 0 ? (
        <div className="border-t border-zinc-800 px-5 py-12 text-sm text-zinc-500">
          No problems match the current filters.
        </div>
      ) : (
        <UpsolvingProblemTableGrid table={table} />
      )}
    </Card>
  );
}
