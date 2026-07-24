export interface ProgrammingFundamentalsSnippets {
  readonly compilation: {
    readonly source: string;
    readonly commands: string;
    readonly question: string;
  };
  readonly conditionals: {
    readonly code: string;
    readonly acceptedVariable: string;
    readonly strategyVariable: string;
  };
  readonly forLoop: { readonly code: string };
  readonly whileLoop: {
    readonly code: string;
    readonly remainingVariable: string;
  };
  readonly loopControl: { readonly code: string };
  readonly iterationQuestions: {
    readonly noIterations: string;
    readonly counting: string;
    readonly doublingFor: string;
    readonly whileCountdown: string;
    readonly whileDoubling: string;
    readonly infiniteFor: string;
    readonly emptyForPart: string;
    readonly continueControl: string;
    readonly breakControl: string;
  };
  readonly operatorQuestions: {
    readonly integerDivision: string;
    readonly decimalDivision: string;
  };
  readonly vectorQuestions: {
    readonly sizeAfterPushPop: string;
    readonly indexUpdate: string;
    readonly growFromBack: string;
    readonly sumTraversal: string;
  };
  readonly vectorOperations: { readonly code: string };
  readonly recursionExamples: {
    readonly countdown: string;
    readonly fibonacci: string;
  };
  readonly recursionQuestions: {
    readonly baseCase: string;
    readonly factorialCall: string;
    readonly countdownCall: string;
    readonly fibonacciCall: string;
    readonly missingBaseCase: string;
  };
  readonly functionCall: {
    readonly code: string;
    readonly functionName: string;
    readonly resultVariable: string;
  };
  readonly vectorTraversal: { readonly code: string };
  readonly recursion: { readonly code: string };
}
