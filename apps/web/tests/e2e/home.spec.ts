import { expect, test } from "@playwright/test";

import { clearConnectedJudgesIfPresent } from "./helpers.js";

test.describe.configure({ mode: "serial" });

test("redirects authenticated first-run home to Connect Judges", async ({ page }) => {
  await clearConnectedJudgesIfPresent(page);
  await page.goto("/");

  await expect(page).toHaveURL(/\/connect-judges$/);
  await expect(page.getByRole("heading", { name: "Connect Judges" })).toBeVisible();
});
