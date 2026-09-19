import { describe, expect, it } from "vitest";
import { animations as en } from "../locales/en/animations.js";
import { animations as es } from "../locales/es/animations.js";
import { ANIMATION_TOPICS, animationGroups, getAnimationGroup } from "./catalog.js";

// Independent inventory: accidental additions, removals, or regrouping must fail.
const expectedMembership = {
  conditionals: ["conditionals-trace"],
  loops: ["for-loop-trace", "while-loop-trace", "loop-control-trace"],
  "vector-traversal": ["vector-traversal-trace"],
  "function-calls": ["function-call-trace"],
  recursion: ["countdown-recursion", "recursion-trace", "fibonacci-recursion-trace"],
  "fibonacci-recursion-tree": ["fibonacci-recursion-tree"],
  vectors: ["vector-simulator", "vector-bounds-explorer"],
  stacks: ["stack-simulator"],
  queues: ["queue-simulator", "deque-simulator"],
  sets: ["set-simulator"],
  maps: ["map-simulator"],
  structs: ["struct-simulator"],
  permutations: ["recursive-permutations", "iterative-permutations"],
  subsets: ["recursive-subsets", "bitmask-subsets"],
  "binary-search-comparison": ["binary-search-comparison"],
  "monotone-condition-pattern": ["monotone-condition-pattern"],
  "first-occurrence-trace": ["first-occurrence-trace"],
  "closest-value-trace": ["closest-value-trace"],
  "numeric-binary-search-trace": ["numeric-binary-search-trace"],
  "first-true-boundary-trace": ["first-true-boundary-trace"],
  "last-true-boundary-trace": ["last-true-boundary-trace"],
  "coin-change": ["coin-change-walkthrough", "coin-change-counterexample"],
  "activity-selection": ["activity-selection-walkthrough"],
  "largest-first-selection": ["largest-first-selection"],
  "subsequence-scanner": ["subsequence-scanner"],
  "sign-block-selection": ["sign-block-selection"],
  dfs: ["graph-connectivity", "dfs-grid-traversal"],
  bfs: ["bfs-layers", "bfs-grid-traversal"],
  "bipartite-dfs": ["bipartite-dfs"],
  "topological-sort": ["graph-indegree", "kahn-topological-sort"],
  dijkstra: ["edge-relaxation", "dijkstra-traversal"],
};

describe("animation catalog", () => {
  it("contains precisely the approved 31 groups and 44 ordered members, each once", () => {
    expect(animationGroups).toHaveLength(31);
    expect(new Set(animationGroups.map(({ id }) => id)).size).toBe(31);
    expect(Object.fromEntries(animationGroups.map(({ id, tools }) => [id, tools.map((tool) => tool.id)])))
      .toEqual(expectedMembership);
    const members = animationGroups.flatMap(({ tools }) => tools.map(({ id }) => id));
    expect(members).toHaveLength(44);
    expect(new Set(members).size).toBe(44);
    expect(ANIMATION_TOPICS).toHaveLength(7);
    expect(new Set(animationGroups.map(({ topic }) => topic))).toEqual(new Set(ANIMATION_TOPICS));
  });

  it("provides bilingual metadata and the appropriate guide for every group and member", () => {
    const guidePaths = {
      fundamentals: "/resources/programming-fundamentals", complexity: "/resources/time-complexity",
      "data-structures": "/resources/data-structures", "brute-force": "/resources/brute-force",
      "binary-search": "/resources/binary-search", greedy: "/resources/greedy", graphs: "/resources/graph-theory",
    };
    for (const group of animationGroups) {
      expect(group.guidePath).toBe(guidePaths[group.topic]);
      for (const locale of [en, es]) {
        for (const value of Object.values(locale.groups[group.id])) expect(value.trim()).not.toBe("");
        for (const tool of group.tools) {
          for (const value of Object.values(locale.tools[tool.id])) expect(value.trim()).not.toBe("");
        }
      }
      for (const item of [group, ...group.tools]) {
        expect(item.titleKey).toContain(item.id);
        expect(item.descriptionKey).toContain(item.id);
        expect(item.explanationKey).toContain(item.id);
        expect(item.aliases.en.length).toBeGreaterThan(0);
        expect(item.aliases.es.length).toBeGreaterThan(0);
      }
    }
  });

  it("only resolves group IDs and excludes applications and traffic lights", () => {
    expect(getAnimationGroup("permutations")?.tools).toHaveLength(2);
    for (const id of ["recursive-permutations", "traffic-light", "simple-simulation", "sudoku", "maze", "counting-rooms", "dynamic-programming", "coin-change-lab", "first-bad-version", "magic-powder"]) {
      expect(getAnimationGroup(id)).toBeUndefined();
    }
  });
});
