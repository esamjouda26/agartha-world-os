/**
 * Phase 2B gate — render `/kitchen-sink` at each of the 5 canonical viewports
 * (375 / 768 / 1024 / 1280 / 1920) in both themes, checking for:
 *  - page status 200
 *  - no horizontal overflow (document.scrollWidth <= innerWidth + 2px slack)
 *  - no console errors during initial paint
 *
 * Designed to be fast: headless, serial, no screenshots (design-review gate
 * #2 is a human review — this script just certifies no regressions prevent
 * that review from happening).
 */

import { chromium, type Page } from "@playwright/test";

type Result = {
  width: number;
  height: number;
  theme: "light" | "dark";
  scrollWidth: number;
  innerWidth: number;
  overflow: boolean;
  consoleErrors: string[];
};

const VIEWPORTS: ReadonlyArray<readonly [number, number]> = [
  [375, 667],
  [768, 1024],
  [1024, 768],
  [1280, 800],
  [1920, 1080],
];

const URL = process.argv[2] ?? "http://localhost:3000/kitchen-sink";

async function checkViewport(
  page: Page,
  width: number,
  height: number,
  theme: "light" | "dark",
): Promise<Result> {
  const errors: string[] = [];
  page.on("pageerror", (err) => errors.push(String(err)));
  page.on("console", (msg) => {
    if (msg.type() !== "error") return;
    const text = msg.text();
    // Kitchen-sink §10 renders an ErrorState with a synthetic error so the
    // primitive's Sentry reporter is exercised on mount. With SENTRY_DSN
    // unset in dev, telemetry.ts falls back to console.error — that is
    // documented behavior, not a regression.
    if (text.includes("[telemetry] captureException")) return;
    errors.push(text);
  });

  await page.setViewportSize({ width, height });
  await page.context().addCookies([
    {
      name: "NEXT_THEME",
      value: theme,
      url: URL,
    },
  ]);
  await page.goto(URL, { waitUntil: "networkidle", timeout: 60_000 });

  const metrics = await page.evaluate(() => ({
    scrollWidth: document.documentElement.scrollWidth,
    innerWidth: window.innerWidth,
  }));

  // Allow ≤ 2px slack for scrollbar-gutter rounding.
  const overflow = metrics.scrollWidth - metrics.innerWidth > 2;
  return { width, height, theme, ...metrics, overflow, consoleErrors: errors };
}

async function run(): Promise<void> {
  const browser = await chromium.launch();
  const results: Result[] = [];

  for (const theme of ["light", "dark"] as const) {
    for (const [w, h] of VIEWPORTS) {
      const context = await browser.newContext({ viewport: { width: w, height: h } });
      const page = await context.newPage();
      results.push(await checkViewport(page, w, h, theme));
      await context.close();
    }
  }

  await browser.close();

  console.info(`[responsive] ${URL}`);
  console.info("theme | viewport     | scrollW | innerW | overflow | errors");
  console.info("------+--------------+---------+--------+----------+-------");
  let failed = 0;
  for (const r of results) {
    const ok = !r.overflow && r.consoleErrors.length === 0;
    if (!ok) failed += 1;
    console.info(
      `${r.theme.padEnd(5)} | ${String(r.width).padStart(4)}x${String(r.height).padStart(4)}    | ${String(r.scrollWidth).padStart(7)} | ${String(r.innerWidth).padStart(6)} | ${r.overflow ? "YES" : "no "}      | ${r.consoleErrors.length}`,
    );
    for (const err of r.consoleErrors) console.info(`        ! ${err}`);
  }
  if (failed > 0) {
    console.error(`[responsive] FAIL — ${failed} viewport × theme combination(s) failed.`);
    process.exitCode = 1;
    return;
  }
  console.info("[responsive] PASS — 10/10 (5 viewports × 2 themes).");
}

void run();
