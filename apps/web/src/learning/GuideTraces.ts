import type { TFunction } from "i18next";
import { useMemo } from "react";
import { useTranslation } from "react-i18next";

import { defineGuideTrace } from "./guideTrace.js";
import { getProgrammingFundamentalsSnippets } from "./snippets/programmingFundamentalsSnippets.js";

type GuideT = TFunction<"programmingFundamentals">;

export function useProgrammingFundamentalsTraces() {
  const { t, i18n } = useTranslation("programmingFundamentals");
  const language = i18n.resolvedLanguage ?? i18n.language;
  return useMemo(() => createProgrammingFundamentalsTraces(t, language), [language, t]);
}

export function createProgrammingFundamentalsTraces(t: GuideT, language = "en") {
  const snippets = getProgrammingFundamentalsSnippets(language);
  const outputLabel = t("trace.visuals.output");
  const branchLabel = t("trace.visuals.branch");
  const vectorLabel = t("trace.visuals.vector");
  const callStackLabel = t("trace.visuals.callStack");
  const countdownName = language.startsWith("es") ? "cuenta_regresiva" : "countdown";

  const conditionals = defineGuideTrace({
    code: snippets.conditionals.code,
    language: "cpp",
    label: t("trace.conditionals.label"),
    inputs: {
      accepted: { kind: "boolean", label: t("trace.conditionals.accepted"), defaultValue: false },
      hasStrategy: { kind: "boolean", label: t("trace.conditionals.hasStrategy"), defaultValue: true }
    },
    build: ({ accepted, hasStrategy }, recorder) => {
      const variables = [
        { name: snippets.conditionals.acceptedVariable, typeLabel: "bool", value: accepted },
        { name: snippets.conditionals.strategyVariable, typeLabel: "bool", value: hasStrategy }
      ] as const;
      recorder.frame({ line: 1, narration: t("trace.conditionals.checkAccepted"), variables });
      if (accepted) {
        recorder.frame({
          line: 2,
          narration: t("trace.conditionals.acceptedBranch"),
          variables,
          visuals: [{ kind: "branch", label: branchLabel, condition: snippets.conditionals.acceptedVariable, outcome: t("trace.conditionals.acceptedOutcome") }]
        });
        return;
      }
      recorder.frame({ line: 3, narration: t("trace.conditionals.checkStrategy"), variables });
      if (hasStrategy) {
        recorder.frame({
          line: 4,
          narration: t("trace.conditionals.strategyBranch"),
          variables,
          visuals: [{ kind: "branch", label: branchLabel, condition: snippets.conditionals.strategyVariable, outcome: t("trace.conditionals.strategyOutcome") }]
        });
        return;
      }
      recorder.frame({
        line: 6,
        narration: t("trace.conditionals.elseBranch"),
        variables,
        visuals: [{ kind: "branch", label: branchLabel, condition: "else", outcome: t("trace.conditionals.hintOutcome") }]
      });
    }
  });

  const forLoop = defineGuideTrace({
    code: snippets.forLoop.code,
    language: "cpp",
    label: t("trace.forLoop.label"),
    inputs: {},
    build: (_inputs, recorder) => {
      const output: string[] = [];
      recorder.frame({ line: 1, narration: t("trace.forLoop.initialize"), variables: [{ name: "i", typeLabel: "int", value: 1 }] });
      for (let i = 1; i <= 5; i += 1) {
        recorder.frame({ line: 1, narration: t("trace.forLoop.check", { i }), variables: [{ name: "i", typeLabel: "int", value: i }], visuals: [{ kind: "output", label: outputLabel, lines: output }] });
        output.push(String(i));
        recorder.frame({ line: 2, narration: t("trace.forLoop.print", { i }), variables: [{ name: "i", typeLabel: "int", value: i }], visuals: [{ kind: "output", label: outputLabel, lines: output }] });
        recorder.frame({ line: 1, narration: t("trace.forLoop.increment", { next: i + 1 }), variables: [{ name: "i", typeLabel: "int", value: i + 1 }], visuals: [{ kind: "output", label: outputLabel, lines: output }] });
      }
      recorder.frame({ line: 1, narration: t("trace.forLoop.exit"), variables: [{ name: "i", typeLabel: "int", value: 6 }], visuals: [{ kind: "output", label: outputLabel, lines: output }] });
    }
  });

  const whileLoop = defineGuideTrace({
    code: snippets.whileLoop.code,
    language: "cpp",
    label: t("trace.whileLoop.label"),
    inputs: {},
    build: (_inputs, recorder) => {
      let remaining = 3;
      const output: string[] = [];
      recorder.frame({ line: 1, narration: t("trace.whileLoop.initialize"), variables: [{ name: snippets.whileLoop.remainingVariable, typeLabel: "int", value: remaining }] });
      while (remaining > 0) {
        recorder.frame({ line: 2, narration: t("trace.whileLoop.check", { remaining }), variables: [{ name: snippets.whileLoop.remainingVariable, typeLabel: "int", value: remaining }], visuals: [{ kind: "output", label: outputLabel, lines: output }] });
        output.push(String(remaining));
        recorder.frame({ line: 3, narration: t("trace.whileLoop.print", { remaining }), variables: [{ name: snippets.whileLoop.remainingVariable, typeLabel: "int", value: remaining }], visuals: [{ kind: "output", label: outputLabel, lines: output }] });
        remaining -= 1;
        recorder.frame({ line: 4, narration: t("trace.whileLoop.decrement", { remaining }), variables: [{ name: snippets.whileLoop.remainingVariable, typeLabel: "int", value: remaining }], visuals: [{ kind: "output", label: outputLabel, lines: output }] });
      }
      recorder.frame({ line: 2, narration: t("trace.whileLoop.exit"), variables: [{ name: snippets.whileLoop.remainingVariable, typeLabel: "int", value: remaining }], visuals: [{ kind: "output", label: outputLabel, lines: output }] });
    }
  });

  const loopControl = defineGuideTrace({
    code: snippets.loopControl.code,
    language: "cpp",
    label: t("trace.loopControl.label"),
    inputs: {},
    build: (_inputs, recorder) => {
      const output: string[] = [];
      for (let i = 1; i <= 10; i += 1) {
        const variables = [{ name: "i", typeLabel: "int", value: i }] as const;
        const outputVisual = { kind: "output" as const, label: outputLabel, lines: output };
        recorder.frame({ line: 1, narration: t("trace.loopControl.checkLoop", { i }), variables, visuals: [outputVisual] });
        recorder.frame({ line: 2, narration: t("trace.loopControl.checkBreak", { i }), variables, visuals: [outputVisual] });
        if (i > 7) {
          recorder.frame({
            line: 2,
            narration: t("trace.loopControl.break"),
            variables,
            visuals: [
              { kind: "branch", label: branchLabel, condition: "i > 7", outcome: t("trace.loopControl.breakOutcome") },
              outputVisual
            ]
          });
          return;
        }
        recorder.frame({ line: 3, narration: t("trace.loopControl.checkContinue", { i }), variables, visuals: [outputVisual] });
        if (i % 2 === 0) {
          recorder.frame({
            line: 3,
            narration: t("trace.loopControl.continue"),
            variables,
            visuals: [
              { kind: "branch", label: branchLabel, condition: "i % 2 == 0", outcome: t("trace.loopControl.continueOutcome") },
              outputVisual
            ]
          });
          continue;
        }
        output.push(String(i));
        recorder.frame({ line: 4, narration: t("trace.loopControl.print", { i }), variables, visuals: [{ ...outputVisual, lines: output }] });
      }
    }
  });

  const functionCall = defineGuideTrace({
    code: snippets.functionCall.code,
    language: "cpp",
    label: t("trace.functionCall.label"),
    inputs: {},
    build: (_inputs, recorder) => {
      recorder.frame({ line: 6, narration: t("trace.functionCall.call"), visuals: [{ kind: "callStack", label: callStackLabel, frames: [{ label: "main", detail: `${snippets.functionCall.functionName}(7, 3)` }], activeIndex: 0 }] });
      recorder.frame({ line: 1, narration: t("trace.functionCall.bind"), variables: [{ name: "x", typeLabel: "int", value: 7 }, { name: "y", typeLabel: "int", value: 3 }], visuals: [{ kind: "callStack", label: callStackLabel, frames: [{ label: "main", detail: "total = ?" }, { label: snippets.functionCall.functionName, detail: "x = 7, y = 3" }], activeIndex: 1 }] });
      recorder.frame({ line: 2, narration: t("trace.functionCall.calculate"), variables: [{ name: "x", typeLabel: "int", value: 7 }, { name: "y", typeLabel: "int", value: 3 }, { name: snippets.functionCall.resultVariable, typeLabel: "int", value: 10 }], visuals: [{ kind: "callStack", label: callStackLabel, frames: [{ label: "main", detail: "total = ?" }, { label: snippets.functionCall.functionName, detail: `${snippets.functionCall.resultVariable} = 10` }], activeIndex: 1 }] });
      recorder.frame({ line: 3, narration: t("trace.functionCall.return"), variables: [{ name: snippets.functionCall.resultVariable, typeLabel: "int", value: 10 }], visuals: [{ kind: "callStack", label: callStackLabel, frames: [{ label: "main", detail: "total = ?" }, { label: snippets.functionCall.functionName, detail: "return 10" }], activeIndex: 1 }] });
      recorder.frame({ line: 6, narration: t("trace.functionCall.assign"), variables: [{ name: "total", typeLabel: "int", value: 10 }], visuals: [{ kind: "callStack", label: callStackLabel, frames: [{ label: "main", detail: "total = 10" }], activeIndex: 0 }] });
    }
  });

  const vectorTraversal = defineGuideTrace({
    code: snippets.vectorTraversal.code,
    language: "cpp",
    label: t("trace.vectorTraversal.label"),
    inputs: {},
    build: (_inputs, recorder) => {
      const values = [1, 2, 3];
      const output: string[] = [];
      recorder.frame({ line: 1, narration: t("trace.vectorTraversal.initialize"), visuals: [{ kind: "vector", label: vectorLabel, values }] });
      values.push(4);
      recorder.frame({ line: 2, narration: t("trace.vectorTraversal.append"), visuals: [{ kind: "vector", label: vectorLabel, values, activeIndex: 3 }] });
      for (let i = 0; i < values.length; i += 1) {
        const visuals = [{ kind: "vector" as const, label: vectorLabel, values, activeIndex: i }, { kind: "output" as const, label: outputLabel, lines: output }];
        recorder.frame({ line: 4, narration: t("trace.vectorTraversal.check", { i }), variables: [{ name: "i", typeLabel: "int", value: i }], visuals });
        const activeValue = values[i]!;
        output.push(String(activeValue));
        recorder.frame({ line: 5, narration: t("trace.vectorTraversal.print", { value: activeValue }), variables: [{ name: "i", typeLabel: "int", value: i }], visuals: [{ kind: "vector", label: vectorLabel, values, activeIndex: i }, { kind: "output", label: outputLabel, lines: output }] });
      }
      recorder.frame({ line: 4, narration: t("trace.vectorTraversal.exit"), variables: [{ name: "i", typeLabel: "int", value: values.length }], visuals: [{ kind: "vector", label: vectorLabel, values }, { kind: "output", label: outputLabel, lines: output }] });
    }
  });

  const recursion = defineGuideTrace({
    code: snippets.recursion.code,
    language: "cpp",
    label: t("trace.recursion.label"),
    inputs: {},
    build: (_inputs, recorder) => {
      const stack: Array<{ label: string; detail?: string }> = [];
      const snapshot = (activeIndex = stack.length - 1) => ({ kind: "callStack" as const, label: callStackLabel, frames: stack, activeIndex });
      const factorial = (x: number): number => {
        stack.push({ label: `factorial(${x})`, detail: `x = ${x}` });
        recorder.frame({ line: 1, narration: t("trace.recursion.call", { x }), variables: [{ name: "x", typeLabel: "int", value: x }], visuals: [snapshot()] });
        recorder.frame({ line: 2, narration: t("trace.recursion.check", { x }), variables: [{ name: "x", typeLabel: "int", value: x }], visuals: [snapshot()] });
        if (x === 1) {
          stack[stack.length - 1] = { label: "factorial(1)", detail: "return 1" };
          recorder.frame({ line: 2, narration: t("trace.recursion.base"), variables: [{ name: "x", typeLabel: "int", value: x }, { name: "return", typeLabel: "int", value: 1 }], visuals: [snapshot()] });
          stack.pop();
          return 1;
        }
        recorder.frame({ line: 3, narration: t("trace.recursion.descend", { next: x - 1 }), variables: [{ name: "x", typeLabel: "int", value: x }], visuals: [snapshot()] });
        const result = x * factorial(x - 1);
        stack[stack.length - 1] = { label: `factorial(${x})`, detail: `return ${result}` };
        recorder.frame({ line: 3, narration: t("trace.recursion.unwind", { x, result }), variables: [{ name: "x", typeLabel: "int", value: x }, { name: "return", typeLabel: "int", value: result }], visuals: [snapshot()] });
        stack.pop();
        return result;
      };
      factorial(4);
    }
  });

  const fibonacci = defineGuideTrace({
    code: snippets.recursionExamples.fibonacci,
    language: "cpp",
    label: t("trace.fibonacci.label"),
    inputs: {},
    build: (_inputs, recorder) => {
      const stack: Array<{ label: string; detail?: string }> = [{ label: "main", detail: "fibonacci(4)" }];
      const snapshot = (activeIndex = stack.length - 1) => ({ kind: "callStack" as const, label: callStackLabel, frames: stack, activeIndex });
      recorder.frame({ line: 6, narration: t("trace.fibonacci.start"), visuals: [snapshot(0)] });

      const calculateFibonacci = (n: number): number => {
        stack.push({ label: `fibonacci(${n})`, detail: `n = ${n}` });
        recorder.frame({ line: 1, narration: t("trace.fibonacci.enter", { n }), variables: [{ name: "n", typeLabel: "int", value: n }], visuals: [snapshot()] });
        recorder.frame({ line: 2, narration: t("trace.fibonacci.check", { n }), variables: [{ name: "n", typeLabel: "int", value: n }], visuals: [snapshot()] });
        if (n <= 1) {
          stack[stack.length - 1] = { label: `fibonacci(${n})`, detail: `return ${n}` };
          recorder.frame({ line: 2, narration: t("trace.fibonacci.base", { n }), variables: [{ name: "n", typeLabel: "int", value: n }, { name: "return", typeLabel: "int", value: n }], visuals: [snapshot()] });
          stack.pop();
          return n;
        }

        recorder.frame({ line: 3, narration: t("trace.fibonacci.firstCall", { next: n - 1 }), variables: [{ name: "n", typeLabel: "int", value: n }], visuals: [snapshot()] });
        const first = calculateFibonacci(n - 1);
        stack[stack.length - 1] = { label: `fibonacci(${n})`, detail: `left = ${first}` };
        recorder.frame({ line: 3, narration: t("trace.fibonacci.secondCall", { first, next: n - 2 }), variables: [{ name: "n", typeLabel: "int", value: n }, { name: "left", typeLabel: "int", value: first }], visuals: [snapshot()] });
        const second = calculateFibonacci(n - 2);
        const result = first + second;
        stack[stack.length - 1] = { label: `fibonacci(${n})`, detail: `return ${first} + ${second} = ${result}` };
        recorder.frame({
          line: 3,
          narration: t("trace.fibonacci.combine", { first, second, result }),
          variables: [
            { name: "n", typeLabel: "int", value: n },
            { name: "left", typeLabel: "int", value: first },
            { name: "right", typeLabel: "int", value: second },
            { name: "return", typeLabel: "int", value: result }
          ],
          visuals: [snapshot()]
        });
        stack.pop();
        return result;
      };

      const result = calculateFibonacci(4);
      stack[0] = { label: "main", detail: `fibonacci(4) = ${result}` };
      recorder.frame({
        line: 6,
        narration: t("trace.fibonacci.finish", { result }),
        variables: [{ name: "result", typeLabel: "int", value: result }],
        visuals: [snapshot(0), { kind: "output", label: outputLabel, lines: [String(result)] }]
      });
    }
  });

  const countdown = defineGuideTrace({
    code: snippets.recursionExamples.countdown,
    language: "cpp",
    label: t("trace.countdown.label"),
    inputs: {},
    build: (_inputs, recorder) => {
      const stack: Array<{ label: string; detail?: string }> = [{ label: "main", detail: `${countdownName}(3)` }];
      const printed: number[] = [];
      const snapshot = (activeIndex = stack.length - 1) => ({ kind: "callStack" as const, label: callStackLabel, frames: stack, activeIndex });
      const output = () => ({ kind: "output" as const, label: outputLabel, lines: [printed.join(" ")] });
      recorder.frame({ line: 7, narration: t("trace.countdown.start"), visuals: [snapshot(0), output()] });

      const runCountdown = (n: number): void => {
        stack.push({ label: `${countdownName}(${n})`, detail: `n = ${n}` });
        recorder.frame({ line: 1, narration: t("trace.countdown.enter", { n }), variables: [{ name: "n", typeLabel: "int", value: n }], visuals: [snapshot(), output()] });
        recorder.frame({ line: 2, narration: t("trace.countdown.check", { n }), variables: [{ name: "n", typeLabel: "int", value: n }], visuals: [snapshot(), output()] });
        if (n === 0) {
          stack[stack.length - 1] = { label: `${countdownName}(0)`, detail: "return" };
          recorder.frame({ line: 2, narration: t("trace.countdown.base"), variables: [{ name: "n", typeLabel: "int", value: n }], visuals: [snapshot(), output()] });
          stack.pop();
          return;
        }

        printed.push(n);
        recorder.frame({ line: 3, narration: t("trace.countdown.print", { n }), variables: [{ name: "n", typeLabel: "int", value: n }], visuals: [snapshot(), output()] });
        recorder.frame({ line: 4, narration: t("trace.countdown.descend", { next: n - 1 }), variables: [{ name: "n", typeLabel: "int", value: n }], visuals: [snapshot(), output()] });
        runCountdown(n - 1);
        stack[stack.length - 1] = { label: `${countdownName}(${n})`, detail: "complete" };
        recorder.frame({ line: 4, narration: t("trace.countdown.finishCall", { n }), variables: [{ name: "n", typeLabel: "int", value: n }], visuals: [snapshot(), output()] });
        stack.pop();
      };

      runCountdown(3);
      stack[0] = { label: "main", detail: `${countdownName}(3) complete` };
      recorder.frame({ line: 7, narration: t("trace.countdown.finish"), visuals: [snapshot(0), output()] });
    }
  });

  return { conditionals, forLoop, whileLoop, loopControl, functionCall, vectorTraversal, recursion, countdown, fibonacci };
}
