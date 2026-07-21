export type ComplexityFamily =
  | "constant"
  | "logarithmic"
  | "squareRoot"
  | "linear"
  | "linearithmic"
  | "quadratic"
  | "cubic"
  | "exponential"
  | "factorial";

export const COMPLEXITY_FAMILIES: readonly ComplexityFamily[] = [
  "constant",
  "logarithmic",
  "squareRoot",
  "linear",
  "linearithmic",
  "quadratic",
  "cubic",
  "exponential",
  "factorial"
];

export const METER_FAMILIES: readonly ComplexityFamily[] = [
  "constant",
  "logarithmic",
  "linear",
  "linearithmic",
  "quadratic",
  "exponential",
  "factorial"
];

export const BIG_O_LABELS: Readonly<Record<ComplexityFamily, string>> = {
  constant: "O(1)",
  logarithmic: "O(log n)",
  squareRoot: "O(√n)",
  linear: "O(n)",
  linearithmic: "O(n log n)",
  quadratic: "O(n²)",
  cubic: "O(n³)",
  exponential: "O(2ⁿ)",
  factorial: "O(n!)"
};

export const OPERATION_METER_CAP = 1e18;
export const OPERATION_METER_LOG_CAP = 18;
export const DEFAULT_OPERATIONS_PER_SECOND = 1e8;
export const CURRENT_UNIVERSE_AGE_SECONDS = 4.35e17;
export const MAX_INPUT_SIZE = 1e9;

export interface OperationEstimate {
  readonly log10: number;
  readonly visualValue: number;
  readonly exceedsVisualCap: boolean;
}

export const isValidInputSize = (value: number): boolean =>
  Number.isInteger(value) && value >= 1 && value <= MAX_INPUT_SIZE;

const log10Factorial = (n: number): number => {
  if (n <= 1) return 0;
  if (n <= 256) {
    let result = 0;
    for (let value = 2; value <= n; value += 1) result += Math.log10(value);
    return result;
  }

  // Stirling's series stays stable for the guide's large integer inputs.
  return n * Math.log10(n / Math.E) + Math.log10(2 * Math.PI * n) / 2 + 1 / (12 * n * Math.log(10));
};

export const log10OperationCount = (family: ComplexityFamily, n: number): number => {
  if (!isValidInputSize(n)) return Number.NaN;
  const logN = Math.log10(n);
  switch (family) {
    case "constant": return 0;
    case "logarithmic": return Math.log10(Math.max(1, Math.log2(n)));
    case "squareRoot": return logN / 2;
    case "linear": return logN;
    case "linearithmic": return logN + Math.log10(Math.max(1, Math.log2(n)));
    case "quadratic": return 2 * logN;
    case "cubic": return 3 * logN;
    case "exponential": return n * Math.log10(2);
    case "factorial": return log10Factorial(n);
  }
};

export const operationEstimate = (family: ComplexityFamily, n: number): OperationEstimate => {
  const log10 = log10OperationCount(family, n);
  if (!Number.isFinite(log10)) return { log10, visualValue: 0, exceedsVisualCap: false };
  return {
    log10,
    visualValue: 10 ** Math.min(log10, OPERATION_METER_LOG_CAP),
    exceedsVisualCap: log10 > OPERATION_METER_LOG_CAP
  };
};

export const runtimeLog10Seconds = (
  family: ComplexityFamily,
  n: number,
  constant: number,
  operationsPerSecond: number
): number => {
  if (!Number.isFinite(constant) || constant <= 0 || !Number.isFinite(operationsPerSecond) || operationsPerSecond <= 0) {
    return Number.NaN;
  }
  return log10OperationCount(family, n) + Math.log10(constant) - Math.log10(operationsPerSecond);
};

const localizedNumber = (value: number, locale: string, maximumFractionDigits = 2): string =>
  new Intl.NumberFormat(locale, { maximumFractionDigits }).format(value);

export const formatLog10Value = (log10: number, locale: string): string => {
  if (!Number.isFinite(log10)) return "—";
  if (log10 <= 15) return localizedNumber(10 ** log10, locale, log10 < 4 ? 2 : 0);
  const exponent = Math.floor(log10);
  const mantissa = 10 ** (log10 - exponent);
  const exponentText = new Intl.NumberFormat(locale, { maximumFractionDigits: 0, useGrouping: false }).format(exponent);
  return `${localizedNumber(mantissa, locale, 2)} × 10^${exponentText}`;
};

export const formatDuration = (log10Seconds: number, locale: string, universeLabel: string): string => {
  if (!Number.isFinite(log10Seconds)) return "—";
  if (log10Seconds > Math.log10(CURRENT_UNIVERSE_AGE_SECONDS)) return universeLabel;

  const seconds = 10 ** log10Seconds;
  const spanish = locale.toLowerCase().startsWith("es");
  const units = [
    { ceiling: 1e-6, divisor: 1e-9, label: "ns" },
    { ceiling: 1e-3, divisor: 1e-6, label: "μs" },
    { ceiling: 1, divisor: 1e-3, label: "ms" },
    { ceiling: 60, divisor: 1, label: "s" },
    { ceiling: 3600, divisor: 60, label: "min" },
    { ceiling: 86_400, divisor: 3600, label: "h" },
    { ceiling: 31_557_600, divisor: 86_400, label: spanish ? "días" : "days" },
    { ceiling: Number.POSITIVE_INFINITY, divisor: 31_557_600, label: spanish ? "años" : "years" }
  ] as const;
  const unit = units.find(({ ceiling }) => seconds < ceiling) ?? units[units.length - 1]!;
  return `${localizedNumber(seconds / unit.divisor, locale, 2)} ${unit.label}`;
};

export interface MemoryEstimate {
  readonly bytes: number;
  readonly limitBytes: number;
  readonly fits: boolean;
}

export type MemoryStrategy = "pair" | "sort" | "hash";

export interface MemoryModelEstimate {
  readonly inputBytes: number;
  readonly auxiliaryBytes: number;
  readonly totalBytes: number;
  readonly limitBytes: number;
  readonly fits: boolean;
}

export const memoryModelEstimate = (
  strategy: MemoryStrategy,
  items: number,
  bytesPerStoredItem: number,
  limitMiB: number
): MemoryModelEstimate | null => {
  if (!isValidInputSize(items) || !Number.isFinite(limitMiB) || limitMiB <= 0 || limitMiB > 1e9) return null;
  if (strategy !== "pair" && (!Number.isFinite(bytesPerStoredItem) || bytesPerStoredItem <= 0 || bytesPerStoredItem > 1e9)) return null;

  const inputBytes = items * 8;
  const auxiliaryBytes = strategy === "pair" ? 8 : items * bytesPerStoredItem;
  const totalBytes = inputBytes + auxiliaryBytes;
  const limitBytes = limitMiB * 1024 * 1024;
  if (![inputBytes, auxiliaryBytes, totalBytes, limitBytes].every(Number.isFinite)) return null;
  return { inputBytes, auxiliaryBytes, totalBytes, limitBytes, fits: totalBytes <= limitBytes };
};

export const memoryEstimate = (items: number, bytesPerItem: number, limitMiB: number): MemoryEstimate | null => {
  if (!isValidInputSize(items) || !Number.isFinite(bytesPerItem) || bytesPerItem <= 0 || bytesPerItem > 1e9 || !Number.isFinite(limitMiB) || limitMiB <= 0 || limitMiB > 1e9) {
    return null;
  }
  const bytes = items * bytesPerItem;
  const limitBytes = limitMiB * 1024 * 1024;
  if (!Number.isFinite(bytes) || !Number.isFinite(limitBytes)) return null;
  return { bytes, limitBytes, fits: bytes <= limitBytes };
};

export const formatBytes = (bytes: number, locale: string): string => {
  const units = ["B", "KiB", "MiB", "GiB", "TiB", "PiB"] as const;
  let value = bytes;
  let unitIndex = 0;
  while (value >= 1024 && unitIndex < units.length - 1) {
    value /= 1024;
    unitIndex += 1;
  }
  return `${localizedNumber(bytes, locale, 0)} B (${localizedNumber(value, locale, 2)} ${units[unitIndex]})`;
};

export const meterWidthPercent = (log10Operations: number): number => {
  if (!Number.isFinite(log10Operations)) return 0;
  return Math.min(100, Math.max(3, (Math.max(0, log10Operations) / OPERATION_METER_LOG_CAP) * 100));
};
