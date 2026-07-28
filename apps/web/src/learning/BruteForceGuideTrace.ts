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

export type GuideTraceGridTone = "default" | "fixed" | "active" | "accepted" | "rejected";

export type GuideTraceGridCell = {
  readonly value: GuideTracePrimitive;
  readonly tone?: GuideTraceGridTone;
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
      readonly kind: "tree";
      readonly label: string;
      readonly nodes: readonly {
        readonly id: string;
        readonly label: string;
        readonly parentId?: string;
        readonly depth: number;
      }[];
      readonly activeId?: string;
      readonly completedIds?: readonly string[];
    }
  | {
      readonly kind: "grid";
      readonly label: string;
      readonly cells: readonly (readonly GuideTraceGridCell[])[];
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
      if (visual.kind === "grid") {
        if (visual.cells.length === 0 || visual.cells[0]?.length === 0) {
          return { valid: false, reason: `${prefix} has an empty grid.` };
        }
        const width = visual.cells[0]!.length;
        if (visual.cells.some((row) => row.length !== width)) {
          return { valid: false, reason: `${prefix} has a non-rectangular grid.` };
        }
        continue;
      }
      if (visual.kind === "tree") {
        const ids = visual.nodes.map((node) => node.id);
        const knownIds = new Set(ids);
        if (ids.length === 0 || knownIds.size !== ids.length) {
          return { valid: false, reason: `${prefix} has an empty tree or duplicate tree node IDs.` };
        }
        if (visual.nodes.some((node) => !Number.isInteger(node.depth) || node.depth < 0 || (node.parentId !== undefined && !knownIds.has(node.parentId)))) {
          return { valid: false, reason: `${prefix} has an invalid tree depth or parent.` };
        }
        if (visual.activeId !== undefined && !knownIds.has(visual.activeId)) {
          return { valid: false, reason: `${prefix} has an unknown active tree node "${visual.activeId}".` };
        }
        if (visual.completedIds?.some((id) => !knownIds.has(id)) === true) {
          return { valid: false, reason: `${prefix} has an unknown completed tree node.` };
        }
        continue;
      }
      if (visual.kind !== "vector" && visual.kind !== "callStack") continue;
      if (visual.activeIndex === undefined) continue;
      const length = visual.kind === "vector" ? visual.values.length : visual.frames.length;
      if (!Number.isInteger(visual.activeIndex) || visual.activeIndex < 0 || visual.activeIndex >= length) {
        return {
          valid: false,
          reason: `${prefix} has an out-of-range ${visual.kind} active index ${visual.activeIndex}.`
        };
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
              case "tree": return {
                ...visual,
                nodes: visual.nodes.map((node) => ({ ...node })),
                ...(visual.completedIds === undefined ? {} : { completedIds: [...visual.completedIds] })
              };
              case "grid": return {
                ...visual,
                cells: visual.cells.map((row) => row.map((cell) => ({ ...cell })))
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

