import { clerk, setupClerkTestingToken } from "@clerk/testing/playwright";
import { expect, test, type Page } from "@playwright/test";

import { animations as en } from "../../src/locales/en/animations.js";
import { animations as es } from "../../src/locales/es/animations.js";

const inventory = {
  conditionals: ["conditionals-trace"],
  loops: ["for-loop-trace", "while-loop-trace", "loop-control-trace"],
  "vector-traversal": ["vector-traversal-trace"],
  "function-calls": ["function-call-trace"],
  recursion: ["countdown-recursion", "recursion-trace", "fibonacci-recursion-trace"],
  "fibonacci-recursion-tree": ["fibonacci-recursion-tree"],
  vectors: ["vector-simulator", "vector-bounds-explorer"],
  stacks: ["stack-simulator"],
  queues: ["queue-simulator", "deque-simulator"],
  sets: ["set-simulator"],
  maps: ["map-simulator"],
  structs: ["struct-simulator"],
  permutations: ["recursive-permutations", "iterative-permutations"],
  subsets: ["recursive-subsets", "bitmask-subsets"],
  "binary-search-comparison": ["binary-search-comparison"],
  "monotone-condition-pattern": ["monotone-condition-pattern"],
  "first-occurrence-trace": ["first-occurrence-trace"],
  "closest-value-trace": ["closest-value-trace"],
  "numeric-binary-search-trace": ["numeric-binary-search-trace"],
  "first-true-boundary-trace": ["first-true-boundary-trace"],
  "last-true-boundary-trace": ["last-true-boundary-trace"],
  "coin-change": ["coin-change-walkthrough", "coin-change-counterexample"],
  "activity-selection": ["activity-selection-walkthrough"],
  "largest-first-selection": ["largest-first-selection"],
  "subsequence-scanner": ["subsequence-scanner"],
  "sign-block-selection": ["sign-block-selection"],
  dfs: ["graph-connectivity", "dfs-grid-traversal"],
  bfs: ["bfs-layers", "bfs-grid-traversal"],
  "bipartite-dfs": ["bipartite-dfs"],
  "topological-sort": ["graph-indegree", "kahn-topological-sort"],
  dijkstra: ["edge-relaxation", "dijkstra-traversal"]
} as const;


const tool = (page: Page, id: string) => page.locator(`[data-animation-tool="${id}"]`);
const workspace = (page: Page) => page.locator("[data-animation-workspace]");
const language = (page: Page) => page.getByRole("combobox", { name: /^(Choose language|Elegir idioma)$/ });
const noPageOverflow = async (page: Page): Promise<void> => {
  await expect.poll(() => page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(true);
};
const expectSignedOut = async (page: Page): Promise<void> => {
  // A fresh context must download Clerk before it can render the sign-in UI.
  await clerk.loaded({ page });
  await expect(page.locator(".cl-signIn-root")).toBeVisible({ timeout: 15_000 });
};
const openEnglish = async (page: Page, path: string): Promise<void> => {
  await page.goto(path);
  await language(page).selectOption("en");
};

for (const locale of ["en", "es"] as const) {
  const copy = locale === "en" ? en : es;
  test.describe(`Animation workspaces (${locale})`, () => {
    for (const groupId of Object.keys(inventory) as (keyof typeof inventory)[]) {
      test(`${groupId} exposes every retained member in lesson order`, async ({ page }) => {
        await page.goto(`/animations/${groupId}`);
        await language(page).selectOption(locale);
        await expect(page.getByRole("heading", { level: 1, name: copy.groups[groupId].title, exact: true })).toBeVisible();
        const members = workspace(page).locator("[data-animation-tool]");
        await expect(members).toHaveCount(inventory[groupId].length);
        expect(await members.evaluateAll((nodes) => nodes.map((node) => node.getAttribute("data-animation-tool")))).toEqual(inventory[groupId]);
        for (const memberId of inventory[groupId]) {
          await expect(tool(page, memberId).getByRole("heading", { level: 2, name: copy.tools[memberId].title, exact: true })).toBeVisible();
          await expect(tool(page, memberId).getByRole("button").first()).toBeVisible();
        }
        await expect(page.getByRole("link", { name: copy.fullGuide, exact: true })).toHaveAttribute("href", /^\/resources\//);
        await noPageOverflow(page);
        await page.setViewportSize({ width: 390, height: 844 });
        await noPageOverflow(page);
      });
    }
  });
}

test("an account without Judge Credentials can open the library and run a stack", async ({ page }) => {
  // The setup account starts with no Judge Credentials in the in-memory server.
  await openEnglish(page, "/connect-judges");
  await expect(page.getByRole("heading", { name: "Connect Judges", exact: true })).toBeVisible();
  await page.goto("/animations");
  await expect(page.locator("[data-animation-card]")).toHaveCount(31);
  await page.locator('[data-animation-card="stacks"]').click();
  const stack = tool(page, "stack-simulator");
  await stack.getByRole("button", { name: "push(number)", exact: true }).click();
  await stack.getByRole("textbox", { name: "Number", exact: true }).fill("19");
  await stack.getByRole("button", { name: "Run operation", exact: true }).click();
  await stack.getByRole("button", { name: "top()", exact: true }).click();
  await stack.getByRole("button", { name: "Run operation", exact: true }).click();
  await expect(stack.getByLabel("Last query result")).toHaveText("19");
  await page.getByRole("button", { name: "Present", exact: true }).click();
  await expect(stack.getByLabel("Last query result")).toHaveText("19");
  await page.getByRole("button", { name: "Exit presentation", exact: true }).click();
  await stack.getByRole("button", { name: "push(number)", exact: true }).click();
  await stack.getByRole("textbox", { name: "Number", exact: true }).fill("2147483648");
  await stack.getByRole("button", { name: "Run operation", exact: true }).click();
  await expect(stack.getByRole("alert")).toContainText("signed 32-bit int");
});

test("permutation members retain independent paused and running state across presentation", async ({ page }) => {
  await openEnglish(page, "/animations/permutations");
  const recursive = tool(page, "recursive-permutations");
  const iterative = tool(page, "iterative-permutations");
  await recursive.getByRole("button", { name: "Next trace step", exact: true }).click();
  await iterative.getByRole("button", { name: "Next trace step", exact: true }).click();
  await iterative.getByRole("button", { name: "Next trace step", exact: true }).click();
  await expect(recursive.getByText(/^Step 2 of/)).toBeVisible();
  await expect(iterative.getByText(/^Step 3 of/)).toBeVisible();
  await page.setViewportSize({ width: 390, height: 844 });
  await page.getByRole("button", { name: "Present", exact: true }).click();
  await expect(workspace(page)).toHaveAttribute("data-presenting", "true");
  await expect(page.locator("[data-animation-navigation]")).toBeHidden();
  await expect(recursive.getByText(/^Step 2 of/)).toBeVisible();
  await expect(iterative.getByText(/^Step 3 of/)).toBeVisible();
  await noPageOverflow(page);
  await page.keyboard.press("Escape");
  await expect(workspace(page)).toHaveAttribute("data-presenting", "false");
  await expect(page.getByRole("button", { name: "Present", exact: true })).toBeFocused();
  await expect(recursive.getByText(/^Step 2 of/)).toBeVisible();
  await expect(iterative.getByText(/^Step 3 of/)).toBeVisible();

  await recursive.getByRole("button", { name: "Play", exact: true }).click();
  await iterative.getByRole("button", { name: "Play", exact: true }).click();
  await page.getByRole("button", { name: "Present", exact: true }).click();
  await expect(recursive.getByRole("button", { name: "Pause", exact: true })).toBeVisible();
  await expect(iterative.getByRole("button", { name: "Pause", exact: true })).toBeVisible();
  await page.keyboard.press("Escape");
  await expect(recursive.getByRole("button", { name: "Pause", exact: true })).toBeVisible();
  await expect(iterative.getByRole("button", { name: "Pause", exact: true })).toBeVisible();
  await page.reload();
  await expect(recursive.getByText(/^Step 1 of/)).toBeVisible();
  await expect(iterative.getByText(/^Step 1 of/)).toBeVisible();
});

test("member searches deduplicate groups and filters survive back and reload", async ({ page }) => {
  await openEnglish(page, "/animations");
  for (const query of ["recursive permutations", "iterative permutations"]) {
    await page.getByRole("searchbox", { name: "Search animations" }).fill(query);
    await expect(page.locator("[data-animation-card]")).toHaveCount(1);
    await expect(page.locator('[data-animation-card="permutations"]')).toBeVisible();
  }
  await page.getByRole("combobox", { name: "Topic", exact: true }).selectOption("brute-force");
  await page.locator('[data-animation-card="permutations"]').click();
  await page.getByRole("link", { name: "Back to library", exact: true }).click();
  await expect(page.getByRole("searchbox")).toHaveValue("iterative permutations");
  await expect(page.getByRole("combobox", { name: "Topic", exact: true })).toHaveValue("brute-force");
  await page.reload();
  await expect(page.locator("[data-animation-card]")).toHaveCount(1);
  await expect(page.getByRole("searchbox")).toHaveValue("iterative permutations");
  await language(page).selectOption("es");
  await page.getByRole("combobox", { name: es.topicLabel, exact: true }).selectOption("");
  await page.getByRole("searchbox").fill("busqueda binaria");
  await expect(page.locator('[data-animation-card="binary-search-comparison"]')).toBeVisible();
  await page.locator('[data-animation-card="binary-search-comparison"]').click();
  await page.goBack();
  await expect(page.getByRole("searchbox")).toHaveValue("busqueda binaria");
});

test("copy shares only the canonical group URL and offers manual copy on failure", async ({ page, context }) => {
  await context.grantPermissions(["clipboard-read", "clipboard-write"]);
  await openEnglish(page, "/animations/permutations?q=recursive&topic=brute-force#member");
  const canonical = new URL("/animations/permutations", page.url()).href;
  await page.getByRole("button", { name: "Copy link", exact: true }).click();
  await expect(page.getByText("Link copied", { exact: true })).toBeVisible();
  expect(await page.evaluate(() => navigator.clipboard.readText())).toBe(canonical);
  await page.evaluate(() => {
    Object.defineProperty(navigator.clipboard, "writeText", { configurable: true, value: () => Promise.reject(new Error("Clipboard denied")) });
  });
  await page.getByRole("button", { name: "Copy link", exact: true }).click();
  const manual = page.getByRole("textbox", { name: en.copyFailed });
  await expect(manual).toHaveValue(canonical);
  await manual.focus();
  expect(await manual.evaluate((input: HTMLInputElement) => [input.selectionStart, input.selectionEnd])).toEqual([0, canonical.length]);
});

test("coin change and BFS keep both members immediately usable", async ({ page }) => {
  await openEnglish(page, "/animations/coin-change");
  const coins = tool(page, "coin-change-walkthrough");
  const counterexample = tool(page, "coin-change-counterexample");
  await coins.getByRole("button", { name: "Next step", exact: true }).click();
  await expect(coins.getByText(/^Step 2 of/)).toBeVisible();
  await expect(counterexample.getByText(/^Step 1 of/)).toBeVisible();
  await counterexample.getByRole("button", { name: "Next step", exact: true }).click();
  await expect(counterexample.getByText(/^Step 2 of/)).toBeVisible();
  await expect(counterexample).toContainText("The local rule uses 3 coins; the optimum uses 2.");
  await page.goto("/animations/bfs");
  const layers = tool(page, "bfs-layers");
  const grid = tool(page, "bfs-grid-traversal");
  await layers.getByRole("button", { name: "Next trace step", exact: true }).click();
  await grid.getByRole("button", { name: "Next trace step", exact: true }).click();
  await expect(layers.getByText(/^Step 2 of/)).toBeVisible();
  await expect(grid.getByText(/^Step 2 of/)).toBeVisible();
  await page.getByRole("button", { name: "Present", exact: true }).click();
  await page.setViewportSize({ width: 390, height: 844 });
  await noPageOverflow(page);
  await expect(grid.getByRole("button", { name: "Next trace step", exact: true })).toBeVisible();
  await page.keyboard.press("Escape");
  await page.getByRole("link", { name: "Full guide", exact: true }).click();
  await expect(page).toHaveURL(/\/resources\/graph-theory$/);
});

test("editable binary search preserves inputs, validation, and current step in presentation", async ({ page }) => {
  await openEnglish(page, "/animations/binary-search-comparison");
  const comparison = tool(page, "binary-search-comparison");
  await comparison.getByRole("textbox", { name: "Object sizes", exact: true }).fill("8, 2, 3");
  await expect(comparison.getByRole("alert")).toContainText("sorted");
  await comparison.getByRole("textbox", { name: "Object sizes", exact: true }).fill("1, 3, 3, 9");
  await comparison.getByRole("textbox", { name: "New cube size", exact: true }).fill("3");
  await comparison.getByRole("button", { name: "Next step", exact: true }).click();
  await expect(comparison.getByText(/^Step 2 of/)).toBeVisible();
  await page.getByRole("button", { name: "Present", exact: true }).click();
  await expect(comparison.getByRole("textbox", { name: "Object sizes", exact: true })).toHaveValue("1, 3, 3, 9");
  await expect(comparison.getByRole("textbox", { name: "New cube size", exact: true })).toHaveValue("3");
  await expect(comparison.getByText(/^Step 2 of/)).toBeVisible();
  await page.setViewportSize({ width: 390, height: 844 });
  await noPageOverflow(page);
  await page.keyboard.press("Escape");
  await expect(comparison.getByText(/^Step 2 of/)).toBeVisible();
});

test("empty searches and unknown workspaces recover to the complete catalog", async ({ page }) => {
  await openEnglish(page, "/animations?q=no-such-animation-xyz");
  await expect(page.getByRole("heading", { name: "No animations found" })).toBeVisible();
  await page.getByRole("button", { name: "Reset filters", exact: true }).click();
  await expect(page.locator("[data-animation-card]")).toHaveCount(31);
  await page.goto("/animations/unknown-animation");
  await expect(page.getByRole("heading", { name: "Workspace not found" })).toBeVisible();
  await page.getByRole("link", { name: "Back to library", exact: true }).click();
  await expect(page.locator("[data-animation-card]")).toHaveCount(31);
});

test("fresh signed-out contexts open resources, guides, libraries, and shared workspaces", async ({ browser, baseURL }) => {
  const context = await browser.newContext({ baseURL, storageState: { cookies: [], origins: [] } });
  const page = await context.newPage();
  const privateRequests: string[] = [];
  page.on("request", (request) => {
    if (request.url().includes("/trpc/")) privateRequests.push(request.url());
  });
  try {
    for (const path of ["/resources", "/resources/introduction", "/animations", "/animations/permutations", "/animations/unknown-animation", "/animations/bfs?preview=resources"]) {
      await openEnglish(page, path);
      await expect(page.getByRole("heading", { level: 1 })).toBeVisible();
      await expect(page.getByRole("button", { name: "Sign in", exact: true })).toBeVisible();
      await expect(page.locator(".cl-signIn-root")).toHaveCount(0);
    }
    await expect(workspace(page)).toHaveAttribute("data-animation-workspace", "bfs");
    await page.goto("/resources/introduction");
    await expect(page.getByRole("button", { name: "Sign in to save your progress" })).toBeVisible();
    expect(privateRequests).toEqual([]);
    await page.goto("/judges");
    await expectSignedOut(page);
  } finally {
    await context.close();
  }
});

test("a shared group remains public before sign-in and after sign-out", async ({ browser, baseURL }) => {
  test.setTimeout(60_000);
  const context = await browser.newContext({ baseURL, storageState: { cookies: [], origins: [] } });
  const page = await context.newPage();
  try {
    await setupClerkTestingToken({ page });
    const path = "/animations/permutations?q=recursive&topic=brute-force";
    await page.goto(path);
    await expect(workspace(page)).toHaveAttribute("data-animation-workspace", "permutations");
    await clerk.signIn({ page, emailAddress: process.env.E2E_CLERK_USER_EMAIL?.trim() || "icpc-trainer-e2e+clerk_test@example.com" });
    await expect(page.getByRole("button", { name: "Open user menu" })).toBeVisible();
    await expect(workspace(page)).toHaveAttribute("data-animation-workspace", "permutations");
    expect(new URL(page.url()).searchParams.get("q")).toBe("recursive");
    expect(new URL(page.url()).searchParams.get("topic")).toBe("brute-force");
    await language(page).selectOption("en");
    await expect(tool(page, "recursive-permutations").getByText(/^Step 1 of/)).toBeVisible();
    await clerk.signOut({ page });
    await page.goto(path);
    await expect(workspace(page)).toHaveAttribute("data-animation-workspace", "permutations");
    await expect(page.getByRole("button", { name: "Sign in", exact: true })).toBeVisible();
  } finally {
    await context.close();
  }
});
