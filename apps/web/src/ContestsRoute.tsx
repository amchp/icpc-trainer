import { ContestsPage } from "./ContestsPage.js";
import { judgeFilterUrlConfig, useUrlTableFilters } from "./urlTableFilters.js";

export function ContestsRoute(): React.JSX.Element {
  const [filters, onFiltersChange] = useUrlTableFilters(judgeFilterUrlConfig);
  return <ContestsPage filters={filters} onFiltersChange={onFiltersChange} />;
}
