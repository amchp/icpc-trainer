import {
  createMemoryHistory,
  createRootRoute,
  createRoute,
  createRouter,
  Outlet,
  RouterProvider
} from "@tanstack/react-router";
import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { afterEach, describe, expect, it } from "vitest";

import {
  findProblemsFilterUrlConfig,
  judgeFilterUrlConfig,
  leaderboardFilterUrlConfig,
  upsolvingFilterUrlConfig,
  useUrlTableFilters,
  validateJudgeFilterSearch
} from "./urlTableFilters.js";

afterEach(cleanup);

const FilterHarness = (): React.JSX.Element => {
  const [filters, onFiltersChange] = useUrlTableFilters(judgeFilterUrlConfig);
  return (
    <>
      <input
        aria-label="query"
        value={filters.searchQuery}
        onChange={(event) => onFiltersChange((current) => ({
          ...current,
          searchQuery: event.target.value
        }))}
      />
      <output aria-label="judges">{filters.judgeSourceFilters.join(",")}</output>
      <button
        type="button"
        onClick={() => onFiltersChange((current) => ({
          ...current,
          judgeSourceFilters: []
        }))}
      >
        Clear judges
      </button>
    </>
  );
};

const createFilterRouter = (initialEntry: string) => {
  const rootRoute = createRootRoute({ component: Outlet });
  const filterRoute = createRoute({
    getParentRoute: () => rootRoute,
    path: "/filters",
    validateSearch: validateJudgeFilterSearch,
    component: FilterHarness
  });
  return createRouter({
    routeTree: rootRoute.addChildren([filterRoute]),
    history: createMemoryHistory({ initialEntries: [initialEntry] })
  });
};

describe("URL table filters", () => {
  it("restores filters from the URL and writes TanStack updater changes back", async () => {
    const router = createFilterRouter("/filters?q=regional&judges=qoj");
    render(<RouterProvider router={router} />);

    expect(await screen.findByLabelText("query")).toHaveValue("regional");
    expect(screen.getByLabelText("judges")).toHaveTextContent("qoj");

    fireEvent.change(screen.getByLabelText("query"), { target: { value: "gym" } });
    await waitFor(() => expect(router.state.location.search).toMatchObject({ q: "gym" }));
    expect(router.state.location.href).toContain("q=gym");

    fireEvent.click(screen.getByRole("button", { name: "Clear judges" }));
    await waitFor(() => expect(router.state.location.search).toMatchObject({ judges: "none" }));

    const reloadedRouter = createFilterRouter(router.state.location.href);
    cleanup();
    render(<RouterProvider router={reloadedRouter} />);
    expect(await screen.findByLabelText("query")).toHaveValue("gym");
    expect(screen.getByLabelText("judges")).toBeEmptyDOMElement();
  });

  it("round-trips every page's filter shape and omits defaults", () => {
    expect(upsolvingFilterUrlConfig.fromSearch({
      q: "100A",
      judges: "codeforces-gym,qoj",
      status: "attempted,solved"
    })).toEqual({
      searchQuery: "100A",
      judgeSourceFilters: ["codeforces-gym", "qoj"],
      statusFilters: ["attempted", "solved"]
    });
    expect(upsolvingFilterUrlConfig.toSearch({
      searchQuery: "",
      judgeSourceFilters: ["codeforces-contest", "codeforces-gym", "qoj"],
      statusFilters: ["upsolved", "attempted"]
    })).toEqual({ q: undefined, judges: undefined, status: undefined });

    expect(findProblemsFilterUrlConfig.fromSearch({
      q: "graph",
      minRating: 1200,
      maxRating: 1800,
      tags: "graphs,dp"
    })).toEqual({
      searchQuery: "graph",
      minRating: 1200,
      maxRating: 1800,
      selectedTags: ["graphs", "dp"]
    });

    expect(leaderboardFilterUrlConfig.fromSearch({
      scope: "team",
      judge: "qoj",
      from: "2026-08-01",
      through: "2026-08-31"
    })).toEqual({
      scope: "team",
      judge: "qoj",
      startDate: "2026-08-01",
      endDate: "2026-08-31"
    });
    expect(leaderboardFilterUrlConfig.toSearch({
      scope: "all",
      judge: "all",
      startDate: "",
      endDate: ""
    })).toEqual({ scope: undefined, judge: undefined, from: undefined, through: undefined });
  });

  it("falls back safely when URL values are malformed", () => {
    expect(upsolvingFilterUrlConfig.fromSearch({ judges: "unknown", status: "new" })).toEqual({
      searchQuery: "",
      judgeSourceFilters: ["codeforces-contest", "codeforces-gym", "qoj"],
      statusFilters: ["upsolved", "attempted"]
    });
    expect(findProblemsFilterUrlConfig.fromSearch({ minRating: "nope", maxRating: Infinity })).toMatchObject({
      minRating: 800,
      maxRating: 2400
    });
    expect(leaderboardFilterUrlConfig.fromSearch({
      scope: "private",
      judge: "other",
      from: "2026-02-31",
      through: "2026-99-99"
    })).toEqual({
      scope: "all",
      judge: "all",
      startDate: "",
      endDate: ""
    });
  });
});
