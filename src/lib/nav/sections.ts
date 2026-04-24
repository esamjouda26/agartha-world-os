import type { NavSectionSpec, FeatureNavItem } from "./types";

/**
 * Canonical section metadata per portal. Sections are presentational
 * scaffolding — no single feature "owns" them — so they live centrally.
 * Feature `nav.ts` files declare `section: "<id>"` referencing one of
 * these. The aggregator matches items to sections by `(portal, section-id)`.
 *
 * `order` controls section ordering within a portal's shell. Within a
 * section, items are sorted by their own `order` field.
 */
export const NAV_SECTIONS: readonly NavSectionSpec[] = [
  // ── Admin ──
  { portal: "admin", id: "it", labelKey: "nav.admin.it", label: "IT", order: 10 },
  { portal: "admin", id: "system", labelKey: "nav.admin.system", label: "System", order: 15 },
  { portal: "admin", id: "business", labelKey: "nav.admin.business", label: "Business", order: 20 },
  { portal: "admin", id: "shared", labelKey: "nav.admin.shared", label: "Shared", order: 90 },

  // ── Management ──
  {
    portal: "management",
    id: "domains",
    labelKey: "nav.mgmt.domains",
    label: "Domains",
    order: 10,
  },
  { portal: "management", id: "shared", labelKey: "nav.mgmt.shared", label: "Shared", order: 90 },

  // ── Crew ──
  // Role-specific tabs render first so the primary job action lands on
  // the visible bottom-tab bar (§8c). "Shared" follows.
  { portal: "crew", id: "role", labelKey: "nav.crew.role", label: "Your job", order: 10 },
  { portal: "crew", id: "shared", labelKey: "nav.crew.shared", label: "Everyone", order: 90 },
] as const;

/**
 * Lookup helper — used by the aggregator when a feature declares an item
 * referencing a section that does not exist. Returning `undefined` causes
 * the aggregator to throw at module load (fail-fast).
 */
export function findSection(
  portal: FeatureNavItem["portal"],
  sectionId: string,
): NavSectionSpec | undefined {
  return NAV_SECTIONS.find((s) => s.portal === portal && s.id === sectionId);
}
