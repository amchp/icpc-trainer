import { describe, expect, it } from "vitest";

import { getTimeComplexitySnippets } from "./timeComplexitySnippets.js";

describe("time complexity snippets", () => {
  it("provides typed bilingual pair, copied-sort, and hash implementations", () => {
    const english = getTimeComplexitySnippets("en-US");
    const spanish = getTimeComplexitySnippets("es");

    expect(english.countTrace).toContain("j = i + 1");
    expect(english.countTrace).toContain("count this comparison");
    expect(english.pairScan).toContain("j = i + 1");
    expect(english.sortCopy).toContain("sorted_manifest = manifest");
    expect(english.hashSet).toContain("unordered_set<long long>");
    expect(spanish.pairScan).toContain("salida temprana");
    expect(spanish.countTrace).toContain("cuenta esta comparación");
    expect(spanish.sortCopy).toContain("conserva el orden de llegada");
    expect(spanish.hashSet).toContain("id_rastreo");
  });
});
