import type { ProgrammingFundamentalsSnippets } from "./programmingFundamentalsSnippets.types.js";

export const programmingFundamentalsSpanishSnippets: ProgrammingFundamentalsSnippets = {
  compilation: {
    source: `#include <bits/stdc++.h>
using namespace std;

int main() {
  cout << "¡Hola, C++!\\n";
  return 0;
}`,
    commands: `g++ main.cpp -o programa
./programa`,
    question: `g++ main.cpp -o programa`
  },
  inputOutput: {
    word: `string nombre;
cin >> nombre;

cout << "Hola, " << nombre << '\\n';`,
    line: `string mensaje;
getline(cin, mensaje);

cout << "Escribiste: " << mensaje << '\\n';`,
    questions: {
      fullLine: `string nombre;
getline(cin, nombre);
cout << "Hola, " << nombre;`,
      oneWord: `string nombre;
cin >> nombre;
cout << "Hola, " << nombre;`,
      mixedLine: `int resueltos;
string equipo;

cin >> resueltos;
getline(cin >> ws, equipo);
cout << equipo << ": " << resueltos;`,
      reorderNames: `string nombre, apellido;
cin >> nombre >> apellido;
cout << apellido << ", " << nombre;`
    }
  },
  conditionals: {
    code: `if (solucion_aceptada) {
  cout << "Siguiente problema";
} else if (tiene_estrategia) {
  cout << "Sigue intentando";
} else {
  cout << "Revisa una pista";
}`,
    acceptedVariable: "solucion_aceptada",
    strategyVariable: "tiene_estrategia"
  },
  forLoop: {
    code: `for (int i = 1; i <= 5; ++i) {
  cout << i << ' ';
}
// imprime: 1 2 3 4 5`
  },
  whileLoop: {
    code: `int restantes = 3;
while (restantes > 0) {
  cout << restantes << ' ';
  --restantes;
}
// imprime: 3 2 1`,
    remainingVariable: "restantes"
  },
  loopControl: {
    code: `for (int i = 1; i <= 10; ++i) {
  if (i > 7) break;            // termina todo el ciclo
  if (i % 2 == 0) continue;    // omite solo esta iteración
  cout << i << ' ';
}
// imprime: 1 3 5 7`
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
    whileCountdown: `int restantes = 3;
while (restantes > 0) {
  cout << restantes << ' ';
  --restantes;
}`,
    whileDoubling: `int valor = 1;
while (valor < 10) {
  cout << valor << ' ';
  valor *= 2;
}`,
    infiniteFor: `for (;;) {
  cout << "ciclo ";
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
double resultado = a / b;`,
    decimalDivision: `double exacto = 5.0 / 2;`
  },
  vectorQuestions: {
    sizeAfterPushPop: `vector<int> valores = {1, 2, 3};
valores.push_back(4);
valores.pop_back();
cout << valores.size();`,
    indexUpdate: `vector<int> valores = {3, 1, 4};
valores[1] *= 5;
cout << valores[1];`,
    growFromBack: `vector<int> valores = {2, 4};
valores.push_back(valores.back() * 2);
cout << valores.back();`,
    sumTraversal: `vector<int> valores = {2, 4, 6};
int total = 0;
for (int i = 0; i < valores.size(); ++i) {
  total += valores[i];
}
cout << total;`
  },
  vectorOperations: {
    code: `vector<int> valores = {4, 8, 15};
valores.push_back(16);       // {4, 8, 15, 16}
valores[1] = 10;             // {4, 10, 15, 16}

cout << valores.front();     // 4
cout << valores.back();      // 16

valores.pop_back();          // {4, 10, 15}
cout << valores.size();      // 3`
  },
  recursionExamples: {
    countdown: `void cuenta_regresiva(int n) {
  if (n == 0) return;
  cout << n << ' ';
  cuenta_regresiva(n - 1);
}

cuenta_regresiva(3);`,
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
    countdownCall: `void cuenta_regresiva(int n) {
  if (n == 0) return;
  cout << n << ' ';
  cuenta_regresiva(n - 1);
}

cuenta_regresiva(4);`,
    fibonacciCall: `int fibonacci(int n) {
  if (n <= 1) return n;
  return fibonacci(n - 1) + fibonacci(n - 2);
}

cout << fibonacci(5);`,
    missingBaseCase: `void cuenta_regresiva(int n) {
  cout << n << ' ';
  cuenta_regresiva(n - 1);
}

cuenta_regresiva(3);`
  },
  functionCall: {
    code: `int calcular_puntaje(int resueltos, int penalizacion) {
  int puntaje = resueltos * 100;
  if (penalizacion > 60) {
    puntaje -= 50;
  }
  return puntaje;
}

int main() {
  int puntaje_final = calcular_puntaje(3, 75); // 250
  cout << puntaje_final;
  return 0;
}`,
    functionName: "calcular_puntaje",
    solvedVariable: "resueltos",
    penaltyVariable: "penalizacion",
    resultVariable: "puntaje",
    callerVariable: "puntaje_final"
  },
  functionExamples: {
    earlyReturn: `string describir_puntaje(int puntaje) {
  if (puntaje < 0) return "invalido";
  if (puntaje >= 90) return "excelente";
  return "sigue practicando";
}`,
    helperVariable: `string describir_puntaje(int puntaje) {
  string resultado;
  if (puntaje < 0) {
    resultado = "invalido";
  } else if (puntaje >= 90) {
    resultado = "excelente";
  } else {
    resultado = "sigue practicando";
  }
  return resultado;
}`
  },
  vectorTraversal: {
    code: `vector<int> valores = {1, 2, 3};
valores.push_back(4);

for (int i = 0; i < valores.size(); ++i) {
  cout << valores[i] << ' ';
}
// imprime: 1 2 3 4`
  },
  recursion: {
    code: `int factorial(int x) {
  if (x == 1) return 1;
  return x * factorial(x - 1);
}`
  }
};
