import { describe, expect, it } from "vitest";

import { estimateProblemRating, estimateSolvePercentage } from "../judges/sync/problemRating.js";

describe("estimateProblemRating", () => {
  it("uses the contest star base when half of participants solve the problem", () => {
    expect(estimateProblemRating({
      stars: 3,
      participants: 100,
      solves: 50,
      maxSolvesInContest: 50
    })).toBe(1600);
  });

  it("rates high solve-rate problems easier than the contest base", () => {
    expect(estimateProblemRating({
      stars: 3,
      participants: 100,
      solves: 80,
      maxSolvesInContest: 80
    })).toBe(1400);
  });

  it("rates low solve-rate problems harder than the contest base", () => {
    expect(estimateProblemRating({
      stars: 3,
      participants: 100,
      solves: 20,
      maxSolvesInContest: 20
    })).toBe(1800);
  });

  it("rates hard four-star problems near the upper side of the contest base", () => {
    expect(estimateProblemRating({
      stars: 4,
      participants: 100,
      solves: 10,
      maxSolvesInContest: 10
    })).toBe(2400);
  });

  it("keeps invalid stars unrated", () => {
    expect(estimateProblemRating({
      stars: 0,
      participants: 100,
      solves: 50,
      maxSolvesInContest: 50
    })).toBe(0);
  });

  it("keeps contests without a denominator unrated", () => {
    expect(estimateProblemRating({
      stars: 3,
      participants: 0,
      solves: 0,
      maxSolvesInContest: 0
    })).toBe(0);
  });

  it("uses the maximum contest solves when solves exceed parsed participants", () => {
    expect(estimateProblemRating({
      stars: 4,
      participants: 3,
      solves: 235,
      maxSolvesInContest: 235
    })).toBe(1500);
  });

  it("clamps zero-solve problems to the contest upper bound", () => {
    expect(estimateProblemRating({
      stars: 3,
      participants: 100,
      solves: 0,
      maxSolvesInContest: 50
    })).toBe(2300);
  });
});

describe("estimateSolvePercentage", () => {
  it("rounds solve rate to an integer percentage", () => {
    expect(estimateSolvePercentage({
      participants: 100,
      solves: 33,
      maxSolvesInContest: 80
    })).toBe(33);
  });

  it("uses the maximum contest solves when solves exceed parsed participants", () => {
    expect(estimateSolvePercentage({
      participants: 3,
      solves: 128,
      maxSolvesInContest: 235
    })).toBe(54);
  });

  it("keeps contests without a denominator at zero percent", () => {
    expect(estimateSolvePercentage({
      participants: 0,
      solves: 0,
      maxSolvesInContest: 0
    })).toBe(0);
  });

  it("clamps percentages to 100", () => {
    expect(estimateSolvePercentage({
      participants: 10,
      solves: 12,
      maxSolvesInContest: 10
    })).toBe(100);
  });
});
