export interface TimeComplexitySnippets {
  readonly countTrace: string;
  readonly pairScan: string;
  readonly sortCopy: string;
  readonly hashSet: string;
  readonly answerExamples: {
    readonly memoryInput: string;
    readonly memoryCopy: string;
    readonly memoryHash: string;
  };
  readonly loopTricks: {
    readonly linear: string;
    readonly independentNested: string;
    readonly sequential: string;
    readonly triangular: string;
    readonly doubling: string;
    readonly linearLogarithmic: string;
  };
  readonly recursionTricks: {
    readonly countdown: string;
    readonly halving: string;
    readonly branching: string;
  };
}
