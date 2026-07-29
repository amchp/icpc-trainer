import { expect, test } from "@playwright/test";

test("uses the bilingual exclusive-sentinel journey with editable code-free applications", async ({ page }) => {
  await page.goto("/resources/binary-search");
  await page.getByRole("combobox", { name: /^(Choose language|Elegir idioma)$/ }).selectOption("en");
  await expect(page.getByRole("heading", { name: "Protect the condition. Cut the range." })).toBeVisible();
  await expect(page.getByText("00 · Problem", { exact: true })).toHaveCount(5);

  const first = page.getByRole("heading", { name: "Return the first copy of the target" }).locator("xpath=ancestor::article");
  await first.getByRole("button", { name: "Learn the tool" }).click();
  await expect(first.getByText("Generic C++ condition trace")).toBeVisible();
  await first.getByRole("button", { name: "Show the problem connection" }).click();
  const firstLab = first.getByLabel("Trace the first occurrence");
  await firstLab.getByLabel("Sorted values").fill("1, 2, 2, 2, 8");
  await firstLab.getByLabel("Target").fill("2");
  await expect(firstLab.getByText("The first target is at index 1.")).toBeVisible();

  const closest = page.getByRole("heading", { name: "Find the closest value" }).locator("xpath=ancestor::article");
  await closest.getByRole("button", { name: "Learn the tool" }).click();
  await closest.getByRole("button", { name: "Show the problem connection" }).click();
  const closestLab = closest.getByLabel("Compare the surviving neighbors");
  await closestLab.getByLabel("Sorted values").fill("10, 20");
  await closestLab.getByLabel("Target").fill("15");
  await expect(closestLab.getByText("10 is closest to 15.")).toBeVisible();

  const magic = page.getByRole("heading", { name: "Magic Powder - 2" }).locator("xpath=ancestor::article");
  await magic.getByRole("button", { name: "Learn the tool" }).click();
  await magic.getByRole("button", { name: "Show the problem connection" }).click();
  await expect(magic.getByText("Maximum cookies: 4")).toBeVisible();

  await page.getByRole("combobox", { name: "Choose language" }).selectOption("es");
  await expect(page.getByRole("heading", { name: "Protege la condición. Recorta el rango." })).toBeVisible();
  await expect(page.getByText("00 · Problema", { exact: true })).toHaveCount(5);

  await page.setViewportSize({ width: 320, height: 700 });
  await expect.poll(() => page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(true);
});
