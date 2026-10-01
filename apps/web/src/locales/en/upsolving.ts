export const upsolving = {
  title: "Upsolving",
  subtitle: "Track unsolved problems in contests you have already simulated",
  loadError: "Unable to load upsolving.",
  searchLabel: "Search problems",
  searchPlaceholder: "Search problems, contests, judges",
  allStatuses: "All statuses",
  unsolvedStatuses: "Unsolved",
  noStatuses: "No statuses",
  status: { new: "New", attempted: "Attempted", solved: "Solved", reviewLater: "Review later", inProgress: "In Progress" },
  actionsFor: "Status actions for {{problem}}",
  actions: {
    reviewLater: "Review {{problem}} later",
    inProgress: "Mark {{problem}} as In Progress",
    standard: "Revert {{problem}} to standard status"
  },
  saveStatusError: "Unable to save problem status.",
  filterByStatus: "Filter by status",
  statusOptions: "Status filter options",
  columns: { problem: "Problem", judge: "Judge", status: "Status", rating: "Rating", solve: "Solve %", friends: "Friends", actions: "Actions" },
  empty: "No simulated contests yet. Select Sync to update your data.",
  noMatch: "No problems match the current filters.",
  noSyncedTitle: "No synced data yet.",
  noSyncedDescription: "Select Sync to update data for your connected judges."
} as const;
