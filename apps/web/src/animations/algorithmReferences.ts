/** Reference implementations of the existing tools, not additional executable players. */
export const algorithmReferences = {
  coinChange: `vector<int> coins = {50, 25, 10, 5, 1};
vector<int> picked;
int remaining = 68;
for (int coin : coins) {
  while (remaining >= coin) {
    picked.push_back(coin);
    remaining -= coin;
  }
}`,
  activitySelection: `sort(activities.begin(), activities.end(),
  [](auto a, auto b) {
    return a.finish < b.finish;
  });
int lastFinish = INT_MIN;
vector<Activity> selected;
for (auto activity : activities) {
  if (activity.start >= lastFinish) {
    selected.push_back(activity);
    lastFinish = activity.finish;
  }
}`,
  largestFirst: `sort(values.rbegin(), values.rend());
long long total = accumulate(
  values.begin(), values.end(), 0LL);
long long taken = 0;
int count = 0;
for (int value : values) {
  taken += value;
  ++count;
  if (taken > total - taken) break;
}
cout << count;`,
  subsequence: `string target = "hello";
int next = 0;
for (char letter : text) {
  if (next < target.size()
      && letter == target[next]) {
    ++next;
  }
}
bool found = next == target.size();`,
  signBlocks: `long long sum = 0;
int best = values[0];
for (int i = 1; i < values.size(); ++i) {
  if ((values[i] > 0) == (best > 0)) {
    best = max(best, values[i]);
  } else {
    sum += best;
    best = values[i];
  }
}
sum += best;
cout << sum;`,
  fibonacci: `int fibonacci(int n) {
  if (n <= 1) return n;
  return fibonacci(n - 1)
       + fibonacci(n - 2);
}`,
  bounds: `auto lower = lower_bound(
  values.begin(), values.end(), target);
auto upper = upper_bound(
  values.begin(), values.end(), target);
int firstAtLeast = lower - values.begin();
int firstGreater = upper - values.begin();`,
} as const;
