export const leaderboard = {
  title: "Leaderboard",
  subtitle: "Based on stored synchronized submissions.",
  populationLabel: "Population",
  judgeLabel: "Judge",
  scopes: {
    all: "All",
    team: "Team",
    friends: "Friends",
    class: "Class"
  },
  judges: {
    all: "All Judges"
  },
  dates: {
    label: "Solve dates",
    from: "From",
    through: "Through",
    clear: "Clear",
    incomplete: "Choose both dates to apply a period.",
    reversed: "The end date cannot be before the start date.",
    invalid: "Enter valid calendar dates."
  },
  columns: {
    rank: "Rank",
    user: "Judge User",
    judge: "Judge",
    solved: "Solved"
  },
  resultCount_one: "{{value}} ranked Judge User",
  resultCount_other: "{{value}} ranked Judge Users",
  updatedAt: "Updated {{value}}",
  infiniteScroll: {
    hint: "Scroll to load more",
    loading: "Loading more Judge Users",
    complete: "All ranked Judge Users are loaded.",
    error: "Could not load more Judge Users.",
    retry: "Retry loading more"
  },
  updating: "Updating",
  loadError: "Could not load the Leaderboard.",
  retry: "Retry",
  empty: {
    all: "No synchronized solves are available yet.",
    period: "No Problems were first solved in this period.",
    scope: "No ranked Judge Users are in this scope."
  },
  class: {
    manage: "Manage Class",
    title: "Manage Class",
    count_one: "{{value}} / {{limit}} member",
    count_other: "{{value}} / {{limit}} members",
    members: "Current members",
    empty: "The Class is empty.",
    find: "Find Judge Users",
    searchLabel: "Search",
    searchPlaceholder: "Search existing solved users",
    searchHint: "Enter a handle to search eligible Judge Users.",
    searching: "Searching",
    searchError: "Could not search Judge Users.",
    noCandidates: "No eligible non-members match this search.",
    loadError: "Could not load Class members.",
    limit: "The Class has reached its 100-member limit.",
    add: "Add",
    remove: "Remove",
    addAccessible: "Add {{username}} to Class",
    removeAccessible: "Remove {{username}} from Class",
    close: "Close Class management",
    added: "Judge User added to Class.",
    removed: "Judge User removed from Class.",
    updateError: "Could not update the Class.",
    solves_one: "{{value}} solve",
    solves_other: "{{value}} solves"
  }
} as const;
