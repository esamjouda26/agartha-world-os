#!/usr/bin/env tsx
/**
 * CI gate: the transitional `src/features/_pending/` holding pen must be
 * empty by the Phase-9 sunset date. Until then the gate prints a summary
 * but does not fail, keeping Phases 5–8 unblocked.
 *
 * Reference: ADR-0004 §"Transitional _pending folder".
 */

import { rbac as pendingRbac } from "../src/features/_pending/rbac";
import { nav as pendingNav } from "../src/features/_pending/nav";

const SUNSET = new Date("2026-09-01T00:00:00Z");

function main(): void {
  const rbacCount = pendingRbac.routes.length;
  const navCount = pendingNav.items.length;
  const now = new Date();
  const isSunsetReached = now >= SUNSET;

  if (rbacCount === 0 && navCount === 0) {
    // eslint-disable-next-line no-console -- CI script.
    console.log("rbac-pending-empty: OK — _pending is empty.");
    return;
  }

  const msg = `rbac-pending-empty: _pending still holds ${rbacCount} route(s) and ${navCount} nav item(s). Sunset = ${SUNSET.toISOString()}.`;

  if (isSunsetReached) {
    console.error(`FAIL — ${msg}`);
    console.error(
      "Move remaining entries into real feature folders (src/features/<domain>/{rbac,nav}.ts) before merging.",
    );
    process.exit(1);
  }
  // eslint-disable-next-line no-console -- CI script; non-fatal pre-sunset.
  console.log(`WARN (non-fatal pre-sunset) — ${msg}`);
}

main();
