export interface Cell {
  readonly row: number;
  readonly column: number;
}

/** Deterministic neighbour order used by EVERY model, trace, and animation in this guide. */
export const NEIGHBOUR_ORDER: readonly (readonly [number, number, "D" | "U" | "R" | "L"])[] = [
  [1, 0, "D"],
  [-1, 0, "U"],
  [0, 1, "R"],
  [0, -1, "L"]
];

export interface RoomCount {
  readonly rooms: number;
  /** Same shape as the grid; -1 for walls, else the 0-based component index. */
  readonly componentIds: readonly (readonly number[])[];
  /** Cells in the exact order recursive DFS first visits them. */
  readonly visitOrder: readonly Cell[];
}

function validateGrid(grid: readonly string[]): number {
  const columns = grid[0]?.length ?? 0;
  if (grid.some((row) => row.length !== columns)) {
    throw new Error("Grid rows must all have the same length.");
  }
  for (const row of grid) {
    for (const cell of row) {
      if (cell !== "." && cell !== "#") throw new Error(`Grid contains invalid character ${JSON.stringify(cell)}.`);
    }
  }
  return columns;
}

export function countRooms(grid: readonly string[]): RoomCount {
  const columns = validateGrid(grid);
  const componentIds: number[][] = grid.map((row) => [...row].map((cell) => cell === "#" ? -1 : -2));
  const visitOrder: Cell[] = [];
  let rooms = 0;

  const dfs = (row: number, column: number, component: number): void => {
    if (row < 0 || row >= grid.length || column < 0 || column >= columns) return;
    if (grid[row]![column] === "#" || componentIds[row]![column] !== -2) return;
    componentIds[row]![column] = component;
    visitOrder.push({ row, column });
    for (const [rowDelta, columnDelta] of NEIGHBOUR_ORDER) {
      dfs(row + rowDelta, column + columnDelta, component);
    }
  };

  for (let row = 0; row < grid.length; row += 1) {
    for (let column = 0; column < columns; column += 1) {
      if (grid[row]![column] !== "." || componentIds[row]![column] !== -2) continue;
      dfs(row, column, rooms);
      rooms += 1;
    }
  }
  return { rooms, componentIds, visitOrder };
}

export interface GridBfsResult {
  readonly reachable: boolean;
  readonly distance: number | null;
  /** start → end inclusive; empty when unreachable. */
  readonly path: readonly Cell[];
  /** "DRRU…" — one letter per step of `path`; empty when unreachable. */
  readonly moves: string;
  /** Same shape as the grid; -1 for walls and unvisited floors. */
  readonly distances: readonly (readonly number[])[];
  /** Cells in dequeue order. */
  readonly visitOrder: readonly Cell[];
}

export function gridBfs(grid: readonly string[], start: Cell, end: Cell): GridBfsResult {
  const columns = validateGrid(grid);
  const inBounds = (cell: Cell): boolean => cell.row >= 0 && cell.row < grid.length && cell.column >= 0 && cell.column < columns;
  if (!inBounds(start) || !inBounds(end) || grid[start.row]![start.column] !== "." || grid[end.row]![end.column] !== ".") {
    throw new Error("Grid BFS endpoints must be floor cells inside the grid.");
  }

  const distances = grid.map((row) => [...row].map(() => -1));
  const parents: ({ readonly cell: Cell; readonly move: "D" | "U" | "R" | "L" } | null)[][] = grid.map((row) => [...row].map(() => null));
  const queue: Cell[] = [{ ...start }];
  const visitOrder: Cell[] = [];
  distances[start.row]![start.column] = 0;
  let head = 0;
  while (head < queue.length) {
    const current = queue[head++]!;
    visitOrder.push(current);
    for (const [rowDelta, columnDelta, move] of NEIGHBOUR_ORDER) {
      const next = { row: current.row + rowDelta, column: current.column + columnDelta };
      if (!inBounds(next) || grid[next.row]![next.column] === "#" || distances[next.row]![next.column] !== -1) continue;
      distances[next.row]![next.column] = distances[current.row]![current.column]! + 1;
      parents[next.row]![next.column] = { cell: current, move };
      queue.push(next);
    }
  }

  const distance = distances[end.row]![end.column]!;
  if (distance < 0) return { reachable: false, distance: null, path: [], moves: "", distances, visitOrder };
  const reversedPath: Cell[] = [{ ...end }];
  const reversedMoves: string[] = [];
  let cursor = { ...end };
  while (cursor.row !== start.row || cursor.column !== start.column) {
    const parent = parents[cursor.row]![cursor.column];
    if (parent == null) throw new Error("Grid BFS path reconstruction lost a parent.");
    reversedMoves.push(parent.move);
    cursor = parent.cell;
    reversedPath.push(cursor);
  }
  return {
    reachable: true,
    distance,
    path: reversedPath.reverse(),
    moves: reversedMoves.reverse().join(""),
    distances,
    visitOrder
  };
}

function validateVertexCount(vertexCount: number): void {
  if (!Number.isInteger(vertexCount) || vertexCount < 0) throw new Error("Vertex count must be a non-negative integer.");
}

function validateVertex(vertex: number, vertexCount: number): void {
  if (!Number.isInteger(vertex) || vertex < 1 || vertex > vertexCount) throw new Error(`Vertex ${vertex} is outside 1..${vertexCount}.`);
}

export function buildAdjacencyList(
  vertexCount: number,
  edges: readonly (readonly [number, number])[],
  directed: boolean
): readonly (readonly number[])[] {
  validateVertexCount(vertexCount);
  const adjacency = Array.from({ length: vertexCount + 1 }, () => [] as number[]);
  for (const [from, to] of edges) {
    validateVertex(from, vertexCount);
    validateVertex(to, vertexCount);
    adjacency[from]!.push(to);
    if (!directed) adjacency[to]!.push(from);
  }
  return adjacency;
}

export interface TwoColouring {
  readonly bipartite: boolean;
  /** index 0 unused; 0 = uncoloured, 1 = A, 2 = B. */
  readonly colours: readonly number[];
  readonly conflictEdge: readonly [number, number] | null;
  readonly visitOrder: readonly number[];
}

export function twoColour(vertexCount: number, edges: readonly (readonly [number, number])[]): TwoColouring {
  const adjacency = buildAdjacencyList(vertexCount, edges, false);
  const colours = Array.from({ length: vertexCount + 1 }, () => 0);
  const visitOrder: number[] = [];
  let conflictEdge: readonly [number, number] | null = null;
  const dfs = (vertex: number, colour: number): boolean => {
    colours[vertex] = colour;
    visitOrder.push(vertex);
    for (const next of adjacency[vertex]!) {
      if (colours[next] === 0) {
        if (!dfs(next, 3 - colour)) return false;
      } else if (colours[next] === colour) {
        conflictEdge = [vertex, next];
        return false;
      }
    }
    return true;
  };
  for (let vertex = 1; vertex <= vertexCount; vertex += 1) {
    if (colours[vertex] === 0 && !dfs(vertex, 1)) break;
  }
  return { bipartite: conflictEdge === null, colours, conflictEdge, visitOrder };
}

export interface TopologicalOrder {
  readonly acyclic: boolean;
  /** Empty when a cycle exists. */
  readonly order: readonly number[];
  readonly indegrees: readonly number[];
}

export function kahnTopologicalOrder(vertexCount: number, edges: readonly (readonly [number, number])[]): TopologicalOrder {
  const adjacency = buildAdjacencyList(vertexCount, edges, true);
  const indegrees = Array.from({ length: vertexCount + 1 }, () => 0);
  for (const [, to] of edges) indegrees[to]! += 1;
  const initialIndegrees = [...indegrees];
  const queue: number[] = [];
  for (let vertex = 1; vertex <= vertexCount; vertex += 1) if (indegrees[vertex] === 0) queue.push(vertex);
  const order: number[] = [];
  let head = 0;
  while (head < queue.length) {
    const vertex = queue[head++]!;
    order.push(vertex);
    for (const next of adjacency[vertex]!) {
      indegrees[next]! -= 1;
      if (indegrees[next] === 0) queue.push(next);
    }
  }
  return order.length === vertexCount
    ? { acyclic: true, order, indegrees: initialIndegrees }
    : { acyclic: false, order: [], indegrees: initialIndegrees };
}

export interface DijkstraStep {
  readonly kind: "push" | "pop" | "stale" | "relax" | "reject";
  readonly vertex: number;
  readonly distance: number;
  readonly via?: number;
}

export interface DijkstraResult {
  /** index 0 unused; null = unreachable. */
  readonly distances: readonly (number | null)[];
  readonly settleOrder: readonly number[];
  readonly steps: readonly DijkstraStep[];
  readonly staleCount: number;
}

interface HeapEntry { readonly distance: number; readonly vertex: number }

function heapLess(left: HeapEntry, right: HeapEntry): boolean {
  return left.distance < right.distance || (left.distance === right.distance && left.vertex < right.vertex);
}

function heapPush(heap: HeapEntry[], entry: HeapEntry): void {
  heap.push(entry);
  let index = heap.length - 1;
  while (index > 0) {
    const parent = Math.floor((index - 1) / 2);
    if (!heapLess(heap[index]!, heap[parent]!)) break;
    [heap[index], heap[parent]] = [heap[parent]!, heap[index]!];
    index = parent;
  }
}

function heapPop(heap: HeapEntry[]): HeapEntry {
  const first = heap[0]!;
  const last = heap.pop()!;
  if (heap.length === 0) return first;
  heap[0] = last;
  let index = 0;
  while (true) {
    const left = index * 2 + 1;
    const right = left + 1;
    let smallest = index;
    if (left < heap.length && heapLess(heap[left]!, heap[smallest]!)) smallest = left;
    if (right < heap.length && heapLess(heap[right]!, heap[smallest]!)) smallest = right;
    if (smallest === index) break;
    [heap[index], heap[smallest]] = [heap[smallest]!, heap[index]!];
    index = smallest;
  }
  return first;
}

export function dijkstra(
  vertexCount: number,
  edges: readonly (readonly [number, number, number])[],
  source: number
): DijkstraResult {
  validateVertexCount(vertexCount);
  validateVertex(source, vertexCount);
  const adjacency = Array.from({ length: vertexCount + 1 }, () => [] as { to: number; weight: number }[]);
  for (const [from, to, weight] of edges) {
    validateVertex(from, vertexCount);
    validateVertex(to, vertexCount);
    if (!Number.isFinite(weight) || weight < 0) throw new Error("Dijkstra requires finite non-negative weights.");
    adjacency[from]!.push({ to, weight });
  }
  const rawDistances = Array.from({ length: vertexCount + 1 }, () => Number.POSITIVE_INFINITY);
  rawDistances[source] = 0;
  const heap: HeapEntry[] = [];
  const steps: DijkstraStep[] = [{ kind: "push", vertex: source, distance: 0 }];
  const settleOrder: number[] = [];
  heapPush(heap, { vertex: source, distance: 0 });
  let staleCount = 0;
  while (heap.length > 0) {
    const current = heapPop(heap);
    steps.push({ kind: "pop", vertex: current.vertex, distance: current.distance });
    if (current.distance > rawDistances[current.vertex]!) {
      staleCount += 1;
      steps.push({ kind: "stale", vertex: current.vertex, distance: current.distance });
      continue;
    }
    settleOrder.push(current.vertex);
    for (const edge of adjacency[current.vertex]!) {
      const candidate = current.distance + edge.weight;
      if (candidate < rawDistances[edge.to]!) {
        rawDistances[edge.to] = candidate;
        steps.push({ kind: "relax", vertex: edge.to, distance: candidate, via: current.vertex });
        heapPush(heap, { vertex: edge.to, distance: candidate });
        steps.push({ kind: "push", vertex: edge.to, distance: candidate, via: current.vertex });
      } else {
        steps.push({ kind: "reject", vertex: edge.to, distance: candidate, via: current.vertex });
      }
    }
  }
  return {
    distances: rawDistances.map((distance, index) => index === 0 || !Number.isFinite(distance) ? null : distance),
    settleOrder,
    steps,
    staleCount
  };
}
