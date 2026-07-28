import { APP_LOCALES } from "@icpc-trainer/shared";
import { describe, expect, it } from "vitest";

import { i18n } from "./i18n/i18n.js";
import { appPaths, protectedNavItems } from "./appNavigation.js";

describe("protected navigation", () => {
  it("keeps the primary destinations as separate links in their shell order", () => {
    const t = i18n.getFixedT(APP_LOCALES.English, "shell");
    const items = protectedNavItems(t);

    expect(items.map(({ to }) => to)).toEqual([
      appPaths.findProblems,
      appPaths.leaderboard,
      appPaths.upsolving,
      appPaths.contestFinder,
      appPaths.resources,
      appPaths.team
    ]);
    expect(items.map(({ label }) => label)).toEqual([
      "Find Problems",
      "Leaderboard",
      "Upsolving",
      "Contest Finder",
      "Resources",
      "Team"
    ]);
    expect(items.find(({ to }) => to === appPaths.resources)?.activePaths).toContain(appPaths.introduction);
    expect(items.find(({ to }) => to === appPaths.resources)?.activePaths).toContain(appPaths.timeComplexity);
    expect(items.find(({ to }) => to === appPaths.resources)?.activePaths).toContain(appPaths.dataStructures);
  });
});
