import { UpsolvingPage } from "./UpsolvingPage.js";
import { upsolvingFilterUrlConfig, useUrlTableFilters } from "./urlTableFilters.js";

export function UpsolvingRoute(): React.JSX.Element {
  const [filters, onFiltersChange] = useUrlTableFilters(upsolvingFilterUrlConfig);
  return <UpsolvingPage filters={filters} onFiltersChange={onFiltersChange} />;
}
