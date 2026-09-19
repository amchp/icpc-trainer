import { getGameExample } from "./gameExamples.js";
import type { FoundationStatementId } from "../foundationStatements.js";
import { sudokuExample } from "./coreExamples.js";
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
  type Scene,
} from "./types.js";

export function getFoundationExample(
  language: string,
  id: FoundationStatementId,
): IllustratedExample {
  const l = localize(language);
  if (id === "sudoku") return sudokuExample(language, false);
  if (id === "numeric")
    return {
      instructions: l(
        "Enter rows and columns, each from 1 to 8 for the drawing.",
        "Introduce filas y columnas, de 1 a 8 para el dibujo.",
      ),
      presets: presets("3 4", "1 5", l),
      build(input) {
        const size = numbers(input, l, 1, 8, 2);
        requireInput(
          size.length === 2,
          l,
          "Enter two dimensions.",
          "Introduce dos dimensiones.",
        );
        const [h, w] = size as [number, number];
        const scene = (count: number): Scene => ({
          kind: "grid",
          label: l(`${h} rows × ${w} columns`, `${h} filas × ${w} columnas`),
          cells: Array.from({ length: h }, (_, r) =>
            Array.from({ length: w }, () => ({
              text: "□",
              tone: r < count ? "good" : "neutral",
            })),
          ),
        });
        return [
          step(
            l(
              "The input specifies the height and width of this rectangle.",
              "La entrada especifica el alto y el ancho de este rectángulo.",
            ),
            [scene(0)],
          ),
          ...Array.from({ length: h }, (_, r) =>
            step(
              l(
                `${r + 1} complete rows contain ${(r + 1) * w} cells.`,
                `${r + 1} filas completas contienen ${(r + 1) * w} celdas.`,
              ),
              [scene(r + 1)],
            ),
          ),
          step(`${h} × ${w} = ${h * w}`, [scene(h)], String(h * w)),
        ];
      },
    };
  if (id === "vector")
    return {
      instructions: l(
        "Two lines: up to 8 shop prices; up to 6 customer budgets. Whole numbers from 1 to 100.",
        "Dos líneas: hasta 8 precios de tiendas; hasta 6 presupuestos. Enteros de 1 a 100.",
      ),
      presets: presets("3 10 8 6\n1 6 9 10", "5 5 9\n5 4", l),
      build(input) {
        const rows = lines(input, 2, l),
          prices = numbers(rows[0]!, l, 1, 100, 8),
          budgets = numbers(rows[1]!, l, 1, 100, 6);
        const output = budgets.map((b) => prices.filter((p) => p <= b).length);
        return [
          step(
            l(
              "Each bottle belongs to a different shop, even when prices match.",
              "Cada botella pertenece a una tienda distinta, aunque coincidan los precios.",
            ),
            [
              items(
                l("Price per shop", "Precio por tienda"),
                prices,
                [],
                "bottle",
              ),
            ],
          ),
          ...budgets.map((budget, i) =>
            step(
              l(
                `Budget ${budget}: ${output[i]} shops are affordable. A price equal to the budget counts.`,
                `Presupuesto ${budget}: puedes pagar en ${output[i]} tiendas. Un precio igual al presupuesto cuenta.`,
              ),
              [
                items(
                  l("Affordable shops", "Tiendas que puedes pagar"),
                  prices,
                  prices.flatMap((p, i) => (p <= budget ? [i] : [])),
                  "bottle",
                  prices.flatMap((p, i) => (p > budget ? [i] : [])),
                ),
              ],
              i === budgets.length - 1 ? output.join("\n") : undefined,
            ),
          ),
        ];
      },
    };
  if (id === "stack")
    return {
      instructions: l(
        "Enter 1–12 brackets, using only () [] {}.",
        "Introduce de 1 a 12 símbolos, solo () [] {}.",
      ),
      presets: presets("([{}])", "([)]", l),
      build(input) {
        const value = input.trim();
        requireInput(
          /^[()[\]{}]{1,12}$/.test(value),
          l,
          "Use 1–12 bracket characters.",
          "Usa de 1 a 12 símbolos de apertura o cierre.",
        );
        const pending: number[] = [];
        const pairs: number[][] = [];
        let valid = true;
        const bad: number[] = [];
        for (let i = 0; i < value.length; i++) {
          if ("([{".includes(value[i]!)) pending.push(i);
          else {
            const open = pending.pop();
            if (
              open === undefined ||
              "([{".indexOf(value[open]!) !== ")]}".indexOf(value[i]!)
            ) {
              valid = false;
              bad.push(i, ...(open === undefined ? [] : [open]));
            } else pairs.push([open, i]);
          }
        }
        if (pending.length) {
          valid = false;
          bad.push(...pending);
        }
        const frames = [
          step(
            l(
              "Pairs must have the same type and fit inside each other without crossing.",
              "Las parejas deben ser del mismo tipo y encajar unas dentro de otras sin cruzarse.",
            ),
            [items(l("Bracket string", "Cadena de símbolos"), [...value])],
          ),
        ];
        if (valid)
          for (const pair of pairs)
            frames.push(
              step(
                l(
                  `Positions ${pair[0]} and ${pair[1]} form a matching pair.`,
                  `Las posiciones ${pair[0]} y ${pair[1]} forman una pareja válida.`,
                ),
                [items(l("Matching pair", "Pareja válida"), [...value], pair)],
              ),
            );
        else
          frames.push(
            step(
              l(
                "The red positions cannot form correctly nested pairs in this string.",
                "Las posiciones rojas no pueden formar parejas bien anidadas en esta cadena.",
              ),
              [
                items(
                  l("Invalid nesting", "Anidamiento inválido"),
                  [...value],
                  [],
                  "card",
                  bad,
                ),
              ],
            ),
          );
        frames.push(
          step(
            valid
              ? l(
                  "Every symbol has a correctly nested partner.",
                  "Cada símbolo tiene una pareja bien anidada.",
                )
              : l(
                  "At least one nesting or pairing rule fails.",
                  "Falla al menos una regla de anidamiento o emparejamiento.",
                ),
            [
              items(
                l("Whole string", "Cadena completa"),
                [...value],
                valid ? [...value].map((_, i) => i) : [],
                "card",
                bad,
              ),
            ],
            String(valid),
          ),
        );
        return frames;
      },
    };
  if (id === "queue")
    return {
      instructions: l(
        "Enter up to 8 strictly increasing request times (1–10000 ms).",
        "Introduce hasta 8 tiempos de solicitudes estrictamente crecientes (1–10000 ms).",
      ),
      presets: presets("1 100 3001 3002", "10 4000 8000", l),
      build(input) {
        const times = numbers(input, l, 1, 10000, 8);
        requireInput(
          times.every((v, i) => i === 0 || times[i - 1]! < v),
          l,
          "Times must increase strictly.",
          "Los tiempos deben aumentar estrictamente.",
        );
        const output: number[] = [];
        return [
          step(
            l(
              "These requests arrive in the given time order.",
              "Estas solicitudes llegan en el orden indicado.",
            ),
            [items(l("Arrival times (ms)", "Tiempos de llegada (ms)"), times)],
          ),
          ...times.map((t, i) => {
            const current = times.slice(0, i + 1);
            const selected = current.flatMap((v, j) =>
              v >= t - 3000 ? [j] : [],
            );
            output.push(selected.length);
            return step(
              l(
                `At ${t} ms, the inclusive window is [${t - 3000}, ${t}]. ${selected.length} requests count.`,
                `En ${t} ms, la ventana inclusiva es [${t - 3000}, ${t}]. Cuentan ${selected.length} solicitudes.`,
              ),
              [
                {
                  kind: "timeline",
                  label: l(
                    "Current 3000 ms window",
                    "Ventana actual de 3000 ms",
                  ),
                  intervals: [
                    { start: t - 3000, end: t, text: "t", tone: "active" },
                  ],
                },
                items(
                  l(
                    "Requests received so far",
                    "Solicitudes recibidas hasta ahora",
                  ),
                  current,
                  selected,
                ),
              ],
              i === times.length - 1 ? output.join("\n") : undefined,
            );
          }),
        ];
      },
    };
  if (id === "set")
    return {
      instructions: l(
        "Enter up to 16 lowercase letters, separated by spaces; leave empty for the empty set.",
        "Introduce hasta 16 letras minúsculas separadas por espacios; deja vacío para el conjunto vacío.",
      ),
      presets: presets("a b a c", "", l),
      build(input) {
        requireInput(
          /^[a-z\s]*$/.test(input) && input.replace(/\s/g, "").length <= 16,
          l,
          "Use at most 16 lowercase letters.",
          "Usa máximo 16 letras minúsculas.",
        );
        const values = [...input.replace(/\s/g, "")];
        const unique = [...new Set(values)];
        const selected = values.flatMap((v, i) =>
          values.indexOf(v) === i ? [i] : [],
        );
        return [
          step(
            l(
              "Repeated appearances still name the same letter.",
              "Las apariciones repetidas nombran la misma letra.",
            ),
            [items(l("Letter appearances", "Apariciones de letras"), values)],
          ),
          step(
            l(
              "Keep one representative of each distinct letter.",
              "Conserva un representante de cada letra distinta.",
            ),
            [
              items(
                l(
                  "Different letters highlighted",
                  "Letras distintas resaltadas",
                ),
                values,
                selected,
              ),
            ],
          ),
          step(
            l(
              `There are ${unique.length} distinct letters.`,
              `Hay ${unique.length} letras distintas.`,
            ),
            [
              items(
                l("Distinct letters", "Letras distintas"),
                unique,
                unique.map((_, i) => i),
              ),
            ],
            String(unique.length),
          ),
        ];
      },
    };
  if (id === "map")
    return {
      instructions: l(
        "One requested name per line: 1–8 names, each 1–10 lowercase letters. No digits.",
        "Un nombre solicitado por línea: de 1 a 8 nombres, cada uno de 1 a 10 letras minúsculas. Sin dígitos.",
      ),
      presets: presets("abacaba\nacaba\nabacaba\nabacaba", "ada\nada\nada", l),
      build(input) {
        const names = input
          .trim()
          .split("\n")
          .map((r) => r.trim());
        requireInput(
          names.length <= 8 && names.every((n) => /^[a-z]{1,10}$/.test(n)),
          l,
          "Use up to 8 names made of 1–10 lowercase letters.",
          "Usa hasta 8 nombres de 1 a 10 letras minúsculas.",
        );
        const registered = new Set<string>();
        const output: string[] = [];
        const frames = [
          step(
            l(
              "Requests are processed in their arrival order.",
              "Las solicitudes se atienden en orden de llegada.",
            ),
            [items(l("Requested names", "Nombres solicitados"), names)],
          ),
        ];
        names.forEach((name, i) => {
          let assigned = name;
          let suffix = 1;
          while (registered.has(assigned)) assigned = name + suffix++;
          registered.add(assigned);
          output.push(assigned === name ? "OK" : assigned);
          frames.push(
            step(
              l(
                `${name} → ${output[i]}. The registered name is ${assigned}.`,
                `${name} → ${output[i]}. El nombre registrado es ${assigned}.`,
              ),
              [
                items(
                  l(
                    "Names registered so far",
                    "Nombres registrados hasta ahora",
                  ),
                  [...registered],
                  [registered.size - 1],
                  "card",
                ),
              ],
              i === names.length - 1 ? output.join("\n") : undefined,
            ),
          );
        });
        return frames;
      },
    };
  if (id === "ranges")
    return {
      instructions: l(
        "Up to 12 calls, one per line: push(integer), pop(), top(), getMin(). Values −100…100; only query or pop a nonempty container.",
        "Hasta 12 llamadas, una por línea: push(entero), pop(), top(), getMin(). Valores de −100 a 100; consulta o quita solo si hay elementos.",
      ),
      presets: presets(
        "push(5)\npush(2)\npush(4)\ngetMin()\npop()\ngetMin()\npop()\ngetMin()",
        "push(8)\npush(3)\ntop()\ngetMin()",
        l,
      ),
      build(input) {
        const calls = input
          .trim()
          .split("\n")
          .map((r) => r.trim());
        requireInput(
          calls.length <= 12,
          l,
          "Use at most 12 calls.",
          "Usa máximo 12 llamadas.",
        );
        const values: number[] = [];
        const output: number[] = [];
        const frames = [
          step(
            l("The container starts empty.", "El contenedor empieza vacío."),
            [
              items(
                l("Values: oldest → newest", "Valores: antiguo → reciente"),
                [],
              ),
            ],
          ),
        ];
        for (const call of calls) {
          const push = /^push\((-?\d+)\)$/.exec(call);
          let result = "";
          if (push) {
            const n = Number(push[1]);
            requireInput(
              n >= -100 && n <= 100,
              l,
              "Push values from −100 to 100.",
              "Inserta valores de −100 a 100.",
            );
            values.push(n);
          } else {
            requireInput(
              ["pop()", "top()", "getMin()"].includes(call) &&
                values.length > 0,
              l,
              "Use valid calls; pop/top/getMin require a nonempty container.",
              "Usa llamadas válidas; pop/top/getMin necesitan elementos.",
            );
            if (call === "pop()") values.pop();
            else {
              const n = call === "top()" ? values.at(-1)! : Math.min(...values);
              output.push(n);
              result = ` → ${n}`;
            }
          }
          frames.push(
            step(`${call}${result}`, [
              items(
                l(
                  "Current values: oldest → newest",
                  "Valores actuales: antiguo → reciente",
                ),
                [...values],
                call === "getMin()"
                  ? values.flatMap((n, i) =>
                      n === Math.min(...values) ? [i] : [],
                    )
                  : values.length
                    ? [values.length - 1]
                    : [],
              ),
            ]),
          );
        }
        frames.push(
          step(
            l(
              "Only top and getMin return numbers; a query leaves the values unchanged.",
              "Solo top y getMin devuelven números; una consulta no cambia los valores.",
            ),
            [items(l("Final container", "Contenedor final"), values)],
            output.length
              ? output.join("\n")
              : l("No query output", "Sin salida de consultas"),
          ),
        );
        return frames;
      },
    };
  if (id === "watermelon")
    return {
      instructions: l(
        "Enter the total weight, an integer from 1 to 100.",
        "Introduce el peso total, un entero de 1 a 100.",
      ),
      presets: presets("8", "2", l),
      build(input) {
        const weight = numbers(input, l, 1, 100, 1)[0]!,
          valid = weight > 2 && weight % 2 === 0;
        const parts = weight > 2 ? [2, weight - 2] : [1, weight - 1];
        const good = parts.flatMap((p, i) => (p > 0 && p % 2 === 0 ? [i] : [])),
          bad = parts.flatMap((p, i) => (p <= 0 || p % 2 !== 0 ? [i] : []));
        return [
          step(
            l(
              "This is the whole watermelon before it is split.",
              "Esta es la sandía completa antes de dividirla.",
            ),
            [
              items(
                l("Total weight (kg)", "Peso total (kg)"),
                [weight],
                [],
                "watermelon",
              ),
            ],
          ),
          step(
            valid
              ? l(
                  "These two parts are positive and even, and their sum is the original weight.",
                  "Estas dos partes son positivas y pares, y suman el peso original.",
                )
              : l(
                  "This split fails the even-positive rule. No valid split exists for this input.",
                  "Esta división incumple la regla de pesos pares positivos. No existe una división válida para esta entrada.",
                ),
            [
              items(
                l("Example split (kg)", "División de ejemplo (kg)"),
                parts,
                good,
                "watermelon",
                bad,
              ),
            ],
          ),
          step(
            l(
              "The output asks whether a valid split exists, not the two weights.",
              "La salida pregunta si existe una división válida, no cuáles son los dos pesos.",
            ),
            [items(l("Parts", "Partes"), parts, good, "watermelon", bad)],
            valid ? "YES" : "NO",
          ),
        ];
      },
    };
  if (id === "plate" || id === "stones" || id === "chomp")
    return getGameExample(language, id);
  if (id === "password")
    return {
      instructions: l(
        "Enter a password of up to 24 characters; allowed symbols are !@#$%^&*()-+.",
        "Introduce una contraseña de hasta 24 caracteres; símbolos permitidos: !@#$%^&*()-+.",
      ),
      presets: presets("IloveLe3tcode!", "Aa1!aaab", l),
      build(input) {
        const value = input;
        requireInput(
          value.length >= 1 &&
            value.length <= 24 &&
            /^[A-Za-z0-9!@#$%^&*()\-+]+$/.test(value),
          l,
          "Use 1–24 letters, digits, or the listed symbols.",
          "Usa de 1 a 24 letras, dígitos o símbolos indicados.",
        );
        const rules = [
          { text: l("8+ chars", "8+ caract."), ok: value.length >= 8 },
          { text: l("lowercase", "minúscula"), ok: /[a-z]/.test(value) },
          { text: l("uppercase", "mayúscula"), ok: /[A-Z]/.test(value) },
          { text: l("digit", "dígito"), ok: /[0-9]/.test(value) },
          { text: l("symbol", "símbolo"), ok: /[!@#$%^&*()\-+]/.test(value) },
          {
            text: l("no repeats", "sin iguales"),
            ok: ![...value].some((c, i) => i > 0 && c === value[i - 1]),
          },
        ];
        const scene = (revealed: number): Scene => ({
          kind: "items",
          label: l(
            "Required checks: every one must pass",
            "Requisitos: todos deben cumplirse",
          ),
          items: rules.map((r, i) => ({
            text: r.text,
            detail: i === 5 ? l("adjacent", "seguidos") : undefined,
            tone: i < revealed ? (r.ok ? "good" : "bad") : "neutral",
          })),
        });
        return [
          step(
            l(
              "The password must meet all six rules.",
              "La contraseña debe cumplir las seis reglas.",
            ),
            [
              items(l("Password characters", "Caracteres de la contraseña"), [
                ...value,
              ]),
              scene(0),
            ],
          ),
          ...rules.map((r, i) =>
            step(
              `${i === 5 ? l("No identical neighboring characters", "Sin caracteres iguales seguidos") : r.text}: ${r.ok ? "✓" : "✗"}`,
              [scene(i + 1)],
              i === rules.length - 1
                ? String(rules.every((r) => r.ok))
                : undefined,
            ),
          ),
        ];
      },
    };
  return {
    instructions: l(
      "Enter parent indices for folders 1…n (up to 8). Root uses 0; each later folder names an earlier parent (1-based). Use 0 alone for one folder.",
      "Introduce los índices padres de las carpetas 1…n (hasta 8). La raíz usa 0; cada carpeta posterior indica un padre anterior (desde 1). Usa solo 0 para una carpeta.",
    ),
    presets: presets("0 1 1 2", "0", l),
    build(input) {
      const parents = numbers(input, l, 0, 8, 8);
      requireInput(
        parents[0] === 0 &&
          parents.slice(1).every((v, i) => v >= 1 && v <= i + 1),
        l,
        "Only the root uses 0; every other parent must precede its child.",
        "Solo la raíz usa 0; cada otro padre debe ir antes que su hijo.",
      );
      const depths = [1];
      for (let i = 1; i < parents.length; i++)
        depths.push(depths[parents[i]! - 1]! + 1);
      const maximum = Math.max(...depths);
      const end = depths.indexOf(maximum);
      const path: number[] = [];
      for (let i = end; i >= 0; i = parents[i]! - 1) path.unshift(i);
      const scene = (highlight: boolean): Scene => ({
        kind: "graph",
        label: l("Folder tree", "Árbol de carpetas"),
        directed: true,
        folders: true,
        nodes: parents.map((_, i) => ({
          text: i === 0 ? l("Root", "Raíz") : String.fromCharCode(64 + i),
          detail: highlight ? String(depths[i]) : undefined,
          tone: highlight && path.includes(i) ? "good" : "neutral",
        })),
        edges: parents.slice(1).map((parent, i) => ({
          a: parent - 1,
          b: i + 1,
          tone: highlight && path.includes(i + 1) ? "good" : "neutral",
        })),
      });
      return [
        step(
          l(
            "Arrows connect a folder to a direct child.",
            "Las flechas conectan una carpeta con un hijo directo.",
          ),
          [scene(false)],
        ),
        step(
          l(
            "Count folders along a longest root-to-leaf path, including the root.",
            "Cuenta las carpetas en un camino más largo de la raíz a una hoja, incluida la raíz.",
          ),
          [scene(true)],
        ),
        step(
          l(
            `This tree has maximum depth ${maximum}.`,
            `Este árbol tiene profundidad máxima ${maximum}.`,
          ),
          [scene(true)],
          String(maximum),
        ),
      ];
    },
  };
}
