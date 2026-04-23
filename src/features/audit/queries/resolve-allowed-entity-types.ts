import "server-only";

import { ENTITY_DOMAINS, KNOWN_ENTITY_TYPES } from "@/features/audit/constants";

/**
 * Derive the caller's allowed `entity_type` set from their JWT
 * `domains` claim.
 *
 * A user sees an entity_type iff they hold `r` access on at least
 * one of its owning domains (per `ENTITY_DOMAINS`). Admins
 * (it_admin / business_admin) hold every domain with full CRUD per
 * seed ([init_schema.sql:649-654](../../../../supabase/migrations/20260417064731_init_schema.sql#L649)),
 * so the base filter naturally returns every known entity type for
 * them — no explicit admin override needed.
 *
 * Pure function of JWT — no DB round-trip, no `cache()` needed.
 */
export function resolveAllowedEntityTypes(params: {
  domains: Readonly<Record<string, readonly string[]>> | undefined;
}): string[] {
  const domains = params.domains ?? {};
  const held = new Set(Object.keys(domains).filter((d) => (domains[d] ?? []).includes("r")));
  return KNOWN_ENTITY_TYPES.filter((et) => (ENTITY_DOMAINS[et] ?? []).some((d) => held.has(d)));
}
