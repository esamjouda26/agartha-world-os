/**
 * Lighthouse run for the public guest portal routes.
 *
 * Plan §D2 — guest portal Lighthouse CI gate.
 *
 * Routes audited (no authentication required — these are public):
 *   - /en/book              — 5-step booking wizard
 *   - /en/my-booking        — booking lookup
 *   - /en/survey            — feedback form
 *   - /en/privacy           — static legal page
 *   - /en/terms             — static legal page
 *
 * Asserts per CLAUDE.md §14 + §19:
 *   - performance     ≥ 90 on /en/book, /en/my-booking, /en/survey
 *   - accessibility   ≥ 95 on every guest route
 *   - best-practices  ≥ 90
 *   - seo             ≥ 90 on indexable routes
 *
 * Usage:
 *   pnpm build && pnpm start                       # terminal 1
 *   pnpm exec tsx scripts/lighthouse-guest.ts      # terminal 2
 *
 * Override target with LIGHTHOUSE_BASE_URL=https://staging.example.com.
 *
 * Reports land in `.lighthouseci/guest/<slug>.report.html` so a CI
 * artifact step can publish them.
 *
 * Exits 0 on pass, 1 on first regression — CI-ready.
 */

import { spawn } from "node:child_process";
import { mkdirSync, writeFileSync } from "node:fs";
import { join } from "node:path";

const BASE_URL = process.env.LIGHTHOUSE_BASE_URL ?? "http://localhost:3000";
const PERF_MIN = Number(process.env.LIGHTHOUSE_PERF_MIN ?? 90);
const A11Y_MIN = Number(process.env.LIGHTHOUSE_A11Y_MIN ?? 95);
const BEST_MIN = Number(process.env.LIGHTHOUSE_BEST_MIN ?? 90);
const SEO_MIN = Number(process.env.LIGHTHOUSE_SEO_MIN ?? 90);

type GuestRoute = Readonly<{
  path: string;
  slug: string;
  /** When false, SEO score is not gated (e.g. private pages). */
  indexable: boolean;
  /** When false, performance score is not gated (e.g. legal-text pages). */
  perfGated: boolean;
}>;

const ROUTES: readonly GuestRoute[] = [
  { path: "/en/book", slug: "book", indexable: true, perfGated: true },
  { path: "/en/my-booking", slug: "my-booking", indexable: true, perfGated: true },
  { path: "/en/survey", slug: "survey", indexable: true, perfGated: true },
  { path: "/en/privacy", slug: "privacy", indexable: true, perfGated: false },
  { path: "/en/terms", slug: "terms", indexable: true, perfGated: false },
];

type LhrCategoryScore = Readonly<{ score: number | null }>;
type LhrReport = Readonly<{
  categories: Readonly<{
    performance: LhrCategoryScore;
    accessibility: LhrCategoryScore;
    "best-practices": LhrCategoryScore;
    seo: LhrCategoryScore;
  }>;
}>;

async function runLighthouse(url: string, slug: string): Promise<LhrReport> {
  const outDir = join(process.cwd(), ".lighthouseci", "guest");
  mkdirSync(outDir, { recursive: true });
  const jsonPath = join(outDir, `${slug}.report.json`);
  const htmlPath = join(outDir, `${slug}.report.html`);

  return new Promise<LhrReport>((resolve, reject) => {
    const child = spawn(
      "pnpm",
      [
        "exec",
        "lighthouse",
        url,
        "--quiet",
        "--chrome-flags=--headless=new --no-sandbox",
        "--output=json",
        "--output=html",
        `--output-path=${join(outDir, slug)}.report`,
        "--only-categories=performance,accessibility,best-practices,seo",
      ],
      { stdio: ["ignore", "pipe", "inherit"], shell: process.platform === "win32" },
    );

    let stdoutBuffer = "";
    child.stdout.on("data", (chunk: Buffer) => {
      stdoutBuffer += chunk.toString();
    });

    child.on("error", reject);
    child.on("exit", async (code) => {
      if (code !== 0) {
        reject(new Error(`lighthouse exited with code ${code} for ${url}`));
        return;
      }
      try {
        const fs = await import("node:fs/promises");
        const json = await fs.readFile(jsonPath, "utf8");
        const report = JSON.parse(json) as LhrReport;
        // Mirror the html report path so the CI artefact step finds it.
        writeFileSync(join(outDir, `${slug}.url.txt`), `${url}\n${htmlPath}\n`);
        resolve(report);
      } catch (err) {
        // Fall back to stdout-streamed JSON if the file path was odd.
        try {
          const report = JSON.parse(stdoutBuffer) as LhrReport;
          resolve(report);
        } catch {
          reject(err);
        }
      }
    });
  });
}

function pct(score: number | null): number {
  return Math.round((score ?? 0) * 100);
}

async function main(): Promise<void> {
  const failures: string[] = [];

  for (const route of ROUTES) {
    const url = `${BASE_URL}${route.path}`;
    process.stdout.write(`▶ Lighthouse ${route.slug} → ${url}\n`);
    let report: LhrReport;
    try {
      report = await runLighthouse(url, route.slug);
    } catch (err) {
      failures.push(`${route.slug}: lighthouse run failed (${(err as Error).message})`);
      continue;
    }
    const perf = pct(report.categories.performance.score);
    const a11y = pct(report.categories.accessibility.score);
    const best = pct(report.categories["best-practices"].score);
    const seo = pct(report.categories.seo.score);
    process.stdout.write(`   perf=${perf} a11y=${a11y} best=${best} seo=${seo}\n`);
    if (route.perfGated && perf < PERF_MIN) {
      failures.push(`${route.slug}: performance ${perf} < ${PERF_MIN}`);
    }
    if (a11y < A11Y_MIN) {
      failures.push(`${route.slug}: accessibility ${a11y} < ${A11Y_MIN}`);
    }
    if (best < BEST_MIN) {
      failures.push(`${route.slug}: best-practices ${best} < ${BEST_MIN}`);
    }
    if (route.indexable && seo < SEO_MIN) {
      failures.push(`${route.slug}: seo ${seo} < ${SEO_MIN}`);
    }
  }

  if (failures.length > 0) {
    process.stderr.write("\n❌ Lighthouse gate failed:\n");
    for (const f of failures) process.stderr.write(`   - ${f}\n`);
    process.exit(1);
  }
  process.stdout.write("\n✓ Guest Lighthouse gate passed for all routes.\n");
}

main().catch((err: unknown) => {
  process.stderr.write(`lighthouse-guest: ${(err as Error).stack ?? String(err)}\n`);
  process.exit(1);
});
