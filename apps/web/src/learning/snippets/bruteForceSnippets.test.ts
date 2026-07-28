import { describe, expect, it } from "vitest";

import { getBruteForceSnippets } from "./bruteForceSnippets.js";

describe("brute-force snippets", () => {
  it("returns complete localized fragment sets without full programs", () => {
    const english = getBruteForceSnippets("en-US");
    const spanish = getBruteForceSnippets("es");

    expect(english.recursivePermutation).toContain("current.push_back");
    expect(english.recursivePermutation).toContain("current.pop_back");
    expect(spanish.recursivePermutation).toContain("actual.push_back");
    expect(spanish.recursivePermutation).toContain("actual.pop_back");
    expect(english.bitmaskSubset).toContain("mask");
    expect(spanish.bitmaskSubset).toContain("mascara");
    expect(english.recursiveSubset).toContain("decisions.push_back(0)");
    expect(english.recursiveSubset).toContain("decisions.push_back(1)");
    expect(spanish.recursiveSubset).toContain("decisiones.push_back(0)");
    expect(spanish.recursiveSubset).toContain("decisiones.push_back(1)");
    expect(english.bitmaskSubset).toContain("(mask & (1 << bit)) != 0");
    expect(spanish.bitmaskSubset).toContain("(mascara & (1 << bit)) != 0");
    expect(english.bitmaskSubset).not.toContain("mask >> bit");
    expect(spanish.bitmaskSubset).not.toContain("mascara >> bit");
    expect(english.recursiveSubset).not.toContain("sum");
    expect(spanish.recursiveSubset).not.toContain("suma");
    for (const snippets of [english, spanish]) {
      expect(Object.values(snippets).join("\n")).not.toContain("#include");
      expect(Object.values(snippets).join("\n")).not.toMatch(/\bint main\s*\(/);
    }
  });
});
