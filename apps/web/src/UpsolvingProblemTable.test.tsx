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
    status: "attempted"
  }
];

const selectAllStatuses = (): void => {
  fireEvent.click(screen.getByRole("button", { name: /filter by status/i }));
  fireEvent.click(screen.getByRole("menuitemradio", { name: /all statuses/i }));
};

describe("UpsolvingProblemTable", () => {
  beforeEach(() => {
    cleanup();
  });

  it("renders rows through TanStack Table sorted by rating", () => {
    render(<UpsolvingProblemTable rows={rows} />);

    expect(screen.getByRole("button", { name: /filter by status/i })).toHaveTextContent("New(1)");
    const bodyRows = screen.getAllByRole("row").slice(1);
    expect(bodyRows).toHaveLength(1);
    expect(within(bodyRows[0]!).getAllByRole("cell")[0]).toHaveTextContent("1");
    expect(within(bodyRows[0]!).getByRole("link", { name: "B. Binary Search" })).toBeInTheDocument();
    expect(screen.queryByRole("link", { name: "A. Warmup" })).not.toBeInTheDocument();
    expect(screen.queryByRole("link", { name: "C. Attempted" })).not.toBeInTheDocument();
    expect(screen.getAllByText("Regional Practice")).toHaveLength(1);
    expect(screen.queryByText("100A")).not.toBeInTheDocument();
    expect(screen.queryByText("Submissions")).not.toBeInTheDocument();
  });

  it("filters by global search text", () => {
    render(<UpsolvingProblemTable rows={rows} />);

    selectAllStatuses();
    fireEvent.change(screen.getByRole("searchbox", { name: /search problems/i }), {
      target: { value: "100C" }
    });

    expect(screen.getByRole("link", { name: "C. Attempted" })).toBeInTheDocument();
    expect(screen.queryByRole("link", { name: "A. Warmup" })).not.toBeInTheDocument();
    expect(screen.queryByRole("link", { name: "B. Binary Search" })).not.toBeInTheDocument();
  });

  it("filters by the visible new status", () => {
    render(<UpsolvingProblemTable rows={rows} />);

    fireEvent.click(screen.getByRole("button", { name: /filter by status/i }));
    fireEvent.click(screen.getByRole("menuitemradio", { name: /new, 1 problem/i }));

    expect(screen.getByRole("link", { name: "B. Binary Search" })).toBeInTheDocument();
    expect(screen.queryByRole("link", { name: "A. Warmup" })).not.toBeInTheDocument();
    expect(screen.queryByRole("link", { name: "C. Attempted" })).not.toBeInTheDocument();
  });

  it("filters by status", () => {
    render(<UpsolvingProblemTable rows={rows} />);

    fireEvent.click(screen.getByRole("button", { name: /filter by status/i }));
    const menu = screen.getByRole("menu", { name: /status filter options/i });
    expect(within(menu).getByRole("menuitemradio", { name: /attempted, 1 problem/i })).toBeInTheDocument();
    fireEvent.click(within(menu).getByRole("menuitemradio", { name: /attempted, 1 problem/i }));

    expect(screen.getByRole("link", { name: "C. Attempted" })).toBeInTheDocument();
    expect(screen.queryByRole("link", { name: "A. Warmup" })).not.toBeInTheDocument();
    expect(screen.queryByRole("link", { name: "B. Binary Search" })).not.toBeInTheDocument();
  });

  it("filters by selected judge sources", () => {
    render(<UpsolvingProblemTable rows={sourceRows} />);

    selectAllStatuses();
    fireEvent.click(screen.getByRole("button", { name: /filter by judge/i }));
    const menu = screen.getByRole("menu", { name: /judge filter options/i });
    expect(within(menu).getByRole("menuitemcheckbox", { name: /codeforces contest, 1 item/i })).toBeInTheDocument();
    fireEvent.click(within(menu).getByRole("menuitemcheckbox", { name: /codeforces gym, 3 items/i }));
    fireEvent.click(within(menu).getByRole("menuitemcheckbox", { name: /qoj, 1 item/i }));

    expect(screen.getByRole("link", { name: "A. Regular" })).toBeInTheDocument();
    expect(screen.queryByRole("link", { name: "A. Warmup" })).not.toBeInTheDocument();
    expect(screen.queryByRole("link", { name: "QOJ Problem" })).not.toBeInTheDocument();
  });
});
