import type { UpsolvingProblemRow } from "@icpc-trainer/api";
import { cleanup, fireEvent, render, screen, within } from "@testing-library/react";
import { beforeEach, describe, expect, it } from "vitest";

import { UpsolvingProblemTable } from "./UpsolvingProblemTable.js";

const rows: UpsolvingProblemRow[] = [
  {
    contestName: "Regional Practice",
    judge: "codeforces",
    problemJudgeId: "100B",
    problemName: "B. Binary Search",
    problemLink: "https://codeforces.com/gym/100/problem/B",
    solvePercentage: 20,
    rating: 1400,
    status: "attempted"
  },
  {
    contestName: "Regional Practice",
    judge: "codeforces",
    problemJudgeId: "100A",
    problemName: "A. Warmup",
    problemLink: "https://codeforces.com/gym/100/problem/A",
    solvePercentage: 90,
    rating: 800,
    status: "solved"
  },
  {
    contestName: "QOJ Selection",
    judge: "qoj",
    problemJudgeId: "200A",
    problemName: "Selection Problem",
    problemLink: "https://qoj.ac/contest/200/problem/1",
    solvePercentage: 4,
    rating: 1800,
    status: "new"
  }
];

describe("UpsolvingProblemTable", () => {
  beforeEach(() => {
    cleanup();
  });

  it("renders rows through TanStack Table sorted by rating", () => {
    render(<UpsolvingProblemTable rows={rows} />);

    fireEvent.click(screen.getByRole("button", { name: /filter by status/i }));
    fireEvent.click(screen.getByRole("menuitemradio", { name: /all statuses, 3 problems/i }));

    const bodyRows = screen.getAllByRole("row").slice(1);
    expect(bodyRows).toHaveLength(3);
    expect(within(bodyRows[0]!).getAllByRole("cell")[0]).toHaveTextContent("1");
    expect(within(bodyRows[0]!).getByRole("link", { name: "A. Warmup" })).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "B. Binary Search" })).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "A. Selection Problem" })).toBeInTheDocument();
    expect(screen.getAllByText("Regional Practice")).toHaveLength(2);
    expect(screen.queryByText("100A")).not.toBeInTheDocument();
    expect(screen.queryByText("Submissions")).not.toBeInTheDocument();
  });

  it("filters by global search text", () => {
    render(<UpsolvingProblemTable rows={rows} />);

    fireEvent.change(screen.getByRole("searchbox", { name: /search problems/i }), {
      target: { value: "qoj" }
    });

    expect(screen.getByRole("link", { name: "A. Selection Problem" })).toBeInTheDocument();
    expect(screen.queryByRole("link", { name: "A. Warmup" })).not.toBeInTheDocument();
    expect(screen.queryByRole("link", { name: "B. Binary Search" })).not.toBeInTheDocument();
  });

  it("filters by status", () => {
    render(<UpsolvingProblemTable rows={rows} />);

    fireEvent.click(screen.getByRole("button", { name: /filter by status/i }));
    const menu = screen.getByRole("menu", { name: /status filter options/i });
    expect(within(menu).getByRole("menuitemradio", { name: /attempted, 1 problem/i })).toBeInTheDocument();
    fireEvent.click(within(menu).getByRole("menuitemradio", { name: /attempted, 1 problem/i }));

    expect(screen.getByRole("link", { name: "B. Binary Search" })).toBeInTheDocument();
    expect(screen.queryByRole("link", { name: "A. Warmup" })).not.toBeInTheDocument();
    expect(screen.queryByRole("link", { name: "A. Selection Problem" })).not.toBeInTheDocument();
  });
});
