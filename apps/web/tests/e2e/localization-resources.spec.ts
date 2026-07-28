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

test("solves, compares, localizes, and resets the problem-first Time & Space Complexity guide", async ({ page }) => {
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

  await expect(page.getByRole("heading", { name: "How long will this search run, and how much memory will it use?" })).toBeVisible();
  await expect(page.getByRole("heading", { name: "Fibonacci Number" })).toBeVisible();
  await expect(page.getByRole("heading", { name: "Two Sum" })).toBeVisible();
  await expect(page.getByRole("button", { name: "Reveal the analysis tool" })).toHaveCount(6);
  await expect(page.getByRole("link", { name: "Open the original problem" })).toHaveCount(5);

  const search = page.locator("#search");
  await search.getByRole("button", { name: "Reveal the analysis tool" }).click();
  await search.getByLabel("Stored users n").fill("10");
  await search.getByLabel("Search queries q").fill("3");
  await expect(search.getByText(/3 × 10 = 30 equality comparisons/)).toBeVisible();
  await expect(search.getByText("8(10 + 3) = 104 B")).toBeVisible();
  await expect(search.getByText("M(n, q) = 8n + 8q + c_fixed")).toBeVisible();
  await search.getByRole("button", { name: "Compare solution approaches" }).click();
  await expect(search.getByText("Repeat a direct scan")).toBeVisible();
  await expect(search.getByText("Question 1 of 2")).toBeVisible();
  const candidates = search.getByRole("region", { name: "Solution approach comparison" }).getByRole("article");
  await expect(candidates).toHaveCount(3);
  const candidateBoxes = await Promise.all([0, 1, 2].map((index) => candidates.nth(index).boundingBox()));
  expect(candidateBoxes[1]!.y).toBeGreaterThan(candidateBoxes[0]!.y + candidateBoxes[0]!.height);
  expect(candidateBoxes[2]!.y).toBeGreaterThan(candidateBoxes[1]!.y + candidateBoxes[1]!.height);

  const duplicates = page.locator("#duplicates");
  await duplicates.getByRole("button", { name: "Reveal the analysis tool" }).click();
  await expect(duplicates.getByRole("heading", { name: "Keep the dominant growth; drop constants" })).toBeVisible();
  await duplicates.getByRole("button", { name: "7n + 12" }).click();
  await expect(duplicates.getByText("O(n)", { exact: true }).last()).toBeVisible();

  const stock = page.locator("#stock");
  await stock.getByRole("button", { name: "Reveal the analysis tool" }).click();
  const runtimeEstimator = stock.getByRole("region", { name: "Runtime estimator" });
  await runtimeEstimator.getByLabel("Input size n").fill("10000");
  await expect(runtimeEstimator.getByText("200 ms", { exact: true })).toBeVisible();
  await runtimeEstimator.getByLabel("Constant c").fill("8");
  await expect(runtimeEstimator.getByText("1.6 s", { exact: true })).toBeVisible();
  await expect(stock.getByRole("heading", { name: "Estimate memory for the same three candidates" })).toBeVisible();
  await expect(stock.getByText("Input memory").locator("..")).toContainText("40,000 B");
  await expect(stock.getByText("Auxiliary memory").locator("..")).toContainText("40,004 B");
  await expect(stock.getByText("Total modeled memory").locator("..")).toContainText("80,004 B");
  await stock.getByRole("button", { name: "Run local O(n) comparison" }).click();
  await expect(stock.getByRole("heading", { name: "Direct scan" })).toBeVisible();
  await expect(stock.getByText(/Device-specific result/)).toBeVisible();

  const zeros = page.locator("#zeros");
  await zeros.getByRole("button", { name: "Reveal the analysis tool" }).click();
  await zeros.getByLabel("Array length n").fill("8");
  await zeros.getByLabel("Number of zeros z").fill("8");
  await expect(zeros.getByText("Upper bound on shifts").locator("..")).toContainText("≤ 64");
  await expect(zeros.getByText("Upper bound on counted work").locator("..")).toContainText("≤ 72");

  const power = page.locator("#power");
  await power.getByRole("button", { name: "Reveal the analysis tool" }).click();
  await expect(power.getByRole("heading", { name: "Expand F(6) one layer at a time" })).toBeVisible();
  for (let layer = 0; layer < 5; layer += 1) await power.getByRole("button", { name: "Reveal next layer" }).click();
  await expect(power.getByText("Calls revealed").locator("..")).toContainText("25");
  await expect(power.getByText("Maximum active depth").locator("..")).toContainText("6");
  await expect(power.getByRole("button", { name: /memoized/i })).toHaveCount(0);

  const capstone = page.locator("#capstone");
  await capstone.getByRole("button", { name: "Reveal the analysis tool" }).click();
  await expect(capstone.getByRole("heading", { name: "Classify before comparing" })).toBeVisible();
  await expect(capstone.getByRole("button", { name: "Reveal the reference model" })).toBeEnabled();

  await page.setViewportSize({ width: 320, height: 700 });
  await expect.poll(() => page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(true);
  await page.getByRole("combobox", { name: "Choose language" }).selectOption("es");
  await expect(page.getByRole("heading", { name: "Complejidad temporal y espacial" })).toBeVisible();
  await expect(page.getByRole("button", { name: "Marcar guía como completada" })).toBeVisible();

  await page.getByRole("button", { name: "Marcar guía como completada" }).click();
  await expect(page.getByText("Guía completada")).toBeVisible();
  await page.reload();
  await expect(page.getByRole("button", { name: "Volver a marcar en progreso" })).toBeVisible();
  await expect(page.getByRole("button", { name: "Revelar la herramienta de análisis" })).toHaveCount(6);
  await expect(page.getByLabel("Usuarios guardados n")).toHaveCount(0);
  await expect(page.getByRole("heading", { name: "Recorrido directo" })).toHaveCount(0);

  expect(progressRequests.some((body) => body.includes("time-complexity"))).toBe(true);
  expect(progressRequests.every((body) => !/(comparisons|variables|benchmark|checksum|classification|ranking)/i.test(body))).toBe(true);
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

test("completes the bilingual Data Structures journey at its stable direct route", async ({ page }) => {
  await page.goto("/resources/data-structures");
  await expect(page.getByRole("heading", { name: /^(Let the problem ask for the structure\.|Deja que el problema pida la estructura\.)$/ })).toBeVisible();
  await page.getByRole("combobox", { name: /^(Choose language|Elegir idioma)$/ }).selectOption("en");

  await expect(page).toHaveURL(/\/resources\/data-structures$/);
  await expect(page.getByRole("button", { name: /Learn the tool/ })).toHaveCount(7);
  const numericSection = page.locator("#numeric");
  await expect(numericSection).not.toContainText("so their product can reach 10¹⁸");
  await expect(numericSection.getByRole("img", { name: "3 rows by 4 columns: 12 painted cells" })).toBeVisible();
  await expect(numericSection.getByText("The same expression passes a small test and fails at scale")).not.toBeVisible();
  const numericDisclosure = numericSection.getByRole("button", { name: /Learn the tool/ });
  await numericDisclosure.click();
  await expect(numericSection).toContainText("int rows = 20");
  await expect(numericSection).toContainText("Value bits required: 60");
  await expect(numericSection).toContainText("30 + 30 → 60 bits");
  await page.setViewportSize({ width: 375, height: 667 });
  const bitStrips = numericSection.locator("[data-bit-strip]");
  await expect(bitStrips).toHaveCount(3);
  for (let index = 0; index < 3; index += 1) {
    const strip = bitStrips.nth(index);
    const labelBox = await strip.locator("[data-bit-strip-label]").boundingBox();
    const drawingBox = await strip.locator("[data-bit-strip-drawing]").boundingBox();
    expect(labelBox).not.toBeNull();
    expect(drawingBox).not.toBeNull();
    expect(labelBox!.y + labelBox!.height).toBeLessThanOrEqual(drawingBox!.y);
  }
  await expect.poll(() => page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(true);
  await page.setViewportSize({ width: 1280, height: 720 });
  await numericSection.getByRole("textbox", { name: "First factor" }).fill("20");
  await numericSection.getByRole("textbox", { name: "Second factor" }).fill("30");
  await expect(numericSection).toContainText("600");
  await expect(numericSection).toContainText("Value bits required: 10");
  await expect(numericSection).toContainText("5 + 5 → 10 bits");
  await expect(numericSection).toContainText("The value fits.");
  await expect(numericSection.getByRole("radio")).toHaveCount(0);

  await expect(numericSection.getByRole("heading", { name: "C++ number types are promises about range and precision" })).toBeVisible();
  await expect(numericSection.getByRole("rowheader", { name: "long long" })).toBeVisible();
  await expect(numericSection.getByRole("columnheader", { name: "Power-of-two range" })).toBeVisible();
  await expect(numericSection.getByRole("columnheader", { name: "Exactness / precision" })).toHaveCount(0);
  await expect(numericSection.getByRole("rowheader", { name: "long", exact: true })).toHaveCount(0);
  await expect(numericSection).toContainText("about ±2 × 10⁹");
  await expect(numericSection).toContainText("0 to about 4 × 10⁹");
  await expect(numericSection.getByText("Operations and cost")).toHaveCount(0);
  const numericSolution = numericSection.getByRole("button", { name: /Show the full solution explanation/ });
  await expect(numericSolution).toHaveAttribute("aria-expanded", "false");
  await numericSolution.click();
  await expect(numericSection.getByRole("heading", { name: "Solution" })).toBeVisible();
  await expect(numericSection.getByRole("region", { name: /Walk through the algorithm:/ })).toHaveCount(0);
  await expect(numericSection.getByRole("button", { name: "Play animation" })).toHaveCount(0);
  await expect(numericSection).not.toContainText("int main()");

  const vectorSection = page.locator("#vector");
  await vectorSection.getByRole("button", { name: /Learn the tool/ }).click();
  const vectorSimulator = vectorSection.getByRole("region", { name: "Interactive vector simulator" });
  const vectorState = vectorSimulator.getByRole("region", { name: "Container state" });
  await expect(vectorState.getByRole("listitem")).toHaveCount(3);
  await expect(vectorState.getByRole("listitem").nth(0)).toContainText("8");
  await expect(vectorState.getByRole("listitem").nth(1)).toContainText("3");
  await expect(vectorState.getByRole("listitem").nth(2)).toContainText("5");
  await vectorSimulator.getByRole("button", { name: "values[index]" }).click();
  await expect(vectorSimulator.getByLabel("C++ line preview")).toContainText("cout << values[");
  await vectorSimulator.getByRole("textbox", { name: "Index number" }).fill("1");
  await vectorSimulator.getByRole("button", { name: "Run operation" }).click();
  await expect(vectorSimulator.getByLabel("Last query result")).toHaveText("3");
  await vectorSimulator.getByRole("button", { name: "push_back(number)" }).click();
  await vectorSimulator.getByRole("textbox", { name: "Number" }).fill("21");
  await vectorSimulator.getByRole("button", { name: "Run operation" }).click();
  await expect(vectorSimulator.getByRole("region", { name: "Container state" })).toContainText("21");
  await expect(vectorSimulator.getByLabel("Initialization and executed code")).toContainText("values.push_back(21);");
  await expect(vectorSection).toContainText("vector<int> values = {8, 3, 6, 1}");
  await expect(vectorSection).toContainText("An iterator is a movable position inside a container");
  await expect(vectorSection).not.toContainText("Before binary search");
  await expect(vectorSection).toContainText("auto it = values.begin()");
  await expect(vectorSection).toContainText("dereferencing *end() is invalid");
  await expect(vectorSection).toContainText("it = begin() + 0, so *it = 4");
  await vectorSection.getByRole("button", { name: "Move the iterator one position right with ++it" }).click();
  await expect(vectorSection).toContainText("it = begin() + 1, so *it = 7");
  await expect(vectorSection).toContainText("The search returns an iterator, not the answer count");
  const iteratorHeading = vectorSection.getByRole("heading", { name: "An iterator is a movable position inside a container" });
  const lowerBoundOperation = vectorSection.getByText("lower_bound(...)", { exact: true });
  await expect(iteratorHeading).toBeVisible();
  await expect(lowerBoundOperation).toBeVisible();
  expect(await vectorSection.evaluate((section) => {
    const iterator = [...section.querySelectorAll("h4")].find((heading) =>
      heading.textContent?.includes("An iterator is a movable position")
    );
    const lower = [...section.querySelectorAll("dt")].find((term) =>
      term.textContent?.trim() === "lower_bound(...)"
    );
    return iterator !== undefined
      && lower !== undefined
      && Boolean(iterator.compareDocumentPosition(lower) & Node.DOCUMENT_POSITION_FOLLOWING);
  })).toBe(true);
  await vectorSection.getByRole("button", { name: "3" }).click();
  await expect(vectorSection).toContainText("lower_bound(3) → 1");
  await expect(vectorSection).toContainText("upper_bound(3) → 3");
  await expect(vectorSection).toContainText("≤ 3 → 3");
  await vectorSection.getByRole("button", { name: /Show the full solution explanation/ }).click();
  await expect(vectorSection.getByRole("heading", { name: "Solution" })).toBeVisible();
  await expect(vectorSection.getByRole("heading", { name: "Main idea", exact: true })).toHaveCount(0);
  await expect(vectorSection.getByRole("heading", { name: "Represent the problem" })).toHaveCount(0);
  await vectorSection.getByRole("textbox", { name: "Shop prices" }).fill("5, 1, 4");
  await vectorSection.getByRole("textbox", { name: "Budget queries" }).fill("0, 4, 9");
  await vectorSection.getByRole("button", { name: "Play animation" }).click();
  await expect(vectorSection).toContainText("Move 1 into the next sorted position.");
  await vectorSection.getByRole("button", { name: "Pause animation" }).click();

  const stackSection = page.locator("#stack");
  await expect(stackSection).toContainText("Is this a valid bracket sequence?");
  await stackSection.getByRole("button", { name: /Learn the tool/ }).click();
  await expect(stackSection).toContainText("A stack works like a pile of books");
  await expect(stackSection).toContainText("Dynamic programming");
  const stackSimulator = stackSection.getByRole("region", { name: "Interactive stack simulator" });
  await expect(stackSimulator.getByRole("region", { name: "Container state" })).toContainText("4");
  await stackSimulator.getByRole("button", { name: "push(number)" }).click();
  await stackSimulator.getByRole("textbox", { name: "Number" }).fill("9");
  await stackSimulator.getByRole("button", { name: "Run operation" }).click();
  await stackSimulator.getByRole("button", { name: "top()" }).click();
  await stackSimulator.getByRole("button", { name: "Run operation" }).click();
  await expect(stackSimulator.getByLabel("Last query result")).toHaveText("9");
  await stackSection.getByRole("button", { name: /Show the full solution explanation/ }).click();
  await expect(stackSection.getByRole("heading", { name: "Solution" })).toBeVisible();
  await expect(stackSection).toContainText("only opening symbols that still need a partner");
  await stackSection.getByRole("textbox", { name: "Bracket sequence" }).fill("([)]");
  await stackSection.getByRole("button", { name: "Next step" }).click();
  await expect(stackSection).toContainText("Push ( because it still needs a closing partner.");

  const queueSection = page.locator("#queue");
  await expect(queueSection).toContainText("How many requests are still recent?");
  await expect(queueSection).toContainText("ping(1), ping(100), ping(3001), ping(3002)");
  await expect(queueSection.getByRole("link", { name: "Official LeetCode 933" })).toHaveAttribute("href", "https://leetcode.com/problems/number-of-recent-calls/");
  await queueSection.getByRole("button", { name: /Learn the tool/ }).click();
  const queueSimulator = queueSection.getByRole("region", { name: "Interactive queue simulator" });
  const queueState = queueSimulator.getByRole("region", { name: "Container state" });
  await expect(queueState.getByRole("listitem")).toHaveCount(3);
  await expect(queueState.getByRole("listitem").nth(0)).toContainText("12");
  await expect(queueState.getByRole("listitem").nth(1)).toContainText("24");
  await expect(queueState.getByRole("listitem").nth(2)).toContainText("36");
  await queueSimulator.getByRole("button", { name: "push(number)" }).click();
  await queueSimulator.getByRole("textbox", { name: "Number" }).fill("48");
  await queueSimulator.getByRole("button", { name: "Run operation" }).click();
  await queueSimulator.getByRole("button", { name: "front()" }).click();
  await queueSimulator.getByRole("button", { name: "Run operation" }).click();
  await expect(queueSimulator.getByLabel("Last query result")).toHaveText("12");
  await expect(queueSection).toContainText("deque: a sequence open at both ends");
  await expect(queueSection).toContainText("push_front(value)");
  const dequeSimulator = queueSection.getByRole("region", { name: "Interactive deque simulator" });
  await dequeSimulator.getByRole("button", { name: "push_front(number)" }).click();
  await dequeSimulator.getByRole("textbox", { name: "Number" }).fill("2");
  await dequeSimulator.getByRole("button", { name: "Run operation" }).click();
  await expect(dequeSimulator.getByRole("region", { name: "Container state" })).toContainText("2");

  const setSection = page.locator("#set");
  await setSection.getByRole("button", { name: /Learn the tool/ }).click();
  await expect(setSection).toContainText("count(value)");
  await expect(setSection).not.toContainText("find(value)");
  await expect(setSection).toContainText("lower_bound(value)");
  await expect(setSection).toContainText("unordered_set<T>");
  const setSimulator = setSection.getByRole("region", { name: "Interactive set simulator" });
  await setSimulator.getByRole("textbox", { name: "Number" }).fill("9");
  await setSimulator.getByRole("button", { name: "Run operation" }).click();
  await expect(setSimulator.getByRole("region", { name: "Container state" })).toContainText("9");

  const mapSection = page.locator("#map");
  await mapSection.getByRole("button", { name: /Learn the tool/ }).click();
  await expect(mapSection).toContainText("count(key)");
  await expect(mapSection).not.toContainText("insert_or_assign");
  await expect(mapSection).toContainText("upper_bound(key)");
  await expect(mapSection).not.toContainText(/\.find\s*\(/);
  await expect(mapSection).toContainText("map and unordered_map: values addressed by keys");
  await expect(mapSection).toContainText("unordered_map<K, V>");
  await expect(mapSection).toContainText("frequencies[\"red\"]++");
  const mapSimulator = mapSection.getByRole("region", { name: "Interactive map simulator" });
  await expect(mapSimulator).toContainText("map<int, int> scores = {{1, 10}, {3, 30}, {7, 70}};");
  await mapSimulator.getByRole("button", { name: "emplace(key, value)" }).click();
  await mapSimulator.getByRole("textbox", { name: "Key number" }).fill("5");
  await mapSimulator.getByRole("textbox", { name: "Value number" }).fill("50");
  await mapSimulator.getByRole("button", { name: "Run operation" }).click();
  await expect(mapSimulator.getByRole("region", { name: "Container state" })).toContainText("5");
  await expect(mapSimulator.getByRole("region", { name: "Container state" })).toContainText("50");

  const rangeSection = page.locator("#ranges");
  await expect(rangeSection).toContainText("How can a stack return its minimum in O(1)?");
  await expect(rangeSection).toContainText("push, pop, top, and getMin");
  await expect(rangeSection).toContainText("at most 30,000 calls");
  await expect(rangeSection).toContainText("Answers: 2, 2, 5");
  await expect(rangeSection.getByRole("link", { name: "Official LeetCode 155" })).toHaveAttribute("href", "https://leetcode.com/problems/min-stack/");
  const rangeDisclosure = rangeSection.getByRole("button", { name: /Learn the tool/ });
  await expect(rangeDisclosure).toHaveAttribute("aria-expanded", "false");
  await rangeDisclosure.click();
  await expect(rangeDisclosure).toHaveAttribute("aria-expanded", "true");
  await expect(rangeSection).toContainText("Designing your own structure from rules");
  await expect(rangeSection).toContainText("struct Counter");
  await expect(rangeSection).toContainText("Counter visits");
  await expect(rangeSection).toContainText("Four decisions for designing the structure");
  await expect(rangeSection).toContainText("List only the fields an object must remember");
  await expect(rangeSection).not.toContainText("addLowerBound(x)");
  await expect(rangeSection).not.toContainText("countAllowed()");
  await expect(rangeSection).not.toContainText("struct MinStack");
  const structSimulator = rangeSection.getByRole("region", { name: "Interactive a Counter struct simulator" });
  await structSimulator.getByRole("textbox", { name: "Number" }).fill("3");
  await structSimulator.getByRole("button", { name: "Run operation" }).click();
  await expect(structSimulator.getByRole("region", { name: "Container state" })).toContainText("8");

  const referenceSection = page.locator("#reference");
  await expect(referenceSection).toContainText("What each structure stores and the operations you will reach for");
  await expect(referenceSection).toContainText("struct Name");
  await expect(page.getByText("Keep practicing")).toHaveCount(0);

  await page.getByRole("combobox", { name: "Choose language" }).selectOption("es");
  await expect(page.getByRole("heading", { name: "Deja que el problema pida la estructura." })).toBeVisible();
  await expect(page.locator("#ranges").getByRole("button", { name: /Aprender la herramienta/ })).toHaveAttribute("aria-expanded", "false");
  await expect(page.locator("#ranges")).toContainText("¿Cómo puede una pila devolver su mínimo en O(1)?");
  await expect(page.getByRole("link", { name: "Diseño de estructuras propias" })).toBeVisible();
  await expect(page.locator("#numeric")).toContainText("int filas = 20");
  await page.locator("#queue").getByRole("button", { name: /Aprender la herramienta/ }).click();
  await expect(page.locator("#stack")).toContainText("¿Es una secuencia válida de paréntesis?");
  await expect(page.locator("#queue")).toContainText("¿Cuántas solicitudes siguen siendo recientes?");
  await expect(page.getByRole("region", { name: "Simulador interactivo de queue" })).toContainText("queue<int> fila(deque<int>{12, 24, 36});");
  await page.locator("#queue").getByRole("button", { name: /Mostrar la solución explicada completa/ }).click();
  await expect(page.locator("#queue").getByRole("heading", { name: "Solución" })).toBeVisible();
  await expect(page.locator("#queue")).toContainText("más antiguo siempre está en front()");
  await page.locator("#queue").getByRole("textbox", { name: "Tiempos de los pings" }).fill("1, 100, 3001, 3002");
  await page.locator("#queue").getByRole("button", { name: "Siguiente paso" }).click();
  await expect(page.locator("#queue")).toContainText("Agrega 1");

  await page.getByRole("button", { name: "Marcar como completada" }).click();
  await expect(page.getByText("Guía completada")).toBeVisible();
  await page.reload();
  await expect(page.getByRole("button", { name: "Volver a marcar en progreso" })).toBeVisible();

  await page.goto("/resources");
  const dataStructuresCard = page.getByRole("link", { name: /Estructuras de datos/ });
  await expect(dataStructuresCard.getByText("Completada", { exact: true })).toBeVisible();
  await expect(page.getByText(/\/ 5 completadas$/)).toBeVisible();

  await page.setViewportSize({ width: 320, height: 700 });
  await dataStructuresCard.click();
  await page.locator("#queue").getByRole("button", { name: /Aprender la herramienta/ }).click();
  await expect(page.getByRole("region", { name: "Simulador interactivo de queue" })).toBeVisible();
  await expect.poll(() => page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(true);
  await page.reload();
  await expect(page.getByRole("heading", { name: "Deja que el problema pida la estructura." })).toBeVisible();

  await page.getByRole("button", { name: "Volver a marcar en progreso" }).click();
  await expect(page.getByText("Guía marcada en progreso")).toBeVisible();
});
