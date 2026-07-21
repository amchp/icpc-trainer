import { expect, test } from "@playwright/test";

test.describe.configure({ mode: "serial" });

test("persists language and Learning Progress across the Judge-independent Resources journey", async ({ page }) => {
  await page.goto("/resources");

  await expect(page.getByRole("heading", { name: /^(Learn the foundations in order\.|Aprende los fundamentos en orden\.)$/ })).toBeVisible();
  await page.getByRole("combobox", { name: /^(Choose language|Elegir idioma)$/ }).selectOption("en");

  await expect(page).toHaveURL(/\/resources$/);
  await expect(page.getByRole("heading", { name: "Learn the foundations in order." })).toBeVisible();
  await expect(page.getByRole("link", { name: /Programming Fundamentals/ })).toBeVisible();
  await expect(page.getByRole("link", { name: /Time & Space Complexity/ })).toBeVisible();

  await page.getByRole("combobox", { name: "Choose language" }).selectOption("es");
  await expect(page.getByRole("heading", { name: "Aprende los fundamentos en orden." })).toBeVisible();
  await page.reload();
  await expect(page.getByRole("heading", { name: "Aprende los fundamentos en orden." })).toBeVisible();

  await page.getByRole("link", { name: /Fundamentos de programación/ }).click();
  await expect(page).toHaveURL(/\/resources\/programming-fundamentals$/);
  await expect(page.getByRole("heading", { name: "Aprende a pensar en bloques simples." })).toBeVisible();
  await page.getByRole("button", { name: "Marcar como completada" }).click();
  await expect(page.getByText("Guía completada")).toBeVisible();

  await page.goto("/resources");
  const fundamentalsCard = page.getByRole("link", { name: /Fundamentos de programación/ });
  await expect(fundamentalsCard.getByText("Completada", { exact: true })).toBeVisible();
  await page.reload();
  await expect(fundamentalsCard.getByText("Completada", { exact: true })).toBeVisible();

  await page.setViewportSize({ width: 320, height: 700 });
  await expect.poll(() => page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(true);

  await page.getByRole("link", { name: /Fundamentos de programación/ }).click();
  await page.getByRole("button", { name: "Volver a marcar en progreso" }).click();
  await expect(page.getByText("Guía marcada en progreso")).toBeVisible();

  await page.setViewportSize({ width: 1280, height: 720 });
  await page.getByRole("combobox", { name: "Elegir idioma" }).selectOption("en");
  await expect(page.getByRole("heading", { name: "Learn to think in simple blocks." })).toBeVisible();
});

test("calculates, measures, localizes, and resets the Time & Space Complexity guide", async ({ page }) => {
  const progressRequests: string[] = [];
  page.on("request", (request) => {
    if (request.url().includes("learningProgress")) progressRequests.push(request.postData() ?? "");
  });

  await page.goto("/resources/time-complexity");
  await expect(page.getByRole("heading", { name: /^(Time & Space Complexity|Complejidad temporal y espacial)$/ })).toBeVisible();
  await page.getByRole("combobox", { name: /^(Choose language|Elegir idioma)$/ }).selectOption("en");
  const resetProgress = page.getByRole("button", { name: "Mark as in progress again" });
  if (await resetProgress.count()) {
    await resetProgress.click();
    await expect(page.getByText("Guide marked in progress")).toBeVisible();
  }

  const comparisons = page.getByLabel("Pair comparisons");
  const variables = page.getByLabel("Working variables");
  await comparisons.fill("9");
  await variables.fill("3");
  await page.getByRole("button", { name: "Check answer" }).click();
  await expect(page.getByText(/Hint: add 4/)).toBeVisible();
  await page.getByRole("button", { name: "Check answer" }).click();
  await page.getByRole("button", { name: "Reveal answer" }).click();
  await expect(page.getByText(/Correct: 10 comparisons/)).toBeVisible();

  await page.getByRole("button", { name: "Use n = 100,000,000" }).click();
  await expect(page.getByRole("progressbar", { name: /O\(n²\): 1 × 10\^16/ })).toHaveAttribute("aria-valuenow", "16");
  await expect(page.getByText(/longer than the current age of the universe/).first()).toBeVisible();

  await page.getByLabel("Input size n").fill("10000");
  await expect(page.getByLabel("Package count n")).toHaveValue("10000");
  await expect(page.getByText("1 s", { exact: true })).toBeVisible();
  await page.getByLabel("Constant c").fill("8");
  await expect(page.getByText("8 s", { exact: true })).toBeVisible();
  await expect(page.getByText("Big O label: O(n²)")).toBeVisible();
  await page.getByLabel("Bytes per stored item").fill("100000");
  await expect(page.getByText("Exceeds the modeled limit")).toBeVisible();

  await page.getByRole("button", { name: "Run local O(n) comparison" }).click();
  await expect(page.getByRole("heading", { name: "Direct scan" })).toBeVisible();
  await expect(page.getByRole("heading", { name: "Mixed arithmetic scan" })).toBeVisible();
  await expect(page.getByText(/Checksum/).first()).toBeVisible();
  await expect(page.getByText(/Device-specific result/)).toBeVisible();

  await page.setViewportSize({ width: 320, height: 700 });
  await expect.poll(() => page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(true);
  await page.getByRole("combobox", { name: "Choose language" }).selectOption("es");
  await expect(page.getByRole("heading", { name: "Complejidad temporal y espacial" })).toBeVisible();
  await expect(page.getByRole("button", { name: "Marcar guía como completada" })).toBeVisible();

  await page.getByRole("button", { name: "Marcar guía como completada" }).click();
  await expect(page.getByText("Guía completada")).toBeVisible();
  await page.reload();
  await expect(page.getByRole("button", { name: "Volver a marcar en progreso" })).toBeVisible();
  await expect(page.getByLabel("Comparaciones entre pares")).toHaveValue("");
  await expect(page.getByRole("button", { name: "Ejecutar comparación O(n) local" })).toBeVisible();
  await expect(page.getByRole("heading", { name: "Recorrido directo" })).toHaveCount(0);

  expect(progressRequests.some((body) => body.includes("time-complexity"))).toBe(true);
  expect(progressRequests.every((body) => !/(comparisons|variables|benchmark|checksum|bytesPerItem)/i.test(body))).toBe(true);
});

test("keeps six localized code traces synchronized and responsive without persisting trace position", async ({ page }) => {
  const progressRequests: string[] = [];
  page.on("request", (request) => {
    if (request.url().includes("learningProgress")) progressRequests.push(request.postData() ?? "");
  });

  await page.goto("/resources/programming-fundamentals");
  await expect(page.getByRole("heading", { name: /^(Learn to think in simple blocks\.|Aprende a pensar en bloques simples\.)$/ })).toBeVisible();
  await page.getByRole("combobox", { name: /^(Choose language|Elegir idioma)$/ }).selectOption("en");

  const labels = [
    "Problem-solving decision trace",
    "For loop code trace",
    "While loop code trace",
    "Function call code trace",
    "Vector traversal code trace",
    "Recursive factorial code trace"
  ];
  for (const label of labels) await expect(page.getByLabel(label)).toBeVisible();

  const conditional = page.getByLabel("Problem-solving decision trace");
  await expect(conditional.locator("[aria-current='step']")).toHaveAttribute("data-guide-line", "1");
  await expect(conditional.getByRole("status").first()).toContainText("submitted solution");
  await conditional.getByRole("checkbox", { name: "Solution accepted" }).check();
  await expect(conditional.getByText("Step 1 of 2")).toBeVisible();
  await conditional.getByRole("button", { name: "Next trace step" }).click();
  await expect(conditional.locator("[aria-current='step']")).toHaveAttribute("data-guide-line", "2");
  await expect(conditional.getByText("true — Next problem")).toBeVisible();

  const vector = page.getByLabel("Vector traversal code trace");
  await vector.getByRole("button", { name: "Next trace step" }).click();
  await expect(vector.getByText("push_back appends 4 at index 3.")).toBeVisible();
  await expect(vector.getByText("3", { exact: true }).last()).toBeVisible();

  const recursion = page.getByLabel("Recursive factorial code trace");
  await recursion.getByRole("button", { name: "Next trace step" }).click();
  await recursion.getByRole("button", { name: "Next trace step" }).click();
  await expect(recursion.getByText("factorial(4)", { exact: true })).toBeVisible();
  await expect(recursion.getByRole("status").first()).toContainText("factorial(3)");

  const codeBox = await conditional.locator("pre").boundingBox();
  const stateBox = await conditional.getByText(/Step \d+ of \d+/).boundingBox();
  expect(codeBox).not.toBeNull();
  expect(stateBox).not.toBeNull();
  expect(stateBox!.x).toBeGreaterThan(codeBox!.x);

  await page.setViewportSize({ width: 320, height: 700 });
  await conditional.scrollIntoViewIfNeeded();
  const mobileCodeBox = await conditional.locator("pre").boundingBox();
  const mobileStateBox = await conditional.getByText(/Step \d+ of \d+/).boundingBox();
  expect(mobileStateBox!.y).toBeGreaterThan(mobileCodeBox!.y);
  await expect.poll(() => page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(true);

  await page.setViewportSize({ width: 1280, height: 720 });
  await page.reload();
  await expect(page.getByLabel("Problem-solving decision trace").getByText("Step 1 of 3")).toBeVisible();
  await expect(page.getByLabel("Problem-solving decision trace").getByRole("checkbox", { name: "Solution accepted" })).not.toBeChecked();

  await page.getByRole("combobox", { name: "Choose language" }).selectOption("es");
  const spanishConditional = page.getByLabel("Traza de decisión al resolver un problema");
  await expect(spanishConditional).toBeVisible();
  await expect(page.getByRole("button", { name: "Paso siguiente de la traza" }).first()).toBeVisible();
  await spanishConditional.getByRole("checkbox", { name: "Solución aceptada" }).check();
  await spanishConditional.getByRole("button", { name: "Paso siguiente de la traza" }).click();
  await expect(spanishConditional.getByText("true — Siguiente problema")).toBeVisible();
  await page.getByRole("combobox", { name: "Elegir idioma" }).selectOption("en");

  expect(progressRequests.length).toBeGreaterThan(0);
  expect(progressRequests.every((body) => !/(trace|frame|stepIndex|rain|snow)/i.test(body))).toBe(true);
});
