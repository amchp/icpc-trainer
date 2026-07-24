import { describe, expect, it } from "vitest";

import { i18n } from "../i18n/i18n.js";
import { runGuideTrace } from "./guideTrace.js";
import { createProgrammingFundamentalsTraces } from "./GuideTraces.js";

const traces = createProgrammingFundamentalsTraces(i18n.getFixedT("en", "programmingFundamentals"));

describe("programming fundamentals traces", () => {
  it("keeps representative source lines co-located with all six builders", () => {
    expect(traces.conditionals.code.split("\n")[0]).toBe("if (esta_lloviendo) {");
    expect(traces.forLoop.code.split("\n")[1]).toContain("cout << i");
    expect(traces.whileLoop.code.split("\n")[1]).toBe("while (restantes > 0) {");
    expect(traces.functionCall.code.split("\n")[5]).toContain("int total = sumar(7, 3)");
    expect(traces.vectorTraversal.code.split("\n")[4]).toContain("continue");
    expect(traces.recursion.code.split("\n")[1]).toContain("if (x == 1) return 1");
  });

  it("follows the ordered conditional branches for rebuilt inputs", () => {
    const clear = runGuideTrace(traces.conditionals, { rain: false, snow: false });
    const rain = runGuideTrace(traces.conditionals, { rain: true, snow: true });
    const snow = runGuideTrace(traces.conditionals, { rain: false, snow: true });

    expect(clear.valid && clear.frames.map((frame) => frame.line)).toEqual([1, 3, 6]);
    expect(rain.valid && rain.frames.map((frame) => frame.line)).toEqual([1, 2]);
    expect(snow.valid && snow.frames.map((frame) => frame.line)).toEqual([1, 3, 4]);
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
    expect(vectorResult.valid && vectorResult.frames.at(-1)?.visuals?.at(-1)).toMatchObject({ lines: ["1", "2", "4"] });
    expect(recursionResult.valid).toBe(true);
    if (!recursionResult.valid) return;
    expect(recursionResult.frames.some((frame) => frame.narration.includes("base case"))).toBe(true);
    expect(recursionResult.frames.at(-1)).toMatchObject({ variables: [{ name: "x", value: 4 }, { name: "return", value: 24 }] });
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
