import { cleanup, render, within } from "@testing-library/react";
import type { ReactNode } from "react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { i18n } from "../../i18n/i18n.js";
import { animationLoaders } from "../loaders.js";

// Isolate the adapter contract while rendering the actual retained tools.
vi.mock("../AnimationToolSection.js", () => ({
  AnimationToolSection: ({ toolId, children }: { toolId: string; children: ReactNode }) =>
    <section data-animation-tool={toolId}>{children}</section>
}));

const inventory = {
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
  dijkstra: ["edge-relaxation", "dijkstra-traversal"]
} as const;

beforeEach(() => {
  vi.stubGlobal("matchMedia", vi.fn(() => ({ matches: false, addEventListener: vi.fn(), removeEventListener: vi.fn() })));
});

afterEach(async () => {
  cleanup();
  vi.unstubAllGlobals();
  await i18n.changeLanguage("en");
});

describe("animation group adapters", () => {
  it("provides exactly the approved 31 group loaders and 44 unique members", () => {
    expect(Object.keys(animationLoaders).sort()).toEqual(Object.keys(inventory).sort());
    expect(Object.keys(animationLoaders)).toHaveLength(31);
    expect(new Set(Object.values(inventory).flat()).size).toBe(44);
  });

  describe.each(["en", "es"])("%s", (locale) => {
    it.each(Object.keys(inventory) as (keyof typeof inventory)[])("renders %s members in lesson order with existing controls", async (groupId) => {
      await i18n.changeLanguage(locale);
      const { default: Group } = await animationLoaders[groupId]();
      const { container } = render(<Group />);
      const sections = [...container.querySelectorAll<HTMLElement>("[data-animation-tool]")];
      expect(sections.map((section) => section.dataset.animationTool)).toEqual(inventory[groupId]);
      for (const section of sections) {
        expect(within(section).getAllByRole("button").length).toBeGreaterThan(0);
        expect(section).not.toHaveTextContent(/\b(?:trace|simulator|tool|animation|problemFirst)\.[A-Za-z]+\./);
      }
    });
  });
});
