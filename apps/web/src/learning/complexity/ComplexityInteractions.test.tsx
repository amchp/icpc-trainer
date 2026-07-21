import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { afterEach, describe, expect, it } from "vitest";

import { ComplexityGrowthMeters, ExactCountWorksheet, LocalLinearBenchmark, MemoryModelExplorer, RuntimeEstimator } from "./ComplexityInteractions.js";

describe("complexity guide interactions", () => {
  afterEach(cleanup);

  it("supports wrong, hint, retry, and reveal without gating", () => {
    render(<ExactCountWorksheet />);
    expect(screen.getByText(/count this comparison/)).toBeInTheDocument();
    expect(screen.queryByLabelText("Pair-comparison formula")).not.toBeInTheDocument();
    const inputs = screen.getAllByRole("spinbutton");
    fireEvent.change(inputs[0]!, { target: { value: "3" } });
    fireEvent.change(inputs[1]!, { target: { value: "3" } });
    fireEvent.change(inputs[2]!, { target: { value: "2" } });
    fireEvent.change(inputs[3]!, { target: { value: "1" } });
    fireEvent.change(inputs[4]!, { target: { value: "9" } });
    fireEvent.change(inputs[5]!, { target: { value: "3" } });
    fireEvent.click(screen.getByRole("button", { name: "Check answer" }));
    expect(screen.getByText(/follow j from i \+ 1/)).toBeInTheDocument();
    expect(screen.queryByLabelText("Pair-comparison formula")).not.toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: "Check answer" }));
    fireEvent.click(screen.getByRole("button", { name: "Reveal answer" }));
    expect(screen.getByText(/rows contain 4, 3, 2, and 1/)).toBeInTheDocument();
    expect(inputs[0]).toHaveValue(4);
    expect(screen.getByLabelText("Pair comparisons")).toHaveValue(10);
    expect(screen.getByLabelText("Pair-comparison formula").getAttribute("data-latex")).toContain("frac");
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

  it("changes estimated time with c while preserving the Big O label", () => {
    render(<RuntimeEstimator n={10_000} onNChange={() => undefined} />);
    expect(screen.getByText("1 s")).toBeInTheDocument();
    fireEvent.change(screen.getByLabelText("Constant c"), { target: { value: "8" } });
    expect(screen.getByText("8 s")).toBeInTheDocument();
    expect(screen.getByText(/Big O label: O\(n²\)/)).toBeInTheDocument();
  });

  it("separates input, auxiliary, and total memory for each strategy", () => {
    render(<MemoryModelExplorer n={1_000_000} onNChange={() => undefined} />);
    expect(screen.getAllByText("8,000,000 B (7.63 MiB)")).toHaveLength(2);
    expect(screen.getByText("16,000,000 B (15.26 MiB)")).toBeInTheDocument();
    expect(screen.getByText("Fits the modeled limit")).toBeInTheDocument();
    fireEvent.change(screen.getByLabelText("Memory limit in MiB"), { target: { value: "1" } });
    expect(screen.getByText("Exceeds the modeled limit")).toBeInTheDocument();
    fireEvent.change(screen.getByLabelText("Duplicate-detection strategy"), { target: { value: "hash" } });
    expect(screen.getByText("32,000,000 B (30.52 MiB)")).toBeInTheDocument();
    fireEvent.change(screen.getByLabelText("Duplicate-detection strategy"), { target: { value: "pair" } });
    expect(screen.getByText("8 B")).toBeInTheDocument();
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
