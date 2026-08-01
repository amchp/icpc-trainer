import type { GraphTheorySnippets } from "./graphTheorySnippets.types.js";

export const graphTheorySnippetsEn: GraphTheorySnippets = {
  gridDfs: `vector<vector<int>> adjacency;
vector<bool> visited;

void dfs(int vertex) {
  visited[vertex] = true;
  for (int next : adjacency[vertex]) {
    if (!visited[next]) dfs(next);
  }
}`,
  gridBfs: `vector<vector<int>> adjacency;
vector<int> distance, parent;

void bfs(int source) {
  queue<int> pending;
  distance.assign(adjacency.size(), -1);
  parent.assign(adjacency.size(), -1);
  distance[source] = 0;
  pending.push(source);
  while (!pending.empty()) {
    int vertex = pending.front(); pending.pop();
    for (int next : adjacency[vertex]) {
      if (distance[next] != -1) continue;
      distance[next] = distance[vertex] + 1;
      parent[next] = vertex;
      pending.push(next);
    }
  }
}`,
  bipartiteDfs: `vector<vector<int>> adjacency;
vector<int> colour;

bool colourGraph(int vertex, int value) {
  colour[vertex] = value;
  for (int next : adjacency[vertex]) {
    if (colour[next] == 0) {
      if (!colourGraph(next, 3 - value)) return false;
    } else if (colour[next] == value) {
      return false;
    }
  }
  return true;
}`,
  kahn: `vector<int> topologicalOrder(const vector<vector<int>>& adjacency) {
  vector<int> indegree(adjacency.size(), 0);
  for (int vertex = 1; vertex < adjacency.size(); ++vertex)
    for (int next : adjacency[vertex]) ++indegree[next];
  queue<int> pending;
  for (int vertex = 1; vertex < adjacency.size(); ++vertex)
    if (indegree[vertex] == 0) pending.push(vertex);
  vector<int> order;
  while (!pending.empty()) {
    int vertex = pending.front();
    pending.pop();
    order.push_back(vertex);
    for (int next : adjacency[vertex]) {
      --indegree[next];
      if (indegree[next] == 0) pending.push(next);
    }
  }
  if (order.size() + 1 != adjacency.size()) return {};
  return order;
}`,
  dijkstra: `const long long INF = 1e18;
using Edge = pair<int,int>; using Entry = pair<long long,int>;
vector<long long> shortestPaths(const vector<vector<Edge>>& adjacency, int source) {
  vector<long long> distance(adjacency.size(), INF);
  priority_queue<Entry, vector<Entry>, greater<>> pending;
  distance[source] = 0; pending.push({0, source});
  while (!pending.empty()) {
    auto [poppedDistance, vertex] = pending.top(); pending.pop();
    if (poppedDistance != distance[vertex]) continue;
    for (auto [next, weight] : adjacency[vertex]) {
      long long candidate = poppedDistance + weight;
      if (candidate >= distance[next]) continue;
      distance[next] = candidate;
      pending.push({candidate, next});
    }
  }
  return distance;
}`,
  names: {
    grid: "grid",
    visited: "visited",
    distance: "distance",
    parent: "parent",
    adjacency: "adjacency",
    colour: "colour",
    indegree: "indegree",
    order: "order",
    queue: "pending",
    dfsFunction: "dfs",
    bfsFunction: "bfs",
    colourFunction: "colourGraph"
  }
};
