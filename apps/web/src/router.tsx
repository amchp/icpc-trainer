import { createRootRoute, createRoute, createRouter, Outlet, redirect } from "@tanstack/react-router";

import { CodeforcesConnectJudgeRoute } from "./CodeforcesConnectJudgeRoute.js";
import { ConnectJudgesRoute } from "./ConnectJudgesRoute.js";
import { ContestsRoute } from "./ContestsRoute.js";
import { HomeRoute } from "./HomeRoute.js";
import { PlaygroundRoute } from "./PlaygroundRoute.js";
import { ProtectedLayout } from "./ProtectedLayout.js";
import { QojConnectJudgeRoute } from "./QojConnectJudgeRoute.js";
import { connectedJudgesFromCredentialStatus } from "./judgeConfig.js";
import { TeamRoute } from "./TeamRoute.js";
import { trpc } from "./trpc.js";
import { UpsolvingRoute } from "./UpsolvingRoute.js";

const rootRoute = createRootRoute({
  component: Outlet
});

const requireConnectedJudge = async (): Promise<void> => {
  const credentialStatus = await trpc.credentials.status.query();
  if (connectedJudgesFromCredentialStatus(credentialStatus).length === 0) {
    throw redirect({ to: "/connect-judges" });
  }
};

const protectedRoute = createRoute({
  getParentRoute: () => rootRoute,
  id: "protected",
  component: ProtectedLayout,
  beforeLoad: requireConnectedJudge
});

const indexRoute = createRoute({
  getParentRoute: () => protectedRoute,
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
  component: PlaygroundRoute,
  beforeLoad: requireConnectedJudge
});

const upsolvingRoute = createRoute({
  getParentRoute: () => protectedRoute,
  path: "/upsolving",
  component: UpsolvingRoute
});

const contestsRoute = createRoute({
  getParentRoute: () => protectedRoute,
  path: "/contests",
  component: ContestsRoute
});

const teamRoute = createRoute({
  getParentRoute: () => protectedRoute,
  path: "/team",
  component: TeamRoute
});

const routeTree = rootRoute.addChildren([
  protectedRoute.addChildren([
    indexRoute,
    contestsRoute,
    teamRoute,
    upsolvingRoute
  ]),
  playgroundRoute,
  connectJudgesRoute,
  codeforcesConnectJudgeRoute,
  qojConnectJudgeRoute
]);

export const router = createRouter({ routeTree });

declare module "@tanstack/react-router" {
  interface Register {
    router: typeof router;
  }
}
