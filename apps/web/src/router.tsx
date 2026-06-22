import { createRootRoute, createRoute, createRouter, Outlet } from "@tanstack/react-router";

import { CodeforcesConnectJudgeRoute } from "./CodeforcesConnectJudgeRoute.js";
import { ConnectJudgesRoute } from "./ConnectJudgesRoute.js";
import { HomeRoute } from "./HomeRoute.js";
import { PlaygroundRoute } from "./PlaygroundRoute.js";
import { QojConnectJudgeRoute } from "./QojConnectJudgeRoute.js";

const rootRoute = createRootRoute({
  component: Outlet
});

const indexRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: "/",
  component: HomeRoute
});

const connectJudgesRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: "/connect-judges",
  component: ConnectJudgesRoute
});

const codeforcesConnectJudgeRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: "/connect-judges/codeforces",
  component: CodeforcesConnectJudgeRoute
});

const qojConnectJudgeRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: "/connect-judges/qoj",
  component: QojConnectJudgeRoute
});

const playgroundRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: "/playground",
  component: PlaygroundRoute
});

const routeTree = rootRoute.addChildren([
  indexRoute,
  connectJudgesRoute,
  codeforcesConnectJudgeRoute,
  qojConnectJudgeRoute,
  playgroundRoute
]);

export const router = createRouter({ routeTree });

declare module "@tanstack/react-router" {
  interface Register {
    router: typeof router;
  }
}
