import { animationIntroductions } from "./animationIntroductions.js";

export const animations = {
  introductions: animationIntroductions,
  lesson: {
  "problem": "The problem",
  "concept": "The concept",
  "exploration": "Operations to explore",
  "analysis": "The analysis question",
  "given": "Given",
  "goal": "Goal",
  "example": "Illustrated example",
  "show": "Show example outcome",
  "hide": "Back to input",
  "exampleNote": "A small example to explain the task. Each tool below has its own controls and examples.",
  "algorithm": "Algorithm and walkthrough",
  "reference": "Reference code",
  "referenceNote": "Read alongside the animation; this reference does not highlight the current step.",
  "explore": "Explore the behavior"
},
  "libraryTitle": "Animation Library",
  "subtitle": "Explore algorithm tools, learn step by step, and present them in class.",
  "searchLabel": "Search animations",
  "searchPlaceholder": "Search algorithms, tools, or topics…",
  "topicLabel": "Topic",
  "allTopics": "All topics",
  "resultCount": "{{count}} workspaces",
  "resultCount_one": "{{count}} workspace",
  "resultCount_other": "{{count}} workspaces",
  "openWorkspace": "Open workspace",
  "backToLibrary": "Back to library",
  "fullGuide": "Full guide",
  "present": "Present",
  "exitPresentation": "Exit presentation",
  "copyLink": "Copy link",
  "copied": "Link copied",
  "copyFailed": "Could not copy the link. Select and copy the URL below.",
  "loading": "Loading workspace…",
  "reload": "Reload workspace",
  "notFoundTitle": "Workspace not found",
  "notFoundDescription": "This animation workspace does not exist. Browse the library to choose a tool.",
  "errorTitle": "Could not load this workspace",
  "errorDescription": "Reload the workspace to try again. Its tools will return to their starting states.",
  "emptyTitle": "No animations found",
  "emptyDescription": "Try another search or reset the filters to explore all workspaces.",
  "reset": "Reset filters",
  "memberCount": "{{count}} tools",
  "memberCount_one": "{{count}} tool",
  "memberCount_other": "{{count}} tools",
  "topics": {
    "fundamentals": "Fundamentals",
    "complexity": "Complexity",
    "data-structures": "Data structures",
    "brute-force": "Brute force",
    "binary-search": "Binary search",
    "greedy": "Greedy",
    "graphs": "Graphs"
  },
  "groups": {
    "conditionals": {
      "title": "Conditionals",
      "description": "Follow the branch selected by a condition.",
      "explanation": "Step through an if/else decision and observe which statements execute for the current values."
    },
    "loops": {
      "title": "Loops",
      "description": "Compare counted loops, conditional loops, and loop control.",
      "explanation": "Explore for and while loops, then see how break and continue change the sequence of executed instructions."
    },
    "vector-traversal": {
      "title": "Vector traversal",
      "description": "Visit vector elements in index order.",
      "explanation": "Follow the index and current element as a loop traverses a vector, connecting each iteration with its data."
    },
    "function-calls": {
      "title": "Function calls",
      "description": "Trace arguments, local work, and returned values.",
      "explanation": "Follow execution into a function and back to its caller to see how parameters and return values carry information."
    },
    "recursion": {
      "title": "Recursion",
      "description": "Follow recursive calls from the base case back to the result.",
      "explanation": "Compare a countdown, a recursive calculation, and Fibonacci to understand how calls pause, reach a base case, and return."
    },
    "fibonacci-recursion-tree": {
      "title": "Fibonacci recursion tree",
      "description": "Reveal the repeated work in recursive Fibonacci.",
      "explanation": "Expand the call tree and compare repeated subproblems to understand why the direct recursive approach grows so quickly."
    },
    "vectors": {
      "title": "Vectors and bounds",
      "description": "Explore vector operations and ordered search boundaries.",
      "explanation": "Manipulate a vector, then inspect lower_bound and upper_bound on sorted values, including repeated values and insertion positions."
    },
    "stacks": {
      "title": "Stacks",
      "description": "Explore last-in, first-out operations.",
      "explanation": "Push and pop values while watching the top of the stack; only the most recently added remaining element is removed next."
    },
    "queues": {
      "title": "Queues and deques",
      "description": "Compare a FIFO queue with a double-ended queue.",
      "explanation": "Use a queue to process values in arrival order, then explore how a deque permits insertion and removal at both ends."
    },
    "sets": {
      "title": "Sets",
      "description": "Maintain an ordered collection of unique values.",
      "explanation": "Insert, find, and erase values to see how a set preserves uniqueness and keeps its elements ordered."
    },
    "maps": {
      "title": "Maps",
      "description": "Associate keys with values and inspect updates.",
      "explanation": "Explore lookup and updates in a map, where each key identifies a value and an existing key can be assigned a new value."
    },
    "structs": {
      "title": "Structs",
      "description": "Group related fields into structured records.",
      "explanation": "Inspect a record with named fields to see how a struct keeps related data together while each field retains its own meaning."
    },
    "permutations": {
      "title": "Permutations",
      "description": "Generate orderings recursively and iteratively.",
      "explanation": "Compare backtracking with next_permutation. Each tool independently shows how to enumerate orderings without mixing their execution states."
    },
    "subsets": {
      "title": "Subsets",
      "description": "Enumerate choices with recursion and bitmasks.",
      "explanation": "Compare include-or-skip recursion with a bitmask in which each bit records whether one element belongs to the subset."
    },
    "binary-search-comparison": {
      "title": "Linear and binary search",
      "description": "Compare scanning with repeatedly halving a sorted range.",
      "explanation": "Use the existing inputs to compare how linear and binary search inspect values when looking for the same target."
    },
    "monotone-condition-pattern": {
      "title": "Monotone conditions",
      "description": "Identify the boundary where a predicate changes truth value.",
      "explanation": "Inspect a monotone condition and the split between its true and false regions before applying binary search."
    },
    "first-occurrence-trace": {
      "title": "First occurrence",
      "description": "Find the first position that reaches a target value.",
      "explanation": "Follow a false-to-true boundary search to locate the first occurrence even when the sorted sequence contains duplicates."
    },
    "closest-value-trace": {
      "title": "Closest value",
      "description": "Track a search for a nearby value in sorted data.",
      "explanation": "Observe how the interval narrows around the target and how the boundary identifies the relevant neighboring candidate."
    },
    "numeric-binary-search-trace": {
      "title": "Numeric binary search",
      "description": "Narrow a numeric answer range with a condition.",
      "explanation": "Follow the midpoint tests and interval updates to see how a monotone numeric condition guides the search toward a boundary."
    },
    "first-true-boundary-trace": {
      "title": "First true boundary",
      "description": "Locate the first true position after a false prefix.",
      "explanation": "Step through a false-to-true number line, retaining the half that contains the first position satisfying the condition."
    },
    "last-true-boundary-trace": {
      "title": "Last true boundary",
      "description": "Locate the final true position before a false suffix.",
      "explanation": "Step through a true-to-false number line, retaining the half that contains the last position satisfying the condition."
    },
    "coin-change": {
      "title": "Greedy coin change",
      "description": "Try the largest coin first and inspect a counterexample.",
      "explanation": "Follow a greedy coin selection, then compare a coin system where that local choice uses more coins than an optimal selection."
    },
    "activity-selection": {
      "title": "Activity selection",
      "description": "Choose compatible intervals by earliest finish time.",
      "explanation": "Follow the finish-time ordering and accept an interval when it starts after the previous selected interval ends."
    },
    "largest-first-selection": {
      "title": "Largest-first selection",
      "description": "Build a sum by taking larger values first.",
      "explanation": "Inspect the descending order and growing selected total to understand how a largest-first greedy choice reaches a threshold."
    },
    "subsequence-scanner": {
      "title": "Subsequence scanning",
      "description": "Match a target in order while scanning a sequence.",
      "explanation": "Advance through the source and move the target pointer only on a match, preserving the order required by a subsequence."
    },
    "sign-block-selection": {
      "title": "Sign-block selection",
      "description": "Choose the largest value from each consecutive sign block.",
      "explanation": "Follow consecutive positive and negative blocks and retain their best representative to build an alternating selection."
    },
    "dfs": {
      "title": "Depth-first search (DFS)",
      "description": "Explore connectivity and a depth-first grid traversal.",
      "explanation": "Start with reachable vertices, then follow a grid traversal that explores one branch before returning to try another."
    },
    "bfs": {
      "title": "Breadth-first search (BFS)",
      "description": "Explore distance layers and a breadth-first grid traversal.",
      "explanation": "Watch a queue expand the frontier by distance, then follow the same layer-by-layer idea across a grid."
    },
    "bipartite-dfs": {
      "title": "Bipartite coloring with DFS",
      "description": "Assign two colors while exploring a graph.",
      "explanation": "Follow DFS as adjacent vertices receive opposite colors and inspect the conflict that prevents a two-coloring."
    },
    "topological-sort": {
      "title": "Topological sorting",
      "description": "Connect indegrees with Kahn's ordering algorithm.",
      "explanation": "Count incoming edges, then repeatedly process a zero-indegree vertex and update the remaining dependencies."
    },
    "dijkstra": {
      "title": "Dijkstra's shortest paths",
      "description": "Connect edge relaxation with a weighted graph traversal.",
      "explanation": "Inspect how relaxation improves a tentative distance, then follow Dijkstra's next-closest choice on nonnegative edge weights."
    }
  },
  "tools": {
    "conditionals-trace": {
      "title": "Conditional trace",
      "description": "Track which branch executes.",
      "explanation": "Watch the condition evaluation and follow the statements in the selected branch."
    },
    "for-loop-trace": {
      "title": "For-loop trace",
      "description": "Follow initialization, condition, body, and update.",
      "explanation": "Step through each phase of a counted loop and watch the loop variable change."
    },
    "while-loop-trace": {
      "title": "While-loop trace",
      "description": "Repeat a body while its condition holds.",
      "explanation": "Inspect the condition before each iteration and the changes that eventually stop the loop."
    },
    "loop-control-trace": {
      "title": "Break and continue trace",
      "description": "Skip an iteration or leave a loop.",
      "explanation": "Compare continue, which skips the remaining body, with break, which exits the loop."
    },
    "vector-traversal-trace": {
      "title": "Vector traversal trace",
      "description": "Follow an index through a vector.",
      "explanation": "Observe the current index and value on each iteration through the vector."
    },
    "function-call-trace": {
      "title": "Function call trace",
      "description": "Follow execution into a function and back.",
      "explanation": "Inspect the arguments passed to the function and the value returned to the caller."
    },
    "countdown-recursion": {
      "title": "Recursive countdown",
      "description": "Watch calls descend toward a base case.",
      "explanation": "Follow decreasing arguments until the countdown stops, then observe the return through the waiting calls."
    },
    "recursion-trace": {
      "title": "Recursive calculation trace",
      "description": "Inspect recursive calls and returning results.",
      "explanation": "Track each call's local values and see how the result propagates back after the base case."
    },
    "fibonacci-recursion-trace": {
      "title": "Fibonacci code trace",
      "description": "Follow the two recursive Fibonacci branches.",
      "explanation": "Step through Fibonacci's calls and additions to see how smaller results combine into the requested value."
    },
    "vector-simulator": {
      "title": "Vector simulator",
      "description": "Explore indexed access and changes to a vector.",
      "explanation": "Use the simulator's operations to observe how a vector's values and indices change."
    },
    "vector-bounds-explorer": {
      "title": "Lower and upper bounds",
      "description": "Locate insertion boundaries in sorted values.",
      "explanation": "Compare the first value greater than or equal to the target with the first strictly greater value."
    },
    "stack-simulator": {
      "title": "Stack simulator",
      "description": "Push and pop at the top of a stack.",
      "explanation": "Apply stack operations and inspect how the last value inserted becomes the next one removed."
    },
    "queue-simulator": {
      "title": "Queue simulator",
      "description": "Add at the back and remove from the front.",
      "explanation": "Follow a FIFO queue as values leave in the same order in which they arrived."
    },
    "deque-simulator": {
      "title": "Deque simulator",
      "description": "Insert and remove at either end.",
      "explanation": "Compare front and back operations on a double-ended queue."
    },
    "set-simulator": {
      "title": "Set simulator",
      "description": "Insert, find, and erase unique values.",
      "explanation": "Observe ordered set operations and how inserting an existing value leaves uniqueness intact."
    },
    "map-simulator": {
      "title": "Map simulator",
      "description": "Look up and update values by key.",
      "explanation": "Inspect key-value associations as map operations insert, update, or erase entries."
    },
    "struct-simulator": {
      "title": "Struct simulator",
      "description": "Inspect named fields in a record.",
      "explanation": "Explore how related values are organized as fields within a struct."
    },
    "recursive-permutations": {
      "title": "Recursive permutations",
      "description": "Build orderings with recursive choices and backtracking.",
      "explanation": "Choose an unused element, recurse, and undo the choice before exploring the next branch."
    },
    "iterative-permutations": {
      "title": "Iterative permutations",
      "description": "Enumerate orderings with next_permutation.",
      "explanation": "Advance through successive lexicographic permutations and inspect the changes between adjacent orderings."
    },
    "recursive-subsets": {
      "title": "Recursive subsets",
      "description": "Decide whether to include each element.",
      "explanation": "Follow the include and skip branches until each complete sequence of decisions defines a subset."
    },
    "bitmask-subsets": {
      "title": "Bitmask subsets",
      "description": "Represent membership using one bit per element.",
      "explanation": "Inspect each mask and select the elements whose corresponding bits are set."
    },
    "coin-change-walkthrough": {
      "title": "Greedy coin-change walkthrough",
      "description": "Repeatedly choose the largest coin that fits.",
      "explanation": "Track the remaining amount and selected coins as the greedy rule makes each local choice."
    },
    "coin-change-counterexample": {
      "title": "Coin-change counterexample",
      "description": "Compare greedy selection with a better combination.",
      "explanation": "Inspect a coin system where taking the largest coin first fails to minimize the number of coins."
    },
    "activity-selection-walkthrough": {
      "title": "Activity-selection walkthrough",
      "description": "Accept compatible intervals in finish-time order.",
      "explanation": "Track the end of the last selected interval as each candidate is accepted or skipped."
    },
    "graph-connectivity": {
      "title": "Graph connectivity",
      "description": "Reveal the vertices reachable from a starting point.",
      "explanation": "Follow a traversal through connected vertices and inspect which vertices remain outside that component."
    },
    "dfs-grid-traversal": {
      "title": "DFS grid traversal",
      "description": "Explore a grid deeply before backtracking.",
      "explanation": "Follow the visited cells and recursive exploration order as DFS completes one branch at a time."
    },
    "bfs-layers": {
      "title": "BFS distance layers",
      "description": "Expand a graph frontier one distance at a time.",
      "explanation": "Watch vertices join successive layers according to their unweighted distance from the start."
    },
    "bfs-grid-traversal": {
      "title": "BFS grid traversal",
      "description": "Use a queue to visit cells in distance order.",
      "explanation": "Inspect the queue and visited cells as the breadth-first frontier spreads through the grid."
    },
    "graph-indegree": {
      "title": "Graph indegree",
      "description": "Count the incoming edges of each vertex.",
      "explanation": "Inspect how incoming edges encode dependencies and identify vertices with no remaining prerequisites."
    },
    "kahn-topological-sort": {
      "title": "Kahn's topological sort",
      "description": "Remove zero-indegree vertices in dependency order.",
      "explanation": "Process an available vertex, decrement its neighbors' indegrees, and add newly available vertices to the queue."
    },
    "edge-relaxation": {
      "title": "Edge relaxation",
      "description": "Improve a distance by checking a path through a neighbor.",
      "explanation": "Compare the current distance with a candidate distance formed by extending a known path along one edge."
    },
    "dijkstra-traversal": {
      "title": "Dijkstra traversal",
      "description": "Visit the closest tentative vertex and relax its edges.",
      "explanation": "Follow the priority queue and distance updates while Dijkstra settles vertices with nonnegative edge weights."
    },
    "fibonacci-recursion-tree": {
      "title": "Fibonacci recursion tree",
      "description": "Reveal the repeated work in recursive Fibonacci.",
      "explanation": "Expand the call tree and compare repeated subproblems to understand why the direct recursive approach grows so quickly."
    },
    "binary-search-comparison": {
      "title": "Linear and binary search",
      "description": "Compare scanning with repeatedly halving a sorted range.",
      "explanation": "Use the existing inputs to compare how linear and binary search inspect values when looking for the same target."
    },
    "monotone-condition-pattern": {
      "title": "Monotone conditions",
      "description": "Identify the boundary where a predicate changes truth value.",
      "explanation": "Inspect a monotone condition and the split between its true and false regions before applying binary search."
    },
    "first-occurrence-trace": {
      "title": "First occurrence",
      "description": "Find the first position that reaches a target value.",
      "explanation": "Follow a false-to-true boundary search to locate the first occurrence even when the sorted sequence contains duplicates."
    },
    "closest-value-trace": {
      "title": "Closest value",
      "description": "Track a search for a nearby value in sorted data.",
      "explanation": "Observe how the interval narrows around the target and how the boundary identifies the relevant neighboring candidate."
    },
    "numeric-binary-search-trace": {
      "title": "Numeric binary search",
      "description": "Narrow a numeric answer range with a condition.",
      "explanation": "Follow the midpoint tests and interval updates to see how a monotone numeric condition guides the search toward a boundary."
    },
    "first-true-boundary-trace": {
      "title": "First true boundary",
      "description": "Locate the first true position after a false prefix.",
      "explanation": "Step through a false-to-true number line, retaining the half that contains the first position satisfying the condition."
    },
    "last-true-boundary-trace": {
      "title": "Last true boundary",
      "description": "Locate the final true position before a false suffix.",
      "explanation": "Step through a true-to-false number line, retaining the half that contains the last position satisfying the condition."
    },
    "largest-first-selection": {
      "title": "Largest-first selection",
      "description": "Build a sum by taking larger values first.",
      "explanation": "Inspect the descending order and growing selected total to understand how a largest-first greedy choice reaches a threshold."
    },
    "subsequence-scanner": {
      "title": "Subsequence scanning",
      "description": "Match a target in order while scanning a sequence.",
      "explanation": "Advance through the source and move the target pointer only on a match, preserving the order required by a subsequence."
    },
    "sign-block-selection": {
      "title": "Sign-block selection",
      "description": "Choose the largest value from each consecutive sign block.",
      "explanation": "Follow consecutive positive and negative blocks and retain their best representative to build an alternating selection."
    },
    "bipartite-dfs": {
      "title": "Bipartite coloring with DFS",
      "description": "Assign two colors while exploring a graph.",
      "explanation": "Follow DFS as adjacent vertices receive opposite colors and inspect the conflict that prevents a two-coloring."
    }
  }
} as const;
