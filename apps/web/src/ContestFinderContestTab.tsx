import type { ContestFinderRow } from "@icpc-trainer/api";
import { Search } from "lucide-react";
import { useMemo } from "react";

import {
  Card,
  Input,
  Label,
  Skeleton
} from "./components/ui.js";
import { JudgeDisplay } from "./JudgeDisplay.js";
import {
  emptyJudgeSourceCounts,
  JudgeSourceFilterDropdown,
  judgeSourceFor,
  type JudgeSourceFilterId
} from "./JudgeSourceFilter.js";
import { VirtualGridTable } from "./VirtualGridTable.js";

const contestFinderGridTemplateColumns = "minmax(18rem, 1fr) 7rem 8rem";

export function ContestFinderContestTab({
  contests,
  allContests,
  searchQuery,
  judgeSourceFilters,
  isLoading,
  error,
  onSearchQueryChange,
  onJudgeSourceFiltersChange
}: {
  readonly contests: readonly ContestFinderRow[];
  readonly allContests: readonly ContestFinderRow[];
  readonly searchQuery: string;
  readonly judgeSourceFilters: readonly JudgeSourceFilterId[];
  readonly isLoading: boolean;
  readonly error: Error | null;
  readonly onSearchQueryChange: (value: string) => void;
  readonly onJudgeSourceFiltersChange: (value: readonly JudgeSourceFilterId[]) => void;
}): React.JSX.Element {
  const judgeSourceCounts = useMemo(
    () =>
      allContests.reduce<Record<JudgeSourceFilterId, number>>((counts, contest) => {
        const source = judgeSourceFor(contest);
        return {
          ...counts,
          [source]: counts[source] + 1
        };
      }, emptyJudgeSourceCounts()),
    [allContests]
  );

  return (
    <Card className="overflow-hidden">
      <div className="grid gap-3 border-b border-zinc-800 p-4 sm:grid-cols-[minmax(0,1fr)_auto] sm:items-center">
        <Label className="relative">
          <span className="sr-only">Search contests</span>
          <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-zinc-600" aria-hidden="true" />
          <Input
            value={searchQuery}
            onChange={(event) => onSearchQueryChange(event.target.value)}
            placeholder="Search contests or friends"
            className="pl-9"
          />
        </Label>
        <JudgeSourceFilterDropdown
          selectedSources={judgeSourceFilters}
          counts={judgeSourceCounts}
          onChange={onJudgeSourceFiltersChange}
        />
      </div>

      {isLoading ? (
        <div className="p-5">
          <Skeleton className="h-64" />
        </div>
      ) : error ? (
        <div className="p-5 text-sm text-red-300">{error.message}</div>
      ) : contests.length === 0 ? (
        <div className="p-8 text-sm text-zinc-500">
          No unsimulated contests match the current filters.
        </div>
      ) : (
        <VirtualGridTable
          rows={contests}
          estimateSize={78}
          getRowKey={(contest) => `${contest.judge}:${contest.judgeId}`}
          gridTemplateColumns={contestFinderGridTemplateColumns}
          headerGroups={[["Contest", "Judge", "Friends"]]}
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
            contest.friendCount
          ]}
        />
      )}
    </Card>
  );
}
