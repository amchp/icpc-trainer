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
    expect(screen.getByRole("link", { name: /Brute Force/ })).toHaveAttribute("href", "/resources/brute-force");
    expect(screen.getByText("0 / 5 completed")).toBeInTheDocument();
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
    expect(screen.getByText("4 / 5 completed")).toBeInTheDocument();
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
    expect(screen.getByText("1 / 5 completed")).toBeInTheDocument();
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
  });
});
