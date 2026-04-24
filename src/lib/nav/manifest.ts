import { nav as announcementsNav } from "@/features/announcements/nav";
import { nav as attendanceNav } from "@/features/attendance/nav";
import { nav as bookingNav } from "@/features/booking/nav";
import { nav as auditNav } from "@/features/audit/nav";
import { nav as hrNav } from "@/features/hr/nav";
import { nav as inventoryNav } from "@/features/inventory/nav";
import { nav as maintenanceNav } from "@/features/maintenance/nav";
import { nav as marketingNav } from "@/features/marketing/nav";
import { nav as operationsNav } from "@/features/operations/nav";
import { nav as procurementNav } from "@/features/procurement/nav";
import { nav as iamNav } from "@/features/iam/nav";
import { nav as incidentsNav } from "@/features/incidents/nav";
import { nav as itNav } from "@/features/it/nav";
import { nav as posNav } from "@/features/pos/nav";
import { nav as reportsNav } from "@/features/reports/nav";
import { nav as settingsNav } from "@/features/settings/nav";
import { nav as staffingNav } from "@/features/staffing/nav";
import { nav as orgUnitsNav } from "@/features/org-units/nav";
import { nav as permissionsNav } from "@/features/permissions/nav";
import { nav as businessNav } from "@/features/business/nav";
import { nav as unitsNav } from "@/features/units/nav";
import { nav as zonesNav } from "@/features/zones/nav";

import type { FeatureNav } from "./types";

/**
 * Nav aggregator. Imports ONLY from each feature's `nav.ts` — never
 * from any `rbac.ts` or from `src/lib/rbac/**`. This file is imported
 * from server components (portal layouts) and the client command
 * palette.
 *
 * The ESLint `no-restricted-imports` rule forbids middleware.ts from
 * importing anything under `src/lib/nav/**`, which prevents icon names
 * and i18n keys from reaching the Edge bundle.
 *
 * Single source of truth per ADR-0004: a route appears in the sidebar
 * only when its feature folder lands a `nav.ts`. Unimplemented routes
 * never surface in the UI.
 */
export const FEATURE_NAV: readonly FeatureNav[] = [
  attendanceNav,
  announcementsNav,
  auditNav,
  bookingNav,
  hrNav,
  iamNav,
  incidentsNav,
  inventoryNav,
  maintenanceNav,
  marketingNav,
  operationsNav,
  itNav,
  posNav,
  procurementNav,
  reportsNav,
  settingsNav,
  staffingNav,
  zonesNav,
  orgUnitsNav,
  permissionsNav,
  unitsNav,
  businessNav,
] as const;
