import { FindProblemsPage } from "./FindProblemsPage.js";
import { findProblemsFilterUrlConfig, useUrlTableFilters } from "./urlTableFilters.js";

export function FindProblemsRoute(): React.JSX.Element {
  const [filters, onFiltersChange] = useUrlTableFilters(findProblemsFilterUrlConfig);
  return <FindProblemsPage filters={filters} onFiltersChange={onFiltersChange} />;
}
