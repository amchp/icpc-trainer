import { describe, expect, it } from "vitest";

import { i18n } from "../i18n/i18n.js";
import { runGuideTrace } from "./guideTrace.js";
import { createProgrammingFundamentalsTraces } from "./GuideTraces.js";

const traces = createProgrammingFundamentalsTraces(i18n.getFixedT("en", "programmingFundamentals"));
const spanishTraces = createProgrammingFundamentalsTraces(i18n.getFixedT("es", "programmingFundamentals"), "es");

describe("programming fundamentals traces", () => {
  it("loads localized source for every trace builder", () => {
    expect(traces.conditionals.code.split("\n")[0]).toContain("solution_accepted");
    expect(traces.forLoop.code.split("\n")[1]).toContain("cout << i");
    expect(traces.whileLoop.code.split("\n")[1]).toBe("while (remaining > 0) {");
    expect(traces.loopControl.code).toContain("if (i > 7) break");
    expect(traces.loopControl.code).toContain("continue");
    expect(traces.functionCall.code.split("\n")[5]).toContain("int total = add(7, 3)");
    expect(traces.vectorTraversal.code.split("\n")[4]).toContain("cout << values[i]");
    expect(traces.recursion.code.split("\n")[1]).toContain("if (x == 1) return 1");
    expect(traces.countdown.code).toContain("countdown(n - 1)");
    expect(traces.fibonacci.code).toContain("fibonacci(n - 1) + fibonacci(n - 2)");

    expect(spanishTraces.conditionals.code.split("\n")[0]).toContain("solucion_aceptada");
    expect(spanishTraces.whileLoop.code.split("\n")[1]).toBe("while (restantes > 0) {");
    expect(spanishTraces.loopControl.code).toContain("termina todo el ciclo");
    expect(spanishTraces.functionCall.code.split("\n")[5]).toContain("int total = sumar(7, 3)");
    expect(spanishTraces.countdown.code).toContain("cuenta_regresiva(n - 1)");
    const spanishCountdown = runGuideTrace(spanishTraces.countdown, {});
    expect(spanishCountdown.valid && spanishCountdown.frames[1]?.visuals?.[0]).toMatchObject({ frames: [{ label: "main" }, { label: "cuenta_regresiva(3)" }] });
  });

  it("follows the ordered conditional branches for rebuilt inputs", () => {
    const accepted = runGuideTrace(traces.conditionals, { accepted: true, hasStrategy: false });
    const trying = runGuideTrace(traces.conditionals, { accepted: false, hasStrategy: true });
    const needsHint = runGuideTrace(traces.conditionals, { accepted: false, hasStrategy: false });

    expect(accepted.valid && accepted.frames.map((frame) => frame.line)).toEqual([1, 2]);
    expect(trying.valid && trying.frames.map((frame) => frame.line)).toEqual([1, 3, 4]);
    expect(needsHint.valid && needsHint.frames.map((frame) => frame.line)).toEqual([1, 3, 6]);
  });

  it("records condition, body, increment, and final false frames for the for loop", () => {
    const result = runGuideTrace(traces.forLoop, {});
    expect(result.valid).toBe(true);
    if (!result.valid) return;

    expect(result.frames.slice(0, 4).map((frame) => frame.line)).toEqual([1, 1, 2, 1]);
    expect(result.frames.at(-1)).toMatchObject({ line: 1, variables: [{ name: "i", value: 6 }] });
    expect(result.frames.at(-1)?.narration).toContain("condition is false");
  });

  it("records while output, vector skip behavior, and recursive descent/unwind", () => {
    const whileResult = runGuideTrace(traces.whileLoop, {});
    const vectorResult = runGuideTrace(traces.vectorTraversal, {});
    const recursionResult = runGuideTrace(traces.recursion, {});
    expect(whileResult.valid && whileResult.frames.at(-1)?.visuals?.at(-1)).toMatchObject({ lines: ["3", "2", "1"] });
    expect(vectorResult.valid && vectorResult.frames.at(-1)?.visuals?.at(-1)).toMatchObject({ lines: ["1", "2", "3", "4"] });
    expect(recursionResult.valid).toBe(true);
    if (!recursionResult.valid) return;
    expect(recursionResult.frames.some((frame) => frame.narration.includes("base case"))).toBe(true);
    expect(recursionResult.frames.at(-1)).toMatchObject({ variables: [{ name: "x", value: 4 }, { name: "return", value: 24 }] });
  });

  it("walks through countdown until its base case and unwinds every call", () => {
    const result = runGuideTrace(traces.countdown, {});
    expect(result.valid).toBe(true);
    if (!result.valid) return;

    expect(result.frames.some((frame) => frame.narration.includes("base case"))).toBe(true);
    expect(result.frames.filter((frame) => frame.line === 3).map((frame) => frame.variables?.[0]?.value)).toEqual([3, 2, 1]);
    expect(result.frames.at(-1)?.visuals?.at(-1)).toMatchObject({ lines: ["3 2 1"] });
  });

  it("walks through both Fibonacci branches, base cases, and the final sum", () => {
    const result = runGuideTrace(traces.fibonacci, {});
    expect(result.valid).toBe(true);
    if (!result.valid) return;

    expect(result.frames.some((frame) => frame.narration.includes("base case"))).toBe(true);
    expect(result.frames.some((frame) => frame.narration.includes("left branch returned"))).toBe(true);
    expect(result.frames.at(-1)).toMatchObject({
      line: 6,
      variables: [{ name: "result", value: 3 }]
    });
    expect(result.frames.at(-1)?.visuals?.at(-1)).toMatchObject({ lines: ["3"] });
  });

  it("combines conditional branches with continue and break inside iteration", () => {
    const result = runGuideTrace(traces.loopControl, {});
    expect(result.valid).toBe(true);
    if (!result.valid) return;

    expect(result.frames.some((frame) => frame.narration.includes("continue skips"))).toBe(true);
    expect(result.frames.at(-1)).toMatchObject({ line: 2, variables: [{ name: "i", value: 8 }] });
    expect(result.frames.at(-1)?.narration).toContain("break ends the entire loop");
    expect(result.frames.at(-1)?.visuals?.at(-1)).toMatchObject({ lines: ["1", "3", "5", "7"] });
  });

  it("records function caller, parameter binding, calculation, return, and assignment", () => {
    const result = runGuideTrace(traces.functionCall, {});
    expect(result.valid).toBe(true);
    if (!result.valid) return;

    expect(result.frames.map((frame) => frame.line)).toEqual([6, 1, 2, 3, 6]);
    expect(result.frames[1]).toMatchObject({ variables: [{ name: "x", value: 7 }, { name: "y", value: 3 }] });
    expect(result.frames.at(-1)).toMatchObject({
      variables: [{ name: "total", value: 10 }],
      visuals: [{ kind: "callStack", frames: [{ label: "main", detail: "total = 10" }], activeIndex: 0 }]
    });
  });
});
