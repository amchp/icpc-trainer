export type Player = 1 | 2;

export const otherPlayer = (player: Player): Player => player === 1 ? 2 : 1;

export const PLATE_BOARD_SIZE = 7;
export const PLATE_RADIUS = 1;
export interface PlateBoardDimensions {
  readonly width: number;
  readonly height: number;
}
export const DEFAULT_PLATE_DIMENSIONS: PlateBoardDimensions = {
  width: PLATE_BOARD_SIZE,
  height: PLATE_BOARD_SIZE
};
const PLATE_DIAMETER = PLATE_RADIUS * 2;
const EPSILON = 1e-9;

export interface PlateCenter {
  readonly x: number;
  readonly y: number;
}

export interface PlateGameState {
  readonly centers: readonly PlateCenter[];
  readonly activePlayer: Player;
  readonly winner: Player | null;
  readonly moveCount: number;
}

export interface GameTransition<State> {
  readonly state: State;
  readonly valid: boolean;
}

const squaredDistance = (left: PlateCenter, right: PlateCenter): number =>
  (left.x - right.x) ** 2 + (left.y - right.y) ** 2;

const hasUsablePlateDimensions = (dimensions: PlateBoardDimensions): boolean =>
  Number.isFinite(dimensions.width)
  && Number.isFinite(dimensions.height)
  && dimensions.width >= PLATE_DIAMETER
  && dimensions.height >= PLATE_DIAMETER;

export const isLegalPlateCenter = (
  centers: readonly PlateCenter[],
  center: PlateCenter,
  dimensions: PlateBoardDimensions = DEFAULT_PLATE_DIMENSIONS
): boolean => {
  if (!hasUsablePlateDimensions(dimensions)) return false;
  const maximumX = dimensions.width - PLATE_RADIUS;
  const maximumY = dimensions.height - PLATE_RADIUS;
  if (!Number.isFinite(center.x) || !Number.isFinite(center.y)) return false;
  if (center.x < PLATE_RADIUS - EPSILON || center.x > maximumX + EPSILON) return false;
  if (center.y < PLATE_RADIUS - EPSILON || center.y > maximumY + EPSILON) return false;
  return centers.every((placed) => squaredDistance(placed, center) >= PLATE_DIAMETER ** 2 - EPSILON);
};

const addCandidate = (candidates: PlateCenter[], candidate: PlateCenter): void => {
  if (!candidates.some((current) => squaredDistance(current, candidate) < EPSILON)) candidates.push(candidate);
};

export const plateCandidateCenters = (
  centers: readonly PlateCenter[],
  dimensions: PlateBoardDimensions = DEFAULT_PLATE_DIMENSIONS
): readonly PlateCenter[] => {
  if (!hasUsablePlateDimensions(dimensions)) return [];
  const minimum = PLATE_RADIUS;
  const maximumX = dimensions.width - PLATE_RADIUS;
  const maximumY = dimensions.height - PLATE_RADIUS;
  const candidates: PlateCenter[] = [
    { x: minimum, y: minimum }, { x: minimum, y: maximumY },
    { x: maximumX, y: minimum }, { x: maximumX, y: maximumY }
  ];

  for (const center of centers) {
    for (const x of [minimum, maximumX]) {
      const remaining = PLATE_DIAMETER ** 2 - (x - center.x) ** 2;
      if (remaining >= -EPSILON) {
        const offset = Math.sqrt(Math.max(0, remaining));
        addCandidate(candidates, { x, y: center.y - offset });
        addCandidate(candidates, { x, y: center.y + offset });
      }
    }
    for (const y of [minimum, maximumY]) {
      const remaining = PLATE_DIAMETER ** 2 - (y - center.y) ** 2;
      if (remaining >= -EPSILON) {
        const offset = Math.sqrt(Math.max(0, remaining));
        addCandidate(candidates, { x: center.x - offset, y });
        addCandidate(candidates, { x: center.x + offset, y });
      }
    }
  }

  for (let leftIndex = 0; leftIndex < centers.length; leftIndex += 1) {
    for (let rightIndex = leftIndex + 1; rightIndex < centers.length; rightIndex += 1) {
      const left = centers[leftIndex]!;
      const right = centers[rightIndex]!;
      const dx = right.x - left.x;
      const dy = right.y - left.y;
      const distance = Math.hypot(dx, dy);
      if (distance < EPSILON || distance > PLATE_DIAMETER * 2 + EPSILON) continue;
      const midpoint = { x: (left.x + right.x) / 2, y: (left.y + right.y) / 2 };
      const height = Math.sqrt(Math.max(0, PLATE_DIAMETER ** 2 - (distance / 2) ** 2));
      const perpendicular = { x: -dy / distance, y: dx / distance };
      addCandidate(candidates, { x: midpoint.x + perpendicular.x * height, y: midpoint.y + perpendicular.y * height });
      addCandidate(candidates, { x: midpoint.x - perpendicular.x * height, y: midpoint.y - perpendicular.y * height });
    }
  }

  return candidates;
};

export const hasLegalPlateMove = (
  centers: readonly PlateCenter[],
  dimensions: PlateBoardDimensions = DEFAULT_PLATE_DIMENSIONS
): boolean => plateCandidateCenters(centers, dimensions)
  .some((candidate) => isLegalPlateCenter(centers, candidate, dimensions));

export const placePlate = (
  state: PlateGameState,
  center: PlateCenter,
  dimensions: PlateBoardDimensions = DEFAULT_PLATE_DIMENSIONS
): GameTransition<PlateGameState> => {
  if (state.winner !== null || !isLegalPlateCenter(state.centers, center, dimensions)) return { state, valid: false };
  const centers = [...state.centers, center];
  const winner = hasLegalPlateMove(centers, dimensions) ? null : state.activePlayer;
  return {
    valid: true,
    state: {
      centers,
      activePlayer: winner ?? otherPlayer(state.activePlayer),
      winner,
      moveCount: state.moveCount + 1
    }
  };
};

export interface StonesGameState {
  readonly remaining: number;
  readonly activePlayer: Player;
  readonly winner: Player | null;
  readonly lastMove: number | null;
}

export const applyStonesMove = (state: StonesGameState, take: number): GameTransition<StonesGameState> => {
  if (state.winner !== null || !Number.isInteger(take) || take < 1 || take > 3 || take > state.remaining) {
    return { state, valid: false };
  }
  const remaining = state.remaining - take;
  const winner = remaining === 0 ? state.activePlayer : null;
  return {
    valid: true,
    state: {
      remaining,
      activePlayer: winner ?? otherPlayer(state.activePlayer),
      winner,
      lastMove: take
    }
  };
};

export type ChompState = readonly number[];

export interface ChompMove {
  readonly row: number;
  readonly column: number;
}

export const INITIAL_CHOMP_STATE: ChompState = Object.freeze([7, 7, 7, 7, 7]);

export const isChompCellPresent = (state: ChompState, move: ChompMove): boolean =>
  Number.isInteger(move.row) && Number.isInteger(move.column) && move.row >= 0 && move.row < state.length && move.column >= 0 && move.column < (state[move.row] ?? 0);

export const isPoisonMove = (move: ChompMove): boolean => move.row === 0 && move.column === 0;

export const applyChompMove = (state: ChompState, move: ChompMove): ChompState => {
  if (!isChompCellPresent(state, move)) return state;
  return state.map((length, row) => row < move.row ? length : Math.min(length, move.column));
};

export const chompSafeMoves = (state: ChompState): readonly ChompMove[] => {
  const moves: ChompMove[] = [];
  state.forEach((length, row) => {
    for (let column = 0; column < length; column += 1) {
      const move = { row, column };
      if (!isPoisonMove(move)) moves.push(move);
    }
  });
  return moves;
};

const chompWinningMemo = new Map<string, boolean>();

const chompKey = (state: ChompState): string => state.join(",");

export const isWinningChompState = (state: ChompState): boolean => {
  const key = chompKey(state);
  const known = chompWinningMemo.get(key);
  if (known !== undefined) return known;
  const winning = chompSafeMoves(state).some((move) => !isWinningChompState(applyChompMove(state, move)));
  chompWinningMemo.set(key, winning);
  return winning;
};
