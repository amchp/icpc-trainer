import type { TFunction } from "i18next";

import type { GuideTraceGridCell, GuideTraceVisual } from "../guideTrace.js";
import type { ScenarioFrame, ScenarioPreset } from "../ScenarioPlayer.js";

type DpT = TFunction<"dynamicProgramming">;
type Arc = "fibonacci" | "nonAdjacent" | "grid" | "knapsack" | "dag";

const FIBONACCI_FIXTURES = [7, 6] as const;
const NON_ADJACENT_FIXTURES = [[4, 1, 1, 9, 1], [2, 7, 9, 3, 1]] as const;
const GRID_FIXTURES = [["...", ".*.", "..."], ["....", ".**.", "....", "..*."]] as const;
const KNAPSACK_FIXTURES = [
  { weights: [2, 2, 2], values: [4, 6, 4], capacity: 4 },
  { weights: [1, 3, 3], values: [2, 7, 6], capacity: 5 }
] as const;
const DAG_FIXTURES = [
  { nodeCount: 6, edges: [[1, 6], [2, 3], [2, 6], [3, 4], [4, 5]] },
  { nodeCount: 6, edges: [[1, 2], [1, 3], [2, 4], [3, 4], [2, 5], [4, 6], [5, 6]] }
] as const satisfies readonly DagFixture[];

interface DagFixture {
  readonly nodeCount: number;
  readonly edges: readonly (readonly [number, number])[];
}

export function buildFibonacciScenarios(t: DpT): readonly ScenarioPreset[] {
  return FIBONACCI_FIXTURES.map((n, fixtureIndex) => {
    const memo = Array<number | null>(n + 1).fill(null);
    const stack: string[] = [];
    const frames: ScenarioFrame[] = [];
    const solve = (index: number): number => {
      const state = `F(${index})`;
      stack.push(state);
      frames.push(recursiveFrame(t, "enter", { state }, [stackVisual(t, stack), memoVector(t, memo, index)]));
      if (index <= 1) {
        frames.push({ narration: t("scenarios.fibonacci.base", { index, answer: index }), visuals: [stackVisual(t, stack), memoVector(t, memo, index)] });
        stack.pop();
        return index;
      }
      const cached = memo[index] ?? null;
      if (cached !== null) {
        frames.push(recursiveFrame(t, "memoHit", { state, answer: cached }, [stackVisual(t, stack), memoVector(t, memo, index)]));
        stack.pop();
        return cached;
      }
      const dependencies = `F(${index - 1}) + F(${index - 2})`;
      frames.push(recursiveFrame(t, "dependencies", { state, dependencies }, [stackVisual(t, stack), memoVector(t, memo, index), transitionVisual(t, dependencies)]));
      const answer = solve(index - 1) + solve(index - 2);
      memo[index] = answer;
      frames.push(recursiveFrame(t, "store", { state, answer }, [stackVisual(t, stack), memoVector(t, memo, index)]));
      stack.pop();
      return answer;
    };
    const answer = solve(n);
    frames.push(finalFrame(t, answer));
    return scenarioIdentity(t, "fibonacci", fixtureIndex, frames);
  });
}

export function buildNonAdjacentScenarios(t: DpT): readonly ScenarioPreset[] {
  return NON_ADJACENT_FIXTURES.map((input, fixtureIndex) => {
    const memo = Array<number | null>(input.length + 1).fill(null);
    const stack: string[] = [];
    const frames: ScenarioFrame[] = [];
    const solve = (count: number): number => {
      const state = `best(${Math.max(0, count)})`;
      stack.push(state);
      frames.push(recursiveFrame(t, "enter", { state }, [stackVisual(t, stack), inputVisual(t, input, count), memoVector(t, memo, Math.max(0, count))]));
      if (count <= 0) {
        frames.push({ narration: t("scenarios.nonAdjacent.base", { count }), visuals: [stackVisual(t, stack), inputVisual(t, input, count), memoVector(t, memo, 0)] });
        stack.pop();
        return 0;
      }
      const cached = memo[count] ?? null;
      if (cached !== null) {
        frames.push(recursiveFrame(t, "memoHit", { state, answer: cached }, [stackVisual(t, stack), inputVisual(t, input, count), memoVector(t, memo, count)]));
        stack.pop();
        return cached;
      }
      const skipState = `best(${count - 1})`;
      const takeState = `${input[count - 1]} + best(${Math.max(0, count - 2)})`;
      const dependencies = `${skipState} / ${takeState}`;
      frames.push(recursiveFrame(t, "dependencies", { state, dependencies }, [stackVisual(t, stack), inputVisual(t, input, count), memoVector(t, memo, count), transitionVisual(t, dependencies)]));
      const skip = solve(count - 1);
      const take = input[count - 1]! + solve(count - 2);
      const answer = Math.max(skip, take);
      memo[count] = answer;
      frames.push(recursiveFrame(t, "store", { state, answer }, [
        stackVisual(t, stack), inputVisual(t, input, count), memoVector(t, memo, count),
        { kind: "branch", label: t("scenarios.visuals.choice"), condition: `${t("scenarios.take")} ${take} / ${t("scenarios.skip")} ${skip}`, outcome: String(answer) }
      ]));
      stack.pop();
      return answer;
    };
    const answer = solve(input.length);
    frames.push(finalFrame(t, answer));
    return scenarioIdentity(t, "nonAdjacent", fixtureIndex, frames);
  });
}

export function buildGridScenarios(t: DpT): readonly ScenarioPreset[] {
  return GRID_FIXTURES.map((board, fixtureIndex) => {
    const size = board.length;
    const memo = Array.from({ length: size }, () => Array<number | null>(size).fill(null));
    const stack: string[] = [];
    const frames: ScenarioFrame[] = [];
    const solve = (row: number, column: number): number => {
      const state = `paths(${row}, ${column})`;
      stack.push(state);
      const inside = row >= 0 && column >= 0 && row < size && column < size;
      frames.push(recursiveFrame(t, "enter", { state }, [stackVisual(t, stack), ...(inside ? [memoGrid(t, board, memo, row, column)] : [])]));
      if (!inside) {
        frames.push({ narration: t("scenarios.grid.outside", { row, column }), visuals: [stackVisual(t, stack)] });
        stack.pop();
        return 0;
      }
      const cached = memo[row]![column] ?? null;
      if (cached !== null) {
        frames.push(recursiveFrame(t, "memoHit", { state, answer: cached }, [stackVisual(t, stack), memoGrid(t, board, memo, row, column)]));
        stack.pop();
        return cached;
      }
      if (board[row]![column] === "*") {
        memo[row]![column] = 0;
        frames.push({ narration: t("scenarios.grid.blocked", { row, column }), visuals: [stackVisual(t, stack), memoGrid(t, board, memo, row, column)] });
        stack.pop();
        return 0;
      }
      if (row === 0 && column === 0) {
        memo[row]![column] = 1;
        frames.push({ narration: t("scenarios.grid.start"), visuals: [stackVisual(t, stack), memoGrid(t, board, memo, row, column)] });
        stack.pop();
        return 1;
      }
      const dependencies = `paths(${row - 1}, ${column}) + paths(${row}, ${column - 1})`;
      frames.push(recursiveFrame(t, "dependencies", { state, dependencies }, [stackVisual(t, stack), memoGrid(t, board, memo, row, column), transitionVisual(t, dependencies)]));
      const answer = (solve(row - 1, column) + solve(row, column - 1)) % 1_000_000_007;
      memo[row]![column] = answer;
      frames.push(recursiveFrame(t, "store", { state, answer }, [stackVisual(t, stack), memoGrid(t, board, memo, row, column)]));
      stack.pop();
      return answer;
    };
    const answer = solve(size - 1, size - 1);
    frames.push(finalFrame(t, answer));
    return scenarioIdentity(t, "grid", fixtureIndex, frames);
  });
}

export function buildKnapsackScenarios(t: DpT): readonly ScenarioPreset[] {
  return KNAPSACK_FIXTURES.map((fixture, fixtureIndex) => {
    const memo = Array.from({ length: fixture.weights.length + 1 }, () => Array<number | null>(fixture.capacity + 1).fill(null));
    const stack: string[] = [];
    const frames: ScenarioFrame[] = [];
    const solve = (item: number, capacity: number): number => {
      const state = `best(${item}, ${capacity})`;
      stack.push(state);
      frames.push(recursiveFrame(t, "enter", { state }, [stackVisual(t, stack), memoTable(t, memo, item, capacity)]));
      if (item === 0) {
        frames.push({ narration: t("scenarios.knapsack.base", { state }), visuals: [stackVisual(t, stack), memoTable(t, memo, item, capacity)] });
        stack.pop();
        return 0;
      }
      const cached = memo[item]![capacity] ?? null;
      if (cached !== null) {
        frames.push(recursiveFrame(t, "memoHit", { state, answer: cached }, [stackVisual(t, stack), memoTable(t, memo, item, capacity)]));
        stack.pop();
        return cached;
      }
      const weight = fixture.weights[item - 1]!;
      const value = fixture.values[item - 1]!;
      const skipState = `best(${item - 1}, ${capacity})`;
      const takeState = weight <= capacity ? `${value} + best(${item - 1}, ${capacity - weight})` : "—";
      const dependencies = `${skipState} / ${takeState}`;
      frames.push(recursiveFrame(t, "dependencies", { state, dependencies }, [stackVisual(t, stack), memoTable(t, memo, item, capacity), transitionVisual(t, dependencies)]));
      const skip = solve(item - 1, capacity);
      const take = weight <= capacity ? value + solve(item - 1, capacity - weight) : Number.NEGATIVE_INFINITY;
      const answer = Math.max(skip, take);
      memo[item]![capacity] = answer;
      frames.push(recursiveFrame(t, "store", { state, answer }, [
        stackVisual(t, stack), memoTable(t, memo, item, capacity),
        { kind: "branch", label: t("scenarios.visuals.choice"), condition: `${t("scenarios.take")} ${Number.isFinite(take) ? take : "—"} / ${t("scenarios.skip")} ${skip}`, outcome: String(answer) }
      ]));
      stack.pop();
      return answer;
    };
    const answer = solve(fixture.weights.length, fixture.capacity);
    frames.push(finalFrame(t, answer));
    return scenarioIdentity(t, "knapsack", fixtureIndex, frames);
  });
}

export function buildDagScenarios(t: DpT): readonly ScenarioPreset[] {
  return DAG_FIXTURES.map((fixture, fixtureIndex) => {
    const predecessors = Array.from({ length: fixture.nodeCount + 1 }, () => [] as number[]);
    for (const [from, to] of fixture.edges) predecessors[to]!.push(from);
    const memo = Array<number | null>(fixture.nodeCount + 1).fill(null);
    const stack: string[] = [];
    const frames: ScenarioFrame[] = [];
    const solve = (node: number): number => {
      const state = `endingAt(${node})`;
      stack.push(state);
      frames.push(recursiveFrame(t, "enter", { state }, [dagVisual(t, fixture, memo, node), stackVisual(t, stack), distanceVisual(t, memo, node)]));
      const cached = memo[node] ?? null;
      if (cached !== null) {
        frames.push(recursiveFrame(t, "memoHit", { state, answer: cached }, [dagVisual(t, fixture, memo, node), stackVisual(t, stack), distanceVisual(t, memo, node)]));
        stack.pop();
        return cached;
      }
      const dependencies = predecessors[node]!;
      if (dependencies.length === 0) {
        memo[node] = 0;
        frames.push({ narration: t("scenarios.dag.base", { node }), visuals: [dagVisual(t, fixture, memo, node), stackVisual(t, stack), distanceVisual(t, memo, node)] });
        stack.pop();
        return 0;
      }
      const dependencyLabel = dependencies.map((previous) => `endingAt(${previous}) + 1`).join(" / ");
      frames.push(recursiveFrame(t, "dependencies", { state, dependencies: dependencyLabel }, [dagVisual(t, fixture, memo, node), stackVisual(t, stack), transitionVisual(t, dependencyLabel)]));
      let answer = 0;
      for (const previous of dependencies) answer = Math.max(answer, solve(previous) + 1);
      memo[node] = answer;
      frames.push(recursiveFrame(t, "store", { state, answer }, [dagVisual(t, fixture, memo, node), stackVisual(t, stack), distanceVisual(t, memo, node)]));
      stack.pop();
      return answer;
    };
    let answer = 0;
    for (let node = 1; node <= fixture.nodeCount; node += 1) {
      frames.push({ narration: t("scenarios.dag.inspect", { node }), visuals: [dagVisual(t, fixture, memo, node), distanceVisual(t, memo, node)] });
      answer = Math.max(answer, solve(node));
    }
    frames.push(finalFrame(t, answer));
    return scenarioIdentity(t, "dag", fixtureIndex, frames);
  });
}

function recursiveFrame(t: DpT, kind: "enter" | "dependencies" | "memoHit" | "store", values: Record<string, string | number>, visuals: readonly GuideTraceVisual[]): ScenarioFrame {
  const state = String(values.state ?? "");
  const answer = Number(values.answer ?? 0);
  const dependencies = String(values.dependencies ?? "");
  const narration = kind === "enter"
    ? t("scenarios.recursive.enter", { state })
    : kind === "dependencies"
      ? t("scenarios.recursive.dependencies", { state, dependencies })
      : kind === "memoHit"
        ? t("scenarios.recursive.memoHit", { state, answer })
        : t("scenarios.recursive.store", { state, answer });
  return { narration, visuals };
}

function finalFrame(t: DpT, answer: number): ScenarioFrame {
  return { narration: t("scenarios.recursive.final", { answer }), visuals: [{ kind: "output", label: t("scenarios.visuals.answer"), lines: [String(answer)] }] };
}

function scenarioIdentity(t: DpT, arc: Arc, fixtureIndex: number, frames: readonly ScenarioFrame[]): ScenarioPreset {
  const suffix = fixtureIndex === 0 ? "A" : "B";
  return { id: `${arc}-${suffix.toLowerCase()}`, label: t(`scenarios.preset${suffix}`), description: t(`scenarios.${arc}.description${suffix}`), frames };
}

function stackVisual(t: DpT, stack: readonly string[]): GuideTraceVisual {
  return { kind: "callStack", label: t("scenarios.visuals.callStack"), frames: stack.map((label) => ({ label })), activeIndex: stack.length - 1 };
}

function memoVector(t: DpT, memo: readonly (number | null)[], activeIndex: number): GuideTraceVisual {
  return { kind: "vector", label: t("scenarios.visuals.memo"), values: memo.map((value) => value ?? "·"), activeIndex };
}

function inputVisual(t: DpT, input: readonly number[], count: number): GuideTraceVisual {
  return { kind: "collection", label: t("scenarios.visuals.input"), layout: "row", values: input, ...(count > 0 ? { activeIndex: count - 1 } : {}) };
}

function transitionVisual(t: DpT, dependencies: string): GuideTraceVisual {
  return { kind: "branch", label: t("scenarios.visuals.transition"), condition: dependencies, outcome: "?" };
}

function memoGrid(t: DpT, board: readonly string[], memo: readonly (readonly (number | null)[])[], activeRow: number, activeColumn: number): GuideTraceVisual {
  const rows: GuideTraceGridCell[][] = board.map((line, row) => [...line].map((cell, column) => ({
    text: cell === "*" ? "*" : memo[row]![column] === null ? "·" : String(memo[row]![column]),
    tone: cell === "*" ? "wall" : row === activeRow && column === activeColumn ? "active" : memo[row]![column] === null ? "unvisited" : "visited"
  })));
  return { kind: "grid", label: t("scenarios.visuals.memo"), rows, cursor: { row: activeRow, column: activeColumn }, noteLabel: "memo" };
}

function memoTable(t: DpT, memo: readonly (readonly (number | null)[])[], activeItem: number, activeCapacity: number): GuideTraceVisual {
  return {
    kind: "grid", label: t("scenarios.visuals.memo"),
    rows: memo.map((row, item) => row.map((value, capacity) => ({ text: value === null ? "·" : String(value), tone: item === activeItem && capacity === activeCapacity ? "active" : value === null ? "unvisited" : "visited" }))),
    cursor: { row: activeItem, column: activeCapacity }, noteLabel: "memo"
  };
}

function distanceVisual(t: DpT, memo: readonly (number | null)[], activeNode: number): GuideTraceVisual {
  return { kind: "entries", label: t("scenarios.visuals.memo"), entries: memo.slice(1).map((value, index) => ({ key: index + 1, value: value ?? "·" })), activeIndex: activeNode - 1 };
}

function dagVisual(t: DpT, fixture: DagFixture, memo: readonly (number | null)[], activeNode: number): GuideTraceVisual {
  const positions = dagPositions(fixture.nodeCount);
  return {
    kind: "graph", label: t("scenarios.visuals.graph"), directed: true,
    nodes: Array.from({ length: fixture.nodeCount }, (_, index) => {
      const node = index + 1;
      const position = positions[node]!;
      return { id: String(node), label: String(node), x: position.x, y: position.y, tone: node === activeNode ? "active" : memo[node] === null ? "idle" : "settled", badge: `dp ${memo[node] ?? "·"}`, badgePlacement: position.y < 50 ? "above" : "below" };
    }),
    edges: fixture.edges.map(([from, to]) => ({ from: String(from), to: String(to), tone: "idle" }))
  };
}

function dagPositions(nodeCount: number): Record<number, { readonly x: number; readonly y: number }> {
  if (nodeCount === 6) return { 1: { x: 10, y: 50 }, 2: { x: 32, y: 27 }, 3: { x: 32, y: 73 }, 4: { x: 58, y: 27 }, 5: { x: 58, y: 73 }, 6: { x: 88, y: 50 } };
  return { 1: { x: 10, y: 50 }, 2: { x: 32, y: 25 }, 3: { x: 32, y: 75 }, 4: { x: 62, y: 50 }, 5: { x: 90, y: 50 } };
}
