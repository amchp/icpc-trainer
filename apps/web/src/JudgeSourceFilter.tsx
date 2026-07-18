import { JUDGE_SOURCE_FILTERS, type JudgeProvider, type JudgeSourceFilterId } from "@icpc-trainer/shared";
import { Check, ChevronDown } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { useTranslation } from "react-i18next";

import { DropdownContent, DropdownItem, DropdownTrigger } from "./components/ui.js";
import { formatNumber } from "./i18n/format.js";
import { useLocale } from "./i18n/LocaleProvider.js";

export type { JudgeSourceFilterId };

export interface JudgeSourceClassifiable {
  readonly judge: JudgeProvider;
  readonly link: string;
}

export const judgeSourceFilterOptions: Array<{
  readonly value: JudgeSourceFilterId;
  readonly label: string;
}> = [
  { value: JUDGE_SOURCE_FILTERS.CodeforcesContest, label: "Codeforces Contest" },
  { value: JUDGE_SOURCE_FILTERS.CodeforcesGym, label: "Codeforces Gym" },
  { value: JUDGE_SOURCE_FILTERS.Qoj, label: "QOJ" }
];

export const defaultJudgeSourceFilters: readonly JudgeSourceFilterId[] =
  judgeSourceFilterOptions.map((option) => option.value);

export const emptyJudgeSourceCounts = (): Record<JudgeSourceFilterId, number> => ({
  [JUDGE_SOURCE_FILTERS.CodeforcesContest]: 0,
  [JUDGE_SOURCE_FILTERS.CodeforcesGym]: 0,
  [JUDGE_SOURCE_FILTERS.Qoj]: 0
});

export const judgeSourceFor = (row: JudgeSourceClassifiable): JudgeSourceFilterId => {
  return judgeSourceForLink(row.judge, row.link);
};

export const judgeSourceForLink = (
  judge: JudgeSourceClassifiable["judge"],
  link: string
): JudgeSourceFilterId => {
  if (judge === JUDGE_SOURCE_FILTERS.Qoj) {
    return JUDGE_SOURCE_FILTERS.Qoj;
  }

  return link.includes("/gym/") ? JUDGE_SOURCE_FILTERS.CodeforcesGym : JUDGE_SOURCE_FILTERS.CodeforcesContest;
};

export function JudgeSourceFilterDropdown({
  selectedSources,
  counts,
  onChange
}: {
  readonly selectedSources: readonly JudgeSourceFilterId[];
  readonly counts: Record<JudgeSourceFilterId, number>;
  readonly onChange: (value: readonly JudgeSourceFilterId[]) => void;
}): React.JSX.Element {
  const { t } = useTranslation("common");
  const { locale } = useLocale();
  const localizedOptions = judgeSourceFilterOptions.map((option) => ({
    ...option,
    label: option.value === JUDGE_SOURCE_FILTERS.CodeforcesContest
      ? t("judgeFilter.codeforcesContest")
      : option.value === JUDGE_SOURCE_FILTERS.CodeforcesGym
        ? t("judgeFilter.codeforcesGym")
        : t("judgeFilter.qoj")
  }));
  const [open, setOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement | null>(null);
  const selectedSet = new Set(selectedSources);
  const selectedLabel = selectedSources.length === localizedOptions.length
    ? t("judgeFilter.all")
    : selectedSources.length === 0
      ? t("judgeFilter.none")
      : selectedSources.length === 1
        ? localizedOptions.find((option) => option.value === selectedSources[0])?.label ?? t("judgeFilter.one")
        : t("judgeFilter.selected", { count: selectedSources.length });

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

  const toggleSource = (source: JudgeSourceFilterId): void => {
    const next = selectedSet.has(source)
      ? selectedSources.filter((selected) => selected !== source)
      : [...selectedSources, source];

    onChange(judgeSourceFilterOptions
      .map((option) => option.value)
      .filter((option) => next.includes(option)));
  };

  return (
    <div ref={menuRef} className="relative">
      <DropdownTrigger
        aria-label={t("judgeFilter.filter")}
        aria-haspopup="menu"
        aria-expanded={open}
        className="min-w-56"
        onClick={() => setOpen((current) => !current)}
      >
        <span className="min-w-0 flex-1 truncate text-left">{selectedLabel}</span>
        <ChevronDown className="size-3.5 shrink-0 text-zinc-500" aria-hidden="true" />
      </DropdownTrigger>

      {open && (
        <DropdownContent role="menu" aria-label={t("judgeFilter.options")}>
          {localizedOptions.map((option) => (
            <DropdownItem
              key={option.value}
              role="menuitemcheckbox"
              aria-checked={selectedSet.has(option.value)}
              aria-label={`${option.label}, ${formatNumber(counts[option.value], locale)} ${t("judgeFilter.item", { count: counts[option.value] })}`}
              onClick={() => toggleSource(option.value)}
            >
              <span className="w-4 text-blue-300">
                {selectedSet.has(option.value) && <Check className="size-3.5" aria-hidden="true" />}
              </span>
              <span className="flex-1">{option.label}</span>
              <span className="tabular-nums text-zinc-500">{formatNumber(counts[option.value], locale)}</span>
            </DropdownItem>
          ))}
        </DropdownContent>
      )}
    </div>
  );
}
