export type SearchOrientation = "false-true" | "true-false";

export interface DiscreteSearchStep {
  readonly left: number;
  readonly mid: number;
  readonly right: number;
  readonly conditionResult: boolean;
  readonly movedBound: "left" | "right";
  readonly nextLeft: number;
  readonly nextRight: number;
}

export interface DiscreteSearchTrace {
  readonly orientation: SearchOrientation;
  readonly initialLeft: number;
  readonly initialRight: number;
  readonly steps: readonly DiscreteSearchStep[];
  readonly boundary: number;
  readonly probes: number;
}

export type SearchStepPhase = "calculate-mid" | "evaluate-condition" | "move-bound";

export interface DiscreteSearchFrame {
  readonly phase: SearchStepPhase;
  readonly probe: number;
  readonly step: DiscreteSearchStep;
}

export function expandDiscreteTrace(trace: DiscreteSearchTrace): readonly DiscreteSearchFrame[] {
  return trace.steps.flatMap((step, index) => ([
    { phase: "calculate-mid", probe: index + 1, step },
    { phase: "evaluate-condition", probe: index + 1, step },
    { phase: "move-bound", probe: index + 1, step }
  ] as const));
}

export function runDiscreteSearch({
  left,
  right,
  orientation,
  condition,
  maxSteps = 128
}: {
  readonly left: number;
  readonly right: number;
  readonly orientation: SearchOrientation;
  readonly condition: (value: number) => boolean;
  readonly maxSteps?: number;
}): DiscreteSearchTrace {
  if (!Number.isSafeInteger(left) || !Number.isSafeInteger(right) || right <= left) {
    throw new Error("Binary Search bounds must be safe integers with left < right.");
  }
  const initialLeft = left;
  const initialRight = right;
  const steps: DiscreteSearchStep[] = [];

  while (right - left > 1) {
    if (steps.length >= maxSteps) throw new Error("Binary Search trace exceeded its step limit.");
    const mid = left + Math.floor((right - left) / 2);
    if (mid <= left || mid >= right) throw new Error("Binary Search midpoint did not stay between its exclusive bounds.");
    const conditionResult = condition(mid);
    const moveLeft = orientation === "true-false" ? conditionResult : !conditionResult;
    const nextLeft = moveLeft ? mid : left;
    const nextRight = moveLeft ? right : mid;
    steps.push({
      left,
      mid,
      right,
      conditionResult,
      movedBound: moveLeft ? "left" : "right",
      nextLeft,
      nextRight
    });
    left = nextLeft;
    right = nextRight;
  }

  return {
    orientation,
    initialLeft,
    initialRight,
    steps,
    boundary: orientation === "false-true" ? right : left,
    probes: steps.length
  };
}

export type ConditionPattern = SearchOrientation | "constant-false" | "constant-true" | "non-monotone";

export function classifyConditionPattern(values: readonly boolean[]): ConditionPattern {
  if (values.length === 0 || values.every((value) => !value)) return "constant-false";
  if (values.every(Boolean)) return "constant-true";
  let changes = 0;
  for (let index = 1; index < values.length; index += 1) {
    if (values[index] !== values[index - 1]) changes += 1;
  }
  if (changes !== 1) return "non-monotone";
  return values[0] === false ? "false-true" : "true-false";
}

export function parseIntegerList(raw: string, maxItems = 12): readonly number[] | null {
  const trimmed = raw.trim();
  if (trimmed === "") return [];
  const parts = trimmed.split(/[\s,]+/);
  if (parts.length > maxItems) return null;
  const values = parts.map(Number);
  if (values.some((value) => !Number.isSafeInteger(value) || Math.abs(value) > 1_000_000_000)) return null;
  return values;
}

export function isNonDecreasing(values: readonly number[]): boolean {
  return values.every((value, index) => index === 0 || values[index - 1]! <= value);
}

export function traceFirstOccurrence(values: readonly number[], target: number): {
  readonly trace: DiscreteSearchTrace;
  readonly index: number;
} {
  const trace = runDiscreteSearch({
    left: -1,
    right: values.length,
    orientation: "false-true",
    condition: (index) => values[index]! >= target
  });
  const index = trace.boundary < values.length && values[trace.boundary] === target
    ? trace.boundary
    : -1;
  return { trace, index };
}

export function traceClosestValue(values: readonly number[], target: number): {
  readonly leftTrace: DiscreteSearchTrace;
  readonly rightTrace: DiscreteSearchTrace;
  readonly leftIndex: number;
  readonly rightIndex: number;
  readonly value: number;
} {
  if (values.length === 0) throw new Error("Closest-value search requires at least one value.");
  const leftTrace = runDiscreteSearch({
    left: -1,
    right: values.length,
    orientation: "true-false",
    condition: (index) => values[index]! <= target
  });
  const rightTrace = runDiscreteSearch({
    left: -1,
    right: values.length,
    orientation: "false-true",
    condition: (index) => values[index]! > target
  });
  const leftIndex = leftTrace.boundary;
  const rightIndex = rightTrace.boundary;
  if (leftIndex < 0) return { leftTrace, rightTrace, leftIndex, rightIndex, value: values[rightIndex]! };
  if (rightIndex >= values.length) return { leftTrace, rightTrace, leftIndex, rightIndex, value: values[leftIndex]! };
  const leftDistance = Math.abs(target - values[leftIndex]!);
  const rightDistance = Math.abs(values[rightIndex]! - target);
  return {
    leftTrace,
    rightTrace,
    leftIndex,
    rightIndex,
    value: leftDistance <= rightDistance ? values[leftIndex]! : values[rightIndex]!
  };
}

export interface ContinuousSearchStep {
  readonly left: number;
  readonly mid: number;
  readonly right: number;
  readonly conditionResult: boolean;
  readonly width: number;
}

export type ContinuousTermination =
  | { readonly kind: "epsilon"; readonly epsilon: number }
  | { readonly kind: "iterations"; readonly iterations: number };

export function traceContinuousSquareRoot(
  value: number,
  termination: ContinuousTermination
): {
  readonly steps: readonly ContinuousSearchStep[];
  readonly result: number;
  readonly stagnated: boolean;
} {
  if (!Number.isFinite(value) || value < 0 || value > 1_000_000_000_000) {
    throw new Error("Continuous square root expects a finite value from 0 through 10^12.");
  }
  if (termination.kind === "epsilon" && (!Number.isFinite(termination.epsilon) || termination.epsilon < 1e-12 || termination.epsilon > 1e-1)) {
    throw new Error("Epsilon must be between 10^-12 and 10^-1.");
  }
  if (termination.kind === "iterations" && (!Number.isInteger(termination.iterations) || termination.iterations < 1 || termination.iterations > 100)) {
    throw new Error("Iterations must be an integer from 1 through 100.");
  }
  let left = 0;
  let right = Math.max(1, value + 1);
  const steps: ContinuousSearchStep[] = [];
  let stagnated = false;
  const keepGoing = (): boolean => termination.kind === "epsilon"
    ? right - left > termination.epsilon
    : steps.length < termination.iterations;

  while (keepGoing() && steps.length < 200) {
    const mid = left + (right - left) / 2;
    if (mid === left || mid === right) {
      stagnated = true;
      break;
    }
    const conditionResult = mid * mid <= value;
    steps.push({ left, mid, right, conditionResult, width: right - left });
    if (conditionResult) left = mid;
    else right = mid;
  }
  return { steps, result: left + (right - left) / 2, stagnated };
}

export interface MagicIngredient {
  readonly need: bigint;
  readonly stock: bigint;
}

export interface MagicIngredientCheck {
  readonly index: number;
  readonly required: bigint;
  readonly deficit: bigint;
  readonly used: bigint;
}

export function checkMagicPowder(
  cookies: bigint,
  powder: bigint,
  ingredients: readonly MagicIngredient[]
): {
  readonly feasible: boolean;
  readonly checks: readonly MagicIngredientCheck[];
  readonly used: bigint;
} {
  let used = 0n;
  const checks: MagicIngredientCheck[] = [];
  for (const [index, ingredient] of ingredients.entries()) {
    const required = ingredient.need * cookies;
    const deficit = required > ingredient.stock ? required - ingredient.stock : 0n;
    used += deficit;
    checks.push({ index, required, deficit, used });
    if (used > powder) return { feasible: false, checks, used };
  }
  return { feasible: true, checks, used };
}

export function traceMagicPowder(
  powder: bigint,
  ingredients: readonly MagicIngredient[]
): {
  readonly trace: DiscreteSearchTrace;
  readonly result: bigint;
} {
  if (powder < 0n || ingredients.length === 0 || ingredients.length > 12) {
    throw new Error("Magic Powder expects one through twelve ingredients and non-negative powder.");
  }
  const trace = runDiscreteSearch({
    left: 0,
    right: 2_000_000_001,
    orientation: "true-false",
    condition: (cookies) => checkMagicPowder(BigInt(cookies), powder, ingredients).feasible
  });
  return { trace, result: BigInt(trace.boundary) };
}
