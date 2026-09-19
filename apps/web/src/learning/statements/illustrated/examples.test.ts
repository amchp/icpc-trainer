import { describe, expect, it } from "vitest";
import { getCoreExample } from "./coreExamples.js";
import { getAdvancedExample } from "./advancedExamples.js";
import { getFoundationExample } from "./foundationExamples.js";
import type { IllustratedExample } from "./types.js";

const result = (example: IllustratedExample, input: string) =>
  example.build(input).at(-1)!.result;
const core = {
  sakurako: ["YES", "NO"],
  first: ["8", "-1"],
  closest: ["13", "2"],
  numeric: ["3.16228", "0.50000"],
  bad: ["5", "1"],
  magic: ["4", "0"],
  search: ["[true, false]", "[false, true]"],
  duplicates: ["true", "false"],
  stock: ["5", "0"],
  zeros: ["[1, 0, 0, 2, 3, 0, 0, 4]", "[0, 0, 0]"],
  power: ["8", "0"],
  capstone: ["[0, 1]", "[0, 1]"],
} as const;
const advanced = {
  rooms: ["3", "0"],
  labyrinth: ["YES\n9\nLDDRRRRRU", "NO"],
  teams: ["1 2 2 1 2", "IMPOSSIBLE"],
  schedule: ["3 1 2 4 5", "IMPOSSIBLE"],
  routes: ["0 5 2", "0 8 10"],
  fibonacci: ["13", "0"],
  nonAdjacent: ["13", "0"],
  grid: ["2", "0"],
  knapsack: ["10", "0"],
  dag: ["3", "0"],
  coins: ["6", "1"],
  fails: ["2", "2"],
  activities: ["2", "1"],
  twins: ["2", "2"],
  chat: ["YES", "NO"],
  alternating: ["2", "-2"],
} as const;
const foundation = {
  numeric: ["12", "5"],
  vector: ["0\n2\n3\n4", "2\n0"],
  stack: ["true", "false"],
  queue: ["1\n2\n3\n3", "1\n1\n1"],
  set: ["3", "0"],
  map: ["OK\nOK\nabacaba1\nabacaba2", "OK\nada1\nada2"],
  ranges: ["2\n2\n5", "3\n3"],
  watermelon: ["YES", "NO"],
  password: ["true", "false"],
  folders: ["3", "1"],
} as const;

describe("illustrated example outputs", () => {
  for (const language of ["en", "es"]) {
    for (const [id, expected] of Object.entries(core))
      it(`${language} core/${id}: both examples produce the expected answer`, () => {
        const example = getCoreExample(language, id as keyof typeof core);
        expect(example.presets.map((p) => result(example, p.input))).toEqual(
          expected,
        );
      });
    for (const [id, expected] of Object.entries(advanced))
      it(`${language} advanced/${id}: both examples produce the expected answer`, () => {
        const example = getAdvancedExample(
          language,
          id as keyof typeof advanced,
        );
        expect(example.presets.map((p) => result(example, p.input))).toEqual(
          expected,
        );
      });
    for (const [id, expected] of Object.entries(foundation))
      it(`${language} foundation/${id}: both examples produce the expected answer`, () => {
        const example = getFoundationExample(
          language,
          id as keyof typeof foundation,
        );
        expect(example.presets.map((p) => result(example, p.input))).toEqual(
          expected,
        );
      });
  }
  it("shows completed Sudoku grids preserving givens and validates incomplete boards", () => {
    const example = getCoreExample("en", "sudoku");
    for (const preset of example.presets) {
      const board = result(example, preset.input)!.split("\n");
      const given = preset.input.split("\n");
      for (let r = 0; r < 9; r++)
        for (let c = 0; c < 9; c++)
          if (given[r]![c] !== ".") expect(board[r]![c]).toBe(given[r]![c]);
      for (let i = 0; i < 9; i++) {
        expect(new Set(board[i]).size).toBe(9);
        expect(new Set(board.map((row) => row[i])).size).toBe(9);
        const box = Array.from(
          { length: 9 },
          (_, j) =>
            board[Math.floor(i / 3) * 3 + Math.floor(j / 3)]![
              (i % 3) * 3 + (j % 3)
            ],
        );
        expect(new Set(box).size).toBe(9);
      }
    }
    const validation = getFoundationExample("en", "sudoku");
    expect(validation.presets.map((p) => result(validation, p.input))).toEqual([
      "true",
      "false",
    ]);
  });
  it("handles a one-column maze and an unreachable target", () => {
    const example = getAdvancedExample("en", "labyrinth");
    expect(result(example, "A\n.\nB")).toBe("YES\n2\nDD");
    expect(result(example, "A\n#\nB")).toBe("NO");
  });
  it("highlights only the cheapest parallel flight", () => {
    const example = getAdvancedExample("en", "routes");
    const frames = example.build("2\n1 2 9\n1 2 3");
    const scene = frames[1]!.scenes[0]!;
    expect(scene.kind).toBe("graph");
    if (scene.kind === "graph")
      expect(
        scene.edges.filter((e) => e.tone === "good").map((e) => e.weight),
      ).toEqual([3]);
    expect(frames.at(-1)!.result).toBe("0 3");
  });
  it("keeps illegal plates out, allows touching, and recognizes a full table", () => {
    const example = getFoundationExample("en", "plate");
    expect(result(example, "7 7\n1 1\n1 1")).toBe("1 plates; Player 2's turn.");
    expect(result(example, "7 7\n1 1\n3 1")).toBe("2 plates; Player 1's turn.");
    expect(result(example, "2 2\n1 1")).toContain("Player 1 wins");
  });
  it("handles game endings and rejects moves after the last stone", () => {
    const example = getFoundationExample("en", "stones");
    expect(result(example, "4\n1 3")).toBe("Player 2 wins.");
    expect(() => example.build("1\n1 1")).toThrow();
    const chomp = getFoundationExample("en", "chomp");
    expect(result(chomp, "3 4\n1 1")).toBe("Player 2 wins.");
    expect(result(chomp, "3 4\n2 3")).toBe("Player 2's turn.");
  });
  it("rejects inputs outside each problem contract", () => {
    expect(() => getCoreExample("en", "first").build("3 1\n1")).toThrow();
    expect(() => getCoreExample("en", "capstone").build("1 2 3\n8")).toThrow();
    expect(() =>
      getAdvancedExample("en", "dag").build("2\n1 2\n2 1"),
    ).toThrow();
    expect(() =>
      getAdvancedExample("en", "routes").build("3\n1 2 4"),
    ).toThrow();
    expect(() => getFoundationExample("en", "queue").build("1 1")).toThrow();
    expect(() => getFoundationExample("en", "ranges").build("pop()")).toThrow();
    expect(() =>
      getFoundationExample("en", "password").build(" Aa1!bcde "),
    ).toThrow();
  });
});
