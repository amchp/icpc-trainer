import { getAdvancedExample } from "./illustrated/advancedExamples.js";
import type { GuideTracePrimitive, GuideTraceVisual } from "../guideTrace.js";
import type { ScenarioFrame } from "../ScenarioPlayer.js";
import type { StatementDefinition } from "../StatementPreview.js";

export type AdvancedStatementId =
  | "rooms" | "labyrinth" | "teams" | "schedule" | "routes"
  | "fibonacci" | "nonAdjacent" | "grid" | "knapsack" | "dag"
  | "coins" | "fails" | "activities" | "twins" | "chat" | "alternating";

type Copy = readonly [english: string, spanish: string];

/** These frames explain the instance and its rules; solution steps belong behind the reveal. */
function getAdvancedStatementCopy(language: string, id: AdvancedStatementId): StatementDefinition {
  const text = (copy: Copy): string => copy[language.startsWith("es") ? 1 : 0];
  const row = (label: Copy, values: readonly GuideTracePrimitive[], activeIndex?: number): GuideTraceVisual => ({
    kind: "collection", layout: "row", label: text(label), values,
    ...(activeIndex === undefined ? {} : { activeIndex })
  });
  const note = (label: Copy, lines: readonly string[]): GuideTraceVisual => ({ kind: "output", label: text(label), lines });
  const frame = (narration: Copy, ...visuals: GuideTraceVisual[]): ScenarioFrame => ({ narration: text(narration), visuals });
  const board = (rows: readonly string[], cursor?: { row: number; column: number }): GuideTraceVisual => ({
    kind: "grid", label: text(["Given map", "Mapa de entrada"]),
    rows: rows.map((line) => [...line].map((cell) => ({ text: cell, tone: cell === "#" || cell === "*" ? "wall" : "unvisited" }))),
    ...(cursor === undefined ? {} : { cursor })
  });
  const graph = (count: number, edges: readonly (readonly [number, number, number?])[], directed: boolean, activeEdge?: number): GuideTraceVisual => ({
    kind: "graph", label: text(["Given connections", "Conexiones de entrada"]), directed,
    nodes: Array.from({ length: count }, (_, index) => ({
      id: String(index + 1), label: String(index + 1),
      x: 50 + 35 * Math.cos((index / count) * 2 * Math.PI - Math.PI / 2),
      y: 50 + 35 * Math.sin((index / count) * 2 * Math.PI - Math.PI / 2), tone: "idle"
    })),
    edges: edges.map(([from, to, weight], index) => ({ from: String(from), to: String(to), tone: index === activeEdge ? "active" : "idle", ...(weight === undefined ? {} : { weight }) }))
  });
  const make = (description: Copy, input: Copy, output: Copy, exampleInput: string, exampleOutput: string, frames: readonly ScenarioFrame[]): StatementDefinition => ({
    description: text(description), input: text(input), output: text(output), exampleInput, exampleOutput, frames
  });
  const requested: Copy = ["Your output", "Tu salida"];
  switch (id) {
    case "rooms": {
      const map = ["########", "#..#...#", "####.#.#", "#..#...#", "########"];
      return make(
        ["Count the rooms in a map. A room consists of all floor cells connected by moves up, down, left, or right. Walls and diagonal contact do not connect rooms.", "Cuenta las habitaciones de un mapa. Una habitación reúne las celdas de suelo conectadas al moverse arriba, abajo, a la izquierda o a la derecha. Las paredes y el contacto diagonal no conectan habitaciones."],
        ["First n and m (rows and columns), then n strings of length m: . is floor and # is a wall.", "Primero n y m (filas y columnas), luego n cadenas de longitud m: . es suelo y # es pared."],
        ["One integer: the number of rooms.", "Un entero: el número de habitaciones."],
        `5 8\n${map.join("\n")}`, "3", [
          frame(["The input describes this 5-row, 8-column building.", "La entrada describe este edificio de 5 filas y 8 columnas."], board(map)),
          frame(["From the marked floor cell, only side-sharing floor cells are directly connected. You cannot cross #.", "Desde la celda de suelo marcada, solo hay conexión directa con celdas de suelo que comparten un lado. No puedes cruzar #."], board(map, { row: 1, column: 1 })),
          frame(["Count whole rooms, not individual floor cells. No room has been counted in this preview.", "Cuenta habitaciones completas, no celdas de suelo individuales. Esta vista no ha contado ninguna habitación."], board(map), note(requested, [text(["number of rooms = ?", "número de habitaciones = ?"])]))
        ]);
    }
    case "labyrinth": {
      const map = ["########", "#.A#...#", "#.##.#B#", "#......#", "########"];
      return make(
        ["Find a shortest route from A to B. Each move goes one cell up, down, left, or right and cannot cross a wall (#).", "Encuentra una ruta más corta de A a B. Cada movimiento avanza una celda arriba, abajo, a la izquierda o a la derecha sin cruzar paredes (#)."],
        ["First n and m, then n map rows of length m. There is exactly one A and one B; . is open floor.", "Primero n y m, luego n filas del mapa de longitud m. Hay exactamente una A y una B; . es suelo libre."],
        ["Print NO if B cannot be reached. Otherwise print YES, the minimum number of moves, and one shortest move string using U, D, L, R, each on its own line.", "Imprime NO si no puedes llegar a B. En caso contrario, imprime YES, el mínimo número de movimientos y una ruta mínima con U, D, L, R, cada uno en su propia línea."],
        `5 8\n${map.join("\n")}`, "YES\n9\nLDDRRRRRU", [
          frame(["A is the given starting cell. The map does not yet contain a chosen route.", "A es la celda inicial indicada. El mapa aún no contiene una ruta elegida."], board(map, { row: 1, column: 2 })),
          frame(["B is the destination. Only side-to-side moves through open cells are allowed.", "B es el destino. Solo se permite avanzar entre celdas libres que comparten un lado."], board(map, { row: 2, column: 6 }), row(["Move symbols", "Símbolos de movimiento"], ["U ↑", "D ↓", "L ←", "R →"])),
          frame(["You must report a shortest route, or say that no route exists.", "Debes indicar una ruta mínima, o decir que no existe ninguna ruta."], note(requested, ["NO", text(["or: YES / move count / move string", "o: YES / cantidad de movimientos / cadena de movimientos"])]))
        ]);
    }
    case "teams": {
      const edges = [[1, 2], [1, 3], [4, 5]] as const;
      return make(
        ["Put every student on team 1 or team 2 so that each pair of friends is on different teams.", "Asigna cada estudiante al equipo 1 o al equipo 2 de modo que cada pareja de amigos quede en equipos distintos."],
        ["First n students and m friendships, then m pairs a b. Student labels run from 1 to n; friendship works both ways.", "Primero n estudiantes y m amistades, luego m pares a b. Los estudiantes se numeran del 1 al n; la amistad es mutua."],
        ["Print n team numbers in student order. Any valid assignment is accepted. Print IMPOSSIBLE if no assignment works.", "Imprime n números de equipo en orden de estudiante. Se acepta cualquier asignación válida. Imprime IMPOSSIBLE si ninguna funciona."],
        "5 3\n1 2\n1 3\n4 5", "1 2 2 1 2", [
          frame(["Each circle is a student; each line is one given friendship.", "Cada círculo es un estudiante; cada línea es una amistad de la entrada."], graph(5, edges, false)),
          frame(["Students 1 and 2 are friends, so their team numbers must differ. Neither has been assigned yet.", "Los estudiantes 1 y 2 son amigos, así que sus equipos deben ser distintos. Aún no se ha asignado ninguno."], graph(5, edges, false, 0), row(["Required relationship", "Relación requerida"], [text(["team(1) ≠ team(2)", "equipo(1) ≠ equipo(2)"])])),
          frame(["Give a team to every student, including students in separate groups.", "Asigna un equipo a cada estudiante, también a quienes están en grupos separados."], row(requested, ["?", "?", "?", "?", "?"]), note(requested, [text(["or IMPOSSIBLE", "o IMPOSSIBLE"])]))
        ]);
    }
    case "schedule": {
      const edges = [[1, 2], [3, 1], [4, 5]] as const;
      return make(
        ["List all courses in an order that respects every prerequisite. Each course must appear exactly once.", "Lista todos los cursos en un orden que respete cada prerrequisito. Cada curso debe aparecer exactamente una vez."],
        ["First n courses and m requirements, then m pairs a b meaning that course a must come before course b.", "Primero n cursos y m requisitos, luego m pares a b que indican que el curso a debe ir antes que el curso b."],
        ["Print any valid ordering of courses 1 through n, or IMPOSSIBLE if none exists.", "Imprime cualquier orden válido de los cursos del 1 al n, o IMPOSSIBLE si no existe."],
        "5 3\n1 2\n3 1\n4 5", "3 4 1 5 2", [
          frame(["The arrows are the three given prerequisite requirements.", "Las flechas son los tres prerrequisitos de la entrada."], graph(5, edges, true)),
          frame(["The highlighted arrow requires course 3 before course 1; it does not say they must be consecutive.", "La flecha resaltada exige cursar 3 antes de 1; no exige que sean consecutivos."], graph(5, edges, true, 1)),
          frame(["Fill five positions with all courses, satisfying every arrow. The preview leaves the order undecided.", "Llena cinco posiciones con todos los cursos, respetando cada flecha. Esta vista deja el orden sin decidir."], row(requested, ["?", "?", "?", "?", "?"]), note(requested, [text(["or IMPOSSIBLE", "o IMPOSSIBLE"])]))
        ]);
    }
    case "routes": {
      const edges = [[1, 2, 6], [1, 3, 2], [3, 2, 3], [1, 3, 4]] as const;
      return make(
        ["Find the minimum total flight cost from city 1 to every city. Flights are one-way; a route costs the sum of its flights.", "Encuentra el costo mínimo total de viajar desde la ciudad 1 a cada ciudad. Los vuelos son de un solo sentido; una ruta cuesta la suma de sus vuelos."],
        ["First n cities and m flights, then m triples a b c: a flight from a to b costs c. Multiple flights between the same cities are allowed.", "Primero n ciudades y m vuelos, luego m ternas a b c: un vuelo de a hacia b cuesta c. Puede haber varios vuelos entre las mismas ciudades."],
        ["Print n minimum costs, for cities 1 through n in that order. The cost to city 1 is 0.", "Imprime n costos mínimos, para las ciudades del 1 al n en ese orden. El costo hasta la ciudad 1 es 0."],
        "3 4\n1 2 6\n1 3 2\n3 2 3\n1 3 4", "0 5 2", [
          frame(["These are the four flights and their given costs. Every journey starts at city 1.", "Estos son los cuatro vuelos y sus costos dados. Cada viaje comienza en la ciudad 1."], graph(3, edges, true)),
          frame(["This flight goes from 3 to 2 and costs 3. The arrow does not provide a return flight.", "Este vuelo va de 3 a 2 y cuesta 3. La flecha no incluye un vuelo de regreso."], graph(3, edges, true, 2)),
          frame(["Report a separate minimum cost for every destination; no route has been selected here.", "Indica un costo mínimo por destino; aquí no se ha elegido ninguna ruta."], row(["Cities 1, 2, 3: minimum costs", "Ciudades 1, 2, 3: costos mínimos"], [0, "?", "?"]))
        ]);
    }
    case "fibonacci":
      return make(
        ["The Fibonacci sequence starts with F(0) = 0 and F(1) = 1. For k ≥ 2, F(k) = F(k − 1) + F(k − 2). Find F(n).", "La sucesión de Fibonacci comienza con F(0) = 0 y F(1) = 1. Para k ≥ 2, F(k) = F(k − 1) + F(k − 2). Encuentra F(n)."],
        ["One integer n: the index to evaluate, starting at index 0.", "Un entero n: el índice que debes evaluar, comenzando en 0."],
        ["One integer: F(n).", "Un entero: F(n)."], "7", "13", [
          frame(["The input n = 7 asks for the value at index 7, not the first seven values.", "La entrada n = 7 pide el valor en el índice 7, no los primeros siete valores."], row(["Requested index", "Índice solicitado"], ["n = 7"])),
          frame(["The first two values and this relation define the sequence; the missing values remain hidden.", "Los dos primeros valores y esta relación definen la sucesión; los valores restantes siguen ocultos."], row(["Given values", "Valores dados"], ["F(0) = 0", "F(1) = 1"]), note(["Definition", "Definición"], ["F(k) = F(k − 1) + F(k − 2), k ≥ 2"])),
          frame(["Return only the value at the requested index.", "Devuelve solo el valor en el índice solicitado."], note(requested, ["F(7) = ?"]))
        ]);
    case "nonAdjacent": {
      const values = [4, 1, 1, 9, 1];
      return make(
        ["Choose values from the array without choosing two neighboring positions. Maximize their sum. Choosing nothing is allowed and gives sum 0.", "Elige valores del arreglo sin elegir dos posiciones vecinas. Maximiza su suma. Puedes no elegir ninguno: la suma será 0."],
        ["First n, then n integers in their original order. Values may be negative.", "Primero n, luego n enteros en su orden original. Los valores pueden ser negativos."],
        ["One integer: the greatest possible sum.", "Un entero: la mayor suma posible."], "5\n4 1 1 9 1", "13", [
          frame(["These five values are given in a fixed order. Equal values still occupy different positions.", "Estos cinco valores tienen un orden fijo. Los valores iguales ocupan posiciones distintas."], row(["Array", "Arreglo"], values)),
          frame(["The two middle 1s are neighbors: you may not choose both. No positions are selected yet.", "Los dos 1 centrales son vecinos: no puedes elegir ambos. Aún no se ha elegido ninguna posición."], row(["Neighboring positions", "Posiciones vecinas"], ["4", "1 ↔", "↔ 1", "9", "1"])),
          frame(["Return the largest legal sum, including the option of choosing nothing.", "Devuelve la mayor suma válida, considerando también no elegir nada."], note(requested, [text(["maximum sum = ?", "suma máxima = ?"])]))
        ]);
    }
    case "grid": {
      const map = ["...", ".*.", "..."];
      return make(
        ["Count routes from the top-left to the bottom-right of a square board. Move only right or down and never enter a blocked cell. Return the count modulo 1,000,000,007.", "Cuenta las rutas de la esquina superior izquierda a la inferior derecha de un tablero cuadrado. Solo puedes moverte a la derecha o abajo, sin entrar en celdas bloqueadas. Devuelve el conteo módulo 1,000,000,007."],
        ["First n, then n strings of length n: . is open and * is blocked.", "Primero n, luego n cadenas de longitud n: . es libre y * está bloqueada."],
        ["One integer: the number of valid routes modulo 1,000,000,007. Print 0 if there is no route.", "Un entero: el número de rutas válidas módulo 1,000,000,007. Imprime 0 si no hay ninguna."], "3\n...\n.*.\n...", "2", [
          frame(["Start at the top-left cell of this 3 × 3 board. The center cell is blocked (shown as # in the diagram).", "Comienza en la esquina superior izquierda de este tablero de 3 × 3. La celda central está bloqueada (se muestra como # en el diagrama)."], board(map, { row: 0, column: 0 })),
          frame(["Allowed moves are right and down. Neither backward moves nor diagonals are permitted.", "Los movimientos permitidos son a la derecha y abajo. No se permite retroceder ni avanzar en diagonal."], board(map), row(["Allowed moves", "Movimientos permitidos"], ["→", "↓"])),
          frame(["The bottom-right cell is the destination. Count all valid routes; none is drawn here.", "La esquina inferior derecha es el destino. Cuenta todas las rutas válidas; aquí no se dibuja ninguna."], board(map, { row: 2, column: 2 }), note(requested, ["? mod 1,000,000,007"]))
        ]);
    }
    case "knapsack":
      return make(
        ["Each item has a weight and a value. Choose items with total weight at most the capacity and maximize their total value. Each item is available only once.", "Cada objeto tiene un peso y un valor. Elige objetos cuyo peso total no exceda la capacidad y maximiza su valor total. Cada objeto está disponible una sola vez."],
        ["First n and capacity, then n positive weights, then n values. Weight and value at the same position describe the same item.", "Primero n y la capacidad, luego n pesos positivos y después n valores. El peso y el valor en la misma posición describen el mismo objeto."],
        ["One integer: the maximum total value within the capacity.", "Un entero: el máximo valor total sin exceder la capacidad."], "3 4\n2 2 2\n4 6 4", "10", [
          frame(["There are three distinct items. Their weights match, but their values can differ.", "Hay tres objetos distintos. Sus pesos coinciden, pero sus valores pueden diferir."], row(["Item: weight / value", "Objeto: peso / valor"], ["A: 2 / 4", "B: 2 / 6", "C: 2 / 4"])),
          frame(["The bag can carry weight 4. An item can be taken once or left out; repeated copies are not available.", "La mochila admite peso 4. Puedes tomar un objeto una vez o dejarlo; no hay copias adicionales."], row(["Capacity", "Capacidad"], [4]), row(["Available copies: A, B, C", "Copias disponibles: A, B, C"], [1, 1, 1])),
          frame(["Maximize value while respecting the weight limit. No items have been chosen in this preview.", "Maximiza el valor respetando el límite de peso. Esta vista no ha elegido objetos."], note(requested, [text(["maximum value = ?", "valor máximo = ?"])]))
        ]);
    case "dag": {
      const edges = [[1, 6], [2, 3], [2, 6], [3, 4], [4, 5]] as const;
      return make(
        ["Find the largest number of edges in any directed path. The path may start and end at any nodes. The graph has no directed cycles.", "Encuentra el mayor número de aristas de un camino dirigido. El camino puede comenzar y terminar en cualquier nodo. El grafo no tiene ciclos dirigidos."],
        ["First n nodes and m edges, then m pairs a b describing arrows from a to b. Nodes are numbered 1 through n.", "Primero n nodos y m aristas, luego m pares a b que describen flechas de a hacia b. Los nodos se numeran del 1 al n."],
        ["One integer: the maximum number of edges on a path, not the number of nodes.", "Un entero: el máximo número de aristas de un camino, no su número de nodos."], "6 5\n1 6\n2 3\n2 6\n3 4\n4 5", "3", [
          frame(["The input contains six nodes and five arrows. No starting node is prescribed.", "La entrada contiene seis nodos y cinco flechas. No se fija ningún nodo inicial."], graph(6, edges, true)),
          frame(["One arrow counts as one edge, even though it touches two nodes. A path must follow arrow directions.", "Una flecha cuenta como una arista aunque toque dos nodos. Un camino debe seguir el sentido de las flechas."], graph(6, edges, true, 0)),
          frame(["Return the edge count of a longest path. The preview has not chosen a path.", "Devuelve el número de aristas de un camino más largo. Esta vista no ha elegido ningún camino."], note(requested, [text(["maximum edge count = ?", "máximo número de aristas = ?"])]))
        ]);
    }
    case "coins":
    case "fails": {
      const counterexample = id === "fails";
      const target = counterexample ? 6 : 68;
      const coins = counterexample ? [1, 3, 4] : [1, 5, 10, 25, 50];
      return make(
        ["Pay the target amount exactly using as few coins as possible. You have unlimited copies of every listed denomination.", "Paga exactamente el monto objetivo usando la menor cantidad de monedas posible. Tienes copias ilimitadas de cada denominación indicada."],
        [counterexample ? "Target 6 and denominations 1, 3, 4 in this comparison." : "One target amount from 1 to 500. The available denominations are fixed: 1, 5, 10, 25, 50.", counterexample ? "Objetivo 6 y denominaciones 1, 3, 4 en esta comparación." : "Un monto objetivo del 1 al 500. Las denominaciones disponibles son fijas: 1, 5, 10, 25, 50."],
        ["Report the fewest coins needed. The guide's tool also lists the coins used.", "Indica la menor cantidad de monedas necesaria. La herramienta de la guía también lista las monedas usadas."], String(target), counterexample ? "2" : "6", [
          frame([`The target is ${target}. These are the available coin values, not a chosen payment.`, `El objetivo es ${target}. Estos son los valores disponibles, no un pago elegido.`], row(["Denominations", "Denominaciones"], coins), row(["Target", "Objetivo"], [target])),
          frame(["A denomination may be used more than once. The final payment must equal the target exactly.", "Puedes usar una denominación varias veces. El pago final debe ser exactamente igual al objetivo."], row(["Copies available per denomination", "Copias disponibles por denominación"], coins.map((coin) => `${coin}: ∞`))),
          frame(["Minimize the number of coins, not their total value: that total is already fixed by the target.", "Minimiza la cantidad de monedas, no su valor total: ese total ya está fijado por el objetivo."], note(requested, [text(["minimum coin count = ?", "mínima cantidad de monedas = ?"])]))
        ]);
    }
    case "activities":
      return make(
        ["Attend as many activities as possible without overlaps. An activity may start exactly when another ends.", "Asiste a tantas actividades como sea posible sin solapamientos. Una actividad puede comenzar justo cuando otra termina."],
        ["A list of activity IDs with start and finish times; each start must be less than its finish.", "Una lista de identificadores de actividades con horas de inicio y fin; cada inicio debe ser menor que su fin."],
        ["Report the maximum number of activities. The guide's tool also lists one valid selection.", "Indica el máximo número de actividades. La herramienta de la guía también lista una selección válida."], "A: 1 4\nB: 3 5\nC: 4 7", "2", [
          frame(["Three activities are offered. Each pair of times describes the full interval you must attend.", "Se ofrecen tres actividades. Cada par de horas describe el intervalo completo al que debes asistir."], row(["Activity: start → finish", "Actividad: inicio → fin"], ["A: 1 → 4", "B: 3 → 5", "C: 4 → 7"])),
          frame(["In general, an activity ending at time 4 may be followed by one starting at time 4. Touching endpoints are allowed.", "En general, una actividad que termina a las 4 puede ir seguida de otra que comienza a las 4. Se permite compartir un extremo."], row(["Endpoint rule", "Regla de los extremos"], [text(["finish = 4", "fin = 4"]), text(["start = 4", "inicio = 4"]) ])),
          frame(["Choose a schedule with the greatest number of complete activities. No schedule is selected here.", "Elige un horario con la mayor cantidad de actividades completas. Aquí no se selecciona ningún horario."], note(requested, [text(["maximum activity count = ?", "máxima cantidad de actividades = ?"])]))
        ]);
    case "twins":
      return make(
        ["Take coins from a pile; your twin gets every coin left. Take as few coins as possible while keeping strictly more total value than your twin.", "Toma monedas de un montón; tu gemelo recibe las restantes. Toma la menor cantidad posible y conserva un valor total estrictamente mayor que el de tu gemelo."],
        ["First n, then n positive coin values. Equal values still represent separate coins.", "Primero n, luego n valores positivos de monedas. Los valores iguales representan monedas distintas."],
        ["One integer: the minimum number of coins you must take. Equal totals do not qualify.", "Un entero: la mínima cantidad de monedas que debes tomar. Los totales iguales no son válidos."], "3\n2 1 2", "2", [
          frame(["The shared pile contains these three separate coins. None has been taken yet.", "El montón compartido contiene estas tres monedas distintas. Aún no se ha tomado ninguna."], row(["Shared pile", "Montón compartido"], [2, 1, 2])),
          frame(["Every coin goes either to you or to your twin. Your total must be greater, not equal.", "Cada moneda queda contigo o con tu gemelo. Tu total debe ser mayor, no igual."], row(["Required comparison", "Comparación requerida"], [text(["your total", "tu total"]), ">", text(["twin's total", "total de tu gemelo"])])),
          frame(["Return a number of coins, not a total value or a list of chosen coins.", "Devuelve una cantidad de monedas, no un valor total ni una lista de monedas elegidas."], note(requested, [text(["minimum coin count = ?", "mínima cantidad de monedas = ?"])]))
        ]);
    case "chat":
      return make(
        ["Can you obtain exactly hello by deleting zero or more letters from a message? Keep the remaining letters in their original order.", "¿Puedes obtener exactamente hello al borrar cero o más letras de un mensaje? Conserva el orden original de las letras restantes."],
        ["One string of 1 to 100 lowercase English letters, with no spaces.", "Una cadena de 1 a 100 letras inglesas minúsculas, sin espacios."],
        ["Print YES if hello can remain, otherwise NO.", "Imprime YES si puede quedar hello; en caso contrario, NO."], "ahhellllloou", "YES", [
          frame(["This is the original message. No letters have been matched or deleted.", "Este es el mensaje original. No se han elegido ni borrado letras."], row(["Message", "Mensaje"], [..."ahhellllloou"])),
          frame(["The remaining word must be exactly these five letters in this order; rearranging is forbidden.", "La palabra restante debe tener exactamente estas cinco letras en este orden; no puedes reordenarlas."], row(["Required word", "Palabra requerida"], [..."hello"])),
          frame(["You only need to answer whether such deletions are possible.", "Solo debes indicar si es posible hacer esos borrados."], row(requested, ["YES / NO"]))
        ]);
    case "alternating":
      return make(
        ["Choose a subsequence that alternates positive and negative values, preserving the original order. First maximize its length; among the longest choices, maximize the sum.", "Elige una subsecuencia que alterne valores positivos y negativos, conservando el orden original. Primero maximiza su longitud; entre las opciones más largas, maximiza la suma."],
        ["This guide uses one case: n followed by n nonzero integers. The original contest problem accepts multiple cases.", "Esta guía usa un caso: n seguido de n enteros distintos de cero. El problema original del concurso acepta varios casos."],
        ["One integer: the greatest sum among all longest alternating subsequences.", "Un entero: la mayor suma entre todas las subsecuencias alternantes de longitud máxima."], "5\n1 2 3 -1 -2", "2", [
          frame(["These five values arrive in this order. You may omit values, but cannot rearrange them.", "Estos cinco valores llegan en este orden. Puedes omitir valores, pero no reordenarlos."], row(["Sequence", "Secuencia"], [1, 2, 3, -1, -2])),
          frame(["Neighboring retained values must have opposite signs. Either sign is allowed at the start.", "Los valores vecinos que conserves deben tener signos opuestos. Puedes comenzar con cualquiera de los signos."], row(["Allowed neighboring signs", "Signos vecinos permitidos"], ["+ then −", "− then +"].map((value) => language.startsWith("es") ? value.replace("then", "luego") : value))),
          frame(["Length takes priority over sum. Only after reaching the greatest length do you compare sums.", "La longitud tiene prioridad sobre la suma. Solo comparas sumas entre opciones de longitud máxima."], row(["Priorities", "Prioridades"], [text(["1. greatest length", "1. mayor longitud"]), text(["2. greatest sum", "2. mayor suma"])]), note(requested, [text(["sum = ?", "suma = ?"])]))
        ]);
  }
}

export function getAdvancedStatement(language: string, id: AdvancedStatementId): StatementDefinition {
  const copy = getAdvancedStatementCopy(language, id);
  const illustration = getAdvancedExample(language, id);
  return { ...copy, ...(illustration ? { illustration } : {}) };
}
