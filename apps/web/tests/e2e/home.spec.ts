import { expect, test } from "@playwright/test";

test("redirects home to Find Problems", async ({ page }) => {
  await page.goto("/");

  await expect(page).toHaveURL(/\/find-problems$/);
  await expect(page.getByRole("heading", { name: "Find Problems" })).toBeVisible();
});
