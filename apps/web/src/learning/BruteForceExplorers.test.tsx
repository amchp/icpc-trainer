import { act, cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { i18n } from "../i18n/i18n.js";
import { AliceMoveSimulator, exploreKitchen, exploreSigns, KitchenPermutationExplorer, SignDecisionExplorer, SimpleSimulationDemo, simulateAlice } from "./BruteForceExplorers.js";

describe("brute-force interactive explorers", () => {
  beforeEach(async () => {
    await i18n.changeLanguage("en");
  });

  afterEach(() => {
    cleanup();
    vi.useRealTimers();
  });

  it("simulates every Alice move in order for up to 21 passes", () => {
    const found = simulateAlice(["N", "N", "E"], 1, 2);
    expect(found.found).toEqual({ x: 1, y: 2, cycle: 1, move: 3 });
    expect(found.visits.map(({ x, y }) => [x, y])).toEqual([[0, 0], [0, 1], [0, 2], [1, 2]]);

    const missing = simulateAlice(["N"], 1, 1);
    expect(missing.found).toBeNull();
    expect(missing.visits).toHaveLength(22);
  });

  it("stacks the traffic light vertically in red, yellow, green order", () => {
    render(<SimpleSimulationDemo />);

    const light = screen.getByLabelText("Simulated traffic light");
    expect(light).toHaveClass("flex-col");
    expect([...light.children].map((element) => element.getAttribute("aria-label"))).toEqual(["red", "yellow", "green"]);
    expect(screen.getByText("red", { exact: true })).toBeInTheDocument();
    expect(screen.getByText("yellow", { exact: true })).toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: "Apply next rule" }));
    expect(screen.getByText("yellow", { exact: true })).toBeInTheDocument();
    expect(screen.getByText("green", { exact: true })).toBeInTheDocument();
  });

  it("parses real Kitchen Plates input and evaluates all 120 orders", () => {
    const result = exploreKitchen("D>B\nA>D\nE<C\nA>B\nB>C");
    expect(result.error).toBeNull();
    expect(result.candidates).toHaveLength(120);
    expect(result.solutions).toContain("ECBDA");
    expect(exploreKitchen("A<B").error).toBe("lineCount");
    expect(exploreKitchen("A<A\nB<C\nC<D\nD<E\nA<E").error).toBe("syntax");
  });

  it("visits every binary assignment and reports a zero-sum witness", () => {
    expect(exploreSigns(2, 1)).toMatchObject({ evaluated: 8, matches: 2 });
    expect(exploreSigns(2, 1).solution?.reduce((sum, value) => sum + value, 0)).toBe(0);
    expect(exploreSigns(1, 0)).toMatchObject({ evaluated: 2, matches: 0, solution: null });
  });

  it("animates Alice on a board and lets the learner run each problem-specific explorer", async () => {
    vi.useFakeTimers();
    render(<><AliceMoveSimulator /><KitchenPermutationExplorer /><SignDecisionExplorer /></>);

    expect(screen.getByRole("img", { name: "Path checked by the Alice simulation" })).toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: "Simulate 21 passes" }));
    expect(screen.getByText(/Replaying move 0 of 3/)).toBeInTheDocument();
    for (let step = 0; step < 3; step += 1) {
      await act(async () => vi.advanceTimersByTimeAsync(200));
    }
    expect(screen.getByText(/target is reached in pass 1/)).toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: "Check every ordering" }));
    expect(screen.getAllByText("ECBDA")).toHaveLength(2);
    expect(screen.getByLabelText("ECBDA: accepted")).toBeInTheDocument();
    expect(screen.queryByText(/one valid smallest-to-largest/)).not.toBeInTheDocument();
    expect(screen.getByLabelText("All generated plate orderings")).not.toHaveClass("overflow-y-auto");

    fireEvent.click(screen.getByRole("button", { name: "Explore all decisions" }));
    expect(screen.getByText(/One accepted assignment/)).toBeInTheDocument();
    expect(screen.getByRole("listitem", { name: /Final sum 0:/ })).toBeInTheDocument();
  });

  it("uses stable dropdown controls for plate restrictions and sign counts", () => {
    render(<><KitchenPermutationExplorer /><SignDecisionExplorer /></>);

    expect(screen.queryByRole("textbox")).not.toBeInTheDocument();
    expect(screen.getByRole("combobox", { name: "Left plate in restriction 1" })).toHaveValue("D");
    expect(screen.getByRole("combobox", { name: "Relation in restriction 1" })).toHaveValue(">");
    expect(screen.getByRole("combobox", { name: "Number of ones (a)" })).toHaveValue("2");

    fireEvent.change(screen.getByRole("combobox", { name: "Number of ones (a)" }), { target: { value: "3" } });
    expect(screen.getByRole("combobox", { name: "Number of ones (a)" })).toHaveValue("3");
  });
});
