import { JUDGES } from "@icpc-trainer/shared";
import { functionalUpdate, type OnChangeFn } from "@tanstack/react-table";
import { useNavigate, useSearch } from "@tanstack/react-router";
import { useCallback, useMemo } from "react";

import {
  defaultJudgeSourceFilters,
  judgeSourceFilterOptions,
  type JudgeSourceFilterId
} from "./JudgeSourceFilter.js";
import { isValidLocalDate } from "./leaderboardDates.js";
import {
  defaultUpsolvingStatusFilters,
  upsolvingStatusFilterOptions,
  type UpsolvingStatusFilter
} from "./upsolvingProblemTableModel.js";

type SearchRecord = Record<string, unknown>;
type NavigateSearch = (options: {
  readonly replace: true;
  readonly search: (previous: SearchRecord) => SearchRecord;
}) => Promise<void>;

export interface JudgeFilterSearch {
  readonly q?: string;
  readonly judges?: string;
}

export interface UpsolvingFilterSearch extends JudgeFilterSearch {
  readonly status?: string;
}

export interface FindProblemsFilterSearch {
  readonly q?: string;
  readonly minRating?: number;
  readonly maxRating?: number;
  readonly tags?: string;
}

export interface LeaderboardFilterSearch {
  readonly scope?: string;
  readonly judge?: string;
  readonly from?: string;
  readonly through?: string;
}

export interface JudgeFilterState {
  readonly searchQuery: string;
  readonly judgeSourceFilters: readonly JudgeSourceFilterId[];
}

export interface UpsolvingFilterState extends JudgeFilterState {
  readonly statusFilters: readonly UpsolvingStatusFilter[];
}

export interface FindProblemsFilterState {
  readonly searchQuery: string;
  readonly minRating: number;
  readonly maxRating: number;
  readonly selectedTags: readonly string[];
}

export type LeaderboardScopeFilter = "all" | "team" | "friends" | "class";

export interface LeaderboardFilterState {
  readonly scope: LeaderboardScopeFilter;
  readonly judge: JUDGES | "all";
  readonly startDate: string;
  readonly endDate: string;
}

export interface UrlFilterConfig<TFilterState> {
  readonly fromSearch: (search: SearchRecord) => TFilterState;
  readonly toSearch: (filters: TFilterState) => SearchRecord;
}

const defaultMinRating = 800;
const defaultMaxRating = 2400;
const judgeSourceIds = judgeSourceFilterOptions.map((option) => option.value);
const judgeSourceIdSet = new Set<string>(judgeSourceIds);
const upsolvingStatusSet = new Set<string>(upsolvingStatusFilterOptions);
const leaderboardScopes = new Set<LeaderboardScopeFilter>([
  "all",
  "team",
  "friends",
  "class"
]);

const optionalString = (value: unknown): string | undefined =>
  typeof value === "string" && value !== "" ? value : undefined;

const optionalNumber = (value: unknown): number | undefined => {
  const parsed = typeof value === "number"
    ? value
    : typeof value === "string" && value !== ""
      ? Number(value)
      : Number.NaN;
  return Number.isFinite(parsed) ? parsed : undefined;
};

const optionalDate = (value: unknown): string | undefined => {
  const parsed = optionalString(value);
  return parsed !== undefined && isValidLocalDate(parsed) ? parsed : undefined;
};

const uniqueCsvValues = (value: unknown): readonly string[] => {
  if (typeof value !== "string" || value === "") {
    return [];
  }

  return [...new Set(value.split(",").filter((item) => item !== ""))];
};

const judgeSourcesFromSearch = (value: unknown): readonly JudgeSourceFilterId[] => {
  if (value === undefined) {
    return defaultJudgeSourceFilters;
  }
  if (value === "none") {
    return [];
  }

  const selected = new Set(uniqueCsvValues(value).filter((item) => judgeSourceIdSet.has(item)));
  const validSources = judgeSourceIds.filter((source): source is JudgeSourceFilterId => selected.has(source));
  return validSources.length === 0 ? defaultJudgeSourceFilters : validSources;
};

const judgeSourcesToSearch = (sources: readonly JudgeSourceFilterId[]): string | undefined => {
  if (
    sources.length === defaultJudgeSourceFilters.length &&
    defaultJudgeSourceFilters.every((source) => sources.includes(source))
  ) {
    return undefined;
  }
  return sources.length === 0 ? "none" : sources.join(",");
};

const upsolvingStatusesFromSearch = (value: unknown): readonly UpsolvingStatusFilter[] => {
  if (value === undefined) {
    return defaultUpsolvingStatusFilters;
  }
  if (value === "none") {
    return [];
  }
  if (value === "all") {
    return upsolvingStatusFilterOptions;
  }

  const selected = new Set(uniqueCsvValues(value).filter((status) => upsolvingStatusSet.has(status)));
  const validStatuses = upsolvingStatusFilterOptions.filter((status) => selected.has(status));
  return validStatuses.length === 0 ? defaultUpsolvingStatusFilters : validStatuses;
};

const upsolvingStatusesToSearch = (statuses: readonly UpsolvingStatusFilter[]): string | undefined => {
  if (
    statuses.length === defaultUpsolvingStatusFilters.length &&
    defaultUpsolvingStatusFilters.every((status) => statuses.includes(status))
  ) {
    return undefined;
  }
  return statuses.length === 0 ? "none" : statuses.join(",");
};

export const validateJudgeFilterSearch = (search: SearchRecord): JudgeFilterSearch => ({
  q: optionalString(search.q),
  judges: optionalString(search.judges)
});

export const validateUpsolvingFilterSearch = (search: SearchRecord): UpsolvingFilterSearch => ({
  ...validateJudgeFilterSearch(search),
  status: optionalString(search.status)
});

export const validateFindProblemsFilterSearch = (search: SearchRecord): FindProblemsFilterSearch => ({
  q: optionalString(search.q),
  minRating: optionalNumber(search.minRating),
  maxRating: optionalNumber(search.maxRating),
  tags: optionalString(search.tags)
});

export const validateLeaderboardFilterSearch = (search: SearchRecord): LeaderboardFilterSearch => ({
  scope: optionalString(search.scope),
  judge: optionalString(search.judge),
  from: optionalDate(search.from),
  through: optionalDate(search.through)
});

export const judgeFilterUrlConfig: UrlFilterConfig<JudgeFilterState> = {
  fromSearch: (search) => ({
    searchQuery: optionalString(search.q) ?? "",
    judgeSourceFilters: judgeSourcesFromSearch(search.judges)
  }),
  toSearch: (filters) => ({
    q: filters.searchQuery === "" ? undefined : filters.searchQuery,
    judges: judgeSourcesToSearch(filters.judgeSourceFilters)
  })
};

export const upsolvingFilterUrlConfig: UrlFilterConfig<UpsolvingFilterState> = {
  fromSearch: (search) => ({
    ...judgeFilterUrlConfig.fromSearch(search),
    statusFilters: upsolvingStatusesFromSearch(search.status)
  }),
  toSearch: (filters) => ({
    ...judgeFilterUrlConfig.toSearch(filters),
    status: upsolvingStatusesToSearch(filters.statusFilters)
  })
};

export const findProblemsFilterUrlConfig: UrlFilterConfig<FindProblemsFilterState> = {
  fromSearch: (search) => ({
    searchQuery: optionalString(search.q) ?? "",
    minRating: optionalNumber(search.minRating) ?? defaultMinRating,
    maxRating: optionalNumber(search.maxRating) ?? defaultMaxRating,
    selectedTags: uniqueCsvValues(search.tags)
  }),
  toSearch: (filters) => ({
    q: filters.searchQuery === "" ? undefined : filters.searchQuery,
    minRating: filters.minRating === defaultMinRating ? undefined : filters.minRating,
    maxRating: filters.maxRating === defaultMaxRating ? undefined : filters.maxRating,
    tags: filters.selectedTags.length === 0 ? undefined : filters.selectedTags.join(",")
  })
};

export const leaderboardFilterUrlConfig: UrlFilterConfig<LeaderboardFilterState> = {
  fromSearch: (search) => {
    const scope = optionalString(search.scope);
    const judge = optionalString(search.judge);
    return {
      scope: scope !== undefined && leaderboardScopes.has(scope as LeaderboardScopeFilter)
        ? scope as LeaderboardScopeFilter
        : "all",
      judge: judge === JUDGES.Codeforces || judge === JUDGES.Qoj ? judge : "all",
      startDate: optionalDate(search.from) ?? "",
      endDate: optionalDate(search.through) ?? ""
    };
  },
  toSearch: (filters) => ({
    scope: filters.scope === "all" ? undefined : filters.scope,
    judge: filters.judge === "all" ? undefined : filters.judge,
    from: filters.startDate === "" ? undefined : filters.startDate,
    through: filters.endDate === "" ? undefined : filters.endDate
  })
};

/**
 * Controls a filter state with TanStack Table-compatible updater functions while
 * storing the state in TanStack Router search params.
 */
export const useUrlTableFilters = <TFilterState,>(
  config: UrlFilterConfig<TFilterState>
): readonly [TFilterState, OnChangeFn<TFilterState>] => {
  const search = useSearch({ strict: false });
  const navigate = useNavigate();
  // The adapter is intentionally route-agnostic; each route's validator owns
  // the concrete search shape while this callback only patches its filter keys.
  const navigateSearch = navigate as unknown as NavigateSearch;
  const filters = useMemo(
    () => config.fromSearch(search as SearchRecord),
    [config, search]
  );
  const onFiltersChange = useCallback<OnChangeFn<TFilterState>>((updater) => {
    void navigateSearch({
      replace: true,
      search: (previous) => ({
        ...previous,
        ...config.toSearch(functionalUpdate(updater, config.fromSearch(previous as SearchRecord)))
      })
    });
  }, [config, navigateSearch]);

  return [filters, onFiltersChange];
};
