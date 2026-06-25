import type { QueryClient, QueryKey } from "@tanstack/react-query";

export const queryKeys = {
  accountDataStatus: ["account", "dataStatus"] as const,
  contestFinderOverview: ["contestFinder", "overview"] as const,
  findProblemsOverview: ["findProblems", "overview"] as const,
  friendsRoster: ["friends", "roster"] as const,
  healthPing: ["health", "ping"] as const,
  teamRoster: ["team", "roster"] as const,
  upsolvingOverview: ["upsolving", "overview"] as const
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

export const invalidateAfterContestFinderRefresh = (queryClient: QueryClient): void => {
  invalidate(queryClient, [queryKeys.contestFinderOverview]);
};

export const invalidateAfterTeamRosterChange = (queryClient: QueryClient): void => {
  invalidate(queryClient, [
    queryKeys.contestFinderOverview,
    queryKeys.findProblemsOverview,
    queryKeys.upsolvingOverview
  ]);
};

export const invalidateAfterFriendRosterChange = (queryClient: QueryClient): void => {
  invalidate(queryClient, [queryKeys.contestFinderOverview]);
};
