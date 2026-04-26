import type { Database } from "@/types/database";

/**
 * Inventory Operations domain types — narrow views over the generated
 * `Database` types. No hand-authored shapes; every row projection is derived
 * from the source of truth (`src/types/database.ts`).
 */

// ── Raw table row types ───────────────────────────────────────────────────

export type MaterialRequisition = Database["public"]["Tables"]["material_requisitions"]["Row"];
export type MaterialRequisitionInsert =
  Database["public"]["Tables"]["material_requisitions"]["Insert"];

export type MaterialRequisitionItem =
  Database["public"]["Tables"]["material_requisition_items"]["Row"];
export type MaterialRequisitionItemInsert =
  Database["public"]["Tables"]["material_requisition_items"]["Insert"];

export type InventoryReconciliation =
  Database["public"]["Tables"]["inventory_reconciliations"]["Row"];

export type InventoryReconciliationItem =
  Database["public"]["Tables"]["inventory_reconciliation_items"]["Row"];

export type WriteOff = Database["public"]["Tables"]["write_offs"]["Row"];
export type WriteOffInsert = Database["public"]["Tables"]["write_offs"]["Insert"];

export type Material = Database["public"]["Tables"]["materials"]["Row"];
export type Location = Database["public"]["Tables"]["locations"]["Row"];
export type StockBalanceCache = Database["public"]["Tables"]["stock_balance_cache"]["Row"];
export type MaterialCategory = Database["public"]["Tables"]["material_categories"]["Row"];
export type BillOfMaterials = Database["public"]["Tables"]["bill_of_materials"]["Row"];
export type MaterialValuation = Database["public"]["Tables"]["material_valuation"]["Row"];
export type LocationAllowedCategory =
  Database["public"]["Tables"]["location_allowed_categories"]["Row"];

// ── Enum types ────────────────────────────────────────────────────────────

export type InventoryTaskStatus = Database["public"]["Enums"]["inventory_task_status"];
export type DisposalReason = Database["public"]["Enums"]["disposal_reason"];
export type MaterialType = Database["public"]["Enums"]["material_type"];

// ── RSC payload view types ────────────────────────────────────────────────

/**
 * Slim material row surfaced for selection UI (restock form, disposal form).
 * Includes category for movement_type_code resolution on the client.
 */
export type MaterialOption = Readonly<{
  id: string;
  name: string;
  sku: string | null;
  categoryId: string;
  isConsumable: boolean | null;
}>;

/**
 * Slim location row surfaced for selection UI.
 */
export type LocationOption = Readonly<{
  id: string;
  name: string;
  orgUnitId: string | null;
}>;

/**
 * A requisition item joined with material name, for display in restock views.
 */
export type RequisitionItemView = Readonly<{
  id: string;
  materialId: string;
  materialName: string;
  movementTypeCode: string;
  requestedQty: number;
  deliveredQty: number | null;
}>;

/**
 * A material requisition row joined with location names and line items,
 * surfaced to the restock queue RSC.
 */
export type RequisitionRow = Readonly<{
  id: string;
  fromLocationId: string;
  fromLocationName: string;
  toLocationId: string | null;
  toLocationName: string | null;
  status: InventoryTaskStatus | null;
  assignedTo: string | null;
  requesterRemark: string | null;
  createdAt: string;
  items: ReadonlyArray<RequisitionItemView>;
}>;

/**
 * Restock context RSC payload — everything the crew restock form needs.
 */
export type RestockContext = Readonly<{
  materials: ReadonlyArray<MaterialOption>;
  locations: ReadonlyArray<LocationOption>;
  ownRecentRequisitions: ReadonlyArray<RequisitionRow>;
  autoLocationId: string | null;
}>;

/**
 * Restock queue RSC payload.
 */
export type RestockQueue = Readonly<{
  pending: ReadonlyArray<RequisitionRow>;
  inProgress: ReadonlyArray<RequisitionRow>;
}>;

/**
 * A single stock-count item surfaced to the crew (physical_qty only — system_qty
 * is withheld for blind-count integrity).
 */
export type StockCountItemView = Readonly<{
  id: string;
  materialId: string;
  materialName: string;
  baseUnit: string;
  physicalQty: number;
  /** Material category — surfaced for UI grouping per frontend_spec. */
  categoryId: string | null;
  categoryName: string;
}>;

/**
 * A reconciliation row surfaced to the crew stock-count RSC.
 */
export type ReconciliationRow = Readonly<{
  id: string;
  locationId: string;
  locationName: string;
  scheduledDate: string;
  status: InventoryTaskStatus | null;
  discrepancyFound: boolean | null;
  crewRemark: string | null;
  items: ReadonlyArray<StockCountItemView>;
}>;

/**
 * Disposal context RSC payload.
 */
export type DisposalContext = Readonly<{
  materials: ReadonlyArray<MaterialOption>;
  locations: ReadonlyArray<LocationOption>;
  autoLocationId: string | null;
  allowedCategoryIds: ReadonlyArray<string>;
  activeBoms: ReadonlyArray<{ id: string; parentMaterialId: string }>;
  valuations: ReadonlyArray<{
    materialId: string;
    locationId: string;
    movingAvgCost: number | null;
    standardCost: number | null;
  }>;
}>;

// ── Management /management/inventory list view types ──────────────────────

/**
 * Per-(material, location) stock balance used for the drill-down grid.
 */
export type StockByLocationRow = Readonly<{
  locationId: string;
  locationName: string;
  currentQty: number;
  stockValue: number;
}>;

/**
 * Materials & Stock list row — one per material, with stock totals aggregated
 * across every location plus per-location breakdown for the expand drawer.
 */
export type MaterialStockRow = Readonly<{
  id: string;
  name: string;
  sku: string | null;
  materialType: MaterialType;
  categoryId: string;
  categoryName: string | null;
  baseUnitId: string;
  baseUnitAbbreviation: string | null;
  valuationMethod: string;
  reorderPoint: number;
  isActive: boolean;
  /** Sum of `current_qty` across every `stock_balance_cache` row for the material. */
  onHand: number;
  /** Sum of `stock_value` across every `stock_balance_cache` row for the material. */
  totalStockValue: number;
  /** Per-location breakdown — empty array when no balances exist. */
  byLocation: ReadonlyArray<StockByLocationRow>;
}>;

/** KPI summary for the Materials & Stock list page. */
export type MaterialStockKpis = Readonly<{
  activeSkusCount: number;
  zeroStockCount: number;
  belowReorderCount: number;
  totalInventoryValue: number;
}>;

/** RSC payload for `/management/inventory` (Materials & Stock). */
export type MaterialStockListData = Readonly<{
  rows: ReadonlyArray<MaterialStockRow>;
  kpis: MaterialStockKpis;
  categories: ReadonlyArray<{ id: string; name: string }>;
  locations: ReadonlyArray<{ id: string; name: string }>;
}>;

// ── /management/inventory/requisitions list view types ──────────────────

/**
 * Status filter buckets surfaced to the management list (NOT raw DB
 * statuses). "Open" collapses pending + in_progress; everything else maps
 * 1:1 to `inventory_task_status`.
 *
 * The `pending_review` enum value is intentionally NOT exposed as a tab —
 * by design we removed the manager-approval step from WF-10 to avoid
 * approval bottlenecks. The schema enum remains untouched (it is shared
 * with WF-11 reconciliations).
 */
export type RequisitionStatusFilter = "open" | "completed" | "cancelled";

/** Counts per status bucket for tab badges. */
export type RequisitionStatusCounts = Readonly<{
  open: number;
  completed: number;
  cancelled: number;
}>;

/** KPI summary for the requisitions list page. */
export type RequisitionListKpis = Readonly<{
  /** Seconds since the oldest pending+in_progress requisition was created. */
  oldestPendingSeconds: number | null;
  /** Mean (created_at → updated_at when status='completed') in seconds. */
  avgFulfillmentSeconds: number | null;
  /** Count created today (facility TZ). */
  requestedTodayCount: number;
}>;

/**
 * Projected requisition row for the list table. Items count + total qty are
 * aggregated server-side; the row stays slim so the table remains lean
 * even with hundreds of open requisitions.
 */
export type RequisitionListRow = Readonly<{
  id: string;
  fromLocationId: string;
  fromLocationName: string;
  toLocationId: string | null;
  toLocationName: string | null;
  status: InventoryTaskStatus | null;
  assignedToName: string | null;
  requesterRemark: string | null;
  itemCount: number;
  totalRequestedQty: number;
  /** Names of the materials on this requisition's items — used by the
   * spec line 2039 search predicate ("searches to_location name,
   * material names"). */
  materialNames: ReadonlyArray<string>;
  createdAt: string;
  /** updated_at when status='completed'; otherwise null. */
  completedAt: string | null;
}>;

/** RSC payload for `/management/inventory/requisitions`. */
export type RequisitionListData = Readonly<{
  rows: ReadonlyArray<RequisitionListRow>;
  counts: RequisitionStatusCounts;
  kpis: RequisitionListKpis;
  /** Active locations for the create form. */
  locations: ReadonlyArray<{ id: string; name: string }>;
  /** Active materials for the create form's line-item picker. */
  materials: ReadonlyArray<{
    id: string;
    name: string;
    sku: string | null;
    isConsumable: boolean;
    baseUnitAbbreviation: string | null;
  }>;
}>;

// ── /management/inventory/requisitions/[id] detail view types ───────────

/** A line item enriched with material name + movement-type metadata. */
export type RequisitionDetailItem = Readonly<{
  id: string;
  materialId: string;
  materialName: string;
  baseUnitAbbreviation: string | null;
  movementTypeCode: string;
  movementTypeName: string;
  movementTypeDirection: string;
  requestedQty: number;
  deliveredQty: number | null;
}>;

/** Slim active-staff row for the reassign picker. */
export type AssigneeOption = Readonly<{
  userId: string;
  displayName: string;
}>;

/** RSC payload for `/management/inventory/requisitions/[id]`. */
export type RequisitionDetailData = Readonly<{
  id: string;
  fromLocationId: string;
  fromLocationName: string;
  toLocationId: string | null;
  toLocationName: string | null;
  status: InventoryTaskStatus | null;
  assignedToId: string | null;
  assignedToName: string | null;
  requesterRemark: string | null;
  runnerRemark: string | null;
  createdAt: string;
  updatedAt: string | null;
  items: ReadonlyArray<RequisitionDetailItem>;
  /** Assignable runners for the reassign picker. */
  assignees: ReadonlyArray<AssigneeOption>;
}>;

// ── /management/inventory/valuation view types ─────────────────────────

/**
 * Per-(material, location) valuation row joined with stock balance.
 * `stock_value` comes from `stock_balance_cache` directly (operational
 * cache); valuation costs come from `material_valuation`.
 */
export type ValuationListRow = Readonly<{
  /** Composite ID `${materialId}:${locationId}` for DataTable dedup. */
  rowId: string;
  materialId: string;
  materialName: string;
  materialType: MaterialType;
  baseUnitAbbreviation: string | null;
  locationId: string;
  locationName: string;
  standardCost: number | null;
  movingAvgCost: number | null;
  lastPurchaseCost: number | null;
  currentQty: number;
  stockValue: number;
}>;

/** KPI summary for the valuation report. */
export type ValuationListKpis = Readonly<{
  totalInventoryValue: number;
  highestValueLocation: Readonly<{ name: string; value: number }> | null;
  highestValueSku: Readonly<{ name: string; value: number }> | null;
}>;

/** RSC payload for `/management/inventory/valuation`. */
export type ValuationListData = Readonly<{
  rows: ReadonlyArray<ValuationListRow>;
  kpis: ValuationListKpis;
  /** Active locations for the location filter. */
  locations: ReadonlyArray<{ id: string; name: string }>;
}>;

// ── /management/inventory/movements view types ────────────────────────

/** Tab buckets — drives `?tab=ledger|types`. */
export type MovementsTabFilter = "ledger" | "types";

/** Movement direction enum (CHECK constraint at init_schema.sql:2501). */
export type MovementDirection = "in" | "out" | "transfer" | "neutral";

/**
 * One displayed row in the goods movement ledger — flattens the
 * goods_movements → goods_movement_items chain so each line shows a
 * single material movement.
 */
export type MovementsLedgerRow = Readonly<{
  /** Composite ID `${goodsMovementId}:${itemId}` so DataTable can dedupe. */
  rowId: string;
  goodsMovementId: string;
  itemId: string;
  documentDate: string;
  postingDate: string;
  movementTypeCode: string;
  movementTypeName: string;
  direction: MovementDirection;
  materialId: string;
  materialName: string;
  /** Signed: positive = inflow, negative = outflow (init_schema.sql:2561). */
  quantity: number;
  unitAbbreviation: string | null;
  locationId: string;
  locationName: string;
  unitCost: number;
  totalCost: number;
  /** When set, render a link to the source document detail. */
  sourceDoc: Readonly<{
    kind: "po" | "requisition" | "reconciliation" | "order" | "disposal";
    id: string;
    label: string;
    /** Resolved route for the management portal; null when no detail page exists. */
    href: string | null;
  }> | null;
  notes: string | null;
}>;

/** KPI summary for the ledger tab over the active period. */
export type MovementsLedgerKpis = Readonly<{
  totalCount: number;
  inboundCount: number;
  outboundCount: number;
  transferCount: number;
  /** ISO YYYY-MM-DD bounds used for the KPI aggregate. */
  periodStart: string;
  periodEnd: string;
}>;

/** RSC payload for the ledger tab. */
export type MovementsLedgerData = Readonly<{
  rows: ReadonlyArray<MovementsLedgerRow>;
  kpis: MovementsLedgerKpis;
  /** Opaque cursor token for the next page; null on the last page. */
  nextCursor: string | null;
  /** Reference data for filter pickers. */
  movementTypes: ReadonlyArray<{
    id: string;
    code: string;
    name: string;
    direction: MovementDirection;
  }>;
  materials: ReadonlyArray<{ id: string; name: string; sku: string | null }>;
  locations: ReadonlyArray<{ id: string; name: string }>;
}>;

/** Reference catalog row for the Movement Types tab. */
export type MovementTypeRow = Readonly<{
  id: string;
  code: string;
  name: string;
  description: string | null;
  direction: MovementDirection;
  requiresSourceDoc: boolean;
  requiresCostCenter: boolean;
  isActive: boolean;
}>;

/** RSC payload for the Movement Types tab. */
export type MovementTypesCatalogData = Readonly<{
  rows: ReadonlyArray<MovementTypeRow>;
}>;

// ── /management/inventory/equipment list view types ────────────────────

/** Tab buckets — drives server-side filter via `?tab=`. */
export type EquipmentTabFilter = "issued" | "history";

/** KPIs for the equipment custody surface. */
export type EquipmentListKpis = Readonly<{
  /** Currently issued count (returned_at IS NULL). */
  issuedCount: number;
  /** Seconds since the oldest unreturned assignment was made; null if none. */
  oldestUnreturnedSeconds: number | null;
  /** Returned this calendar month (UTC). */
  returnedThisMonthCount: number;
}>;

/** Per-row projection. */
export type EquipmentListRow = Readonly<{
  id: string;
  materialId: string;
  materialName: string;
  baseUnitAbbreviation: string | null;
  assignedToId: string;
  assignedToName: string | null;
  assignedAt: string;
  returnedAt: string | null;
  conditionOnReturn: string | null;
  notes: string | null;
}>;

/** RSC payload for `/management/inventory/equipment`. */
export type EquipmentListData = Readonly<{
  rows: ReadonlyArray<EquipmentListRow>;
  /** Currently-issued and historical counts — drive tab badges
   * independent of which tab is active. */
  counts: Readonly<{ issued: number; history: number }>;
  kpis: EquipmentListKpis;
  /** Returnable materials (materials.is_returnable = TRUE) for the issue form. */
  returnableMaterials: ReadonlyArray<{
    id: string;
    name: string;
    sku: string | null;
    baseUnitAbbreviation: string | null;
  }>;
  /** Active staff for the assignee picker. */
  assignees: ReadonlyArray<AssigneeOption>;
}>;

// ── /management/inventory/write-offs list view types ───────────────────

/** Reviewed-state filter — driven by URL `?reviewed=` (default unreviewed). */
export type WriteOffReviewedFilter = "unreviewed" | "reviewed" | "all";

/**
 * Projected write-off row for the list table. Cost values come from the
 * stored `total_cost` (GENERATED ALWAYS AS quantity * unit_cost,
 * init_schema.sql:2522).
 */
export type WriteOffListRow = Readonly<{
  id: string;
  materialId: string;
  materialName: string;
  baseUnitAbbreviation: string | null;
  locationId: string;
  locationName: string;
  reason: DisposalReason;
  quantity: number;
  unitCost: number;
  totalCost: number;
  hasPhoto: boolean;
  disposedById: string | null;
  disposedByName: string | null;
  reviewedAt: string | null;
  reviewedByName: string | null;
  notes: string | null;
  createdAt: string;
}>;

/** KPI summary for the write-offs review surface. */
export type WriteOffListKpis = Readonly<{
  /** All-time unreviewed count — surfaces the queue depth regardless of
   * the active date range. */
  unreviewedCount: number;
  /** Sum of quantity within the active date range (or last 30d default). */
  totalWasteQty: number;
  /** Most-common reason within the active date range (or null if empty). */
  topReason: DisposalReason | null;
  topReasonCount: number;
  /** Sum of total_cost within the active date range. */
  estimatedCost: number;
  /** ISO date range used for the period KPIs. */
  periodStart: string;
  periodEnd: string;
}>;

/** RSC payload for `/management/inventory/write-offs`. */
export type WriteOffListData = Readonly<{
  rows: ReadonlyArray<WriteOffListRow>;
  kpis: WriteOffListKpis;
  /** Opaque cursor token for the next page; null on last page. */
  nextCursor: string | null;
  /** Reference data for filter pickers. */
  materials: ReadonlyArray<{ id: string; name: string; sku: string | null }>;
  locations: ReadonlyArray<{ id: string; name: string }>;
}>;

// ── /management/inventory/reconciliation list view types ────────────────

/**
 * Tab buckets surfaced to the management list. WF-11 uses every state in
 * `inventory_task_status` for reconciliations, so all four tabs are
 * meaningful (unlike requisitions which dropped Awaiting Review).
 */
export type ReconciliationStatusFilter = "active" | "pending_review" | "completed" | "cancelled";

/** Counts per tab badge. */
export type ReconciliationStatusCounts = Readonly<{
  active: number;
  pendingReview: number;
  completed: number;
  cancelled: number;
}>;

/** KPI summary for the reconciliation list page. */
export type ReconciliationListKpis = Readonly<{
  pendingReviewCount: number;
  discrepanciesThisMonthCount: number;
  completedThisMonthCount: number;
}>;

/**
 * Projected reconciliation row for the list table.
 */
export type ReconciliationListRow = Readonly<{
  id: string;
  locationId: string;
  locationName: string;
  scheduledDate: string;
  scheduledTime: string;
  status: InventoryTaskStatus | null;
  assignedToName: string | null;
  itemCount: number;
  discrepancyFound: boolean;
  createdAt: string;
}>;

// ── /management/inventory/reconciliation/[id] detail view types ────────

/** Per-item review row with derived variance. */
export type ReconciliationDetailItem = Readonly<{
  id: string;
  materialId: string;
  materialName: string;
  baseUnitAbbreviation: string | null;
  systemQty: number;
  physicalQty: number;
  /** physical - system; positive = surplus, negative = shortage. */
  variance: number;
  photoUrl: string | null;
}>;

/** RSC payload for `/management/inventory/reconciliation/[id]`. */
export type ReconciliationDetailData = Readonly<{
  id: string;
  locationId: string;
  locationName: string;
  scheduledDate: string;
  scheduledTime: string;
  status: InventoryTaskStatus | null;
  assignedToId: string | null;
  assignedToName: string | null;
  managerRemark: string | null;
  crewRemark: string | null;
  discrepancyFound: boolean;
  createdAt: string;
  updatedAt: string | null;
  items: ReadonlyArray<ReconciliationDetailItem>;
  /** True when ANY item has physical_qty ≠ system_qty. Drives the
   * "Approve Adjustments" vs "Confirm Count" button label. Computed
   * server-side so the client doesn't repeat the math. */
  hasVariance: boolean;
  /** Sum of |variance| across items, for the header badge. */
  totalAbsVariance: number;
  /** Active staff for the recount-with-reassign picker. */
  assignees: ReadonlyArray<AssigneeOption>;
}>;

/** RSC payload for `/management/inventory/reconciliation`. */
export type ReconciliationListData = Readonly<{
  rows: ReadonlyArray<ReconciliationListRow>;
  counts: ReconciliationStatusCounts;
  kpis: ReconciliationListKpis;
  /** Active locations for the schedule form. */
  locations: ReadonlyArray<{ id: string; name: string }>;
  /** Active staff (runners) for the assignee picker. */
  assignees: ReadonlyArray<AssigneeOption>;
  /**
   * Active materials with their per-location stock balances. The form
   * filters this client-side once a location is selected. Materials
   * without a `stock_balance_cache` row at that location appear with
   * `currentQty: 0` so the manager can still schedule a count starting
   * from zero (per WF-11 the snapshot reflects whatever the cache says
   * at creation time).
   */
  materials: ReadonlyArray<{
    id: string;
    name: string;
    sku: string | null;
    baseUnitAbbreviation: string | null;
  }>;
  /**
   * Index of stock_balance_cache rows so the form can show the manager
   * the live system_qty per material at the selected location before
   * scheduling. Keyed `${materialId}:${locationId}`.
   */
  stockByMaterialLocation: Readonly<Record<string, number>>;
}>;
