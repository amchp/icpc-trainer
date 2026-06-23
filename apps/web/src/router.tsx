import { createRootRoute, createRoute, createRouter, Outlet, redirect } from "@tanstack/react-router";

import { AccountRoute } from "./AccountRoute.js";
import { CodeforcesConnectJudgeRoute } from "./CodeforcesConnectJudgeRoute.js";
import { ConnectJudgesRoute } from "./ConnectJudgesRoute.js";
import { ContestFinderRoute } from "./ContestFinderRoute.js";
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

const requireSyncedContests = async (): Promise<void> => {
  const dataStatus = await trpc.account.dataStatus.query();
  if (!dataStatus.hasSyncedContests) {
    throw redirect({ to: "/connect-judges" });
  }
};

const appRoute = createRoute({
  getParentRoute: () => rootRoute,
  id: "app",
  component: ProtectedLayout
});

const indexRoute = createRoute({
  getParentRoute: () => appRoute,
  path: "/",
  component: HomeRoute,
  beforeLoad: requireSyncedContests
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
  getParentRoute: () => appRoute,
  path: "/upsolving",
  component: UpsolvingRoute,
  beforeLoad: requireSyncedContests
});

const contestsRoute = createRoute({
  getParentRoute: () => appRoute,
  path: "/contests",
  component: ContestsRoute,
  beforeLoad: requireSyncedContests
});

const contestFinderRoute = createRoute({
  getParentRoute: () => appRoute,
  path: "/contest-finder",
  component: ContestFinderRoute,
  beforeLoad: requireConnectedJudge
});

const teamRoute = createRoute({
  getParentRoute: () => appRoute,
  path: "/team",
  component: TeamRoute
});

const judgesRoute = createRoute({
  getParentRoute: () => appRoute,
  path: "/judges",
  component: AccountRoute
});

const accountRoute = createRoute({
  getParentRoute: () => appRoute,
  path: "/account",
  beforeLoad: () => {
    throw redirect({ to: "/judges" });
  }
});

const routeTree = rootRoute.addChildren([
  appRoute.addChildren([
    indexRoute,
    accountRoute,
    judgesRoute,
    contestFinderRoute,
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
