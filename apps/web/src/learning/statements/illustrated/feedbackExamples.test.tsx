import { cleanup, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it } from "vitest";
import { ExampleIllustration } from "./ExampleIllustration.js";
import { getCoreExample } from "./coreExamples.js";
import { getAdvancedExample } from "./advancedExamples.js";
import { getGameExample } from "./gameExamples.js";
import { items } from "./types.js";

afterEach(cleanup);

describe("statement feedback examples", () => {
  it("keeps a twelve-element array on one row and allows it to fit a desktop card", () => {
    const { container } = render(
      <ExampleIllustration
        scene={items(
          "Array",
          Array.from({ length: 12 }, (_, i) => i),
        )}
      />,
    );
    const drawing = screen.getByRole("img", { name: "Array" });
    const positions = Array.from(
      container.querySelectorAll("g[transform]"),
    ).map((g) => g.getAttribute("transform")!);
    expect(positions).toHaveLength(12);
    expect(
      new Set(positions.map((position) => position.split(",")[1])).size,
    ).toBe(1);
    expect(Number.parseFloat(drawing.style.minWidth)).toBeLessThanOrEqual(800);
    expect(drawing).toHaveClass("w-full");
    expect(drawing.parentElement).toHaveClass("overflow-x-auto");
  });
  it("shows Buy and Sell beside the selected chart points, and neither on a losing market", () => {
    const example = getCoreExample("en", "stock");
    const chart = example.build(example.presets[0]!.input).at(-1)!.scenes[0]!;
    render(<ExampleIllustration scene={chart} />);
    expect(screen.getByText("Buy")).toBeInTheDocument();
    expect(screen.getByText("Sell")).toBeInTheDocument();
    expect(chart.kind === "chart" && chart.annotations).toEqual([
      { index: 1, text: "Buy" },
      { index: 4, text: "Sell" },
    ]);
    const down = example.build(example.presets[1]!.input).at(-1)!.scenes[0]!;
    expect(down.kind === "chart" && down.annotations).toEqual([]);
  });
  it("shows cookies and accounts for all remaining ingredients and shared magic powder", () => {
    const example = getCoreExample("en", "magic");
    const frames = example.build(example.presets[0]!.input);
    const states = frames.flatMap((frame) =>
      frame.scenes.filter((scene) => scene.kind === "bakery"),
    );
    expect(states.map((scene) => scene.cookies)).toEqual([0, 1, 2, 3, 4, 4]);
    for (const scene of states) {
      const remaining = scene.ingredients.map(
        (ingredient) => ingredient.remaining,
      );
      expect(remaining.every((value) => value >= 0)).toBe(true);
      expect(
        remaining.reduce((sum, value) => sum + value, 0) +
          scene.powder +
          scene.cookies * 7,
      ).toBe(31);
    }
    const last = states.at(-1)!;
    expect(last.ingredients.map((ingredient) => ingredient.remaining)).toEqual([
      3, 0, 0,
    ]);
    expect(last.powder).toBe(0);
    render(<ExampleIllustration scene={last} />);
    expect(screen.getAllByRole("img", { name: "Cookies baked" })).toHaveLength(
      4,
    );
    expect(screen.getByText(/Magic powder remaining/)).toHaveTextContent("0 g");
  });
  it("keeps all room labels and highlights in the final map", () => {
    const example = getAdvancedExample("en", "rooms");
    const last = example.build(example.presets[0]!.input).at(-1)!;
    const scene = last.scenes[0]!;
    expect(last.result).toBe("3");
    if (scene.kind !== "grid") throw new Error("Expected room map");
    const floor = scene.cells.flat().filter((cell) => cell.text !== "#");
    expect(new Set(floor.map((cell) => cell.text))).toEqual(
      new Set(["1", "2", "3"]),
    );
    expect(
      floor.every((cell) => cell.tone === "good" || cell.tone === "active"),
    ).toBe(true);
  });
  for (const language of ["en", "es"])
    for (const id of ["plate", "stones", "chomp"] as const) {
      it(`${language} ${id} presets play through to a winner`, () => {
        const example = getGameExample(language, id);
        for (const preset of example.presets) {
          const frames = example.build(preset.input);
          expect(frames.length).toBeGreaterThan(5);
          expect(frames.at(-1)!.result).toMatch(
            language === "es" ? /Gana el jugador [12]/ : /Player [12] wins/,
          );
        }
      });
    }
  it("rejects removed Chomp squares and moves after either game's ending", () => {
    expect(() =>
      getGameExample("en", "chomp").build("3 4\n2 2\n3 3"),
    ).toThrow();
    expect(() =>
      getGameExample("en", "chomp").build("3 4\n1 1\n2 2"),
    ).toThrow();
    expect(() =>
      getGameExample("en", "plate").build("2 2\n1 1\n0 0"),
    ).toThrow();
  });
});
