export const appPaths = {
  account: "/account",
  connectJudges: "/connect-judges",
  connectCodeforces: "/connect-judges/codeforces",
  connectQoj: "/connect-judges/qoj",
  contestFinder: "/contest-finder",
  contests: "/contests",
  findProblems: "/find-problems",
  judges: "/judges",
  playground: "/playground",
  root: "/",
  team: "/team",
  upsolving: "/upsolving"
} as const;

export const protectedNavItems = [
  { to: appPaths.findProblems, label: "Find Problems" },
  { to: appPaths.upsolving, label: "Upsolving" },
  { to: appPaths.contests, label: "Contests" },
  { to: appPaths.contestFinder, label: "Contest Finder" },
  { to: appPaths.team, label: "Team" }
] as const;
