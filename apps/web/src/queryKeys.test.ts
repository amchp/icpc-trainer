import { QueryClient } from "@tanstack/react-query";
import { describe, expect, it } from "vitest";

import { clearAuthenticatedQueryCache, queryKeys } from "./queryKeys.js";

describe("authenticated query cache lifecycle", () => {
  it("removes every user-owned cache while retaining public health data", () => {
    const queryClient = new QueryClient();
    queryClient.setQueryData(queryKeys.teamRoster, { users: [{ username: "private-team-user" }] });
    queryClient.setQueryData(queryKeys.friendsRoster, { users: [{ username: "private-friend" }] });
    queryClient.setQueryData(queryKeys.findProblemsOverview, { rows: [{ problemJudgeId: "secret" }] });
    queryClient.setQueryData(queryKeys.upsolvingOverview, { rows: [{ problemJudgeId: "private" }] });
    queryClient.setQueryData(queryKeys.contestFinderOverview, { contests: [{ id: 1 }] });
    queryClient.setQueryData(queryKeys.learningProgress("user-a"), [{ guideId: "programming-fundamentals" }]);
    queryClient.setQueryData(queryKeys.accountLocale("user-a"), { locale: "es" });
    queryClient.setQueryData(queryKeys.healthPing, { ok: true });

    clearAuthenticatedQueryCache(queryClient);

    expect(queryClient.getQueryData(queryKeys.teamRoster)).toBeUndefined();
    expect(queryClient.getQueryData(queryKeys.friendsRoster)).toBeUndefined();
    expect(queryClient.getQueryData(queryKeys.findProblemsOverview)).toBeUndefined();
    expect(queryClient.getQueryData(queryKeys.upsolvingOverview)).toBeUndefined();
    expect(queryClient.getQueryData(queryKeys.contestFinderOverview)).toBeUndefined();
    expect(queryClient.getQueryData(queryKeys.learningProgress("user-a"))).toBeUndefined();
    expect(queryClient.getQueryData(queryKeys.accountLocale("user-a"))).toBeUndefined();
    expect(queryClient.getQueryData(queryKeys.healthPing)).toEqual({ ok: true });
  });
});
