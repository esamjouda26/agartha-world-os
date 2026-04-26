/**
 * POS management-portal types.
 *
 * Narrow read-projections for management RSC pages.
 * Source: supabase/migrations/20260417064731_init_schema.sql (pos_points,
 * display_categories, material_sales_data, bill_of_materials, bom_components,
 * price_lists, price_list_items, pos_modifier_groups, pos_modifier_options,
 * material_modifier_groups, orders, order_items, order_item_modifiers)
 * + supabase/migrations/20260418000000_phase2_security_additions.sql
 *   (v_pos_point_today_stats)
 */

// ── POS Points list (/management/pos) ───────────────────────────────────

export type PosPointRow = Readonly<{
  id: string;
  name: string;
  displayName: string;
  locationId: string;
  locationName: string | null;
  isActive: boolean;
  /** integer cents — DB NUMERIC(12,2) × 100 */
  orderCountToday: number;
  revenueToday: number;
  lastOrderAt: string | null;
  createdAt: string;
}>;

export type PosPointsKpis = Readonly<{
  activeCount: number;
  totalCount: number;
  ordersToday: number;
  /** integer cents */
  revenueToday: number;
}>;

export type PosPointsData = Readonly<{
  rows: ReadonlyArray<PosPointRow>;
  kpis: PosPointsKpis;
  locations: ReadonlyArray<{ id: string; name: string }>;
}>;

// ── POS Point detail (/management/pos/[id]) ─────────────────────────────

export type CatalogRow = Readonly<{
  // No id column — composite PK is (material_id, pos_point_id)
  // init_schema.sql:2178
  materialId: string;
  materialName: string;
  displayName: string | null;
  /** integer cents */
  sellingPrice: number;
  displayCategoryId: string | null;
  displayCategoryName: string | null;
  imageUrl: string | null;
  allergens: string | null;
  sortOrder: number;
  isActive: boolean;
  /** integer cents, last 7 days */
  soldLast7d: number;
  /** integer cents */
  revenueLast7d: number;
}>;

export type DisplayCategoryRow = Readonly<{
  id: string;
  name: string;
  sortOrder: number;
}>;

export type BomPreviewRow = Readonly<{
  bomId: string;
  parentMaterialId: string;
  componentMaterialId: string;
  componentMaterialName: string;
  quantity: number;
  scrapPct: number;
  isPhantom: boolean;
  sortOrder: number;
}>;

export type PosPointDetailData = Readonly<{
  posPoint: { id: string; name: string; displayName: string; locationName: string | null; isActive: boolean };
  catalog: ReadonlyArray<CatalogRow>;
  displayCategories: ReadonlyArray<DisplayCategoryRow>;
  bomPreviews: ReadonlyArray<BomPreviewRow>;
  materials: ReadonlyArray<{ id: string; name: string; materialType: string }>;
}>;

// ── Modifiers (/management/pos/[id]/modifiers) ──────────────────────────

export type ModifierGroupRow = Readonly<{
  id: string;
  name: string;
  displayName: string;
  minSelections: number;
  maxSelections: number;
  sortOrder: number;
  isActive: boolean;
  options: ReadonlyArray<ModifierOptionRow>;
}>;

export type ModifierOptionRow = Readonly<{
  id: string;
  groupId: string;
  name: string;
  priceDelta: number;
  materialId: string | null;
  materialName: string | null;
  quantityDelta: number;
  sortOrder: number;
  isActive: boolean;
}>;

export type ModifierAssignmentRow = Readonly<{
  materialId: string;
  materialName: string;
  modifierGroupId: string;
  sortOrder: number;
}>;

export type ModifierPageData = Readonly<{
  posPoint: { id: string; name: string; displayName: string };
  groups: ReadonlyArray<ModifierGroupRow>;
  assignments: ReadonlyArray<ModifierAssignmentRow>;
  materials: ReadonlyArray<{ id: string; name: string }>;
}>;

// ── Orders (/management/pos/orders) ─────────────────────────────────────

export type OrderRow = Readonly<{
  id: string;
  shortId: string;
  posPointId: string;
  posPointName: string;
  status: string;
  /** integer cents */
  totalAmount: number;
  paymentMethod: string | null;
  itemCount: number;
  createdAt: string;
  completedAt: string | null;
  items: ReadonlyArray<OrderItemRow>;
}>;

export type OrderItemRow = Readonly<{
  id: string;
  materialName: string;
  quantity: number;
  modifiers: ReadonlyArray<{ optionName: string }>;
}>;

export type OrdersKpis = Readonly<{
  preparingCount: number;
  completedToday: number;
  /** integer cents */
  avgTicket: number;
  /** average preparation time in seconds (completed - created), today */
  avgPrepSeconds: number;
}>;

export type OrdersData = Readonly<{
  rows: ReadonlyArray<OrderRow>;
  kpis: OrdersKpis;
  posPoints: ReadonlyArray<{ id: string; displayName: string }>;
}>;

// ── BOM (/management/pos/bom) ────────────────────────────────────────────

export type BomRow = Readonly<{
  id: string;
  parentMaterialId: string;
  parentMaterialName: string;
  parentMaterialType: string;
  version: number;
  effectiveFrom: string | null;
  effectiveTo: string | null;
  status: string;
  isDefault: boolean;
  createdAt: string;
}>;

export type BomListKpis = Readonly<{
  activeBoms: number;
  draftBoms: number;
  finishedWithoutBom: number;
}>;

export type BomListData = Readonly<{
  rows: ReadonlyArray<BomRow>;
  kpis: BomListKpis;
  materials: ReadonlyArray<{ id: string; name: string; materialType: string }>;
}>;

// ── BOM Detail (/management/pos/bom/[id]) ───────────────────────────────

export type BomComponentRow = Readonly<{
  id: string;
  bomId: string;
  componentMaterialId: string;
  componentMaterialName: string;
  quantity: number;
  scrapPct: number;
  isPhantom: boolean;
  sortOrder: number;
}>;

export type BomDetailData = Readonly<{
  bom: BomRow;
  components: ReadonlyArray<BomComponentRow>;
  materials: ReadonlyArray<{ id: string; name: string }>;
}>;

// ── Price Lists (/management/pos/price-lists) ────────────────────────────

export type PriceListRow = Readonly<{
  id: string;
  name: string;
  currency: string;
  validFrom: string;
  validTo: string | null;
  isDefault: boolean;
  createdAt: string;
}>;

export type PriceListData = Readonly<{
  rows: ReadonlyArray<PriceListRow>;
}>;

// ── Price List Detail (/management/pos/price-lists/[id]) ─────────────────

export type PriceListItemRow = Readonly<{
  id: string;
  priceListId: string;
  materialId: string;
  materialName: string;
  posPointId: string | null;
  posPointName: string | null;
  /** integer cents */
  unitPrice: number;
  minQty: number;
}>;

export type PriceListDetailData = Readonly<{
  priceList: PriceListRow;
  items: ReadonlyArray<PriceListItemRow>;
  materials: ReadonlyArray<{ id: string; name: string }>;
  posPoints: ReadonlyArray<{ id: string; displayName: string }>;
}>;
