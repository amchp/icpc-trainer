import { LEARNING_GUIDE_IDS, LEARNING_PROGRESS_STATUSES } from "@icpc-trainer/shared";
import { cleanup, fireEvent, render, screen, within } from "@testing-library/react";
import type { ReactNode } from "react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { TimeComplexityPage } from "./TimeComplexityPage.js";

const state = vi.hoisted(() => ({ start: vi.fn(), setStatus: vi.fn(), success: vi.fn(), error: vi.fn() }));
vi.mock("@clerk/clerk-react", () => ({ useAuth: () => ({ userId: "complexity-learner" }) }));
vi.mock("@tanstack/react-router", () => ({ Link: ({ children, to, className }: { children: ReactNode; to: string; className?: string }) => <a href={to} className={className}>{children}</a> }));
vi.mock("./useLearningProgress.js", () => ({
  useLearningProgress: () => ({ data: [] }),
  useStartLearningGuide: () => ({ mutate: state.start }),
  useSetLearningProgressStatus: () => ({ mutate: state.setStatus, isPending: false })
}));
vi.mock("./Toaster.js", () => ({ useToaster: () => ({ success: state.success, error: state.error }) }));

class ObserverStub { observe(): void {} disconnect(): void {} }

describe("TimeComplexityPage", () => {
  beforeEach(() => { vi.stubGlobal("IntersectionObserver", ObserverStub); state.start.mockReset(); state.setStatus.mockReset(); });
  afterEach(() => { cleanup(); vi.unstubAllGlobals(); });

  it("renders the complete delivery lesson and all nine one-second thresholds", () => {
    render(<TimeComplexityPage />);
    expect(screen.getByRole("heading", { name: "Time & Space Complexity" })).toBeInTheDocument();
    expect(screen.getByText("How long will your code take to run?")).toBeInTheDocument();
    expect(screen.getByRole("heading", { name: "What does the loop actually repeat?" })).toBeInTheDocument();
    expect(screen.getByText(/count this comparison/)).toBeInTheDocument();
    expect(screen.getByRole("heading", { name: "Which bytes count—and which bytes still count against the judge?" })).toBeInTheDocument();
    expect(screen.getByLabelText("Quadratic simplification").getAttribute("data-latex")).toContain("O(n^2)");
    expect(screen.getByRole("img", { name: /Normalized growth curves/ })).toBeInTheDocument();
    const table = screen.getByRole("table", { name: "Largest approximate input within the one-second model" });
    expect(within(table).getAllByRole("row")).toHaveLength(10);
    expect(screen.getByText("Expected O(n)")).toBeInTheDocument();
    expect(state.start).toHaveBeenCalledWith(LEARNING_GUIDE_IDS.TimeComplexity, expect.any(Object));
  });

  it("uses manual Learning Progress completion without gating lesson controls", () => {
    render(<TimeComplexityPage />);
    fireEvent.click(screen.getByRole("button", { name: "Mark guide complete" }));
    expect(state.setStatus).toHaveBeenCalledWith({ guideId: LEARNING_GUIDE_IDS.TimeComplexity, status: LEARNING_PROGRESS_STATUSES.Completed }, expect.any(Object));
    expect(screen.getByRole("button", { name: "Check answer" })).toBeEnabled();
  });
});
