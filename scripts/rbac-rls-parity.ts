#!/usr/bin/env tsx
/**
 * CI gate: for every `RouteRequirement` that declares `primaryTables`,
 * the RLS policies on those tables must mirror the route's
 * `{domain, access}`. Closes the Phase-4 drift class: a nav/gate that
 * says `ops:c` while the table's RLS says `any authenticated`.
 *
 * Algorithm (v1, regex-based — upgrade to pgsql-parser if false-positive
 * rate > 5%):
 *   1. Read every .sql file under `supabase/migrations/`.
 *   2. Extract `CREATE POLICY ... ON <table> FOR <cmd> ... USING (...)`.
 *   3. For every route with non-empty `primaryTables`, verify each table
 *      has a policy whose USING clause matches the shape
 *      `auth.jwt()->'app_metadata'->'domains'->'<domain>' \\? '<access>'`
 *      for the relevant INSERT/SELECT/UPDATE/DELETE command.
 *
 * Entries in `_pending/` carry empty `primaryTables` on purpose — the
 * parity check prints an INFO line for each and continues, so Phases
 * 5–9 migrations surface the real table names incrementally.
 *
 * Reference: ADR-0004, CLAUDE.md §4 ("Data Protection Parity"), §10.
 */

import { readdirSync, readFileSync } from "node:fs";
import { join, resolve } from "node:path";

import { MIDDLEWARE_ROUTES } from "../src/lib/rbac/middleware-manifest";

const REPO_ROOT = resolve(__dirname, "..");
const MIGRATIONS_DIR = resolve(REPO_ROOT, "supabase/migrations");

const ACCESS_TO_SQL_CMD: Record<"c" | "r" | "u" | "d", string> = {
  c: "INSERT",
  r: "SELECT",
  u: "UPDATE",
  d: "DELETE",
};

type Policy = Readonly<{
  table: string;
  command: string;
  usingClause: string;
  rawMatch: string;
}>;

function readAllMigrations(): string {
  const files = readdirSync(MIGRATIONS_DIR)
    .filter((f) => f.endsWith(".sql"))
    .sort();
  return files
    .map((f) => readFileSync(join(MIGRATIONS_DIR, f), "utf-8"))
    .join("\n-- next migration --\n");
}

function extractPolicies(sql: string): readonly Policy[] {
  // Matches: CREATE POLICY "name" ON schema.table FOR cmd [TO role] USING (...) [WITH CHECK (...)]
  // `m` flag; tolerant of whitespace, optional schema prefix.
  const re =
    /CREATE\s+POLICY[\s\S]*?ON\s+(?:public\.)?(\w+)\s+FOR\s+(INSERT|SELECT|UPDATE|DELETE|ALL)[\s\S]*?USING\s*\(([\s\S]*?)\)(?:\s*WITH\s+CHECK\s*\([\s\S]*?\))?\s*;/gi;
  const out: Policy[] = [];
  let m: RegExpExecArray | null;
  while ((m = re.exec(sql)) !== null) {
    out.push({
      table: m[1]!,
      command: m[2]!.toUpperCase(),
      usingClause: m[3]!,
      rawMatch: m[0]!,
    });
  }
  return out;
}

function policyMatchesDomain(
  policy: Policy,
  domain: string,
  access: "c" | "r" | "u" | "d",
): boolean {
  const wanted = ACCESS_TO_SQL_CMD[access];
  if (policy.command !== wanted && policy.command !== "ALL") return false;
  // Look for the canonical shape (domain code + access code).
  const shape = new RegExp(String.raw`domains'\s*->\s*'${domain}'[\s\S]*\?\s*'${access}'`);
  return shape.test(policy.usingClause);
}

function main(): void {
  const sql = readAllMigrations();
  const policies = extractPolicies(sql);
  const mismatches: string[] = [];
  const infos: string[] = [];
  let checked = 0;

  for (const compiled of MIDDLEWARE_ROUTES) {
    const { patternSource, req, featureId } = compiled;
    if (req.primaryTables.length === 0) {
      infos.push(
        `  INFO  ${featureId} · ${patternSource}: primaryTables=[] (transitional or RPC-gated)`,
      );
      continue;
    }
    for (const table of req.primaryTables) {
      checked++;
      const tablePolicies = policies.filter((p) => p.table === table);
      if (tablePolicies.length === 0) {
        mismatches.push(
          `  MISSING  ${featureId} · ${patternSource}: no CREATE POLICY found for table "${table}"`,
        );
        continue;
      }
      const hasMatch = tablePolicies.some((p) => policyMatchesDomain(p, req.domain, req.access));
      if (!hasMatch) {
        mismatches.push(
          `  DRIFT  ${featureId} · ${patternSource}: table "${table}" has no policy matching domains->'${req.domain}' ? '${req.access}' for ${ACCESS_TO_SQL_CMD[req.access]}`,
        );
      }
    }
  }

  // eslint-disable-next-line no-console -- CI script.
  console.log(
    `rbac-rls-parity: checked ${checked} primary-table binding(s); ${mismatches.length} mismatch(es); ${infos.length} transitional.`,
  );
  for (const info of infos.slice(0, 5)) {
    // eslint-disable-next-line no-console -- CI script.
    console.log(info);
  }
  if (infos.length > 5) {
    // eslint-disable-next-line no-console -- CI script.
    console.log(`  ... ${infos.length - 5} more transitional entries`);
  }

  if (mismatches.length > 0) {
    console.error("\nrbac-rls-parity: FAIL — UI/middleware claim ≠ RLS claim:");
    for (const m of mismatches) console.error(m);
    console.error(
      "\nFix options:\n  (a) Update the feature's rbac.ts to match the RLS policy's domain/access.\n  (b) Update the CREATE POLICY in the migration to match the route requirement.\n  (c) Flag as intentional in ADR and add `primaryTables: []` with justification.\n",
    );
    process.exit(1);
  }
}

main();
