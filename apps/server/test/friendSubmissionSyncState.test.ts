import type { FriendSubmissionSyncEvent } from "@icpc-trainer/api";
import { LOCALIZED_MESSAGE_CODES } from "@icpc-trainer/shared";
import { describe, expect, it } from "vitest";

import {
  applyFriendSubmissionSyncEventToState,
  emptyFriendSubmissionSyncState
} from "../src/friendSubmissionSyncState.js";

describe("friend submission sync state reducer", () => {
  it("applies progress, warning, and completion events", () => {
    const started = applyFriendSubmissionSyncEventToState(emptyFriendSubmissionSyncState("codeforces"), {
      type: "started",
      provider: "codeforces",
      stepsTotal: 4,
      stepsLeft: 4
    });
    const warning: FriendSubmissionSyncEvent = {
      type: "warning",
      provider: "codeforces",
      userHandle: "tourist",
      message: {
        code: LOCALIZED_MESSAGE_CODES.FriendSyncWarning,
        technicalDetail: "rate limited"
      },
      stepsTotal: 4,
      stepsLeft: 2
    };
    const warned = applyFriendSubmissionSyncEventToState(
      applyFriendSubmissionSyncEventToState(started, warning),
      warning
    );
    const completed = applyFriendSubmissionSyncEventToState(warned, {
      type: "completed",
      provider: "codeforces",
      stepsTotal: 4,
      stepsLeft: 0,
      summary: {
        friendsProcessed: 2,
        warnings: [{
          judge: "codeforces",
          message: {
            code: LOCALIZED_MESSAGE_CODES.FriendSyncWarning,
            technicalDetail: "rate limited"
          }
        }]
      }
    });

    expect(started).toMatchObject({
      status: "running",
      current: { code: LOCALIZED_MESSAGE_CODES.FriendSyncPreparing }
    });
    expect(warned.warnings).toEqual([{
      code: LOCALIZED_MESSAGE_CODES.FriendSyncWarning,
      params: { handle: "tourist" },
      technicalDetail: "rate limited"
    }]);
    expect(completed).toMatchObject({
      status: "completed",
      progress: 100,
      friendsProcessed: 2,
      warnings: [{
        code: LOCALIZED_MESSAGE_CODES.FriendSyncWarning,
        technicalDetail: "rate limited"
      }]
    });
  });
});
