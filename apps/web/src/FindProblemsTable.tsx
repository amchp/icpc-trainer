import type { FindProblemsOverview } from "@icpc-trainer/api";
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
import { compareText } from "./i18n/format.js";
import { FindProblemsTableFilters } from "./FindProblemsTableFilters.js";
import { FindProblemsTableGrid } from "./FindProblemsTableGrid.js";
import {
  createFindProblemColumns,
  toSearchableFindProblemRow
} from "./findProblemsTableModel.js";
import type { FindProblemsFilterState } from "./urlTableFilters.js";

const defaultMinRating = 800;
const defaultMaxRating = 2400;

const clamp = (value: number, min: number, max: number): number =>
  Math.max(min, Math.min(value, max));

export function FindProblemsTable({
  overview,
  filters,
  onFiltersChange
}: {
  readonly overview: FindProblemsOverview;
  readonly filters?: FindProblemsFilterState;
  readonly onFiltersChange?: OnChangeFn<FindProblemsFilterState>;
}): React.JSX.Element {
  const { t } = useTranslation("findProblems");
  const { locale } = useLocale();
  const ratingFloor = overview.ratingRange.min ?? defaultMinRating;
  const ratingCeiling = overview.ratingRange.max ?? defaultMaxRating;
  const [localFilters, setLocalFilters] = useState<FindProblemsFilterState>({
    searchQuery: "",
    selectedTags: [],
    minRating: defaultMinRating,
    maxRating: defaultMaxRating
  });
  const activeFilters = filters ?? localFilters;
  const setFilters = onFiltersChange ?? setLocalFilters;
  const { searchQuery, selectedTags, minRating, maxRating } = activeFilters;
  const deferredSearchQuery = useDeferredValue(searchQuery);
  const [sorting, setSorting] = useState<SortingState>([
    { id: "rating", desc: false }
  ]);
  const localizedTags = useMemo(
    () => [...overview.tags].sort((left, right) => compareText(left.name, right.name, locale)),
    [locale, overview.tags]
  );
  const availableTagNames = useMemo(
    () => new Set(localizedTags.map((tag) => tag.name)),
    [localizedTags]
  );
  const tableRows = useMemo(
    () => overview.rows.map((row) => toSearchableFindProblemRow({
      ...row,
      tags: [...row.tags].sort((left, right) => compareText(left, right, locale))
    })),
    [locale, overview.rows]
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
  const columns = useMemo(() => createFindProblemColumns(t, locale), [locale, t]);
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
        tags={localizedTags}
        selectedTags={activeSelectedTags}
        visibleCount={visibleRows.length}
        onSearchQueryChange={(value) => setFilters((current) => ({
          ...current,
          searchQuery: value
        }))}
        onMinRatingChange={(value) => setFilters((current) => ({
          ...current,
          minRating: clamp(value, ratingFloor, ratingCeiling)
        }))}
        onMaxRatingChange={(value) => setFilters((current) => ({
          ...current,
          maxRating: clamp(value, ratingFloor, ratingCeiling)
        }))}
        onSelectedTagsChange={(value) => setFilters((current) => ({
          ...current,
          selectedTags: value
        }))}
        onRandom={randomProblem}
      />

      {overview.rows.length === 0 ? (
        <div className="border-t border-zinc-800 px-5 py-12 text-sm text-zinc-500">
          {t("empty")}
        </div>
      ) : visibleRows.length === 0 ? (
        <div className="border-t border-zinc-800 px-5 py-12 text-sm text-zinc-500">
          {t("noMatch")}
        </div>
      ) : (
        <FindProblemsTableGrid table={table} />
      )}
    </Card>
  );
}
