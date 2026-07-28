import { describe, expect, it } from "vitest";

import { getTimeComplexitySnippets } from "./timeComplexitySnippets.js";

describe("time complexity snippets", () => {
  it("provides typed bilingual linear, sorted-index, and hash-index implementations", () => {
    const english = getTimeComplexitySnippets("en-US");
    const spanish = getTimeComplexitySnippets("es");

    expect(english.countTrace).toContain("searches");
    expect(english.countTrace).toContain("count this comparison");
    expect(english.pairScan).toContain("user_exists_linear");
    expect(english.sortCopy).toContain("binary_search");
    expect(english.hashSet).toContain("unordered_set<long long>");
    expect(spanish.pairScan).toContain("buscar_usuario_lineal");
    expect(spanish.countTrace).toContain("cuenta esta comparación");
    expect(spanish.sortCopy).toContain("binary_search");
    expect(spanish.hashSet).toContain("indice_usuarios");
    expect(english.loopTricks.doubling).toContain("i *= 2");
    expect(spanish.loopTricks.doubling).toContain("i *= 2");
    expect(english.recursionTricks.branching).toContain("fibonacci(n - 2)");
    expect(spanish.recursionTricks.branching).toContain("fibonacci(n - 2)");
    expect(english.answerExamples.memoryInput).toContain("source_users(n)");
    expect(spanish.answerExamples.memoryInput).toContain("usuarios_fuente(n)");
  });
});
