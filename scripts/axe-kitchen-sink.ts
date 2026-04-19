/**
 * Phase 2B gate — axe accessibility check against /kitchen-sink.
 * Run with: pnpm exec tsx scripts/axe-kitchen-sink.ts [url]
 *
 * Exits 0 when zero serious/critical violations are reported. Surfaces every
 * violation with target selectors so triage is immediate.
 */

import { chromium } from "@playwright/test";
import AxeBuilder from "@axe-core/playwright";

const URL = process.argv[2] ?? "http://localhost:3000/kitchen-sink";

async function run(): Promise<void> {
  const browser = await chromium.launch();
  const context = await browser.newContext({ viewport: { width: 1280, height: 900 } });
  const page = await context.newPage();
  await page.goto(URL, { waitUntil: "networkidle", timeout: 60_000 });

  const results = await new AxeBuilder({ page })
    .withTags(["wcag2a", "wcag2aa", "wcag21aa", "wcag22aa"])
    .analyze();

  const blocking = results.violations.filter(
    (v) => v.impact === "serious" || v.impact === "critical",
  );
  const counts = results.violations.reduce<Record<string, number>>((acc, v) => {
    const key = v.impact ?? "unknown";
    acc[key] = (acc[key] ?? 0) + 1;
    return acc;
  }, {});

  console.info(`[axe] ${URL}`);
  console.info(`[axe] violations by impact:`, counts);
  if (results.violations.length === 0) {
    console.info("[axe] no violations reported.");
  } else {
    for (const v of results.violations) {
      console.info(`  [${v.impact}] ${v.id} — ${v.help}`);
      for (const node of v.nodes.slice(0, 5)) {
        console.info(`      target: ${node.target.join(", ")}`);
      }
    }
  }

  await browser.close();
  if (blocking.length > 0) {
    console.error(`[axe] FAIL — ${blocking.length} serious/critical violation(s).`);
    process.exitCode = 1;
    return;
  }
  console.info("[axe] PASS — zero serious/critical violations.");
}

void run();
