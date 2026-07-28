import type { TimeComplexitySnippets } from "./timeComplexitySnippets.types.js";

export const timeComplexityEnglishSnippets: TimeComplexitySnippets = {
  countTrace: `vector<long long> user_ids = {18, 42, 7, 31, 99};
vector<long long> searches = {31, 50};

for (long long query_id : searches) {
  for (int i = 0; i < 5; ++i) {
    if (user_ids[i] == query_id) { // count this comparison
      break; // stop after the first matching user
    }
  }
}`,
  pairScan: `bool user_exists_linear(
    const vector<long long>& user_ids,
    long long query_id
) {
  for (long long user_id : user_ids) {
    if (user_id == query_id) return true;
  }
  return false;
}`,
  sortCopy: `vector<long long> build_sorted_user_index(
    const vector<long long>& user_ids
) {
  vector<long long> index = user_ids; // preserve the source order
  sort(index.begin(), index.end());
  return index;
}

bool user_exists_sorted(
    const vector<long long>& index,
    long long query_id
) {
  return binary_search(index.begin(), index.end(), query_id);
}`,
  hashSet: `unordered_set<long long> build_user_index(
    const vector<long long>& user_ids
) {
  unordered_set<long long> index;
  index.reserve(user_ids.size());
  index.insert(user_ids.begin(), user_ids.end());
  return index;
}

bool user_exists_hash(
    const unordered_set<long long>& index,
    long long query_id
) {
  return index.contains(query_id);
}`,
  answerExamples: {
    memoryInput: `vector<long long> source_users(n);
// n elements × 8 bytes = 8n bytes`,
    memoryCopy: `vector<long long> sorted_index = source_users;
// another n elements × 8 bytes = 8n auxiliary bytes`,
    memoryHash: `unordered_set<long long> user_index(
    source_users.begin(),
    source_users.end()
);
// n entries plus buckets and node overhead`
  },
  loopTricks: {
    linear: `long long checksum = 0;
for (int i = 0; i < n; ++i) {
  checksum += i;
}`,
    independentNested: `for (int i = 0; i < n; ++i) {
  for (int j = 0; j < n; ++j) {
    inspect(i, j);
  }
}`,
    sequential: `for (int i = 0; i < n; ++i) {
  load_user(i);
}

for (int j = 0; j < n; ++j) {
  validate_user(j);
}`,
    triangular: `for (int i = 0; i < n; ++i) {
  for (int j = 0; j <= i; ++j) {
    inspect(i, j);
  }
}`,
    doubling: `for (int i = 1; i < n; i *= 2) {
  inspect(i);
}`,
    linearLogarithmic: `for (int i = 0; i < n; ++i) {
  for (int j = 1; j < n; j *= 2) {
    inspect(i, j);
  }
}`
  },
  recursionTricks: {
    countdown: `void countdown(int n) {
  if (n == 0) return;
  countdown(n - 1);
}`,
    halving: `void halve(int n) {
  if (n <= 1) return;
  halve(n / 2);
}`,
    branching: `long long fibonacci(int n) {
  if (n <= 1) return n;
  return fibonacci(n - 1) + fibonacci(n - 2);
}`
  }
};
