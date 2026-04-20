#!/usr/bin/env tsx
/**
 * Reads the permission_domains seed from the init migration and regenerates
 * `src/lib/rbac/domains.generated.ts` as a literal-union type and frozen
 * array. Run in CI before `tsc --noEmit` so a mistyped domain code in any
 * `rbac.ts` file becomes a compile error.
 *
 * Reference: ADR-0004 (feature-colocated RBAC + nav) and CLAUDE.md §10
 * (Zero Projection — schema is the sole source of truth for domain codes).
 */

import { readFileSync, writeFileSync } from "node:fs";
import { resolve } from "node:path";

const REPO_ROOT = resolve(__dirname, "..");
const MIGRATION_PATH = resolve(REPO_ROOT, "supabase/migrations/20260417064731_init_schema.sql");
const OUTPUT_PATH = resolve(REPO_ROOT, "src/lib/rbac/domains.generated.ts");

const INSERT_MARKER = "INSERT INTO permission_domains (code, name, description) VALUES";
const TERMINATOR = "ON CONFLICT";

function extractDomainCodes(sql: string): string[] {
  const startIdx = sql.indexOf(INSERT_MARKER);
  if (startIdx < 0) {
    throw new Error(
      `Missing \`${INSERT_MARKER}\` in ${MIGRATION_PATH}. The seed block may have been moved or renamed — update this script or restore the block.`,
    );
  }
  const afterInsert = startIdx + INSERT_MARKER.length;
  const terminatorIdx = sql.indexOf(TERMINATOR, afterInsert);
  if (terminatorIdx < 0) {
    throw new Error(
      `Missing \`${TERMINATOR}\` terminator after seed block at offset ${afterInsert}.`,
    );
  }
  const block = sql.slice(afterInsert, terminatorIdx);
  const codeMatcher = /\(\s*'([a-z_]+)'\s*,/g;
  const codes: string[] = [];
  let match: RegExpExecArray | null;
  while ((match = codeMatcher.exec(block)) !== null) {
    codes.push(match[1]!);
  }
  if (codes.length === 0) {
    throw new Error(
      "Parsed 0 domain codes from the seed block. The regex may be out of date — inspect the block manually.",
    );
  }
  return codes;
}

function emit(codes: readonly string[]): string {
  const unionMembers = codes.map((c) => `  | "${c}"`).join("\n");
  const arrayMembers = codes.map((c) => `  "${c}"`).join(",\n");
  return `/**
 * AUTO-GENERATED — do not edit by hand.
 *
 * Regenerate via:
 *   pnpm tsx scripts/generate-domain-codes.ts
 *
 * Source of truth: \`INSERT INTO permission_domains (code, name, description) VALUES\`
 * block in \`supabase/migrations/20260417064731_init_schema.sql\`. Any mismatch
 * between this file and the migration is a CI failure (see ADR-0004).
 */

export type DomainCode =
${unionMembers};

export const ALL_DOMAIN_CODES: readonly DomainCode[] = [
${arrayMembers},
] as const;
`;
}

function main(): void {
  const sql = readFileSync(MIGRATION_PATH, "utf-8");
  const codes = extractDomainCodes(sql);
  const output = emit(codes);
  writeFileSync(OUTPUT_PATH, output, "utf-8");
  // eslint-disable-next-line no-console -- Build-time script; not an app runtime path.
  console.log(`generate-domain-codes: wrote ${codes.length} domain code(s) to ${OUTPUT_PATH}`);
}

main();
