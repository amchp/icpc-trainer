import { expect, test } from "@playwright/test";

test("uses the bilingual justified-choice journey with five editable challenges", async ({ page }) => {
  await page.goto("/resources/greedy");
  await page.getByRole("combobox", { name: /^(Choose language|Elegir idioma)$/ }).selectOption("en");
  await expect(page.getByRole("heading", { name: "Choose. Justify. Verify." })).toBeVisible();
  await expect(page.getByText("00 · Problem", { exact: true })).toHaveCount(5);

  const challenges = [
    { title: "Make exact change with as few coins as possible", lab: "Coin change Lab", input: "Target amount", invalid: "0" },
    { title: "Attend the maximum number of compatible activities", lab: "Activity selection Lab", input: "Finish for A", invalid: "1" },
    { title: "Take the fewest coins while keeping more value", lab: "Twins Lab", input: "Coin values", invalid: "abc" },
    { title: "Find hello without rearranging the message", lab: "Chat Room Lab", input: "Lowercase message", invalid: "Hello" },
    { title: "Maximize the sum of a longest alternating subsequence", lab: "Alternating Subsequence Lab", input: "Nonzero values", invalid: "1,0,2" }
  ] as const;

  for (const challenge of challenges) {
    const article = page.getByRole("heading", { name: challenge.title }).locator("xpath=ancestor::article");
    await article.getByRole("button", { name: "Learn the tool" }).click();
    await expect(article.locator("[aria-live='polite']")).toHaveCount(1);
    await article.getByRole("button", { name: "Show the problem connection" }).click();
    const lab = article.getByLabel(challenge.lab);
    await expect(lab.getByText(/Step 1 of/)).toBeVisible();
    await lab.getByLabel(challenge.input).fill(challenge.invalid);
    await expect(lab.getByRole("alert")).toBeVisible();
    await expect(lab.getByRole("button", { name: "Next step" })).toHaveCount(0);
  }

  await page.getByRole("button", { name: "Test the rule" }).click();
  await expect(page.getByText("The local rule uses 3 coins; the optimum uses 2.")).toBeVisible();

  await page.getByRole("combobox", { name: "Choose language" }).selectOption("es");
  await expect(page.getByRole("heading", { name: "Elige. Justifica. Verifica." })).toBeVisible();
  await expect(page.getByText("00 · Problema", { exact: true })).toHaveCount(5);

  await page.setViewportSize({ width: 320, height: 700 });
  await expect.poll(() => page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(true);
});
