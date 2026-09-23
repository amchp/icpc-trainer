import type { AnimationGroupId } from "./catalog.js";

export type LessonExample = {
  readonly kind: "problem" | "concept" | "exploration" | "analysis";
  readonly diagram?: "graph" | "intervals" | "stack";
  readonly input: readonly string[];
  readonly output: readonly string[];
};

/** Small statement illustrations, independent of each player's editable/session state. */
export const lessonExamples = {
  conditionals: { kind: "concept", input: ["x = 3", "x > 0 ?"], output: ["3 > 0", "true ✓", "false ×"] },
  loops: { kind: "concept", input: ["i = 0", "i < 3"], output: ["i = 0", "i = 1", "i = 2", "i = 3 ✕"] },
  "vector-traversal": { kind: "problem", input: ["8", "3", "5"], output: ["0 → 8", "1 → 3", "2 → 5"] },
  "function-calls": { kind: "concept", input: ["3", "doubleValue(3)"], output: ["doubleValue(3)", "→ 6"] },
  recursion: { kind: "concept", input: ["3!", "3 × 2!", "2 × 1!"], output: ["1! = 1", "2! = 2", "3! = 6"] },
  "fibonacci-recursion-tree": { kind: "analysis", input: ["F(4)", "F(3) + F(2)"], output: ["F(2) + F(1)", "F(1) + F(0)", "F(2) × 2"] },
  vectors: { kind: "exploration", input: ["8", "3", "5"], output: ["8", "3", "5", "+ 9"] },
  stacks: { kind: "exploration", diagram: "stack", input: ["4", "7", "2"], output: ["top() → 4", "7", "2"] },
  queues: { kind: "exploration", input: ["12", "24", "36"], output: ["front() → 24", "36"] },
  sets: { kind: "exploration", input: ["3", "1", "3"], output: ["1", "3"] },
  maps: { kind: "exploration", input: ["1 → 10", "3 → 30"], output: ["1 → 15", "3 → 30"] },
  structs: { kind: "exploration", input: ["value = 5", "add(3)"], output: ["value = 8"] },
  permutations: { kind: "problem", input: ["A", "B", "C"], output: ["ABC", "ACB", "BAC", "BCA", "CAB", "CBA"] },
  subsets: { kind: "problem", input: ["A", "B"], output: ["∅", "{A}", "{B}", "{A, B}"] },
  "binary-search-comparison": { kind: "problem", input: ["2", "4", "7", "9", "12", "18", "25"], output: ["9 < 10", "10 ≤ 12", "index = 4"] },
  "monotone-condition-pattern": { kind: "concept", input: ["00011", "01010"], output: ["000 | 11 ✓", "01010 ✕"] },
  "first-occurrence-trace": { kind: "problem", input: ["1", "3", "3", "6"], output: ["1", "[3] ← index 1", "3", "6"] },
  "closest-value-trace": { kind: "problem", input: ["2", "4", "7", "9"], output: ["6 − 4 = 2", "7 − 6 = 1", "7 ✓"] },
  "numeric-binary-search-trace": { kind: "problem", input: ["x = 2", "y² = x"], output: ["1 < √2 < 2", "√2 ≈ 1.414"] },
  "first-true-boundary-trace": { kind: "problem", input: ["0", "0", "0", "1", "1", "1"], output: ["000 | 111", "position = 4"] },
  "last-true-boundary-trace": { kind: "problem", input: ["1", "1", "1", "1", "0", "0"], output: ["1111 | 00", "position = 4"] },
  "coin-change": { kind: "problem", input: ["1", "5", "10", "25", "50"], output: ["50", "10", "5", "1", "1", "1", "Σ = 68"] },
  "activity-selection": { kind: "problem", diagram: "intervals", input: ["A: 1–4", "B: 3–5", "C: 5–7"], output: ["A: 1–4 ✓", "B: 3–5 ✕", "C: 5–7 ✓"] },
  "largest-first-selection": { kind: "problem", input: ["2", "1", "2"], output: ["2 + 2 = 4", "4 > 1"] },
  "subsequence-scanner": { kind: "problem", input: ["ahhellllloou", "hello ?"], output: ["h", "e", "l", "l", "o", "✓"] },
  "sign-block-selection": { kind: "problem", input: ["1", "2", "3", "−1", "−2"], output: ["3", "−1", "Σ = 2"] },
  dfs: { kind: "problem", diagram: "graph", input: ["A", "B", "C", "D"], output: ["A ✓", "B ✓", "C ✓", "D ✓"] },
  bfs: { kind: "problem", diagram: "graph", input: ["A", "B", "C", "D"], output: ["A: 0", "B: 1", "C: 1", "D: 2"] },
  "bipartite-dfs": { kind: "problem", diagram: "graph", input: ["A", "B", "C", "D"], output: ["A: 1", "B: 2", "C: 2", "D: 1"] },
  "topological-sort": { kind: "problem", diagram: "graph", input: ["A", "B", "C", "D"], output: ["A #1", "B #2", "C #3", "D #4"] },
  dijkstra: { kind: "problem", diagram: "graph", input: ["A", "B", "C", "D"], output: ["A: 0", "B: 4", "C: 1", "D: 6"] },
} as const satisfies Record<AnimationGroupId, LessonExample>;
