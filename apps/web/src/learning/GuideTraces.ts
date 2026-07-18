import type { TFunction } from "i18next";
import { useMemo } from "react";
import { useTranslation } from "react-i18next";

import { defineGuideTrace } from "./guideTrace.js";

const conditionalCpp = `if (esta_lloviendo) {
  cout << "Lleva paraguas";
} else if (esta_nevando) {
  cout << "No salgas";
} else {
  cout << "Sal tranquilo";
}`;

const forLoopCpp = `for (int i = 1; i <= 5; ++i) {
  cout << i << ' ';
}
// imprime: 1 2 3 4 5`;

const whileLoopCpp = `int restantes = 3;
while (restantes > 0) {
  cout << restantes << ' ';
  --restantes;
}
// imprime: 3 2 1`;

const functionCpp = `int sumar(int x, int y) {
  int resultado = x + y;
  return resultado;
}

int total = sumar(7, 3); // 10`;

const vectorCpp = `vector<int> valores = {1, 2, 3};
valores.push_back(4);

for (int i = 0; i < valores.size(); ++i) {
  if (i == 2) continue;
  cout << valores[i] << ' ';
}
// imprime: 1 2 4`;

const recursionCpp = `int factorial(int x) {
  if (x == 1) return 1;
  return x * factorial(x - 1);
}`;

type GuideT = TFunction<"programmingFundamentals">;

export function useProgrammingFundamentalsTraces() {
  const { t, i18n } = useTranslation("programmingFundamentals");
  return useMemo(() => createProgrammingFundamentalsTraces(t), [i18n.language, t]);
}

export function createProgrammingFundamentalsTraces(t: GuideT) {
  const outputLabel = t("trace.visuals.output");
  const branchLabel = t("trace.visuals.branch");
  const vectorLabel = t("trace.visuals.vector");
  const callStackLabel = t("trace.visuals.callStack");

  const conditionals = defineGuideTrace({
    code: conditionalCpp,
    language: "cpp",
    label: t("trace.conditionals.label"),
    inputs: {
      rain: { kind: "boolean", label: t("trace.conditionals.rain"), defaultValue: false },
      snow: { kind: "boolean", label: t("trace.conditionals.snow"), defaultValue: false }
    },
    build: ({ rain, snow }, recorder) => {
      const variables = [
        { name: "esta_lloviendo", typeLabel: "bool", value: rain },
        { name: "esta_nevando", typeLabel: "bool", value: snow }
      ] as const;
      recorder.frame({ line: 1, narration: t("trace.conditionals.checkRain"), variables });
      if (rain) {
        recorder.frame({
          line: 2,
          narration: t("trace.conditionals.rainBranch"),
          variables,
          visuals: [{ kind: "branch", label: branchLabel, condition: "esta_lloviendo", outcome: t("trace.conditionals.rainOutcome") }]
        });
        return;
      }
      recorder.frame({ line: 3, narration: t("trace.conditionals.checkSnow"), variables });
      if (snow) {
        recorder.frame({
          line: 4,
          narration: t("trace.conditionals.snowBranch"),
          variables,
          visuals: [{ kind: "branch", label: branchLabel, condition: "esta_nevando", outcome: t("trace.conditionals.snowOutcome") }]
        });
        return;
      }
      recorder.frame({
        line: 6,
        narration: t("trace.conditionals.elseBranch"),
        variables,
        visuals: [{ kind: "branch", label: branchLabel, condition: "else", outcome: t("trace.conditionals.elseOutcome") }]
      });
    }
  });

  const forLoop = defineGuideTrace({
    code: forLoopCpp,
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
    code: whileLoopCpp,
    language: "cpp",
    label: t("trace.whileLoop.label"),
    inputs: {},
    build: (_inputs, recorder) => {
      let remaining = 3;
      const output: string[] = [];
      recorder.frame({ line: 1, narration: t("trace.whileLoop.initialize"), variables: [{ name: "restantes", typeLabel: "int", value: remaining }] });
      while (remaining > 0) {
        recorder.frame({ line: 2, narration: t("trace.whileLoop.check", { remaining }), variables: [{ name: "restantes", typeLabel: "int", value: remaining }], visuals: [{ kind: "output", label: outputLabel, lines: output }] });
        output.push(String(remaining));
        recorder.frame({ line: 3, narration: t("trace.whileLoop.print", { remaining }), variables: [{ name: "restantes", typeLabel: "int", value: remaining }], visuals: [{ kind: "output", label: outputLabel, lines: output }] });
        remaining -= 1;
        recorder.frame({ line: 4, narration: t("trace.whileLoop.decrement", { remaining }), variables: [{ name: "restantes", typeLabel: "int", value: remaining }], visuals: [{ kind: "output", label: outputLabel, lines: output }] });
      }
      recorder.frame({ line: 2, narration: t("trace.whileLoop.exit"), variables: [{ name: "restantes", typeLabel: "int", value: remaining }], visuals: [{ kind: "output", label: outputLabel, lines: output }] });
    }
  });

  const functionCall = defineGuideTrace({
    code: functionCpp,
    language: "cpp",
    label: t("trace.functionCall.label"),
    inputs: {},
    build: (_inputs, recorder) => {
      recorder.frame({ line: 6, narration: t("trace.functionCall.call"), visuals: [{ kind: "callStack", label: callStackLabel, frames: [{ label: "main", detail: "sumar(7, 3)" }], activeIndex: 0 }] });
      recorder.frame({ line: 1, narration: t("trace.functionCall.bind"), variables: [{ name: "x", typeLabel: "int", value: 7 }, { name: "y", typeLabel: "int", value: 3 }], visuals: [{ kind: "callStack", label: callStackLabel, frames: [{ label: "main", detail: "total = ?" }, { label: "sumar", detail: "x = 7, y = 3" }], activeIndex: 1 }] });
      recorder.frame({ line: 2, narration: t("trace.functionCall.calculate"), variables: [{ name: "x", typeLabel: "int", value: 7 }, { name: "y", typeLabel: "int", value: 3 }, { name: "resultado", typeLabel: "int", value: 10 }], visuals: [{ kind: "callStack", label: callStackLabel, frames: [{ label: "main", detail: "total = ?" }, { label: "sumar", detail: "resultado = 10" }], activeIndex: 1 }] });
      recorder.frame({ line: 3, narration: t("trace.functionCall.return"), variables: [{ name: "resultado", typeLabel: "int", value: 10 }], visuals: [{ kind: "callStack", label: callStackLabel, frames: [{ label: "main", detail: "total = ?" }, { label: "sumar", detail: "return 10" }], activeIndex: 1 }] });
      recorder.frame({ line: 6, narration: t("trace.functionCall.assign"), variables: [{ name: "total", typeLabel: "int", value: 10 }], visuals: [{ kind: "callStack", label: callStackLabel, frames: [{ label: "main", detail: "total = 10" }], activeIndex: 0 }] });
    }
  });

  const vectorTraversal = defineGuideTrace({
    code: vectorCpp,
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
        recorder.frame({ line: 5, narration: t("trace.vectorTraversal.continueCheck", { i }), variables: [{ name: "i", typeLabel: "int", value: i }], visuals });
        if (i === 2) {
          recorder.frame({ line: 5, narration: t("trace.vectorTraversal.skip"), variables: [{ name: "i", typeLabel: "int", value: i }], visuals });
          continue;
        }
        const activeValue = values[i]!;
        output.push(String(activeValue));
        recorder.frame({ line: 6, narration: t("trace.vectorTraversal.print", { value: activeValue }), variables: [{ name: "i", typeLabel: "int", value: i }], visuals: [{ kind: "vector", label: vectorLabel, values, activeIndex: i }, { kind: "output", label: outputLabel, lines: output }] });
      }
      recorder.frame({ line: 4, narration: t("trace.vectorTraversal.exit"), variables: [{ name: "i", typeLabel: "int", value: values.length }], visuals: [{ kind: "vector", label: vectorLabel, values }, { kind: "output", label: outputLabel, lines: output }] });
    }
  });

  const recursion = defineGuideTrace({
    code: recursionCpp,
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

  return { conditionals, forLoop, whileLoop, functionCall, vectorTraversal, recursion };
}
