import { act, cleanup, fireEvent, render, screen, within } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { i18n } from "../../i18n/i18n.js";
import "../../i18n/registerGreedyResources.js";
import { CoinChangeLab, TwinsTool } from "./GreedyInteractions.js";

describe("Greedy interactions", () => {
  beforeEach(async () => {
    await i18n.changeLanguage("en");
    vi.stubGlobal("matchMedia", () => ({ matches: false, addEventListener: vi.fn(), removeEventListener: vi.fn() }));
  });

  afterEach(async () => {
    cleanup();
    vi.useRealTimers();
    vi.unstubAllGlobals();
    await i18n.changeLanguage("en");
  });

  it("resets and stops on an edit even when the replacement trace has the same length", () => {
    render(<CoinChangeLab />);
    const lab = screen.getByLabelText("Coin change Lab");
    expect(lab).toHaveTextContent("Step 1 of 13");
    fireEvent.click(within(lab).getByRole("button", { name: "Next step" }));
    expect(lab).toHaveTextContent("Step 2 of 13");
    fireEvent.click(within(lab).getByRole("button", { name: "Play" }));
    expect(within(lab).getByRole("button", { name: "Pause" })).toHaveAttribute("aria-pressed", "true");
    fireEvent.change(within(lab).getByLabelText("Target amount"), { target: { value: "43" } });
    expect(lab).toHaveTextContent("Step 1 of 13");
    expect(within(lab).getByRole("button", { name: "Play" })).toHaveAttribute("aria-pressed", "false");
  });

  it("shows a localized alert and removes every step control for invalid input", () => {
    render(<CoinChangeLab />);
    const lab = screen.getByLabelText("Coin change Lab");
    fireEvent.change(within(lab).getByLabelText("Target amount"), { target: { value: "0" } });
    expect(within(lab).getByRole("alert")).toHaveTextContent("1 through 500");
    expect(within(lab).queryByRole("button", { name: "Next step" })).not.toBeInTheDocument();
    expect(lab.querySelector("[aria-live='polite']")).not.toBeInTheDocument();
  });

  it("disables autoplay under reduced motion but preserves manual steps", async () => {
    vi.stubGlobal("matchMedia", () => ({ matches: true, addEventListener: vi.fn(), removeEventListener: vi.fn() }));
    render(<TwinsTool />);
    const lab = screen.getByLabelText("Twins tool");
    const play = within(lab).getByRole("button", { name: "Play" });
    expect(play).toBeDisabled();
    expect(lab).toHaveTextContent("manual steps remain available");
    expect(lab.querySelectorAll("[aria-live='polite']")).toHaveLength(1);
    expect(lab.querySelector("[aria-live='polite']")).not.toHaveTextContent("");
    fireEvent.click(within(lab).getByRole("button", { name: "Next step" }));
    expect(lab).toHaveTextContent("Step 2 of 4");
    expect(within(lab).getByRole("button", { name: "Previous step" })).toBeEnabled();
  });

  it("autoplay advances and stops at the final frame", async () => {
    vi.useFakeTimers();
    render(<TwinsTool />);
    const lab = screen.getByLabelText("Twins tool");
    fireEvent.click(within(lab).getByRole("button", { name: "Play" }));
    for (let step = 0; step < 3; step += 1) await act(async () => vi.advanceTimersByTimeAsync(1_100));
    expect(lab).toHaveTextContent("Step 4 of 4");
    expect(within(lab).getByRole("button", { name: "Play" })).toBeDisabled();
  });
});
