import { Check, ChevronDown, Search } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { useTranslation } from "react-i18next";

import { DropdownContent, DropdownItem, DropdownTrigger, Input, TableCount } from "./components/ui.js";
import { JudgeSourceFilterDropdown, type JudgeSourceFilterId } from "./JudgeSourceFilter.js";
import {
  upsolvingStatusFilterOptions,
  defaultUpsolvingStatusFilters,
  type UpsolvingStatusFilter
} from "./upsolvingProblemTableModel.js";

export function UpsolvingProblemTableFilters({
  searchQuery,
  statusFilters,
  judgeSourceFilters,
  visibleCount,
  onSearchQueryChange,
  onStatusFilterChange,
  onJudgeSourceFiltersChange
}: {
  readonly searchQuery: string;
  readonly statusFilters: readonly UpsolvingStatusFilter[];
  readonly judgeSourceFilters: readonly JudgeSourceFilterId[];
  readonly visibleCount: number;
  readonly onSearchQueryChange: (value: string) => void;
  readonly onStatusFilterChange: (value: readonly UpsolvingStatusFilter[]) => void;
  readonly onJudgeSourceFiltersChange: (value: readonly JudgeSourceFilterId[]) => void;
}): React.JSX.Element {
  const { t } = useTranslation(["upsolving", "findProblems"]);
  return (
    <div className="flex flex-col gap-3 px-5 py-4 md:flex-row md:items-center md:justify-between">
      <label className="relative min-w-0 flex-1 md:max-w-lg">
        <span className="sr-only">{t("upsolving:searchLabel")}</span>
        <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-zinc-500" aria-hidden="true" />
        <Input
          className="pl-9"
          type="search"
          value={searchQuery}
          onChange={(event) => onSearchQueryChange(event.target.value)}
          placeholder={t("upsolving:searchPlaceholder")}
        />
      </label>
      <div className="flex flex-wrap items-center justify-between gap-2 md:justify-end">
        <JudgeSourceFilterDropdown
          selectedSources={judgeSourceFilters}
          onChange={onJudgeSourceFiltersChange}
        />
        <StatusFilterDropdown
          values={statusFilters}
          onChange={onStatusFilterChange}
        />
        <TableCount count={visibleCount} itemName={t("findProblems:problemCount", { count: 1 })} pluralItemName={t("findProblems:problemCount", { count: 2 })} />
      </div>
    </div>
  );
}

function StatusFilterDropdown({
  values,
  onChange
}: {
  readonly values: readonly UpsolvingStatusFilter[];
  readonly onChange: (value: readonly UpsolvingStatusFilter[]) => void;
}): React.JSX.Element {
  const { t } = useTranslation("upsolving");
  const statusFilterOptions: Array<{ readonly value: UpsolvingStatusFilter; readonly label: string }> = [
    { value: "upsolved", label: t("status.new") },
    { value: "attempted", label: t("status.attempted") },
    { value: "solved", label: t("status.solved") },
    { value: "review_later", label: t("status.reviewLater") },
    { value: "in_progress", label: t("status.inProgress") }
  ];
  const [open, setOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement | null>(null);
  const selectedSet = new Set(values);
  const selectedLabels = statusFilterOptions
    .filter((option) => selectedSet.has(option.value))
    .map((option) => option.label);
  const selectedLabel = values.length === statusFilterOptions.length
    ? t("allStatuses")
    : values.length === defaultUpsolvingStatusFilters.length && defaultUpsolvingStatusFilters.every((status) => selectedSet.has(status))
      ? t("unsolvedStatuses")
    : selectedLabels.length === 0
      ? t("noStatuses")
      : selectedLabels.join(", ");

  const toggleStatus = (status: UpsolvingStatusFilter): void => {
    const next = selectedSet.has(status)
      ? values.filter((selected) => selected !== status)
      : [...values, status];
    onChange(upsolvingStatusFilterOptions.filter((option) => next.includes(option)));
  };

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
        aria-label={t("filterByStatus")}
        aria-haspopup="menu"
        aria-expanded={open}
        onClick={() => setOpen((current) => !current)}
      >
        <span className="min-w-0 flex-1 text-left">
          <span>{selectedLabel}</span>
        </span>
        <ChevronDown className="size-3.5 shrink-0 text-zinc-500" aria-hidden="true" />
      </DropdownTrigger>

      {open && (
        <DropdownContent
          role="menu"
          aria-label={t("statusOptions")}
        >
          {statusFilterOptions.map((option) => (
            <DropdownItem
              key={option.value}
              role="menuitemcheckbox"
              aria-checked={selectedSet.has(option.value)}
              aria-label={option.label}
              onClick={() => toggleStatus(option.value)}
            >
              <span className="w-4 text-blue-300">
                {selectedSet.has(option.value) && <Check className="size-3.5" aria-hidden="true" />}
              </span>
              <span className="flex-1">{option.label}</span>
            </DropdownItem>
          ))}
        </DropdownContent>
      )}
    </div>
  );
}
