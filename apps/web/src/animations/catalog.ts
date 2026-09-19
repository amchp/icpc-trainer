// This metadata is deliberately independent of all animation players.
export const ANIMATION_TOPICS = ["fundamentals", "complexity", "data-structures", "brute-force", "binary-search", "greedy", "graphs"] as const;
export type AnimationTopic = (typeof ANIMATION_TOPICS)[number];

const definitions = [
  ["conditionals", "fundamentals", ["conditionals-trace"], {"en": ["if else branch"], "es": ["si sino condición"]}],
  ["loops", "fundamentals", ["for-loop-trace", "while-loop-trace", "loop-control-trace"], {"en": ["for while break continue iteration"], "es": ["bucle ciclo iteración"]}],
  ["vector-traversal", "fundamentals", ["vector-traversal-trace"], {"en": ["array iteration index"], "es": ["recorrido arreglo índice"]}],
  ["function-calls", "fundamentals", ["function-call-trace"], {"en": ["function parameters return"], "es": ["función parámetros retorno"]}],
  ["recursion", "fundamentals", ["countdown-recursion", "recursion-trace", "fibonacci-recursion-trace"], {"en": ["recursive base case call stack"], "es": ["recursivo caso base pila de llamadas"]}],
  ["fibonacci-recursion-tree", "complexity", ["fibonacci-recursion-tree"], {"en": ["exponential repeated work recursion tree"], "es": ["exponencial trabajo repetido árbol de recursión"]}],
  ["vectors", "data-structures", ["vector-simulator", "vector-bounds-explorer"], {"en": ["array lower_bound upper_bound"], "es": ["arreglo límite inferior superior"]}],
  ["stacks", "data-structures", ["stack-simulator"], {"en": ["LIFO push pop top"], "es": ["pila último entrar primero salir"]}],
  ["queues", "data-structures", ["queue-simulator", "deque-simulator"], {"en": ["FIFO double ended queue deque"], "es": ["cola doble extremo"]}],
  ["sets", "data-structures", ["set-simulator"], {"en": ["ordered set unique insert erase"], "es": ["conjunto ordenado único insertar borrar"]}],
  ["maps", "data-structures", ["map-simulator"], {"en": ["dictionary key value associative"], "es": ["diccionario clave valor asociativo"]}],
  ["structs", "data-structures", ["struct-simulator"], {"en": ["struct record fields"], "es": ["estructura registro campos"]}],
  ["permutations", "brute-force", ["recursive-permutations", "iterative-permutations"], {"en": ["backtracking next_permutation ordering"], "es": ["retroceso permutación ordenamiento"]}],
  ["subsets", "brute-force", ["recursive-subsets", "bitmask-subsets"], {"en": ["power set bitmask backtracking"], "es": ["conjunto potencia máscara de bits retroceso"]}],
  ["binary-search-comparison", "binary-search", ["binary-search-comparison"], {"en": ["linear versus binary logarithmic"], "es": ["lineal versus binaria logarítmica"]}],
  ["monotone-condition-pattern", "binary-search", ["monotone-condition-pattern"], {"en": ["monotonic predicate boundary"], "es": ["monótono predicado frontera"]}],
  ["first-occurrence-trace", "binary-search", ["first-occurrence-trace"], {"en": ["lower_bound first duplicate"], "es": ["límite inferior primer duplicado"]}],
  ["closest-value-trace", "binary-search", ["closest-value-trace"], {"en": ["nearest predecessor"], "es": ["cercano predecesor"]}],
  ["numeric-binary-search-trace", "binary-search", ["numeric-binary-search-trace"], {"en": ["numeric answer square root"], "es": ["respuesta numérica raíz cuadrada"]}],
  ["first-true-boundary-trace", "binary-search", ["first-true-boundary-trace"], {"en": ["false true first boundary"], "es": ["falso verdadero primera frontera"]}],
  ["last-true-boundary-trace", "binary-search", ["last-true-boundary-trace"], {"en": ["true false last boundary"], "es": ["verdadero falso última frontera"]}],
  ["coin-change", "greedy", ["coin-change-walkthrough", "coin-change-counterexample"], {"en": ["greedy coins counterexample optimality"], "es": ["voraz monedas contraejemplo optimalidad"]}],
  ["activity-selection", "greedy", ["activity-selection-walkthrough"], {"en": ["interval scheduling earliest finish"], "es": ["intervalos planificación fin temprano"]}],
  ["largest-first-selection", "greedy", ["largest-first-selection"], {"en": ["descending sort prefix sum"], "es": ["orden descendente suma prefijo"]}],
  ["subsequence-scanner", "greedy", ["subsequence-scanner"], {"en": ["subsequence two pointers string"], "es": ["subsecuencia dos punteros cadena"]}],
  ["sign-block-selection", "greedy", ["sign-block-selection"], {"en": ["alternating signs maximum block"], "es": ["signos alternados máximo bloque"]}],
  ["dfs", "graphs", ["graph-connectivity", "dfs-grid-traversal"], {"en": ["DFS depth-first search connectivity flood fill"], "es": ["DFS búsqueda en profundidad conectividad relleno"]}],
  ["bfs", "graphs", ["bfs-layers", "bfs-grid-traversal"], {"en": ["BFS breadth-first search unweighted shortest path"], "es": ["BFS búsqueda en anchura búsqueda en amplitud camino mínimo sin pesos"]}],
  ["bipartite-dfs", "graphs", ["bipartite-dfs"], {"en": ["bipartite two coloring odd cycle DFS"], "es": ["bipartito dos colores ciclo impar DFS"]}],
  ["topological-sort", "graphs", ["graph-indegree", "kahn-topological-sort"], {"en": ["Kahn topological sort directed acyclic graph DAG indegree"], "es": ["Kahn ordenamiento topológico grafo dirigido acíclico grado de entrada"]}],
  ["dijkstra", "graphs", ["edge-relaxation", "dijkstra-traversal"], {"en": ["Dijkstra weighted shortest path relaxation priority queue"], "es": ["Dijkstra camino mínimo ponderado relajación cola de prioridad"]}],
 ] as const;

export type AnimationGroupId = (typeof definitions)[number][0];
export type AnimationToolId = (typeof definitions)[number][2][number];
type Aliases = { readonly en: readonly string[]; readonly es: readonly string[] };
export type AnimationTextKey = `groups.${AnimationGroupId}.${"title" | "description" | "explanation"}` | `tools.${AnimationToolId}.${"title" | "description" | "explanation"}`;

const guideByTopic = {
  fundamentals: "/resources/programming-fundamentals",
  complexity: "/resources/time-complexity",
  "data-structures": "/resources/data-structures",
  "brute-force": "/resources/brute-force",
  "binary-search": "/resources/binary-search",
  greedy: "/resources/greedy",
  graphs: "/resources/graph-theory",
} as const;
export type LearningGuidePath = (typeof guideByTopic)[AnimationTopic];

export type AnimationTool = {
  readonly id: AnimationToolId;
  readonly titleKey: `tools.${AnimationToolId}.title`;
  readonly descriptionKey: `tools.${AnimationToolId}.description`;
  readonly explanationKey: `tools.${AnimationToolId}.explanation`;
  readonly aliases: Aliases;
};
export type AnimationGroup = {
  readonly id: AnimationGroupId;
  readonly topic: AnimationTopic;
  readonly titleKey: `groups.${AnimationGroupId}.title`;
  readonly descriptionKey: `groups.${AnimationGroupId}.description`;
  readonly explanationKey: `groups.${AnimationGroupId}.explanation`;
  readonly aliases: Aliases;
  readonly guidePath: LearningGuidePath;
  readonly tools: readonly [AnimationTool, ...AnimationTool[]];
};

const memberAliases: Record<AnimationToolId, Aliases> = {
  "conditionals-trace": {
    "en": [
      "Conditional trace"
    ],
    "es": [
      "Traza de condicionales"
    ]
  },
  "for-loop-trace": {
    "en": [
      "For-loop trace"
    ],
    "es": [
      "Traza de bucle for"
    ]
  },
  "while-loop-trace": {
    "en": [
      "While-loop trace"
    ],
    "es": [
      "Traza de bucle while"
    ]
  },
  "loop-control-trace": {
    "en": [
      "Break and continue trace"
    ],
    "es": [
      "Traza de break y continue"
    ]
  },
  "vector-traversal-trace": {
    "en": [
      "Vector traversal trace"
    ],
    "es": [
      "Traza de recorrido de vectores"
    ]
  },
  "function-call-trace": {
    "en": [
      "Function call trace"
    ],
    "es": [
      "Traza de llamada a función"
    ]
  },
  "countdown-recursion": {
    "en": [
      "Recursive countdown"
    ],
    "es": [
      "Cuenta regresiva recursiva"
    ]
  },
  "recursion-trace": {
    "en": [
      "Recursive calculation trace"
    ],
    "es": [
      "Traza de cálculo recursivo"
    ]
  },
  "fibonacci-recursion-trace": {
    "en": [
      "Fibonacci code trace"
    ],
    "es": [
      "Traza de código de Fibonacci"
    ]
  },
  "vector-simulator": {
    "en": [
      "Vector simulator"
    ],
    "es": [
      "Simulador de vectores"
    ]
  },
  "vector-bounds-explorer": {
    "en": [
      "Lower and upper bounds"
    ],
    "es": [
      "Límites inferior y superior"
    ]
  },
  "stack-simulator": {
    "en": [
      "Stack simulator"
    ],
    "es": [
      "Simulador de pilas"
    ]
  },
  "queue-simulator": {
    "en": [
      "Queue simulator"
    ],
    "es": [
      "Simulador de colas"
    ]
  },
  "deque-simulator": {
    "en": [
      "Deque simulator"
    ],
    "es": [
      "Simulador de colas dobles"
    ]
  },
  "set-simulator": {
    "en": [
      "Set simulator"
    ],
    "es": [
      "Simulador de conjuntos"
    ]
  },
  "map-simulator": {
    "en": [
      "Map simulator"
    ],
    "es": [
      "Simulador de mapas"
    ]
  },
  "struct-simulator": {
    "en": [
      "Struct simulator"
    ],
    "es": [
      "Simulador de estructuras"
    ]
  },
  "recursive-permutations": {
    "en": [
      "Recursive permutations"
    ],
    "es": [
      "Permutaciones recursivas"
    ]
  },
  "iterative-permutations": {
    "en": [
      "Iterative permutations"
    ],
    "es": [
      "Permutaciones iterativas"
    ]
  },
  "recursive-subsets": {
    "en": [
      "Recursive subsets"
    ],
    "es": [
      "Subconjuntos recursivos"
    ]
  },
  "bitmask-subsets": {
    "en": [
      "Bitmask subsets"
    ],
    "es": [
      "Subconjuntos con máscaras de bits"
    ]
  },
  "coin-change-walkthrough": {
    "en": [
      "Greedy coin-change walkthrough"
    ],
    "es": [
      "Recorrido de cambio de monedas voraz"
    ]
  },
  "coin-change-counterexample": {
    "en": [
      "Coin-change counterexample"
    ],
    "es": [
      "Contraejemplo de cambio de monedas"
    ]
  },
  "activity-selection-walkthrough": {
    "en": [
      "Activity-selection walkthrough"
    ],
    "es": [
      "Recorrido de selección de actividades"
    ]
  },
  "graph-connectivity": {
    "en": [
      "Graph connectivity"
    ],
    "es": [
      "Conectividad de grafos"
    ]
  },
  "dfs-grid-traversal": {
    "en": [
      "DFS grid traversal"
    ],
    "es": [
      "Recorrido DFS en cuadrícula"
    ]
  },
  "bfs-layers": {
    "en": [
      "BFS distance layers"
    ],
    "es": [
      "Capas de distancia BFS"
    ]
  },
  "bfs-grid-traversal": {
    "en": [
      "BFS grid traversal"
    ],
    "es": [
      "Recorrido BFS en cuadrícula"
    ]
  },
  "graph-indegree": {
    "en": [
      "Graph indegree"
    ],
    "es": [
      "Grado de entrada"
    ]
  },
  "kahn-topological-sort": {
    "en": [
      "Kahn's topological sort"
    ],
    "es": [
      "Ordenamiento topológico de Kahn"
    ]
  },
  "edge-relaxation": {
    "en": [
      "Edge relaxation"
    ],
    "es": [
      "Relajación de aristas"
    ]
  },
  "dijkstra-traversal": {
    "en": [
      "Dijkstra traversal"
    ],
    "es": [
      "Recorrido de Dijkstra"
    ]
  },
  "fibonacci-recursion-tree": {
    "en": [
      "Fibonacci recursion tree"
    ],
    "es": [
      "Árbol de recursión de Fibonacci"
    ]
  },
  "binary-search-comparison": {
    "en": [
      "Linear and binary search"
    ],
    "es": [
      "Búsqueda lineal y binaria"
    ]
  },
  "monotone-condition-pattern": {
    "en": [
      "Monotone conditions"
    ],
    "es": [
      "Condiciones monótonas"
    ]
  },
  "first-occurrence-trace": {
    "en": [
      "First occurrence"
    ],
    "es": [
      "Primera aparición"
    ]
  },
  "closest-value-trace": {
    "en": [
      "Closest value"
    ],
    "es": [
      "Valor más cercano"
    ]
  },
  "numeric-binary-search-trace": {
    "en": [
      "Numeric binary search"
    ],
    "es": [
      "Búsqueda binaria numérica"
    ]
  },
  "first-true-boundary-trace": {
    "en": [
      "First true boundary"
    ],
    "es": [
      "Primera posición verdadera"
    ]
  },
  "last-true-boundary-trace": {
    "en": [
      "Last true boundary"
    ],
    "es": [
      "Última posición verdadera"
    ]
  },
  "largest-first-selection": {
    "en": [
      "Largest-first selection"
    ],
    "es": [
      "Selección de mayores primero"
    ]
  },
  "subsequence-scanner": {
    "en": [
      "Subsequence scanning"
    ],
    "es": [
      "Recorrido de subsecuencias"
    ]
  },
  "sign-block-selection": {
    "en": [
      "Sign-block selection"
    ],
    "es": [
      "Selección por bloques de signo"
    ]
  },
  "bipartite-dfs": {
    "en": [
      "Bipartite coloring with DFS"
    ],
    "es": [
      "Coloreo bipartito con DFS"
    ]
  }
};

function makeTool(id: AnimationToolId): AnimationTool {
  return {
    id,
    titleKey: `tools.${id}.title`,
    descriptionKey: `tools.${id}.description`,
    explanationKey: `tools.${id}.explanation`,
    aliases: memberAliases[id],
  };
}

export const animationGroups: readonly AnimationGroup[] = definitions.map(([id, topic, members, aliases]) => ({
  id,
  topic,
  titleKey: `groups.${id}.title`,
  descriptionKey: `groups.${id}.description`,
  explanationKey: `groups.${id}.explanation`,
  aliases,
  guidePath: guideByTopic[topic],
  tools: [makeTool(members[0]), ...members.slice(1).map(makeTool)],
}));

export function getAnimationGroup(id: string): AnimationGroup | undefined {
  return animationGroups.find((group) => group.id === id);
}
