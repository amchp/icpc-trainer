import { LeaderboardPage } from "./LeaderboardPage.js";
import { leaderboardFilterUrlConfig, useUrlTableFilters } from "./urlTableFilters.js";

export function LeaderboardRoute(): React.JSX.Element {
  const [filters, onFiltersChange] = useUrlTableFilters(leaderboardFilterUrlConfig);
  return <LeaderboardPage filters={filters} onFiltersChange={onFiltersChange} />;
}
