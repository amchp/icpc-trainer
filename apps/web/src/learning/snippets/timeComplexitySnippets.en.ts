import type { TimeComplexitySnippets } from "./timeComplexitySnippets.types.js";

export const timeComplexityEnglishSnippets: TimeComplexitySnippets = {
  countTrace: `vector<long long> manifest = {18, 42, 7, 31, 99};

for (int i = 0; i + 1 < 5; ++i) {
  for (int j = i + 1; j < 5; ++j) {
    if (manifest[i] == manifest[j]) { // count this comparison
      // A duplicate would be handled here.
    }
  }
}`,
  pairScan: `bool has_duplicate(const vector<long long>& manifest) {
  for (int i = 0; i < (int)manifest.size(); ++i) {
    for (int j = i + 1; j < (int)manifest.size(); ++j) {
      if (manifest[i] == manifest[j]) return true; // early exit
    }
  }
  return false;
}`,
  sortCopy: `bool has_duplicate(const vector<long long>& manifest) {
  vector<long long> sorted_manifest = manifest; // preserve arrival order
  sort(sorted_manifest.begin(), sorted_manifest.end());
  for (int i = 1; i < (int)sorted_manifest.size(); ++i) {
    if (sorted_manifest[i] == sorted_manifest[i - 1]) return true;
  }
  return false;
}`,
  hashSet: `bool has_duplicate(const vector<long long>& manifest) {
  unordered_set<long long> seen;
  seen.reserve(manifest.size());
  for (long long tracking_id : manifest) {
    if (!seen.insert(tracking_id).second) return true;
  }
  return false;
}`
};
