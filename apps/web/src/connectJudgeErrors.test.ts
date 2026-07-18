import { beforeEach, describe, expect, it } from "vitest";

import { formatConnectJudgeError } from "./connectJudgeErrors.js";
import { i18n } from "./i18n/i18n.js";

describe("formatConnectJudgeError", () => {
  beforeEach(async () => {
    await i18n.changeLanguage("en");
  });

  it("turns credential validation failures into actionable localized copy", async () => {
    const error = Object.assign(new Error("upstream secret mismatch"), {
      data: { code: "BAD_REQUEST" }
    });

    expect(formatConnectJudgeError(error)).toContain("rejected these credentials");
    expect(formatConnectJudgeError(error)).not.toContain("secret mismatch");

    await i18n.changeLanguage("es");
    expect(formatConnectJudgeError(error)).toContain("rechazó estas credenciales");
  });
});
