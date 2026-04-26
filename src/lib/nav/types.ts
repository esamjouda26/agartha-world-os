/**
 * Navigation type contracts. Imported ONLY by portal layouts, the command
 * palette, and feature `nav.ts` files. Physically isolated from
 * `src/lib/rbac/**` so Edge middleware never pulls icon names, i18n keys,
 * or any UI metadata into its bundle.
 *
 * Reference: ADR-0004 (feature-colocated RBAC + nav).
 */

import type { Route } from "next";

import type { AccessLevel, DomainAccess, Portal } from "@/lib/rbac/types";

/**
 * Single nav entry declared in a feature's `nav.ts`. Deep-link-only routes
 * (e.g. `/admin/iam/:id`) MUST NOT appear here — those live in `rbac.ts`
 * only and are gated by middleware without surfacing in any menu.
 */
export type FeatureNavItem = Readonly<{
  id: string;
  portal: Portal;
  path: string;
  section: string;
  order: number;
  iconName: string;
  labelKey: string;
  /** Fallback label used when a translation is missing. */
  label: string;
  /**
   * Domain + access required to see this item. Omit for always-visible
   * shared routes (Settings, Attendance, etc.).
   *
   * `additionalDomains` (optional) widens visibility — the item shows when
   * the user holds the primary `{domain, access}` OR any listed alternate.
   * Used for cross-domain surfaces (e.g. material categories shared by
   * `procurement` and `pos`).
   */
  requires?: Readonly<{
    domain: string;
    access: DomainAccess;
    additionalDomains?: ReadonlyArray<{ domain: string; access: DomainAccess }>;
  }>;
  /**
   * Hide the item when the user's `access_level` is in this list. Used
   * for the IT-admin vs Business-admin persona split.
   */
  excludeWhenAccessLevel?: ReadonlyArray<AccessLevel>;
  /**
   * Hide the item when the user holds ANY of these domain + access pairs.
   * Inverse of `requires` — used to carve IT-only / Business-only admin
   * sections (an IT-persona item sets `excludeWhenHoldsAnyDomain: []`;
   * a Business-persona item lists `it:c` and `system:c` to hide from
   * IT admins).
   */
  excludeWhenHoldsAnyDomain?: ReadonlyArray<Readonly<{ domain: string; access: DomainAccess }>>;
}>;

export type FeatureNav = Readonly<{
  featureId: string;
  items: readonly FeatureNavItem[];
}>;

/**
 * Section metadata. Sections are declared separately from items so
 * feature authors don't re-declare the same section shell across files.
 */
export type NavSectionSpec = Readonly<{
  portal: Portal;
  id: string;
  labelKey: string;
  label: string;
  /** Lower `order` renders first. Ties are broken by insertion order. */
  order: number;
}>;

/** Consumption-side `NavItem` shape — identical to what the shell / palette render today. */
export type NavItem = Readonly<{
  id: string;
  labelKey: string;
  label: string;
  href: Route;
  iconName: string;
}>;

export type NavSection = Readonly<{
  id: string;
  labelKey: string;
  label: string;
  items: readonly NavItem[];
}>;

export type NavManifest = Readonly<{
  portalName: string;
  sections: readonly NavSection[];
}>;
