#!/usr/bin/env tsx
/**
 * CI gate: the Edge middleware bundle must stay below the budget defined
 * in ADR-0004 (800 KB — 80% of Vercel's 1 MB Edge-middleware cap). A
 * regression usually means UI metadata (icon names, i18n keys, React
 * imports) has leaked into the `src/lib/rbac/**` graph.
 *
 * Assumes `pnpm build` has produced `.next/server/middleware.js`. In CI
 * wire this as:
 *   pnpm build && pnpm tsx scripts/rbac-bundle-budget.ts
 *
 * Reference: ADR-0004, CLAUDE.md §14 (Performance Budgets).
 */

import { statSync } from "node:fs";
import { resolve } from "node:path";

const REPO_ROOT = resolve(__dirname, "..");

// Next.js 16 emits the compiled middleware under one of these locations
// depending on output mode. Probe in order; use the first that exists.
const CANDIDATES = [
  ".next/server/middleware.js",
  ".next/server/src/middleware.js",
  ".next/server/edge-runtime-webpack.js",
];

const BUDGET_BYTES = 800 * 1024;
const HARD_CAP_BYTES = 1024 * 1024;

function findBundle(): string | null {
  for (const rel of CANDIDATES) {
    const abs = resolve(REPO_ROOT, rel);
    try {
      if (statSync(abs).isFile()) return abs;
    } catch {
      continue;
    }
  }
  return null;
}

function main(): void {
  const bundle = findBundle();
  if (!bundle) {
    console.error(
      `rbac-bundle-budget: FAIL — could not find compiled middleware bundle. Run \`pnpm build\` first. Candidates probed: ${CANDIDATES.join(", ")}`,
    );
    process.exit(1);
  }
  const { size } = statSync(bundle);
  const kb = (size / 1024).toFixed(1);
  if (size > HARD_CAP_BYTES) {
    console.error(
      `rbac-bundle-budget: FAIL (HARD CAP) — middleware bundle is ${kb} KB > Vercel Edge Middleware 1024 KB cap. Deploy will be rejected.`,
    );
    process.exit(1);
  }
  if (size > BUDGET_BYTES) {
    console.error(
      `rbac-bundle-budget: FAIL — middleware bundle is ${kb} KB > budget ${BUDGET_BYTES / 1024} KB. Audit rbac imports for UI / i18n / React leakage (ADR-0004).`,
    );
    process.exit(1);
  }
  // eslint-disable-next-line no-console -- CI script.
  console.log(
    `rbac-bundle-budget: OK — middleware bundle is ${kb} KB (budget ${BUDGET_BYTES / 1024} KB, hard cap ${HARD_CAP_BYTES / 1024} KB).`,
  );
}

main();
