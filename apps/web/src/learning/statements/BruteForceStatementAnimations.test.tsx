import { cleanup, fireEvent, render, screen, within } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import "../../i18n/registerBruteForceResources.js";
import { i18n } from "../../i18n/i18n.js";
import { AliceStatementAnimation, KitchenStatementAnimation } from "./BruteForceStatementAnimations.js";

beforeEach(async () => {
  await i18n.changeLanguage("en");
  vi.stubGlobal("matchMedia", () => ({ matches: false, addEventListener: vi.fn(), removeEventListener: vi.fn() }));
});
afterEach(() => { cleanup(); vi.unstubAllGlobals(); });

function finish(player: HTMLElement): void {
  const next = within(player).getByRole("button", { name: /Next trace step|Paso siguiente de la traza/ });
  for (let i = 0; i < 220 && !next.hasAttribute("disabled"); i++) fireEvent.click(next);
  expect(next).toBeDisabled();
}

describe("illustrated statement examples", () => {
  it("shows the board moving to a YES result and a closed-loop NO result", () => {
    render(<AliceStatementAnimation />);
    const player = screen.getByRole("region", { name: /Statement animation:/ });
    expect(within(player).getByRole("img", { name: "Alice at (0, 0); target (1, 2)" })).toBeInTheDocument();
    fireEvent.click(within(player).getByRole("button", { name: "Next trace step" }));
    expect(within(player).getByRole("img", { name: "Alice at (0, 1); target (1, 2)" })).toBeInTheDocument();
    finish(player);
    expect(within(player).getByText("YES", { exact: true })).toBeInTheDocument();
    fireEvent.click(within(player).getByRole("tab", { name: "NO example" }));
    finish(player);
    expect(within(player).getByText("NO", { exact: true })).toBeInTheDocument();
    expect(player).toHaveTextContent("same two positions forever");
  });

  it("loads custom input, resets the board, and follows the new moves", () => {
    render(<AliceStatementAnimation />);
    fireEvent.change(screen.getByLabelText("Moves (N, S, E, W)"), { target: { value: "en" } });
    fireEvent.change(screen.getByLabelText("Target x"), { target: { value: "2" } });
    fireEvent.change(screen.getByLabelText("Target y"), { target: { value: "2" } });
    fireEvent.click(screen.getByRole("button", { name: "Load input" }));
    const player = screen.getByRole("region", { name: /Statement animation:/ });
    expect(within(player).getByRole("tab", { name: "Your input" })).toHaveAttribute("aria-selected", "true");
    expect(player).toHaveTextContent("s = EN");
    fireEvent.click(within(player).getByRole("button", { name: "Next trace step" }));
    expect(within(player).getByRole("img", { name: "Alice at (1, 0); target (2, 2)" })).toBeInTheDocument();
    finish(player);
    expect(within(player).getByText("YES", { exact: true })).toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: "Load input" }));
    expect(within(player).queryByText("YES", { exact: true })).not.toBeInTheDocument();
    expect(screen.getByRole("img", { name: "Alice at (0, 0); target (2, 2)" })).toBeInTheDocument();
  });

  it("illustrates accepted and rejected orders without enumerating solutions", () => {
    render(<KitchenStatementAnimation />);
    const player = screen.getByRole("region", { name: /Statement animation:/ });
    finish(player);
    expect(player).toHaveTextContent("Example output: ECBDA");
    fireEvent.click(within(player).getByRole("tab", { name: "Invalid order" }));
    for (let i = 0; i < 5; i++) fireEvent.click(within(player).getByRole("button", { name: "Next trace step" }));
    expect(within(player).getByRole("img", { name: "C is heavier; B>C is invalid" })).toBeInTheDocument();
    finish(player);
    expect(player).toHaveTextContent("does not mean the input is impossible");
    expect(player).not.toHaveTextContent("permutation");
  });

  it("localizes the illustrated controls and supports reduced-motion stepping", async () => {
    await i18n.changeLanguage("es");
    vi.stubGlobal("matchMedia", () => ({ matches: true, addEventListener: vi.fn(), removeEventListener: vi.fn() }));
    render(<AliceStatementAnimation />);
    const player = screen.getByRole("region", { name: /Animación del enunciado:/ });
    expect(within(player).getByRole("button", { name: "Reproducir" })).toBeDisabled();
    expect(screen.getByRole("button", { name: "Cargar entrada" })).toBeInTheDocument();
    finish(player);
    expect(player).toHaveTextContent("Alice llega al objetivo");
  });
});
