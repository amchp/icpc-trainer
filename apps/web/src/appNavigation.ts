export const appPaths = {
  account: "/account",
  connectJudges: "/connect-judges",
  connectCodeforces: "/connect-judges/codeforces",
  connectQoj: "/connect-judges/qoj",
  connectQojTutorial: "/connect-judges/qoj/tutorial",
  contestFinder: "/contest-finder",
  contests: "/contests",
  findProblems: "/find-problems",
  friends: "/friends",
  judges: "/judges",
  playground: "/playground",
  resources: "/resources",
  root: "/",
  team: "/team",
  upsolving: "/upsolving"
} as const;

export const protectedNavItems = [
  { to: appPaths.findProblems, label: "Find Problems" },
  { to: appPaths.upsolving, label: "Upsolving" },
  { to: appPaths.contests, label: "Contests" },
  { to: appPaths.contestFinder, label: "Contest Finder" },
  { to: appPaths.resources, label: "Resources" },
  { to: appPaths.team, label: "Team" },
  { to: appPaths.friends, label: "Friends" }
] as const;
