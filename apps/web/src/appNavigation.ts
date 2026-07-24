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
  introduction: "/resources/introduction",
  programmingFundamentals: "/resources/programming-fundamentals",
  root: "/",
  team: "/team",
  upsolving: "/upsolving"
} as const;

import type { TFunction } from "i18next";

export const protectedNavItems = (t: TFunction<"shell">) => [
  { to: appPaths.findProblems, label: t("nav.findProblems"), activePaths: [appPaths.findProblems] },
  { to: appPaths.upsolving, label: t("nav.upsolving"), activePaths: [appPaths.upsolving] },
  { to: appPaths.contestFinder, label: t("nav.contestFinder"), activePaths: [appPaths.contestFinder] },
  { to: appPaths.resources, label: t("nav.resources"), activePaths: [appPaths.resources, appPaths.introduction, appPaths.programmingFundamentals] },
  { to: appPaths.team, label: t("nav.team"), activePaths: [appPaths.team] }
] as const;
