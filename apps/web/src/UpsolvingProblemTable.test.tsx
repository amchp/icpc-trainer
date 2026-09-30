import type { UpsolvingProblemRow } from "@icpc-trainer/api";
import { cleanup, fireEvent, render, screen, within } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";

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
    friendSolvedCount: 2,
    status: "upsolved"
  },
  {
    contestName: "Regional Practice",
    judge: "codeforces",
    problemJudgeId: "100C",
    problemName: "C. Attempted",
    problemLink: "https://codeforces.com/gym/100/problem/C",
    solvePercentage: 10,
    rating: 1200,
    friendSolvedCount: 1,
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
    friendSolvedCount: 3,
    status: "solved"
  },
];

const sourceRows: UpsolvingProblemRow[] = [
  ...rows,
  {
    contestName: "Regular Round",
    judge: "codeforces",
    problemJudgeId: "1800A",
    problemName: "A. Regular",
    problemLink: "https://codeforces.com/contest/1800/problem/A",
    solvePercentage: 60,
    rating: 1000,
    friendSolvedCount: 0,
    status: "solved"
  },
  {
    contestName: "QOJ Contest",
    judge: "qoj",
    problemJudgeId: "300A",
    problemName: "QOJ Problem",
    problemLink: "https://qoj.ac/contest/300/problem/1",
    solvePercentage: 15,
    rating: 1600,
    friendSolvedCount: 4,
    status: "attempted"
  }
];

const selectAllStatuses = (): void => {
  fireEvent.click(screen.getByRole("button", { name: /filter by status/i }));
  fireEvent.click(screen.getByRole("menuitemcheckbox", { name: "Solved" }));
};

describe("UpsolvingProblemTable", () => {
  beforeEach(() => {
    cleanup();
  });

  it("moves a Problem into Review later, filters the saved queue, and allows returning to submissions", () => {
    const change = vi.fn();
    const { rerender } = render(<UpsolvingProblemTable rows={rows} onReviewLaterChange={change} />);
    fireEvent.change(screen.getByRole("combobox", { name: "Change status for C. Attempted" }), {
      target: { value: "review_later" }
    });
    expect(change).toHaveBeenCalledWith(expect.objectContaining({ problemJudgeId: "100C" }), true);
    const savedRows = rows.map((row) => row.problemJudgeId === "100C" ? { ...row, status: "review_later" as const } : row);
    rerender(<UpsolvingProblemTable rows={savedRows} onReviewLaterChange={change} />);
    expect(screen.queryByRole("link", { name: "C. Attempted" })).not.toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: /filter by status/i }));
    fireEvent.click(screen.getByRole("menuitemcheckbox", { name: "New" }));
    fireEvent.click(screen.getByRole("menuitemcheckbox", { name: "Attempted" }));
    fireEvent.click(screen.getByRole("menuitemcheckbox", { name: "Review later" }));
    expect(screen.getByRole("link", { name: "C. Attempted" })).toBeInTheDocument();
    expect(screen.queryByRole("link", { name: "B. Binary Search" })).not.toBeInTheDocument();
    const select = screen.getByRole("combobox", { name: "Change status for C. Attempted" });
    expect(select).toHaveValue("review_later");
    fireEvent.change(select, { target: { value: "automatic" } });
    expect(change).toHaveBeenLastCalledWith(expect.objectContaining({ problemJudgeId: "100C" }), false);
    rerender(<UpsolvingProblemTable rows={savedRows} onReviewLaterChange={change} saving />);
    expect(screen.getByRole("combobox", { name: "Change status for C. Attempted" })).toBeDisabled();
  });

  it("renders rows through TanStack Table sorted by rating", () => {
    render(<UpsolvingProblemTable rows={rows} />);

    expect(screen.getByRole("button", { name: /filter by status/i })).toHaveTextContent("New, Attempted");
    expect(screen.getByLabelText("2 problems")).toBeInTheDocument();
    const bodyRows = screen.getAllByRole("row").slice(1);
    expect(bodyRows).toHaveLength(2);
    expect(within(bodyRows[0]!).getAllByRole("cell")[0]).toHaveTextContent("1");
    expect(within(bodyRows[0]!).getAllByRole("cell")[6]).toHaveTextContent("1");
    expect(within(bodyRows[0]!).getByRole("link", { name: "C. Attempted" })).toBeInTheDocument();
    expect(within(bodyRows[1]!).getByRole("link", { name: "B. Binary Search" })).toBeInTheDocument();
    expect(screen.queryByRole("link", { name: "A. Warmup" })).not.toBeInTheDocument();
    expect(screen.getAllByText("Regional Practice")).toHaveLength(2);
    expect(screen.queryByText("100A")).not.toBeInTheDocument();
    expect(screen.queryByText("Submissions")).not.toBeInTheDocument();
  });

  it("sorts by friends from the column header", () => {
    render(<UpsolvingProblemTable rows={rows} />);

    selectAllStatuses();
    fireEvent.click(screen.getByRole("button", { name: "Friends, not sorted" }));

    expect(screen.getByRole("button", { name: "Friends, sorted descending" })).toBeInTheDocument();
    const bodyRows = screen.getAllByRole("row").slice(1);
    expect(within(bodyRows[0]!).getByRole("link", { name: "A. Warmup" })).toBeInTheDocument();
    expect(within(bodyRows[1]!).getByRole("link", { name: "B. Binary Search" })).toBeInTheDocument();
    expect(within(bodyRows[2]!).getByRole("link", { name: "C. Attempted" })).toBeInTheDocument();
  });

  it("filters by global search text", () => {
    render(<UpsolvingProblemTable rows={rows} />);

    selectAllStatuses();
    fireEvent.change(screen.getByRole("searchbox", { name: /search problems/i }), {
      target: { value: "100C" }
    });

    expect(screen.getByLabelText("1 problem")).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "C. Attempted" })).toBeInTheDocument();
    expect(screen.queryByRole("link", { name: "A. Warmup" })).not.toBeInTheDocument();
    expect(screen.queryByRole("link", { name: "B. Binary Search" })).not.toBeInTheDocument();
  });

  it("filters by the visible new status", () => {
    render(<UpsolvingProblemTable rows={rows} />);

    fireEvent.click(screen.getByRole("button", { name: /filter by status/i }));
    fireEvent.click(screen.getByRole("menuitemcheckbox", { name: "Attempted" }));

    expect(screen.getByRole("link", { name: "B. Binary Search" })).toBeInTheDocument();
    expect(screen.queryByRole("link", { name: "A. Warmup" })).not.toBeInTheDocument();
    expect(screen.queryByRole("link", { name: "C. Attempted" })).not.toBeInTheDocument();
  });

  it("filters by multiple selected statuses without showing option counts", () => {
    render(<UpsolvingProblemTable rows={rows} />);

    fireEvent.click(screen.getByRole("button", { name: /filter by status/i }));
    const menu = screen.getByRole("menu", { name: /status filter options/i });
    expect(within(menu).getByRole("menuitemcheckbox", { name: "Attempted" })).toBeChecked();
    expect(within(menu).getByRole("menuitemcheckbox", { name: "New" })).toBeChecked();
    fireEvent.click(within(menu).getByRole("menuitemcheckbox", { name: "New" }));

    expect(screen.getByRole("link", { name: "C. Attempted" })).toBeInTheDocument();
    expect(screen.queryByRole("link", { name: "A. Warmup" })).not.toBeInTheDocument();
    expect(screen.queryByRole("link", { name: "B. Binary Search" })).not.toBeInTheDocument();
  });

  it("filters by selected judge sources", () => {
    render(<UpsolvingProblemTable rows={sourceRows} />);

    selectAllStatuses();
    fireEvent.click(screen.getByRole("button", { name: /filter by judge/i }));
    const menu = screen.getByRole("menu", { name: /judge filter options/i });
    expect(within(menu).getByRole("menuitemcheckbox", { name: "Codeforces Contest" })).toBeInTheDocument();
    fireEvent.click(within(menu).getByRole("menuitemcheckbox", { name: "Codeforces Gym" }));
    fireEvent.click(within(menu).getByRole("menuitemcheckbox", { name: "QOJ" }));

    expect(screen.getByRole("link", { name: "A. Regular" })).toBeInTheDocument();
    expect(screen.queryByRole("link", { name: "A. Warmup" })).not.toBeInTheDocument();
    expect(screen.queryByRole("link", { name: "QOJ Problem" })).not.toBeInTheDocument();
  });
});
