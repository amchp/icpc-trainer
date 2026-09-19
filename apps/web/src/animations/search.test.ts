import { describe, expect, it } from "vitest";
import { animations as en } from "../locales/en/animations.js";
import { animations as es } from "../locales/es/animations.js";
import { animationGroups, type AnimationTopic } from "./catalog.js";
import { normalizeAnimationSearch, searchAnimations, validateAnimationSearch } from "./search.js";

const ids = (query: string, topic?: AnimationTopic, locale = "en") =>
  searchAnimations(animationGroups, query, topic, locale).map(({ id }) => id);

describe("animation search", () => {
  it.each(["Recursive permutations", "Iterative permutations", "permutaciones recursivas", "permutaciones iterativas"])("returns a single shared group for %s", (query) => {
    expect(ids(query)).toEqual(["permutations"]);
    expect(ids(query, undefined, "es")).toEqual(["permutations"]);
  });

  it("normalizes accents, punctuation, case and whitespace in both languages", () => {
    expect(normalizeAnimationSearch("  BÚSQUEDA...en__ANCHURA!  ")).toBe("busqueda en anchura");
    expect(ids("  BÚSQUEDA...en__ANCHURA!  ")).toEqual(["bfs"]);
    expect(ids("breadth-FIRST search", undefined, "es")).toEqual(["bfs"]);
    expect(ids("BFS")).toEqual(["bfs"]);
    expect(ids("Dijkstra", undefined, "es")).toEqual(["dijkstra"]);
    expect(ids("búsqueda en profundidad")).toEqual(["dfs"]);
  });

  it("requires all tokens across member/group fields and intersects with topic", () => {
    expect(ids("recursive iterative")).toEqual(["permutations"]);
    expect(ids("BFS gráficos missing")).toEqual([]);
    expect(ids("BFS", "graphs")).toEqual(["bfs"]);
    expect(ids("BFS", "greedy")).toEqual([]);
    expect(ids("", "complexity")).toEqual(["fibonacci-recursion-tree"]);
    expect(ids("estructuras de datos")).toHaveLength(6);
  });

  it("searches every bilingual member title while emitting its group once", () => {
    for (const group of animationGroups) {
      for (const tool of group.tools) {
        for (const catalog of [en, es]) {
          const results = ids(catalog.tools[tool.id].title);
          expect(results).toContain(group.id);
          expect(results.filter((id) => id === group.id)).toHaveLength(1);
        }
      }
    }
    expect(searchAnimations([...animationGroups, ...animationGroups], "", undefined, "en")).toHaveLength(31);
  });

  it("returns all groups for empty text, sorted by the active localized title", () => {
    for (const [locale, catalog] of [["en", en], ["es", es]] as const) {
      const result = searchAnimations(animationGroups, "", undefined, locale);
      const expected = [...animationGroups].sort((a, b) =>
        catalog.groups[a.id].title.localeCompare(catalog.groups[b.id].title, locale) || a.id.localeCompare(b.id));
      expect(result).toEqual(expected);
      expect(result).toHaveLength(31);
    }
    expect(ids("", undefined, "es")).not.toEqual(ids(""));
    expect(ids("nonsense impossible query")).toEqual([]);
  });

  it("uses stable IDs to break equal localized titles", () => {
    const previous = en.groups.loops.title;
    Object.assign(en.groups.loops, { title: en.groups.conditionals.title });
    try {
      expect(searchAnimations([...animationGroups].reverse(), "", "fundamentals", "en")
        .filter(({ id }) => id === "loops" || id === "conditionals").map(({ id }) => id))
        .toEqual(["conditionals", "loops"]);
    } finally { Object.assign(en.groups.loops, { title: previous }); }
  });

  it.each(["traffic-light", "Counting Rooms", "Sudoku", "Magic Powder", "maze solution"])("does not index excluded application %s", (query) => {
    expect(ids(query)).toEqual([]);
  });
});

describe("animation URL validation", () => {
  it("trims and caps queries, retains valid topics and ignores unrelated fields", () => {
    expect(validateAnimationSearch({ q: "  BFS  ", topic: "graphs", presentation: true })).toEqual({ q: "BFS", topic: "graphs" });
    expect(validateAnimationSearch({ q: "a".repeat(250) }).q).toHaveLength(200);
  });

  it("omits empty queries, unknown topics and non-string URL values", () => {
    for (const q of [undefined, null, 123, true, [], {}, "   "]) {
      expect(validateAnimationSearch({ q, topic: "unknown" })).toEqual({});
    }
    for (const topic of [undefined, null, 123, ["graphs"], {}, "GRAPHS", ""]) {
      expect(validateAnimationSearch({ q: "  dfs ", topic })).toEqual({ q: "dfs" });
    }
  });
});
