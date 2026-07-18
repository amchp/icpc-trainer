import { expect, test } from "@playwright/test";

test.describe.configure({ mode: "serial" });

test("persists language and Learning Progress across the Judge-independent Resources journey", async ({ page }) => {
  await page.goto("/resources");

  const switchToEnglish = page.getByRole("button", { name: "Cambiar idioma a inglés" });
  if (await switchToEnglish.isVisible()) await switchToEnglish.click();

  await expect(page).toHaveURL(/\/resources$/);
  await expect(page.getByRole("heading", { name: "Learn the foundations in order." })).toBeVisible();
  await expect(page.getByRole("link", { name: /Programming Fundamentals/ })).toBeVisible();

  await page.getByRole("button", { name: "Switch language to Spanish" }).click();
  await expect(page.getByRole("heading", { name: "Aprende los fundamentos en orden." })).toBeVisible();
  await page.reload();
  await expect(page.getByRole("heading", { name: "Aprende los fundamentos en orden." })).toBeVisible();

  await page.getByRole("link", { name: /Fundamentos de programación/ }).click();
  await expect(page).toHaveURL(/\/resources\/programming-fundamentals$/);
  await expect(page.getByRole("heading", { name: "Aprende a pensar en bloques simples." })).toBeVisible();
  await page.getByRole("button", { name: "Marcar como completada" }).click();
  await expect(page.getByText("Guía completada")).toBeVisible();

  await page.goto("/resources");
  await expect(page.getByText("Completada", { exact: true })).toBeVisible();
  await page.reload();
  await expect(page.getByText("Completada", { exact: true })).toBeVisible();

  await page.setViewportSize({ width: 320, height: 700 });
  await expect.poll(() => page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(true);

  await page.getByRole("link", { name: /Fundamentos de programación/ }).click();
  await page.getByRole("button", { name: "Volver a marcar en progreso" }).click();
  await expect(page.getByText("Guía marcada en progreso")).toBeVisible();

  await page.setViewportSize({ width: 1280, height: 720 });
  await page.getByRole("button", { name: "Cambiar idioma a inglés" }).click();
  await expect(page.getByRole("heading", { name: "Learn to think in simple blocks." })).toBeVisible();
});
