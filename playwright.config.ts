import { defineConfig, devices } from "@playwright/test";

/**
 * Playwright configuration.
 *
 * Viewport strategy — Phase 4 / prompt.md Master Preamble §Responsive-Strategy
 * enforcement rule 1. Visual-regression specs (suffix `.visual.spec.ts`) fan
 * out across all 5 canonical widths: 375 / 768 / 1024 / 1280 / 1920. Functional
 * specs default to `chromium-desktop` to keep CI cheap; they can opt into
 * extra widths via `test.use({ viewport: ... })` when a bug is width-specific.
 */
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
    // Functional baseline — keep `chromium` as the historical alias so
    // existing `--project=chromium` invocations continue to work.
    {
      name: "chromium",
      testIgnore: /.*\.visual\.spec\.ts$/,
      use: { ...devices["Desktop Chrome"] },
    },
    {
      name: "mobile-chrome",
      testIgnore: /.*\.visual\.spec\.ts$/,
      use: { ...devices["Pixel 7"] },
    },

    // Canonical 5-viewport matrix for visual-regression specs
    // (Master Preamble §Responsive-Strategy rule 1). Widths match the
    // documented breakpoints: sm 640, md 768, lg 1024, xl 1280, 2xl 1536.
    {
      name: "chromium-mobile",
      testMatch: /.*\.visual\.spec\.ts$/,
      use: { ...devices["Desktop Chrome"], viewport: { width: 375, height: 667 } },
    },
    {
      name: "chromium-tablet-portrait",
      testMatch: /.*\.visual\.spec\.ts$/,
      use: { ...devices["Desktop Chrome"], viewport: { width: 768, height: 1024 } },
    },
    {
      name: "chromium-tablet-landscape",
      testMatch: /.*\.visual\.spec\.ts$/,
      use: { ...devices["Desktop Chrome"], viewport: { width: 1024, height: 768 } },
    },
    {
      name: "chromium-desktop",
      testMatch: /.*\.visual\.spec\.ts$/,
      use: { ...devices["Desktop Chrome"], viewport: { width: 1280, height: 800 } },
    },
    {
      name: "chromium-wide",
      testMatch: /.*\.visual\.spec\.ts$/,
      use: { ...devices["Desktop Chrome"], viewport: { width: 1920, height: 1080 } },
    },
  ],
  webServer: {
    // Production build is deterministic and faster to load during CI
    // smokes. `pnpm test:e2e` is expected to run after `pnpm build`.
    command: process.env.PLAYWRIGHT_WEBSERVER ?? "pnpm dev",
    // Middleware rewrites `/` → `/en`, so the root returns 404. The ready
    // probe must hit a locale-scoped path that responds 2xx/3xx for
    // `reuseExistingServer` to detect a running dev server.
    url: "http://localhost:3000/en/auth/login",
    reuseExistingServer: !process.env.CI,
    timeout: 300_000,
    // Relax the login bucket for seeded roles reused across many tests.
    // The dedicated rate-limit gate uses a "ratelimit-probe-*" email so
    // it still hits the strict bucket.
    env: { TEST_RELAX_RATE_LIMITS: "1" },
  },
});
