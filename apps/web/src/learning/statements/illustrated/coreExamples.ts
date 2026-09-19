import type { CoreStatementId } from "../coreStatements.js";
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
} from "./types.js";

const arrayHelp = (l: Localize) =>
  l(
    "Enter up to 12 integers (−100 to 100), separated by spaces.",
    "Introduce hasta 12 enteros (−100 a 100), separados por espacios.",
  );
const sequence = (input: string, l: Localize) =>
  numbers(input, l, -100, 100, 12);
const pairRows = (input: string, l: Localize): [number[], number] => {
  const rows = lines(input, 2, l);
  const list = sequence(rows[0]!, l);
  const target = numbers(rows[1]!, l, -100, 100, 1)[0]!;
  return [list, target];
};
const valueList = (a: readonly number[]) => `[${a.join(", ")}]`;

export function fibonacciExample(
  language: string,
  initial = "6",
): IllustratedExample {
  const l = localize(language);
  return {
    instructions: l(
      "Enter an index n from 0 to 12 for the visual example.",
      "Introduce un índice n de 0 a 12 para el ejemplo visual.",
    ),
    presets: presets(initial, "0", l),
    build(input) {
      const n = numbers(input, l, 0, 12, 1)[0]!;
      const values = [0, 1];
      for (let i = 2; i <= n; i++) values.push(values[i - 1]! + values[i - 2]!);
      const visible = values.slice(0, n + 1);
      return [
        step(
          l(
            `The input asks for position ${n}; the first position is 0.`,
            `La entrada pide la posición ${n}; la primera posición es 0.`,
          ),
          [
            items(
              l("Positions in the sequence", "Posiciones en la sucesión"),
              visible.map((_, i) => (i < 2 ? values[i]! : "?")),
            ),
          ],
        ),
        step(
          l(
            "Each value after the first two equals the sum of its two neighbors on the left.",
            "Cada valor después de los dos primeros es la suma de los dos anteriores.",
          ),
          [items(l("The defined sequence", "La sucesión definida"), visible)],
        ),
        step(
          l(
            `The value at index ${n} is ${values[n]}. Return this single number.`,
            `El valor en el índice ${n} es ${values[n]}. Devuelve este único número.`,
          ),
          [
            items(
              l("Requested value highlighted", "Valor solicitado resaltado"),
              visible,
              [n],
            ),
          ],
          String(values[n]),
        ),
      ];
    },
  };
}

const solved = [
  "534678912",
  "672195348",
  "198342567",
  "859761423",
  "426853791",
  "713924856",
  "961537284",
  "287419635",
  "345286179",
];
export function sudokuExample(
  language: string,
  complete: boolean,
): IllustratedExample {
  const l = localize(language);
  const sample = complete
    ? solved.map((row, r) =>
        [...row]
          .map((c, col) => (r === col && [0, 3, 8].includes(r) ? "." : c))
          .join(""),
      )
    : [
        "53..7....",
        "6..195...",
        ".98....6.",
        "8...6...3",
        "4..8.3..1",
        "7...2...6",
        ".6....28.",
        "...419..5",
        "....8..79",
      ];
  const invalid = [...sample];
  invalid[0] = "55" + invalid[0]!.slice(2);
  return {
    instructions: l(
      "Nine rows of nine digits or dots. In this small preview, use at most 8 empty cells when asking to complete a board.",
      "Nueve filas de nueve dígitos o puntos. Para completar un tablero en esta vista, usa como máximo 8 casillas vacías.",
    ),
    presets: presets(
      sample.join("\n"),
      complete ? solved.join("\n") : invalid.join("\n"),
      l,
    ),
    build(input) {
      const rows = lines(input, 9, l);
      requireInput(
        rows.every((r) => /^[1-9.]{9}$/.test(r)),
        l,
        "Use nine digits or dots per row.",
        "Usa nueve dígitos o puntos por fila.",
      );
      const board = rows.map((r) => [...r]);
      const bad = new Set<string>();
      const groups: [number, number][][] = [];
      for (let i = 0; i < 9; i++) {
        groups.push(
          Array.from({ length: 9 }, (_, j) => [i, j]),
          Array.from({ length: 9 }, (_, j) => [j, i]),
        );
      }
      for (let r = 0; r < 9; r += 3)
        for (let c = 0; c < 9; c += 3)
          groups.push(
            Array.from({ length: 9 }, (_, i) => [
              r + Math.floor(i / 3),
              c + (i % 3),
            ]),
          );
      for (const group of groups)
        for (const [r, c] of group)
          if (
            board[r]![c] !== "." &&
            group.some(
              ([r2, c2]) =>
                (r !== r2 || c !== c2) && board[r2]![c2] === board[r]![c],
            )
          )
            bad.add(`${r},${c}`);
      const scene = (values: string[][], reveal: boolean): Scene => ({
        kind: "grid",
        label: l("Sudoku board", "Tablero de Sudoku"),
        sudoku: true,
        cells: values.map((row, r) =>
          row.map((text, c) => ({
            text,
            tone:
              reveal && bad.has(`${r},${c}`)
                ? "bad"
                : reveal && rows[r]![c] === "." && text !== "."
                  ? "good"
                  : "neutral",
          })),
        ),
      });
      const frames = [
        step(
          l(
            "Dots are empty cells. Given digits stay in place.",
            "Los puntos son casillas vacías. Los dígitos dados no cambian.",
          ),
          [scene(board, false)],
        ),
      ];
      if (!complete)
        return [
          ...frames,
          step(
            l(
              "Equal digits may not share a row, column, or 3×3 box. Conflicts are marked in red.",
              "Los dígitos iguales no pueden compartir fila, columna ni bloque de 3×3. Los conflictos se marcan en rojo.",
            ),
            [scene(board, true)],
          ),
          step(
            bad.size
              ? l(
                  "These repeated digits violate a rule, so the answer is false.",
                  "Estos dígitos repetidos incumplen una regla; la respuesta es false.",
                )
              : l(
                  "All filled cells obey the rules. No empty cell needs to be filled to answer true.",
                  "Todas las casillas llenas cumplen las reglas. No hace falta llenar ninguna casilla para responder true.",
                ),
            [scene(board, true)],
            String(bad.size === 0),
          ),
        ];
      const empty: [number, number][] = [];
      board.forEach((row, r) =>
        row.forEach((c, col) => {
          if (c === ".") empty.push([r, col]);
        }),
      );
      requireInput(
        empty.length <= 8 && bad.size === 0,
        l,
        "For completion, use a valid board with at most 8 empty cells.",
        "Para completar, usa un tablero válido con máximo 8 casillas vacías.",
      );
      const fill = (i: number): boolean => {
        if (i === empty.length) return true;
        const [r, c] = empty[i]!;
        for (const digit of "123456789") {
          if (
            board[r]!.includes(digit) ||
            board.some((row) => row[c] === digit) ||
            groups
              .slice(18)
              .some(
                (group) =>
                  group.some(([rr, cc]) => rr === r && cc === c) &&
                  group.some(([rr, cc]) => board[rr]![cc] === digit),
              )
          )
            continue;
          board[r]![c] = digit;
          if (fill(i + 1)) return true;
          board[r]![c] = ".";
        }
        return false;
      };
      requireInput(
        fill(0),
        l,
        "This board has no valid completion. Adjust the given digits.",
        "Este tablero no tiene una solución válida. Ajusta los dígitos dados.",
      );
      const output = board.map((row) => row.join(""));
      const display = rows.map((r) => [...r]);
      for (const [r, c] of empty) {
        display[r]![c] = board[r]![c]!;
        frames.push(
          step(
            l(
              `Cell (${r + 1}, ${c + 1}) contains ${board[r]![c]} in this completed example.`,
              `La casilla (${r + 1}, ${c + 1}) contiene ${board[r]![c]} en este ejemplo completo.`,
            ),
            [
              scene(
                display.map((row) => [...row]),
                true,
              ),
            ],
          ),
        );
      }
      frames.push(
        step(
          l(
            "The finished board keeps every given digit and satisfies all three kinds of groups.",
            "El tablero completo conserva los dígitos dados y cumple las reglas en los tres tipos de grupos.",
          ),
          [scene(board, true)],
          output.join("\n"),
        ),
      );
      return frames;
    },
  };
}

export function getCoreExample(
  language: string,
  id: Exclude<CoreStatementId, "alice" | "kitchen">,
): IllustratedExample {
  const l = localize(language);
  if (id === "power") return fibonacciExample(language);
  if (id === "sudoku") return sudokuExample(language, true);
  if (id === "sakurako")
    return {
      instructions: l(
        "Enter counts a and b, each from 0 to 6 (at least one value).",
        "Introduce las cantidades a y b, de 0 a 6 (al menos un valor).",
      ),
      presets: presets("2 1", "1 1", l),
      build(input) {
        const counts = numbers(input, l, 0, 6, 2);
        requireInput(
          counts.length === 2 && counts[0]! + counts[1]! > 0,
          l,
          "Enter two counts with at least one value.",
          "Introduce dos cantidades con al menos un valor.",
        );
        const values = [
          ...Array<number>(counts[0]!).fill(1),
          ...Array<number>(counts[1]!).fill(2),
        ];
        let signs: number[] | undefined;
        for (let mask = 0; mask < 2 ** values.length; mask++) {
          const candidate = values.map((v, i) => (mask & (1 << i) ? v : -v));
          if (candidate.reduce((a, b) => a + b, 0) === 0) {
            signs = candidate;
            break;
          }
        }
        return [
          step(
            l(
              "Each tile is one supplied number. All must be used.",
              "Cada ficha es un número dado. Debes usarlos todos.",
            ),
            [items(l("Given values", "Valores dados"), values)],
          ),
          step(
            signs
              ? l(
                  "This assignment gives each number a sign; positive and negative totals balance.",
                  "Esta asignación da un signo a cada número; los totales positivos y negativos se equilibran.",
                )
              : l(
                  "No assignment balances these values to zero.",
                  "Ninguna asignación equilibra estos valores en cero.",
                ),
            [
              items(
                l("Signed values", "Valores con signo"),
                signs?.map((v) => (v > 0 ? `+${v}` : String(v))) ??
                  values.map((v) => `±${v}`),
                signs ? values.map((_, i) => i) : [],
                "card",
                signs ? [] : values.map((_, i) => i),
              ),
            ],
          ),
          step(
            signs
              ? `${signs.join(" + ")} = 0`
              : l(
                  "The required output is NO, not a list of signs.",
                  "La salida requerida es NO, no una lista de signos.",
                ),
            [items(l("Original values", "Valores originales"), values)],
            signs ? "YES" : "NO",
          ),
        ];
      },
    };
  if (id === "numeric")
    return {
      instructions: l(
        "Enter a nonnegative area from 0 to 100.",
        "Introduce un área no negativa de 0 a 100.",
      ),
      presets: presets("10", "0.25", l),
      build(input) {
        const area = Number(input);
        requireInput(
          input.trim() !== "" &&
            Number.isFinite(area) &&
            area >= 0 &&
            area <= 100,
          l,
          "Use an area between 0 and 100.",
          "Usa un área entre 0 y 100.",
        );
        const side = Math.sqrt(area);
        return [
          step(
            l(
              "The number inside the square is its area; the unknown is a side length.",
              "El número dentro del cuadrado es su área; la incógnita es la longitud de un lado.",
            ),
            [
              {
                kind: "square",
                label: l("Area and side length", "Área y longitud del lado"),
                area,
              },
            ],
          ),
          step(
            l(
              `A side of approximately ${side.toFixed(5)} gives this area when multiplied by itself.`,
              `Un lado de aproximadamente ${side.toFixed(5)} da esta área al multiplicarlo por sí mismo.`,
            ),
            [
              {
                kind: "square",
                label: l("Side length shown", "Longitud del lado indicada"),
                area,
                side,
              },
            ],
            side.toFixed(5),
          ),
        ];
      },
    };
  if (id === "magic")
    return {
      instructions: l(
        "Three lines: grams per cookie; grams in stock; powder. Up to 5 ingredients, grams 1–20, stock/powder 0–50.",
        "Tres líneas: gramos por galleta; gramos disponibles; polvo. Hasta 5 ingredientes, gramos de 1 a 20, existencias/polvo de 0 a 50.",
      ),
      presets: presets("2 1 4\n11 3 16\n1", "2 1\n0 0\n0", l),
      build(input) {
        const rows = lines(input, 3, l);
        const need = numbers(rows[0]!, l, 1, 20, 5);
        const stock = numbers(rows[1]!, l, 0, 50, 5);
        const powder = numbers(rows[2]!, l, 0, 50, 1)[0]!;
        requireInput(
          stock.length === need.length,
          l,
          "Match one stock amount to every ingredient.",
          "Indica una cantidad disponible por ingrediente.",
        );
        const deficits = (n: number) =>
          need.map((v, i) => Math.max(0, n * v - stock[i]!));
        let count = 0;
        while (deficits(count + 1).reduce((a, b) => a + b, 0) <= powder)
          count++;
        const scene = (baked: number): Scene => ({
          kind: "bakery",
          label: l(
            "Cookies and remaining supplies",
            "Galletas y recursos restantes",
          ),
          cookies: baked,
          cookieLabel: l("Cookies baked", "Galletas horneadas"),
          powderLabel: l(
            "Magic powder remaining (shared by all ingredients)",
            "Polvo mágico restante (compartido por todos los ingredientes)",
          ),
          powder: powder - deficits(baked).reduce((a, b) => a + b, 0),
          ingredients: need.map((amount, i) => ({
            label: l(
              `Ingredient ${i + 1} remaining`,
              `Ingrediente ${i + 1} restante`,
            ),
            remaining: Math.max(0, stock[i]! - baked * amount),
            perCookie: amount,
            detail: l(
              `${amount} g per cookie · ${deficits(baked)[i]} g replaced with magic powder`,
              `${amount} g por galleta · ${deficits(baked)[i]} g sustituidos con polvo mágico`,
            ),
          })),
        });
        const frames = [
          step(
            l(
              "Each cookie uses the same recipe. Magic powder replaces missing grams of any ingredient.",
              "Cada galleta usa la misma receta. El polvo mágico sustituye gramos faltantes de cualquier ingrediente.",
            ),
            [scene(0)],
          ),
        ];
        const checkpoints = Array.from(
          { length: Math.min(count, 10) },
          (_, i) => i + 1,
        );
        if (count > 10) checkpoints.push(count);
        for (const baked of checkpoints)
          frames.push(
            step(
              l(
                `${baked} cookies are baked. The bags show what is left; used magic powder is deducted from the shared supply.`,
                `${baked} galletas horneadas. Las bolsas muestran lo que queda; el polvo usado se descuenta de la reserva compartida.`,
              ),
              [scene(baked)],
            ),
          );
        const extra = need.reduce(
          (sum, amount, i) =>
            sum + Math.max(0, amount - Math.max(0, stock[i]! - count * amount)),
          0,
        );
        const left = powder - deficits(count).reduce((a, b) => a + b, 0);
        frames.push(
          step(
            l(
              `Another cookie needs ${extra} g of magic powder, but only ${left} g remain. The answer is ${count}.`,
              `Otra galleta necesita ${extra} g de polvo mágico, pero solo quedan ${left} g. La respuesta es ${count}.`,
            ),
            [scene(count)],
            String(count),
          ),
        );
        return frames;
      },
    };
  if (id === "bad")
    return {
      instructions: l(
        "Enter n and the first bad version for this illustration (1 ≤ first ≤ n ≤ 12). The latter is hidden from a submitted program.",
        "Introduce n y la primera versión defectuosa para el dibujo (1 ≤ primera ≤ n ≤ 12). La segunda está oculta para el programa enviado.",
      ),
      presets: presets("8 5", "5 1", l),
      build(input) {
        const values = numbers(input, l, 1, 12, 2);
        requireInput(
          values.length === 2 && values[1]! <= values[0]!,
          l,
          "Enter n and a first bad version between 1 and n.",
          "Introduce n y una primera versión defectuosa entre 1 y n.",
        );
        const [n, first] = values as [number, number];
        const versions = Array.from({ length: n }, (_, i) => i + 1);
        return [
          step(
            l(
              "Each tile is a released version, numbered from 1.",
              "Cada ficha es una versión publicada, numerada desde 1.",
            ),
            [items(l("Versions", "Versiones"), versions)],
          ),
          step(
            l(
              "Green versions work; red versions are bad. The example reveals the status, not an order of API queries.",
              "Las versiones verdes funcionan; las rojas fallan. El ejemplo muestra su estado, no un orden de consultas a la API.",
            ),
            [
              items(
                l("Version status", "Estado de las versiones"),
                versions,
                versions.map((_, i) => i).filter((i) => i < first - 1),
                "card",
                versions.map((_, i) => i).filter((i) => i >= first - 1),
              ),
            ],
          ),
          step(
            l(
              `Version ${first} is the first bad one. Return its number.`,
              `La versión ${first} es la primera defectuosa. Devuelve su número.`,
            ),
            [
              items(
                l("First bad version", "Primera versión defectuosa"),
                versions,
                [],
                "card",
                [first - 1],
              ),
            ],
            String(first),
          ),
        ];
      },
    };
  if (id === "search")
    return {
      instructions: l(
        "Two lines: stored IDs; requested IDs. Up to 12 integers per line.",
        "Dos líneas: IDs guardados; IDs solicitados. Hasta 12 enteros por línea.",
      ),
      presets: presets("4 12 19 31 44\n31 50", "2 4 6\n1 4", l),
      build(input) {
        const rows = lines(input, 2, l);
        const values = sequence(rows[0]!, l),
          queries = sequence(rows[1]!, l);
        const output = queries.map((q) => values.includes(q));
        return [
          step(
            l(
              "These cards are the stored IDs.",
              "Estas tarjetas son los IDs guardados.",
            ),
            [items(l("Stored IDs", "IDs guardados"), values)],
          ),
          ...queries.map((q, i) =>
            step(
              l(
                `Query ${q}: ${output[i] ? "present" : "absent"}. Results stay in query order.`,
                `Consulta ${q}: ${output[i] ? "presente" : "ausente"}. Los resultados conservan el orden de las consultas.`,
              ),
              [
                items(
                  l("Membership", "Pertenencia"),
                  values,
                  values.flatMap((v, j) => (v === q ? [j] : [])),
                ),
              ],
              i === queries.length - 1 ? `[${output.join(", ")}]` : undefined,
            ),
          ),
        ];
      },
    };
  if (id === "first" || id === "closest" || id === "capstone")
    return {
      instructions: l(
        "Two lines: up to 12 array values; target. Values −100…100. Search arrays must be sorted; Two Sum needs exactly one pair.",
        "Dos líneas: hasta 12 valores del arreglo; objetivo. Valores de −100 a 100. Las búsquedas necesitan un arreglo ordenado; Two Sum necesita una sola pareja.",
      ),
      presets: presets(
        id === "first"
          ? "1 2 2 4 4 4 4 6 7 7 12 20\n7"
          : id === "closest"
            ? "3 5 10 13 18 25\n15"
            : "2 7 11 15\n9",
        id === "first" ? "1 3 5\n4" : id === "closest" ? "2 6\n4" : "3 3\n6",
        l,
      ),
      build(input) {
        const [values, target] = pairRows(input, l);
        let selected: number[] = [];
        let result = "";
        if (id !== "capstone")
          requireInput(
            values.every((v, i) => i === 0 || values[i - 1]! <= v),
            l,
            "Keep the input sorted in non-decreasing order.",
            "Mantén la entrada ordenada de menor a mayor.",
          );
        if (id === "first") {
          const index = values.indexOf(target);
          selected = index < 0 ? [] : [index];
          result = String(index);
        }
        if (id === "closest") {
          let index = 0;
          values.forEach((v, i) => {
            if (Math.abs(v - target) < Math.abs(values[index]! - target))
              index = i;
          });
          selected = [index];
          result = String(values[index]);
        }
        if (id === "capstone") {
          const pairs: number[][] = [];
          values.forEach((v, i) =>
            values.forEach((w, j) => {
              if (i < j && v + w === target) pairs.push([i, j]);
            }),
          );
          requireInput(
            pairs.length === 1,
            l,
            "Two Sum needs exactly one pair of different positions.",
            "Two Sum necesita exactamente una pareja de posiciones distintas.",
          );
          selected = pairs[0]!;
          result = valueList(selected);
        }
        const explanation =
          id === "first"
            ? selected.length
              ? l(
                  `The first ${target} is at index ${selected[0]}.`,
                  `El primer ${target} está en el índice ${selected[0]}.`,
                )
              : l(
                  `${target} does not appear, so return −1.`,
                  `${target} no aparece; devuelve −1.`,
                )
            : id === "closest"
              ? l(
                  `${result} has the smallest distance to ${target}; ties choose the smaller value.`,
                  `${result} tiene la menor distancia a ${target}; los empates eligen el valor menor.`,
                )
              : l(
                  `${values[selected[0]!]} + ${values[selected[1]!]} = ${target}. Return the two indices, not their values.`,
                  `${values[selected[0]!]} + ${values[selected[1]!]} = ${target}. Devuelve los dos índices, no sus valores.`,
                );
        return [
          step(
            l(
              `The input target is ${target}. Numbers below the cards are zero-based indices.`,
              `El objetivo de entrada es ${target}. Los números debajo son índices desde cero.`,
            ),
            [items(l("Input array", "Arreglo de entrada"), values)],
          ),
          step(explanation, [
            items(
              l("Matching result", "Resultado correspondiente"),
              values,
              selected,
            ),
          ]),
          step(
            l(
              "This is the required output for this input.",
              "Esta es la salida requerida para esta entrada.",
            ),
            [
              items(
                l("Result highlighted", "Resultado resaltado"),
                values,
                selected,
              ),
            ],
            result,
          ),
        ];
      },
    };
  const initial =
    id === "duplicates"
      ? "1 2 3 1"
      : id === "stock"
        ? "7 1 5 3 6 4"
        : "1 0 2 3 0 4 5 0";
  return {
    instructions: arrayHelp(l),
    presets: presets(
      initial,
      id === "duplicates" ? "1 2 3" : id === "stock" ? "7 6 4 3 1" : "0 0 0",
      l,
    ),
    build(input) {
      const values = sequence(input, l);
      if (id === "duplicates") {
        const repeated = values.flatMap((v, i) =>
          values.indexOf(v) !== values.lastIndexOf(v) ? [i] : [],
        );
        return [
          step(
            l(
              "Each position counts as a separate occurrence.",
              "Cada posición cuenta como una aparición distinta.",
            ),
            [items(l("Input", "Entrada"), values)],
          ),
          step(
            repeated.length
              ? l(
                  "The highlighted positions hold repeated values.",
                  "Las posiciones resaltadas contienen valores repetidos.",
                )
              : l(
                  "Every value is different.",
                  "Todos los valores son diferentes.",
                ),
            [
              items(
                l("Repeated positions", "Posiciones repetidas"),
                values,
                repeated,
              ),
            ],
          ),
          step(
            l(
              "Report whether any duplicate exists.",
              "Indica si existe algún repetido.",
            ),
            [items(l("Array", "Arreglo"), values, repeated)],
            String(repeated.length > 0),
          ),
        ];
      }
      if (id === "stock") {
        requireInput(
          values.every((v) => v >= 0),
          l,
          "Prices cannot be negative.",
          "Los precios no pueden ser negativos.",
        );
        let profit = 0;
        let pair: number[] = [];
        values.forEach((buy, i) =>
          values.forEach((sell, j) => {
            if (j > i && sell - buy > profit) {
              profit = sell - buy;
              pair = [i, j];
            }
          }),
        );
        return [
          step(
            l(
              "Prices appear in day order; selling must happen after buying.",
              "Los precios aparecen en orden de días; debes vender después de comprar.",
            ),
            [
              {
                kind: "chart",
                label: l(
                  "Price by day (index starts at 0)",
                  "Precio por día (índices desde 0)",
                ),
                values,
              },
            ],
          ),
          step(
            pair.length
              ? l(
                  `Buy at ${values[pair[0]!]}, sell later at ${values[pair[1]!]}. The profit is ${profit}.`,
                  `Compra a ${values[pair[0]!]} y vende después a ${values[pair[1]!]}. La ganancia es ${profit}.`,
                )
              : l(
                  "No later sale earns a profit. Choose not to trade.",
                  "Ninguna venta posterior produce ganancia. Puedes no operar.",
                ),
            [
              {
                kind: "chart",
                label: l("Best permitted trade", "Mejor operación permitida"),
                values,
                marked: pair,
                annotations: pair.map((index, i) => ({
                  index,
                  text: i === 0 ? l("Buy", "Compra") : l("Sell", "Venta"),
                })),
              },
            ],
            String(profit),
          ),
        ];
      }
      const output = values
        .flatMap((v) => (v === 0 ? [0, 0] : [v]))
        .slice(0, values.length);
      return [
        step(
          l(
            "The input and output have the same number of slots.",
            "La entrada y la salida tienen la misma cantidad de casillas.",
          ),
          [items(l("Original array", "Arreglo original"), values)],
        ),
        step(
          l(
            "Every original zero contributes two zeros; other values stay in order.",
            "Cada cero original aporta dos ceros; los demás conservan el orden.",
          ),
          [
            items(
              l("Before trimming", "Antes de recortar"),
              values.flatMap((v) => (v === 0 ? [0, 0] : [v])),
            ),
          ],
        ),
        step(
          l(
            "Keep only the original number of slots. Values beyond the end disappear.",
            "Conserva solo la cantidad original de casillas. Los valores que queden fuera desaparecen.",
          ),
          [
            items(
              l("Final array", "Arreglo final"),
              output,
              output.flatMap((v, i) => (v === 0 ? [i] : [])),
            ),
          ],
          valueList(output),
        ),
      ];
    },
  };
}
