import { describe, expect, it } from "vitest";

import { getProgrammingFundamentalsSnippets } from "./programmingFundamentalsSnippets.js";

describe("programming fundamentals snippets", () => {
  it("provides localized source, compile, and run examples", () => {
    const english = getProgrammingFundamentalsSnippets("en");
    const spanish = getProgrammingFundamentalsSnippets("es");

    expect(english.compilation.source).toContain("int main()");
    expect(english.compilation.source).toContain("#include <bits/stdc++.h>");
    expect(english.compilation.source).toContain("using namespace std;");
    expect(english.compilation.commands).toContain("g++ main.cpp");
    expect(english.compilation.commands).toContain("./program");
    expect(spanish.compilation.source).toContain("¡Hola, C++!");
    expect(spanish.compilation.commands).toContain("./programa");
  });

  it("covers varied loop updates, while loops, and empty for headers", () => {
    const snippets = getProgrammingFundamentalsSnippets("en");

    expect(snippets.iterationQuestions.doublingFor).toContain("i *= 2");
    expect(snippets.iterationQuestions.whileCountdown).toContain("while");
    expect(snippets.iterationQuestions.whileDoubling).toContain("value *= 2");
    expect(snippets.iterationQuestions.infiniteFor).toContain("for (;;)");
    expect(snippets.iterationQuestions.emptyForPart).toContain("int i = 3; ; --i");
  });

  it("covers vector access, mutation, ends, size, and traversal", () => {
    const snippets = getProgrammingFundamentalsSnippets("en");
    const operations = snippets.vectorOperations.code;

    for (const operation of ["[1]", "push_back", "pop_back", "front", "back", "size"]) {
      expect(operations).toContain(operation);
    }
    expect(snippets.vectorQuestions.sumTraversal).toContain("total += values[i]");
  });

  it("provides localized linear countdown and branching Fibonacci examples", () => {
    const english = getProgrammingFundamentalsSnippets("en");
    const spanish = getProgrammingFundamentalsSnippets("es");

    expect(english.recursionExamples.countdown).toContain("countdown(n - 1)");
    expect(english.recursionExamples.fibonacci).toContain("fibonacci(n - 1) + fibonacci(n - 2)");
    expect(spanish.recursionExamples.countdown).toContain("cuenta_regresiva(n - 1)");
    expect(spanish.recursionExamples.fibonacci).toContain("fibonacci(n - 1) + fibonacci(n - 2)");
  });

  it("contrasts an early return with equivalent helper-variable control flow", () => {
    const english = getProgrammingFundamentalsSnippets("en");
    const spanish = getProgrammingFundamentalsSnippets("es");

    expect(english.functionExamples.earlyReturn).toContain('if (score < 0) return "invalid";');
    expect(english.functionExamples.helperVariable).toContain("string result;");
    expect(english.functionExamples.helperVariable).toContain("return result;");
    expect(spanish.functionExamples.earlyReturn).toContain('return "invalido";');
    expect(spanish.functionExamples.helperVariable).toContain("string resultado;");
  });
});
