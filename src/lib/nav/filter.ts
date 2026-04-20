import type { Route } from "next";

import type { AccessLevel, DomainAccess, Portal } from "@/lib/rbac/types";

import { FEATURE_NAV } from "./manifest";
import { NAV_SECTIONS, findSection } from "./sections";
import type { FeatureNavItem, NavItem, NavManifest, NavSection } from "./types";

/**
 * Filters every feature's nav items for a given user, grouping them into
 * the portal's canonical sections. This is the single entry point for
 * portal layouts and the command palette — no layout should touch
 * `FEATURE_NAV` directly.
 *
 * Shape compatibility: the returned `NavManifest` is byte-identical to
 * what `adminNavManifest` / `managementNavManifest` / `crewNavManifest`
 * used to emit. The shell and command palette continue to work without
 * changes.
 */
export function filterNavForUser(
  portal: Portal,
  accessLevel: AccessLevel,
  domains: Record<string, readonly string[]> | undefined,
): NavManifest {
  const visible = FEATURE_NAV.flatMap((f) => f.items)
    .filter((item) => item.portal === portal)
    .filter((item) => !isExcludedByAccessLevel(item, accessLevel))
    .filter((item) => !isExcludedByDomain(item, domains))
    .filter((item) => meetsRequires(item, domains));

  const sections = buildSections(portal, visible);
  return {
    portalName: portalDisplayName(portal),
    sections,
  };
}

/**
 * Picks the first visible nav item whose `path` is a candidate for a
 * landing redirect. Replaces the legacy `filterNavItems(section.items, domains)[0]`
 * usage in `src/app/[locale]/(management)/management/page.tsx`.
 */
export function firstAccessiblePath(
  manifest: NavManifest,
  options?: Readonly<{ excludeSectionId?: string }>,
): Route | null {
  for (const section of manifest.sections) {
    if (options?.excludeSectionId && section.id === options.excludeSectionId) {
      continue;
    }
    const first = section.items[0];
    if (first) return first.href;
  }
  return null;
}

function meetsRequires(
  item: FeatureNavItem,
  domains: Record<string, readonly string[]> | undefined,
): boolean {
  if (!item.requires) return true; // always-visible shared items
  return holdsDomain(domains, item.requires.domain, item.requires.access);
}

function isExcludedByAccessLevel(item: FeatureNavItem, accessLevel: AccessLevel): boolean {
  if (!item.excludeWhenAccessLevel) return false;
  return item.excludeWhenAccessLevel.includes(accessLevel);
}

function isExcludedByDomain(
  item: FeatureNavItem,
  domains: Record<string, readonly string[]> | undefined,
): boolean {
  if (!item.excludeWhenHoldsAnyDomain) return false;
  return item.excludeWhenHoldsAnyDomain.some((req) => holdsDomain(domains, req.domain, req.access));
}

function holdsDomain(
  domains: Record<string, readonly string[]> | undefined,
  domain: string,
  access: DomainAccess,
): boolean {
  if (!domains) return false;
  const tiers = domains[domain];
  return Array.isArray(tiers) && tiers.includes(access);
}

function buildSections(portal: Portal, items: readonly FeatureNavItem[]): readonly NavSection[] {
  // Bucket items by section-id, preserving the canonical section order
  // from `NAV_SECTIONS`. Sections with zero items after filtering are
  // omitted (matches legacy `filterNavSections` behavior).
  const buckets = new Map<string, FeatureNavItem[]>();
  for (const item of items) {
    const spec = findSection(portal, item.section);
    if (!spec) {
      throw new Error(
        `Unknown section "${item.section}" for portal "${portal}" on nav item "${item.id}". Register the section in src/lib/nav/sections.ts or fix the item.`,
      );
    }
    const bucket = buckets.get(item.section) ?? [];
    bucket.push(item);
    buckets.set(item.section, bucket);
  }

  const portalSections = NAV_SECTIONS.filter((s) => s.portal === portal)
    .slice()
    .sort((a, b) => a.order - b.order);

  const result: NavSection[] = [];
  for (const spec of portalSections) {
    const bucket = buckets.get(spec.id);
    if (!bucket || bucket.length === 0) continue;
    const sorted = bucket.slice().sort((a, b) => a.order - b.order);
    result.push({
      id: spec.id,
      labelKey: spec.labelKey,
      label: spec.label,
      items: sorted.map(toConsumerNavItem),
    });
  }
  return result;
}

function toConsumerNavItem(item: FeatureNavItem): NavItem {
  return {
    id: item.id,
    labelKey: item.labelKey,
    label: item.label,
    href: item.path as Route,
    iconName: item.iconName,
  };
}

function portalDisplayName(portal: Portal): string {
  switch (portal) {
    case "admin":
      return "Admin";
    case "management":
      return "Management";
    case "crew":
      return "Crew";
  }
}
