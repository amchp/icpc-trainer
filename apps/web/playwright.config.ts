import { defineConfig, devices } from "@playwright/test";
import { existsSync } from "node:fs";
import { join } from "node:path";
import { loadEnvFile } from "node:process";
import { fileURLToPath } from "node:url";

const repoRoot = fileURLToPath(new URL("../..", import.meta.url));
const authStatePath = "playwright/.clerk/user.json";
const envFiles = [".env.e2e.local", ".env.e2e", ".env.local", ".env"];

for (const file of envFiles) {
  const path = join(repoRoot, file);
  if (existsSync(path)) {
    loadEnvFile(path);
  }
}

export default defineConfig({
  testDir: "./tests/e2e",
  timeout: 30_000,
  workers: 1,
  use: {
    baseURL: "http://127.0.0.1:5173",
    trace: "on-first-retry"
  },
  webServer: [
    {
      command: "pnpm --filter @icpc-trainer/server dev",
      url: "http://127.0.0.1:43773/health",
      reuseExistingServer: !process.env.CI,
      timeout: 60_000,
      cwd: repoRoot,
      env: {
        ICPC_TRAINER_PORT: "43773",
        ICPC_TRAINER_DATABASE_URL: ":memory:"
      }
    },
    {
      command: "pnpm --filter @icpc-trainer/web dev",
      url: "http://127.0.0.1:5173",
      reuseExistingServer: !process.env.CI,
      timeout: 60_000,
      cwd: repoRoot,
      env: {
        VITE_API_BASE_URL: "http://127.0.0.1:43773"
      }
    }
  ],
  projects: [
    {
      name: "setup",
      testMatch: /global\.setup\.ts/
    },
    {
      name: "chromium",
      testIgnore: /global\.setup\.ts/,
      dependencies: ["setup"],
      use: {
        ...devices["Desktop Chrome"],
        storageState: authStatePath
      }
    }
  ]
});
