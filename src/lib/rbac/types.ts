/**
 * RBAC type contracts shared across Edge middleware, the policy module,
 * and every feature's `rbac.ts`. Pure types + branded primitives — no
 * runtime code, safe to import from both server and client modules.
 *
 * DO NOT add `import "server-only";` here. The middleware-manifest and
 * policy modules carry the server-only boundary; this file must remain
 * isomorphic so the command palette (client component) can import
 * `DomainAccess` for local type-narrowing.
 *
 * Reference: ADR-0004 (feature-colocated RBAC + nav).
 */

import type { DomainCode } from "./domains.generated";

export type { DomainCode };

/** CRUD tier a JWT claim must carry on a domain to pass Gate 5. */
export type DomainAccess = "c" | "r" | "u" | "d";

/** Staff portal segment. Guest / auth flows are handled outside this system. */
export type Portal = "admin" | "management" | "crew";

/** User access tier, mirrored from `auth.users.raw_app_meta_data.access_level`. */
export type AccessLevel = "admin" | "manager" | "crew";

/**
 * Locale-stripped pathname. Only produced by `brandLocaleStripped`, which
 * is called exactly once inside `middleware.ts#stripLocale`. An ESLint
 * rule bans `as LocaleStrippedPath` everywhere else.
 *
 * Rationale: Gate 5 must never match against a `/en/...` or `/ms/...`
 * prefix. Encoding that invariant as a brand makes accidental misuse a
 * compile error instead of a subtle auth-bypass.
 */
declare const LocaleStrippedBrand: unique symbol;
export type LocaleStrippedPath = string & {
  readonly [LocaleStrippedBrand]: true;
};

/**
 * The only legitimate way to mint a `LocaleStrippedPath`. Call site must
 * be inside `middleware.ts#stripLocale`; the ESLint rule enforces it.
 */
export function brandLocaleStripped(value: string): LocaleStrippedPath {
  return value as LocaleStrippedPath;
}

/**
 * One URL-pattern + domain requirement. `primaryTables` names the feature's
 * main table(s) so the `rbac:rls-parity` CI gate can assert the RLS
 * policies on those tables mirror this route's `{domain, access}`.
 *
 * `pattern` MUST use URLPattern pathname syntax — not regex. Supported
 * tokens: `:id`, `:id?`, `/*`, `{/*}?`. Compiled once at module load.
 *
 * `additionalDomains` (optional) widens Gate 5 to pass when the JWT
 * carries the requested access on EITHER the primary `{domain, access}`
 * OR any of the listed alternates. Used for surfaces that are shared
 * between two domains at the same access tier (e.g. material categories
 * are co-owned by `procurement` and `pos`). The RLS-parity CI gate
 * accepts a match against any listed domain.
 */
export type RouteRequirement = Readonly<{
  pattern: string;
  domain: DomainCode;
  access: DomainAccess;
  /**
   * Primary table(s) whose RLS policies must mirror this route's
   * `{domain, access}` (or any `additionalDomains` entry). An empty array
   * means the feature's access is enforced via `SECURITY DEFINER` RPCs
   * only — justify that choice in the feature's JSDoc.
   */
  primaryTables: readonly string[];
  /**
   * Optional OR-list. When present, Gate 5 passes if the JWT satisfies
   * EITHER `{domain, access}` OR any `{domain, access}` here.
   */
  additionalDomains?: readonly { domain: DomainCode; access: DomainAccess }[];
  /** Reserved for Gate 6 (MFA) reintroduction — see ADR-0002. */
  mfaRequired?: boolean;
}>;

/** The exact export shape every `src/features/<feature>/rbac.ts` must provide. */
export type FeatureRbac = Readonly<{
  featureId: string;
  routes: readonly RouteRequirement[];
}>;
