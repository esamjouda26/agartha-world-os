/**
 * Inventory Operations feature constants — no magic numbers in action/query
 * code. Every threshold, rate-limit value, and label lives here so code
 * review surfaces changes explicitly.
 */

// ── Rate-limit configuration ──────────────────────────────────────────────

/**
 * Submit-restock rate limit: 30 requests per 60 seconds per user.
 * A single crew member won't need more than a handful per shift;
 * this blocks scripted abuse while leaving headroom for genuine bulk entry.
 */
export const SUBMIT_RESTOCK_RATE_TOKENS = 30;
export const SUBMIT_RESTOCK_RATE_WINDOW = "60 s" as const;

/**
 * Accept-requisition rate limit: 30 per 60 seconds per user.
 */
export const ACCEPT_REQUISITION_RATE_TOKENS = 30;
export const ACCEPT_REQUISITION_RATE_WINDOW = "60 s" as const;

/**
 * Deliver-requisition rate limit: 30 per 60 seconds per user.
 */
export const DELIVER_REQUISITION_RATE_TOKENS = 30;
export const DELIVER_REQUISITION_RATE_WINDOW = "60 s" as const;

/**
 * Update-stock-count rate limit: 30 per 60 seconds per user.
 */
export const UPDATE_STOCK_COUNT_RATE_TOKENS = 30;
export const UPDATE_STOCK_COUNT_RATE_WINDOW = "60 s" as const;

/**
 * Submit-disposal rate limit: 20 per 60 seconds per user.
 * Lower than restock because disposals carry financial impact and a
 * tighter cap makes brute-force financial manipulation harder.
 */
export const SUBMIT_DISPOSAL_RATE_TOKENS = 20;
export const SUBMIT_DISPOSAL_RATE_WINDOW = "60 s" as const;

// ── Query limits ──────────────────────────────────────────────────────────

/** Own recent requisitions shown in the restock context card. */
export const RESTOCK_RECENT_LIMIT = 10;

/** Maximum line items per requisition submission. */
export const RESTOCK_MAX_ITEMS = 50;

/** Maximum line items per disposal submission. */
export const DISPOSAL_MAX_ITEMS = 50;

// ── UI display maps ───────────────────────────────────────────────────────

/**
 * Disposal reason options for the UI dropdown.
 * Mirrors disposal_reason enum in init_schema.sql (write_offs.reason column).
 */
export const DISPOSAL_REASON_OPTIONS = [
  { value: "expired", label: "Expired" },
  { value: "damaged", label: "Damaged" },
  { value: "contaminated", label: "Contaminated" },
  { value: "preparation_error", label: "Preparation Error" },
  { value: "overproduction", label: "Overproduction" },
  { value: "quality_defect", label: "Quality Defect" },
] as const;

export type DisposalReasonValue = (typeof DISPOSAL_REASON_OPTIONS)[number]["value"];

/**
 * Badge variant per inventory task status.
 * Mirrors inventory_task_status enum.
 */
export const INVENTORY_TASK_STATUS_VARIANT: Record<
  string,
  "default" | "secondary" | "outline" | "destructive"
> = {
  pending: "outline",
  in_progress: "default",
  completed: "secondary",
  pending_review: "default",
  cancelled: "destructive",
} as const;

/**
 * Material type enum values mirrored from `material_type` enum
 * (init_schema.sql:2098). Cross-feature import is forbidden by ESLint, so
 * each consuming feature declares its own copy of the closed set.
 */
export const MATERIAL_TYPES = [
  "raw",
  "semi_finished",
  "finished",
  "trading",
  "consumable",
  "service",
] as const;

export type MaterialTypeValue = (typeof MATERIAL_TYPES)[number];

/**
 * Display label per material type — used by every inventory list/detail UI.
 */
export const MATERIAL_TYPE_LABELS: Record<MaterialTypeValue, string> = {
  raw: "Raw Material",
  semi_finished: "Semi-Finished",
  finished: "Finished Good",
  trading: "Trading",
  consumable: "Consumable",
  service: "Service",
};

/**
 * Display label per valuation method — mirrors the CHECK constraint on
 * `materials.valuation_method` (init_schema.sql:2140-2141).
 */
export const VALUATION_METHOD_LABELS: Record<string, string> = {
  standard: "Standard",
  moving_avg: "Moving Average",
  fifo: "FIFO",
};

// ── Management requisition CRUD rate limit ────────────────────────────────

/**
 * Manager-side requisition CRUD rate limit: 30 per 60s per user. Distinct
 * from the crew-side `SUBMIT_RESTOCK_RATE_*` so a busy crew shift can't
 * starve manager throughput (or vice-versa).
 */
export const MANAGER_REQUISITION_CRUD_RATE_TOKENS = 30;
export const MANAGER_REQUISITION_CRUD_RATE_WINDOW = "60 s" as const;

/**
 * Maximum line items per manager-created requisition. Mirrors the crew cap
 * (RESTOCK_MAX_ITEMS = 50) so the same physics apply on both sides.
 */
export const MANAGER_REQUISITION_MAX_ITEMS = 50;

/**
 * Reconciliation scheduling rate limit: 20 per 60s per user. Lower than
 * requisitions because a reconciliation drives a runner to physically
 * count stock — heavy ops, scripted bursts make no sense.
 */
export const RECONCILIATION_SCHEDULE_RATE_TOKENS = 20;
export const RECONCILIATION_SCHEDULE_RATE_WINDOW = "60 s" as const;

/**
 * Maximum line items per scheduled reconciliation. Stock counts span
 * dozens of SKUs in practice; 200 leaves headroom for a quarterly
 * full-warehouse audit while preventing accidental scripted bulk-creates.
 */
export const RECONCILIATION_MAX_ITEMS = 200;

/**
 * Reconciliation review rate limit (approve / request-recount): 30 per
 * 60s. Reviews are deliberate, single-record operations.
 */
export const RECONCILIATION_REVIEW_RATE_TOKENS = 30;
export const RECONCILIATION_REVIEW_RATE_WINDOW = "60 s" as const;

/**
 * Mark-write-off-reviewed rate limit: 60 per 60s — managers review
 * disposals in bursts after a service period closes.
 */
export const MARK_WRITE_OFF_REVIEWED_RATE_TOKENS = 60;
export const MARK_WRITE_OFF_REVIEWED_RATE_WINDOW = "60 s" as const;

/**
 * Default + maximum page size for cursor-paginated write-offs list.
 * Server validates against this list — URL param is user input.
 */
export const WRITE_OFFS_PAGE_SIZE_OPTIONS = [25, 50, 100] as const;
export const WRITE_OFFS_DEFAULT_PAGE_SIZE = 50;

/**
 * Default lookback window for write-offs KPIs when the user has not
 * applied a date filter ("this period" framing).
 */
export const WRITE_OFFS_DEFAULT_LOOKBACK_DAYS = 30;

/**
 * Equipment custody (issue + return) rate limit: 30 per 60s. Custody
 * events happen at human pace; this cap blocks scripted abuse without
 * impeding shift handoffs.
 */
export const EQUIPMENT_CUSTODY_RATE_TOKENS = 30;
export const EQUIPMENT_CUSTODY_RATE_WINDOW = "60 s" as const;

/**
 * Cursor-paginated movements ledger — keyset on
 * (goods_movements.document_date DESC, goods_movements.id). High-volume
 * table; spec mandates pagination.
 */
export const MOVEMENTS_LEDGER_PAGE_SIZE_OPTIONS = [25, 50, 100] as const;
export const MOVEMENTS_LEDGER_DEFAULT_PAGE_SIZE = 25;

/**
 * Default lookback for the ledger KPI aggregate when no date range is
 * applied. Bounds the read so a mistakenly wide period doesn't tank
 * the page.
 */
export const MOVEMENTS_LEDGER_DEFAULT_LOOKBACK_DAYS = 30;

/**
 * Cap on rows scanned for the KPI aggregate. Phase-10 hardening should
 * move KPIs to a materialized view; for v1 this bounds the read.
 */
export const MOVEMENTS_LEDGER_KPI_MAX_ROWS = 10_000;

/**
 * Movement-type CRUD rate limit: 20 per 60s. Movement types are slow-
 * changing org-config (~15 rows seeded) — low cap is plenty.
 */
export const MOVEMENT_TYPE_CRUD_RATE_TOKENS = 20;
export const MOVEMENT_TYPE_CRUD_RATE_WINDOW = "60 s" as const;

