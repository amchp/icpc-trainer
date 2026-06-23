import { Search } from "lucide-react";

import { Input } from "./components/ui.js";
import { JudgeSourceFilterDropdown, type JudgeSourceFilterId } from "./JudgeSourceFilter.js";

export function ContestsTableFilters({
  searchQuery,
  judgeSourceFilters,
  judgeSourceCounts,
  onSearchQueryChange,
  onJudgeSourceFiltersChange
}: {
  readonly searchQuery: string;
  readonly judgeSourceFilters: readonly JudgeSourceFilterId[];
  readonly judgeSourceCounts: Record<JudgeSourceFilterId, number>;
  readonly onSearchQueryChange: (value: string) => void;
  readonly onJudgeSourceFiltersChange: (value: readonly JudgeSourceFilterId[]) => void;
}): React.JSX.Element {
  return (
    <div className="flex flex-col gap-3 px-5 py-4 md:flex-row md:items-center md:justify-between">
      <label className="relative min-w-0 flex-1 md:max-w-lg">
        <span className="sr-only">Search contests</span>
        <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-zinc-500" aria-hidden="true" />
        <Input
          className="pl-9"
          type="search"
          value={searchQuery}
          onChange={(event) => onSearchQueryChange(event.target.value)}
          placeholder="Search contests"
        />
      </label>
      <div className="flex flex-wrap items-center justify-between gap-3 md:justify-end">
        <JudgeSourceFilterDropdown
          selectedSources={judgeSourceFilters}
          counts={judgeSourceCounts}
          onChange={onJudgeSourceFiltersChange}
        />
      </div>
    </div>
  );
}
