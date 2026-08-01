import { describe, expect, it } from "vitest";

import {
  countRooms,
  dijkstra,
  gridBfs,
  kahnTopologicalOrder,
  twoColour
} from "./graphModels.js";
import {
  LABYRINTH_MULTIPATH,
  LABYRINTH_SAMPLE,
  LABYRINTH_UNREACHABLE,
  ROOMS_DIAGONAL,
  ROOMS_SAMPLE,
  ROOMS_WINDING,
  ROUTES_DETOUR,
  ROUTES_SAMPLE,
  ROUTES_STALE,
  SCHEDULE_CYCLE,
  SCHEDULE_MULTIPLE,
  SCHEDULE_SAMPLE,
  splitLabyrinthGrid,
  TEAMS_EVEN_CYCLE,
  TEAMS_ODD_CYCLE,
  TEAMS_SAMPLE
} from "./graphScenarios.js";

describe("countRooms", () => {
  it("counts the locked room fixtures with orthogonal connectivity", () => {
    expect(countRooms(ROOMS_SAMPLE).rooms).toBe(3);
    expect(countRooms(ROOMS_DIAGONAL).rooms).toBe(2);
    expect(countRooms(ROOMS_WINDING).rooms).toBe(1);
    expect(countRooms(["###", "###"]).rooms).toBe(0);
  });

  it("rejects malformed grids", () => {
    expect(() => countRooms(["..", "."])).toThrow(/same length/i);
    expect(() => countRooms([".x"])).toThrow(/invalid character/i);
  });
});

describe("gridBfs", () => {
  it("finds a valid shortest path through the official sample", () => {
    const { grid, start, end } = splitLabyrinthGrid(LABYRINTH_SAMPLE);
    const result = gridBfs(grid, start, end);
    expect(result.reachable).toBe(true);
    expect(result.distance).toBe(9);
    expect(result.path[0]).toEqual(start);
    expect(result.path.at(-1)).toEqual(end);
    expect(result.path).toHaveLength(result.distance! + 1);
    expect(result.moves).toHaveLength(result.distance!);
    for (let index = 1; index < result.path.length; index += 1) {
      const previous = result.path[index - 1]!;
      const current = result.path[index]!;
      expect(Math.abs(previous.row - current.row) + Math.abs(previous.column - current.column)).toBe(1);
      expect(grid[current.row]![current.column]).not.toBe("#");
    }
    const replay = [{ ...start }];
    for (const move of result.moves) {
      const previous = replay.at(-1)!;
      const delta = move === "D" ? [1, 0] : move === "U" ? [-1, 0] : move === "R" ? [0, 1] : [0, -1];
      replay.push({ row: previous.row + delta[0]!, column: previous.column + delta[1]! });
    }
    expect(replay).toEqual(result.path);
  });

  it("handles unreachable and multiple-shortest-path grids", () => {
    const unreachable = splitLabyrinthGrid(LABYRINTH_UNREACHABLE);
    expect(gridBfs(unreachable.grid, unreachable.start, unreachable.end)).toMatchObject({ reachable: false, distance: null, path: [], moves: "" });
    const multipath = splitLabyrinthGrid(LABYRINTH_MULTIPATH);
    expect(gridBfs(multipath.grid, multipath.start, multipath.end).distance).toBe(4);
  });
});

describe("twoColour", () => {
  it("colours every component of the official sample deterministically", () => {
    const result = twoColour(TEAMS_SAMPLE.n, TEAMS_SAMPLE.edges);
    expect(result.bipartite).toBe(true);
    expect(result.colours.slice(1)).toEqual([1, 2, 2, 1, 2]);
    expect(result.conflictEdge).toBeNull();
  });

  it("detects an odd cycle at a same-colour edge", () => {
    const result = twoColour(TEAMS_ODD_CYCLE.n, TEAMS_ODD_CYCLE.edges);
    expect(result.bipartite).toBe(false);
    expect(result.conflictEdge).not.toBeNull();
    const [from, to] = result.conflictEdge!;
    expect(result.colours[from]).toBe(result.colours[to]);
  });

  it("colours an even cycle and its isolated vertex", () => {
    const result = twoColour(TEAMS_EVEN_CYCLE.n, TEAMS_EVEN_CYCLE.edges);
    expect(result.bipartite).toBe(true);
    expect(result.colours[5]).toBe(1);
    for (const [from, to] of TEAMS_EVEN_CYCLE.edges) expect(result.colours[from]).not.toBe(result.colours[to]);
  });
});

function expectValidTopologicalOrder(n: number, edges: readonly (readonly [number, number])[], order: readonly number[]): void {
  expect([...order].sort((left, right) => left - right)).toEqual(Array.from({ length: n }, (_, index) => index + 1));
  const positions = new Map(order.map((vertex, index) => [vertex, index]));
  for (const [from, to] of edges) expect(positions.get(from)!).toBeLessThan(positions.get(to)!);
}

describe("kahnTopologicalOrder", () => {
  it("emits the locked FIFO order for the official sample", () => {
    const result = kahnTopologicalOrder(SCHEDULE_SAMPLE.n, SCHEDULE_SAMPLE.edges);
    expect(result).toMatchObject({ acyclic: true, order: [3, 4, 1, 5, 2] });
    expectValidTopologicalOrder(SCHEDULE_SAMPLE.n, SCHEDULE_SAMPLE.edges, result.order);
  });

  it("accepts a DAG with several valid orders", () => {
    const result = kahnTopologicalOrder(SCHEDULE_MULTIPLE.n, SCHEDULE_MULTIPLE.edges);
    expect(result.acyclic).toBe(true);
    expectValidTopologicalOrder(SCHEDULE_MULTIPLE.n, SCHEDULE_MULTIPLE.edges, result.order);
  });

  it("returns no partial order for a cycle", () => {
    expect(kahnTopologicalOrder(SCHEDULE_CYCLE.n, SCHEDULE_CYCLE.edges)).toMatchObject({ acyclic: false, order: [] });
  });
});

describe("dijkstra", () => {
  it("handles parallel flights in the official sample", () => {
    expect(dijkstra(ROUTES_SAMPLE.n, ROUTES_SAMPLE.edges, 1).distances.slice(1)).toEqual([0, 5, 2]);
  });

  it("prefers the cheaper detour", () => {
    expect(dijkstra(ROUTES_DETOUR.n, ROUTES_DETOUR.edges, 1).distances.slice(1)).toEqual([0, 3, 1]);
  });

  it("records exactly one stale pop", () => {
    const result = dijkstra(ROUTES_STALE.n, ROUTES_STALE.edges, 1);
    expect(result.distances.slice(1)).toEqual([0, 2, 1, 3]);
    expect(result.staleCount).toBe(1);
    expect(result.steps).toContainEqual(expect.objectContaining({ kind: "stale", vertex: 2 }));
  });
});
