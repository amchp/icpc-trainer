import { LOCALIZED_MESSAGE_CODES } from "@icpc-trainer/shared";
import { beforeEach, describe, expect, it } from "vitest";

import { i18n } from "./i18n.js";
import { localizedErrorMessage, localizedMessageText } from "./localizedMessage.js";

describe("localized messages", () => {
  beforeEach(async () => {
    await i18n.changeLanguage("en");
  });

  it("renders stable realtime message codes without exposing technical details", () => {
    const text = localizedMessageText({
      code: LOCALIZED_MESSAGE_CODES.SyncOperationFailed,
      params: { judge: "codeforces" },
      technicalDetail: "HTTP 503 with a private upstream response"
    });

    expect(text).toBe("Could not sync codeforces data.");
    expect(text).not.toContain("HTTP 503");
  });

  it("maps tRPC codes to localized copy and ignores raw exception prose", async () => {
    const error = Object.assign(new Error("database constraint users_email_unique"), {
      data: { code: "CONFLICT" }
    });

    expect(localizedErrorMessage(error)).toContain("conflicts with newer data");
    await i18n.changeLanguage("es");
    expect(localizedErrorMessage(error)).toContain("datos más recientes");
    expect(localizedErrorMessage(error)).not.toContain("users_email_unique");
  });
});
