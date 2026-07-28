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

  it("renders the complete user-search scaling lesson and all nine one-second thresholds", () => {
    render(<TimeComplexityPage />);
    expect(screen.getByRole("heading", { name: "Time & Space Complexity" })).toBeInTheDocument();
    expect(screen.getByText("Will user search stay fast as the site grows?")).toBeInTheDocument();
    expect(screen.getByRole("heading", { name: "Start with the product, then count the work." })).toBeInTheDocument();
    expect(screen.getByText(/A clear baseline, not the final architecture/)).toBeInTheDocument();
    expect(screen.getByText("Your engineering lead asks for a resource estimate before this ships.")).toBeInTheDocument();
    expect(screen.getByText("How many ID comparisons will the searches require?")).toBeInTheDocument();
    expect(screen.getByText("How many bytes will the user list and search index occupy?")).toBeInTheDocument();
    expect(screen.getByText(/people-search request has returned five user IDs/)).toBeInTheDocument();
    expect(screen.getByText(/count this comparison/)).toBeInTheDocument();
    const countSection = document.querySelector("#count");
    expect(countSection).not.toBeNull();
    expect(countSection?.textContent).not.toContain("O(");
    const notationHeading = screen.getByRole("heading", { name: "From a count to a growth label" });
    const compareHeading = screen.getByRole("heading", { name: "When does the simple search stop being enough?" });
    expect(notationHeading.compareDocumentPosition(compareHeading) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();
    expect(screen.getByText(/Big O is the notation for that upper growth pattern/)).toBeInTheDocument();
    const memoryHeading = screen.getByRole("heading", { name: "Calculate how the extra memory grows" });
    expect(notationHeading.compareDocumentPosition(memoryHeading) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();
    expect(memoryHeading.compareDocumentPosition(compareHeading) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();
    expect(screen.getByText(/A 64-bit user ID occupies 8 bytes/)).toBeInTheDocument();
    expect(screen.getByRole("heading", { name: "Build the memory model" })).toBeInTheDocument();
    expect(screen.getByLabelText("User array with 5 items at 8 bytes each")).toBeInTheDocument();
    expect(screen.getByText(/The linear scan keeps the supplied vector and adds only fixed loop state/)).toBeInTheDocument();
    const totalMemoryHeading = screen.getByRole("heading", { name: "Calculate your program's total memory" });
    const memoryQuestionsHeading = screen.getByRole("heading", { name: "Test your memory model" });
    expect(totalMemoryHeading.compareDocumentPosition(memoryQuestionsHeading) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();
    expect(document.querySelector("#memory details")).toBeNull();
    expect(screen.getByText("100,000,000 ÷ 500,000,000 = 0.2 s")).toBeInTheDocument();
    expect(screen.getByText("Fixed reference rate")).toBeInTheDocument();
    expect(screen.getByLabelText("Quadratic simplification").getAttribute("data-latex")).toContain("O(n^2)");
    expect(screen.getByText(/The chart answers a visual question/)).toBeInTheDocument();
    expect(screen.getByRole("img", { name: /Growth curves from n equals 10 through one million/ })).toHaveAttribute("data-n-max", "1000000");
    const table = screen.getByRole("table", { name: "Largest approximate input within the one-second model" });
    expect(within(table).getAllByRole("row")).toHaveLength(10);
    expect(within(table).getAllByRole("columnheader")).toHaveLength(2);
    expect(within(table).queryByRole("columnheader", { name: "What this means" })).not.toBeInTheDocument();
    expect(within(table).getByLabelText("2 to the power of 10 to the power of 5")).toBeInTheDocument();
    expect(screen.queryByText(/Each ID is 64 bits, which is 8 bytes/)).not.toBeInTheDocument();
    expect(screen.queryByText(/source_users\(n\)/)).not.toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: "8n bytes" }));
    expect(screen.getByText(/Each ID is 64 bits, which is 8 bytes/)).toBeInTheDocument();
    expect(screen.getByLabelText("Answer code")).toHaveTextContent("vector<long long> source_users(n);");
    expect(screen.getByRole("heading", { name: "Choose as the site scales" })).toBeInTheDocument();
    const compareSection = document.querySelector("#compare");
    expect(compareSection).not.toBeNull();
    const compareQuestions = within(compareSection as HTMLElement);
    expect(compareQuestions.getByText(/5 users · 2 searches/)).toBeInTheDocument();
    expect(compareQuestions.queryByText(/10,000 users · 100 searches/)).not.toBeInTheDocument();
    expect(screen.queryByText(/The repeated scan is O\(qn\)/)).not.toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: "O(qn)" }));
    expect(screen.getByText(/The repeated scan is O\(qn\)/)).toBeInTheDocument();
    expect(screen.getAllByLabelText("Answer code").at(-1)!).toHaveTextContent("user_exists_linear");
    fireEvent.click(compareQuestions.getByRole("button", { name: "Next question" }));
    expect(compareQuestions.getByText(/10,000 users · 100 searches/)).toBeInTheDocument();
    fireEvent.click(compareQuestions.getByRole("button", { name: "1,000,000" }));
    expect(screen.getAllByLabelText("Answer code").at(-1)!).toHaveTextContent("build_sorted_user_index");
    expect(document.querySelector("#compare details")).toBeNull();
    expect(screen.getByRole("heading", { name: "Practical loop-counting tricks" })).toBeInTheDocument();
    expect(screen.getByRole("heading", { name: "Count passes" }).closest("article")).toHaveTextContent("checksum += i");
    expect(screen.getByRole("heading", { name: "Multiply nesting" }).closest("article")).toHaveTextContent("inspect(i, j)");
    expect(screen.getByRole("heading", { name: "Add sequences" }).closest("article")).toHaveTextContent("validate_user(j)");
    expect(screen.getByText("What is the time complexity of this single loop?")).toBeInTheDocument();
    const loopPractice = screen.getByRole("region", { name: "Try the loop shortcut" });
    expect(within(loopPractice).queryByText(/body runs n times/)).not.toBeInTheDocument();
    fireEvent.click(within(loopPractice).getByRole("button", { name: "O(n)" }));
    expect(within(loopPractice).getByRole("status")).toHaveTextContent("body runs n times");
    const counterPractice = screen.getByRole("region", { name: "Challenge the shortcut" });
    fireEvent.click(within(counterPractice).getByRole("button", { name: "Next question" }));
    expect(within(counterPractice).getByText(/Why is its time complexity not O\(n\)/)).toBeInTheDocument();
    fireEvent.click(within(counterPractice).getByRole("button", { name: "O(log n)" }));
    expect(within(counterPractice).getByRole("status")).toHaveTextContent("i doubles on every pass");
    expect(screen.getByRole("heading", { name: "Count how long recursion takes" })).toBeInTheDocument();
    expect(screen.getByRole("heading", { name: "One recursive call" }).closest("article")).toHaveTextContent("countdown(n - 1)");
    expect(screen.getByRole("heading", { name: "Shrink the input" }).closest("article")).toHaveTextContent("halve(n / 2)");
    expect(screen.getByRole("heading", { name: "Branch into two calls" }).closest("article")).toHaveTextContent("fibonacci(n - 2)");
    expect(screen.getByText("How long does this countdown recursion take?")).toBeInTheDocument();
    const recursionPractice = screen.getByRole("region", { name: "Trace the recursive calls" });
    fireEvent.click(within(recursionPractice).getByRole("button", { name: "O(n)" }));
    expect(within(recursionPractice).getByRole("status")).toHaveTextContent("maximum stack depth is also O(n)");
    fireEvent.click(within(recursionPractice).getByRole("button", { name: "Next question" }));
    fireEvent.click(within(recursionPractice).getByRole("button", { name: "Next question" }));
    expect(within(recursionPractice).getByText("Question 3 of 3")).toBeInTheDocument();
    expect(within(recursionPractice).getByRole("button", { name: "Next question" })).toBeDisabled();
    expect(document.querySelector("#recursion")?.textContent).not.toMatch(/memoiz/i);
    expect(screen.getByText(/No advanced recurrence theorem is needed/)).toBeInTheDocument();
    expect(state.start).toHaveBeenCalledWith(LEARNING_GUIDE_IDS.TimeComplexity, expect.any(Object));
  });

  it("uses manual Learning Progress completion without gating lesson controls", () => {
    render(<TimeComplexityPage />);
    fireEvent.click(screen.getByRole("button", { name: "Mark guide complete" }));
    expect(state.setStatus).toHaveBeenCalledWith({ guideId: LEARNING_GUIDE_IDS.TimeComplexity, status: LEARNING_PROGRESS_STATUSES.Completed }, expect.any(Object));
    expect(screen.getByRole("button", { name: "Check answer" })).toBeEnabled();
  });
});
