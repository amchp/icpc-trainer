export const graphTheory = {
  loading: "Loading the Graph Theory guide…",
  roadmap: "Learning roadmap",
  eyebrow: "Graph Theory · C++17",
  title: "Model relationships. Traverse with purpose.",
  subtitle: "Graphs turn rooms, friendships, prerequisites, and routes into vertices and edges. Learn to choose the representation and traversal that matches the question.",
  heroNoteTitle: "Recommended foundation, open access",
  heroNote: "Data Structures is the recommended prerequisite because stacks, queues, and priority queues drive these traversals. This guide remains unlocked, so enter whenever the problems are useful to you.",
  conceptsLabel: "Graph Theory concepts",
  concepts: { model: "Model", traverse: "Traverse", invariant: "Invariant", prove: "Prove" },
  sidebar: { label: "Graph Theory guide sections", progress: "Section {{current}} of {{total}}" },
  sections: { rooms: "Counting Rooms", labyrinth: "Labyrinth", teams: "Building Teams", schedule: "Course Schedule", routes: "Shortest Routes I", practice: "Practice and comparison" },
  challenge: {
    constraints: "Constraints", sample: "Example", source: "Open original problem", problemStage: "Problem",
    attempt: "Before revealing the tool, name the vertices and edges, then choose the state each vertex must remember.", attemptStage: "Quick attempt",
    reveal: "Learn the tool", hide: "Hide the tool", applicationPrompt: "Now connect the general tool to this problem without reading submission code.",
    applicationReveal: "Show the problem connection", applicationHide: "Hide the problem connection", toolStage: "Tool", applicationStage: "Application"
  },
  conceptPlayers: {
    connectivity: {
      label: "DFS follows one branch before backtracking", preset: "Complete DFS traversal", description: "A seven-node branching graph shows every descent, backtrack, and completed branch until all reachable nodes are visited.",
      start: "Start at node 1 and target its first unvisited neighbour, node 2.", descend: "Enter node {{vertex}}; its next unvisited neighbour is node {{next}}.", leaf: "Node {{vertex}} has no unvisited neighbours, so DFS backtracks to node {{parent}}.", resume: "Back at node {{vertex}}, DFS continues with unvisited neighbour {{next}}.", nextBranch: "The entire branch under node 2 is complete; DFS returns to node 1 and now targets node 3.", finished: "Node 7 completes the final branch. Every node reachable from 1 is now visited, so DFS is finished."
    },
    bfs: {
      label: "BFS expands in distance layers", preset: "Complete BFS traversal", description: "The graph changes colour layer by layer while the FIFO queue, distances, and parents show the complete traversal.", graph: "BFS graph and distance layers", distance: "Distances", queue: "FIFO queue", parents: "Parent links", source: "source",
      initialize: "Initialize the source node 1 at distance 0 and enqueue it.", dequeue: "Dequeue node {{vertex}} and inspect all of its neighbours.", discover: "Discover node {{vertex}} from node {{parent}} at distance {{distance}}, record its parent, and enqueue it.", finished: "The queue is empty only after all seven reachable nodes have been processed; BFS is finished."
    },
    adjacency: { label: "An undirected edge appears in both adjacency lists" },
    indegree: {
      label: "Indegree drives topological order", successPreset: "Complete DAG", successDescription: "Run Kahn's algorithm to completion on a branching DAG and emit every node.", cyclePreset: "Cycle failure", cycleDescription: "A separate counterexample shows why a directed cycle prevents any topological order.",
      initialize: "Nodes 1 and 2 have indegree zero, so both enter the queue.", emitVertex: "Emit node {{vertex}}, remove all of its outgoing edges, and enqueue every neighbour whose indegree becomes zero.", finished: "All five nodes were emitted, so 1, 2, 3, 4, 5 is a complete valid topological order.", cycleStart: "In this separate graph, every node has indegree 1, so the initial queue is empty.", cycle: "The queue is empty while nodes remain. The arrows form a directed cycle, so no topological order exists.", cycleLabel: "Directed cycle counterexample", queue: "Zero-indegree queue", order: "Valid order", leftovers: "Cycle leftovers"
    },
    relaxation: {
      label: "Relax tentative distances", preset: "Complete Dijkstra run", description: "Follow every priority-queue operation until the cheaper two-edge route is settled and the obsolete entry is discarded.",
      initialize: "Set distance[1] to 0, every other distance to infinity, and push 0:1.", settle: "Pop {{distance}}:{{vertex}}; it matches the stored distance, so node {{vertex}} is processed.", direct: "Relax 1 → 2 and record the first tentative distance 9.", intermediate: "Relax 1 → 3 to distance 2. The queue chooses 2:3 before 9:2.", improve: "From node 3, route 1 → 3 → 2 costs 2 + 3 = 5, improving distance 9.", stale: "The remaining entry 9:2 is stale. Discard it without highlighting or processing node 2 again.", finished: "The queue is empty and the final distances are 0, 5, 2; Dijkstra is finished."
    }
  },
  representations: {
    eyebrow: "Graph storage",
    title: "Represent the same graph with a list or a matrix",
    intro: "A diagram helps people see a graph, but an algorithm needs a data structure. These two representations encode the same five-node undirected graph; choose one based on the operations and density you expect.",
    graphTitle: "Example graph",
    listTitle: "Adjacency list",
    listText: "Store only each node's neighbours. It uses O(n + m) memory and is usually the best fit for sparse contest graphs and traversals that inspect outgoing edges.",
    matrixTitle: "Adjacency matrix",
    matrixText: "Store one cell for every ordered pair of nodes. It uses O(n²) memory, but checking whether one specific edge exists takes O(1) time.",
    matrixAria: "Adjacency matrix for the five-node example",
    symmetry: "Because the example is undirected, every edge u—v appears twice: v is in u's list and u is in v's list, while matrix cells [u][v] and [v][u] are both 1. A directed graph records only the arrow's direction."
  },
  traces: {
    visuals: { grid: "Grid", graph: "Graph", distance: "Distance", queue: "Queue", priorityQueue: "Priority queue", order: "Order", adjacency: "Adjacency lists", stack: "Call stack", parent: "Parent map", moves: "Moves" },
    labels: { gridDfs: "Depth-first search on an adjacency list", gridBfs: "Breadth-first search with parents", bipartiteDfs: "Bipartite colouring DFS", kahn: "Kahn topological order", dijkstra: "Dijkstra with a lazy priority queue" },
    execution: {
      initialize: "Initialize the traversal state.", enter: "Enter the next recursive call.", bounds: "Check whether row {{row}}, column {{column}} is out of bounds.", wall: "The wall check is {{result}}.", visited: "The visited check is {{result}}.", mark: "Mark row {{row}}, column {{column}} as visited.", direction: "Inspect the next neighbour in deterministic order.", recurse: "Recurse into {{value}}.", return: "Return from this recursive call.",
      enqueue: "Enqueue the selected item for later processing.", dequeue: "Remove the selected item from the frontier.", loop: "Continue while the frontier is not empty.", front: "Read {{value}} at the front.", neighbour: "Form neighbour {{value}}.", distance: "Update the distance to {{distance}}.", parent: "Record parent {{value}}.", discover: "Discover a new cell and record its distance and parent.", reconstruct: "The reconstructed move string is {{value}}.",
      colour: "Colour vertex {{vertex}} with the required opposite colour.", inspect: "Inspect the next edge or vertex.", conflict: "Vertices {{from}} and {{to}} have the same colour, so this edge conflicts.",
      indegree: "Inspect the current indegree information.", emit: "Emit vertex {{vertex}} into the topological order.", decrement: "Remove {{from}}→{{to}}; indegree becomes {{indegree}}.",
      push: "Push ({{distance}}, {{vertex}}) into the priority queue.", pop: "Pop ({{distance}}, {{vertex}}), the smallest queued pair.", stale: "Discard stale entry ({{distance}}, {{vertex}}).", candidate: "The candidate distance is {{distance}}.", relax: "Relax the edge into vertex {{to}} and improve the distance to {{distance}}.", reject: "Reject the edge into vertex {{to}} because candidate {{distance}} does not improve the distance.", finished: "The algorithm has finished."
    }
  },
  rooms: {
    eyebrow: "Grid as an implicit graph", title: "Counting Rooms", description: "Count connected floor regions in a rectangular map. Two floor cells belong to the same room when a path of side-sharing floor cells joins them.",
    constraints: "1 ≤ n, m ≤ 1000; each cell is floor (.) or wall (#).", sample: "5 8\n########\n#..#...#\n####.#.#\n#..#...#\n########\n→ 3",
    toolTitle: "Traverse a graph with depth-first search", toolText: "DFS starts at any source vertex, marks it visited, then follows one unvisited neighbour at a time. Recursion or an explicit stack remembers where to return; the same algorithm works on any adjacency list.",
    foundation: { title: "The reusable graph tool", node: { term: "Node (vertex)", definition: "One object in the model: a person, course, city, state, or cell." }, edge: { term: "Edge", definition: "A relationship that says which nodes are direct neighbours." }, dfs: { term: "Depth-first search", definition: "Follow one branch as far as possible, then backtrack to the next unvisited neighbour." } },
    applicationTitle: "Turn finished floods into a room count", explanation: "Scan cells in row-major order. Each unvisited floor cell proves that you found a new component: increment the answer and traverse from it, marking every reachable floor cell. Walls and visited cells stop a branch. After the scan, output the number of traversals you started.", animationLabel: "Counting Rooms scenarios",
    pitfalls: { correctness: "Correctness", correctnessText: "Each flood marks exactly one maximal connected component; the scan starts one flood for every component and never starts two for the same one.", complexity: "Complexity", complexityText: "O(nm) time and O(nm) visited storage because every cell and side-neighbour is inspected only a constant number of times.", warning: "Stack safety", warningText: "A 1000 × 1000 single component can overflow the C++ call stack. Use iterative DFS or BFS when recursion depth may approach the number of cells." }
  },
  labyrinth: {
    eyebrow: "Shortest path in an unweighted grid", title: "Labyrinth", description: "Find any shortest route from A to B through open cells and print the sequence of moves.",
    constraints: "1 ≤ n, m ≤ 1000; exactly one A and one B; movement is orthogonal.", sample: "5 8\n########\n#.A#...#\n#.##.#B#\n#......#\n########\n→ YES, 9 moves",
    toolTitle: "Traverse an unweighted graph in BFS layers", toolText: "BFS starts at a source vertex and uses a FIFO queue. First discovery fixes the fewest-edge distance, so record each vertex's parent at that moment when you also need to reconstruct a path.",
    foundation: { title: "The reusable shortest-path tool", bfs: { term: "Breadth-first search", definition: "Visit every vertex one edge away before any vertex two edges away." }, queue: { term: "FIFO queue", definition: "Vertices leave in discovery order, which preserves increasing distance layers." }, parent: { term: "Parent link", definition: "The edge that first discovered a vertex; following parents reconstructs one shortest path." } },
    applicationTitle: "Reconstruct one accepted shortest path", explanation: "Model traversable cells as vertices with unit-cost side edges. Run BFS from A, recording for every first discovery which predecessor and move reached it. If B is discovered, follow parents backwards to A, reverse the moves, and print YES, the length, and that move string; otherwise print NO.", animationLabel: "Labyrinth scenarios",
    pitfalls: { correctness: "Correctness", correctnessText: "FIFO layers guarantee that first discovery gives minimum edge count; parent links therefore form a shortest path back to A.", complexity: "Complexity", complexityText: "O(nm) time and O(nm) memory.", warning: "Deterministic traces", warningText: "The model, tool, animation, and tests all use down, up, right, left. Other neighbour orders may produce another shortest path, and any shortest path is accepted." }
  },
  teams: {
    eyebrow: "Adjacency lists and two colours", title: "Building Teams", description: "Assign every student to one of two teams so that no friendship has both endpoints on the same team.",
    constraints: "1 ≤ n, m ≤ 100000; friendships are undirected; the graph may be disconnected.", sample: "5 3\n1 2\n1 3\n4 5\n→ 1 2 2 1 2",
    toolTitle: "Test a graph with two-colouring", toolText: "Start an uncoloured component with either colour. DFS or BFS gives every newly discovered neighbour the opposite colour; restart at every still-uncoloured node so disconnected components and isolated nodes are included.",
    foundation: { title: "The reusable two-colouring test", bipartite: { term: "Bipartite graph", definition: "Its nodes can be split into two groups so every edge crosses from one group to the other." }, twoColour: { term: "Two-colouring", definition: "Give every neighbour the opposite of the current node's colour while traversing the graph." }, conflict: { term: "Conflict edge", definition: "An edge whose endpoints already have the same colour proves that no valid two-colouring exists." } },
    applicationTitle: "Interpret a conflict as an odd cycle", explanation: "Build an undirected adjacency list. For every still-uncoloured vertex, start a traversal with team A; each edge forces its other endpoint onto the opposite team. If an already-coloured neighbour has the same colour, output IMPOSSIBLE. Otherwise output each vertex's team number.", animationLabel: "Building Teams scenarios",
    pitfalls: { correctness: "Correctness", correctnessText: "Opposite colours satisfy every explored edge. A graph is bipartite exactly when it has no odd cycle, so an equal-colour edge is a complete impossibility certificate.", complexity: "Complexity", complexityText: "O(n + m) time and O(n + m) storage.", warning: "Disconnected and deep", warningText: "Start from every component, including isolated vertices. With n = 100000, recursive DFS can overflow the C++ stack; an explicit stack or BFS is safer." }
  },
  schedule: {
    eyebrow: "Directed prerequisites", title: "Course Schedule", description: "Order all courses so every prerequisite appears before the course that depends on it, or report that no order exists.",
    constraints: "1 ≤ n, m ≤ 100000; each directed edge a → b requires a before b.", sample: "5 3\n1 2\n3 1\n4 5\n→ 3 4 1 5 2",
    toolTitle: "Order a DAG with Kahn's algorithm", toolText: "Kahn's algorithm repeatedly removes any zero-indegree vertex. Removing its outgoing edges can expose new zero-indegree vertices; if vertices remain after the queue empties, a directed cycle exists.",
    foundation: { title: "The reusable ordering model", directed: { term: "Directed graph", definition: "An edge u → v has a direction: you may follow it from u to v, not automatically back." }, dag: { term: "DAG", definition: "A directed acyclic graph: following arrows can never return to the starting node." }, indegree: { term: "Indegree", definition: "The number of incoming edges a node still has; zero means nothing must precede it." } },
    applicationTitle: "Let the output length expose cycles", explanation: "Build directed adjacency lists and initial indegrees. Enqueue every zero-indegree course in ascending order. Repeatedly emit the queue front and decrement each outgoing neighbour's indegree, enqueueing it when the count becomes zero. Output the order only if it contains all courses.", animationLabel: "Course Schedule scenarios",
    pitfalls: { correctness: "Correctness", correctnessText: "A zero-indegree vertex has no unmet prerequisite, so appending it preserves validity. A valid order exists exactly when the graph is a DAG.", complexity: "Complexity", complexityText: "O(n + m) time and O(n + m) memory.", warning: "Leftovers name the obstruction", warningText: "If fewer than n vertices are emitted, every leftover region depends on a directed cycle; report IMPOSSIBLE." }
  },
  routes: {
    eyebrow: "Nonnegative weighted edges", title: "Shortest Routes I", description: "Find the minimum flight cost from city 1 to every city in a directed graph with positive weights.",
    constraints: "1 ≤ n ≤ 100000, 1 ≤ m ≤ 200000; 1 ≤ weight ≤ 10⁹; every city is reachable from 1.", sample: "3 4\n1 2 6\n1 3 2\n3 2 3\n1 3 4\n→ 0 5 2",
    toolTitle: "Find shortest paths in a nonnegative weighted graph", toolText: "Dijkstra stores the best tentative distance discovered for each node. A min-priority queue selects the smallest one, and relaxation asks whether an outgoing edge produces a cheaper route.",
    foundation: { title: "The reusable weighted-path model", weighted: { term: "Weighted graph", definition: "Every edge carries a cost such as distance, time, or price; path cost is the sum of its edges." }, relaxation: { term: "Relaxation", definition: "Try distance[u] + weight(u,v); replace distance[v] only when that candidate is smaller." }, nonnegative: { term: "Nonnegative weights", definition: "Dijkstra requires every edge weight to be at least zero so a settled minimum cannot improve later." } },
    applicationTitle: "Use the edge weights to choose the algorithm", explanation: "Build a directed weighted adjacency list and initialize city 1 to distance zero. Pop the smallest pair; ignore it if a better distance is already stored. For every outgoing flight, replace and push the destination distance only when the new sum is smaller. Print the final distance array.", animationLabel: "Shortest Routes scenarios",
    correction: "Use BFS for unweighted or equal-weight edges, Dijkstra for nonnegative weighted edges, and Bellman–Ford or another suitable method when edges can be negative.",
    pitfalls: { correctness: "Correctness", correctnessText: "With nonnegative weights, the smallest non-stale queued distance cannot later be improved, and relaxation preserves the best discovered route.", complexity: "Complexity", complexityText: "O((n + m) log n) time and O(n + m) memory with adjacency lists and a binary heap.", warning: "Numeric and queue safety", warningText: "Use long long because path sums exceed int. Skip stale queue entries; they are expected in the lazy implementation, not an error." }
  },
  scenarios: {
    common: { distance: "distance", queue: "Queue", order: "Order", impossible: "IMPOSSIBLE", final: "Finished." },
    rooms: { sample: { label: "Official sample", description: "Three components separated by walls." }, diagonal: { label: "Diagonal contact", description: "Corners do not connect rooms." }, winding: { label: "Winding room", description: "A narrow corridor is still one component." } },
    labyrinth: { sample: { label: "Official sample", description: "Reach B with a shortest path." }, unreachable: { label: "Blocked route", description: "No path crosses the wall." }, multipath: { label: "Several shortest paths", description: "Deterministic neighbour order chooses one." } },
    teams: { sample: { label: "Disconnected sample", description: "Colour every component." }, oddCycle: { label: "Odd cycle", description: "Equal colours expose a conflict." }, evenCycle: { label: "Even cycle and isolated", description: "Both are bipartite." } },
    schedule: { sample: { label: "Official sample", description: "FIFO tie-breaking gives a deterministic order." }, multiple: { label: "Several valid orders", description: "One deterministic valid order is enough." }, cycle: { label: "Directed cycle", description: "No vertex reaches indegree zero." } },
    routes: { sample: { label: "Parallel flights", description: "The cheaper route may use an intermediate city." }, detour: { label: "Cheaper detour", description: "Two light edges beat one heavy edge." }, stale: { label: "Stale queue entry", description: "A later improvement leaves an obsolete pair in the heap." } },
    adjacency: { label: "Friendship lists", description: "Each friendship is stored at both endpoints.", frame: "Add friendship {{from}}—{{to}} to both lists.", finished: "Every undirected friendship now appears twice, once from each endpoint." },
    narration: {
      roomsVisit: "Visit row {{row}}, column {{column}} in room {{room}}.", roomsComplete: "Component {{room}} is complete; the room count is now {{count}}.", roomsFinal: "The scan finishes with {{count}} rooms.",
      bfsVisit: "Dequeue row {{row}}, column {{column}} at distance {{distance}}.", bfsPath: "Reconstruct the shortest path through row {{row}}, column {{column}}.", bfsFinal: "The shortest distance is {{distance}} with moves {{moves}}.", bfsUnreachable: "The queue is empty before B is reached, so no path exists.",
      colour: "Colour vertex {{vertex}} with team {{colour}}.", conflict: "Edge {{from}}—{{to}} joins equal colours, so the assignment is impossible.", teamsFinal: "The complete team assignment is {{assignment}}.",
      enqueue: "Enqueue vertex {{vertex}} because its indegree is zero.", dequeue: "Dequeue and emit vertex {{vertex}}.", decrement: "Remove {{from}}→{{to}}; vertex {{to}} now has indegree {{indegree}}.", scheduleFinal: "The valid order is {{order}}.", scheduleCycle: "Vertices {{vertices}} never reach indegree zero, so a cycle prevents an order.",
      push: "Push vertex {{vertex}} with tentative distance {{distance}}.", pop: "Pop vertex {{vertex}} at distance {{distance}}.", stale: "Discard stale entry ({{distance}}, {{vertex}}) because a better distance is already known.", relax: "Relax {{from}}→{{to}} and improve distance to {{distance}}.", reject: "Reject {{from}}→{{to}} because candidate {{distance}} does not improve the best distance.", routesFinal: "Final distances from city 1 are {{distances}}."
    }
  },
  practice: { intro: "Keep modelling before coding. These problems vary the graph question while preserving the same representations and invariants.", tag: "Graph practice", links: { messageRoute: "Message Route", roundTrip: "Round Trip", monsters: "Monsters", highScore: "High Score", flightDiscount: "Flight Discount", maze: "Labyrinth" } },
  comparison: { eyebrow: "Nearby shortest-path tools", title: "Choose by edge rules and query shape", intro: "Floyd–Warshall is useful for dense all-pairs work on small graphs. Bellman–Ford handles negative edges and can detect a reachable negative cycle; neither needs a full arc here.", algorithm: "Algorithm", applies: "When it applies", complexity: "Complexity", floyd: { name: "Floyd–Warshall", applies: "All-pairs shortest paths; small n; negative edges allowed but no negative cycle", complexity: "O(n³) time, O(n²) memory" }, bellman: { name: "Bellman–Ford", applies: "Single-source paths with negative edges; negative-cycle detection", complexity: "O(nm) time, O(n) memory" }, dijkstra: { name: "Dijkstra", applies: "Single-source paths with nonnegative weights", complexity: "O((n + m) log n) time" } },
  finish: { eyebrow: "Graph toolkit ready", title: "You can now turn relationships into invariants.", description: "Carry the modelling decision first: define vertices and edges, choose the state, then prove why the traversal order answers the problem.", markComplete: "Mark complete", markProgress: "Mark in progress", back: "Back to roadmap" },
  progress: { saveError: "Progress was not started", saveErrorDescription: "You can keep reading and try again later.", completed: "Graph Theory completed", completedDescription: "Graph Theory now counts toward your roadmap.", inProgress: "Graph Theory reopened", inProgressDescription: "The guide is marked in progress again.", updateError: "Progress was not updated", updateErrorDescription: "Your previous status is unchanged." }
} as const;
