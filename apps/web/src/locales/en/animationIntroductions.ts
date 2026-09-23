export const animationIntroductions = {
  "conditionals": {
    "title": "Choose which instructions run",
    "statement": "A condition chooses one branch. Trace the decision and notice that the other branch is skipped.",
    "input": "A value x and the condition x > 0.",
    "output": "For x = 3, the true branch runs; the false branch does not."
  },
  "loops": {
    "title": "Repeat work with a stopping rule",
    "statement": "Explore how a loop repeats a body, how its state changes, and when it stops. These are control-flow demonstrations, not a single puzzle.",
    "input": "Three iterations, with an index starting at 0.",
    "output": "The body runs at indices 0, 1, and 2; index 3 ends the loop."
  },
  "vector-traversal": {
    "title": "Visit every element",
    "statement": "Given a sequence, visit each element once in index order. Keep the position separate from the value stored there.",
    "input": "The vector [8, 3, 5].",
    "output": "Visit 8, then 3, then 5, at positions 0, 1, and 2."
  },
  "function-calls": {
    "title": "Follow a call and its return",
    "statement": "A function receives arguments, computes locally, and returns control to its caller. The goal here is to understand that handoff.",
    "input": "Call doubleValue(3).",
    "output": "The function receives 3 and returns 6 to the caller."
  },
  "recursion": {
    "title": "Understand suspended calls",
    "statement": "A recursive call works on a smaller instance until a base case stops further calls. Compare the countdown, factorial, and Fibonacci traces below.",
    "input": "For example, factorial(3) depends on factorial(2).",
    "output": "Resolve the base case and return through the waiting calls: 3! = 6."
  },
  "fibonacci-recursion-tree": {
    "title": "Count repeated work",
    "statement": "This is an analysis exercise: explain why the direct Fibonacci recurrence repeats the same subproblems. The tree below expands F(6).",
    "input": "F(n) = F(n − 1) + F(n − 2), with F(0) = 0 and F(1) = 1.",
    "output": "In F(4), F(2) appears twice. Larger trees repeat many more calls."
  },
  "vectors": {
    "title": "Explore an indexed sequence",
    "statement": "A vector stores an ordered sequence. Explore how reading, appending, and removing values change it; then locate lower and upper bounds in sorted data.",
    "input": "Start with [8, 3, 5] and append 9.",
    "output": "The sequence becomes [8, 3, 5, 9]; the new value has index 3."
  },
  "stacks": {
    "title": "Explore last in, first out",
    "statement": "A stack exposes its top. This is an operations sandbox: observe what push, top, and pop do to the same state.",
    "input": "Push 2, then 7, then 4.",
    "output": "The next value returned by top is 4, the most recently added value."
  },
  "queues": {
    "title": "Explore the ends of a sequence",
    "statement": "A queue serves the oldest value first. A deque also permits insertion and removal at either end. Compare the two simulators.",
    "input": "Enqueue 12, then 24, then 36.",
    "output": "The queue's front is 12. Removing it makes 24 the new front."
  },
  "sets": {
    "title": "Explore unique values",
    "statement": "An ordered set stores each value at most once. Explore insertion, deletion, membership, and ordered boundaries.",
    "input": "Insert 3, 1, and 3.",
    "output": "Only 1 and 3 remain; inserting 3 again does not add another copy."
  },
  "maps": {
    "title": "Explore values addressed by keys",
    "statement": "A map connects each key to one value. Explore lookup, insertion, and updates without confusing a key with its position.",
    "input": "Store key 1 → 10 and key 3 → 30, then update key 1 to 15.",
    "output": "Key 1 now maps to 15; key 3 still maps to 30."
  },
  "structs": {
    "title": "Explore state and methods",
    "statement": "A struct groups data and behavior. The Counter simulator demonstrates how a method updates one object's field.",
    "input": "A counter has value 5. Call add(3).",
    "output": "The same object's value becomes 8; get() reads it without changing it."
  },
  "permutations": {
    "title": "Generate every ordering",
    "statement": "Given distinct items, list every possible ordering. Each ordering must use every item exactly once, with no duplicate results.",
    "input": "Three items: A, B, C.",
    "output": "There are 3! = 6 orderings. Compare recursive and iterative generation below."
  },
  "subsets": {
    "title": "Generate every selection",
    "statement": "Given distinct items, list every subset. An item is either included or excluded; order does not create a new subset.",
    "input": "Two items: A and B.",
    "output": "The four subsets are ∅, {A}, {B}, and {A, B}. Include the empty subset."
  },
  "binary-search-comparison": {
    "title": "Find where the target belongs",
    "statement": "Given sorted values and a target, find the first position whose value is at least the target. Compare how many checks linear and binary search need.",
    "input": "[2, 4, 7, 9, 12, 18, 25], target 10.",
    "output": "Return index 4, before 12. If no value qualifies, return the sequence length."
  },
  "monotone-condition-pattern": {
    "title": "Recognize when binary search applies",
    "statement": "This is a condition explorer. Binary search needs a predicate that changes truth value at most once over the search interval.",
    "input": "Compare 0 0 0 1 1 with 0 1 0 1 0.",
    "output": "The first pattern has a single boundary. The second cannot safely discard half by this rule."
  },
  "first-occurrence-trace": {
    "title": "Locate the first qualifying position",
    "statement": "Search sorted data for the first value greater than or equal to a target. When duplicates equal the target, this is their first occurrence.",
    "input": "[1, 3, 3, 6], target 3.",
    "output": "Return index 1, the first 3. An absent target instead gives its insertion position."
  },
  "closest-value-trace": {
    "title": "Find the neighbors around a target",
    "statement": "In sorted data, locate the last value at most the target and the first value greater than it. These are the candidates for the closest value.",
    "input": "[2, 4, 7, 9], target 6.",
    "output": "The candidates are 4 and 7; 7 is closer. The trace below exposes each boundary separately."
  },
  "numeric-binary-search-trace": {
    "title": "Approximate a square root",
    "statement": "Given a nonnegative number x, find a nonnegative y whose square is x to the chosen precision. The answer need not be an integer.",
    "input": "x = 2.",
    "output": "y ≈ 1.414. Narrow an interval containing the answer until it is small enough."
  },
  "first-true-boundary-trace": {
    "title": "Find the first true position",
    "statement": "A predicate is false before a boundary and true from that boundary onward. Find the first true position using known endpoints.",
    "input": "Positions 1…6 have values 0, 0, 0, 1, 1, 1.",
    "output": "The first true position is 4. Keep the false and true endpoints on opposite sides."
  },
  "last-true-boundary-trace": {
    "title": "Find the last feasible value",
    "statement": "A predicate is true up to a boundary and false afterward. Find the greatest value that still satisfies the condition.",
    "input": "Positions 1…6 have values 1, 1, 1, 1, 0, 0.",
    "output": "The last true position is 4. The next value is already infeasible."
  },
  "coin-change": {
    "title": "Make an amount with as few coins as possible",
    "statement": "Given coin denominations and an amount, choose coins whose total is exactly that amount. Minimize the number of coins. A largest-first rule needs justification: it does not work for every denomination set.",
    "input": "Amount 68; coins 1, 5, 10, 25, and 50; unlimited copies.",
    "output": "50 + 10 + 5 + 1 + 1 + 1 uses 6 coins. Then use the counterexample to test the rule on a different coin system."
  },
  "activity-selection": {
    "title": "Attend as many compatible activities as possible",
    "statement": "Each activity occupies a time interval. Select the largest number that do not overlap; one may start exactly when the previous one finishes.",
    "input": "A: [1, 4), B: [3, 5), C: [5, 7).",
    "output": "A and C are compatible. You can attend 2 activities; A and B overlap."
  },
  "largest-first-selection": {
    "title": "Keep more value using fewer items",
    "statement": "Given positive values, select as few items as possible so that their sum is strictly greater than the sum of the remaining items.",
    "input": "Values [2, 1, 2], total 5.",
    "output": "Choose 2 and 2. Their sum 4 exceeds the remaining 1; no single item is enough."
  },
  "subsequence-scanner": {
    "title": "Find a word without reordering letters",
    "statement": "Decide whether a target appears as a subsequence of a string. You may skip characters, but must preserve their original order.",
    "input": "Text ahhellllloou; target hello.",
    "output": "The answer is yes: select h, e, l, l, o from left to right."
  },
  "sign-block-selection": {
    "title": "Alternate signs, then maximize the sum",
    "statement": "Given nonzero values, choose a longest subsequence with alternating signs. Among equally long choices, maximize its sum.",
    "input": "[1, 2, 3, −1, −2].",
    "output": "The longest length is 2. Choosing 3 and −1 gives the largest sum, 2."
  },
  "dfs": {
    "title": "Find everything reachable from a start",
    "statement": "Given connections and a starting vertex, visit every reachable vertex without revisiting it. On a grid, adjacent open cells define the connections.",
    "input": "Start at A in the illustrated graph.",
    "output": "A, B, C, and D are reachable. A traversal order may vary with the order of neighbors."
  },
  "bfs": {
    "title": "Find distances when each move costs one",
    "statement": "Given an unweighted graph and a starting vertex, find the fewest edges needed to reach each vertex. On a grid, each permitted move is one edge.",
    "input": "Start at A; every illustrated edge costs one move.",
    "output": "A has distance 0, B and C have distance 1, and D has distance 2."
  },
  "bipartite-dfs": {
    "title": "Split vertices into two compatible groups",
    "statement": "Assign one of two colors to every vertex so that the endpoints of every edge have different colors. Determine whether this is possible for the whole graph.",
    "input": "The illustrated four-vertex cycle.",
    "output": "One valid split is {A, D} and {B, C}. An odd cycle would make such a split impossible."
  },
  "topological-sort": {
    "title": "Order tasks after their prerequisites",
    "statement": "Each directed edge u → v says that u must come before v. Produce an ordering that respects every edge, or detect a cycle.",
    "input": "A precedes B and C; both B and C precede D.",
    "output": "A, B, C, D is valid. A, C, B, D is also valid; the answer need not be unique."
  },
  "dijkstra": {
    "title": "Find the cheapest routes",
    "statement": "Given nonnegative edge weights and a source, find the minimum total cost to each vertex. Count costs, not just the number of edges.",
    "input": "From A: A–B costs 4, A–C costs 1, B–D costs 2, C–D costs 5.",
    "output": "The distances are A: 0, B: 4, C: 1, D: 6. Two routes to D tie at cost 6."
  }
} as const;
