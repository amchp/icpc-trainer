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

  it("provides localized examples for reading words and complete lines", () => {
    const english = getProgrammingFundamentalsSnippets("en");
    const spanish = getProgrammingFundamentalsSnippets("es");

    expect(english.inputOutput.word).toContain("cin >> name");
    expect(english.inputOutput.line).toContain("getline(cin, message)");
    expect(english.inputOutput.questions.fullLine).toContain("getline(cin, name)");
    expect(english.inputOutput.questions.oneWord).toContain("cin >> name");
    expect(english.inputOutput.questions.mixedLine).toContain("getline(cin >> ws, team)");
    expect(english.inputOutput.questions.reorderNames).toContain("cin >> first_name >> last_name");
    expect(spanish.inputOutput.word).toContain("cin >> nombre");
    expect(spanish.inputOutput.line).toContain("getline(cin, mensaje)");
    expect(spanish.inputOutput.questions.fullLine).toContain("getline(cin, nombre)");
    expect(spanish.inputOutput.questions.oneWord).toContain("cin >> nombre");
    expect(spanish.inputOutput.questions.mixedLine).toContain("getline(cin >> ws, equipo)");
    expect(spanish.inputOutput.questions.reorderNames).toContain("cin >> nombre >> apellido");
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
