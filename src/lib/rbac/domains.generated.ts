/**
 * AUTO-GENERATED — do not edit by hand.
 *
 * Regenerate via:
 *   pnpm tsx scripts/generate-domain-codes.ts
 *
 * Source of truth: `INSERT INTO permission_domains (code, name, description) VALUES`
 * block in `supabase/migrations/20260417064731_init_schema.sql`. Any mismatch
 * between this file and the migration is a CI failure (see ADR-0004).
 */

export type DomainCode =
  | "system"
  | "hr"
  | "inventory"
  | "inventory_ops"
  | "pos"
  | "procurement"
  | "booking"
  | "ops"
  | "it"
  | "maintenance"
  | "marketing"
  | "comms"
  | "reports";

export const ALL_DOMAIN_CODES: readonly DomainCode[] = [
  "system",
  "hr",
  "inventory",
  "inventory_ops",
  "pos",
  "procurement",
  "booking",
  "ops",
  "it",
  "maintenance",
  "marketing",
  "comms",
  "reports",
] as const;
