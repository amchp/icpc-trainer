import type { TimeComplexitySnippets } from "./timeComplexitySnippets.types.js";

export const timeComplexitySpanishSnippets: TimeComplexitySnippets = {
  countTrace: `vector<long long> manifiesto = {18, 42, 7, 31, 99};

for (int i = 0; i + 1 < 5; ++i) {
  for (int j = i + 1; j < 5; ++j) {
    if (manifiesto[i] == manifiesto[j]) { // cuenta esta comparación
      // Aquí se manejaría un duplicado.
    }
  }
}`,
  pairScan: `bool tiene_repetido(const vector<long long>& manifiesto) {
  for (int i = 0; i < (int)manifiesto.size(); ++i) {
    for (int j = i + 1; j < (int)manifiesto.size(); ++j) {
      if (manifiesto[i] == manifiesto[j]) return true; // salida temprana
    }
  }
  return false;
}`,
  sortCopy: `bool tiene_repetido(const vector<long long>& manifiesto) {
  vector<long long> copia_ordenada = manifiesto; // conserva el orden de llegada
  sort(copia_ordenada.begin(), copia_ordenada.end());
  for (int i = 1; i < (int)copia_ordenada.size(); ++i) {
    if (copia_ordenada[i] == copia_ordenada[i - 1]) return true;
  }
  return false;
}`,
  hashSet: `bool tiene_repetido(const vector<long long>& manifiesto) {
  unordered_set<long long> vistos;
  vistos.reserve(manifiesto.size());
  for (long long id_rastreo : manifiesto) {
    if (!vistos.insert(id_rastreo).second) return true;
  }
  return false;
}`
};
