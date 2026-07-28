import { act, cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { buildSudokuSearchEvents, SudokuStrategySimulator } from "./SudokuStrategySimulator.js";

const copy = {
  label: "Sudoku search",
  description: "Every branch is visible.",
  searchRule: "Try 1 through 9.",
  play: "Simulate all",
  pause: "Pause",
  next: "Next",
  nextBacktrack: "Next backtrack",
  reset: "Reset",
  complete: "Complete",
  progress: "{{current}} of {{total}}",
  start: "Ready.",
  rejected: "Reject {{value}} at {{row}}, {{column}}.",
  placed: "Place {{value}} at {{row}}, {{column}}.",
  undone: "Undo {{value}} at {{row}}, {{column}}.",
  solved: "Solved.",
  candidateLabel: "Candidates",
  counters: { tested: "tested", rejected: "rejected", backtracked: "backtracks" },
  reducedMotion: "Manual only.",
  fixedCell: "fixed",
  tentativeCell: "tentative",
  rejectedCell: "rejected",
  backtrackedCell: "backtracked",
  emptyCell: "empty"
} as const;

describe("SudokuStrategySimulator", () => {
  beforeEach(() => {
    vi.stubGlobal("matchMedia", vi.fn(() => ({ matches: false, addEventListener: vi.fn(), removeEventListener: vi.fn() })));
  });
  afterEach(() => {
    cleanup();
    vi.useRealTimers();
    vi.unstubAllGlobals();
  });

  it("records rejected digits, tentative placements, real backtracks, and a solved board", () => {
    const events = buildSudokuSearchEvents();
    expect(events).toHaveLength(402);
    expect(events.filter((event) => event.kind === "reject")).toHaveLength(325);
    expect(events.filter((event) => event.kind === "place")).toHaveLength(60);
    expect(events.filter((event) => event.kind === "undo")).toHaveLength(15);
    expect(events.at(-1)).toMatchObject({
      kind: "solved",
      tested: 385,
      rejected: 325,
      placed: 60,
      backtracked: 15
    });
    expect(events.at(-1)?.board.flat()).not.toContain(0);
  });

  it("always chooses the first empty cell from top to bottom in reading order", () => {
    const decisions = buildSudokuSearchEvents().filter((event) => event.kind !== "start" && event.kind !== "solved");

    for (const event of decisions) {
      const boardBeforeDecision = event.board.map((row) => [...row]);
      if (event.kind === "place") boardBeforeDecision[event.row!]![event.column!] = 0;
      const firstEmpty = boardBeforeDecision
        .flatMap((row, rowIndex) => row.map((value, columnIndex) => ({ value, row: rowIndex, column: columnIndex })))
        .find((cell) => cell.value === 0);
      expect({ row: event.row, column: event.column }).toEqual({ row: firstEmpty?.row, column: firstEmpty?.column });
    }
  });

  it("cycles through candidates and visibly returns when a deeper branch fails", () => {
    render(<SudokuStrategySimulator copy={copy} />);

    expect(screen.getByText("0 of 401")).toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: "Next" }));
    expect(screen.getByText("Reject 1 at 1, 3.")).toBeInTheDocument();
    expect(screen.getByText("1", { selector: "[aria-current='step']" })).toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: "Next" }));
    fireEvent.click(screen.getByRole("button", { name: "Next" }));
    fireEvent.click(screen.getByRole("button", { name: "Next" }));
    expect(screen.getByText("Place 4 at 1, 3.")).toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: "Next backtrack" }));
    expect(screen.getByText(/Undo \d at \d, \d\./)).toBeInTheDocument();
    expect(screen.getByRole("cell", { name: /backtracked$/ })).toHaveTextContent("↶");

    fireEvent.click(screen.getByRole("button", { name: "Reset" }));
    expect(screen.getByText("0 of 401")).toBeInTheDocument();
  });

  it("can play the complete search and retains all 45 solved cells", () => {
    vi.useFakeTimers();
    render(<SudokuStrategySimulator copy={copy} />);
    fireEvent.click(screen.getByRole("button", { name: "Simulate all" }));
    for (let step = 0; step < 401; step += 1) act(() => vi.advanceTimersByTime(35));
    expect(screen.getByText("401 of 401")).toBeInTheDocument();
    expect(screen.getAllByText("Complete").length).toBeGreaterThan(0);
    expect(screen.getAllByLabelText(/tentative$/)).toHaveLength(45);
  }, 10_000);
});
