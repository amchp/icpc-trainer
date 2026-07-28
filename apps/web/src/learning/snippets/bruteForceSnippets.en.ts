import type { BruteForceSnippets } from "./bruteForceSnippets.types.js";

export const bruteForceSnippetsEn: BruteForceSnippets = {
  recursivePermutation: `vector<char> current;
vector<bool> used(items.size(), false);

void generate() {
  if (current.size() == items.size()) {
    visit(current);
    return;
  }
  for (int i = 0; i < items.size(); ++i) {
    if (used[i]) continue;
    used[i] = true;
    current.push_back(items[i]);
    generate();
    current.pop_back();
    used[i] = false;
  }
}`,
  iterativePermutation: `sort(order.begin(), order.end());
do {
  visit(order);
} while (next_permutation(order.begin(), order.end()));`,
  recursiveSubset: `vector<int> decisions;

void generate(int index) {
  if (index == n) {
    visit(decisions);
    return;
  }
  decisions.push_back(0);
  generate(index + 1);
  decisions.pop_back();
  decisions.push_back(1);
  generate(index + 1);
  decisions.pop_back();
}`,
  bitmaskSubset: `for (int mask = 0; mask < (1 << n); ++mask) {
  vector<int> decisions;
  for (int bit = n - 1; bit >= 0; --bit) {
    decisions.push_back((mask & (1 << bit)) != 0);
  }
  visit(decisions);
}`,
  names: {
    current: "current",
    used: "used",
    order: "order",
    index: "index",
    decisions: "decisions",
    mask: "mask",
    permutationFunction: "generate",
    subsetFunction: "generate",
    visitFunction: "visit"
  }
};
