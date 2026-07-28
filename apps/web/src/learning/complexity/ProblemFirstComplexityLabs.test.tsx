import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it } from "vitest";

import {
  BigOSimplifierLab,
  ControlFlowCounterLab,
  FibonacciRecursionLab,
  OperationMemoryFormulaLab,
  StockMemoryEstimatorLab,
  TwoSumCapstoneLab
} from "./ProblemFirstComplexityLabs.js";

describe("problem-first complexity labs", () => {
  afterEach(cleanup);

  it("reveals the exponential Fibonacci call tree one layer at a time", () => {
    render(<FibonacciRecursionLab />);

    expect(screen.getByTestId("fibonacci-naive-animation")).toBeInTheDocument();
    expect(screen.getByTestId("fibonacci-naive-animation").querySelectorAll("[data-fibonacci-node]")).toHaveLength(1);
    fireEvent.click(screen.getByRole("button", { name: "Reveal next layer" }));
    expect(screen.getByTestId("fibonacci-naive-animation").querySelectorAll("[data-fibonacci-node]")).toHaveLength(3);
    expect(screen.getByText("Layer 2 of 6 is visible with 3 total calls. New calls on this layer: F(5), F(4).")).toBeInTheDocument();
    expect(screen.getByRole("list", { name: "Visible parent and child call relationships" })).toHaveTextContent("F(6) calls F(5)");
    expect(screen.getByRole("list", { name: "Visible parent and child call relationships" })).toHaveTextContent("F(6) calls F(4)");
    fireEvent.click(screen.getByRole("button", { name: "Reset trace" }));
    for (let step = 0; step < 5; step += 1) {
      fireEvent.click(screen.getByRole("button", { name: "Reveal next layer" }));
    }
    expect(screen.getByText("Tree layers revealed").parentElement).toHaveTextContent("6/6");
    expect(screen.getByText("Calls revealed").parentElement).toHaveTextContent("25");
    expect(screen.getByText("Maximum active depth").parentElement).toHaveTextContent("6");
    expect(screen.queryByRole("button", { name: /memoized/i })).not.toBeInTheDocument();
  });

  it("derives operation and memory formulas from changing input dimensions", () => {
    render(<OperationMemoryFormulaLab />);

    expect(screen.getByText("T(n, q) = qn")).toBeInTheDocument();
    expect(screen.getByText(/2 × 5 = 10 equality comparisons/)).toBeInTheDocument();
    expect(screen.getByText("M(n, q) = 8n + 8q + c_fixed")).toBeInTheDocument();
    expect(screen.getByText("8(5 + 2) = 56 B")).toBeInTheDocument();
    fireEvent.change(screen.getByLabelText("Stored users n"), { target: { value: "10" } });
    fireEvent.change(screen.getByLabelText("Search queries q"), { target: { value: "3" } });
    expect(screen.getByText(/3 × 10 = 30 equality comparisons/)).toBeInTheDocument();
    expect(screen.getByText("8(10 + 3) = 104 B")).toBeInTheDocument();
  });

  it("estimates memory using the three Stock-specific solution designs", () => {
    render(<StockMemoryEstimatorLab n={100} onNChange={() => undefined} />);

    expect(screen.getByText("Input memory").parentElement).toHaveTextContent("400 B");
    expect(screen.getByText("Auxiliary memory").parentElement).toHaveTextContent("404 B");
    expect(screen.getByText("Total modeled memory").parentElement).toHaveTextContent("804 B");
    fireEvent.change(screen.getByLabelText("Stock solution design"), { target: { value: "pairs" } });
    expect(screen.getByText("Auxiliary memory").parentElement).toHaveTextContent("12 B");
    expect(screen.getByText("Total modeled memory").parentElement).toHaveTextContent("412 B");
    fireEvent.change(screen.getByLabelText("Stock solution design"), { target: { value: "running" } });
    expect(screen.getByText("Auxiliary memory").parentElement).toHaveTextContent("12 B");
    expect(screen.getByText("Total modeled memory").parentElement).toHaveTextContent("412 B");
  });

  it("simplifies formulas to Big O by keeping the dominant term", () => {
    render(<BigOSimplifierLab />);

    expect(screen.getAllByText("3n² + 4n + 20")).toHaveLength(2);
    expect(screen.getByText("n²")).toBeInTheDocument();
    expect(screen.getByText("O(n²)")).toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: "7n + 12" }));
    expect(screen.getByText("O(n)")).toBeInTheDocument();
  });

  it("counts executed conditions separately from work triggered by a branch", () => {
    render(<ControlFlowCounterLab />);

    expect(screen.getByText("Upper bound on if checks").parentElement).toHaveTextContent("≤ 8");
    expect(screen.getByText("Upper bound on shifts").parentElement).toHaveTextContent("≤ 24");
    expect(screen.getByText("Upper bound on counted work").parentElement).toHaveTextContent("≤ 32");
    fireEvent.change(screen.getByLabelText("Number of zeros z"), { target: { value: "8" } });
    expect(screen.getByText("Upper bound on shifts").parentElement).toHaveTextContent("≤ 64");
    expect(screen.getByText("Upper bound on counted work").parentElement).toHaveTextContent("≤ 72");
  });

  it("reveals neutral reference feedback without an aggregate pass/fail verdict", () => {
    render(<TwoSumCapstoneLab />);

    fireEvent.change(screen.getByLabelText("Classify Nested index pairs"), { target: { value: "O(n) / O(n) / expected" } });
    fireEvent.click(screen.getByRole("button", { name: "Reveal the reference model" }));

    expect(screen.getByRole("status")).toHaveTextContent("Reference model");
    expect(screen.getByRole("status")).toHaveTextContent("not a pass/fail result");
    expect(screen.getByRole("status")).not.toHaveTextContent("Correct");
    expect(screen.getByRole("status")).not.toHaveTextContent("Retry");
    fireEvent.click(screen.getByRole("button", { name: "Reset" }));
    expect(screen.queryByRole("status")).not.toBeInTheDocument();
  });
});
