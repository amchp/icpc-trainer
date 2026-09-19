import type { ComponentType } from "react";

import type { AnimationGroupId } from "./catalog.js";

// Guide bundles and their locale resources load only when a workspace opens.
export const animationLoaders: Record<AnimationGroupId, () => Promise<{ default: ComponentType }>> = {
  "conditionals": () => import("./adapters/fundamentals.js").then((module) => ({ default: module.Conditionals })),
  "loops": () => import("./adapters/fundamentals.js").then((module) => ({ default: module.Loops })),
  "vector-traversal": () => import("./adapters/fundamentals.js").then((module) => ({ default: module.VectorTraversal })),
  "function-calls": () => import("./adapters/fundamentals.js").then((module) => ({ default: module.FunctionCalls })),
  "recursion": () => import("./adapters/fundamentals.js").then((module) => ({ default: module.Recursion })),
  "fibonacci-recursion-tree": () => import("./adapters/complexity.js").then((module) => ({ default: module.FibonacciRecursionTree })),
  "vectors": () => import("./adapters/dataStructures.js").then((module) => ({ default: module.Vectors })),
  "stacks": () => import("./adapters/dataStructures.js").then((module) => ({ default: module.Stacks })),
  "queues": () => import("./adapters/dataStructures.js").then((module) => ({ default: module.Queues })),
  "sets": () => import("./adapters/dataStructures.js").then((module) => ({ default: module.Sets })),
  "maps": () => import("./adapters/dataStructures.js").then((module) => ({ default: module.Maps })),
  "structs": () => import("./adapters/dataStructures.js").then((module) => ({ default: module.Structs })),
  "permutations": () => import("./adapters/bruteForce.js").then((module) => ({ default: module.Permutations })),
  "subsets": () => import("./adapters/bruteForce.js").then((module) => ({ default: module.Subsets })),
  "binary-search-comparison": () => import("./adapters/binarySearch.js").then((module) => ({ default: module.BinarySearchComparison })),
  "monotone-condition-pattern": () => import("./adapters/binarySearch.js").then((module) => ({ default: module.MonotoneConditionPattern })),
  "first-occurrence-trace": () => import("./adapters/binarySearch.js").then((module) => ({ default: module.FirstOccurrenceTrace })),
  "closest-value-trace": () => import("./adapters/binarySearch.js").then((module) => ({ default: module.ClosestValueTrace })),
  "numeric-binary-search-trace": () => import("./adapters/binarySearch.js").then((module) => ({ default: module.NumericBinarySearchTrace })),
  "first-true-boundary-trace": () => import("./adapters/binarySearch.js").then((module) => ({ default: module.FirstTrueBoundaryTrace })),
  "last-true-boundary-trace": () => import("./adapters/binarySearch.js").then((module) => ({ default: module.LastTrueBoundaryTrace })),
  "coin-change": () => import("./adapters/greedy.js").then((module) => ({ default: module.CoinChange })),
  "activity-selection": () => import("./adapters/greedy.js").then((module) => ({ default: module.ActivitySelection })),
  "largest-first-selection": () => import("./adapters/greedy.js").then((module) => ({ default: module.LargestFirstSelection })),
  "subsequence-scanner": () => import("./adapters/greedy.js").then((module) => ({ default: module.SubsequenceScanner })),
  "sign-block-selection": () => import("./adapters/greedy.js").then((module) => ({ default: module.SignBlockSelection })),
  "dfs": () => import("./adapters/graphs.js").then((module) => ({ default: module.Dfs })),
  "bfs": () => import("./adapters/graphs.js").then((module) => ({ default: module.Bfs })),
  "bipartite-dfs": () => import("./adapters/graphs.js").then((module) => ({ default: module.BipartiteDfs })),
  "topological-sort": () => import("./adapters/graphs.js").then((module) => ({ default: module.TopologicalSort })),
  "dijkstra": () => import("./adapters/graphs.js").then((module) => ({ default: module.Dijkstra }))
};
