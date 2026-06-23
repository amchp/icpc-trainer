type ContestStar = 1 | 2 | 3 | 4 | 5;

export const CONTEST_STAR_BASE_RATINGS: Record<ContestStar, number> = {
  1: 800,
  2: 1200,
  3: 1600,
  4: 2000,
  5: 2400
};

interface EstimateProblemRatingInput {
  readonly stars: number;
  readonly participants: number;
  readonly solves: number;
  readonly maxSolvesInContest: number;
}

interface EstimateSolvePercentageInput {
  readonly participants: number;
  readonly solves: number;
  readonly maxSolvesInContest: number;
}

const isContestStar = (value: number): value is ContestStar =>
  Number.isInteger(value) && value >= 1 && value <= 5;

const clamp = (value: number, min: number, max: number): number =>
  Math.max(min, Math.min(max, value));

const roundToNearestHundred = (value: number): number =>
  Math.round(value / 100) * 100;

const solveDenominator = (participants: number, maxSolvesInContest: number): number =>
  Math.max(participants, maxSolvesInContest);

export const estimateSolvePercentage = ({
  participants,
  solves,
  maxSolvesInContest
}: EstimateSolvePercentageInput): number => {
  const denominator = solveDenominator(participants, maxSolvesInContest);

  if (denominator <= 0) {
    return 0;
  }

  return Math.round(clamp(solves / denominator, 0, 1) * 100);
};

export const estimateProblemRating = ({
  stars,
  participants,
  solves,
  maxSolvesInContest
}: EstimateProblemRatingInput): number => {
  if (!isContestStar(stars)) {
    return 0;
  }

  const denominator = solveDenominator(participants, maxSolvesInContest);

  if (denominator <= 0) {
    return 0;
  }

  const base = CONTEST_STAR_BASE_RATINGS[stars];
  const solveRate = clamp(solves / denominator, 0.01, 0.99);
  const rawRating = base + 400 * Math.log10((1 - solveRate) / solveRate);
  const boundedRating = clamp(rawRating, base - 500, base + 700);

  return roundToNearestHundred(boundedRating);
};

export const estimateContestStarsFromName = (name: string): number => {
  if (/\bworld\s+finals\b/i.test(name)) {
    return 5;
  }

  if (/\b(?:icpc|cerc|regional)\b/i.test(name)) {
    return 4;
  }

  return 0;
};
