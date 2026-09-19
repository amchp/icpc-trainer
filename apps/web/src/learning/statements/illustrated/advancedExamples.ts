import type { AdvancedStatementId } from "../advancedStatements.js";
import { fibonacciExample } from "./coreExamples.js";
import {
  items,
  lines,
  localize,
  numbers,
  presets,
  requireInput,
  step,
  type ExampleStep,
  type IllustratedExample,
  type Localize,
  type Scene,
  type Tone,
} from "./types.js";

function gridScene(
  rows: readonly string[],
  l: Localize,
  marked: readonly number[] = [],
  cursor?: number,
  bad = false,
): Scene {
  const width = rows[0]!.length;
  return {
    kind: "grid",
    label: l("Map and selected cells", "Mapa y celdas seleccionadas"),
    cells: rows.map((row, r) =>
      [...row].map((text, c) => ({
        text,
        tone:
          text === "#" || text === "*"
            ? "muted"
            : marked.includes(r * width + c)
              ? bad
                ? "bad"
                : "good"
              : "neutral",
      })),
    ),
    ...(cursor === undefined
      ? {}
      : { cursor: [Math.floor(cursor / width), cursor % width] as const }),
  };
}
function parseGrid(input: string, l: Localize, max = 8): string[] {
  const rows = input
    .trim()
    .split("\n")
    .map((r) => r.trim());
  requireInput(
    rows.length >= 1 &&
      rows.length <= max &&
      rows[0]!.length >= 1 &&
      rows[0]!.length <= max &&
      rows.every((r) => r.length === rows[0]!.length && /^[.#*AB]+$/.test(r)),
    l,
    `Use a rectangular map of at most ${max}×${max} cells (. # * A B).`,
    `Usa un mapa rectangular de máximo ${max}×${max} celdas (. # * A B).`,
  );
  return rows;
}
const adjacent = (index: number, h: number, w: number) =>
  [
    [Math.floor(index / w) - 1, index % w],
    [Math.floor(index / w) + 1, index % w],
    [Math.floor(index / w), (index % w) - 1],
    [Math.floor(index / w), (index % w) + 1],
  ]
    .filter(([r, c]) => r! >= 0 && r! < h && c! >= 0 && c! < w)
    .map(([r, c]) => r! * w + c!);
interface GraphInput {
  n: number;
  edges: { a: number; b: number; weight?: number }[];
}
function parseGraph(input: string, l: Localize, weighted = false): GraphInput {
  const rows = input.trim().split("\n");
  const n = numbers(rows[0]!, l, 1, 8, 1)[0]!;
  requireInput(
    rows.length <= 17,
    l,
    "Use at most 16 edges.",
    "Usa máximo 16 aristas.",
  );
  const edges = rows
    .slice(1)
    .filter((r) => r.trim())
    .map((row) => {
      const v = numbers(row, l, 1, 100, weighted ? 3 : 2);
      requireInput(
        v.length === (weighted ? 3 : 2) &&
          v[0]! <= n &&
          v[1]! <= n &&
          v[0] !== v[1],
        l,
        "Each edge needs two distinct existing node numbers, plus a positive weight for flights.",
        "Cada arista necesita dos nodos existentes distintos y, para vuelos, un peso positivo.",
      );
      return {
        a: v[0]! - 1,
        b: v[1]! - 1,
        ...(weighted ? { weight: v[2]! } : {}),
      };
    });
  return { n, edges };
}
function graphScene(
  g: GraphInput,
  l: Localize,
  directed: boolean,
  nodes: readonly number[] = [],
  path: readonly number[] = [],
  tones?: readonly Tone[],
): Extract<Scene, { kind: "graph" }> {
  return {
    kind: "graph",
    label: l("Connections and result", "Conexiones y resultado"),
    directed,
    nodes: Array.from({ length: g.n }, (_, i) => ({
      text: String(i + 1),
      tone: tones?.[i] ?? (nodes.includes(i) ? "good" : "neutral"),
    })),
    edges: g.edges.map((e) => ({
      ...e,
      tone:
        path.some((node, i) => i > 0 && path[i - 1] === e.a && node === e.b) &&
        (!e.weight ||
          e.weight ===
            Math.min(
              ...g.edges
                .filter((other) => other.a === e.a && other.b === e.b)
                .map((other) => other.weight!),
            ))
          ? "good"
          : "neutral",
    })),
  };
}
function graphExample(
  language: string,
  id: "teams" | "schedule" | "routes" | "dag",
): IllustratedExample {
  const l = localize(language),
    weighted = id === "routes",
    directed = id !== "teams";
  const sample =
    id === "teams"
      ? "5\n1 2\n1 3\n4 5"
      : id === "schedule"
        ? "5\n1 2\n3 1\n4 5"
        : id === "routes"
          ? "3\n1 2 6\n1 3 2\n3 2 3\n1 3 4"
          : "6\n1 6\n2 3\n2 6\n3 4\n4 5";
  const contrast =
    id === "teams" || id === "schedule"
      ? "3\n1 2\n2 3\n3 1"
      : id === "routes"
        ? "3\n1 2 8\n2 3 2"
        : "3";
  return {
    instructions: l(
      `First line: node count (1–8). Then one ${weighted ? "from/to/cost" : "from/to"} edge per line (up to 16). Node numbers start at 1.`,
      `Primera línea: cantidad de nodos (1–8). Después una arista ${weighted ? "origen/destino/costo" : "origen/destino"} por línea (máximo 16). Los nodos empiezan en 1.`,
    ),
    presets: presets(sample, contrast, l),
    build(input) {
      const g = parseGraph(input, l, weighted);
      const frames: ExampleStep[] = [
        step(
          l(
            directed
              ? "These connections are the input. Follow arrows only in their indicated direction."
              : "Each line connects two friends who must belong to different teams.",
            directed
              ? "Estas conexiones son la entrada. Sigue las flechas solo en su dirección indicada."
              : "Cada línea une a dos amigos que deben pertenecer a equipos distintos.",
          ),
          [graphScene(g, l, directed)],
        ),
      ];
      if (id === "teams") {
        const color = Array<number>(g.n).fill(-1);
        let possible = true;
        for (let start = 0; start < g.n; start++)
          if (color[start] === -1) {
            color[start] = 0;
            const pending = [start];
            while (pending.length) {
              const a = pending.shift()!;
              for (const edge of g.edges) {
                const b = edge.a === a ? edge.b : edge.b === a ? edge.a : -1;
                if (b < 0) continue;
                if (color[b] === -1) {
                  color[b] = 1 - color[a]!;
                  pending.push(b);
                } else if (color[b] === color[a]) possible = false;
              }
            }
          }
        if (!possible)
          return [
            ...frames,
            step(
              l(
                "This input cannot be divided into two teams while separating every friendship.",
                "Esta entrada no se puede dividir en dos equipos separando todas las amistades.",
              ),
              [
                {
                  ...graphScene(g, l, false),
                  edges: g.edges.map((e) => ({ ...e, tone: "bad" as const })),
                },
              ],
            ),
            step(
              l(
                "No team assignment satisfies all the edges.",
                "Ninguna asignación de equipos cumple todas las aristas.",
              ),
              [graphScene(g, l, false)],
              "IMPOSSIBLE",
            ),
          ];
        const tones = color.map((c) =>
          c === 0 ? ("good" as const) : ("active" as const),
        );
        frames.push(
          step(
            l(
              "Green is team 1; blue is team 2. Every connecting line has different teams at its ends.",
              "Verde es el equipo 1; azul es el equipo 2. Cada línea conecta equipos distintos.",
            ),
            [graphScene(g, l, false, [], [], tones)],
          ),
        );
        frames.push(
          step(
            l(
              "List team numbers in student order, including disconnected students.",
              "Lista los equipos en orden de estudiante, incluidos los estudiantes desconectados.",
            ),
            [graphScene(g, l, false, [], [], tones)],
            color.map((c) => c + 1).join(" "),
          ),
        );
        return frames;
      }
      if (id === "routes") {
        const distances = Array<number>(g.n).fill(Infinity);
        distances[0] = 0;
        const paths: number[][] = Array.from({ length: g.n }, () => []);
        paths[0] = [0];
        for (let round = 0; round < g.n; round++)
          for (const e of g.edges)
            if (distances[e.a]! + e.weight! < distances[e.b]!) {
              distances[e.b] = distances[e.a]! + e.weight!;
              paths[e.b] = [...paths[e.a]!, e.b];
            }
        requireInput(
          distances.every(Number.isFinite),
          l,
          "Every city must be reachable from city 1, as required by the statement.",
          "Todas las ciudades deben ser alcanzables desde la ciudad 1, como exige el enunciado.",
        );
        for (let city = 1; city < g.n; city++)
          frames.push(
            step(
              l(
                `A cheapest route to city ${city + 1} costs ${distances[city]}. The highlighted route is an example answer.`,
                `Una ruta mínima a la ciudad ${city + 1} cuesta ${distances[city]}. La ruta resaltada es una respuesta de ejemplo.`,
              ),
              [graphScene(g, l, true, paths[city], paths[city])],
            ),
          );
        frames.push(
          step(
            l(
              "Return costs in city order; staying in city 1 costs 0.",
              "Devuelve los costos en orden de ciudad; quedarse en la ciudad 1 cuesta 0.",
            ),
            [
              items(
                l("Costs to cities 1…n", "Costos a las ciudades 1…n"),
                distances,
              ),
            ],
            distances.join(" "),
          ),
        );
        return frames;
      }
      const incoming = Array<number>(g.n).fill(0);
      g.edges.forEach((e) => (incoming[e.b] = incoming[e.b]! + 1));
      const order: number[] = [];
      while (order.length < g.n) {
        const node = incoming.findIndex(
          (v, i) => v === 0 && !order.includes(i),
        );
        if (node < 0) break;
        order.push(node);
        g.edges
          .filter((e) => e.a === node)
          .forEach((e) => (incoming[e.b] = incoming[e.b]! - 1));
      }
      if (id === "schedule") {
        if (order.length !== g.n)
          return [
            ...frames,
            step(
              l(
                "A cycle demands that a course come before itself. No ordering can satisfy this input.",
                "Un ciclo exige que un curso vaya antes de sí mismo. Ningún orden cumple esta entrada.",
              ),
              [
                {
                  ...graphScene(g, l, true),
                  edges: g.edges.map((e) => ({ ...e, tone: "bad" as const })),
                },
              ],
              "IMPOSSIBLE",
            ),
          ];
        frames.push(
          step(
            l(
              "This is one complete ordering. An arrow only requires earlier placement, not adjacent placement.",
              "Este es un orden completo. Una flecha solo exige ir antes, no estar al lado.",
            ),
            [
              items(
                l("Course order", "Orden de cursos"),
                order.map((n) => n + 1),
              ),
              graphScene(g, l, true),
            ],
          ),
        );
        frames.push(
          step(
            l(
              "Every prerequisite appears before its dependent course.",
              "Cada prerrequisito aparece antes del curso que lo necesita.",
            ),
            [
              items(
                l("Valid ordering", "Orden válido"),
                order.map((n) => n + 1),
                order.map((_, i) => i),
              ),
            ],
            order.map((n) => n + 1).join(" "),
          ),
        );
        return frames;
      }
      requireInput(
        order.length === g.n,
        l,
        "A DAG must not contain a directed cycle.",
        "Un DAG no puede contener un ciclo dirigido.",
      );
      let longest: number[] = [];
      const visit = (node: number, path: number[]) => {
        const next = [...path, node];
        if (next.length > longest.length) longest = next;
        g.edges.filter((e) => e.a === node).forEach((e) => visit(e.b, next));
      };
      for (let i = 0; i < g.n; i++) visit(i, []);
      frames.push(
        step(
          l(
            "This is one longest path. Count the connections, not the nodes.",
            "Este es un camino más largo. Cuenta las conexiones, no los nodos.",
          ),
          [graphScene(g, l, true, longest, longest)],
        ),
      );
      frames.push(
        step(
          l(
            `${longest.length} nodes along the path give ${longest.length - 1} edges.`,
            `${longest.length} nodos en el camino dan ${longest.length - 1} aristas.`,
          ),
          [graphScene(g, l, true, longest, longest)],
          String(longest.length - 1),
        ),
      );
      return frames;
    },
  };
}

export function getAdvancedExample(
  language: string,
  id: AdvancedStatementId,
): IllustratedExample {
  const l = localize(language);
  if (id === "fibonacci") return fibonacciExample(language, "7");
  if (id === "teams" || id === "schedule" || id === "routes" || id === "dag")
    return graphExample(language, id);
  if (id === "rooms" || id === "labyrinth" || id === "grid") {
    const sample =
      id === "rooms"
        ? "########\n#..#...#\n####.#.#\n#..#...#\n########"
        : id === "labyrinth"
          ? "########\n#.A#...#\n#.##.#B#\n#......#\n########"
          : "...\n.*.\n...";
    return {
      instructions: l(
        `Enter map rows only: . for floor, # or * for a wall${id === "labyrinth" ? ", one A and one B" : ""}. Maximum ${id === "grid" ? 5 : 8} rows/columns.`,
        `Introduce solo las filas: . para suelo, # o * para pared${id === "labyrinth" ? ", una A y una B" : ""}. Máximo ${id === "grid" ? 5 : 8} filas/columnas.`,
      ),
      presets: presets(
        sample,
        id === "rooms" ? "###\n###" : id === "labyrinth" ? "A#B" : ".*\n*.",
        l,
      ),
      build(input) {
        const rows = parseGrid(input, l, id === "grid" ? 5 : 8),
          h = rows.length,
          w = rows[0]!.length;
        const flat = rows.join("");
        const open = (i: number) => flat[i] !== "#" && flat[i] !== "*";
        const frames: ExampleStep[] = [
          step(
            l(
              "The board is the input; dark cells cannot be crossed.",
              "El tablero es la entrada; no puedes cruzar las celdas oscuras.",
            ),
            [gridScene(rows, l)],
          ),
        ];
        if (id === "rooms") {
          const seen = new Set<number>();
          const groups: number[][] = [];
          for (let i = 0; i < flat.length; i++)
            if (open(i) && !seen.has(i)) {
              const group = [i];
              seen.add(i);
              for (let k = 0; k < group.length; k++)
                for (const next of adjacent(group[k]!, h, w))
                  if (open(next) && !seen.has(next)) {
                    seen.add(next);
                    group.push(next);
                  }
              groups.push(group);
            }
          groups.forEach((group, i) =>
            frames.push(
              step(
                l(
                  `Room ${i + 1}: these floor cells connect by shared sides. Diagonal contact does not join rooms.`,
                  `Habitación ${i + 1}: estas celdas se conectan por lados compartidos. El contacto diagonal no une habitaciones.`,
                ),
                [gridScene(rows, l, group)],
              ),
            ),
          );
          frames.push(
            step(
              l(
                `The map contains ${groups.length} rooms.`,
                `El mapa contiene ${groups.length} habitaciones.`,
              ),
              [
                {
                  kind: "grid",
                  label: l(
                    "All rooms, numbered",
                    "Todas las habitaciones, numeradas",
                  ),
                  cells: rows.map((row, r) =>
                    [...row].map((text, c) => {
                      const room = groups.findIndex((group) =>
                        group.includes(r * w + c),
                      );
                      return {
                        text: room < 0 ? text : String(room + 1),
                        tone:
                          room < 0
                            ? "muted"
                            : room % 2 === 0
                              ? "good"
                              : "active",
                      };
                    }),
                  ),
                },
              ],
              String(groups.length),
            ),
          );
          return frames;
        }
        if (id === "grid") {
          requireInput(
            h === w && !/[AB]/.test(flat),
            l,
            "Use a square board with only floor and blocked cells.",
            "Usa un tablero cuadrado con solo celdas libres y bloqueadas.",
          );
          const routes: number[][] = [];
          const walk = (i: number, path: number[]) => {
            if (!open(i)) return;
            const next = [...path, i];
            if (i === flat.length - 1) {
              routes.push(next);
              return;
            }
            if (i % w < w - 1) walk(i + 1, next);
            if (Math.floor(i / w) < h - 1) walk(i + w, next);
          };
          walk(0, []);
          routes
            .slice(0, 3)
            .forEach((path, i) =>
              frames.push(
                step(
                  l(
                    `Valid route ${i + 1}: each move is right or down and avoids the obstacle.`,
                    `Ruta válida ${i + 1}: cada movimiento va a la derecha o abajo y evita el obstáculo.`,
                  ),
                  [gridScene(rows, l, path)],
                ),
              ),
            );
          frames.push(
            step(
              l(
                `There are ${routes.length} valid routes${routes.length > 3 ? "; three are illustrated" : ""}. Return the count, not a route.`,
                `Hay ${routes.length} rutas válidas${routes.length > 3 ? "; se ilustran tres" : ""}. Devuelve la cantidad, no una ruta.`,
              ),
              [gridScene(rows, l)],
              String(routes.length),
            ),
          );
          return frames;
        }
        requireInput(
          [...flat].filter((c) => c === "A").length === 1 &&
            [...flat].filter((c) => c === "B").length === 1,
          l,
          "Include exactly one A and one B.",
          "Incluye exactamente una A y una B.",
        );
        const a = flat.indexOf("A"),
          b = flat.indexOf("B");
        const previous = new Map<number, number>([[a, -1]]);
        const queue = [a];
        for (let i = 0; i < queue.length && !previous.has(b); i++)
          for (const n of adjacent(queue[i]!, h, w))
            if (open(n) && !previous.has(n)) {
              previous.set(n, queue[i]!);
              queue.push(n);
            }
        if (!previous.has(b))
          return [
            ...frames,
            step(
              l(
                "The walls separate A from B. No legal sequence of moves can connect them.",
                "Las paredes separan A de B. Ninguna secuencia de movimientos legales los conecta.",
              ),
              [gridScene(rows, l, [a, b], undefined, true)],
              "NO",
            ),
          ];
        const path: number[] = [];
        for (let at = b; at !== -1; at = previous.get(at)!) path.unshift(at);
        let moves = "";
        for (let i = 1; i < path.length; i++) {
          const diff = path[i]! - path[i - 1]!;
          moves +=
            Math.floor(path[i]! / w) === Math.floor(path[i - 1]! / w)
              ? diff === 1
                ? "R"
                : "L"
              : diff > 0
                ? "D"
                : "U";
          frames.push(
            step(
              l(
                `Move ${i}: ${moves.at(-1)}. This follows one shortest route for the input.`,
                `Movimiento ${i}: ${moves.at(-1)}. Sigue una ruta mínima para esta entrada.`,
              ),
              [gridScene(rows, l, path.slice(0, i + 1), path[i])],
            ),
          );
        }
        frames.push(
          step(
            l(
              "The target is reached. Output YES, the length, and the move string.",
              "Llegaste al objetivo. Imprime YES, la longitud y la cadena de movimientos.",
            ),
            [gridScene(rows, l, path, b)],
            `YES\n${moves.length}\n${moves}`,
          ),
        );
        return frames;
      },
    };
  }
  if (id === "nonAdjacent" || id === "alternating" || id === "twins")
    return {
      instructions: l(
        "Enter up to 12 integers from −100 to 100. Alternating values cannot be zero; coin values must be positive.",
        "Introduce hasta 12 enteros de −100 a 100. Los valores alternantes no pueden ser cero; las monedas deben ser positivas.",
      ),
      presets: presets(
        id === "nonAdjacent"
          ? "4 1 1 9 1"
          : id === "twins"
            ? "2 1 2"
            : "1 2 3 -1 -2",
        id === "nonAdjacent" ? "-4 -2 -7" : id === "twins" ? "1 1" : "-5 -2 -8",
        l,
      ),
      build(input) {
        const values = numbers(input, l, -100, 100, 12);
        requireInput(
          id !== "twins" || values.every((v) => v > 0),
          l,
          "Coin values must be positive.",
          "Las monedas deben ser positivas.",
        );
        requireInput(
          id !== "alternating" || values.every((v) => v !== 0),
          l,
          "Alternating values cannot be zero.",
          "Los valores alternantes no pueden ser cero.",
        );
        let selected: number[] = [];
        let bestSum = id === "alternating" ? -Infinity : 0;
        let bestLength = id === "twins" ? Infinity : 0;
        const total = values.reduce((a, b) => a + b, 0);
        for (let mask = 0; mask < 2 ** values.length; mask++) {
          const indices = values.flatMap((_, i) =>
            mask & (1 << i) ? [i] : [],
          );
          const sum = indices.reduce((n, i) => n + values[i]!, 0);
          if (
            id === "nonAdjacent" &&
            indices.every((v, i) => i === 0 || v > indices[i - 1]! + 1) &&
            sum > bestSum
          ) {
            bestSum = sum;
            selected = indices;
          }
          if (
            id === "twins" &&
            sum > total - sum &&
            indices.length < bestLength
          ) {
            bestLength = indices.length;
            bestSum = sum;
            selected = indices;
          }
          if (
            id === "alternating" &&
            indices.every(
              (v, i) =>
                i === 0 ||
                Math.sign(values[v]!) !== Math.sign(values[indices[i - 1]!]!),
            ) &&
            (indices.length > bestLength ||
              (indices.length === bestLength && sum > bestSum))
          ) {
            bestLength = indices.length;
            bestSum = sum;
            selected = indices;
          }
        }
        const shape = id === "twins" ? ("coin" as const) : ("card" as const);
        const caption =
          id === "nonAdjacent"
            ? l(
                `Choose the highlighted positions: sum ${bestSum}. No two are neighbors.`,
                `Elige las posiciones resaltadas: suma ${bestSum}. Ninguna pareja es vecina.`,
              )
            : id === "twins"
              ? l(
                  `Your coins total ${bestSum}; your twin gets ${total - bestSum}. The inequality is strict.`,
                  `Tus monedas suman ${bestSum}; tu gemelo recibe ${total - bestSum}. La desigualdad es estricta.`,
                )
              : l(
                  `This choice has length ${bestLength} and sum ${bestSum}; signs alternate in the original order.`,
                  `Esta elección tiene longitud ${bestLength} y suma ${bestSum}; los signos alternan en el orden original.`,
                );
        return [
          step(
            l(
              "Every object is one input value; equal values still occupy different positions.",
              "Cada objeto es un valor de entrada; los valores iguales ocupan posiciones distintas.",
            ),
            [items(l("Input values", "Valores de entrada"), values, [], shape)],
          ),
          step(caption, [
            items(
              l("One best valid choice", "Una elección óptima válida"),
              values,
              selected,
              shape,
            ),
          ]),
          step(
            l(
              "The output is the requested number, not the list of selected objects.",
              "La salida es el número solicitado, no la lista de objetos elegidos.",
            ),
            [
              items(
                l("Chosen values", "Valores elegidos"),
                selected.map((i) => values[i]!),
                selected.map((_, i) => i),
                shape,
              ),
            ],
            String(id === "twins" ? bestLength : bestSum),
          ),
        ];
      },
    };
  if (id === "knapsack")
    return {
      instructions: l(
        "Three lines: capacity (0–30); up to 8 weights (1–15); matching values (0–30).",
        "Tres líneas: capacidad (0–30); hasta 8 pesos (1–15); valores correspondientes (0–30).",
      ),
      presets: presets("4\n2 2 2\n4 6 4", "1\n2 3\n8 10", l),
      build(input) {
        const rows = lines(input, 3, l),
          capacity = numbers(rows[0]!, l, 0, 30, 1)[0]!,
          weights = numbers(rows[1]!, l, 1, 15, 8),
          values = numbers(rows[2]!, l, 0, 30, 8);
        requireInput(
          weights.length === values.length,
          l,
          "Each weight needs a matching value.",
          "Cada peso necesita un valor correspondiente.",
        );
        let selected: number[] = [];
        let best = 0;
        let weight = 0;
        for (let mask = 0; mask < 2 ** weights.length; mask++) {
          const indices = weights.flatMap((_, i) =>
              mask & (1 << i) ? [i] : [],
            ),
            w = indices.reduce((s, i) => s + weights[i]!, 0),
            v = indices.reduce((s, i) => s + values[i]!, 0);
          if (w <= capacity && v > best) {
            best = v;
            selected = indices;
            weight = w;
          }
        }
        const scene = (chosen: boolean): Scene => ({
          kind: "items",
          shape: "book",
          label: l(`Capacity: ${capacity}`, `Capacidad: ${capacity}`),
          items: weights.map((w, i) => ({
            text: String.fromCharCode(65 + i),
            detail: `${w} / ${values[i]}`,
            tone: chosen && selected.includes(i) ? "good" : "neutral",
          })),
        });
        return [
          step(
            l(
              "Each book shows weight / value. You may take each one only once.",
              "Cada libro muestra peso / valor. Puedes tomar cada uno solo una vez.",
            ),
            [scene(false)],
          ),
          step(
            l(
              `The highlighted choice weighs ${weight} ≤ ${capacity} and has value ${best}.`,
              `La elección resaltada pesa ${weight} ≤ ${capacity} y tiene valor ${best}.`,
            ),
            [scene(true)],
          ),
          step(
            l(
              "No permitted choice has a higher total value for this input.",
              "Ninguna elección permitida tiene mayor valor total para esta entrada.",
            ),
            [scene(true)],
            String(best),
          ),
        ];
      },
    };
  if (id === "coins" || id === "fails")
    return {
      instructions: l(
        "Enter the amount (1–100). Denominations stay fixed for this example.",
        "Introduce el monto (1–100). Las denominaciones se mantienen fijas para este ejemplo.",
      ),
      presets: presets(
        id === "coins" ? "68" : "6",
        id === "coins" ? "10" : "8",
        l,
      ),
      build(input) {
        const amount = numbers(input, l, 1, 100, 1)[0]!,
          denominations = id === "coins" ? [1, 5, 10, 25, 50] : [1, 3, 4];
        const count = Array<number>(amount + 1).fill(Infinity),
          last = Array<number>(amount + 1).fill(0);
        count[0] = 0;
        for (let n = 1; n <= amount; n++)
          for (const coin of denominations)
            if (n >= coin && count[n - coin]! + 1 < count[n]!) {
              count[n] = count[n - coin]! + 1;
              last[n] = coin;
            }
        const payment: number[] = [];
        for (let n = amount; n > 0; n -= last[n]!) payment.push(last[n]!);
        return [
          step(
            l(
              `Pay exactly ${amount} using these coin denominations.`,
              `Paga exactamente ${amount} con estas denominaciones.`,
            ),
            [
              items(
                l(
                  "Available coins (unlimited copies)",
                  "Monedas disponibles (copias ilimitadas)",
                ),
                denominations,
                [],
                "coin",
              ),
            ],
          ),
          step(
            l(
              `This payment adds up to ${amount} using ${payment.length} coins. It is a complete example answer.`,
              `Este pago suma ${amount} con ${payment.length} monedas. Es una respuesta completa de ejemplo.`,
            ),
            [
              items(
                l("One minimum payment", "Un pago mínimo"),
                payment,
                payment.map((_, i) => i),
                "coin",
              ),
            ],
          ),
          step(
            l(
              "Return the coin count. Different denominations can lead to very different choices.",
              "Devuelve la cantidad de monedas. Otras denominaciones pueden producir elecciones muy distintas.",
            ),
            [items(l("Payment", "Pago"), payment, [], "coin")],
            String(payment.length),
          ),
        ];
      },
    };
  if (id === "activities")
    return {
      instructions: l(
        "Up to 8 lines: start and finish times (0–30), with start < finish.",
        "Hasta 8 líneas: inicio y fin (0–30), con inicio < fin.",
      ),
      presets: presets("1 4\n3 5\n4 7", "1 8\n2 7\n3 6", l),
      build(input) {
        const rows = input.trim().split("\n");
        requireInput(
          rows.length <= 8,
          l,
          "Use at most 8 activities.",
          "Usa máximo 8 actividades.",
        );
        const intervals = rows.map((r, i) => {
          const [start, end] = numbers(r, l, 0, 30, 2);
          requireInput(
            end !== undefined && start! < end,
            l,
            "Each activity needs start < finish.",
            "Cada actividad necesita inicio < fin.",
          );
          return { start: start!, end, text: String.fromCharCode(65 + i) };
        });
        let selected: number[] = [];
        for (let mask = 0; mask < 2 ** intervals.length; mask++) {
          const indices = intervals.flatMap((_, i) =>
            mask & (1 << i) ? [i] : [],
          );
          if (
            indices.length > selected.length &&
            indices.every((i) =>
              indices.every(
                (j) =>
                  i === j ||
                  intervals[i]!.end <= intervals[j]!.start ||
                  intervals[j]!.end <= intervals[i]!.start,
              ),
            )
          )
            selected = indices;
        }
        const scene = (mark: boolean): Scene => ({
          kind: "timeline",
          label: l("Activity times", "Horarios de actividades"),
          intervals: intervals.map((v, i) => ({
            ...v,
            tone: mark && selected.includes(i) ? "good" : "neutral",
          })),
        });
        return [
          step(
            l(
              "Each bar occupies its full time interval.",
              "Cada barra ocupa todo su intervalo de tiempo.",
            ),
            [scene(false)],
          ),
          step(
            l(
              "The highlighted activities do not overlap. Touching endpoints are allowed.",
              "Las actividades resaltadas no se solapan. Se permite compartir extremos.",
            ),
            [scene(true)],
          ),
          step(
            l(
              `At most ${selected.length} activities fit.`,
              `Caben como máximo ${selected.length} actividades.`,
            ),
            [scene(true)],
            String(selected.length),
          ),
        ];
      },
    };
  return {
    instructions: l(
      "Enter 1–24 lowercase English letters.",
      "Introduce de 1 a 24 letras minúsculas inglesas.",
    ),
    presets: presets("ahhellllloou", "hlelo", l),
    build(input) {
      const message = input.trim();
      requireInput(
        /^[a-z]{1,24}$/.test(message),
        l,
        "Use 1–24 lowercase letters without spaces.",
        "Usa de 1 a 24 letras minúsculas sin espacios.",
      );
      const selected: number[] = [];
      let next = 0;
      for (let i = 0; i < message.length; i++)
        if (message[i] === "hello"[next]) {
          selected.push(i);
          next++;
          if (next === 5) break;
        }
      return [
        step(
          l(
            "You may delete letters but cannot rearrange them.",
            "Puedes borrar letras, pero no reordenarlas.",
          ),
          [items(l("Original message", "Mensaje original"), [...message])],
        ),
        step(
          next === 5
            ? l(
                "Keep these letters and delete the others: their order spells hello.",
                "Conserva estas letras y borra las demás: su orden forma hello.",
              )
            : l(
                "The available letters cannot spell hello in order.",
                "Las letras disponibles no pueden formar hello en orden.",
              ),
          [
            items(
              l("Retained letters", "Letras conservadas"),
              [...message],
              selected,
            ),
          ],
        ),
        step(
          next === 5
            ? l(
                "The remaining word is exactly hello.",
                "La palabra restante es exactamente hello.",
              )
            : l(
                "Having the letters is not enough if their order is wrong.",
                "Tener las letras no basta si el orden es incorrecto.",
              ),
          [
            items(
              l("Resulting word", "Palabra resultante"),
              selected.map((i) => message[i]!),
            ),
          ],
          next === 5 ? "YES" : "NO",
        ),
      ];
    },
  };
}
