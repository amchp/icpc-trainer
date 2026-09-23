export const animationIntroductions = {
  "conditionals": {
    "title": "Elige qué instrucciones se ejecutan",
    "statement": "Una condición elige una rama. Sigue la decisión y observa que la otra rama se omite.",
    "input": "Un valor x y la condición x > 0.",
    "output": "Con x = 3 se ejecuta la rama verdadera; la falsa no."
  },
  "loops": {
    "title": "Repite trabajo con una regla de parada",
    "statement": "Explora cómo un bucle repite su cuerpo, cambia su estado y termina. Son demostraciones de flujo de control, no un único problema.",
    "input": "Tres iteraciones, con un índice que empieza en 0.",
    "output": "El cuerpo se ejecuta en los índices 0, 1 y 2; el índice 3 termina el bucle."
  },
  "vector-traversal": {
    "title": "Visita cada elemento",
    "statement": "Dada una secuencia, visita cada elemento una vez en orden de índice. Distingue la posición del valor almacenado.",
    "input": "El vector [8, 3, 5].",
    "output": "Visita 8, luego 3 y luego 5, en las posiciones 0, 1 y 2."
  },
  "function-calls": {
    "title": "Sigue una llamada y su retorno",
    "statement": "Una función recibe argumentos, calcula localmente y devuelve el control a quien la llamó. El objetivo es entender ese intercambio.",
    "input": "Llama a doubleValue(3).",
    "output": "La función recibe 3 y devuelve 6 a quien la llamó."
  },
  "recursion": {
    "title": "Comprende las llamadas en espera",
    "statement": "Una llamada recursiva trabaja sobre una instancia menor hasta que un caso base detiene las llamadas. Compara las trazas de cuenta regresiva, factorial y Fibonacci.",
    "input": "Por ejemplo, factorial(3) depende de factorial(2).",
    "output": "Resuelve el caso base y retorna por las llamadas en espera: 3! = 6."
  },
  "fibonacci-recursion-tree": {
    "title": "Cuenta el trabajo repetido",
    "statement": "Este es un ejercicio de análisis: explica por qué la recurrencia directa de Fibonacci repite subproblemas. El árbol de abajo expande F(6).",
    "input": "F(n) = F(n − 1) + F(n − 2), con F(0) = 0 y F(1) = 1.",
    "output": "En F(4), F(2) aparece dos veces. Los árboles mayores repiten muchas más llamadas."
  },
  "vectors": {
    "title": "Explora una secuencia indexada",
    "statement": "Un vector guarda una secuencia ordenada. Explora cómo leer, agregar y quitar valores la cambia; luego localiza límites inferior y superior en datos ordenados.",
    "input": "Empieza con [8, 3, 5] y agrega 9.",
    "output": "La secuencia pasa a [8, 3, 5, 9]; el nuevo valor tiene índice 3."
  },
  "stacks": {
    "title": "Explora último en entrar, primero en salir",
    "statement": "Una pila expone su tope. Este es un laboratorio de operaciones: observa qué hacen push, top y pop sobre el mismo estado.",
    "input": "Agrega 2, luego 7 y luego 4.",
    "output": "El siguiente valor que devuelve top es 4, el agregado más recientemente."
  },
  "queues": {
    "title": "Explora los extremos de una secuencia",
    "statement": "Una cola atiende primero al valor más antiguo. Un deque también permite insertar y quitar en ambos extremos. Compara los dos simuladores.",
    "input": "Encola 12, luego 24 y luego 36.",
    "output": "El frente de la cola es 12. Al quitarlo, 24 pasa al frente."
  },
  "sets": {
    "title": "Explora valores únicos",
    "statement": "Un conjunto ordenado guarda cada valor como máximo una vez. Explora inserción, eliminación, pertenencia y límites ordenados.",
    "input": "Inserta 3, 1 y 3.",
    "output": "Solo quedan 1 y 3; insertar 3 otra vez no agrega otra copia."
  },
  "maps": {
    "title": "Explora valores asociados a claves",
    "statement": "Un mapa conecta cada clave con un valor. Explora consultas, inserciones y cambios sin confundir una clave con su posición.",
    "input": "Guarda 1 → 10 y 3 → 30; luego cambia el valor de la clave 1 a 15.",
    "output": "La clave 1 ahora corresponde a 15; la clave 3 sigue correspondiendo a 30."
  },
  "structs": {
    "title": "Explora estado y métodos",
    "statement": "Un struct agrupa datos y comportamiento. El simulador Counter muestra cómo un método cambia el campo de un objeto.",
    "input": "Un contador tiene valor 5. Llama a add(3).",
    "output": "El valor del mismo objeto pasa a 8; get() lo lee sin modificarlo."
  },
  "permutations": {
    "title": "Genera todos los ordenamientos",
    "statement": "Dados elementos distintos, enumera todos los ordenamientos posibles. Cada uno debe usar todos los elementos exactamente una vez, sin resultados repetidos.",
    "input": "Tres elementos: A, B, C.",
    "output": "Hay 3! = 6 ordenamientos. Compara la generación recursiva e iterativa abajo."
  },
  "subsets": {
    "title": "Genera todas las selecciones",
    "statement": "Dados elementos distintos, enumera todos los subconjuntos. Cada elemento se incluye o se excluye; el orden no crea otro subconjunto.",
    "input": "Dos elementos: A y B.",
    "output": "Los cuatro subconjuntos son ∅, {A}, {B} y {A, B}. Incluye el subconjunto vacío."
  },
  "binary-search-comparison": {
    "title": "Encuentra dónde corresponde el objetivo",
    "statement": "Dados valores ordenados y un objetivo, encuentra la primera posición con valor mayor o igual al objetivo. Compara las comprobaciones de búsqueda lineal y binaria.",
    "input": "[2, 4, 7, 9, 12, 18, 25], objetivo 10.",
    "output": "Devuelve el índice 4, antes de 12. Si ningún valor cumple, devuelve la longitud."
  },
  "monotone-condition-pattern": {
    "title": "Reconoce cuándo sirve la búsqueda binaria",
    "statement": "Este es un explorador de condiciones. La búsqueda binaria necesita un predicado que cambie de valor lógico como máximo una vez en el intervalo.",
    "input": "Compara 0 0 0 1 1 con 0 1 0 1 0.",
    "output": "El primer patrón tiene una frontera única. El segundo no permite descartar la mitad con esta regla."
  },
  "first-occurrence-trace": {
    "title": "Localiza la primera posición que cumple",
    "statement": "Busca en datos ordenados el primer valor mayor o igual a un objetivo. Si hay duplicados iguales al objetivo, es su primera aparición.",
    "input": "[1, 3, 3, 6], objetivo 3.",
    "output": "Devuelve el índice 1, el primer 3. Si el objetivo no existe, obtienes su posición de inserción."
  },
  "closest-value-trace": {
    "title": "Encuentra los vecinos del objetivo",
    "statement": "En datos ordenados, localiza el último valor menor o igual al objetivo y el primero mayor. Son los candidatos al valor más cercano.",
    "input": "[2, 4, 7, 9], objetivo 6.",
    "output": "Los candidatos son 4 y 7; 7 está más cerca. La traza de abajo muestra cada frontera por separado."
  },
  "numeric-binary-search-trace": {
    "title": "Aproxima una raíz cuadrada",
    "statement": "Dado un número no negativo x, encuentra un y no negativo cuyo cuadrado sea x con la precisión elegida. La respuesta no tiene que ser entera.",
    "input": "x = 2.",
    "output": "y ≈ 1.414. Reduce un intervalo que contenga la respuesta hasta hacerlo suficientemente pequeño."
  },
  "first-true-boundary-trace": {
    "title": "Encuentra la primera posición verdadera",
    "statement": "Un predicado es falso antes de una frontera y verdadero desde ella. Encuentra la primera posición verdadera usando extremos conocidos.",
    "input": "Las posiciones 1…6 tienen valores 0, 0, 0, 1, 1, 1.",
    "output": "La primera posición verdadera es 4. Mantén los extremos falso y verdadero en lados opuestos."
  },
  "last-true-boundary-trace": {
    "title": "Encuentra el último valor factible",
    "statement": "Un predicado es verdadero hasta una frontera y falso después. Encuentra el mayor valor que todavía cumple la condición.",
    "input": "Las posiciones 1…6 tienen valores 1, 1, 1, 1, 0, 0.",
    "output": "La última posición verdadera es 4. El siguiente valor ya no es factible."
  },
  "coin-change": {
    "title": "Forma una cantidad con el mínimo de monedas",
    "statement": "Dadas denominaciones y una cantidad, elige monedas que sumen exactamente esa cantidad. Minimiza cuántas usas. Elegir la mayor primero exige justificación: no funciona con todas las denominaciones.",
    "input": "Cantidad 68; monedas de 1, 5, 10, 25 y 50; copias ilimitadas.",
    "output": "50 + 10 + 5 + 1 + 1 + 1 usa 6 monedas. Luego prueba la regla con otro sistema en el contraejemplo."
  },
  "activity-selection": {
    "title": "Asiste al máximo de actividades compatibles",
    "statement": "Cada actividad ocupa un intervalo. Elige el máximo número sin superposiciones; una puede empezar justo cuando termina la anterior.",
    "input": "A: [1, 4), B: [3, 5), C: [5, 7).",
    "output": "A y C son compatibles. Puedes asistir a 2 actividades; A y B se superponen."
  },
  "largest-first-selection": {
    "title": "Conserva más valor usando menos elementos",
    "statement": "Dados valores positivos, elige el mínimo de elementos cuya suma sea estrictamente mayor que la suma de los restantes.",
    "input": "Valores [2, 1, 2], total 5.",
    "output": "Elige 2 y 2. Su suma 4 supera al 1 restante; un solo elemento no basta."
  },
  "subsequence-scanner": {
    "title": "Encuentra una palabra sin reordenar letras",
    "statement": "Decide si un objetivo aparece como subsecuencia de una cadena. Puedes saltar caracteres, pero debes conservar su orden original.",
    "input": "Texto ahhellllloou; objetivo hello.",
    "output": "La respuesta es sí: elige h, e, l, l, o de izquierda a derecha."
  },
  "sign-block-selection": {
    "title": "Alterna signos y luego maximiza la suma",
    "statement": "Dados valores no nulos, elige una subsecuencia de longitud máxima con signos alternados. Entre las opciones de igual longitud, maximiza la suma.",
    "input": "[1, 2, 3, −1, −2].",
    "output": "La longitud máxima es 2. Elegir 3 y −1 da la mayor suma, 2."
  },
  "dfs": {
    "title": "Encuentra todo lo alcanzable desde un origen",
    "statement": "Dadas conexiones y un vértice inicial, visita cada vértice alcanzable sin repetirlo. En una cuadrícula, las celdas abiertas adyacentes definen las conexiones.",
    "input": "Empieza en A en el grafo ilustrado.",
    "output": "A, B, C y D son alcanzables. El orden de recorrido puede variar según el orden de vecinos."
  },
  "bfs": {
    "title": "Encuentra distancias cuando cada paso cuesta uno",
    "statement": "Dado un grafo sin pesos y un origen, encuentra el mínimo de aristas para llegar a cada vértice. En una cuadrícula, cada movimiento permitido es una arista.",
    "input": "Empieza en A; cada arista ilustrada cuesta un paso.",
    "output": "A tiene distancia 0, B y C tienen distancia 1, y D tiene distancia 2."
  },
  "bipartite-dfs": {
    "title": "Divide los vértices en dos grupos compatibles",
    "statement": "Asigna uno de dos colores a cada vértice para que los extremos de cada arista tengan colores distintos. Determina si es posible en todo el grafo.",
    "input": "El ciclo ilustrado de cuatro vértices.",
    "output": "Una división válida es {A, D} y {B, C}. Un ciclo impar haría imposible esa división."
  },
  "topological-sort": {
    "title": "Ordena tareas después de sus requisitos",
    "statement": "Cada arista dirigida u → v dice que u debe ir antes de v. Produce un orden que respete todas las aristas o detecta un ciclo.",
    "input": "A precede a B y C; tanto B como C preceden a D.",
    "output": "A, B, C, D es válido. A, C, B, D también; la respuesta no tiene que ser única."
  },
  "dijkstra": {
    "title": "Encuentra las rutas de menor costo",
    "statement": "Dados pesos no negativos y un origen, encuentra el costo total mínimo a cada vértice. Cuenta costos, no solo aristas.",
    "input": "Desde A: A–B cuesta 4, A–C cuesta 1, B–D cuesta 2, C–D cuesta 5.",
    "output": "Las distancias son A: 0, B: 4, C: 1, D: 6. Dos rutas a D empatan con costo 6."
  }
} as const;
