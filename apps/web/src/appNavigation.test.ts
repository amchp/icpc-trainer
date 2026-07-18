import { APP_LOCALES } from "@icpc-trainer/shared";
import { describe, expect, it } from "vitest";

import { i18n } from "./i18n/i18n.js";
import { appPaths, protectedNavItems } from "./appNavigation.js";

describe("protected navigation", () => {
  it("keeps the seven primary destinations as separate links in their shell order", () => {
    const t = i18n.getFixedT(APP_LOCALES.English, "shell");
    const items = protectedNavItems(t);

    expect(items.map(({ to }) => to)).toEqual([
      appPaths.findProblems,
      appPaths.upsolving,
      appPaths.contests,
      appPaths.contestFinder,
      appPaths.resources,
      appPaths.team,
      appPaths.friends
    ]);
    expect(items.map(({ label }) => label)).toEqual([
      "Find Problems",
      "Upsolving",
      "Contests",
      "Contest Finder",
      "Resources",
      "Team",
      "Friends"
    ]);
  });
});
