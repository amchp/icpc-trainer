import type { BruteForceSnippets } from "./bruteForceSnippets.types.js";

export const bruteForceSnippetsEs: BruteForceSnippets = {
  recursivePermutation: `vector<char> actual;
vector<bool> usado(elementos.size(), false);

void generar() {
  if (actual.size() == elementos.size()) {
    visitar(actual);
    return;
  }
  for (int i = 0; i < elementos.size(); ++i) {
    if (usado[i]) continue;
    usado[i] = true;
    actual.push_back(elementos[i]);
    generar();
    actual.pop_back();
    usado[i] = false;
  }
}`,
  iterativePermutation: `sort(orden.begin(), orden.end());
do {
  visitar(orden);
} while (next_permutation(orden.begin(), orden.end()));`,
  recursiveSubset: `vector<int> decisiones;

void generar(int indice) {
  if (indice == n) {
    visitar(decisiones);
    return;
  }
  decisiones.push_back(0);
  generar(indice + 1);
  decisiones.pop_back();
  decisiones.push_back(1);
  generar(indice + 1);
  decisiones.pop_back();
}`,
  bitmaskSubset: `for (int mascara = 0; mascara < (1 << n); ++mascara) {
  vector<int> decisiones;
  for (int bit = n - 1; bit >= 0; --bit) {
    decisiones.push_back((mascara & (1 << bit)) != 0);
  }
  visitar(decisiones);
}`,
  names: {
    current: "actual",
    used: "usado",
    order: "orden",
    index: "indice",
    decisions: "decisiones",
    mask: "mascara",
    permutationFunction: "generar",
    subsetFunction: "generar",
    visitFunction: "visitar"
  }
};
