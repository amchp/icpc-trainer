import { Check, ChevronDown, Search } from "lucide-react";
import { useEffect, useRef, useState } from "react";

import { DropdownContent, DropdownItem, DropdownTrigger, Input } from "./components/ui.js";
import {
  contestJudgeFilterLabels,
  type ContestJudgeFilter
} from "./contestsTableModel.js";

export function ContestsTableFilters({
  searchQuery,
  contestCount,
  judgeFilter,
  judgeCounts,
  onSearchQueryChange,
  onJudgeFilterChange
}: {
  readonly searchQuery: string;
  readonly contestCount: number;
  readonly judgeFilter: ContestJudgeFilter;
  readonly judgeCounts: Record<ContestJudgeFilter, number>;
  readonly onSearchQueryChange: (value: string) => void;
  readonly onJudgeFilterChange: (value: ContestJudgeFilter) => void;
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
        <JudgeFilterDropdown
          value={judgeFilter}
          counts={judgeCounts}
          onChange={onJudgeFilterChange}
        />
        <p className="text-sm text-zinc-500">
          {contestCount} {contestCount === 1 ? "contest" : "contests"}
        </p>
      </div>
    </div>
  );
}

const judgeFilterOptions: Array<{
  readonly value: ContestJudgeFilter;
  readonly label: string;
}> = [
  { value: "all", label: contestJudgeFilterLabels.all },
  { value: "codeforces", label: contestJudgeFilterLabels.codeforces },
  { value: "qoj", label: contestJudgeFilterLabels.qoj }
];

function JudgeFilterDropdown({
  value,
  counts,
  onChange
}: {
  readonly value: ContestJudgeFilter;
  readonly counts: Record<ContestJudgeFilter, number>;
  readonly onChange: (value: ContestJudgeFilter) => void;
}): React.JSX.Element {
  const [open, setOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement | null>(null);
  const selectedLabel = contestJudgeFilterLabels[value];

  useEffect(() => {
    if (!open) {
      return;
    }

    const closeOnOutsidePointer = (event: PointerEvent) => {
      const target = event.target;
      if (target instanceof Node && menuRef.current?.contains(target)) {
        return;
      }

      setOpen(false);
    };
    const closeOnEscape = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        setOpen(false);
      }
    };

    document.addEventListener("pointerdown", closeOnOutsidePointer);
    document.addEventListener("keydown", closeOnEscape);

    return () => {
      document.removeEventListener("pointerdown", closeOnOutsidePointer);
      document.removeEventListener("keydown", closeOnEscape);
    };
  }, [open]);

  return (
    <div ref={menuRef} className="relative">
      <DropdownTrigger
        aria-label="Filter by judge"
        aria-haspopup="menu"
        aria-expanded={open}
        className="min-w-44"
        onClick={() => setOpen((current) => !current)}
      >
        <span className="min-w-0 flex-1 text-left">
          <span>{selectedLabel}</span>
          <span className="ml-2 tabular-nums text-zinc-500">({counts[value]})</span>
        </span>
        <ChevronDown className="size-3.5 shrink-0 text-zinc-500" aria-hidden="true" />
      </DropdownTrigger>

      {open && (
        <DropdownContent role="menu" aria-label="Judge filter options">
          {judgeFilterOptions.map((option) => (
            <DropdownItem
              key={option.value}
              role="menuitemradio"
              aria-checked={option.value === value}
              aria-label={`${option.label}, ${counts[option.value]} ${
                counts[option.value] === 1 ? "contest" : "contests"
              }`}
              onClick={() => {
                onChange(option.value);
                setOpen(false);
              }}
            >
              <span className="w-4 text-blue-300">
                {option.value === value && <Check className="size-3.5" aria-hidden="true" />}
              </span>
              <span className="flex-1">{option.label}</span>
              <span className="tabular-nums text-zinc-500">{counts[option.value]}</span>
            </DropdownItem>
          ))}
        </DropdownContent>
      )}
    </div>
  );
}
