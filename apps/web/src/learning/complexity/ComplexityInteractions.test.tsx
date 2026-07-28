import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { afterEach, describe, expect, it } from "vitest";

import { ComplexityCurveChart, ComplexityGrowthMeters, ExactCountWorksheet, LocalLinearBenchmark, MemoryAllocationLab, MemoryModelExplorer, RuntimeEstimator } from "./ComplexityInteractions.js";

describe("complexity guide interactions", () => {
  afterEach(cleanup);

  it("supports wrong, hint, retry, and reveal without gating", () => {
    render(<ExactCountWorksheet />);
    expect(screen.getByText(/count this comparison/)).toBeInTheDocument();
    expect(screen.queryByLabelText("Worst-case batch work")).not.toBeInTheDocument();
    const inputs = screen.getAllByRole("spinbutton");
    fireEvent.change(inputs[0]!, { target: { value: "3" } });
    fireEvent.change(inputs[1]!, { target: { value: "5" } });
    fireEvent.change(inputs[2]!, { target: { value: "8" } });
    fireEvent.change(inputs[3]!, { target: { value: "3" } });
    fireEvent.click(screen.getByRole("button", { name: "Check answer" }));
    expect(screen.getByText(/follow each search from the first user ID/)).toBeInTheDocument();
    expect(screen.queryByLabelText("Worst-case batch work")).not.toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: "Check answer" }));
    fireEvent.click(screen.getByRole("button", { name: "Reveal answer" }));
    expect(screen.getByText(/first search needs 4 comparisons and the missing user needs all 5/)).toBeInTheDocument();
    expect(inputs[0]).toHaveValue(4);
    expect(screen.getByLabelText("Total ID comparisons")).toHaveValue(9);
    const formula = screen.getByLabelText("Worst-case batch work");
    expect(formula.getAttribute("data-latex")).toContain("q\\cdot n");
    expect(formula.getAttribute("data-latex")).not.toContain("O(");
  });

  it("synchronizes the 100,000,000 preset and keeps above-cap text", () => {
    let currentN = 1000;
    const onNChange = (value: number): void => { currentN = value; };
    const { rerender } = render(<ComplexityGrowthMeters n={currentN} onNChange={onNChange} />);
    fireEvent.click(screen.getByRole("button", { name: "Use n = 100,000,000" }));
    rerender(<ComplexityGrowthMeters n={currentN} onNChange={onNChange} />);
    expect(currentN).toBe(100_000_000);
    expect(screen.getByRole("progressbar", { name: /O\(n²\)/ })).toHaveAttribute("aria-valuenow", "16");
    expect(screen.getAllByText(/longer than the current age of the universe/).length).toBeGreaterThan(0);
  });

  it("ends chart curves when they leave the visible operation range", () => {
    render(<ComplexityCurveChart />);
    const constantPoints = screen.getByTestId("curve-constant").getAttribute("points")?.trim().split(" ") ?? [];
    const exponentialPoints = screen.getByTestId("curve-exponential").getAttribute("points")?.trim().split(" ") ?? [];
    const factorialPoints = screen.getByTestId("curve-factorial").getAttribute("points")?.trim().split(" ") ?? [];
    expect(constantPoints).toHaveLength(6);
    expect(exponentialPoints.length).toBeLessThan(constantPoints.length);
    expect(factorialPoints.length).toBeLessThan(constantPoints.length);
    expect(exponentialPoints.at(-1)).toMatch(/,8\.00$/);
    expect(factorialPoints.at(-1)).toMatch(/,8\.00$/);
  });

  it("shows time in meter headers and operation totals on the bar scale", () => {
    render(<ComplexityGrowthMeters n={10_000} onNChange={() => undefined} />);
    expect(screen.getByText("500,000,000 operations ≈ 1 second")).toBeInTheDocument();
    expect(screen.getByText("100,000,000 modeled operations", { selector: "span" })).toBeInTheDocument();
    expect(screen.getAllByText("10¹⁸ operations fills the bar").length).toBeGreaterThan(0);
    expect(screen.getByText("200 ms", { selector: "span" })).toBeInTheDocument();
    expect(screen.queryByText(/At 5 × 10⁸ ops\/s:/)).not.toBeInTheDocument();
  });

  it("changes estimated time with c while preserving the Big O label", () => {
    render(<RuntimeEstimator n={10_000} onNChange={() => undefined} />);
    expect(screen.getByText("200 ms")).toBeInTheDocument();
    expect(screen.getByText("500,000,000 operations/second")).toBeInTheDocument();
    expect(screen.getByText("500,000,000 operations ≈ 1 second")).toBeInTheDocument();
    expect(screen.getByText(/50,000,000 operations ≈ 0.1 second/)).toBeInTheDocument();
    expect(screen.queryByLabelText("Operations per second")).not.toBeInTheDocument();
    fireEvent.change(screen.getByLabelText("Constant c"), { target: { value: "8" } });
    expect(screen.getByText("1.6 s")).toBeInTheDocument();
    expect(screen.getByText(/Big O label: O\(n²\)/)).toBeInTheDocument();
  });

  it("separates input, auxiliary, and total memory for each strategy", () => {
    render(<MemoryModelExplorer n={1_000_000} onNChange={() => undefined} />);
    expect(screen.getAllByText("8,000,000 B (7.63 MiB)")).toHaveLength(2);
    expect(screen.getByText("16,000,000 B (15.26 MiB)")).toBeInTheDocument();
    expect(screen.getByText("Fits the modeled limit")).toBeInTheDocument();
    fireEvent.change(screen.getByLabelText("Memory limit in MiB"), { target: { value: "1" } });
    expect(screen.getByText("Exceeds the modeled limit")).toBeInTheDocument();
    fireEvent.change(screen.getByLabelText("User-search strategy"), { target: { value: "hash" } });
    expect(screen.getByText("32,000,000 B (30.52 MiB)")).toBeInTheDocument();
    fireEvent.change(screen.getByLabelText("User-search strategy"), { target: { value: "pair" } });
    expect(screen.getByText("12 B")).toBeInTheDocument();
  });

  it("shows array allocation growth and checks the learner's space prediction", () => {
    let currentN = 5;
    const onNChange = (value: number): void => { currentN = value; };
    const { rerender } = render(<MemoryAllocationLab n={currentN} onNChange={onNChange} />);

    expect(screen.getByLabelText("User array with 5 items at 8 bytes each")).toBeInTheDocument();
    expect(screen.getByText("40 B", { selector: "dd" })).toBeInTheDocument();
    expect(screen.getByText("12 B", { selector: "dd" })).toBeInTheDocument();
    expect(screen.getByText("52 B", { selector: "dd" })).toBeInTheDocument();
    expect(screen.getByText(/The linear scan keeps the supplied vector and adds only fixed loop state/)).toBeInTheDocument();

    fireEvent.change(screen.getByLabelText("Search strategy"), { target: { value: "sort" } });
    expect(screen.getByText(/The sorted index copies the user IDs before sorting them/)).toBeInTheDocument();
    expect(screen.getAllByText("40 B", { selector: "dd" })).toHaveLength(2);
    expect(screen.getByText("80 B", { selector: "dd" })).toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: "O(n)" }));
    fireEvent.click(screen.getByRole("button", { name: "Check memory prediction" }));
    expect(screen.getByText(/Correct: doubling n doubles the copied index/)).toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: "Use 10 users" }));
    rerender(<MemoryAllocationLab n={currentN} onNChange={onNChange} />);
    expect(screen.getByLabelText("User array with 10 items at 8 bytes each")).toBeInTheDocument();
    expect(screen.getAllByText("80 B", { selector: "dd" })).toHaveLength(2);
    expect(screen.getByText("160 B", { selector: "dd" })).toBeInTheDocument();
  });

  it("runs bounded workloads and reports timings, checksums, and disclaimer", async () => {
    render(<LocalLinearBenchmark />);
    fireEvent.click(screen.getByRole("button", { name: "Run local O(n) comparison" }));
    await waitFor(() => expect(screen.getByText("Direct scan")).toBeInTheDocument());
    expect(screen.getByText("Mixed arithmetic scan")).toBeInTheDocument();
    expect(screen.getAllByText(/Checksum/)).toHaveLength(2);
    expect(screen.getByText(/Device-specific result/)).toBeInTheDocument();
  });
});
