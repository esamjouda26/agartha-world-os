import type { Database } from "@/types/database";

/**
 * Procurement domain types — narrow views over the generated `Database` types.
 * No hand-authored shapes; every row projection is derived from the source of
 * truth (`src/types/database.ts`).
 */

// ── Raw table row types ───────────────────────────────────────────────────

export type PurchaseOrder =
  Database["public"]["Tables"]["purchase_orders"]["Row"];
export type PurchaseOrderInsert =
  Database["public"]["Tables"]["purchase_orders"]["Insert"];

export type PurchaseOrderItem =
  Database["public"]["Tables"]["purchase_order_items"]["Row"];
export type PurchaseOrderItemInsert =
  Database["public"]["Tables"]["purchase_order_items"]["Insert"];

// ── Enum types ────────────────────────────────────────────────────────────

export type PoStatus = Database["public"]["Enums"]["po_status"];
export type MaterialType = Database["public"]["Enums"]["material_type"];

// ── RSC payload view types ────────────────────────────────────────────────

/**
 * A purchase order line item enriched with the material name for display.
 */
export type PoItemView = Readonly<{
  id: string;
  materialId: string;
  materialName: string;
  expectedQty: number;
  receivedQty: number | null;
  unitPrice: number;
}>;

/**
 * A receivable purchase order enriched with supplier name and line items,
 * surfaced to the PO receiving RSC.
 */
export type ReceivablePoRow = Readonly<{
  id: string;
  supplierId: string;
  supplierName: string;
  receivingLocationId: string;
  status: PoStatus | null;
  orderDate: string | null;
  expectedDeliveryDate: string | null;
  createdAt: string;
  items: ReadonlyArray<PoItemView>;
}>;

// ── Material list view types ──────────────────────────────────────────────

/** Material list row — projected from materials + categories + units + procurement + stock. */
export type MaterialRow = Readonly<{
  id: string;
  name: string;
  sku: string | null;
  materialType: string;
  categoryName: string | null;
  categoryId: string;
  baseUnitAbbreviation: string | null;
  baseUnitId: string;
  defaultSupplierName: string | null;
  defaultSupplierLeadTimeDays: number | null;
  onHand: number;
  reorderPoint: number;
  needsReorder: boolean;
  hasOpenPo: boolean;
  isActive: boolean;
}>;

/** KPI summary for the materials list page. */
export type MaterialKpis = Readonly<{
  needsOrderingCount: number;
  noSupplierCount: number;
  onOrderCount: number;
  avgLeadTimeDays: number | null;
}>;

/** Aggregated data for the materials list page. */
export type MaterialListData = Readonly<{
  materials: MaterialRow[];
  kpis: MaterialKpis;
  categories: ReadonlyArray<{ id: string; name: string }>;
}>;

// ── Material detail view types ────────────────────────────────────────

/** Core material profile — all columns from `materials` enriched with names. */
export type MaterialProfile = Readonly<{
  id: string;
  name: string;
  sku: string | null;
  barcode: string | null;
  materialType: string;
  categoryName: string | null;
  categoryId: string;
  baseUnitName: string | null;
  baseUnitAbbreviation: string | null;
  baseUnitId: string;
  reorderPoint: number;
  safetyStock: number;
  standardCost: number | null;
  valuationMethod: string;
  shelfLifeDays: number | null;
  storageConditions: string | null;
  weightKg: number | null;
  isReturnable: boolean;
  isActive: boolean;
  createdAt: string;
  updatedAt: string | null;
}>;

/** A supplier row for a specific material. */
export type MaterialSupplierRow = Readonly<{
  supplierId: string;
  supplierName: string;
  supplierSku: string | null;
  costPrice: number;
  purchaseUnitName: string | null;
  leadTimeDays: number;
  minOrderQty: number;
  isDefault: boolean;
}>;

/** Current stock from the `stock_balance_cache`. */
export type MaterialStockInfo = Readonly<{
  onHand: number;
  allocated: number;
  available: number;
  lastCountedAt: string | null;
}>;

/** UOM conversion row — material-specific or global. */
export type UomConversionRow = Readonly<{
  id: string;
  fromUnitName: string;
  fromUnitAbbreviation: string;
  toUnitName: string;
  toUnitAbbreviation: string;
  factor: number;
  isGlobal: boolean;
}>;

/** Aggregated data for the material detail page. */
export type MaterialDetailData = Readonly<{
  profile: MaterialProfile;
  suppliers: MaterialSupplierRow[];
  stock: MaterialStockInfo;
  uomConversions: UomConversionRow[];
  openPoCount: number;
  /** Reference data for form dropdowns */
  units: ReadonlyArray<{ id: string; name: string; abbreviation: string }>;
  allSuppliers: ReadonlyArray<{ id: string; name: string }>;
  categories: ReadonlyArray<{ id: string; name: string }>;
}>;

// ── Reorder dashboard types ───────────────────────────────────────────

/** A row from rpc_reorder_dashboard(). */
export type ReorderRow = Readonly<{
  materialId: string;
  materialName: string;
  materialSku: string | null;
  categoryId: string | null;
  categoryName: string | null;
  defaultSupplierId: string | null;
  defaultSupplierName: string | null;
  sellThrough30d: number;
  onHand: number;
  onOrder: number;
  effectiveStock: number;
  reorderPoint: number;
  reorderAmt: number;
  costPrice: number | null;
  purchaseUnitAbbr: string | null;
}>;

/** KPI summary for the reorder dashboard. */
export type ReorderKpis = Readonly<{
  belowReorderCount: number;
  estimatedOrderValue: number;
  suppliersAffected: number;
}>;

/** Aggregated data for the reorder dashboard page. */
export type ReorderDashboardData = Readonly<{
  rows: ReorderRow[];
  kpis: ReorderKpis;
  locations: ReadonlyArray<{ id: string; name: string }>;
  categories: ReadonlyArray<{ id: string; name: string }>;
}>;

// ── Purchase Order list view types ────────────────────────────────────

/**
 * PO status values — from `po_status` enum.
 * Spec: frontend_spec.md §3b `/management/procurement/purchase-orders`
 */
export const PO_STATUSES = [
  "draft",
  "sent",
  "partially_received",
  "completed",
  "cancelled",
] as const;

/** Human-readable labels for PO statuses. */
export const PO_STATUS_LABELS: Record<PoStatus, string> = {
  draft: "Draft",
  sent: "Sent",
  partially_received: "Receiving",
  completed: "Completed",
  cancelled: "Cancelled",
};

/** StatusBadge tone mapping for PO statuses. */
export const PO_STATUS_TONES: Record<
  PoStatus,
  "neutral" | "info" | "warning" | "success" | "accent"
> = {
  draft: "neutral",
  sent: "info",
  partially_received: "warning",
  completed: "success",
  cancelled: "neutral",
};

/**
 * Delivery status for a PO — derived from expected_delivery_date vs today.
 * Spec: "delivery status indicator (on-time / due soon / overdue)"
 */
export type DeliveryIndicator = "on_time" | "due_soon" | "overdue" | "none";

/** Purchase order row — projected for the list page. */
export type PurchaseOrderRow = Readonly<{
  id: string;
  supplierName: string;
  supplierId: string;
  status: PoStatus;
  orderDate: string | null;
  expectedDeliveryDate: string | null;
  receivingLocationName: string | null;
  itemCount: number;
  totalValue: number;
  deliveryIndicator: DeliveryIndicator;
  createdAt: string;
}>;

/** KPI summary for the PO list page. */
export type PurchaseOrderKpis = Readonly<{
  openPoValue: number;
  dueThisWeekCount: number;
  overdueCount: number;
}>;

/** Aggregated data for the purchase orders list page. */
export type PurchaseOrderListData = Readonly<{
  orders: PurchaseOrderRow[];
  kpis: PurchaseOrderKpis;
  statusCounts: Record<PoStatus, number>;
  suppliers: ReadonlyArray<{ id: string; name: string }>;
  locations: ReadonlyArray<{ id: string; name: string }>;
}>;

// ── Purchase Order detail view types ─────────────────────────────────

/**
 * PO line item — enriched with material name, unit abbreviation, photo.
 * Spec: "material name, expected_qty, received_qty (with progress bar),
 *        unit_price, line total, photo_proof_url"
 */
export type PODetailLineItem = Readonly<{
  id: string;
  materialId: string;
  materialName: string;
  expectedQty: number;
  receivedQty: number;
  unitPrice: number;
  lineTotal: number;
  unitAbbreviation: string | null;
  photoProofUrl: string | null;
}>;

/**
 * Receiving history row — goods movement that references this PO.
 * Spec: "goods_movements WHERE purchase_order_id = this PO,
 *        showing received_by, date, quantities per line"
 */
export type ReceivingHistoryRow = Readonly<{
  id: string;
  documentDate: string;
  receivedByName: string | null;
  items: ReadonlyArray<{
    materialName: string;
    quantity: number;
    unitAbbreviation: string;
  }>;
}>;

/** Full PO detail — aggregated data for the PO detail page. */
export type PODetailData = Readonly<{
  id: string;
  supplierName: string;
  supplierContactEmail: string | null;
  supplierContactPhone: string | null;
  status: PoStatus;
  orderDate: string | null;
  expectedDeliveryDate: string | null;
  receivingLocationName: string | null;
  notes: string | null;
  totalValue: number;
  createdAt: string;
  lineItems: PODetailLineItem[];
  receivingHistory: ReceivingHistoryRow[];
  /** Reference data for add-line-item form (draft only) */
  materials: ReadonlyArray<{ id: string; name: string; sku: string | null }>;
}>;


// ── Supplier list page types ─────────────────────────────────────────

/**
 * One row in the suppliers list.
 * Spec: "name, contact_email, contact_phone, is_active, material count,
 *        open POs (COUNT), last order date"
 */
export type SupplierRow = Readonly<{
  id: string;
  name: string;
  contactEmail: string | null;
  contactPhone: string | null;
  address: string | null;
  description: string | null;
  isActive: boolean;
  materialCount: number;
  openPoCount: number;
  lastOrderDate: string | null;
}>;

/**
 * KPI aggregates for the suppliers list.
 * Spec: "Active: {n}" | "Inactive: {n}" | "Open POs: {n}" | "Avg actual lead time: {days}"
 */
export type SupplierKpis = Readonly<{
  activeCount: number;
  inactiveCount: number;
  openPoCount: number;
  avgActualLeadTimeDays: number | null;
}>;

/** RSC payload for /management/procurement/suppliers. */
export type SupplierListData = Readonly<{
  suppliers: SupplierRow[];
  kpis: SupplierKpis;
}>;

// ── Supplier detail page types ───────────────────────────────────────

/**
 * A material linked to this supplier via `material_procurement_data`.
 * Spec: "material_procurement_data WHERE supplier_id = this supplier"
 */
export type SupplierMaterialRow = Readonly<{
  materialId: string;
  materialName: string;
  materialSku: string | null;
  supplierSku: string | null;
  costPrice: number;
  leadTimeDays: number;
  minOrderQty: number;
  isDefault: boolean;
}>;

/**
 * A PO linked to this supplier for the history section.
 * Spec: "purchase_orders WHERE supplier_id ORDER BY order_date DESC"
 */
export type SupplierPoHistoryRow = Readonly<{
  id: string;
  status: PoStatus;
  orderDate: string | null;
  expectedDeliveryDate: string | null;
  totalValue: number;
  itemCount: number;
  receivingLocationName: string | null;
}>;

/** Full supplier detail — RSC payload for /management/procurement/suppliers/[id]. */
export type SupplierDetailData = Readonly<{
  id: string;
  name: string;
  contactEmail: string | null;
  contactPhone: string | null;
  address: string | null;
  description: string | null;
  isActive: boolean;
  createdAt: string;
  materials: SupplierMaterialRow[];
  poHistory: SupplierPoHistoryRow[];
}>;

// ── /management/categories shared page types (cross-domain procurement+pos)

/**
 * Flat row from `material_categories` enriched for the tree view.
 * Spec: frontend_spec.md §3d.
 */
export type MaterialCategoryRow = Readonly<{
  id: string;
  parentId: string | null;
  code: string;
  name: string;
  depth: number;
  /** Dotted ltree path, e.g. "food.beverages". */
  path: string;
  isBomEligible: boolean;
  isConsumable: boolean;
  defaultValuation: string | null;
  accountingCategory: string | null;
  sortOrder: number;
  isActive: boolean;
}>;

/**
 * (location_id, category_id) junction row joined with the location's name.
 */
export type LocationAllowedCategoryRow = Readonly<{
  locationId: string;
  locationName: string;
  categoryId: string;
}>;

/** Slim location row used by the location-categories junction picker. */
export type LocationOptionRow = Readonly<{
  id: string;
  name: string;
}>;

/** RSC payload for `/management/categories`. */
export type MaterialCategoriesPageData = Readonly<{
  categories: ReadonlyArray<MaterialCategoryRow>;
  locations: ReadonlyArray<LocationOptionRow>;
  locationCategories: ReadonlyArray<LocationAllowedCategoryRow>;
}>;

// ── /management/uom + /admin/it/uom shared page types ────────────────────

/**
 * One row from `uom_conversions` enriched with material name + unit
 * abbreviations. `isGlobal === true` when `material_id IS NULL` (applies
 * to all materials).
 */
export type UomConversionListRow = Readonly<{
  id: string;
  materialId: string | null;
  materialName: string | null;
  fromUnitId: string;
  fromUnitName: string;
  fromUnitAbbreviation: string;
  toUnitId: string;
  toUnitName: string;
  toUnitAbbreviation: string;
  factor: number;
  isGlobal: boolean;
}>;

/** RSC payload for `/management/uom` and `/admin/it/uom`. */
export type UomConversionsPageData = Readonly<{
  conversions: ReadonlyArray<UomConversionListRow>;
  /** Slim materials list for the form's optional material picker. */
  materials: ReadonlyArray<{ id: string; name: string; sku: string | null }>;
  /** All units for from/to pickers. */
  units: ReadonlyArray<{ id: string; name: string; abbreviation: string }>;
}>;
