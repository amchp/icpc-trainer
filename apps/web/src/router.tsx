import { createRootRoute, createRoute, createRouter, Outlet, redirect } from "@tanstack/react-router";

import { AccountRoute } from "./AccountRoute.js";
import { appPaths } from "./appNavigation.js";
import { ConnectJudgeProviderRoute } from "./ConnectJudgeProviderRoute.js";
import { ConnectJudgesRoute } from "./ConnectJudgesRoute.js";
import { ContestFinderRoute } from "./ContestFinderRoute.js";
import { ContestsRoute } from "./ContestsRoute.js";
import { FindProblemsRoute } from "./FindProblemsRoute.js";
import { FriendsRoute } from "./FriendsRoute.js";
import { PlaygroundRoute } from "./PlaygroundRoute.js";
import { ProtectedLayout } from "./ProtectedLayout.js";
import { QojConnectJudgeTutorialPage } from "./QojConnectJudgeTutorialPage.js";
import { ResourcesRoute } from "./ResourcesRoute.js";
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

const indexRoute = createRoute({
  getParentRoute: () => appRoute,
  path: appPaths.root,
  beforeLoad: () => {
    throw redirect({ to: appPaths.findProblems });
  }
});

const connectJudgesRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: appPaths.connectJudges,
  component: ConnectJudgesRoute
});

const connectJudgeProviderRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: "/connect-judges/$provider",
  component: ConnectJudgeProviderRoute
});

const qojConnectJudgeTutorialRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: appPaths.connectQojTutorial,
  component: QojConnectJudgeTutorialPage
});

const playgroundRoute = createRoute({
  getParentRoute: () => rootRoute,
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
  getParentRoute: () => appRoute,
  path: appPaths.resources,
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
    resourcesRoute,
    teamRoute,
    upsolvingRoute
  ]),
  playgroundRoute,
  connectJudgesRoute,
  qojConnectJudgeTutorialRoute,
  connectJudgeProviderRoute
]);

export const router = createRouter({ routeTree });

declare module "@tanstack/react-router" {
  interface Register {
    router: typeof router;
  }
}
