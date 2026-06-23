import type { ContestFinderRow } from "@icpc-trainer/api";
import { useWindowVirtualizer } from "@tanstack/react-virtual";
import { Search } from "lucide-react";
import { useMemo, useRef } from "react";

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
  const tableContainerRef = useRef<HTMLDivElement | null>(null);
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
  const scrollMargin = tableContainerRef.current?.offsetTop ?? 0;
  const rowVirtualizer = useWindowVirtualizer({
    count: contests.length,
    estimateSize: () => 78,
    overscan: 12,
    scrollMargin,
    initialRect: {
      width: 1000,
      height: 640
    }
  });
  const shouldVirtualizeRows =
    typeof navigator !== "undefined" && !navigator.userAgent.toLowerCase().includes("jsdom");
  const virtualRows = shouldVirtualizeRows
    ? rowVirtualizer.getVirtualItems()
    : contests.map((_, index) => ({
        index,
        start: index * 78
      }));
  const virtualizedHeight = shouldVirtualizeRows
    ? rowVirtualizer.getTotalSize()
    : contests.length * 78;

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
        <div ref={tableContainerRef} className="overflow-x-auto border-t border-zinc-800">
          <div role="table" className="min-w-[34rem] text-sm">
            <div role="rowgroup" className="sticky top-0 z-10 bg-zinc-950">
              <div
                role="row"
                className="grid border-b border-zinc-800"
                style={{ gridTemplateColumns: contestFinderGridTemplateColumns }}
              >
                <div role="columnheader" className="px-3 py-3 text-left align-middle text-xs font-medium text-zinc-500">
                  Contest
                </div>
                <div role="columnheader" className="px-3 py-3 text-left align-middle text-xs font-medium text-zinc-500">
                  Judge
                </div>
                <div role="columnheader" className="px-3 py-3 text-left align-middle text-xs font-medium text-zinc-500">
                  Friends
                </div>
              </div>
            </div>

            <div
              role="rowgroup"
              className="relative"
              style={{
                height: `${virtualizedHeight}px`
              }}
            >
              {virtualRows.map((virtualRow) => {
                const contest = contests[virtualRow.index];

                if (contest === undefined) {
                  return null;
                }

                return (
                  <div
                    key={`${contest.judge}:${contest.judgeId}`}
                    ref={(node) => {
                      if (node && shouldVirtualizeRows) {
                        rowVirtualizer.measureElement(node);
                      }
                    }}
                    data-index={virtualRow.index}
                    role="row"
                    className="absolute left-0 top-0 grid w-full border-b border-zinc-800 transition-colors hover:bg-zinc-900/60"
                    style={{
                      gridTemplateColumns: contestFinderGridTemplateColumns,
                      transform: `translateY(${virtualRow.start - scrollMargin}px)`
                    }}
                  >
                    <div role="cell" className="px-3 py-3 align-middle text-zinc-300">
                      <div className="min-w-0">
                        <a
                          href={contest.link}
                          target="_blank"
                          rel="noreferrer"
                          className="line-clamp-2 font-medium text-blue-300 hover:text-blue-200 hover:underline"
                        >
                          {contest.name}
                        </a>
                      </div>
                    </div>
                    <div role="cell" className="px-3 py-3 align-middle text-zinc-300">
                      <JudgeDisplay judge={contest.judge} />
                    </div>
                    <div role="cell" className="px-3 py-3 align-middle text-zinc-300">
                      {contest.friendCount}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      )}
    </Card>
  );
}
