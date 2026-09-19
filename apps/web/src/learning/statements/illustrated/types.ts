export type Localize = (en: string, es: string) => string;
export type Tone = "neutral" | "active" | "good" | "bad" | "muted";
export interface Item {
  readonly text: string;
  readonly detail?: string;
  readonly tone?: Tone;
}
export type Scene =
  | {
      readonly kind: "bakery";
      readonly label: string;
      readonly cookies: number;
      readonly cookieLabel: string;
      readonly powderLabel: string;
      readonly powder: number;
      readonly ingredients: readonly {
        readonly label: string;
        readonly remaining: number;
        readonly perCookie: number;
        readonly detail: string;
      }[];
    }
  | {
      readonly kind: "items";
      readonly label: string;
      readonly items: readonly Item[];
      readonly shape?:
        | "card"
        | "coin"
        | "bottle"
        | "book"
        | "stone"
        | "watermelon"
        | "folder";
      readonly links?: readonly (readonly [number, number])[];
    }
  | {
      readonly kind: "grid";
      readonly label: string;
      readonly cells: readonly (readonly Item[])[];
      readonly sudoku?: boolean;
      readonly cursor?: readonly [number, number];
    }
  | {
      readonly kind: "graph";
      readonly label: string;
      readonly nodes: readonly Item[];
      readonly edges: readonly {
        readonly a: number;
        readonly b: number;
        readonly weight?: number;
        readonly tone?: Tone;
      }[];
      readonly directed?: boolean;
      readonly folders?: boolean;
    }
  | {
      readonly kind: "timeline";
      readonly label: string;
      readonly intervals: readonly {
        readonly start: number;
        readonly end: number;
        readonly text: string;
        readonly tone?: Tone;
      }[];
    }
  | {
      readonly kind: "chart";
      readonly label: string;
      readonly values: readonly number[];
      readonly marked?: readonly number[];
      readonly annotations?: readonly {
        readonly index: number;
        readonly text: string;
      }[];
    }
  | {
      readonly kind: "square";
      readonly label: string;
      readonly area: number;
      readonly side?: number;
    }
  | {
      readonly kind: "table";
      readonly label: string;
      readonly width: number;
      readonly height: number;
      readonly circles: readonly {
        readonly x: number;
        readonly y: number;
        readonly tone?: Tone;
      }[];
    };
export interface ExampleStep {
  readonly narration: string;
  readonly scenes: readonly Scene[];
  readonly result?: string;
}
export interface ExamplePreset {
  readonly id: string;
  readonly label: string;
  readonly input: string;
}
export interface IllustratedExample {
  readonly instructions: string;
  readonly presets: readonly ExamplePreset[];
  readonly build: (input: string) => readonly ExampleStep[];
}
export const localize =
  (language: string): Localize =>
  (en, es) =>
    language.startsWith("es") ? es : en;
export function requireInput(
  condition: unknown,
  l: Localize,
  en: string,
  es: string,
): asserts condition {
  if (!condition) throw new Error(l(en, es));
}
export function numbers(
  input: string,
  l: Localize,
  min = -100,
  max = 100,
  count = 16,
): number[] {
  const tokens = input
    .trim()
    .split(/[\s,]+/)
    .filter(Boolean);
  const values = tokens.map(Number);
  requireInput(
    tokens.length > 0 &&
      values.length <= count &&
      values.every((n) => Number.isInteger(n) && n >= min && n <= max),
    l,
    `Use 1–${count} whole numbers from ${min} to ${max}.`,
    `Usa de 1 a ${count} enteros entre ${min} y ${max}.`,
  );
  return values;
}
export function lines(input: string, count: number, l: Localize): string[] {
  const rows = input
    .trim()
    .split(/\n/)
    .map((row) => row.trim());
  requireInput(
    rows.length === count,
    l,
    `Use exactly ${count} input lines.`,
    `Usa exactamente ${count} líneas de entrada.`,
  );
  return rows;
}
export const items = (
  label: string,
  values: readonly (number | string)[],
  selected: readonly number[] = [],
  shape: Extract<Scene, { kind: "items" }>["shape"] = "card",
  rejected: readonly number[] = [],
): Scene => ({
  kind: "items",
  label,
  shape,
  items: values.map((value, index) => ({
    text: String(value),
    detail: String(index),
    tone: rejected.includes(index)
      ? "bad"
      : selected.includes(index)
        ? "good"
        : "neutral",
  })),
});
export const step = (
  narration: string,
  scenes: readonly Scene[],
  result?: string,
): ExampleStep => ({
  narration,
  scenes,
  ...(result === undefined ? {} : { result }),
});
export function presets(
  first: string,
  second: string,
  l: Localize,
): readonly ExamplePreset[] {
  return [
    { id: "sample", label: l("Example", "Ejemplo"), input: first },
    {
      id: "contrast",
      label: l("Compare another input", "Compara otra entrada"),
      input: second,
    },
  ];
}
