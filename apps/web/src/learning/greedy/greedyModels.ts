export interface GreedyParseLimits {
  readonly maxCount: number;
  readonly minCount?: number;
  readonly minValue: number;
  readonly maxValue: number;
  readonly allowZero?: boolean;
}

export function parseGreedyIntegers(raw: string, limits: GreedyParseLimits): readonly number[] | null {
  const trimmed = raw.trim();
  const minCount = limits.minCount ?? 1;
  if (
    trimmed === "" ||
    !Number.isSafeInteger(limits.maxCount) ||
    !Number.isSafeInteger(minCount) ||
    limits.maxCount < minCount ||
    minCount < 0 ||
    limits.minValue > limits.maxValue ||
    /^,|,$|,\s*,/.test(trimmed)
  ) return null;
  const parts = trimmed.split(/[\s,]+/);
  if (parts.length < minCount || parts.length > limits.maxCount || parts.some((part) => !/^-?\d+$/.test(part))) return null;
  const values = parts.map(Number);
  if (values.some((value) =>
    !Number.isSafeInteger(value) ||
    value < limits.minValue ||
    value > limits.maxValue ||
    (limits.allowZero === false && value === 0)
  )) return null;
  return values;
}

export function parseGreedyTarget(raw: string, min: number, max: number): number | null {
  const trimmed = raw.trim();
  if (!/^-?\d+$/.test(trimmed)) return null;
  const value = Number(trimmed);
  return Number.isSafeInteger(value) && value >= min && value <= max ? value : null;
}

export function parseLowercaseWord(raw: string, maxLength: number): string | null {
  const value = raw.trim();
  return Number.isSafeInteger(maxLength) && maxLength >= 1 && value.length <= maxLength && /^[a-z]+$/.test(value) ? value : null;
}

export type CoinStep = "consider" | "take" | "skip" | "done";
export interface CoinFrame {
  readonly step: CoinStep;
  readonly candidate: number | null;
  readonly remainingBefore: number;
  readonly remainingAfter: number;
  readonly picked: readonly number[];
}
export interface CoinTrace {
  readonly target: number;
  readonly denominations: readonly number[];
  readonly coins: readonly number[];
  readonly total: number;
  readonly solved: boolean;
  readonly frames: readonly CoinFrame[];
}

function normalizedCoins(target: number, denominations: readonly number[]): readonly number[] {
  if (!Number.isSafeInteger(target) || target <= 0) throw new Error("Coin change requires a positive safe-integer target.");
  if (denominations.length === 0 || denominations.some((coin) => !Number.isSafeInteger(coin) || coin <= 0)) {
    throw new Error("Coin denominations must be positive safe integers.");
  }
  return [...new Set(denominations)].sort((a, b) => b - a);
}

export function traceGreedyCoins(target: number, denominations: readonly number[]): CoinTrace {
  const ordered = normalizedCoins(target, denominations);
  const picked: number[] = [];
  const frames: CoinFrame[] = [];
  let remaining = target;
  for (const candidate of ordered) {
    frames.push({ step: "consider", candidate, remainingBefore: remaining, remainingAfter: remaining, picked: [...picked] });
    let took = false;
    while (candidate <= remaining) {
      if (picked.length >= 4_096) throw new Error("Coin change trace exceeded its step limit.");
      took = true;
      const before = remaining;
      remaining -= candidate;
      picked.push(candidate);
      frames.push({ step: "take", candidate, remainingBefore: before, remainingAfter: remaining, picked: [...picked] });
    }
    if (!took) frames.push({ step: "skip", candidate, remainingBefore: remaining, remainingAfter: remaining, picked: [...picked] });
  }
  frames.push({ step: "done", candidate: null, remainingBefore: remaining, remainingAfter: remaining, picked: [...picked] });
  const total = picked.reduce((sum, coin) => sum + coin, 0);
  return { target, denominations: ordered, coins: picked, total, solved: total === target, frames };
}

function minimumCoinTable(target: number, ordered: readonly number[]): readonly number[] {
  const table = Array<number>(target + 1).fill(Number.POSITIVE_INFINITY);
  table[0] = 0;
  for (let amount = 1; amount <= target; amount += 1) {
    for (const coin of ordered) {
      if (coin <= amount) table[amount] = Math.min(table[amount] ?? Number.POSITIVE_INFINITY, (table[amount - coin] ?? Number.POSITIVE_INFINITY) + 1);
    }
  }
  return table;
}

export function minimumCoinCount(target: number, denominations: readonly number[]): number | null {
  const ordered = normalizedCoins(target, denominations);
  const value = minimumCoinTable(target, ordered)[target];
  return value === undefined || !Number.isFinite(value) ? null : value;
}

export type CoinRaceStep = "start" | "compare" | "done";
export interface CoinRaceFrame {
  readonly step: CoinRaceStep;
  readonly index: number;
  readonly greedyPicked: readonly number[];
  readonly optimalPicked: readonly number[];
  readonly greedyRemaining: number;
  readonly optimalRemaining: number;
}
export interface CoinRaceTrace {
  readonly target: number;
  readonly denominations: readonly number[];
  readonly greedyCoins: readonly number[];
  readonly optimalCoins: readonly number[];
  readonly greedyCount: number;
  readonly optimalCount: number;
  readonly greedyIsOptimal: boolean;
  readonly frames: readonly CoinRaceFrame[];
}

export function traceCoinRace(target: number, denominations: readonly number[]): CoinRaceTrace {
  const greedy = traceGreedyCoins(target, denominations);
  const table = minimumCoinTable(target, greedy.denominations);
  const optimalCoins: number[] = [];
  let remaining = target;
  while (remaining > 0 && Number.isFinite(table[remaining] ?? Number.POSITIVE_INFINITY)) {
    const coin = greedy.denominations.find((candidate) => candidate <= remaining && table[remaining - candidate] === (table[remaining] ?? 0) - 1);
    if (coin === undefined) break;
    optimalCoins.push(coin);
    remaining -= coin;
  }
  const greedyCoins = greedy.coins;
  const frameCount = Math.max(greedyCoins.length, optimalCoins.length);
  const frames = Array.from({ length: frameCount + 1 }, (_, index): CoinRaceFrame => {
    const greedyPicked = greedyCoins.slice(0, index);
    const optimalPicked = optimalCoins.slice(0, index);
    return {
      step: index === frameCount ? "done" : index === 0 ? "start" : "compare",
      index,
      greedyPicked,
      optimalPicked,
      greedyRemaining: target - greedyPicked.reduce((sum, coin) => sum + coin, 0),
      optimalRemaining: target - optimalPicked.reduce((sum, coin) => sum + coin, 0)
    };
  });
  return {
    target,
    denominations: greedy.denominations,
    greedyCoins,
    optimalCoins,
    greedyCount: greedyCoins.length,
    optimalCount: optimalCoins.length,
    greedyIsOptimal: greedy.solved && greedyCoins.length === optimalCoins.length,
    frames
  };
}

export interface Activity { readonly id: string; readonly start: number; readonly finish: number; }
export type ActivityStep = "sort" | "consider" | "take" | "skip" | "done";
export interface ActivityFrame {
  readonly step: ActivityStep;
  readonly candidate: Activity | null;
  readonly lastFinish: number;
  readonly accepted: readonly Activity[];
  readonly rejected: readonly Activity[];
}
export interface ActivityTrace {
  readonly ordered: readonly Activity[];
  readonly accepted: readonly Activity[];
  readonly frames: readonly ActivityFrame[];
}
export const ACTIVITY_START_SENTINEL = Number.MIN_SAFE_INTEGER;

export function traceActivitySelection(activities: readonly Activity[]): ActivityTrace {
  if (activities.length < 1 || activities.length > 8) throw new Error("Activity selection requires one through eight intervals.");
  const ids = new Set<string>();
  for (const activity of activities) {
    if (activity.id === "" || ids.has(activity.id) || !Number.isSafeInteger(activity.start) || !Number.isSafeInteger(activity.finish) || activity.start >= activity.finish) {
      throw new Error("Activities require unique ids and safe-integer endpoints with start before finish.");
    }
    ids.add(activity.id);
  }
  const ordered = [...activities].sort((a, b) => a.finish - b.finish || a.start - b.start || (a.id < b.id ? -1 : a.id > b.id ? 1 : 0));
  const accepted: Activity[] = [];
  const rejected: Activity[] = [];
  const frames: ActivityFrame[] = [{ step: "sort", candidate: null, lastFinish: ACTIVITY_START_SENTINEL, accepted: [], rejected: [] }];
  let lastFinish = ACTIVITY_START_SENTINEL;
  for (const candidate of ordered) {
    frames.push({ step: "consider", candidate, lastFinish, accepted: [...accepted], rejected: [...rejected] });
    if (candidate.start >= lastFinish) {
      accepted.push(candidate);
      lastFinish = candidate.finish;
      frames.push({ step: "take", candidate, lastFinish, accepted: [...accepted], rejected: [...rejected] });
    } else {
      rejected.push(candidate);
      frames.push({ step: "skip", candidate, lastFinish, accepted: [...accepted], rejected: [...rejected] });
    }
  }
  frames.push({ step: "done", candidate: null, lastFinish, accepted: [...accepted], rejected: [...rejected] });
  return { ordered, accepted, frames };
}

export function parseActivityRows(rows: readonly { readonly id: string; readonly start: string; readonly finish: string }[]): readonly Activity[] | null {
  if (rows.length < 1 || rows.length > 8) return null;
  const ids = new Set<string>();
  const parsed: Activity[] = [];
  for (const row of rows) {
    const id = row.id.trim();
    const start = parseGreedyTarget(row.start, 0, 1_000);
    const finish = parseGreedyTarget(row.finish, 0, 1_000);
    if (id === "" || ids.has(id) || start === null || finish === null || start >= finish) return null;
    ids.add(id);
    parsed.push({ id, start, finish });
  }
  return parsed;
}

export type TwinStep = "sort" | "take" | "done";
export interface TwinFrame {
  readonly step: TwinStep;
  readonly taken: readonly number[];
  readonly mine: number;
  readonly theirs: number;
  readonly strictlyGreater: boolean;
}
export interface TwinTrace {
  readonly ordered: readonly number[];
  readonly total: number;
  readonly taken: readonly number[];
  readonly count: number;
  readonly frames: readonly TwinFrame[];
}

export function traceTwins(values: readonly number[]): TwinTrace {
  if (values.length === 0 || values.some((value) => !Number.isSafeInteger(value) || value < 1 || value > 100)) {
    throw new Error("Twins requires one or more coin values from 1 through 100.");
  }
  const ordered = [...values].sort((a, b) => b - a);
  const total = ordered.reduce((sum, value) => sum + value, 0);
  const taken: number[] = [];
  const frames: TwinFrame[] = [{ step: "sort", taken: [], mine: 0, theirs: total, strictlyGreater: false }];
  let mine = 0;
  for (const value of ordered) {
    if (mine > total - mine) break;
    taken.push(value);
    mine += value;
    frames.push({ step: "take", taken: [...taken], mine, theirs: total - mine, strictlyGreater: mine > total - mine });
  }
  frames.push({ step: "done", taken: [...taken], mine, theirs: total - mine, strictlyGreater: mine > total - mine });
  return { ordered, total, taken, count: taken.length, frames };
}

export const CHAT_TARGET = "hello";
export type ChatStep = "scan" | "match" | "done";
export interface ChatFrame {
  readonly step: ChatStep;
  readonly cursor: number;
  readonly matchedIndices: readonly number[];
  readonly nextTargetIndex: number;
}
export interface ChatTrace {
  readonly input: string;
  readonly matchedIndices: readonly number[];
  readonly accepted: boolean;
  readonly frames: readonly ChatFrame[];
}

export function traceChatRoom(input: string): ChatTrace {
  const parsed = parseLowercaseWord(input, 100);
  if (parsed === null || parsed !== input) throw new Error("Chat Room requires one through 100 lowercase letters.");
  const matchedIndices: number[] = [];
  const frames: ChatFrame[] = [];
  let nextTargetIndex = 0;
  for (let cursor = 0; cursor < input.length && nextTargetIndex < CHAT_TARGET.length; cursor += 1) {
    frames.push({ step: "scan", cursor, matchedIndices: [...matchedIndices], nextTargetIndex });
    if (input[cursor] === CHAT_TARGET[nextTargetIndex]) {
      matchedIndices.push(cursor);
      nextTargetIndex += 1;
      frames.push({ step: "match", cursor, matchedIndices: [...matchedIndices], nextTargetIndex });
    }
  }
  frames.push({ step: "done", cursor: input.length, matchedIndices: [...matchedIndices], nextTargetIndex });
  return { input, matchedIndices, accepted: nextTargetIndex === CHAT_TARGET.length, frames };
}

export interface SignBlock {
  readonly sign: 1 | -1;
  readonly start: number;
  readonly end: number;
  readonly values: readonly number[];
  readonly chosen: number;
  readonly chosenIndex: number;
}
export type AlternatingStep = "open-block" | "extend-block" | "replace-candidate" | "close-block" | "done";
export interface AlternatingFrame {
  readonly step: AlternatingStep;
  readonly index: number;
  readonly blocks: readonly SignBlock[];
  readonly currentSign: 1 | -1 | null;
  readonly currentBest: number | null;
  readonly runningSum: number;
}
export interface AlternatingTrace {
  readonly values: readonly number[];
  readonly blocks: readonly SignBlock[];
  readonly chosen: readonly number[];
  readonly length: number;
  readonly sum: number;
  readonly frames: readonly AlternatingFrame[];
}

export function traceAlternatingSubsequence(values: readonly number[]): AlternatingTrace {
  if (values.length === 0 || values.some((value) => !Number.isSafeInteger(value) || value === 0 || Math.abs(value) > 1_000_000_000)) {
    throw new Error("Alternating Subsequence requires nonzero safe integers with magnitude at most 1e9.");
  }
  const blocks: SignBlock[] = [];
  const frames: AlternatingFrame[] = [];
  let currentStart = 0;
  let currentSign: 1 | -1 = values[0] !== undefined && values[0] > 0 ? 1 : -1;
  let currentBest = values[0] ?? 0;
  let currentBestIndex = 0;
  let runningSum = 0;
  frames.push({ step: "open-block", index: 0, blocks: [], currentSign, currentBest, runningSum });
  for (let index = 1; index < values.length; index += 1) {
    const value = values[index] ?? 0;
    const sign: 1 | -1 = value > 0 ? 1 : -1;
    if (sign === currentSign) {
      if (value > currentBest) {
        currentBest = value;
        currentBestIndex = index;
        frames.push({ step: "replace-candidate", index, blocks: [...blocks], currentSign, currentBest, runningSum });
      } else {
        frames.push({ step: "extend-block", index, blocks: [...blocks], currentSign, currentBest, runningSum });
      }
      continue;
    }
    const block: SignBlock = {
      sign: currentSign,
      start: currentStart,
      end: index - 1,
      values: values.slice(currentStart, index),
      chosen: currentBest,
      chosenIndex: currentBestIndex
    };
    blocks.push(block);
    runningSum += currentBest;
    frames.push({ step: "close-block", index, blocks: [...blocks], currentSign: null, currentBest: null, runningSum });
    currentStart = index;
    currentSign = sign;
    currentBest = value;
    currentBestIndex = index;
    frames.push({ step: "open-block", index, blocks: [...blocks], currentSign, currentBest, runningSum });
  }
  const finalBlock: SignBlock = {
    sign: currentSign,
    start: currentStart,
    end: values.length - 1,
    values: values.slice(currentStart),
    chosen: currentBest,
    chosenIndex: currentBestIndex
  };
  blocks.push(finalBlock);
  runningSum += currentBest;
  frames.push({ step: "close-block", index: values.length - 1, blocks: [...blocks], currentSign: null, currentBest: null, runningSum });
  frames.push({ step: "done", index: values.length, blocks: [...blocks], currentSign: null, currentBest: null, runningSum });
  return { values: [...values], blocks, chosen: blocks.map((block) => block.chosen), length: blocks.length, sum: runningSum, frames };
}
