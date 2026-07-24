export const upsolving = {
  title: "Upsolving",
  subtitle: "Track unsolved problems in contests you have already simulated",
  loadError: "Unable to load upsolving.",
  searchLabel: "Search problems",
  searchPlaceholder: "Search problems, contests, judges",
  allStatuses: "All statuses",
  status: { new: "New", attempted: "Attempted", solved: "Solved" },
  filterByStatus: "Filter by status",
  statusOptions: "Status filter options",
  columns: { problem: "Problem", judge: "Judge", status: "Status", rating: "Rating", solve: "Solve %", friends: "Friends" },
  empty: "No simulated contests yet. Select Sync to update your data.",
  noMatch: "No problems match the current filters.",
  noSyncedTitle: "No synced data yet.",
  noSyncedDescription: "Select Sync to update data for your connected judges."
} as const;
