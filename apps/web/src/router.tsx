import { createRootRoute, createRoute, createRouter, Outlet, redirect } from "@tanstack/react-router";

import { AccountRoute } from "./AccountRoute.js";
import { appPaths } from "./appNavigation.js";
import { BruteForceRoute } from "./BruteForceRoute.js";
import { ConnectJudgeProviderRoute } from "./ConnectJudgeProviderRoute.js";
import { ConnectJudgesRoute } from "./ConnectJudgesRoute.js";
import { ContestFinderRoute } from "./ContestFinderRoute.js";
import { ContestsRoute } from "./ContestsRoute.js";
import { FindProblemsRoute } from "./FindProblemsRoute.js";
import { FriendsRoute } from "./FriendsRoute.js";
import { IntroductionRoute } from "./IntroductionRoute.js";
import { PlaygroundRoute } from "./PlaygroundRoute.js";
import { ProgrammingFundamentalsRoute } from "./ProgrammingFundamentalsRoute.js";
import { ProtectedLayout } from "./ProtectedLayout.js";
import { QojConnectJudgeTutorialPage } from "./QojConnectJudgeTutorialPage.js";
import { ResourcesRoute } from "./ResourcesRoute.js";
import { ResourcesLayout } from "./ResourcesLayout.js";
import { StandaloneLayout } from "./StandaloneLayout.js";
import { TeamRoute } from "./TeamRoute.js";
import { UpsolvingRoute } from "./UpsolvingRoute.js";

const rootRoute = createRootRoute({
  component: Outlet
});

const appRoute = createRoute({
  getParentRoute: () => rootRoute,
  id: "app",
  component: ProtectedLayout
});

const resourcesAppRoute = createRoute({
  getParentRoute: () => rootRoute,
  id: "resources-app",
  component: ResourcesLayout
});

const standaloneRoute = createRoute({
  getParentRoute: () => rootRoute,
  id: "standalone",
  component: StandaloneLayout
});

const indexRoute = createRoute({
  getParentRoute: () => appRoute,
  path: appPaths.root,
  beforeLoad: () => {
    throw redirect({ to: appPaths.findProblems });
  }
});

const connectJudgesRoute = createRoute({
  getParentRoute: () => standaloneRoute,
  path: appPaths.connectJudges,
  component: ConnectJudgesRoute
});

const connectJudgeProviderRoute = createRoute({
  getParentRoute: () => standaloneRoute,
  path: "/connect-judges/$provider",
  component: ConnectJudgeProviderRoute
});

const qojConnectJudgeTutorialRoute = createRoute({
  getParentRoute: () => standaloneRoute,
  path: appPaths.connectQojTutorial,
  component: QojConnectJudgeTutorialPage
});

const playgroundRoute = createRoute({
  getParentRoute: () => standaloneRoute,
  path: appPaths.playground,
  component: PlaygroundRoute
});

const upsolvingRoute = createRoute({
  getParentRoute: () => appRoute,
  path: appPaths.upsolving,
  component: UpsolvingRoute
});

const contestsRoute = createRoute({
  getParentRoute: () => appRoute,
  path: appPaths.contests,
  component: ContestsRoute
});

const findProblemsRoute = createRoute({
  getParentRoute: () => appRoute,
  path: appPaths.findProblems,
  component: FindProblemsRoute
});

const contestFinderRoute = createRoute({
  getParentRoute: () => appRoute,
  path: appPaths.contestFinder,
  component: ContestFinderRoute
});

const friendsRoute = createRoute({
  getParentRoute: () => appRoute,
  path: appPaths.friends,
  component: FriendsRoute
});

const resourcesRoute = createRoute({
  getParentRoute: () => resourcesAppRoute,
  path: appPaths.resources,
  component: ResourcesRoute
});

const programmingFundamentalsRoute = createRoute({
  getParentRoute: () => resourcesAppRoute,
  path: appPaths.programmingFundamentals,
  component: ProgrammingFundamentalsRoute
});

const bruteForceRoute = createRoute({
  getParentRoute: () => resourcesAppRoute,
  path: appPaths.bruteForce,
  component: BruteForceRoute
});

const introductionRoute = createRoute({
  getParentRoute: () => resourcesAppRoute,
  path: appPaths.introduction,
  component: IntroductionRoute
});

const resourcesSubpathRoute = createRoute({
  getParentRoute: () => resourcesAppRoute,
  path: `${appPaths.resources}/$`,
  component: ResourcesRoute
});

const teamRoute = createRoute({
  getParentRoute: () => appRoute,
  path: appPaths.team,
  component: TeamRoute
});

const judgesRoute = createRoute({
  getParentRoute: () => appRoute,
  path: appPaths.judges,
  component: AccountRoute
});

const accountRoute = createRoute({
  getParentRoute: () => appRoute,
  path: appPaths.account,
  beforeLoad: () => {
    throw redirect({ to: appPaths.judges });
  }
});

const routeTree = rootRoute.addChildren([
  appRoute.addChildren([
    indexRoute,
    accountRoute,
    judgesRoute,
    contestFinderRoute,
    contestsRoute,
    findProblemsRoute,
    friendsRoute,
    teamRoute,
    upsolvingRoute
  ]),
  resourcesAppRoute.addChildren([
    resourcesRoute,
    bruteForceRoute,
    introductionRoute,
    programmingFundamentalsRoute,
    resourcesSubpathRoute
  ]),
  standaloneRoute.addChildren([
    playgroundRoute,
    connectJudgesRoute,
    qojConnectJudgeTutorialRoute,
    connectJudgeProviderRoute
  ])
]);

export const router = createRouter({ routeTree });

declare module "@tanstack/react-router" {
  interface Register {
    router: typeof router;
  }
}
