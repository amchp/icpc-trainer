import { expect, test } from "@playwright/test";

import { clearConnectedJudgesIfPresent } from "./helpers.js";

test.describe.configure({ mode: "serial" });

test("enters without a judge and can skip setup, reload, and reconnect", async ({ page }) => {
  await clearConnectedJudgesIfPresent(page);
  await page.goto("/");
  await expect(page).toHaveURL(/\/find-problems$/);
  await expect(page.getByRole("heading", { name: "Find Problems" })).toBeVisible();
  await page.goto("/connect-judges");
  await page.getByRole("link", { name: "Skip for now" }).click();
  await expect(page).toHaveURL(/\/find-problems$/);
  await page.reload();
  await expect(page.getByRole("heading", { name: "Find Problems" })).toBeVisible();
  for (const path of ["/upsolving", "/contests", "/team", "/contest-finder", "/friends"]) {
    await page.goto(path);
    await expect(page.getByRole("heading", { name: "Connect a judge to get started" })).toBeVisible();
    await page.getByRole("link", { name: "Connect judge", exact: true }).click();
    await expect(page.getByRole("heading", { name: "Connect Judges" })).toBeVisible();
  }
});
