import { ContestFinderPage } from "./ContestFinderPage.js";
import { judgeFilterUrlConfig, useUrlTableFilters } from "./urlTableFilters.js";

export function ContestFinderRoute(): React.JSX.Element {
  const [filters, onFiltersChange] = useUrlTableFilters(judgeFilterUrlConfig);
  return <ContestFinderPage filters={filters} onFiltersChange={onFiltersChange} />;
}
