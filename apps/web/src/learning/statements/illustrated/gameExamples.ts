import {
  applyChompMove,
  isChompCellPresent,
  placePlate,
  type PlateGameState,
} from "../../games/gameModels.js";
import {
  items,
  lines,
  localize,
  numbers,
  presets,
  requireInput,
  step,
  type IllustratedExample,
  type Scene,
} from "./types.js";

/** Concrete games demonstrate legal moves and endings, not a winning strategy. */
export function getGameExample(
  language: string,
  id: "plate" | "stones" | "chomp",
): IllustratedExample {
  const l = localize(language);
  if (id === "plate")
    return {
      instructions: l(
        "First line: table width and height (2–10). Then 1–16 plate centers x y (0–10). Radius is 1. Invalid placements keep the same turn; stop when no legal move remains.",
        "Primera línea: ancho y alto (2–10). Luego de 1 a 16 centros x y (0–10). Radio 1. Las colocaciones inválidas conservan el turno; termina cuando no queden movimientos legales.",
      ),
      presets: presets(
        "4 4\n1 1\n3 3\n3 1\n1 3",
        "4 4\n1 1\n1 1\n3 3\n3 1\n1 3",
        l,
      ),
      build(input) {
        const rows = input.trim().split("\n");
        const dimensions = numbers(rows[0]!, l, 2, 10, 2);
        requireInput(
          dimensions.length === 2 && rows.length >= 2 && rows.length <= 17,
          l,
          "Enter dimensions and 1–16 placements.",
          "Introduce dimensiones y de 1 a 16 colocaciones.",
        );
        const [width, height] = dimensions as [number, number];
        let state: PlateGameState = {
          centers: [],
          activePlayer: 1,
          winner: null,
          moveCount: 0,
        };
        const circles: {
          x: number;
          y: number;
          tone: "good" | "active" | "bad";
        }[] = [];
        const scene = (attempt?: { x: number; y: number }): Scene => ({
          kind: "table",
          label: l(
            "Green: Player 1 · Blue: Player 2 · Red: invalid attempt",
            "Verde: jugador 1 · Azul: jugador 2 · Rojo: intento inválido",
          ),
          width,
          height,
          circles: attempt
            ? [...circles, { ...attempt, tone: "bad" }]
            : [...circles],
        });
        const frames = [
          step(
            l(
              "A complete example game: players alternate placing radius-1 plates. Touching is allowed; overlap is not.",
              "Una partida completa de ejemplo: los jugadores alternan platos de radio 1. Pueden tocarse, pero no solaparse.",
            ),
            [scene()],
          ),
        ];
        for (const row of rows.slice(1)) {
          requireInput(
            state.winner === null,
            l,
            "The game has ended; remove moves after the final legal placement.",
            "La partida terminó; quita los movimientos posteriores a la última colocación legal.",
          );
          const coords = numbers(row, l, 0, 10, 2);
          requireInput(
            coords.length === 2,
            l,
            "Each center needs x and y.",
            "Cada centro necesita x e y.",
          );
          const center = { x: coords[0]!, y: coords[1]! };
          const player = state.activePlayer;
          const transition = placePlate(state, center, { width, height });
          if (transition.valid) {
            state = transition.state;
            circles.push({ ...center, tone: player === 1 ? "good" : "active" });
          }
          frames.push(
            step(
              transition.valid
                ? l(
                    `Player ${player} places a plate at (${center.x}, ${center.y}).`,
                    `El jugador ${player} coloca un plato en (${center.x}, ${center.y}).`,
                  )
                : l(
                    `Player ${player}'s red attempt overlaps a plate or crosses the table edge. Nothing is added; Player ${player} tries again.`,
                    `El intento rojo del jugador ${player} se solapa con un plato o cruza el borde. No se añade nada; el jugador ${player} vuelve a intentar.`,
                  ),
              [scene(transition.valid ? undefined : center)],
            ),
          );
        }
        frames.push(
          step(
            state.winner === null
              ? l(
                  "The game can continue from this board.",
                  "La partida puede continuar desde este tablero.",
                )
              : l(
                  `Player ${3 - state.winner} cannot fit another plate anywhere on the table and loses. Player ${state.winner} wins.`,
                  `El jugador ${3 - state.winner} no puede colocar otro plato en ninguna parte de la mesa y pierde. Gana el jugador ${state.winner}.`,
                ),
            [scene()],
            state.winner === null
              ? l(
                  `${circles.length} plates; Player ${state.activePlayer}'s turn.`,
                  `${circles.length} platos; turno del jugador ${state.activePlayer}.`,
                )
              : l(
                  `Player ${state.winner} wins; no legal placement remains.`,
                  `Gana el jugador ${state.winner}; no quedan colocaciones legales.`,
                ),
          ),
        );
        return frames;
      },
    };
  if (id === "stones")
    return {
      instructions: l(
        "First line: stones (1–30). Second line: up to 30 moves, taking 1, 2, or 3 stones each. The player taking the last stone wins.",
        "Primera línea: piedras (1–30). Segunda línea: hasta 30 movimientos de 1, 2 o 3 piedras. Gana quien retira la última.",
      ),
      presets: presets("25\n2 3 3 3 3 3 3 3 2", "4\n1 3", l),
      build(input) {
        const rows = lines(input, 2, l);
        let remaining = numbers(rows[0]!, l, 1, 30, 1)[0]!;
        const moves = numbers(rows[1]!, l, 1, 3, 30);
        let player = 1;
        const scene = (taken = 0) =>
          items(
            l(`${remaining} stones remain`, `Quedan ${remaining} piedras`),
            Array.from({ length: remaining }, () => "●"),
            [],
            "stone",
            Array.from({ length: taken }, (_, i) => remaining - taken + i),
          );
        const frames = [
          step(
            l(
              "Follow both players through this example game. Each turn removes 1, 2, or 3 stones.",
              "Sigue a ambos jugadores en esta partida. Cada turno retira 1, 2 o 3 piedras.",
            ),
            [scene()],
          ),
        ];
        for (const take of moves) {
          requireInput(
            remaining > 0 && take <= remaining,
            l,
            "Do not take more stones than remain or move after the game ends.",
            "No retires más piedras de las que quedan ni juegues después del final.",
          );
          frames.push(
            step(
              l(
                `Player ${player} takes the ${take} red stones.`,
                `El jugador ${player} retira las ${take} piedras rojas.`,
              ),
              [scene(take)],
            ),
          );
          remaining -= take;
          frames.push(
            step(
              l(`${remaining} stones remain.`, `Quedan ${remaining} piedras.`),
              [scene()],
            ),
          );
          if (remaining > 0) player = 3 - player;
        }
        frames.push(
          step(
            remaining === 0
              ? l(
                  `Player ${player} took the last stone and wins. The game is over.`,
                  `El jugador ${player} retiró la última piedra y gana. La partida terminó.`,
                )
              : l(
                  `Player ${player} moves next.`,
                  `Ahora juega el jugador ${player}.`,
                ),
            [scene()],
            remaining === 0
              ? l(`Player ${player} wins.`, `Gana el jugador ${player}.`)
              : l(
                  `${remaining} stones; Player ${player}'s turn.`,
                  `${remaining} piedras; turno del jugador ${player}.`,
                ),
          ),
        );
        return frames;
      },
    };
  return {
    instructions: l(
      "First line: rows and columns (1–7). Then up to 49 bites: row and column, counting from 1. Choose only remaining squares; choosing (1, 1) loses immediately.",
      "Primera línea: filas y columnas (1–7). Luego hasta 49 mordiscos: fila y columna, desde 1. Elige solo casillas presentes; elegir (1, 1) pierde inmediatamente.",
    ),
    presets: presets(
      "5 7\n3 5\n2 3\n1 2\n2 1\n1 1",
      "3 4\n2 2\n1 3\n3 1\n2 1\n1 2\n1 1",
      l,
    ),
    build(input) {
      const rows = input.trim().split("\n");
      const size = numbers(rows[0]!, l, 1, 7, 2);
      requireInput(
        size.length === 2 && rows.length >= 2 && rows.length <= 50,
        l,
        "Enter board dimensions and 1–49 bites.",
        "Introduce dimensiones y de 1 a 49 mordiscos.",
      );
      const [h, w] = size as [number, number];
      let board: readonly number[] = Array<number>(h).fill(w);
      let player = 1;
      let winner: number | null = null;
      const scene = (bite?: { row: number; column: number }): Scene => ({
        kind: "grid",
        label: l(
          "Chocolate board; ☠ is poisoned",
          "Tablero de chocolate; ☠ es veneno",
        ),
        cells: Array.from({ length: h }, (_, r) =>
          Array.from({ length: w }, (_, c) => {
            const present = c < board[r]!;
            return {
              text: present ? (r === 0 && c === 0 ? "☠" : "■") : "",
              tone: !present
                ? "muted"
                : bite && r >= bite.row && c >= bite.column
                  ? "bad"
                  : "neutral",
            };
          }),
        ),
      });
      const frames = [
        step(
          l(
            "A complete example game. Each bite removes its square and the remaining chocolate below and to the right. The poisoned top-left square must be avoided.",
            "Una partida completa de ejemplo. Cada mordisco quita su casilla y el chocolate restante abajo y a la derecha. Hay que evitar el veneno de arriba a la izquierda.",
          ),
          [scene()],
        ),
      ];
      for (const row of rows.slice(1)) {
        const coords = numbers(row, l, 1, 7, 2);
        const move = { row: coords[0]! - 1, column: coords[1]! - 1 };
        requireInput(
          coords.length === 2 &&
            winner === null &&
            isChompCellPresent(board, move),
          l,
          "Choose a remaining square and do not move after the poison is taken.",
          "Elige una casilla presente y no juegues después de tomar el veneno.",
        );
        frames.push(
          step(
            l(
              `Player ${player} chooses (${move.row + 1}, ${move.column + 1}). The red squares will be removed.`,
              `El jugador ${player} elige (${move.row + 1}, ${move.column + 1}). Se quitarán las casillas rojas.`,
            ),
            [scene(move)],
          ),
        );
        board = applyChompMove(board, move);
        if (move.row === 0 && move.column === 0) winner = 3 - player;
        else player = 3 - player;
        frames.push(
          step(
            winner !== null
              ? l(
                  `Player ${3 - winner} ate the poisoned square and loses.`,
                  `El jugador ${3 - winner} comió el veneno y pierde.`,
                )
              : l(
                  `The remaining chocolate passes to Player ${player}.`,
                  `El chocolate restante pasa al jugador ${player}.`,
                ),
            [scene()],
          ),
        );
      }
      frames.push(
        step(
          winner !== null
            ? l(
                `Player ${winner} wins. The game ends when the poison is taken.`,
                `Gana el jugador ${winner}. La partida termina al tomar el veneno.`,
              )
            : l(
                "Continue from the remaining board.",
                "Continúa desde el tablero restante.",
              ),
          [scene()],
          winner !== null
            ? l(`Player ${winner} wins.`, `Gana el jugador ${winner}.`)
            : l(`Player ${player}'s turn.`, `Turno del jugador ${player}.`),
        ),
      );
      return frames;
    },
  };
}
