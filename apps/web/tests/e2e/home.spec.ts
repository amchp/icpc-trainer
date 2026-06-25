import { expect, test } from "@playwright/test";

test("redirects authenticated first-run home to Connect Judges", async ({ page }) => {
  await page.goto("/");

  await expect(page).toHaveURL(/\/connect-judges$/);
  await expect(page.getByRole("heading", { name: "Connect Judges" })).toBeVisible();
});
