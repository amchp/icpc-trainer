import { describe, expect, it } from "vitest";

import {
  JudgeAPIError,
  JudgeCredentialError,
  JudgeNotFoundError,
  JudgeUnavailableError
} from "../judges/judges.js";
import { formatJudgeError, toPlaygroundError } from "../src/playground.js";

describe("formatJudgeError", () => {
  it("formats credential errors with the provider detail", () => {
    expect(
      formatJudgeError(
        new JudgeCredentialError({
          judgeId: "104217",
          cause: "Contest is private. Access denied."
        })
      )
    ).toBe("Credential error for 104217. Contest is private. Access denied.");
  });

  it("formats common judge failures without Effect fiber wrapper text", () => {
    expect(
      formatJudgeError(new JudgeNotFoundError({ resource: "contest", judgeId: "999999" }))
    ).toBe("Contest not found on judge: 999999.");
    expect(formatJudgeError(new JudgeAPIError({ judgeId: "codeforces", cause: "Rate limit" }))).toBe(
      "Judge API rejected the request for codeforces. Rate limit"
    );
    expect(
      formatJudgeError(new JudgeUnavailableError({ judgeId: "qoj", cause: new Error("HTTP 502") }))
    ).toBe("Judge is unavailable for qoj. HTTP 502");
  });

  it("returns structured playground debug details for API errors", () => {
    expect(
      toPlaygroundError(
        new JudgeAPIError({
          judgeId: "104217",
          cause: "Codeforces API request failed: contestId: Field should contain integer."
        })
      )
    ).toMatchObject({
      message:
        "Judge API rejected the request for 104217. Codeforces API request failed: contestId: Field should contain integer.",
      tag: "JudgeAPIError",
      judgeId: "104217",
      cause: "Codeforces API request failed: contestId: Field should contain integer.",
      causeType: "string"
    });
  });
});
