import { createClerkClient } from "@clerk/backend";
import { clerk, clerkSetup } from "@clerk/testing/playwright";
import { expect, test as setup } from "@playwright/test";
import { mkdirSync } from "node:fs";
import { dirname } from "node:path";

const authStatePath = "playwright/.clerk/user.json";

const requiredEnv = (name: string): string => {
  const value = process.env[name]?.trim();
  if (value === undefined || value === "") {
    throw new Error(`${name} is required to run Clerk e2e tests.`);
  }

  return value;
};

const requiredPublishableKey = (): string => {
  const value = process.env.CLERK_PUBLISHABLE_KEY?.trim() || process.env.VITE_CLERK_PUBLISHABLE_KEY?.trim();
  if (value === undefined || value === "") {
    throw new Error("CLERK_PUBLISHABLE_KEY or VITE_CLERK_PUBLISHABLE_KEY is required to run Clerk e2e tests.");
  }

  return value;
};

const testUserEmail = (): string =>
  process.env.E2E_CLERK_USER_EMAIL?.trim() || "icpc-trainer-e2e+clerk_test@example.com";

const testUserPassword = (): string =>
  process.env.E2E_CLERK_USER_PASSWORD?.trim() || "ICPC-Trainer-E2E-Password-424242!";

setup.describe.configure({ mode: "serial" });

setup("configure Clerk testing", async () => {
  requiredEnv("CLERK_SECRET_KEY");
  requiredPublishableKey();
  await clerkSetup({ dotenv: false });
});

setup("create Clerk test user", async () => {
  const client = createClerkClient({ secretKey: requiredEnv("CLERK_SECRET_KEY") });
  const emailAddress = testUserEmail();
  const { data: users } = await client.users.getUserList({ emailAddress: [emailAddress] });

  if (users.length === 0) {
    await client.users.createUser({
      emailAddress: [emailAddress],
      password: testUserPassword(),
      firstName: "ICPC",
      lastName: "Trainer"
    });
  }
});

setup("authenticate with Clerk", async ({ page }) => {
  mkdirSync(dirname(authStatePath), { recursive: true });

  await page.goto("/");
  await clerk.signIn({ page, emailAddress: testUserEmail() });
  await page.goto("/");
  await expect(page.getByRole("heading", { name: "Connect Judges" })).toBeVisible();
  await page.context().storageState({ path: authStatePath });
});
