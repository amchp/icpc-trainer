import { getCoreExample } from "./illustrated/coreExamples.js";
import type { GuideTracePrimitive, GuideTraceVisual } from "../guideTrace.js";
import type { ScenarioFrame } from "../ScenarioPlayer.js";
import type { StatementDefinition } from "../StatementPreview.js";

export type CoreStatementId = "alice" | "kitchen" | "sakurako" | "sudoku" | "first" | "closest" | "numeric" | "bad" | "magic" | "search" | "duplicates" | "stock" | "zeros" | "power" | "capstone";

/** These frames explain the contract only. Worked solutions belong behind the reveal. */
function getCoreStatementCopy(language: string, id: CoreStatementId): StatementDefinition {
  const es = language.startsWith("es");
  const l = (en: string, spanish: string): string => es ? spanish : en;
  const vector = (label: string, values: readonly GuideTracePrimitive[]): GuideTraceVisual => ({ kind: "vector", label, values });
  const row = (label: string, values: readonly GuideTracePrimitive[]): GuideTraceVisual => ({ kind: "collection", layout: "row", label, values });
  const note = (label: string, ...lines: string[]): GuideTraceVisual => ({ kind: "output", label, lines });
  const frame = (narration: string, ...visuals: GuideTraceVisual[]): ScenarioFrame => ({ narration, visuals });
  const given = l("Given", "Datos");
  const rule = l("Rule", "Regla");
  const wanted = l("Your result", "Tu resultado");
  const definition = (description: string, input: string, output: string, exampleInput: string, exampleOutput: string, frames: readonly ScenarioFrame[]): StatementDefinition => ({ description, input, output, exampleInput, exampleOutput, frames });

  switch (id) {
    case "alice": return definition(
      l("Alice starts at (0, 0) and repeats a movement string forever. Does she ever reach (a, b)?", "Alice empieza en (0, 0) y repite una cadena de movimientos para siempre. ¿Llega alguna vez a (a, b)?"),
      l("A string of n moves and target coordinates a, b. N increases y; S decreases y; E increases x; W decreases x, each by 1.", "Una cadena de n movimientos y las coordenadas objetivo a, b. N aumenta y; S reduce y; E aumenta x; W reduce x, siempre en 1."),
      l("YES if Alice reaches the target after any move; otherwise NO. The example shows one case.", "YES si Alice llega al objetivo después de algún movimiento; de lo contrario, NO. El ejemplo muestra un caso."),
      "n = 3, a = 1, b = 2\ns = NNE", "YES",
      [frame(l("The start and target are different locations.", "El inicio y el objetivo son lugares distintos."), note(given, "Alice: (0, 0)", l("Target: (1, 2)", "Objetivo: (1, 2)"))),
       frame(l("Each letter describes a single move. The string order matters.", "Cada letra describe un movimiento. El orden de la cadena importa."), row("s", ["N", "N", "E"]), note(rule, "N: y + 1 · S: y − 1", "E: x + 1 · W: x − 1")),
       frame(l("After the last letter, the same string begins again. Decide whether the target is ever visited.", "Después de la última letra, la misma cadena vuelve a empezar. Decide si se visita el objetivo alguna vez."), row(l("Repeating instruction string", "Cadena de instrucciones repetida"), ["NNE", "NNE", "NNE", "…"]), note(wanted, "YES / NO"))]
    );
    case "kitchen": return definition(
      l("Arrange plates A–E from lightest to heaviest so that all five comparisons are true.", "Ordena los platos A–E del más liviano al más pesado para cumplir las cinco comparaciones."),
      l("Five comparisons such as A>B, meaning A is heavier than B. Every plate has a different weight.", "Cinco comparaciones como A>B, que significa que A pesa más que B. Todos los platos tienen pesos distintos."),
      l("The five letters in increasing weight order, or impossible if no order satisfies all comparisons.", "Las cinco letras en orden de peso creciente, o impossible si ningún orden cumple todas las comparaciones."),
      "D>B\nA>D\nE<C\nA>B\nB>C", "ECBDA",
      [frame(l("These are the five plates; their weights are unknown.", "Estos son los cinco platos; sus pesos son desconocidos."), row(given, ["A", "B", "C", "D", "E"])),
       frame(l("A comparison gives a weight relationship, not the whole order.", "Una comparación indica una relación de peso, no el orden completo."), note(given, "D>B", "A>D", "E<C", "A>B", "B>C"), note(rule, l("A>B means A is heavier than B.", "A>B significa que A pesa más que B."))),
       frame(l("Use every letter once. The answer must satisfy every comparison.", "Usa cada letra una vez. La respuesta debe cumplir todas las comparaciones."), row(l("Lightest → heaviest", "Más liviano → más pesado"), ["?", "?", "?", "?", "?"]), note(wanted, l("Five letters, or impossible", "Cinco letras, o impossible")))]
    );
    case "sakurako": return definition(
      l("You have a copies of 1 and b copies of 2. Can you put a + or − before every value so that the total is zero?", "Tienes a copias de 1 y b copias de 2. ¿Puedes poner + o − delante de cada valor para que el total sea cero?"),
      l("Two counts a and b. Use every supplied value exactly once.", "Dos cantidades a y b. Usa cada valor exactamente una vez."),
      l("YES if such signs exist; otherwise NO. The example shows one case.", "YES si existen esos signos; de lo contrario, NO. El ejemplo muestra un caso."),
      "a = 2\nb = 1", "YES",
      [frame(l("The counts describe these values, including repeated copies.", "Las cantidades describen estos valores, incluidas las copias repetidas."), row(given, [1, 1, 2])),
       frame(l("Each copy needs its own sign; no value may be left out.", "Cada copia necesita su propio signo; no puedes omitir ningún valor."), row(rule, ["±1", "±1", "±2"])),
       frame(l("The question is whether the signed total can equal zero.", "La pregunta es si el total con signos puede ser cero."), note(wanted, "(±1) + (±1) + (±2) = 0 ?", "YES / NO"))]
    );
    case "sudoku": {
      const puzzle = [".34678912", "672195348", "198342567", "859.61423", "426853791", "713924856", "961537284", "287419635", "34528617."];
      const board = (focus: "row" | "box" | "none"): GuideTraceVisual => ({ kind: "grid", label: l("Given board · dots are empty", "Tablero inicial · los puntos son vacíos"), rows: puzzle.map((line, r) => [...line].map((text, c) => ({ text, tone: (focus === "row" && r === 0) || (focus === "box" && r < 3 && c < 3) ? "active" : "unvisited" }))) });
      return definition(
        l("Fill the empty cells of a 9×9 Sudoku. Each row, column, and 3×3 box must contain the digits 1–9 exactly once.", "Completa las casillas vacías de un Sudoku de 9×9. Cada fila, columna y bloque de 3×3 debe contener los dígitos del 1 al 9 exactamente una vez."),
        l("Nine rows of nine cells. A dot marks an empty cell; given digits cannot change.", "Nueve filas de nueve casillas. Un punto marca una casilla vacía; los dígitos dados no pueden cambiar."),
        l("A completed board satisfying all Sudoku rules.", "Un tablero completo que cumpla todas las reglas del Sudoku."),
        puzzle.join("\n"), "534678912\n672195348\n198342567\n859761423\n426853791\n713924856\n961537284\n287419635\n345286179",
        [frame(l("Only the empty cells may change.", "Solo pueden cambiar las casillas vacías."), board("none")),
         frame(l("Every row and every column must contain each digit once. The top row is highlighted as one example of a row.", "Cada fila y cada columna debe contener cada dígito una vez. La fila superior está resaltada como ejemplo de una fila."), board("row")),
         frame(l("The same rule applies within each 3×3 box. Return the complete board.", "La misma regla se aplica dentro de cada bloque de 3×3. Devuelve el tablero completo."), board("box"))]
      );
    }
    case "first": return definition(
      l("Find the first occurrence of a target in a sorted array. Return its index, or −1 if it is absent.", "Encuentra la primera aparición de un objetivo en un arreglo ordenado. Devuelve su índice, o −1 si no aparece."),
      l("A non-decreasing integer array values and an integer target. Indices start at 0; duplicates are allowed.", "Un arreglo de enteros values ordenado de menor a mayor y un entero target. Los índices empiezan en 0; puede haber repetidos."),
      l("The smallest index holding target, or −1.", "El menor índice que contiene target, o −1."),
      "values = [1, 2, 2, 4, 4, 4, 4, 6, 7, 7, 12, 20]\ntarget = 7", "8",
      [frame(l("The small numbers above the cells are indices, not array values.", "Los números pequeños sobre las casillas son índices, no valores del arreglo."), vector("values", [1, 2, 2, 4, 4, 4, 4, 6, 7, 7, 12, 20])),
       frame(l("The requested value may appear more than once.", "El valor buscado puede aparecer más de una vez."), note(given, "target = 7"), note(rule, l("Return the first occurrence only.", "Devuelve solo la primera aparición."))),
       frame(l("Return a position, rather than the target value itself.", "Devuelve una posición, no el propio valor objetivo."), note(wanted, l("index = ? (−1 if absent)", "índice = ? (−1 si no aparece)")))]
    );
    case "closest": return definition(
      l("Return the array value closest to x. If two values are equally close, return the smaller one.", "Devuelve el valor del arreglo más cercano a x. Si dos valores están igual de cerca, devuelve el menor."),
      l("A nonempty sorted integer array values and an integer x.", "Un arreglo no vacío de enteros ordenados values y un entero x."),
      l("One value from the array with the smallest absolute distance from x.", "Un valor del arreglo con la menor distancia absoluta a x."),
      "values = [3, 5, 10, 13, 18, 25]\nx = 15", "13",
      [frame(l("These are the values available to return.", "Estos son los valores que puedes devolver."), row("values", [3, 5, 10, 13, 18, 25])),
       frame(l("Distance measures the gap between a value and x, in either direction.", "La distancia mide la separación entre un valor y x, en cualquier dirección."), note(given, "x = 15"), note(rule, "distance = |value − x|")),
       frame(l("Return a value, not an index. Equal distances are settled by choosing the smaller value.", "Devuelve un valor, no un índice. Si las distancias empatan, elige el valor menor."), note(wanted, "value = ?"))]
    );
    case "numeric": return definition(
      l("Approximate the nonnegative square root of x: a number y whose square is x.", "Aproxima la raíz cuadrada no negativa de x: un número y cuyo cuadrado es x."),
      l("A nonnegative real number x. The lab lets you choose a precision threshold or an iteration budget.", "Un número real no negativo x. El laboratorio permite elegir un umbral de precisión o un límite de iteraciones."),
      l("A nonnegative real approximation to √x. The example is rounded to 5 decimal places.", "Una aproximación real no negativa de √x. El ejemplo está redondeado a 5 decimales."),
      "x = 10", "3.16228",
      [frame(l("The input describes an area of 10 square units.", "La entrada describe un área de 10 unidades cuadradas."), note(given, "x = 10")),
       frame(l("Imagine a square of that area. Its unknown side length is y.", "Imagina un cuadrado con esa área. La longitud desconocida de su lado es y."), note(rule, "y × y = 10", "y ≥ 0")),
       frame(l("The requested side length can have decimal places.", "La longitud solicitada puede tener decimales."), note(wanted, "y = ?"))]
    );
    case "bad": return definition(
      l("Find the earliest bad version. Once a version is bad, all later versions are bad too.", "Encuentra la primera versión defectuosa. Desde esa versión, todas las posteriores también son defectuosas."),
      l("A version count n and access to isBadVersion(v), which reports whether version v is bad. The first bad version is hidden from your program.", "Una cantidad de versiones n y acceso a isBadVersion(v), que indica si la versión v es defectuosa. La primera versión defectuosa está oculta para tu programa."),
      l("The number of the first bad version, using as few API calls as possible. The example describes the API's behavior.", "El número de la primera versión defectuosa, usando la menor cantidad posible de llamadas a la API. El ejemplo describe el comportamiento de la API."),
      "n = 7\nisBadVersion(1…7) = [false, false, false, true, true, true, true]", "4",
      [frame(l("Versions are numbered from 1 through n. Their statuses are initially unknown.", "Las versiones están numeradas del 1 al n. Sus estados son desconocidos al inicio."), row(given, ["1: ?", "2: ?", "3: ?", "4: ?", "5: ?", "6: ?", "7: ?"])),
       frame(l("An API call reveals one version's status.", "Una llamada a la API revela el estado de una versión."), note(rule, "isBadVersion(v) → true / false")),
       frame(l("At least one bad version exists. Report the earliest one.", "Existe al menos una versión defectuosa. Indica la primera."), note(rule, l("Bad versions are followed only by bad versions.", "Después de una versión defectuosa, todas son defectuosas.")), note(wanted, "version = ?"))]
    );
    case "magic": return definition(
      l("Make as many cookies as possible with the available ingredients. Each gram of magic powder can replace one gram of any one ingredient.", "Prepara la mayor cantidad posible de galletas con los ingredientes disponibles. Cada gramo de polvo mágico puede reemplazar un gramo de cualquier ingrediente."),
      l("Arrays need and stock give grams per cookie and grams available for each ingredient. k is the total grams of powder, shared by all ingredients.", "Los arreglos need y stock indican gramos por galleta y gramos disponibles de cada ingrediente. k es el total de gramos de polvo, compartido entre todos los ingredientes."),
      l("The maximum whole number of cookies you can make.", "La máxima cantidad entera de galletas que puedes preparar."),
      "need = [2, 1, 4]\nstock = [11, 3, 16]\nk = 1", "4",
      [frame(l("Matching positions refer to the same ingredient.", "Las posiciones correspondientes se refieren al mismo ingrediente."), vector("need", [2, 1, 4]), vector("stock", [11, 3, 16])),
       frame(l("Every cookie uses all three ingredients in the given amounts.", "Cada galleta usa los tres ingredientes en las cantidades dadas."), row(l("Recipe for one cookie", "Receta de una galleta"), ["2 g", "1 g", "4 g"])),
       frame(l("There is only one shared gram of powder. Find how many complete cookies the supplies allow.", "Hay solo un gramo de polvo compartido. Encuentra cuántas galletas completas permiten los suministros."), note(given, "k = 1 g"), note(wanted, l("Maximum cookies = ?", "Máximo de galletas = ?")))]
    );
    case "search": return definition(
      l("For each requested user ID, report whether it exists in the stored list.", "Para cada ID de usuario solicitado, indica si existe en la lista guardada."),
      l("A list users of n stored IDs and a list queries of q requested IDs. Each ID occupies 8 bytes.", "Una lista users de n IDs guardados y una lista queries de q IDs solicitados. Cada ID ocupa 8 bytes."),
      l("One true/false result per query, in query order. Then estimate the operations and memory your proposed solution uses.", "Un resultado true/false por consulta, en el orden recibido. Después estima las operaciones y la memoria de tu solución."),
      "users = [4, 12, 19, 31, 44]\nqueries = [31, 50]", "[true, false]",
      [frame(l("The stored IDs describe which users exist.", "Los IDs guardados describen qué usuarios existen."), row("users", [4, 12, 19, 31, 44])),
       frame(l("Each query asks a separate membership question.", "Cada consulta pregunta por separado si un ID existe."), vector("queries", [31, 50])),
       frame(l("Keep the query order in the result. Account for operations and bytes after choosing your approach.", "Conserva el orden de las consultas en el resultado. Cuenta operaciones y bytes después de elegir tu enfoque."), row(wanted, ["31: ?", "50: ?"]), note(rule, "1 ID = 8 bytes"))]
    );
    case "duplicates": return definition(
      l("Decide whether any integer appears more than once in the array.", "Decide si algún entero aparece más de una vez en el arreglo."),
      l("An integer array nums. Equal values at different positions count as duplicates.", "Un arreglo de enteros nums. Los valores iguales en posiciones distintas cuentan como repetidos."),
      l("true if a value occurs at least twice; otherwise false.", "true si algún valor aparece al menos dos veces; de lo contrario, false."),
      "nums = [1, 2, 3, 1]", "true",
      [frame(l("Each cell is one occurrence of a value.", "Cada casilla es una aparición de un valor."), vector("nums", [1, 2, 3, 1])),
       frame(l("Two different positions may hold the same integer; that is what counts as a duplicate.", "Dos posiciones distintas pueden contener el mismo entero; eso cuenta como un repetido."), note(rule, "i ≠ j", "nums[i] = nums[j] ?")),
       frame(l("Only report whether a duplicate exists. You do not need to list it or count it.", "Solo indica si existe un repetido. No necesitas mostrarlo ni contarlo."), note(wanted, "true / false"))]
    );
    case "stock": return definition(
      l("Choose one day to buy and a later day to sell. Return the greatest possible profit, or 0 if no profitable trade exists.", "Elige un día para comprar y uno posterior para vender. Devuelve la mayor ganancia posible, o 0 si no existe una operación rentable."),
      l("An array prices in day order. You may complete at most one buy and one later sale.", "Un arreglo prices en orden de días. Puedes realizar como máximo una compra y una venta posterior."),
      l("The largest nonnegative profit: sale price minus purchase price.", "La mayor ganancia no negativa: precio de venta menos precio de compra."),
      "prices = [7, 1, 5, 3, 6, 4]", "5",
      [frame(l("The position of each price determines its day.", "La posición de cada precio determina su día."), vector("prices", [7, 1, 5, 3, 6, 4])),
       frame(l("Selling must happen on a later day than buying.", "La venta debe ocurrir en un día posterior a la compra."), row(rule, [l("Buy day", "Día de compra"), "→", l("Sell day", "Día de venta")])),
       frame(l("You may also choose not to trade, for a profit of zero.", "También puedes no operar, con una ganancia de cero."), note(wanted, l("Maximum profit = ?", "Ganancia máxima = ?")), note(rule, l("Profit = sale − purchase", "Ganancia = venta − compra")))]
    );
    case "zeros": return definition(
      l("Duplicate each original zero, keeping the other values in order. The array length stays fixed: values beyond its end are discarded.", "Duplica cada cero original y conserva el orden de los demás valores. La longitud del arreglo no cambia: se descartan los valores que queden fuera."),
      l("An integer array arr of fixed length n. Newly added zeros are not duplicated again.", "Un arreglo de enteros arr de longitud fija n. Los ceros recién agregados no se vuelven a duplicar."),
      l("The same array after the transformation, with exactly n values.", "El mismo arreglo después de la transformación, con exactamente n valores."),
      "arr = [1, 0, 2, 3, 0, 4, 5, 0]", "[1, 0, 0, 2, 3, 0, 0, 4]",
      [frame(l("There are eight slots. The result must fit in those same eight slots.", "Hay ocho casillas. El resultado debe caber en esas mismas ocho casillas."), vector("arr", [1, 0, 2, 3, 0, 4, 5, 0])),
       frame(l("This is the transformation rule for one original value, not a processing order.", "Esta es la regla de transformación para un valor original, no un orden de procesamiento."), note(rule, "0 → 0, 0", l("Nonzero value → unchanged value", "Valor distinto de cero → mismo valor"))),
       frame(l("Keep the first eight values of the transformed sequence; discard anything after them.", "Conserva los primeros ocho valores de la secuencia transformada; descarta todo lo posterior."), row(wanted, ["?", "?", "?", "?", "?", "?", "?", "?"]))]
    );
    case "power": return definition(
      l("Return F(n), the Fibonacci number at index n. The sequence starts at F(0) = 0 and F(1) = 1; each later value is the sum of the previous two.", "Devuelve F(n), el número de Fibonacci en el índice n. La secuencia empieza con F(0) = 0 y F(1) = 1; cada valor posterior es la suma de los dos anteriores."),
      l("An integer n from 0 through 30. Indexing starts at 0.", "Un entero n entre 0 y 30. Los índices empiezan en 0."),
      l("The integer F(n), rather than the entire sequence.", "El entero F(n), no la secuencia completa."),
      "n = 6", "8",
      [frame(l("The input is a position in the sequence.", "La entrada es una posición de la secuencia."), note(given, "n = 6")),
       frame(l("Only these first two values are given. The rule defines all later values.", "Solo se dan estos dos valores iniciales. La regla define los valores posteriores."), vector("F", [0, 1, "?", "?", "?", "?", "?"]), note(rule, "F(i) = F(i − 1) + F(i − 2), i ≥ 2")),
       frame(l("Report the value at the requested position.", "Indica el valor en la posición solicitada."), note(wanted, "F(6) = ?"))]
    );
    case "capstone": return definition(
      l("Find two different array positions whose values add up to target.", "Encuentra dos posiciones distintas del arreglo cuyos valores sumen target."),
      l("An integer array nums and an integer target. Exactly one valid pair exists; indices start at 0.", "Un arreglo de enteros nums y un entero target. Existe exactamente una pareja válida; los índices empiezan en 0."),
      l("The two original indices, in either order. You cannot use one position twice.", "Los dos índices originales, en cualquier orden. No puedes usar una posición dos veces."),
      "nums = [2, 7, 11, 15]\ntarget = 9", "[0, 1]",
      [frame(l("The answer must refer to the original positions shown above the cells.", "La respuesta debe referirse a las posiciones originales que aparecen sobre las casillas."), vector("nums", [2, 7, 11, 15])),
       frame(l("Two different positions must contribute to the target total.", "Dos posiciones distintas deben contribuir al total objetivo."), note(given, "target = 9"), note(rule, "i ≠ j", "nums[i] + nums[j] = target")),
       frame(l("Return indices, not the values stored there.", "Devuelve índices, no los valores guardados allí."), row(wanted, ["i = ?", "j = ?"]))]
    );
  }
}

export function getCoreStatement(language: string, id: CoreStatementId): StatementDefinition {
  const copy = getCoreStatementCopy(language, id);
  const illustration = id === "alice" || id === "kitchen" ? undefined : getCoreExample(language, id);
  return { ...copy, ...(illustration ? { illustration } : {}) };
}
