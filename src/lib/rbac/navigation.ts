/**
 * Navigation manifest — single source of truth consumed by
 * `<ResponsivePortalShell>` and each portal's scoped `<CommandPalette>`
 * (mounted via `<ShellWithPalette>`). The command-palette "Navigate"
 * list and the visible sidebar / bottom tab bar render from the same
 * filtered manifest so they cannot drift.
 *
 * Domain filtering (from the JWT `domains` claim) happens here so no
 * shell or palette has to duplicate the logic.
 */

import {
  ADMIN_BUSINESS_SECTION,
  ADMIN_IT_SECTION,
  ADMIN_SHARED_SECTION,
  CREW_ROLE_SECTION,
  CREW_SHARED_SECTION,
  MANAGEMENT_DOMAIN_SECTION,
  MANAGEMENT_SHARED_SECTION,
  filterNavSections,
  type NavSection,
} from "./sidebar-config";
import { hasDomainAccess } from "./route-manifest";

export type { NavItem, NavSection } from "./sidebar-config";

export type NavManifest = Readonly<{
  portalName: string;
  sections: readonly NavSection[];
}>;

/**
 * Admin sidebar personas — frontend_spec.md §2 + §8a.
 *
 * The spec splits admin users into two personas:
 *   - **IT Admin** — any user with `it:c` (alt: `system:c`).
 *   - **Business Admin** — user with `booking:r` + `reports:r` AND no `it:c`.
 *
 * The seed migration grants every admin role every domain (init_schema
 * grants both `it_admin` and `business_admin` crud on all), so filtering
 * the IT + Business sections per-item shows both to everyone. The
 * exclusion is by role persona, not by per-item access, and §8a spells it
 * out with "no it:c". This builder enforces that exclusion.
 */
export function adminNavManifest(
  domains: Record<string, readonly string[]> | undefined,
): NavManifest {
  const isItAdmin = hasDomainAccess(domains, "it", "c") || hasDomainAccess(domains, "system", "c");
  const sectionsForPersona = isItAdmin
    ? [ADMIN_IT_SECTION, ADMIN_SHARED_SECTION]
    : [ADMIN_BUSINESS_SECTION, ADMIN_SHARED_SECTION];
  return {
    portalName: "Admin",
    sections: filterNavSections(sectionsForPersona, domains),
  };
}

export function managementNavManifest(
  domains: Record<string, readonly string[]> | undefined,
): NavManifest {
  return {
    portalName: "Management",
    sections: filterNavSections([MANAGEMENT_DOMAIN_SECTION, MANAGEMENT_SHARED_SECTION], domains),
  };
}

export function crewNavManifest(
  domains: Record<string, readonly string[]> | undefined,
): NavManifest {
  return {
    portalName: "Crew",
    sections: filterNavSections([CREW_ROLE_SECTION, CREW_SHARED_SECTION], domains),
  };
}
