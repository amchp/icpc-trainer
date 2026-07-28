import { expect, test } from "@playwright/test";

test("uses the bilingual problem, tool, answer flow with interactive exhaustive searches", async ({ page }) => {
  await page.goto("/resources/brute-force");
  await page.getByRole("combobox", { name: /^(Choose language|Elegir idioma)$/ }).selectOption("en");
  await expect(page.getByRole("heading", { name: "Generate. Check. Backtrack." })).toBeVisible();
  await expect(page.getByText("3ⁿ", { exact: true })).toHaveCount(0);
  await expect(page.getByText("00 · Problem", { exact: true })).toHaveCount(4);
  await expect(page.getByRole("button", { name: "Learn the tool" })).toHaveCount(4);

  const alice = page.getByRole("heading", { name: "Alice’s Adventures in “Chess”" }).locator("xpath=ancestor::article");
  await alice.getByRole("button", { name: "Learn the tool" }).click();
  await expect(alice.getByLabel("Simulated traffic light")).toBeVisible();
  await alice.getByRole("button", { name: "Show the problem connection" }).click();
  await expect(alice.getByRole("img", { name: "Path checked by the Alice simulation" })).toBeVisible();
  await alice.getByRole("button", { name: "Simulate 21 passes" }).click();
  await expect(alice.getByText(/Replaying move 0 of 3/)).toBeVisible();
  await expect(alice.getByText(/target is reached in pass 1/)).toBeVisible();

  const kitchen = page.getByRole("heading", { name: "Kitchen Plates" }).locator("xpath=ancestor::article");
  await kitchen.getByRole("button", { name: "Learn the tool" }).click();
  await kitchen.getByRole("button", { name: "Show the problem connection" }).click();
  await expect(kitchen.getByRole("textbox")).toHaveCount(0);
  await expect(kitchen.getByRole("combobox", { name: "Left plate in restriction 1" })).toHaveValue("D");
  await kitchen.getByRole("button", { name: "Check every ordering" }).click();
  const orders = kitchen.getByLabel("All generated plate orderings");
  await expect(orders.locator("span")).toHaveCount(120);
  await expect(orders.getByLabel("ECBDA: accepted")).toBeVisible();
  await expect(kitchen.getByText(/one valid smallest-to-largest/)).toHaveCount(0);
  expect(await orders.evaluate((element) => element.scrollHeight === element.clientHeight)).toBe(true);

  const sakurako = page.getByRole("heading", { name: "Sakurako’s Exam" }).locator("xpath=ancestor::article");
  await sakurako.getByRole("button", { name: "Learn the tool" }).click();
  await sakurako.getByRole("button", { name: "Show the problem connection" }).click();
  await expect(sakurako.getByRole("combobox", { name: "Number of ones (a)" })).toHaveValue("2");
  await expect(sakurako.getByRole("spinbutton")).toHaveCount(0);
  await sakurako.getByRole("button", { name: "Explore all decisions" }).click();
  await expect(sakurako.getByText(/One accepted assignment/)).toBeVisible();

  await page.getByRole("combobox", { name: "Choose language" }).selectOption("es");
  await expect(page.getByText("00 · Problema", { exact: true })).toHaveCount(4);
  await expect(page.getByRole("button", { name: "Aprender la herramienta" })).toHaveCount(1);
  await page.setViewportSize({ width: 320, height: 700 });
  await expect.poll(() => page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(true);
});
