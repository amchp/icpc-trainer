import type { UpsolvingProblemStatus } from "@icpc-trainer/api";
import { Check, ChevronDown, Search } from "lucide-react";
import { useEffect, useRef, useState } from "react";

import { DropdownContent, DropdownItem, DropdownTrigger, Input } from "./components/ui.js";
import { JudgeSourceFilterDropdown, type JudgeSourceFilterId } from "./JudgeSourceFilter.js";
import {
  statusLabels,
  type UpsolvingStatusFilter
} from "./upsolvingProblemTableModel.js";

export function UpsolvingProblemTableFilters({
  searchQuery,
  statusFilter,
  judgeSourceFilters,
  judgeSourceCounts,
  statusCounts,
  onSearchQueryChange,
  onStatusFilterChange,
  onJudgeSourceFiltersChange
}: {
  readonly searchQuery: string;
  readonly statusFilter: UpsolvingStatusFilter;
  readonly judgeSourceFilters: readonly JudgeSourceFilterId[];
  readonly judgeSourceCounts: Record<JudgeSourceFilterId, number>;
  readonly statusCounts: Record<UpsolvingStatusFilter, number>;
  readonly onSearchQueryChange: (value: string) => void;
  readonly onStatusFilterChange: (value: UpsolvingStatusFilter) => void;
  readonly onJudgeSourceFiltersChange: (value: readonly JudgeSourceFilterId[]) => void;
}): React.JSX.Element {
  return (
    <div className="flex flex-col gap-3 px-5 py-4 md:flex-row md:items-center md:justify-between">
      <label className="relative min-w-0 flex-1 md:max-w-lg">
        <span className="sr-only">Search problems</span>
        <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-zinc-500" aria-hidden="true" />
        <Input
          className="pl-9"
          type="search"
          value={searchQuery}
          onChange={(event) => onSearchQueryChange(event.target.value)}
          placeholder="Search problems, contests, judges"
        />
      </label>
      <div className="flex flex-wrap items-center justify-between gap-2 md:justify-end">
        <JudgeSourceFilterDropdown
          selectedSources={judgeSourceFilters}
          counts={judgeSourceCounts}
          onChange={onJudgeSourceFiltersChange}
        />
        <StatusFilterDropdown
          value={statusFilter}
          counts={statusCounts}
          onChange={onStatusFilterChange}
        />
      </div>
    </div>
  );
}

const statusFilterOptions: Array<{
  readonly value: UpsolvingStatusFilter;
  readonly label: string;
}> = [
  { value: "all", label: "All statuses" },
  { value: "upsolved", label: statusLabels.upsolved },
  { value: "attempted", label: statusLabels.attempted },
  { value: "solved", label: statusLabels.solved }
];

function StatusFilterDropdown({
  value,
  counts,
  onChange
}: {
  readonly value: UpsolvingStatusFilter;
  readonly counts: Record<UpsolvingStatusFilter, number>;
  readonly onChange: (value: UpsolvingStatusFilter) => void;
}): React.JSX.Element {
  const [open, setOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement | null>(null);
  const selectedLabel =
    statusFilterOptions.find((option) => option.value === value)?.label ?? "All statuses";

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
        aria-label="Filter by status"
        aria-haspopup="menu"
        aria-expanded={open}
        onClick={() => setOpen((current) => !current)}
      >
        <span className="min-w-0 flex-1 text-left">
          <span>{selectedLabel}</span>
          <span className="ml-2 tabular-nums text-zinc-500">({counts[value]})</span>
        </span>
        <ChevronDown className="size-3.5 shrink-0 text-zinc-500" aria-hidden="true" />
      </DropdownTrigger>

      {open && (
        <DropdownContent
          role="menu"
          aria-label="Status filter options"
        >
          {statusFilterOptions.map((option) => (
            <DropdownItem
              key={option.value}
              role="menuitemradio"
              aria-checked={option.value === value}
              aria-label={`${option.label}, ${counts[option.value]} ${
                counts[option.value] === 1 ? "problem" : "problems"
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
