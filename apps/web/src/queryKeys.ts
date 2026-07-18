import type { QueryClient, QueryKey } from "@tanstack/react-query";

export const queryKeys = {
  accountLocale: (userId: string | null | undefined) => ["account", "locale", userId ?? "anonymous"] as const,
  accountDataStatus: ["account", "dataStatus"] as const,
  contestFinderOverview: ["contestFinder", "overview"] as const,
  findProblemsOverview: ["findProblems", "overview"] as const,
  friendsRoster: ["friends", "roster"] as const,
  healthPing: ["health", "ping"] as const,
  learningProgress: (userId: string | null | undefined) => ["learningProgress", userId ?? "anonymous", "list"] as const,
  learningProgressStart: (userId: string | null | undefined) => ["learningProgress", userId ?? "anonymous", "start"] as const,
  learningProgressSetStatus: (userId: string | null | undefined) => ["learningProgress", userId ?? "anonymous", "setStatus"] as const,
  teamRoster: ["team", "roster"] as const,
  upsolvingOverview: ["upsolving", "overview"] as const
};

const authenticatedQueryRoots = new Set([
  "account",
  "contestFinder",
  "findProblems",
  "friends",
  "learningProgress",
  "team",
  "upsolving"
]);

export const clearAuthenticatedQueryCache = (queryClient: QueryClient): void => {
  queryClient.removeQueries({
    predicate: (query) => authenticatedQueryRoots.has(String(query.queryKey[0]))
  });
};

const invalidate = (queryClient: QueryClient, queryKeysToInvalidate: readonly QueryKey[]): void => {
  for (const queryKey of queryKeysToInvalidate) {
    void queryClient.invalidateQueries({ queryKey });
  }
};

export const invalidateAfterJudgeSync = (queryClient: QueryClient): void => {
  invalidate(queryClient, [
    queryKeys.accountDataStatus,
    queryKeys.contestFinderOverview,
    queryKeys.findProblemsOverview,
    queryKeys.teamRoster,
    queryKeys.upsolvingOverview
  ]);
};

export const invalidateAfterFriendSubmissionSync = (queryClient: QueryClient): void => {
  invalidate(queryClient, [
    queryKeys.contestFinderOverview,
    queryKeys.findProblemsOverview,
    queryKeys.upsolvingOverview
  ]);
};

export const invalidateAfterTeamRosterChange = (queryClient: QueryClient): void => {
  invalidate(queryClient, [
    queryKeys.contestFinderOverview,
    queryKeys.findProblemsOverview,
    queryKeys.upsolvingOverview
  ]);
};

export const invalidateAfterFriendRosterChange = (queryClient: QueryClient): void => {
  invalidate(queryClient, [
    queryKeys.contestFinderOverview,
    queryKeys.findProblemsOverview
  ]);
};
