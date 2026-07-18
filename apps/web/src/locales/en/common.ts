export const common = {
  appName: "ICPC Trainer",
  loading: "Loading...",
  retry: "Try again",
  cancel: "Cancel",
  save: "Save",
  remove: "Remove",
  close: "Close",
  yes: "Yes",
  no: "No",
  error: {
    genericTitle: "Something went wrong",
    genericDescription: "Try again. If the problem continues, check the server logs for details.",
    unauthorized: "Sign in again to continue.",
    forbidden: "You do not have permission to do that.",
    notFound: "The requested item could not be found.",
    conflict: "That change conflicts with newer data. Refresh and try again.",
    rateLimited: "Too many requests. Wait a moment and try again.",
    unavailable: "The service is temporarily unavailable. Try again shortly.",
    syncOperationFailed: "Could not sync {{judge}} data.",
    syncNotImplemented: "Synchronization is not available for {{judge}} yet.",
    friendSyncPreparing: "Preparing friend submission sync",
    friendSyncNoFriends: "No friends to sync",
    friendSyncing: "Syncing friend submissions",
    friendSyncingHandle: "Syncing {{handle}} ({{current}}/{{total}})",
    friendSyncedHandle: "{{handle}} synced",
    friendSyncStatusUnavailable: "Sync status unavailable",
    friendSyncWarning: "Could not sync submissions{{target}}."
  },
  table: {
    position: "Table position",
    positionNumber: "Table position {{number}}",
    ascending: "sorted ascending",
    descending: "sorted descending",
    unsorted: "not sorted"
  },
  judgeFilter: {
    codeforcesContest: "Codeforces Contest",
    codeforcesGym: "Codeforces Gym",
    qoj: "QOJ",
    all: "All judges",
    none: "No judges",
    one: "Judge",
    selected: "{{count}} judges",
    filter: "Filter by judge",
    options: "Judge filter options",
    item_one: "item",
    item_other: "items"
  },
  locale: {
    switchToEnglish: "Switch language to English",
    switchToSpanish: "Switch language to Spanish",
    english: "English",
    spanish: "Español",
    syncing: "Saving language preference...",
    menuLabel: "Choose language",
    current: "Current language: {{language}}"
  }
} as const;
