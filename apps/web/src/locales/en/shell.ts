export const shell = {
  nav: {
    findProblems: "Find Problems",
    upsolving: "Upsolving",
    contests: "Contests",
    contestFinder: "Contest Finder",
    resources: "Resources",
    team: "Team",
    friends: "Friends",
    judges: "Judges",
    leaderboard: "Leaderboard"
  },
  sections: {
    contestsLabel: "Contest tools",
    peopleLabel: "People",
    contestFinder: "Contest Finder",
    contests: "Contests",
    team: "Team",
    friends: "Friends"
  },
  sync: "Sync",
  openNavigation: "Open navigation",
  closeNavigation: "Close navigation",
  preparingSession: "Preparing your session...",
  loadingAccount: "Loading your account...",
  judgeNotConnectedTitle: "{{judge}} authentication is not connected",
  judgeNotConnectedDescription: "{{judge}} has simulated contests locally. Reconnect it from Judges to sync new data.",
  syncProgress: {
    regularCatalog: "Regular catalog sync",
    contests: "Contest sync",
    submissions: "User submission sync",
    step_one: "step",
    step_other: "steps",
    contest_one: "contest",
    contest_other: "contests",
    user_one: "user",
    user_other: "users",
    sync_one: "sync",
    sync_other: "syncs",
    left: "{{count}} {{unit}} left",
    error: "Could not sync {{judge}}",
    complete: "{{judge}} sync complete",
    completion: {
      contest_one: "{{value}} new/updated contest",
      contest_other: "{{value}} new/updated contests",
      problem_one: "{{value}} imported problem",
      problem_other: "{{value}} imported problems",
      inserted_one: "{{value}} new submission",
      inserted_other: "{{value}} new submissions",
      updated_one: "{{value}} updated submission",
      updated_other: "{{value}} updated submissions",
      contests: "Contests: {{value}}",
      problems: "Problems: {{value}}",
      submissions: "Submissions: {{inserted}}, {{updated}}",
      description: "{{contests}}. {{problems}}. {{submissions}}."
    }
  }
} as const;
