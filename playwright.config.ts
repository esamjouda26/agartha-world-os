import { defineConfig, devices } from "@playwright/test";

export default defineConfig({
  testDir: "./tests/e2e",
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 0,
  // Default to 2 workers locally: the login rate limiter (5/min/IP+email
  // per CLAUDE.md §11) trips with higher parallelism when multiple tests
  // log in as the same seeded role. CI runs single-threaded for
  // determinism.
  workers: process.env.CI ? 1 : 2,
  reporter: [["html", { open: "never" }], ["list"]],
  use: {
    baseURL: "http://localhost:3000",
    trace: "on-first-retry",
    screenshot: "only-on-failure",
    video: "retain-on-failure",
  },
  projects: [
    { name: "chromium", use: { ...devices["Desktop Chrome"] } },
    { name: "mobile-chrome", use: { ...devices["Pixel 7"] } },
  ],
  webServer: {
    // Production build is deterministic and faster to load during CI
    // smokes. `pnpm test:e2e` is expected to run after `pnpm build`.
    command: process.env.PLAYWRIGHT_WEBSERVER ?? "pnpm dev",
    url: "http://localhost:3000",
    reuseExistingServer: !process.env.CI,
    timeout: 300_000,
    // Relax the login bucket for seeded roles reused across many tests.
    // The dedicated rate-limit gate uses a "ratelimit-probe-*" email so
    // it still hits the strict bucket.
    env: { TEST_RELAX_RATE_LIMITS: "1" },
  },
});
