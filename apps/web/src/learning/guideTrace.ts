import type { Language } from "prism-react-renderer";

export type GuideTracePrimitive = string | number | boolean | null;

export type GuideTraceInputDefinition =
  | { readonly kind: "boolean"; readonly label: string; readonly defaultValue: boolean }
  | {
      readonly kind: "select";
      readonly label: string;
      readonly defaultValue: string;
      readonly options: readonly { readonly value: string; readonly label: string }[];
    };

export type GuideTraceInputSchema = Readonly<Record<string, GuideTraceInputDefinition>>;

export type GuideTraceInputValues<S extends GuideTraceInputSchema> = {
  readonly [K in keyof S]: S[K] extends { readonly kind: "boolean" }
    ? boolean
    : S[K] extends { readonly kind: "select" }
      ? string
      : never;
};

export type GuideTraceVariable = {
  readonly name: string;
  readonly value: GuideTracePrimitive;
  readonly typeLabel?: string;
};

export type GuideTraceVisual =
  | { readonly kind: "output"; readonly label: string; readonly lines: readonly string[] }
  | { readonly kind: "branch"; readonly label: string; readonly condition: string; readonly outcome: string }
  | {
      readonly kind: "vector";
      readonly label: string;
      readonly values: readonly GuideTracePrimitive[];
      readonly activeIndex?: number;
    }
  | {
      readonly kind: "callStack";
      readonly label: string;
      readonly frames: readonly { readonly label: string; readonly detail?: string }[];
      readonly activeIndex?: number;
    }
  | {
      readonly kind: "collection";
      readonly label: string;
      readonly layout: "row" | "stack" | "queue" | "intervals";
      readonly values: readonly GuideTracePrimitive[];
      readonly activeIndex?: number;
      readonly markers?: readonly { readonly index: number; readonly label: string }[];
    }
  | {
      readonly kind: "entries";
      readonly label: string;
      readonly entries: readonly {
        readonly key: GuideTracePrimitive;
        readonly value: GuideTracePrimitive;
      }[];
      readonly activeIndex?: number;
    };

export type GuideTraceFrame = {
  readonly line: number;
  readonly narration: string;
  readonly variables?: readonly GuideTraceVariable[];
  readonly visuals?: readonly GuideTraceVisual[];
};

export interface GuideTraceRecorder {
  frame(frame: GuideTraceFrame): void;
}

export interface GuideTraceDefinition<S extends GuideTraceInputSchema> {
  readonly code: string;
  readonly language: Language;
  readonly label: string;
  readonly inputs: S;
  readonly intervalMs?: number;
  readonly build: (inputs: GuideTraceInputValues<S>, recorder: GuideTraceRecorder) => void;
}

export type GuideTraceRunResult =
  | { readonly valid: true; readonly frames: readonly GuideTraceFrame[] }
  | { readonly valid: false; readonly reason: string };

export function defineGuideTrace<const S extends GuideTraceInputSchema>(
  definition: GuideTraceDefinition<S>
): GuideTraceDefinition<S> {
  return definition;
}

export function getGuideTraceDefaultInputs<S extends GuideTraceInputSchema>(
  definition: GuideTraceDefinition<S>
): GuideTraceInputValues<S> {
  return Object.fromEntries(
    Object.entries(definition.inputs).map(([name, input]) => [name, input.defaultValue])
  ) as GuideTraceInputValues<S>;
}

export function runGuideTrace<S extends GuideTraceInputSchema>(
  definition: GuideTraceDefinition<S>,
  inputs: GuideTraceInputValues<S>
): GuideTraceRunResult {
  const inputError = validateInputs(definition.inputs, inputs);
  if (inputError !== undefined) return { valid: false, reason: inputError };

  const frames: GuideTraceFrame[] = [];
  try {
    definition.build(inputs, {
      frame: (frame) => frames.push(cloneFrame(frame))
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    return { valid: false, reason: `Trace builder threw: ${message}` };
  }

  if (frames.length === 0) return { valid: false, reason: "Trace builder recorded no frames." };
  const lineCount = definition.code.split("\n").length;
  for (const [index, frame] of frames.entries()) {
    const prefix = `Frame ${index + 1}`;
    if (!Number.isInteger(frame.line) || frame.line < 1 || frame.line > lineCount) {
      return { valid: false, reason: `${prefix} references line ${frame.line}; expected 1–${lineCount}.` };
    }
    if (frame.narration.trim() === "") {
      return { valid: false, reason: `${prefix} has blank narration.` };
    }
    for (const visual of frame.visuals ?? []) {
      if (visual.kind !== "vector" && visual.kind !== "callStack" && visual.kind !== "collection" && visual.kind !== "entries") continue;
      const length = visual.kind === "vector" || visual.kind === "collection"
        ? visual.values.length
        : visual.kind === "entries"
          ? visual.entries.length
          : visual.frames.length;
      if (visual.activeIndex !== undefined && (!Number.isInteger(visual.activeIndex) || visual.activeIndex < 0 || visual.activeIndex >= length)) {
        return {
          valid: false,
          reason: `${prefix} has an out-of-range ${visual.kind} active index ${visual.activeIndex}.`
        };
      }
      if (visual.kind === "collection") {
        for (const marker of visual.markers ?? []) {
          if (!Number.isInteger(marker.index) || marker.index < 0 || marker.index >= length) {
            return {
              valid: false,
              reason: `${prefix} has an out-of-range collection marker index ${marker.index}.`
            };
          }
          if (marker.label.trim() === "") {
            return { valid: false, reason: `${prefix} has a collection marker with a blank label.` };
          }
        }
      }
    }
  }

  return { valid: true, frames: deepFreeze(frames) };
}

function validateInputs<S extends GuideTraceInputSchema>(
  schema: S,
  values: GuideTraceInputValues<S>
): string | undefined {
  for (const [name, input] of Object.entries(schema)) {
    if (input.label.trim() === "") return `Input "${name}" has a blank label.`;
    const value: unknown = values[name];
    if (input.kind === "boolean") {
      if (typeof value !== "boolean") return `Input "${name}" must be boolean.`;
      continue;
    }
    const optionValues = input.options.map((option) => option.value);
    if (new Set(optionValues).size !== optionValues.length) {
      return `Input "${name}" contains duplicate select values.`;
    }
    if (!optionValues.includes(input.defaultValue)) {
      return `Input "${name}" has a default value that is not one of its options.`;
    }
    if (typeof value !== "string" || !optionValues.includes(value)) {
      return `Input "${name}" has a value that is not one of its options.`;
    }
  }
  return undefined;
}

function cloneFrame(frame: GuideTraceFrame): GuideTraceFrame {
  return {
    line: frame.line,
    narration: frame.narration,
    ...(frame.variables === undefined
      ? {}
      : { variables: frame.variables.map((variable) => ({ ...variable })) }),
    ...(frame.visuals === undefined
      ? {}
      : {
          visuals: frame.visuals.map((visual) => {
            switch (visual.kind) {
              case "output": return { ...visual, lines: [...visual.lines] };
              case "branch": return { ...visual };
              case "vector": return { ...visual, values: [...visual.values] };
              case "callStack": return {
                ...visual,
                frames: visual.frames.map((callFrame) => ({ ...callFrame }))
              };
              case "collection": return {
                ...visual,
                values: [...visual.values],
                ...(visual.markers === undefined
                  ? {}
                  : { markers: visual.markers.map((marker) => ({ ...marker })) })
              };
              case "entries": return {
                ...visual,
                entries: visual.entries.map((entry) => ({ ...entry }))
              };
            }
          })
        })
  };
}

function deepFreeze<T>(value: T): T {
  if (typeof value !== "object" || value === null || Object.isFrozen(value)) return value;
  for (const child of Object.values(value)) deepFreeze(child);
  return Object.freeze(value);
}
