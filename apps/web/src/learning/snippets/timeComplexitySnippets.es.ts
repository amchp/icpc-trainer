import type { TimeComplexitySnippets } from "./timeComplexitySnippets.types.js";

export const timeComplexitySpanishSnippets: TimeComplexitySnippets = {
  countTrace: `vector<long long> ids_usuarios = {18, 42, 7, 31, 99};
vector<long long> busquedas = {31, 50};

for (long long id_buscado : busquedas) {
  for (int i = 0; i < 5; ++i) {
    if (ids_usuarios[i] == id_buscado) { // cuenta esta comparación
      break; // termina al encontrar el primer usuario
    }
  }
}`,
  pairScan: `bool buscar_usuario_lineal(
    const vector<long long>& ids_usuarios,
    long long id_buscado
) {
  for (long long id_usuario : ids_usuarios) {
    if (id_usuario == id_buscado) return true;
  }
  return false;
}`,
  sortCopy: `vector<long long> construir_indice_ordenado(
    const vector<long long>& ids_usuarios
) {
  vector<long long> indice = ids_usuarios; // conserva el orden original
  sort(indice.begin(), indice.end());
  return indice;
}

bool buscar_usuario_ordenado(
    const vector<long long>& indice,
    long long id_buscado
) {
  return binary_search(indice.begin(), indice.end(), id_buscado);
}`,
  hashSet: `unordered_set<long long> construir_indice_usuarios(
    const vector<long long>& ids_usuarios
) {
  unordered_set<long long> indice_usuarios;
  indice_usuarios.reserve(ids_usuarios.size());
  indice_usuarios.insert(ids_usuarios.begin(), ids_usuarios.end());
  return indice_usuarios;
}

bool buscar_usuario_hash(
    const unordered_set<long long>& indice_usuarios,
    long long id_buscado
) {
  return indice_usuarios.contains(id_buscado);
}`,
  answerExamples: {
    memoryInput: `vector<long long> usuarios_fuente(n);
// n elementos × 8 bytes = 8n bytes`,
    memoryCopy: `vector<long long> indice_ordenado = usuarios_fuente;
// otros n elementos × 8 bytes = 8n bytes auxiliares`,
    memoryHash: `unordered_set<long long> indice_usuarios(
    usuarios_fuente.begin(),
    usuarios_fuente.end()
);
// n entradas más cubetas y sobrecosto de nodos`
  },
  loopTricks: {
    linear: `long long suma_control = 0;
for (int i = 0; i < n; ++i) {
  suma_control += i;
}`,
    independentNested: `for (int i = 0; i < n; ++i) {
  for (int j = 0; j < n; ++j) {
    inspeccionar(i, j);
  }
}`,
    sequential: `for (int i = 0; i < n; ++i) {
  cargar_usuario(i);
}

for (int j = 0; j < n; ++j) {
  validar_usuario(j);
}`,
    triangular: `for (int i = 0; i < n; ++i) {
  for (int j = 0; j <= i; ++j) {
    inspeccionar(i, j);
  }
}`,
    doubling: `for (int i = 1; i < n; i *= 2) {
  inspeccionar(i);
}`,
    linearLogarithmic: `for (int i = 0; i < n; ++i) {
  for (int j = 1; j < n; j *= 2) {
    inspeccionar(i, j);
  }
}`
  },
  recursionTricks: {
    countdown: `void cuenta_regresiva(int n) {
  if (n == 0) return;
  cuenta_regresiva(n - 1);
}`,
    halving: `void dividir(int n) {
  if (n <= 1) return;
  dividir(n / 2);
}`,
    branching: `long long fibonacci(int n) {
  if (n <= 1) return n;
  return fibonacci(n - 1) + fibonacci(n - 2);
}`
  }
};
