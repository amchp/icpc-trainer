import { describe, expect, it } from "vitest";

import {
  INITIAL_CHOMP_STATE,
  applyChompMove,
  applyStonesMove,
  hasLegalPlateMove,
  isLegalPlateCenter,
  isWinningChompState,
  placePlate,
  type PlateGameState,
  type StonesGameState
} from "./gameModels.js";

describe("Plate Game model", () => {
  it("accepts touching plates and exact boundaries while rejecting overlap and overflow", () => {
    expect(isLegalPlateCenter([], { x: 1, y: 1 })).toBe(true);
    expect(isLegalPlateCenter([], { x: 6, y: 6 })).toBe(true);
    expect(isLegalPlateCenter([], { x: 0.999, y: 3 })).toBe(false);
    expect(isLegalPlateCenter([], { x: 3, y: 6.001 })).toBe(false);
    expect(isLegalPlateCenter([{ x: 2, y: 2 }], { x: 4, y: 2 })).toBe(true);
    expect(isLegalPlateCenter([{ x: 2, y: 2 }], { x: 3.999, y: 2 })).toBe(false);
  });

  it("tracks two-dimensional placements and alternates players", () => {
    const initial: PlateGameState = { centers: [], activePlayer: 1, winner: null, moveCount: 0 };
    const opening = placePlate(initial, { x: 2, y: 2 });
    expect(opening.valid).toBe(true);
    expect(opening.state.activePlayer).toBe(2);

    const response = placePlate(opening.state, { x: 5, y: 5 });
    expect(response.valid).toBe(true);
    expect(response.state.centers).toEqual([{ x: 2, y: 2 }, { x: 5, y: 5 }]);
  });

  it("detects a covered 7 by 7 board and awards the final move", () => {
    let state: PlateGameState = { centers: [], activePlayer: 1, winner: null, moveCount: 0 };
    for (const y of [1, 3, 5]) {
      for (const x of [1, 3, 5]) state = placePlate(state, { x, y }).state;
    }

    expect(state.centers).toHaveLength(9);
    expect(hasLegalPlateMove(state.centers)).toBe(false);
    expect(state.winner).toBe(1);
  });

  it("supports a 2 by 2 board with exactly one legal center", () => {
    const dimensions = { width: 2, height: 2 };
    const initial: PlateGameState = { centers: [], activePlayer: 1, winner: null, moveCount: 0 };

    expect(isLegalPlateCenter([], { x: 1, y: 1 }, dimensions)).toBe(true);
    expect(isLegalPlateCenter([], { x: 1.001, y: 1 }, dimensions)).toBe(false);
    const transition = placePlate(initial, { x: 1, y: 1 }, dimensions);
    expect(transition.valid).toBe(true);
    expect(hasLegalPlateMove(transition.state.centers, dimensions)).toBe(false);
    expect(transition.state.winner).toBe(1);
  });

  it("keeps a non-tenth boundary witness reachable as the final legal placement", () => {
    const centers = [
      { x: 2.1, y: 5.6 }, { x: 4.2, y: 5.2 }, { x: 1, y: 1.5 },
      { x: 4.5, y: 2.3 }, { x: 2.1, y: 3.3 }, { x: 6, y: 4 }
    ];
    const witness = { x: 2.9364916731, y: 1 };
    const state: PlateGameState = { centers, activePlayer: 1, winner: null, moveCount: centers.length };

    expect(isLegalPlateCenter(centers, witness)).toBe(true);
    expect(hasLegalPlateMove(centers)).toBe(true);
    const transition = placePlate(state, witness);
    expect(transition.valid).toBe(true);
    expect(transition.state.winner).toBe(1);
  });
});

describe("25 Stones model", () => {
  it("allows one to three stones, rejects unavailable moves, and detects the final move", () => {
    const initial: StonesGameState = { remaining: 25, activePlayer: 1, winner: null, lastMove: null };
    expect(applyStonesMove(initial, 0).valid).toBe(false);
    expect(applyStonesMove(initial, 4).valid).toBe(false);

    const almostDone: StonesGameState = { ...initial, remaining: 2 };
    expect(applyStonesMove(almostDone, 3).valid).toBe(false);
    const done = applyStonesMove(almostDone, 2);
    expect(done.valid).toBe(true);
    expect(done.state).toMatchObject({ remaining: 0, winner: 1, lastMove: 2 });
  });

  it("supports the complement-to-four strategy", () => {
    const start: StonesGameState = { remaining: 25, activePlayer: 1, winner: null, lastMove: null };
    const leaveTwentyFour = applyStonesMove(start, 1).state;
    const opponent = applyStonesMove(leaveTwentyFour, 3).state;
    const complement = applyStonesMove(opponent, 1).state;
    expect(complement.remaining).toBe(20);
  });
});

describe("Chomp model", () => {
  it("preserves a non-increasing row shape after every bite", () => {
    const moved = applyChompMove(INITIAL_CHOMP_STATE, { row: 1, column: 2 });
    expect(moved).toEqual([7, 2, 2, 2, 2]);
    expect(moved.every((length, index) => index === 0 || moved[index - 1]! >= length)).toBe(true);
  });

  it("treats the poison-only state as losing", () => {
    expect(isWinningChompState([1, 0, 0, 0, 0])).toBe(false);
  });

  it("classifies the initial board as winning without exposing a move", () => {
    expect(isWinningChompState(INITIAL_CHOMP_STATE)).toBe(true);
  });
});
