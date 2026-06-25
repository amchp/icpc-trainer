import type { FindProblemsOverview } from "@icpc-trainer/api";
import { cleanup, fireEvent, render, screen, within } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { FindProblemsTable } from "./FindProblemsTable.js";

const overview: FindProblemsOverview = {
  rows: [
    {
      contestName: "Codeforces Round",
      contestLink: "https://codeforces.com/contest/100",
      problemJudgeId: "100A",
      problemName: "A. Warmup",
      problemLink: "https://codeforces.com/contest/100/problem/A",
      rating: 800,
      solvePercentage: 90,
      tags: []
    },
    {
      contestName: "Codeforces Round",
      contestLink: "https://codeforces.com/contest/100",
      problemJudgeId: "100B",
      problemName: "B. Dynamic Math",
      problemLink: "https://codeforces.com/contest/100/problem/B",
      rating: 1400,
      solvePercentage: 40,
      tags: ["dp", "math"]
    },
    {
      contestName: "Codeforces Round",
      contestLink: "https://codeforces.com/contest/100",
      problemJudgeId: "100C",
      problemName: "C. Graph Paths",
      problemLink: "https://codeforces.com/contest/100/problem/C",
      rating: 2400,
      solvePercentage: 8,
      tags: ["graphs"]
    },
    {
      contestName: "Hard Round",
      contestLink: "https://codeforces.com/contest/200",
      problemJudgeId: "200D",
      problemName: "D. Too Hard",
      problemLink: "https://codeforces.com/contest/200/problem/D",
      rating: 2500,
      solvePercentage: 4,
      tags: ["dp"]
    },
    {
      contestName: "Practice Round",
      contestLink: "https://codeforces.com/contest/300",
      problemJudgeId: "300A",
      problemName: "A. Implementation",
      problemLink: "https://codeforces.com/contest/300/problem/A",
      rating: 1000,
      solvePercentage: 75,
      tags: ["implementation"]
    },
    {
      contestName: "Practice Round",
      contestLink: "https://codeforces.com/contest/300",
      problemJudgeId: "300B",
      problemName: "B. Strong Password",
      problemLink: "https://codeforces.com/contest/300/problem/B",
      rating: 1300,
      solvePercentage: 55,
      tags: ["brute force", "strings"]
    }
  ],
  tags: [
    { name: "brute force", count: 1 },
    { name: "dp", count: 2 },
    { name: "graphs", count: 1 },
    { name: "implementation", count: 1 },
    { name: "math", count: 1 },
    { name: "strings", count: 1 }
  ],
  ratingRange: {
    min: 800,
    max: 2500
  }
};

const bodyRows = (): HTMLElement[] => screen.getAllByRole("row").slice(1);

const openTagMenu = (): HTMLElement => {
  fireEvent.click(screen.getByRole("button", { name: /filter by tag/i }));
  return screen.getByRole("menu", { name: /tag filter options/i });
};

describe("FindProblemsTable", () => {
  beforeEach(() => {
    cleanup();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("renders rows sorted by rating inside the default rating range", () => {
    render(<FindProblemsTable overview={overview} />);

    const rows = bodyRows();
    expect(rows).toHaveLength(5);
    expect(within(rows[0]!).getByRole("link", { name: "A. Warmup" })).toBeInTheDocument();
    expect(within(rows[1]!).getByRole("link", { name: "A. Implementation" })).toBeInTheDocument();
    expect(within(rows[2]!).getByRole("link", { name: "B. Strong Password" })).toBeInTheDocument();
    expect(within(rows[3]!).getByRole("link", { name: "B. Dynamic Math" })).toBeInTheDocument();
    expect(within(rows[4]!).getByRole("link", { name: "C. Graph Paths" })).toBeInTheDocument();
    expect(screen.queryByRole("link", { name: "D. Too Hard" })).not.toBeInTheDocument();
  });

  it("filters by problem name search text", () => {
    render(<FindProblemsTable overview={overview} />);

    fireEvent.change(screen.getByRole("searchbox", { name: /search problems/i }), {
      target: { value: "implementation" }
    });

    expect(screen.getByRole("link", { name: "A. Implementation" })).toBeInTheDocument();
    expect(screen.queryByRole("link", { name: "A. Warmup" })).not.toBeInTheDocument();
  });

  it("does not search by problem id, contest, or tag", () => {
    render(<FindProblemsTable overview={overview} />);

    fireEvent.change(screen.getByRole("searchbox", { name: /search problems/i }), {
      target: { value: "300A" }
    });
    expect(screen.getByText("No problems match the current filters.")).toBeInTheDocument();

    fireEvent.change(screen.getByRole("searchbox", { name: /search problems/i }), {
      target: { value: "practice round" }
    });
    expect(screen.getByText("No problems match the current filters.")).toBeInTheDocument();

    fireEvent.change(screen.getByRole("searchbox", { name: /search problems/i }), {
      target: { value: "graphs" }
    });
    expect(screen.getByText("No problems match the current filters.")).toBeInTheDocument();
  });

  it("filters by strong search text without resetting state", () => {
    render(<FindProblemsTable overview={overview} />);

    fireEvent.change(screen.getByRole("searchbox", { name: /search problems/i }), {
      target: { value: "strong" }
    });

    expect(screen.getByRole("link", { name: "B. Strong Password" })).toBeInTheDocument();
    expect(screen.queryByRole("link", { name: "A. Warmup" })).not.toBeInTheDocument();
  });

  it("filters by rating range", () => {
    render(<FindProblemsTable overview={overview} />);

    fireEvent.change(screen.getByLabelText(/min rating/i), {
      target: { value: "1200" }
    });
    fireEvent.change(screen.getByLabelText(/max rating/i), {
      target: { value: "1600" }
    });

    expect(screen.getByRole("link", { name: "B. Dynamic Math" })).toBeInTheDocument();
    expect(screen.queryByRole("link", { name: "A. Warmup" })).not.toBeInTheDocument();
    expect(screen.queryByRole("link", { name: "C. Graph Paths" })).not.toBeInTheDocument();
  });

  it("filters selected tags with any-tag semantics", () => {
    render(<FindProblemsTable overview={overview} />);

    let menu = openTagMenu();
    fireEvent.click(within(menu).getByRole("menuitemcheckbox", { name: /dp, 2 problems/i }));
    menu = screen.getByRole("menu", { name: /tag filter options/i });
    fireEvent.click(within(menu).getByRole("menuitemcheckbox", { name: /graphs, 1 problem/i }));

    expect(screen.getByRole("link", { name: "B. Dynamic Math" })).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "C. Graph Paths" })).toBeInTheDocument();
    expect(screen.queryByRole("link", { name: "A. Warmup" })).not.toBeInTheDocument();
    expect(screen.queryByRole("link", { name: "D. Too Hard" })).not.toBeInTheDocument();
  });

  it("keeps untagged rows visible until a tag filter is active", () => {
    render(<FindProblemsTable overview={overview} />);

    expect(screen.getByRole("link", { name: "A. Warmup" })).toBeInTheDocument();

    const menu = openTagMenu();
    fireEvent.click(within(menu).getByRole("menuitemcheckbox", { name: /implementation, 1 problem/i }));

    expect(screen.getByRole("link", { name: "A. Implementation" })).toBeInTheDocument();
    expect(screen.queryByRole("link", { name: "A. Warmup" })).not.toBeInTheDocument();
  });

  it("disables random when no rows match", () => {
    render(<FindProblemsTable overview={overview} />);

    fireEvent.change(screen.getByRole("searchbox", { name: /search problems/i }), {
      target: { value: "no such problem" }
    });

    expect(screen.getByRole("button", { name: "Random" })).toBeDisabled();
  });

  it("opens a random problem from the currently filtered rows", () => {
    const openSpy = vi.spyOn(window, "open").mockImplementation(() => null);
    render(<FindProblemsTable overview={overview} />);

    fireEvent.change(screen.getByRole("searchbox", { name: /search problems/i }), {
      target: { value: "graph" }
    });
    fireEvent.click(screen.getByRole("button", { name: "Random" }));

    expect(openSpy).toHaveBeenCalledWith(
      "https://codeforces.com/contest/100/problem/C",
      "_blank",
      "noreferrer"
    );
  });
});
