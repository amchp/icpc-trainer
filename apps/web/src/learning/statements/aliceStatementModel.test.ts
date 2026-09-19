import { describe, expect, it } from "vitest";
import { buildAliceExample } from "./aliceStatementModel.js";

describe("Alice statement examples", () => {
  it("shows every legal move until the first target visit", () => {
    expect(buildAliceExample("NNE", 1, 2)).toMatchObject({ answer: "YES", positions: [{ x: 0, y: 0 }, { x: 0, y: 1 }, { x: 0, y: 2 }, { x: 1, y: 2 }] });
    const late = buildAliceExample("NE", 10, 10);
    expect(late.answer).toBe("YES");
    expect(late.positions).toHaveLength(21);
    expect(late.positions.at(-1)).toEqual({ x: 10, y: 10 });
  });

  it("distinguishes closed loops and paths that drift away from the target", () => {
    expect(buildAliceExample("NS", 1, 2)).toMatchObject({ answer: "NO", positions: [{ x: 0, y: 0 }, { x: 0, y: 1 }, { x: 0, y: 0 }, { x: 0, y: 1 }, { x: 0, y: 0 }] });
    expect(buildAliceExample("SW", 1, 1).answer).toBe("NO");
    expect(buildAliceExample("NESW", 1, 1).answer).toBe("YES");
    expect(buildAliceExample("ENW", 1, 10).answer).toBe("YES");
    expect(buildAliceExample("NEN", 2, 2).answer).toBe("NO");
  });

  it("matches direct movement for all allowed targets in representative patterns", () => {
    for (const pattern of ["NNE", "NE", "NS", "NESW", "SW", "ENW", "NNES", "NNNNNEEEEE", "WNNNEES", "SSENNN"]) {
      const visited = new Set<string>();
      let x = 0, y = 0;
      for (const direction of pattern.repeat(21)) {
        x += direction === "E" ? 1 : direction === "W" ? -1 : 0;
        y += direction === "N" ? 1 : direction === "S" ? -1 : 0;
        visited.add(`${x},${y}`);
      }
      for (let x = 1; x <= 10; x++) for (let y = 1; y <= 10; y++) {
        expect(buildAliceExample(pattern, x, y).answer, `${pattern} at ${x},${y}`).toBe(visited.has(`${x},${y}`) ? "YES" : "NO");
      }
    }
  });

  it("rejects malformed inputs instead of inventing a result", () => {
    for (const [moves, x, y] of [["", 1, 2], ["NX", 1, 2], ["N".repeat(11), 1, 2], ["NE", 1.5, 2], ["NE", 0, 2], ["NE", 1, 11]] as const) {
      expect(() => buildAliceExample(moves, x, y)).toThrow();
    }
  });
});
