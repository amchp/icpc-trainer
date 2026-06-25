import type { ContestFinderRefreshEvent } from "@icpc-trainer/api";
import { describe, expect, it } from "vitest";

import {
  applyContestFinderRefreshEventToState,
  emptyContestFinderRefreshState
} from "../src/contestFinderRefreshState.js";

describe("Contest Finder refresh state reducer", () => {
  it("applies progress, warning, and completion events", () => {
    const started = applyContestFinderRefreshEventToState(emptyContestFinderRefreshState("codeforces"), {
      type: "started",
      provider: "codeforces",
      stepsTotal: 4,
      stepsLeft: 4
    });
    const warning: ContestFinderRefreshEvent = {
      type: "warning",
      provider: "codeforces",
      userHandle: "tourist",
      message: "rate limited",
      stepsTotal: 4,
      stepsLeft: 2
    };
    const warned = applyContestFinderRefreshEventToState(
      applyContestFinderRefreshEventToState(started, warning),
      warning
    );
    const completed = applyContestFinderRefreshEventToState(warned, {
      type: "completed",
      provider: "codeforces",
      stepsTotal: 4,
      stepsLeft: 0,
      summary: {
        contestsUpserted: 3,
        friendsProcessed: 2,
        warnings: [{ judge: "codeforces", message: "rate limited" }]
      }
    });

    expect(started).toMatchObject({ status: "running", current: "Preparing refresh" });
    expect(warned.warnings).toEqual(["tourist: rate limited"]);
    expect(completed).toMatchObject({
      status: "completed",
      progress: 100,
      contestsUpserted: 3,
      friendsProcessed: 2,
      warnings: ["rate limited"]
    });
  });
});
