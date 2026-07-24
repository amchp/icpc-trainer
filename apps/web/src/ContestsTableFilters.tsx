import { Search } from "lucide-react";
import { useTranslation } from "react-i18next";

import { Input, TableCount } from "./components/ui.js";
import { JudgeSourceFilterDropdown, type JudgeSourceFilterId } from "./JudgeSourceFilter.js";

export function ContestsTableFilters({
  searchQuery,
  judgeSourceFilters,
  judgeSourceCounts,
  visibleCount,
  onSearchQueryChange,
  onJudgeSourceFiltersChange
}: {
  readonly searchQuery: string;
  readonly judgeSourceFilters: readonly JudgeSourceFilterId[];
  readonly judgeSourceCounts: Record<JudgeSourceFilterId, number>;
  readonly visibleCount: number;
  readonly onSearchQueryChange: (value: string) => void;
  readonly onJudgeSourceFiltersChange: (value: readonly JudgeSourceFilterId[]) => void;
}): React.JSX.Element {
  const { t } = useTranslation("contests");
  return (
    <div className="flex flex-col gap-3 px-5 py-4 md:flex-row md:items-center md:justify-between">
      <label className="relative min-w-0 flex-1 md:max-w-lg">
        <span className="sr-only">{t("searchLabel")}</span>
        <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-zinc-500" aria-hidden="true" />
        <Input
          className="pl-9"
          type="search"
          value={searchQuery}
          onChange={(event) => onSearchQueryChange(event.target.value)}
          placeholder={t("searchPlaceholder")}
        />
      </label>
      <div className="flex flex-wrap items-center justify-between gap-3 md:justify-end">
        <JudgeSourceFilterDropdown
          selectedSources={judgeSourceFilters}
          counts={judgeSourceCounts}
          onChange={onJudgeSourceFiltersChange}
        />
        <TableCount count={visibleCount} itemName={t("contestCount", { count: 1 })} pluralItemName={t("contestCount", { count: 2 })} />
      </div>
    </div>
  );
}
