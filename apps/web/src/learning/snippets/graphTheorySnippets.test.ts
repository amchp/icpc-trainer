import { describe, expect, it } from "vitest";

import { graphTheorySnippetsEn } from "./graphTheorySnippets.en.js";
import { graphTheorySnippetsEs } from "./graphTheorySnippets.es.js";
import { getGraphTheorySnippets } from "./graphTheorySnippets.js";

const snippetKeys = ["gridDfs", "gridBfs", "bipartiteDfs", "kahn", "dijkstra"] as const;

describe("Graph Theory snippets", () => {
  it("keeps the English and Spanish snippets line-aligned", () => {
    expect(Object.keys(graphTheorySnippetsEs)).toEqual(Object.keys(graphTheorySnippetsEn));
    for (const key of snippetKeys) {
      expect(graphTheorySnippetsEs[key].split("\n")).toHaveLength(graphTheorySnippetsEn[key].split("\n").length);
    }
  });

  it("contains focused helpers rather than complete submissions", () => {
    for (const snippets of [graphTheorySnippetsEn, graphTheorySnippetsEs]) {
      for (const key of snippetKeys) {
        expect(snippets[key]).not.toMatch(/\bint\s+main\b|\bcin\b|\bcout\b|\bscanf\b|\bprintf\b/);
      }
    }
  });

  it("keeps DFS and BFS reusable over adjacency lists", () => {
    for (const snippets of [graphTheorySnippetsEn, graphTheorySnippetsEs]) {
      for (const key of ["gridDfs", "gridBfs"] as const) {
        expect(snippets[key]).toContain("vector<vector<int>> adjacency");
        expect(snippets[key]).not.toContain("grid[");
      }
    }
  });

  it("uses wide distances and a min-priority queue for Dijkstra", () => {
    expect(graphTheorySnippetsEn.dijkstra).toContain("long long");
    expect(graphTheorySnippetsEn.dijkstra).toContain("greater<>");
  });

  it("keeps the general traversal snippets within one normal-height code panel", () => {
    expect(graphTheorySnippetsEn.gridBfs).toContain("parent[next] = vertex");
    expect(graphTheorySnippetsEs.gridBfs).toContain("parent[next] = vertex");
    expect(graphTheorySnippetsEn.gridBfs.split("\n").length).toBeLessThanOrEqual(19);
    expect(graphTheorySnippetsEn.dijkstra.split("\n").length).toBeLessThanOrEqual(19);
  });

  it("selects Spanish locale variants", () => {
    expect(getGraphTheorySnippets("es-CO")).toBe(graphTheorySnippetsEs);
    expect(getGraphTheorySnippets("en-US")).toBe(graphTheorySnippetsEn);
  });
});
