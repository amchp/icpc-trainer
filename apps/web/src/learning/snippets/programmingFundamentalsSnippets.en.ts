import type { ProgrammingFundamentalsSnippets } from "./programmingFundamentalsSnippets.types.js";

export const programmingFundamentalsEnglishSnippets: ProgrammingFundamentalsSnippets = {
  compilation: {
    source: `#include <bits/stdc++.h>
using namespace std;

int main() {
  cout << "Hello, C++!\\n";
  return 0;
}`,
    commands: `g++ main.cpp -o program
./program`,
    question: `g++ main.cpp -o program`
  },
  conditionals: {
    code: `if (solution_accepted) {
  cout << "Next problem";
} else if (has_strategy) {
  cout << "Keep trying";
} else {
  cout << "Review a hint";
}`,
    acceptedVariable: "solution_accepted",
    strategyVariable: "has_strategy"
  },
  forLoop: {
    code: `for (int i = 1; i <= 5; ++i) {
  cout << i << ' ';
}
// prints: 1 2 3 4 5`
  },
  whileLoop: {
    code: `int remaining = 3;
while (remaining > 0) {
  cout << remaining << ' ';
  --remaining;
}
// prints: 3 2 1`,
    remainingVariable: "remaining"
  },
  loopControl: {
    code: `for (int i = 1; i <= 10; ++i) {
  if (i > 7) break;            // stop the entire loop
  if (i % 2 == 0) continue;    // skip only this iteration
  cout << i << ' ';
}
// prints: 1 3 5 7`
  },
  iterationQuestions: {
    noIterations: `for (int i = 5; i >= 6; --i) {
  cout << i << ' ';
}`,
    counting: `for (int i = 1; i <= 3; ++i) {
  cout << i << ' ';
}`,
    doublingFor: `for (int i = 1; i <= 8; i *= 2) {
  cout << i << ' ';
}`,
    whileCountdown: `int remaining = 3;
while (remaining > 0) {
  cout << remaining << ' ';
  --remaining;
}`,
    whileDoubling: `int value = 1;
while (value < 10) {
  cout << value << ' ';
  value *= 2;
}`,
    infiniteFor: `for (;;) {
  cout << "loop ";
}`,
    emptyForPart: `for (int i = 3; ; --i) {
  if (i == 0) break;
}`,
    continueControl: `for (int i = 1; i <= 5; ++i) {
  if (i == 3) continue;
  cout << i << ' ';
}`,
    breakControl: `for (int i = 1; i <= 5; ++i) {
  if (i == 3) break;
  cout << i << ' ';
}`
  },
  operatorQuestions: {
    integerDivision: `int a = 5;
int b = 2;
double result = a / b;`,
    decimalDivision: `double exact = 5.0 / 2;`
  },
  vectorQuestions: {
    sizeAfterPushPop: `vector<int> values = {1, 2, 3};
values.push_back(4);
values.pop_back();
cout << values.size();`,
    indexUpdate: `vector<int> values = {3, 1, 4};
values[1] *= 5;
cout << values[1];`,
    growFromBack: `vector<int> values = {2, 4};
values.push_back(values.back() * 2);
cout << values.back();`,
    sumTraversal: `vector<int> values = {2, 4, 6};
int total = 0;
for (int i = 0; i < values.size(); ++i) {
  total += values[i];
}
cout << total;`
  },
  vectorOperations: {
    code: `vector<int> values = {4, 8, 15};
values.push_back(16);       // {4, 8, 15, 16}
values[1] = 10;             // {4, 10, 15, 16}

cout << values.front();     // 4
cout << values.back();      // 16

values.pop_back();          // {4, 10, 15}
cout << values.size();      // 3`
  },
  recursionExamples: {
    countdown: `void countdown(int n) {
  if (n == 0) return;
  cout << n << ' ';
  countdown(n - 1);
}

countdown(3);`,
    fibonacci: `int fibonacci(int n) {
  if (n <= 1) return n;
  return fibonacci(n - 1) + fibonacci(n - 2);
}

cout << fibonacci(4); // 3`
  },
  recursionQuestions: {
    baseCase: `int factorial(int x) {
  if (x == 1) return 1;
  return x * factorial(x - 1);
}`,
    factorialCall: `int factorial(int x) {
  if (x == 1) return 1;
  return x * factorial(x - 1);
}

cout << factorial(3);`,
    countdownCall: `void countdown(int n) {
  if (n == 0) return;
  cout << n << ' ';
  countdown(n - 1);
}

countdown(4);`,
    fibonacciCall: `int fibonacci(int n) {
  if (n <= 1) return n;
  return fibonacci(n - 1) + fibonacci(n - 2);
}

cout << fibonacci(5);`,
    missingBaseCase: `void countdown(int n) {
  cout << n << ' ';
  countdown(n - 1);
}

countdown(3);`
  },
  functionCall: {
    code: `int calculate_score(int solved, int penalty) {
  int score = solved * 100;
  if (penalty > 60) {
    score -= 50;
  }
  return score;
}

int main() {
  int final_score = calculate_score(3, 75); // 250
  cout << final_score;
  return 0;
}`,
    functionName: "calculate_score",
    solvedVariable: "solved",
    penaltyVariable: "penalty",
    resultVariable: "score",
    callerVariable: "final_score"
  },
  functionExamples: {
    earlyReturn: `string describe_score(int score) {
  if (score < 0) return "invalid";
  if (score >= 90) return "excellent";
  return "keep practicing";
}`,
    helperVariable: `string describe_score(int score) {
  string result;
  if (score < 0) {
    result = "invalid";
  } else if (score >= 90) {
    result = "excellent";
  } else {
    result = "keep practicing";
  }
  return result;
}`
  },
  vectorTraversal: {
    code: `vector<int> values = {1, 2, 3};
values.push_back(4);

for (int i = 0; i < values.size(); ++i) {
  cout << values[i] << ' ';
}
// prints: 1 2 3 4`
  },
  recursion: {
    code: `int factorial(int x) {
  if (x == 1) return 1;
  return x * factorial(x - 1);
}`
  }
};
