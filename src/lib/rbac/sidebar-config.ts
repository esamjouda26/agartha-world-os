import type { Route } from "next";

import { hasDomainAccess, type DomainAccess } from "./route-manifest";

/**
 * Sidebar / BottomTabBar entries by portal — mirrors frontend_spec.md §8.
 * Each item declares either a domain+access pair (visibility gate) or
 * `alwaysVisible: true` (shared routes like Settings, Attendance).
 *
 * Ordering matters: crew bottom-tab bar renders role-specific items first
 * so the primary job action lands on the visible bar (§8c).
 *
 * hrefs are typed as `Route` at consumption time (see `toRoute` below). In
 * Phase 3 only a handful of destination routes exist, so `typedRoutes: true`
 * would reject most literals. The `toRoute` cast is intentional and gets
 * narrower automatically as Phase 4-9 lands the real routes.
 */

type VisibilityCheck = { alwaysVisible: true } | { domain: string; access: DomainAccess };

export type NavItem = Readonly<{
  id: string;
  labelKey: string;
  /** Fallback label used when `labelKey` has no translation. */
  label: string;
  href: Route;
  iconName: string;
}> &
  VisibilityCheck;

// TODO(phase-9): drop this helper once every sidebar route has a page file.
const toRoute = (path: string): Route => path as Route;

export type NavSection = Readonly<{
  id: string;
  labelKey: string;
  label: string;
  items: readonly NavItem[];
}>;

// ── Admin sidebar — §8a ─────────────────────────────────────────────
export const ADMIN_IT_SECTION: NavSection = {
  id: "it",
  labelKey: "nav.admin.it",
  label: "IT",
  items: [
    {
      id: "admin-it",
      labelKey: "nav.admin.dashboard",
      label: "Dashboard",
      href: toRoute("/admin/it"),
      iconName: "LayoutDashboard",
      domain: "it",
      access: "c",
    },
    {
      id: "admin-iam",
      labelKey: "nav.admin.iam",
      label: "IAM Ledger",
      href: toRoute("/admin/iam"),
      iconName: "ScrollText",
      domain: "hr",
      access: "c",
    },
    {
      id: "admin-devices",
      labelKey: "nav.admin.devices",
      label: "Devices",
      href: toRoute("/admin/devices"),
      iconName: "Monitor",
      domain: "it",
      access: "c",
    },
    {
      id: "admin-system-health",
      labelKey: "nav.admin.systemHealth",
      label: "System Health",
      href: toRoute("/admin/system-health"),
      iconName: "Activity",
      domain: "it",
      access: "c",
    },
    {
      id: "admin-zones",
      labelKey: "nav.admin.zones",
      label: "Zones & Locations",
      href: toRoute("/admin/zones"),
      iconName: "MapPin",
      domain: "system",
      access: "c",
    },
    {
      id: "admin-org-units",
      labelKey: "nav.admin.orgUnits",
      label: "Org Units",
      href: toRoute("/admin/org-units"),
      iconName: "Boxes",
      domain: "system",
      access: "c",
    },
    {
      id: "admin-permissions",
      labelKey: "nav.admin.permissions",
      label: "Permissions",
      href: toRoute("/admin/permissions"),
      iconName: "ShieldCheck",
      domain: "system",
      access: "c",
    },
    {
      id: "admin-units",
      labelKey: "nav.admin.units",
      label: "Units of Measure",
      href: toRoute("/admin/units"),
      iconName: "Ruler",
      domain: "system",
      access: "c",
    },
  ],
};

export const ADMIN_BUSINESS_SECTION: NavSection = {
  id: "business",
  labelKey: "nav.admin.business",
  label: "Business",
  items: [
    {
      id: "admin-business",
      labelKey: "nav.admin.dashboard",
      label: "Dashboard",
      href: toRoute("/admin/business"),
      iconName: "LayoutDashboard",
      domain: "booking",
      access: "r",
    },
    {
      id: "admin-revenue",
      labelKey: "nav.admin.revenue",
      label: "Revenue",
      href: toRoute("/admin/revenue"),
      iconName: "LineChart",
      domain: "booking",
      access: "r",
    },
    {
      id: "admin-operations",
      labelKey: "nav.admin.operations",
      label: "Operations",
      href: toRoute("/admin/operations"),
      iconName: "Settings",
      domain: "ops",
      access: "r",
    },
    {
      id: "admin-costs",
      labelKey: "nav.admin.costs",
      label: "Costs",
      href: toRoute("/admin/costs"),
      iconName: "Wallet",
      domain: "inventory",
      access: "r",
    },
    {
      id: "admin-guests",
      labelKey: "nav.admin.guests",
      label: "Guests",
      href: toRoute("/admin/guests"),
      iconName: "Users",
      domain: "reports",
      access: "r",
    },
    {
      id: "admin-workforce",
      labelKey: "nav.admin.workforce",
      label: "Workforce",
      href: toRoute("/admin/workforce"),
      iconName: "Users",
      domain: "hr",
      access: "r",
    },
  ],
};

export const ADMIN_SHARED_SECTION: NavSection = {
  id: "shared",
  labelKey: "nav.admin.shared",
  label: "Shared",
  items: [
    {
      id: "admin-reports",
      labelKey: "nav.admin.reports",
      label: "Reports",
      href: toRoute("/admin/reports"),
      iconName: "FileText",
      domain: "reports",
      access: "r",
    },
    {
      id: "admin-audit",
      labelKey: "nav.admin.audit",
      label: "Audit Log",
      href: toRoute("/admin/audit"),
      iconName: "History",
      domain: "reports",
      access: "r",
    },
    {
      id: "admin-announcements",
      labelKey: "nav.admin.announcements",
      label: "Announcements",
      href: toRoute("/admin/announcements"),
      iconName: "Megaphone",
      domain: "comms",
      access: "r",
    },
    {
      id: "admin-attendance",
      labelKey: "nav.admin.attendance",
      label: "Attendance",
      href: toRoute("/admin/attendance"),
      iconName: "Clock",
      domain: "hr",
      access: "c",
    },
    {
      id: "admin-settings",
      labelKey: "nav.admin.settings",
      label: "Settings",
      href: toRoute("/admin/settings"),
      iconName: "Settings",
      alwaysVisible: true,
    },
  ],
};

// ── Management sidebar — §8b ────────────────────────────────────────
export const MANAGEMENT_DOMAIN_SECTION: NavSection = {
  id: "domains",
  labelKey: "nav.mgmt.domains",
  label: "Domains",
  items: [
    {
      id: "mgmt-hr",
      labelKey: "nav.mgmt.hr",
      label: "HR",
      href: toRoute("/management/hr"),
      iconName: "Users",
      domain: "hr",
      access: "c",
    },
    {
      id: "mgmt-pos",
      labelKey: "nav.mgmt.pos",
      label: "POS",
      href: toRoute("/management/pos"),
      iconName: "CreditCard",
      domain: "pos",
      access: "c",
    },
    {
      id: "mgmt-inventory",
      labelKey: "nav.mgmt.inventory",
      label: "Inventory",
      href: toRoute("/management/inventory"),
      iconName: "Boxes",
      domain: "inventory",
      access: "c",
    },
    {
      id: "mgmt-procurement",
      labelKey: "nav.mgmt.procurement",
      label: "Procurement",
      href: toRoute("/management/procurement"),
      iconName: "ShoppingCart",
      domain: "procurement",
      access: "c",
    },
    {
      id: "mgmt-operations",
      labelKey: "nav.mgmt.operations",
      label: "Operations",
      href: toRoute("/management/operations/incidents"),
      iconName: "Settings",
      domain: "ops",
      access: "c",
    },
    {
      id: "mgmt-maintenance",
      labelKey: "nav.mgmt.maintenance",
      label: "Maintenance",
      href: toRoute("/management/maintenance/orders"),
      iconName: "Wrench",
      domain: "maintenance",
      access: "c",
    },
    {
      id: "mgmt-marketing",
      labelKey: "nav.mgmt.marketing",
      label: "Marketing",
      href: toRoute("/management/marketing/campaigns"),
      iconName: "Megaphone",
      domain: "marketing",
      access: "c",
    },
  ],
};

export const MANAGEMENT_SHARED_SECTION: NavSection = {
  id: "shared",
  labelKey: "nav.mgmt.shared",
  label: "Shared",
  items: [
    {
      id: "mgmt-reports",
      labelKey: "nav.mgmt.reports",
      label: "Reports",
      href: toRoute("/management/reports"),
      iconName: "FileText",
      domain: "reports",
      access: "r",
    },
    {
      id: "mgmt-audit",
      labelKey: "nav.mgmt.audit",
      label: "Audit Log",
      href: toRoute("/management/audit"),
      iconName: "History",
      domain: "reports",
      access: "r",
    },
    {
      id: "mgmt-announcements",
      labelKey: "nav.mgmt.announcements",
      label: "Announcements",
      href: toRoute("/management/announcements"),
      iconName: "Megaphone",
      domain: "comms",
      access: "r",
    },
    {
      id: "mgmt-attendance",
      labelKey: "nav.mgmt.attendance",
      label: "Attendance",
      href: toRoute("/management/attendance"),
      iconName: "Clock",
      domain: "hr",
      access: "c",
    },
    {
      id: "mgmt-staffing",
      labelKey: "nav.mgmt.staffing",
      label: "Staffing",
      href: toRoute("/management/staffing"),
      iconName: "UsersRound",
      domain: "hr",
      access: "r",
    },
    {
      id: "mgmt-settings",
      labelKey: "nav.mgmt.settings",
      label: "Settings",
      href: toRoute("/management/settings"),
      iconName: "Settings",
      alwaysVisible: true,
    },
  ],
};

// ── Crew nav — §8c ──────────────────────────────────────────────────
export const CREW_ROLE_SECTION: NavSection = {
  id: "role",
  labelKey: "nav.crew.role",
  label: "Your job",
  items: [
    {
      id: "crew-pos",
      labelKey: "nav.crew.pos",
      label: "POS Terminal",
      href: toRoute("/crew/pos"),
      iconName: "CreditCard",
      domain: "pos",
      access: "c",
    },
    {
      id: "crew-active-orders",
      labelKey: "nav.crew.activeOrders",
      label: "Active Orders",
      href: toRoute("/crew/active-orders"),
      iconName: "Receipt",
      domain: "pos",
      access: "r",
    },
    {
      id: "crew-entry-validation",
      labelKey: "nav.crew.entry",
      label: "Entry Validation",
      href: toRoute("/crew/entry-validation"),
      iconName: "QrCode",
      domain: "booking",
      access: "r",
    },
    {
      id: "crew-restock",
      labelKey: "nav.crew.restock",
      label: "Restock",
      href: toRoute("/crew/restock"),
      iconName: "Package",
      domain: "inventory_ops",
      access: "c",
    },
    {
      id: "crew-logistics",
      labelKey: "nav.crew.logistics",
      label: "Logistics",
      href: toRoute("/crew/logistics/restock-queue"),
      iconName: "Truck",
      domain: "inventory_ops",
      access: "c",
    },
    {
      id: "crew-disposals",
      labelKey: "nav.crew.disposals",
      label: "Waste",
      href: toRoute("/crew/disposals"),
      iconName: "Trash2",
      domain: "inventory_ops",
      access: "c",
    },
    {
      id: "crew-maintenance",
      labelKey: "nav.crew.workOrders",
      label: "Work Orders",
      href: toRoute("/crew/maintenance/orders"),
      iconName: "Wrench",
      domain: "maintenance",
      access: "c",
    },
  ],
};

export const CREW_SHARED_SECTION: NavSection = {
  id: "shared",
  labelKey: "nav.crew.shared",
  label: "Everyone",
  items: [
    {
      id: "crew-attendance",
      labelKey: "nav.crew.attendance",
      label: "Attendance",
      href: toRoute("/crew/attendance"),
      iconName: "Clock",
      domain: "hr",
      access: "c",
    },
    {
      id: "crew-schedule",
      labelKey: "nav.crew.schedule",
      label: "Schedule",
      href: toRoute("/crew/schedule"),
      iconName: "CalendarDays",
      domain: "hr",
      access: "r",
    },
    {
      id: "crew-leave",
      labelKey: "nav.crew.leave",
      label: "Leave",
      href: toRoute("/crew/leave"),
      iconName: "CalendarOff",
      domain: "hr",
      access: "c",
    },
    {
      id: "crew-incidents",
      labelKey: "nav.crew.incidents",
      label: "Incidents",
      href: toRoute("/crew/incidents"),
      iconName: "Siren",
      domain: "ops",
      access: "c",
    },
    {
      id: "crew-zone-scan",
      labelKey: "nav.crew.zoneScan",
      label: "Zone Scan",
      href: toRoute("/crew/zone-scan"),
      iconName: "ScanLine",
      alwaysVisible: true,
    },
    {
      id: "crew-feedback",
      labelKey: "nav.crew.feedback",
      label: "Feedback",
      href: toRoute("/crew/feedback"),
      iconName: "MessageCircle",
      alwaysVisible: true,
    },
    {
      id: "crew-announcements",
      labelKey: "nav.crew.announcements",
      label: "Announcements",
      href: toRoute("/crew/announcements"),
      iconName: "Megaphone",
      domain: "comms",
      access: "r",
    },
    {
      id: "crew-settings",
      labelKey: "nav.crew.settings",
      label: "Settings",
      href: toRoute("/crew/settings"),
      iconName: "Settings",
      alwaysVisible: true,
    },
  ],
};

export function filterNavItems(
  items: readonly NavItem[],
  domains: Record<string, readonly string[]> | undefined,
): readonly NavItem[] {
  return items.filter((item) => {
    if ("alwaysVisible" in item && item.alwaysVisible) return true;
    if ("domain" in item) return hasDomainAccess(domains, item.domain, item.access);
    return false;
  });
}

export function filterNavSections(
  sections: readonly NavSection[],
  domains: Record<string, readonly string[]> | undefined,
): readonly NavSection[] {
  return sections
    .map((section) => ({ ...section, items: filterNavItems(section.items, domains) }))
    .filter((section) => section.items.length > 0);
}
