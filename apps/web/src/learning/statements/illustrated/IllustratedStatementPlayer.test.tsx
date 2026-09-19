import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { i18n } from "../../../i18n/i18n.js";
import { getCoreExample } from "./coreExamples.js";
import { IllustratedStatementPlayer } from "./IllustratedStatementPlayer.js";

beforeEach(async () => {
  await i18n.changeLanguage("en");
  vi.stubGlobal("matchMedia", () => ({
    matches: false,
    addEventListener: vi.fn(),
    removeEventListener: vi.fn(),
  }));
});
afterEach(() => {
  cleanup();
  vi.unstubAllGlobals();
});
const next = () =>
  fireEvent.click(screen.getByRole("button", { name: "Next trace step" }));
const output = () => document.querySelector("[data-example-result]");

describe("illustrated statement controls", () => {
  it("shows an accessible drawing, steps to the answer and switches to an absent example", () => {
    render(
      <IllustratedStatementPlayer
        example={getCoreExample("en", "first")}
        title="First copy"
      />,
    );
    expect(
      screen.getByRole("img", { name: "Input array" }),
    ).toBeInTheDocument();
    next();
    next();
    expect(output()).toHaveTextContent(/^8$/);
    fireEvent.click(screen.getByRole("tab", { name: "Compare another input" }));
    expect(output()).toHaveTextContent("Advance to see the result");
    next();
    next();
    expect(output()).toHaveTextContent(/^-1$/);
  });
  it("loads custom input, computes its answer and preserves the scene after an invalid edit", () => {
    render(
      <IllustratedStatementPlayer
        example={getCoreExample("en", "first")}
        title="First copy"
      />,
    );
    fireEvent.click(screen.getByText("Try your own input"));
    fireEvent.change(screen.getByRole("textbox", { name: "Preview input" }), {
      target: { value: "2 4 4 8\n4" },
    });
    fireEvent.click(screen.getByRole("button", { name: "Load input" }));
    expect(screen.getByRole("tab", { name: "Your input" })).toHaveAttribute(
      "aria-selected",
      "true",
    );
    next();
    next();
    expect(output()).toHaveTextContent(/^1$/);
    fireEvent.change(screen.getByRole("textbox", { name: "Preview input" }), {
      target: { value: "4 2\n4" },
    });
    fireEvent.click(screen.getByRole("button", { name: "Load input" }));
    expect(screen.getByRole("alert")).toHaveTextContent("sorted");
    expect(output()).toHaveTextContent(/^1$/);
    fireEvent.change(screen.getByRole("textbox", { name: "Preview input" }), {
      target: { value: "2 4\n2" },
    });
    fireEvent.click(screen.getByRole("button", { name: "Load input" }));
    expect(screen.queryByRole("alert")).not.toBeInTheDocument();
    next();
    next();
    expect(output()).toHaveTextContent(/^0$/);
  });
  it("keeps manual stepping available with reduced motion", () => {
    vi.stubGlobal("matchMedia", () => ({
      matches: true,
      addEventListener: vi.fn(),
      removeEventListener: vi.fn(),
    }));
    render(
      <IllustratedStatementPlayer
        example={getCoreExample("en", "duplicates")}
        title="Duplicates"
      />,
    );
    expect(screen.getByRole("button", { name: "Play" })).toBeDisabled();
    next();
    next();
    expect(output()).toHaveTextContent(/^true$/);
  });
  it("localizes the editor, drawing and validation", async () => {
    await i18n.changeLanguage("es");
    render(
      <IllustratedStatementPlayer
        example={getCoreExample("es", "first")}
        title="Primera copia"
      />,
    );
    expect(
      screen.getByRole("img", { name: "Arreglo de entrada" }),
    ).toBeInTheDocument();
    fireEvent.click(screen.getByText("Prueba tu propia entrada"));
    fireEvent.change(
      screen.getByRole("textbox", { name: "Entrada de la vista previa" }),
      { target: { value: "3 1\n1" } },
    );
    fireEvent.click(screen.getByRole("button", { name: "Cargar entrada" }));
    expect(screen.getByRole("alert")).toHaveTextContent("ordenada");
    expect(output()).toHaveTextContent("Avanza para ver el resultado");
  });
});
