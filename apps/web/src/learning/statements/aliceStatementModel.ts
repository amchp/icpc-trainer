export interface AlicePoint { readonly x: number; readonly y: number }
export interface AliceExample {
  readonly moves: string;
  readonly target: AlicePoint;
  readonly answer: "YES" | "NO";
  readonly positions: readonly AlicePoint[];
}

const deltas: Readonly<Record<string, AlicePoint>> = {
  N: { x: 0, y: 1 }, E: { x: 1, y: 0 }, S: { x: 0, y: -1 }, W: { x: -1, y: 0 }
};

/** Exact reachability for an endlessly repeated pattern; a short preview is not a NO proof. */
export function buildAliceExample(moves: string, x: number, y: number): AliceExample {
  if (!/^[NSEW]{1,10}$/.test(moves) || !Number.isInteger(x) || !Number.isInteger(y) || x < 1 || x > 10 || y < 1 || y > 10) {
    throw new Error("Expected 1–10 directions and integer target coordinates from 1 to 10.");
  }
  const prefixes: AlicePoint[] = [];
  let current = { x: 0, y: 0 };
  for (const direction of moves) {
    const delta = deltas[direction]!;
    current = { x: current.x + delta.x, y: current.y + delta.y };
    prefixes.push(current);
  }
  const drift = current;
  let firstHit = Infinity;
  prefixes.forEach((point, index) => {
    const dx = x - point.x;
    const dy = y - point.y;
    const cycles = drift.x !== 0 ? dx / drift.x : drift.y !== 0 ? dy / drift.y : 0;
    if (Number.isInteger(cycles) && cycles >= 0 && cycles * drift.x === dx && cycles * drift.y === dy) {
      firstHit = Math.min(firstHit, cycles * moves.length + index + 1);
    }
  });
  const found = Number.isFinite(firstHit);
  // NO examples show two repetitions, while their answer above considers every repetition.
  const steps = found ? firstHit : moves.length * 2;
  const positions: AlicePoint[] = [{ x: 0, y: 0 }];
  for (let step = 0; step < steps; step++) {
    const previous = positions[step]!;
    const delta = deltas[moves[step % moves.length]!]!;
    positions.push({ x: previous.x + delta.x, y: previous.y + delta.y });
  }
  return { moves, target: { x, y }, answer: found ? "YES" : "NO", positions };
}
