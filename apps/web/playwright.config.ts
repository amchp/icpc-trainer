import { defineConfig, devices } from "@playwright/test";
import { fileURLToPath } from "node:url";

const repoRoot = fileURLToPath(new URL("../..", import.meta.url));

export default defineConfig({
  testDir: "./tests/e2e",
  timeout: 30_000,
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
        ICPC_TRAINER_SQLITE_PATH: ":memory:"
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
      name: "chromium",
      use: { ...devices["Desktop Chrome"] }
    }
  ]
});
