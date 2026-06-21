import { expect, test } from "@playwright/test";

test("renders the starter shell and real health response", async ({ page }) => {
  await page.goto("/");

  await expect(page.getByRole("heading", { name: "ICPC Trainer" })).toBeVisible();
  await expect(page.getByText("icpc-trainer")).toBeVisible();
  await expect(page.getByText("ok")).toBeVisible();
  await expect(page.getByRole("cell", { name: "API" })).toBeVisible();
  await expect(page.getByText("tRPC over typed HTTP")).toBeVisible();
});
