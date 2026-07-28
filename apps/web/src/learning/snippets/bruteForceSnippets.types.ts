export interface BruteForceSnippets {
  readonly recursivePermutation: string;
  readonly iterativePermutation: string;
  readonly recursiveSubset: string;
  readonly bitmaskSubset: string;
  readonly names: {
    readonly current: string;
    readonly used: string;
    readonly order: string;
    readonly index: string;
    readonly decisions: string;
    readonly mask: string;
    readonly permutationFunction: string;
    readonly subsetFunction: string;
    readonly visitFunction: string;
  };
}
