import type { FindProblemsOverview } from "@icpc-trainer/api";
import {
  getCoreRowModel,
  getSortedRowModel,
  useReactTable,
  type SortingState
} from "@tanstack/react-table";
import { useDeferredValue, useMemo, useState } from "react";

import { Card } from "./components/ui.js";
import { FindProblemsTableFilters } from "./FindProblemsTableFilters.js";
import { FindProblemsTableGrid } from "./FindProblemsTableGrid.js";
import {
  createFindProblemColumns,
  toSearchableFindProblemRow
} from "./findProblemsTableModel.js";

const defaultMinRating = 800;
const defaultMaxRating = 2400;

const clamp = (value: number, min: number, max: number): number =>
  Math.max(min, Math.min(value, max));

export function FindProblemsTable({
  overview
}: {
  readonly overview: FindProblemsOverview;
}): React.JSX.Element {
  const ratingFloor = overview.ratingRange.min ?? defaultMinRating;
  const ratingCeiling = overview.ratingRange.max ?? defaultMaxRating;
  const [searchQuery, setSearchQuery] = useState("");
  const deferredSearchQuery = useDeferredValue(searchQuery);
  const [selectedTags, setSelectedTags] = useState<readonly string[]>([]);
  const [minRating, setMinRating] = useState(() =>
    clamp(defaultMinRating, ratingFloor, ratingCeiling)
  );
  const [maxRating, setMaxRating] = useState(() =>
    clamp(defaultMaxRating, ratingFloor, ratingCeiling)
  );
  const [sorting, setSorting] = useState<SortingState>([
    { id: "rating", desc: false }
  ]);
  const availableTagNames = useMemo(
    () => new Set(overview.tags.map((tag) => tag.name)),
    [overview.tags]
  );
  const tableRows = useMemo(
    () => overview.rows.map(toSearchableFindProblemRow),
    [overview.rows]
  );
  const activeSelectedTags = useMemo(
    () => selectedTags.filter((tag) => availableTagNames.has(tag)),
    [availableTagNames, selectedTags]
  );
  const selectedTagSet = useMemo(() => new Set(activeSelectedTags), [activeSelectedTags]);
  const normalizedSearchQuery = deferredSearchQuery.trim().toLowerCase();
  const displayedMinRating = clamp(minRating, ratingFloor, ratingCeiling);
  const displayedMaxRating = clamp(maxRating, ratingFloor, ratingCeiling);
  const safeMinRating = Math.min(displayedMinRating, displayedMaxRating);
  const safeMaxRating = Math.max(displayedMinRating, displayedMaxRating);
  const filteredRows = useMemo(
    () =>
      tableRows.filter((row) => {
        const matchesSearch =
          normalizedSearchQuery === "" || row.searchText.includes(normalizedSearchQuery);
        const matchesRating = row.rating >= safeMinRating && row.rating <= safeMaxRating;
        const matchesTags =
          selectedTagSet.size === 0 || row.tags.some((tag) => selectedTagSet.has(tag));

        return matchesSearch && matchesRating && matchesTags;
      }),
    [normalizedSearchQuery, safeMaxRating, safeMinRating, selectedTagSet, tableRows]
  );
  const columns = useMemo(() => createFindProblemColumns(), []);
  const table = useReactTable({
    data: filteredRows,
    columns,
    state: {
      sorting
    },
    onSortingChange: setSorting,
    getRowId: (row) => row.problemJudgeId,
    getCoreRowModel: getCoreRowModel(),
    getSortedRowModel: getSortedRowModel()
  });
  const visibleRows = table.getRowModel().rows;

  const randomProblem = (): void => {
    if (visibleRows.length === 0) {
      return;
    }

    const index = Math.floor(Math.random() * visibleRows.length);
    const problem = visibleRows[index]?.original;
    if (problem !== undefined) {
      window.open(problem.problemLink, "_blank", "noreferrer");
    }
  };

  return (
    <Card className="overflow-hidden">
      <FindProblemsTableFilters
        searchQuery={searchQuery}
        minRating={displayedMinRating}
        maxRating={displayedMaxRating}
        ratingFloor={ratingFloor}
        ratingCeiling={ratingCeiling}
        tags={overview.tags}
        selectedTags={activeSelectedTags}
        visibleCount={visibleRows.length}
        onSearchQueryChange={setSearchQuery}
        onMinRatingChange={(value) => setMinRating(clamp(value, ratingFloor, ratingCeiling))}
        onMaxRatingChange={(value) => setMaxRating(clamp(value, ratingFloor, ratingCeiling))}
        onSelectedTagsChange={setSelectedTags}
        onRandom={randomProblem}
      />

      {overview.rows.length === 0 ? (
        <div className="border-t border-zinc-800 px-5 py-12 text-sm text-zinc-500">
          No unsolved Codeforces problems yet. Click the Sync button to update data.
        </div>
      ) : visibleRows.length === 0 ? (
        <div className="border-t border-zinc-800 px-5 py-12 text-sm text-zinc-500">
          No problems match the current filters.
        </div>
      ) : (
        <FindProblemsTableGrid table={table} />
      )}
    </Card>
  );
}
