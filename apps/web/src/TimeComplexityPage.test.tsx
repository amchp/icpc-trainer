import { LEARNING_GUIDE_IDS, LEARNING_PROGRESS_STATUSES } from "@icpc-trainer/shared";
import { cleanup, fireEvent, render, screen, within } from "@testing-library/react";
import type { ReactNode } from "react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { problemFirstComplexityCode, TimeComplexityPage } from "./TimeComplexityPage.js";

const state = vi.hoisted(() => ({ start: vi.fn(), setStatus: vi.fn(), success: vi.fn(), error: vi.fn() }));
vi.mock("@clerk/clerk-react", () => ({ useAuth: () => ({ userId: "complexity-learner" }) }));
vi.mock("@tanstack/react-router", () => ({
  Link: ({ children, to, className }: { children: ReactNode; to: string; className?: string }) => <a href={to} className={className}>{children}</a>
}));
vi.mock("./useLearningProgress.js", () => ({
  useLearningProgress: () => ({ data: [] }),
  useStartLearningGuide: () => ({ mutate: state.start }),
  useSetLearningProgressStatus: () => ({ mutate: state.setStatus, isPending: false })
}));
vi.mock("./Toaster.js", () => ({ useToaster: () => ({ success: state.success, error: state.error }) }));

class ObserverStub {
  observe(): void {}
  disconnect(): void {}
}

describe("TimeComplexityPage", () => {
  beforeEach(() => {
    vi.stubGlobal("IntersectionObserver", ObserverStub);
    state.start.mockReset();
    state.setStatus.mockReset();
  });

  afterEach(() => {
    cleanup();
    vi.unstubAllGlobals();
  });

  it("presents six challenges before their tools and preserves real problem sources", () => {
    render(<TimeComplexityPage />);

    expect(screen.getByRole("heading", { name: "Time & Space Complexity" })).toBeInTheDocument();
    for (const title of [
      "How long will this search run, and how much memory will it use?",
      "Contains Duplicate",
      "Best Time to Buy and Sell Stock",
      "Duplicate Zeros",
      "Fibonacci Number",
      "Two Sum"
    ]) {
      expect(screen.getByRole("heading", { name: title })).toBeInTheDocument();
    }
    expect(screen.getAllByText(/Learning challenge/)).toHaveLength(6);
    expect(screen.getAllByRole("button", { name: "Reveal the analysis tool" })).toHaveLength(6);
    expect(screen.queryByRole("heading", { name: "Count operations and bytes until a formula appears" })).not.toBeInTheDocument();

    const sourceLinks = screen.getAllByRole("link", { name: "Open the original problem" });
    expect(sourceLinks).toHaveLength(5);
    expect(sourceLinks[0]).toHaveAttribute("href", "https://leetcode.com/problems/contains-duplicate/");
    expect(sourceLinks[3]).toHaveAttribute("href", "https://leetcode.com/problems/fibonacci-number/");
    expect(sourceLinks.at(-1)).toHaveAttribute("href", "https://leetcode.com/problems/two-sum/");
    expect(screen.queryByText("Continue the toolkit")).not.toBeInTheDocument();
    const stockHeading = screen.getByRole("heading", { name: "Best Time to Buy and Sell Stock" });
    const zerosHeading = screen.getByRole("heading", { name: "Duplicate Zeros" });
    const powerHeading = screen.getByRole("heading", { name: "Fibonacci Number" });
    expect(stockHeading.compareDocumentPosition(zerosHeading) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();
    expect(zerosHeading.compareDocumentPosition(powerHeading) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();
    expect(state.start).toHaveBeenCalledWith(LEARNING_GUIDE_IDS.TimeComplexity, expect.any(Object));
  });

  it("reveals the analysis and comparison as separate learner-controlled stages with two questions", () => {
    render(<TimeComplexityPage />);
    const searchSection = document.querySelector("#search");
    expect(searchSection).not.toBeNull();
    const search = within(searchSection as HTMLElement);

    fireEvent.click(search.getByRole("button", { name: "Reveal the analysis tool" }));
    expect(search.getByRole("heading", { name: "Count operations and bytes until a formula appears" })).toBeInTheDocument();
    expect(search.getByRole("heading", { name: "Change the input; watch the counts become formulas" })).toBeInTheDocument();
    expect(search.getByText("T(n, q) = qn")).toBeInTheDocument();
    expect(search.getByText("M(n, q) = 8n + 8q + c_fixed")).toBeInTheDocument();
    expect(search.queryByText("Repeat a direct scan")).not.toBeInTheDocument();

    fireEvent.click(search.getByRole("button", { name: "Compare solution approaches" }));
    expect(search.getByText("Repeat a direct scan")).toBeInTheDocument();
    expect(search.getByText("Build a sorted copy")).toBeInTheDocument();
    expect(search.getByText("Build a hash index")).toBeInTheDocument();
    const comparison = search.getByRole("region", { name: "Solution approach comparison" });
    expect(comparison.firstElementChild).toHaveClass("grid", "gap-4");
    expect(comparison.firstElementChild).not.toHaveClass("xl:grid-cols-3");
    expect(search.getByText("Question 1 of 2")).toBeInTheDocument();
    fireEvent.click(search.getByRole("button", { name: "Evaluating id == query" }));
    expect(search.getByRole("status")).toHaveTextContent("equality check is the repeated work");
    fireEvent.click(search.getByRole("button", { name: "Next question" }));
    expect(search.getByText("Question 2 of 2")).toBeInTheDocument();
  });

  it("exposes Big O, estimation, control-flow, recursion, and capstone tools in the requested order", () => {
    render(<TimeComplexityPage />);
    const duplicatesSection = document.querySelector("#duplicates");
    const stockSection = document.querySelector("#stock");
    const powerSection = document.querySelector("#power");
    const zerosSection = document.querySelector("#zeros");
    const capstoneSection = document.querySelector("#capstone");
    expect(duplicatesSection).not.toBeNull();
    expect(stockSection).not.toBeNull();
    expect(powerSection).not.toBeNull();
    expect(zerosSection).not.toBeNull();
    expect(capstoneSection).not.toBeNull();
    const duplicates = within(duplicatesSection as HTMLElement);
    const stock = within(stockSection as HTMLElement);
    const power = within(powerSection as HTMLElement);
    const zeros = within(zerosSection as HTMLElement);
    const capstone = within(capstoneSection as HTMLElement);

    fireEvent.click(duplicates.getByRole("button", { name: "Reveal the analysis tool" }));
    expect(duplicates.getByRole("heading", { name: "Keep the dominant growth; drop constants" })).toBeInTheDocument();
    expect(duplicates.getAllByText("3n² + 4n + 20")).toHaveLength(2);

    fireEvent.click(stock.getByRole("button", { name: "Reveal the analysis tool" }));
    expect(stock.getByRole("heading", { name: "Runtime estimator" })).toBeInTheDocument();
    expect(stock.getByRole("heading", { name: "Estimate memory for the same three candidates" })).toBeInTheDocument();
    expect(stock.getByText("Input memory").parentElement).toHaveTextContent("4,000 B");
    expect(stock.getByText("Auxiliary memory").parentElement).toHaveTextContent("4,004 B");
    expect(stock.getByText("Total modeled memory").parentElement).toHaveTextContent("8,004 B");

    fireEvent.click(zeros.getByRole("button", { name: "Reveal the analysis tool" }));
    expect(zeros.getByRole("heading", { name: "One if can trigger much more than one operation" })).toBeInTheDocument();
    expect(zeros.getByText(/T\(n, z\) ≤ n \+ zn/)).toBeInTheDocument();

    fireEvent.click(power.getByRole("button", { name: "Reveal the analysis tool" }));
    expect(power.getByRole("heading", { name: "Expand F(6) one layer at a time" })).toBeInTheDocument();
    expect(power.getByText(/O\(2ⁿ\) is a simple upper bound/)).toBeInTheDocument();
    expect(power.getByTestId("fibonacci-naive-animation")).toBeInTheDocument();
    fireEvent.click(power.getByRole("button", { name: "Reveal next layer" }));
    expect(power.getByText("Calls revealed").parentElement).toHaveTextContent("3");
    expect(power.queryByRole("button", { name: /memoized/i })).not.toBeInTheDocument();

    fireEvent.click(capstone.getByRole("button", { name: "Reveal the analysis tool" }));
    expect(capstone.getByRole("heading", { name: "Classify before comparing" })).toBeInTheDocument();
    expect(capstone.getByRole("button", { name: "Reveal the reference model" })).toBeEnabled();
  });

  it("uses manual Learning Progress completion without gating practice", () => {
    render(<TimeComplexityPage />);
    fireEvent.click(screen.getByRole("button", { name: "Mark guide complete" }));

    expect(state.setStatus).toHaveBeenCalledWith(
      { guideId: LEARNING_GUIDE_IDS.TimeComplexity, status: LEARNING_PROGRESS_STATUSES.Completed },
      expect.any(Object)
    );
    expect(screen.getAllByRole("button", { name: "Reveal the analysis tool" })[0]).toBeEnabled();
  });

  it("keeps displayed fragments valid for the course's C++17 model and Duplicate Zeros sample", () => {
    expect(problemFirstComplexityCode.searchHash).toContain("find(query) != index.end()");
    expect(problemFirstComplexityCode.twoSumHash).toContain("match != seen.end()");
    expect(problemFirstComplexityCode.searchHash).not.toContain(".contains(");
    expect(problemFirstComplexityCode.twoSumHash).not.toContain(".contains(");
    expect(problemFirstComplexityCode.zerosShift).toContain("++i; // skip the zero just inserted");
    expect(problemFirstComplexityCode.fibonacciNaive).toContain("fibonacci(n - 1) + fibonacci(n - 2)");
    expect(problemFirstComplexityCode.fibonacciTable).toContain("values[index] = values[index - 1] + values[index - 2]");
    expect(problemFirstComplexityCode.fibonacciIterative).toContain("previous = current");

    const values = [1, 0, 2, 3, 0, 4, 5, 0];
    for (let i = 0; i < values.length; i += 1) {
      if (values[i] !== 0) continue;
      for (let j = values.length - 1; j > i; j -= 1) values[j] = values[j - 1] ?? 0;
      i += 1;
    }
    expect(values).toEqual([1, 0, 0, 2, 3, 0, 0, 4]);
  });
});
