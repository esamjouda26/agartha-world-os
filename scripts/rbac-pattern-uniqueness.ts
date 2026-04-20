#!/usr/bin/env tsx
/**
 * CI gate: no two feature `rbac.ts` patterns are byte-identical. Two
 * features claiming the same URL pattern means one silently loses every
 * Gate 5 decision — ambiguous ownership is a security smell.
 *
 * Reference: ADR-0004, CLAUDE.md §10 (Zero Projection).
 */

import { MIDDLEWARE_ROUTES } from "../src/lib/rbac/middleware-manifest";

function main(): void {
  const bucket = new Map<string, string[]>();
  for (const route of MIDDLEWARE_ROUTES) {
    const existing = bucket.get(route.patternSource) ?? [];
    existing.push(route.featureId);
    bucket.set(route.patternSource, existing);
  }
  const conflicts = [...bucket.entries()].filter(([, owners]) => owners.length > 1);
  if (conflicts.length === 0) {
    // eslint-disable-next-line no-console -- CI script.
    console.log(`rbac-pattern-uniqueness: OK — ${MIDDLEWARE_ROUTES.length} unique pattern(s).`);
    return;
  }
  console.error("rbac-pattern-uniqueness: FAIL — duplicate patterns found:");
  for (const [pattern, owners] of conflicts) {
    console.error(`  ${pattern}  claimed by: ${owners.join(", ")}`);
  }
  process.exit(1);
}

main();
