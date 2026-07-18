import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";

import { FunctionTrace, LoopStepper, TypeExplorer } from "./GuideDemos.js";

afterEach(() => {
  cleanup();
  vi.unstubAllGlobals();
});

const setReducedMotion = (matches: boolean): void => {
  vi.stubGlobal("matchMedia", vi.fn(() => ({
    matches,
    addEventListener: vi.fn(),
    removeEventListener: vi.fn()
  })));
};

describe("guide demos", () => {
  it("exposes the selected type programmatically", () => {
    render(<TypeExplorer />);

    const integer = screen.getByRole("button", { name: "int" });
    const decimal = screen.getByRole("button", { name: "double" });
    expect(integer).toHaveAttribute("aria-pressed", "true");
    expect(decimal).toHaveAttribute("aria-pressed", "false");

    fireEvent.click(decimal);
    expect(integer).toHaveAttribute("aria-pressed", "false");
    expect(decimal).toHaveAttribute("aria-pressed", "true");
    expect(screen.getByText("3.1416")).toBeInTheDocument();
  });

  it("offers previous, next, reset, and play/pause controls with a text summary", () => {
    setReducedMotion(false);
    render(<LoopStepper />);

    const previous = screen.getByRole("button", { name: "Previous loop step" });
    const next = screen.getByRole("button", { name: "Next loop step" });
    const reset = screen.getByRole("button", { name: "Reset loop" });
    const play = screen.getByRole("button", { name: "Play loop trace" });
    expect(previous).toBeDisabled();
    expect(screen.getByText("Current state: i = 1. Printed values: none.")).toBeInTheDocument();

    fireEvent.click(next);
    expect(previous).toBeEnabled();
    expect(screen.getByText("Current state: i = 2. Printed values: 1.")).toBeInTheDocument();
    fireEvent.click(previous);
    expect(screen.getByText("Current state: i = 1. Printed values: none.")).toBeInTheDocument();
    fireEvent.click(play);
    expect(screen.getByRole("button", { name: "Pause loop trace" })).toHaveAttribute("aria-pressed", "true");
    fireEvent.click(reset);
    expect(screen.getByRole("button", { name: "Play loop trace" })).toHaveAttribute("aria-pressed", "false");
  });

  it("turns off automatic loop playback when reduced motion is requested", () => {
    setReducedMotion(true);
    render(<LoopStepper />);

    expect(screen.getByRole("button", { name: "Play loop trace" })).toBeDisabled();
    expect(screen.getByText(/Automatic playback is unavailable because reduced motion is enabled/)).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Next loop step" })).toBeEnabled();
  });

  it("lets learners trace a function call interactively", () => {
    render(<FunctionTrace />);

    expect(screen.getByRole("status")).toHaveTextContent("calls sumar with the values 7 and 3");
    fireEvent.click(screen.getByRole("button", { name: "Next" }));
    expect(screen.getByRole("status")).toHaveTextContent("parameters x and y receive 7 and 3");
    expect(screen.getByText("x = 7, y = 3")).toHaveAttribute("aria-current", "step");
    fireEvent.click(screen.getByRole("button", { name: "Reset trace" }));
    expect(screen.getByText("sumar(7, 3)")).toHaveAttribute("aria-current", "step");
  });
});
