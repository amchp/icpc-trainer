import { describe, expect, it } from "vitest";

import { defineGuideTrace, getGuideTraceDefaultInputs, runGuideTrace } from "./guideTrace.js";

describe("guideTrace", () => {
  it("infers boolean and select defaults", () => {
    const trace = defineGuideTrace({
      code: "line",
      language: "cpp",
      label: "Inputs",
      inputs: {
        enabled: { kind: "boolean", label: "Enabled", defaultValue: true },
        mode: { kind: "select", label: "Mode", defaultValue: "slow", options: [{ value: "slow", label: "Slow" }, { value: "fast", label: "Fast" }] }
      },
      build: (_inputs, recorder) => recorder.frame({ line: 1, narration: "Ready" })
    });

    expect(getGuideTraceDefaultInputs(trace)).toEqual({ enabled: true, mode: "slow" });
    expect(runGuideTrace(trace, { enabled: false, mode: "fast" }).valid).toBe(true);
  });

  it("clones and freezes snapshots when author data later mutates", () => {
    const values = [1, 2];
    const stack = [{ label: "main", detail: "waiting" }];
    const markers = [{ index: 0, label: "front" }];
    const entries = [{ key: "name", value: 1 }];
    const trace = defineGuideTrace({
      code: "first\nsecond",
      language: "cpp",
      label: "Snapshots",
      inputs: {},
      build: (_inputs, recorder) => {
        recorder.frame({ line: 1, narration: "Before", visuals: [
          { kind: "vector", label: "Vector", values },
          { kind: "callStack", label: "Stack", frames: stack },
          { kind: "collection", label: "Queue", layout: "queue", values, markers },
          { kind: "entries", label: "Entries", entries }
        ] });
        values.push(3);
        stack[0]!.detail = "changed";
        markers[0]!.label = "changed";
        entries[0]!.value = 2;
        recorder.frame({ line: 2, narration: "After", visuals: [{ kind: "vector", label: "Vector", values }, { kind: "callStack", label: "Stack", frames: stack }] });
      }
    });

    const result = runGuideTrace(trace, {});
    expect(result.valid).toBe(true);
    if (!result.valid) return;
    expect(result.frames[0]?.visuals?.[0]).toMatchObject({ values: [1, 2] });
    expect(result.frames[0]?.visuals?.[1]).toMatchObject({ frames: [{ detail: "waiting" }] });
    expect(result.frames[0]?.visuals?.[2]).toMatchObject({ values: [1, 2], markers: [{ label: "front" }] });
    expect(result.frames[0]?.visuals?.[3]).toMatchObject({ entries: [{ key: "name", value: 1 }] });
    expect(Object.isFrozen(result.frames)).toBe(true);
    expect(Object.isFrozen(result.frames[0]?.visuals)).toBe(true);
  });

  it.each([
    ["no frames", { code: "line", inputs: {}, build: () => undefined }, /no frames/],
    ["line bounds", { code: "line", inputs: {}, build: (_inputs: object, recorder: { frame: (frame: { line: number; narration: string }) => void }) => recorder.frame({ line: 2, narration: "Bad" }) }, /expected 1–1/],
    ["blank narration", { code: "line", inputs: {}, build: (_inputs: object, recorder: { frame: (frame: { line: number; narration: string }) => void }) => recorder.frame({ line: 1, narration: " " }) }, /blank narration/],
    ["builder exception", { code: "line", inputs: {}, build: () => { throw new Error("boom"); } }, /builder threw: boom/]
  ])("reports %s validation failures", (_name, partial, reason) => {
    const trace = defineGuideTrace({ language: "cpp", label: "Invalid", ...partial });
    expect(runGuideTrace(trace, {})).toEqual({ valid: false, reason: expect.stringMatching(reason) });
  });

  it("rejects duplicate or invalid select configuration and visual indexes", () => {
    const duplicateSelect = defineGuideTrace({
      code: "line",
      language: "cpp",
      label: "Select",
      inputs: { mode: { kind: "select", label: "Mode", defaultValue: "missing", options: [{ value: "same", label: "A" }, { value: "same", label: "B" }] } },
      build: (_inputs, recorder) => recorder.frame({ line: 1, narration: "Ready" })
    });
    expect(runGuideTrace(duplicateSelect, { mode: "same" })).toMatchObject({ valid: false, reason: expect.stringMatching(/duplicate/) });

    const invalidDefault = defineGuideTrace({
      code: "line",
      language: "cpp",
      label: "Select",
      inputs: { mode: { kind: "select", label: "Mode", defaultValue: "missing", options: [{ value: "same", label: "A" }] } },
      build: (_inputs, recorder) => recorder.frame({ line: 1, narration: "Ready" })
    });
    expect(runGuideTrace(invalidDefault, { mode: "same" })).toMatchObject({ valid: false, reason: expect.stringMatching(/default value/) });

    const invalidIndex = defineGuideTrace({
      code: "line",
      language: "cpp",
      label: "Index",
      inputs: {},
      build: (_inputs, recorder) => recorder.frame({ line: 1, narration: "Ready", visuals: [{ kind: "vector", label: "Vector", values: [1], activeIndex: 1 }] })
    });
    expect(runGuideTrace(invalidIndex, {})).toMatchObject({ valid: false, reason: expect.stringMatching(/out-of-range/) });

    const invalidMarker = defineGuideTrace({
      code: "line",
      language: "cpp",
      label: "Marker",
      inputs: {},
      build: (_inputs, recorder) => recorder.frame({
        line: 1,
        narration: "Ready",
        visuals: [{ kind: "collection", label: "Queue", layout: "queue", values: [1], markers: [{ index: 1, label: "back" }] }]
      })
    });
    expect(runGuideTrace(invalidMarker, {})).toMatchObject({ valid: false, reason: expect.stringMatching(/marker index/) });

    const invalidEntryIndex = defineGuideTrace({
      code: "line",
      language: "cpp",
      label: "Entry",
      inputs: {},
      build: (_inputs, recorder) => recorder.frame({
        line: 1,
        narration: "Ready",
        visuals: [{ kind: "entries", label: "Entries", entries: [{ key: "a", value: 1 }], activeIndex: -1 }]
      })
    });
    expect(runGuideTrace(invalidEntryIndex, {})).toMatchObject({ valid: false, reason: expect.stringMatching(/out-of-range entries/) });
  });
});
