/**
 * Audit feature constants — single source of truth for:
 *   1. Entity-type → domain ownership (drives `allowedEntityTypes` filter).
 *   2. Entity-type → display label (humanized "Staff Record" vs raw `staff_records`).
 *   3. Entity-type → route template (powers the record-link deep-link).
 *   4. Restricted column patterns (mask values per CLAUDE.md §2 / §15).
 *
 * Spec anchor: frontend_spec.md §6 · DomainAuditTable (lines 4236-4280).
 */

// DB values come from the `audit_trigger_fn()` which writes `lower(TG_OP)`
// ([init_schema.sql:242](../../../supabase/migrations/20260417064731_init_schema.sql#L242)).
// Mirror the casing exactly so Zod + `.eq("action", …)` both match.
export type AuditAction = "insert" | "update" | "delete";

export const AUDIT_ACTIONS: readonly AuditAction[] = ["insert", "update", "delete"] as const;

export const AUDIT_ACTION_LABEL: Readonly<Record<AuditAction, string>> = {
  insert: "Created",
  update: "Updated",
  delete: "Deleted",
};

/**
 * Entity-type → owning-domain(s) map. Mirrors spec line 4259-4266 plus a
 * `system` bucket for admin-only tables (roles / org_units / locations /
 * shift_types / permission tables). Managers don't see the `system`
 * bucket unless they hold `system:r` — most managers do, per the seed.
 *
 * A user sees an `entity_type` iff they hold `r` access on at least
 * one of its owning domains. Admins (who hold every domain with full
 * CRUD per [init_schema.sql:649-654](../../../supabase/migrations/20260417064731_init_schema.sql#L649))
 * naturally see every type.
 */
export const ENTITY_DOMAINS: Readonly<Record<string, readonly string[]>> = {
  // HR
  staff_records: ["hr"],
  profiles: ["hr"],
  iam_requests: ["hr"],
  leave_requests: ["hr"],
  leave_ledger: ["hr"],
  timecard_punches: ["hr"],
  attendance_exceptions: ["hr"],
  shift_schedules: ["hr"],
  // POS
  material_sales_data: ["pos"],
  orders: ["pos"],
  bom_components: ["pos"],
  order_items: ["pos"],
  pos_points: ["pos"],
  // Procurement
  purchase_orders: ["procurement", "inventory", "inventory_ops"],
  suppliers: ["procurement"],
  material_procurement_data: ["procurement"],
  // Inventory
  materials: ["inventory", "inventory_ops"],
  stock_balance_cache: ["inventory", "inventory_ops"],
  goods_movements: ["inventory", "inventory_ops"],
  write_offs: ["inventory", "inventory_ops"],
  // Ops + Maintenance (both groups see incidents + maintenance_orders)
  incidents: ["ops", "maintenance"],
  maintenance_orders: ["ops", "maintenance"],
  vehicles: ["ops"],
  time_slots: ["ops", "booking"],
  experiences: ["ops", "booking"],
  devices: ["maintenance"],
  // Marketing
  promo_codes: ["marketing"],
  campaigns: ["marketing"],
  // System (admin-only scope; included so admins see these rows)
  roles: ["system"],
  org_units: ["system"],
  locations: ["system"],
  shift_types: ["hr"],
  permission_domains: ["system"],
  role_domain_permissions: ["system"],
};

/** Reverse helper — all known entity types in the audit surface. */
export const KNOWN_ENTITY_TYPES: readonly string[] = Object.keys(ENTITY_DOMAINS);

/**
 * Entity-type → display label. Humanized per spec line 4246.
 * Unknown types fall back to `entity_type.replace(/_/g, " ")` + title-case.
 */
export const ENTITY_LABEL: Readonly<Record<string, string>> = {
  staff_records: "Staff record",
  profiles: "Profile",
  iam_requests: "IAM request",
  leave_requests: "Leave request",
  leave_ledger: "Leave ledger entry",
  timecard_punches: "Timecard punch",
  attendance_exceptions: "Attendance exception",
  shift_schedules: "Shift schedule",
  material_sales_data: "Sales material",
  orders: "POS order",
  bom_components: "BOM component",
  order_items: "Order item",
  pos_points: "POS point",
  purchase_orders: "Purchase order",
  suppliers: "Supplier",
  material_procurement_data: "Procurement material",
  materials: "Material",
  stock_balance_cache: "Stock balance",
  goods_movements: "Goods movement",
  write_offs: "Write-off",
  incidents: "Incident",
  maintenance_orders: "Maintenance order",
  vehicles: "Vehicle",
  time_slots: "Time slot",
  experiences: "Experience",
  devices: "Device",
  promo_codes: "Promo code",
  campaigns: "Campaign",
  roles: "Role",
  org_units: "Org unit",
  locations: "Location",
  shift_types: "Shift type",
  permission_domains: "Permission domain",
  role_domain_permissions: "Role permission grant",
};

export function humanizeEntityType(entityType: string): string {
  return (
    ENTITY_LABEL[entityType] ??
    entityType.replace(/_/g, " ").replace(/\b\w/g, (c) => c.toUpperCase())
  );
}

/**
 * Entity-type → route template. `[id]` is replaced at render time with
 * the audit row's `entity_id`. Returns null for entity types with no
 * dedicated detail page — those render as plain text.
 *
 * Route paths below are the expected Phase 6/7 admin + management
 * targets. Rendering them now as `<Link>` means the deep-links light
 * up automatically as each Phase 6/7 route lands. Stale links 404
 * cleanly — acceptable for audit because the record-link is
 * supplementary; the row data is still readable.
 */
export const ENTITY_ROUTE_TEMPLATE: Readonly<Record<string, string | null>> = {
  // HR
  staff_records: "/admin/iam/[id]",
  profiles: "/admin/iam/[id]",
  iam_requests: "/admin/iam?request=[id]",
  leave_requests: "/management/hr/attendance/leaves?focus=[id]",
  leave_ledger: null,
  timecard_punches: "/management/hr/attendance/ledger?focus=[id]",
  attendance_exceptions: "/management/hr/attendance/queue?focus=[id]",
  shift_schedules: "/management/hr/schedules?focus=[id]",
  // POS
  material_sales_data: "/management/pos/catalog?focus=[id]",
  orders: "/management/pos/orders/[id]",
  bom_components: "/management/pos/bom?focus=[id]",
  order_items: "/management/pos/orders?item=[id]",
  pos_points: "/admin/units?focus=[id]",
  // Procurement
  purchase_orders: "/management/procurement/po/[id]",
  suppliers: "/management/procurement/suppliers/[id]",
  material_procurement_data: "/management/procurement/catalog?focus=[id]",
  // Inventory
  materials: "/management/inventory/catalog?focus=[id]",
  stock_balance_cache: "/management/inventory/stock?focus=[id]",
  goods_movements: "/management/inventory/movements?focus=[id]",
  write_offs: "/management/inventory/disposals?focus=[id]",
  // Ops + Maintenance
  incidents: "/management/operations/incidents?focus=[id]",
  maintenance_orders: "/management/maintenance/orders/[id]",
  vehicles: "/management/operations/vehicles/[id]",
  time_slots: "/management/operations/scheduler?focus=[id]",
  experiences: "/management/operations/experiences/[id]",
  devices: "/admin/devices/[id]",
  // Marketing
  promo_codes: "/management/marketing/promos?focus=[id]",
  campaigns: "/management/marketing/campaigns/[id]",
  // System (admin)
  roles: "/admin/permissions?role=[id]",
  org_units: "/admin/org-units?focus=[id]",
  locations: "/admin/units?focus=[id]",
  shift_types: "/admin/units?focus=[id]",
  permission_domains: null,
  role_domain_permissions: null,
};

/** Resolve an audit row into a record-link href, or null if no route. */
export function resolveEntityLink(entityType: string, entityId: string | null): string | null {
  if (!entityId) return null;
  const template = ENTITY_ROUTE_TEMPLATE[entityType];
  if (!template) return null;
  return template.replace("[id]", encodeURIComponent(entityId));
}

/**
 * Restricted column patterns — per CLAUDE.md §2 "Data Classification"
 * and §15 "Compliance". Any JSONB key matching one of these gets
 * redacted to `[restricted]` in the diff view. Applied client-side
 * because the `audit_trigger_fn` captures raw column values without
 * classification-awareness.
 *
 * Redaction list (lowercase match):
 *   - Suffix `_enc` (pgsodium-encrypted columns)
 *   - Exact: password, password_hash, refresh_token, access_token, token
 *   - Prefix: biometric_, national_id_, salary_, bank_account_
 *
 * Expand as new restricted columns land in migrations.
 */
const RESTRICTED_SUFFIXES = ["_enc"] as const;
const RESTRICTED_EXACT = [
  "password",
  "password_hash",
  "refresh_token",
  "access_token",
  "token",
  "otp_code",
  "otp_hash",
] as const;
const RESTRICTED_PREFIXES = [
  "biometric_",
  "national_id",
  "salary",
  "bank_account",
  "bank_name",
  "address",
  "personal_email",
  "phone",
  "kin_",
] as const;

export function isRestrictedColumn(columnName: string): boolean {
  const key = columnName.toLowerCase();
  if (RESTRICTED_EXACT.includes(key as (typeof RESTRICTED_EXACT)[number])) return true;
  if (RESTRICTED_SUFFIXES.some((s) => key.endsWith(s))) return true;
  if (RESTRICTED_PREFIXES.some((p) => key.startsWith(p))) return true;
  return false;
}

export const RESTRICTED_MASK = "[restricted]" as const;

/** Default page size for keyset-paginated queries. The actual page size
 *  is caller-controlled via the `pageSize` URL param (validated against
 *  `AUDIT_PAGE_SIZES` in `schemas/filters.ts`). */
export const AUDIT_PAGE_SIZE = 10;
