import { getFoundationExample } from "./illustrated/foundationExamples.js";
import type { GuideTraceVisual } from "../guideTrace.js";
import type { ScenarioFrame } from "../ScenarioPlayer.js";
import type { StatementDefinition } from "../StatementPreview.js";

export type FoundationStatementId = "numeric" | "vector" | "stack" | "queue" | "set" | "map" | "ranges" | "watermelon" | "plate" | "stones" | "chomp" | "sudoku" | "password" | "folders";

/** These scenes illustrate the contract and sample result, never a solving procedure. */
function getFoundationStatementCopy(language: string, id: FoundationStatementId): StatementDefinition {
  const es = language.startsWith("es");
  const l = (en: string, spanish: string): string => es ? spanish : en;
  const row = (label: string, values: readonly (string | number)[]): GuideTraceVisual => ({ kind: "collection", label, layout: "row", values });
  const text = (label: string, ...lines: string[]): GuideTraceVisual => ({ kind: "output", label, lines });
  const frame = (narration: string, ...visuals: GuideTraceVisual[]): ScenarioFrame => ({ narration, visuals });
  const result = (value: string): GuideTraceVisual => text(l("Required result", "Resultado solicitado"), value);
  const grid = (label: string, rows: readonly string[], activeRow?: number): GuideTraceVisual => ({ kind: "grid", label, rows: rows.map((r, i) => [...r].map((value) => ({ text: value, tone: i === activeRow ? "active" as const : "unvisited" as const }))) });
  switch (id) {
    case "numeric": return {
      description: l("Find the total number of cells in a rectangular grid.", "Calcula cuántas celdas tiene una cuadrícula rectangular."),
      input: l("Two integers on one line: rows and columns, each between 1 and 10⁹.", "Dos enteros en una línea: filas y columnas, cada uno entre 1 y 10⁹."),
      output: l("Print the exact number of cells as one integer.", "Imprime el número exacto de celdas como un entero."), exampleInput: "3 4", exampleOutput: "12",
      frames: [
        frame(l("The input describes 3 rows and 4 columns.", "La entrada describe 3 filas y 4 columnas."), grid(l("Grid", "Cuadrícula"), ["□□□□", "□□□□", "□□□□"])),
        frame(l("Each row spans all 4 columns. Count every cell in the whole grid.", "Cada fila abarca las 4 columnas. Se pide contar todas las celdas."), grid(l("One row highlighted", "Una fila resaltada"), ["□□□□", "□□□□", "□□□□"], 1)),
        frame(l("Report the total cell count, not the dimensions.", "Indica el número total de celdas, no las dimensiones."), result("?"))
      ]
    };
    case "vector": return {
      description: l("For each customer's budget, count the shops where one drink costs no more than that budget. Each customer is independent.", "Para cada presupuesto, cuenta las tiendas donde una bebida cuesta como máximo esa cantidad. Cada cliente es independiente."),
      input: l("n, then n prices; q, then q budgets (one per line). 1 ≤ n, q ≤ 100,000; prices are 1…100,000 and budgets 1…10⁹.", "n y luego n precios; q y luego q presupuestos (uno por línea). 1 ≤ n, q ≤ 100 000; precios de 1 a 100 000 y presupuestos de 1 a 10⁹."),
      output: l("Print one shop count per budget, in query order. Equal prices belong to separate shops and each counts.", "Imprime una cantidad de tiendas por presupuesto, en orden. Las tiendas con el mismo precio cuentan por separado."), exampleInput: "4\n3 10 8 6\n4\n1\n6\n9\n10", exampleOutput: "0\n2\n3\n4",
      frames: [
        frame(l("Four shops offer the same drink at these prices.", "Cuatro tiendas ofrecen la misma bebida a estos precios."), row(l("Shop prices", "Precios por tienda"), [3, 10, 8, 6])),
        frame(l("A budget of 6 includes a price of 6; a price of 8 is too high.", "Un presupuesto de 6 permite pagar un precio de 6; uno de 8 es demasiado alto."), row(l("Budget", "Presupuesto"), [6]), text(l("Rule", "Regla"), "6 ≤ 6 ✓", "8 > 6 ✗")),
        frame(l("Return a count for each budget, not the shop names or total cost.", "Devuelve una cantidad por presupuesto, no nombres de tiendas ni el costo total."), row(l("Budgets", "Presupuestos"), [1, 6, 9, 10]), result("?\n?\n?\n?"))
      ]
    };
    case "stack": return {
      description: l("Decide whether every bracket has a matching partner of the same type, with pairs correctly nested. Pairs may be adjacent; they may not cross.", "Decide si cada símbolo tiene una pareja del mismo tipo y si las parejas están bien anidadas. Pueden estar juntas, pero no cruzarse."),
      input: l("Function argument s: 1…10,000 characters, using only ( ) [ ] { }.", "Argumento s de la función: de 1 a 10 000 caracteres, solo ( ) [ ] { }."),
      output: l("Return true if the entire string is valid, otherwise false.", "Devuelve true si toda la cadena es válida; de lo contrario, false."), exampleInput: 's = "([{}])"', exampleOutput: "true",
      frames: [
        frame(l("The input is a sequence of opening and closing symbols.", "La entrada es una secuencia de símbolos de apertura y cierre."), row("s", ["(", "[", "{", "}", "]", ")"])),
        frame(l("Here braces sit inside brackets, which sit inside parentheses; this is valid nesting.", "Aquí las llaves están dentro de los corchetes, y estos dentro de los paréntesis; el anidamiento es válido."), text(l("Valid arrangement", "Disposición válida"), "( [ { } ] )", "    └─┘", "  └─────┘", "└─────────┘")),
        frame(l("Return whether the entire sequence is valid. A crossed arrangement such as ([)] is not valid nesting.", "Devuelve si toda la secuencia es válida. Una disposición cruzada como ([)] no tiene anidamiento válido."), result("true / false"), text(l("Crossed pairs", "Parejas cruzadas"), "([)] → false"))
      ]
    };
    case "queue": return {
      description: l("A ping records a request at time t. Return how many requests, including the new one, occurred in the inclusive interval [t − 3000, t].", "Un ping registra una solicitud en el instante t. Devuelve cuántas solicitudes, incluida la nueva, ocurrieron en el intervalo inclusivo [t − 3000, t]."),
      input: l("Up to 10,000 calls to ping(t), starting with no requests. Times are strictly increasing integers from 1 to 10⁹, in milliseconds.", "Hasta 10 000 llamadas a ping(t), sin solicitudes al inicio. Los tiempos son enteros estrictamente crecientes de 1 a 10⁹ milisegundos."),
      output: l("Return one count for each call; both interval endpoints count.", "Devuelve una cantidad por llamada; ambos extremos del intervalo cuentan."), exampleInput: "ping(1)\nping(100)\nping(3001)\nping(3002)", exampleOutput: "1\n2\n3\n3",
      frames: [
        frame(l("Requests arrive at these times, in milliseconds.", "Las solicitudes llegan en estos instantes, en milisegundos."), row(l("Arrival times", "Tiempos de llegada"), [1, 100, 3001, 3002])),
        frame(l("At t = 3001 the interval is [1, 3001]. A request exactly at 1 still counts.", "En t = 3001 el intervalo es [1, 3001]. Una solicitud exactamente en 1 todavía cuenta."), text(l("Inclusive window", "Ventana inclusiva"), "[1 ───────────────── 3001]")),
        frame(l("At t = 3002 the interval becomes [2, 3002]. The result is a count for every call.", "En t = 3002 el intervalo pasa a [2, 3002]. Se entrega una cantidad por llamada."), text(l("Inclusive window", "Ventana inclusiva"), "[2 ───────────────── 3002]"), result("?\n?\n?\n?"))
      ]
    };
    case "set": return {
      description: l("Count the different lowercase letters in a formatted set. Repeated letters count once; braces, commas, and spaces are not letters.", "Cuenta las letras minúsculas distintas en un conjunto escrito. Las repetidas cuentan una vez; llaves, comas y espacios no son letras."),
      input: l("One line, at most 1,000 characters: lowercase English letters inside braces, separated by comma-space. The empty set {} is allowed.", "Una línea de hasta 1000 caracteres: letras minúsculas inglesas entre llaves, separadas por coma y espacio. Se permite el conjunto vacío {}."),
      output: l("Print the number of distinct letters (0…26).", "Imprime la cantidad de letras distintas (de 0 a 26)."), exampleInput: "{a, b, a, c}", exampleOutput: "3",
      frames: [
        frame(l("The input contains letters and formatting characters.", "La entrada contiene letras y caracteres de formato."), text(l("Input line", "Línea de entrada"), "{a, b, a, c}")),
        frame(l("Both appearances of a represent the same letter, not two different letters.", "Las dos apariciones de a representan la misma letra, no dos letras diferentes."), row(l("Letter appearances", "Apariciones de letras"), ["a", "b", "a", "c"])),
        frame(l("Report how many different letters appear. For an empty set, report 0.", "Indica cuántas letras distintas aparecen. Para un conjunto vacío, indica 0."), result("?"))
      ]
    };
    case "map": return {
      description: l("Register usernames in arrival order. Accept an unused name with OK. If it is taken, register that name plus the smallest positive integer suffix that makes it unused.", "Registra nombres de usuario en orden de llegada. Acepta uno libre con OK. Si ya existe, registra el nombre seguido del menor entero positivo que lo haga único."),
      input: l("n (1…100,000), then n usernames, one per line. Each name has 1…32 lowercase English letters; requests contain no digits.", "n (de 1 a 100 000), seguido de n nombres, uno por línea. Cada nombre tiene de 1 a 32 letras minúsculas inglesas; las solicitudes no contienen dígitos."),
      output: l("For each request print OK if the requested name was free; otherwise print the newly registered name with its suffix.", "Por cada solicitud imprime OK si el nombre estaba libre; en caso contrario, imprime el nuevo nombre registrado con su sufijo."), exampleInput: "4\nabacaba\nacaba\nabacaba\nabacaba", exampleOutput: "OK\nOK\nabacaba1\nabacaba2",
      frames: [
        frame(l("Four requests arrive in this exact order.", "Llegan cuatro solicitudes en este orden exacto."), row(l("Requested names", "Nombres solicitados"), ["abacaba", "acaba", "abacaba", "abacaba"])),
        frame(l("Names must be unique: abacaba and acaba are different names, but abacaba repeats.", "Los nombres deben ser únicos: abacaba y acaba son distintos, pero abacaba se repite."), text(l("Naming rule", "Regla de nombres"), "abacaba ≠ acaba", "abacaba1 ≠ abacaba")),
        frame(l("The responses correspond to the requests in the same order.", "Las respuestas corresponden a las solicitudes en el mismo orden."), result(l("One response per request: OK or a suffixed name", "Una respuesta por solicitud: OK o un nombre con sufijo")))
      ]
    };
    case "ranges": return {
      description: l("Design a MinStack with push(x), pop(), top(), and getMin(). Every operation must take O(1) time.", "Diseña un MinStack con push(x), pop(), top() y getMin(). Cada operación debe tardar O(1)."),
      input: l("Start empty. Receive at most 30,000 method calls; x is a signed 32-bit integer. pop, top, and getMin are called only when nonempty.", "Empieza vacío. Recibe hasta 30 000 llamadas; x es un entero de 32 bits con signo. pop, top y getMin solo se llaman cuando hay elementos."),
      output: l("push adds the newest value; pop removes it. top returns the newest value; getMin returns the smallest current value. Queries do not remove values.", "push añade el valor más reciente; pop lo quita. top devuelve el más reciente; getMin devuelve el menor valor actual. Las consultas no quitan valores."), exampleInput: "push(5)\npush(2)\npush(4)\ngetMin()\npop()\ngetMin()\npop()\ngetMin()", exampleOutput: "2\n2\n5",
      frames: [
        frame(l("The object starts empty and receives three additions.", "El objeto empieza vacío y recibe tres inserciones."), text(l("Calls", "Llamadas"), "push(5)", "push(2)", "push(4)")),
        frame(l("Its current values are 5, 2, and 4. The newest and smallest values can differ.", "Sus valores actuales son 5, 2 y 4. El más reciente y el menor pueden ser distintos."), row(l("Values, oldest to newest", "Valores, del más antiguo al más reciente"), [5, 2, 4])),
        frame(l("getMin reads the current minimum without removing it; pop removes the newest value. Return an answer for each query.", "getMin consulta el mínimo actual sin quitarlo; pop quita el más reciente. Devuelve una respuesta por consulta."), result("getMin() → ?\ngetMin() → ?\ngetMin() → ?"))
      ]
    };
    case "watermelon": return {
      description: l("Can a watermelon be split into two parts whose weights are both positive even integers? The parts need not weigh the same.", "¿Se puede dividir una sandía en dos partes cuyos pesos sean enteros pares positivos? No tienen que pesar lo mismo."),
      input: l("One integer w (1…100): the total weight in kilograms.", "Un entero w (de 1 a 100): el peso total en kilogramos."),
      output: l("Print YES if such a split exists; otherwise print NO.", "Imprime YES si existe esa división; de lo contrario, NO."), exampleInput: "8", exampleOutput: "YES",
      frames: [
        frame(l("The input gives the whole watermelon's weight, not the two parts.", "La entrada indica el peso de toda la sandía, no el de las dos partes."), row(l("Whole watermelon", "Sandía completa"), ["8 kg"])),
        frame(l("A valid split has two positive even weights that add up to the input.", "Una división válida tiene dos pesos pares positivos cuya suma coincide con la entrada."), row(l("Required parts", "Partes requeridas"), [l("Part A > 0, even", "Parte A > 0, par"), l("Part B > 0, even", "Parte B > 0, par")]), text(l("Total", "Total"), "A + B = 8")),
        frame(l("Only report whether a valid split exists. The output does not need to name the two parts.", "Solo indica si existe una división válida. La salida no debe indicar los pesos de las partes."), result("YES / NO"))
      ]
    };
    case "plate": return {
      description: l("Two players alternate placing circles of radius 1 on a rectangular table. Circles may touch, but cannot overlap or extend past an edge. The last legal placement wins.", "Dos jugadores colocan por turnos círculos de radio 1 sobre una mesa rectangular. Pueden tocarse, pero no solaparse ni salirse. Gana quien hace la última colocación legal."),
      input: l("Start with an empty 7 × 7 table; the controls can change its dimensions. On your turn choose a circle's center (x, y).", "Empieza con una mesa vacía de 7 × 7; los controles permiten cambiar sus dimensiones. En tu turno elige el centro (x, y) de un círculo."),
      output: l("A legal placement adds a circle and passes the turn. An invalid placement changes nothing. A player unable to place a circle loses.", "Una colocación legal añade el círculo y cambia el turno. Una inválida no cambia nada. Pierde quien no puede colocar un círculo."), exampleInput: l("Empty 7 × 7 table; Player 1 chooses (1, 1).", "Mesa vacía de 7 × 7; el jugador 1 elige (1, 1)."), exampleOutput: l("Circle placed; Player 2's turn.", "Círculo colocado; turno del jugador 2."),
      frames: [
        frame(l("The table begins empty. A center is measured from the table edges.", "La mesa empieza vacía. El centro se mide desde los bordes de la mesa."), grid(l("7 × 7 table", "Mesa de 7 × 7"), Array(7).fill("□□□□□□□"))),
        frame(l("At (1, 1), a radius-1 circle touches two edges and stays inside. This illustrates a legal move, not a recommended move.", "En (1, 1), un círculo de radio 1 toca dos bordes y queda dentro. Es un ejemplo legal, no una jugada recomendada."), text(l("Placement", "Colocación"), "(x, y) = (1, 1)", "r = 1", "0 ≤ x − r, y − r", "x + r, y + r ≤ 7")),
        frame(l("Player 2 moves next. Placing another circle at the same center would overlap and is invalid.", "Ahora juega el jugador 2. Colocar otro círculo en el mismo centro causaría solapamiento y sería inválido."), text(l("State", "Estado"), l("1 circle at (1, 1); Player 2", "1 círculo en (1, 1); jugador 2")))
      ]
    };
    case "stones": return {
      description: l("Start with 25 stones. Players alternate taking 1, 2, or 3 stones. Whoever takes the last stone wins.", "Empieza con 25 piedras. Los jugadores retiran por turnos 1, 2 o 3 piedras. Gana quien retira la última."),
      input: l("The current pile and your choice of 1, 2, or 3 stones. You cannot take more stones than remain.", "La pila actual y tu elección de retirar 1, 2 o 3 piedras. No puedes retirar más de las que quedan."),
      output: l("Remove the chosen number and pass the turn, or declare the moving player the winner if no stones remain.", "Retira la cantidad elegida y cambia de turno, o declara ganador al jugador si no quedan piedras."), exampleInput: l("25 stones; Player 1 takes 2.", "25 piedras; el jugador 1 retira 2."), exampleOutput: l("23 stones; Player 2's turn.", "23 piedras; turno del jugador 2."),
      frames: [
        frame(l("Player 1 starts with 25 stones available.", "El jugador 1 comienza con 25 piedras disponibles."), grid(l("Stones", "Piedras"), Array(5).fill("●●●●●"))),
        frame(l("Taking 2 is one legal choice. This is only a move example, not a strategy.", "Retirar 2 es una opción legal. Es solo un ejemplo de turno, no una estrategia."), row(l("Allowed amounts", "Cantidades permitidas"), [1, 2, 3]), text(l("Example action", "Acción de ejemplo"), "25 − 2 = 23")),
        frame(l("23 stones remain and Player 2 moves. The game ends when a player takes the last stone.", "Quedan 23 piedras y juega el jugador 2. La partida termina cuando alguien retira la última piedra."), grid(l("Remaining stones", "Piedras restantes"), ["●●●●●", "●●●●●", "●●●●●", "●●●●●", "●●●··"]))
      ]
    };
    case "chomp": return {
      description: l("Players alternate choosing a chocolate square. A bite removes that square and all remaining squares both below it and to its right, including its row and column. Whoever chooses the top-left poisoned square loses.", "Los jugadores eligen por turnos una casilla de chocolate. El mordisco quita esa casilla y todas las que quedan abajo y a su derecha, incluyendo su fila y columna. Pierde quien elige la casilla envenenada de la esquina superior izquierda."),
      input: l("The remaining board and a square still present. The game starts with 5 rows and 7 columns; Player 1 moves first.", "El tablero restante y una casilla presente. La partida empieza con 5 filas y 7 columnas; juega primero el jugador 1."),
      output: l("Remove the selected bottom-right region and pass the turn. Choosing the poison immediately gives the other player the win.", "Quita la región seleccionada hacia abajo y la derecha, y cambia de turno. Elegir el veneno da la victoria inmediata al rival."), exampleInput: l("Full 5 × 7 board; choose row 3, column 5 (counting from 1).", "Tablero completo de 5 × 7; elige fila 3, columna 5 (contando desde 1)."), exampleOutput: l("Remove rows 3–5, columns 5–7; the other player moves.", "Quita las filas 3–5, columnas 5–7; juega el rival."),
      frames: [
        frame(l("☠ marks the poison. Choose only a square that remains.", "☠ marca el veneno. Solo puedes elegir una casilla que siga presente."), grid(l("Chocolate board", "Tablero de chocolate"), ["☠□□□□□□", "□□□□□□□", "□□□□□□□", "□□□□□□□", "□□□□□□□"])),
        frame(l("This example bite starts at row 3, column 5 (one-based). × marks all squares removed by that bite.", "Este mordisco empieza en la fila 3, columna 5 (desde 1). × marca todas las casillas que quita."), grid(l("Bite region", "Región del mordisco"), ["☠□□□□□□", "□□□□□□□", "□□□□×××", "□□□□×××", "□□□□×××"])),
        frame(l("The other player receives this remaining board. The example shows the bite rule only.", "El rival recibe este tablero restante. El ejemplo solo muestra la regla del mordisco."), grid(l("Remaining board", "Tablero restante"), ["☠□□□□□□", "□□□□□□□", "□□□□···", "□□□□···", "□□□□···"]))
      ]
    };
    case "sudoku": {
      const board = ["53..7....", "6..195...", ".98....6.", "8...6...3", "4..8.3..1", "7...2...6", ".6....28.", "...419..5", "....8..79"];
      return {
        description: l("Decide whether the filled cells of a Sudoku board obey the rules: digits 1–9 must not repeat in any row, column, or 3 × 3 box. You do not need to fill the empty cells.", "Decide si las casillas llenas de un Sudoku cumplen las reglas: los dígitos del 1 al 9 no pueden repetirse en una fila, columna o bloque de 3 × 3. No debes llenar las casillas vacías."),
        input: l("Function argument board: a 9 × 9 character grid containing digits 1–9 and '.' for empty cells. The sample shows one row per line.", "Argumento board: cuadrícula de caracteres de 9 × 9 con dígitos del 1 al 9 y '.' para casillas vacías. El ejemplo muestra una fila por línea."),
        output: l("Return true if the filled cells satisfy all three rules, otherwise false. A valid partial board need not be solvable.", "Devuelve true si las casillas llenas cumplen las tres reglas; de lo contrario, false. Un tablero parcial válido no necesariamente tiene solución."), exampleInput: board.join("\n"), exampleOutput: "true",
        frames: [
          frame(l("Dots are empty cells. Only the existing digits are being judged.", "Los puntos son casillas vacías. Solo se evalúan los dígitos existentes."), grid(l("Given board", "Tablero recibido"), board)),
          frame(l("The first row contains 5, 3, and 7. A second 5 in that row would violate the row rule.", "La primera fila contiene 5, 3 y 7. Otro 5 en esa fila violaría la regla de filas."), grid(l("One row highlighted", "Una fila resaltada"), board, 0)),
          frame(l("Return whether all rows, columns, and boxes obey the rules. Leave the empty cells unfilled.", "Devuelve si todas las filas, columnas y bloques cumplen las reglas. Deja vacías las casillas sin llenar."), result("true / false"))
        ]
      };
    }
    case "password": return {
      description: l("A strong password has at least 8 characters, an uppercase letter, a lowercase letter, a digit, and a special character from !@#$%^&*()-+. Adjacent characters must never be equal.", "Una contraseña fuerte tiene al menos 8 caracteres, una mayúscula, una minúscula, un dígito y un carácter especial de !@#$%^&*()-+. No puede tener caracteres iguales consecutivos."),
      input: l("Function argument password: 1…100 characters, using English letters, digits, and the listed special characters.", "Argumento password: de 1 a 100 caracteres, con letras inglesas, dígitos y los caracteres especiales indicados."),
      output: l("Return true only when every rule holds; otherwise false.", "Devuelve true solo si se cumplen todas las reglas; de lo contrario, false."), exampleInput: 'password = "IloveLe3tcode!"', exampleOutput: "true",
      frames: [
        frame(l("The sample password has 13 characters.", "La contraseña de ejemplo tiene 13 caracteres."), row("password", [..."IloveLe3tcode!"])),
        frame(l("Uppercase I, lowercase l, digit 3, and special character ! are present. Repeated letters are allowed when they are not adjacent.", "Están presentes la mayúscula I, la minúscula l, el dígito 3 y el carácter especial !. Se permiten letras repetidas si no están juntas."), row(l("Required character categories", "Categorías de caracteres requeridas"), ["I", "l", "3", "!"])),
        frame(l("Return whether every rule holds. The task returns a boolean, not a replacement password.", "Devuelve si se cumplen todas las reglas. La tarea devuelve un booleano, no otra contraseña."), result("true / false"))
      ]
    };
    case "folders": {
      const tree: GuideTraceVisual = { kind: "graph", label: l("Folder tree", "Árbol de carpetas"), directed: true, nodes: [
        { id: "root", label: l("Root", "Raíz"), x: 50, y: 15, tone: "idle" },
        { id: "a", label: "A", x: 25, y: 50, tone: "idle" },
        { id: "b", label: "B", x: 75, y: 50, tone: "idle" },
        { id: "c", label: "C", x: 25, y: 85, tone: "idle" }
      ], edges: [{ from: "root", to: "a", tone: "idle" }, { from: "root", to: "b", tone: "idle" }, { from: "a", to: "c", tone: "idle" }] };
      return {
        description: l("Find the maximum depth of a folder tree: the number of folders on the longest path from the root to a folder with no children. Count the root as level 1.", "Encuentra la profundidad máxima de un árbol de carpetas: el número de carpetas en el camino más largo desde la raíz hasta una carpeta sin hijos. La raíz cuenta como nivel 1."),
        input: l("Function argument root: an N-ary tree with 0…10,000 nodes and height at most 1,000. Each node may have any number of children; null means an empty tree.", "Argumento root: árbol n-ario con entre 0 y 10 000 nodos y altura máxima de 1000. Cada nodo puede tener cualquier cantidad de hijos; null indica un árbol vacío."),
        output: l("Return the maximum number of nodes on a root-to-leaf path. Return 0 for an empty tree.", "Devuelve la mayor cantidad de nodos en un camino de la raíz a una hoja. Devuelve 0 si el árbol está vacío."), exampleInput: l("Root → [A, B]\nA → [C]\nB → []\nC → []", "Raíz → [A, B]\nA → [C]\nB → []\nC → []"), exampleOutput: "3",
        frames: [
          frame(l("Each arrow connects a folder to a direct child.", "Cada flecha conecta una carpeta con un hijo directo."), tree),
          frame(l("A depth counts folders, not arrows. A tree containing only its root has depth 1.", "La profundidad cuenta carpetas, no flechas. Un árbol con solo su raíz tiene profundidad 1."), text(l("Depth convention", "Convención de profundidad"), l("Root: level 1\nA, B: level 2\nC: level 3", "Raíz: nivel 1\nA, B: nivel 2\nC: nivel 3"))),
          frame(l("Return the maximum depth as a number, not a list of folder names.", "Devuelve la profundidad máxima como un número, no como una lista de carpetas."), result("?"))
        ]
      };
    }
  }
}

export function getFoundationStatement(language: string, id: FoundationStatementId): StatementDefinition {
  const copy = getFoundationStatementCopy(language, id);
  const illustration = getFoundationExample(language, id);
  return { ...copy, ...(illustration ? { illustration } : {}) };
}
