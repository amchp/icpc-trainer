import { LEARNING_GUIDE_IDS, LEARNING_PROGRESS_STATUSES } from "@icpc-trainer/shared";
import { cleanup, render, screen } from "@testing-library/react";
import type { ReactNode } from "react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { ResourcesPage } from "./ResourcesPage.js";

const progressState = vi.hoisted(() => ({
  data: undefined as undefined | Array<{
    guideId: LEARNING_GUIDE_IDS;
    status: LEARNING_PROGRESS_STATUSES;
    startedAt: string;
    completedAt: string | null;
    updatedAt: string;
  }>,
  isLoading: false,
  isError: false,
  refetch: vi.fn()
}));

vi.mock("@tanstack/react-router", () => ({
  Link: ({ children, to, className }: { children: ReactNode; to: string; className?: string }) =>
    <a href={to} className={className}>{children}</a>
}));

vi.mock("./useLearningProgress.js", () => ({ useLearningProgress: () => progressState }));

describe("ResourcesPage", () => {
  afterEach(cleanup);
  beforeEach(() => {
    progressState.data = undefined;
    progressState.isLoading = false;
    progressState.isError = false;
    progressState.refetch.mockReset();
  });

  it("renders every available guide as a link", () => {
    render(<ResourcesPage />);
    expect(document.querySelector("main")).toHaveClass("max-w-7xl");
    expect(screen.getByRole("link", { name: /Introduction/ })).toHaveAttribute("href", "/resources/introduction");
    expect(screen.getByRole("link", { name: /Programming Fundamentals/ })).toHaveAttribute(
      "href",
      "/resources/programming-fundamentals"
    );
    expect(screen.getByRole("link", { name: /Time & Space Complexity/ })).toHaveAttribute("href", "/resources/time-complexity");
    expect(screen.getByRole("link", { name: /Data Structures/ })).toHaveAttribute(
      "href",
      "/resources/data-structures"
    );
    expect(screen.getByRole("link", { name: /Greedy/ })).toHaveAttribute("href", "/resources/greedy");
    expect(screen.getByRole("link", { name: /Brute Force/ })).toHaveAttribute("href", "/resources/brute-force");
    expect(screen.getByRole("link", { name: /Binary Search/ })).toHaveAttribute("href", "/resources/binary-search");
    expect(screen.getByRole("link", { name: /Dynamic Programming/ })).toHaveAttribute("href", "/resources/dynamic-programming");
    expect(screen.getByRole("link", { name: /Graph Theory/ })).toHaveAttribute("href", "/resources/graph-theory");
    expect(screen.getByText("0 / 9 completed")).toBeInTheDocument();
    const dataStructures = screen.getByRole("link", { name: /Data Structures/ });
    const graphTheory = screen.getByRole("link", { name: /Graph Theory/ });
    const dynamicProgramming = screen.getByRole("link", { name: /Dynamic Programming/ });
    const greedy = screen.getByRole("link", { name: /Greedy/ });
    expect(dataStructures).toHaveClass("min-h-11", "py-1.5");
    expect(screen.getByRole("heading", { name: "Time & Space Complexity" })).toHaveClass("whitespace-normal");
    expect(screen.getByRole("heading", { name: "Time & Space Complexity" })).not.toHaveClass("truncate");
    expect(dataStructures.compareDocumentPosition(greedy) & Node.DOCUMENT_POSITION_FOLLOWING).not.toBe(0);
    expect(greedy.compareDocumentPosition(graphTheory) & Node.DOCUMENT_POSITION_FOLLOWING).not.toBe(0);
    expect(graphTheory.compareDocumentPosition(dynamicProgramming) & Node.DOCUMENT_POSITION_FOLLOWING).not.toBe(0);
    expect(dynamicProgramming).toHaveTextContent("06");
  });

  it("shows saved completion state", () => {
    progressState.data = [
      LEARNING_GUIDE_IDS.Introduction,
      LEARNING_GUIDE_IDS.ProgrammingFundamentals,
      LEARNING_GUIDE_IDS.TimeComplexity,
      LEARNING_GUIDE_IDS.DataStructures
    ].map((guideId) => ({
      guideId,
      status: LEARNING_PROGRESS_STATUSES.Completed,
      startedAt: "2026-07-16T00:00:00.000Z",
      completedAt: "2026-07-16T01:00:00.000Z",
      updatedAt: "2026-07-16T01:00:00.000Z"
    }));
    render(<ResourcesPage />);
    expect(screen.getAllByText("Completed")).toHaveLength(4);
    expect(screen.getByText("4 / 9 completed")).toBeInTheDocument();
  });

  it("counts one completed guide independently", () => {
    progressState.data = [{
      guideId: LEARNING_GUIDE_IDS.Introduction,
      status: LEARNING_PROGRESS_STATUSES.Completed,
      startedAt: "2026-07-16T00:00:00.000Z",
      completedAt: "2026-07-16T01:00:00.000Z",
      updatedAt: "2026-07-16T01:00:00.000Z"
    }];
    render(<ResourcesPage />);
    expect(screen.getByText("1 / 9 completed")).toBeInTheDocument();
  });

  it("keeps the guide available when progress fails", () => {
    progressState.isError = true;
    render(<ResourcesPage />);
    expect(screen.getByText(/Progress could not be loaded/)).toBeInTheDocument();
    expect(screen.getByRole("link", { name: /Introduction/ })).toBeInTheDocument();
    expect(screen.getByRole("link", { name: /Programming Fundamentals/ })).toBeInTheDocument();
    expect(screen.getByRole("link", { name: /Time & Space Complexity/ })).toBeInTheDocument();
    expect(screen.getByRole("link", { name: /Data Structures/ })).toBeInTheDocument();
    expect(screen.getByRole("link", { name: /Brute Force/ })).toBeInTheDocument();
    expect(screen.getByRole("link", { name: /Binary Search/ })).toBeInTheDocument();
    expect(screen.getByRole("link", { name: /Greedy/ })).toBeInTheDocument();
    expect(screen.getByRole("link", { name: /Dynamic Programming/ })).toBeInTheDocument();
    expect(screen.getByRole("link", { name: /Graph Theory/ })).toBeInTheDocument();
  });
});
