import { expect, type Page } from "@playwright/test";

export const waitForVisibleHeading = async (
  page: Page,
  name: string,
  timeout = 5_000
): Promise<boolean> => {
  try {
    await page.getByRole("heading", { name, exact: true }).waitFor({ state: "visible", timeout });
    return true;
  } catch {
    return false;
  }
};

export const clearConnectedJudgesIfPresent = async (page: Page): Promise<void> => {
  await page.goto("/judges");

  if (!(await waitForVisibleHeading(page, "Judges", 10_000))) {
    await expect(page.getByRole("heading", { name: "Connect Judges" })).toBeVisible();
    return;
  }

  const clearButton = page.getByRole("button", { name: "Clear all connected judges" });
  if (await clearButton.isEnabled()) {
    await clearButton.click();
    await expect(page.getByRole("heading", { name: "Connect Judges" })).toBeVisible({ timeout: 15_000 });
  }
};
