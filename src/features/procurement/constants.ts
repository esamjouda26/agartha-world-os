/**
 * Procurement feature constants — no magic numbers in action/query code.
 */

// ── Rate-limit configuration ──────────────────────────────────────────────

/**
 * Receive-PO-items rate limit: 30 requests per 60 seconds per user.
 * A single crew member processes a handful of deliveries per shift; this
 * cap blocks replay attacks while leaving headroom for normal throughput.
 */
export const RECEIVE_PO_ITEMS_RATE_TOKENS = 30;
export const RECEIVE_PO_ITEMS_RATE_WINDOW = "60 s" as const;

/**
 * Material CRUD rate limit: 100 requests per 60 seconds per user.
 * Normal procurement ops create/update materials in bursts during catalog
 * setup. 100/min is generous for manual UI work.
 */
export const MATERIAL_CRUD_RATE_TOKENS = 100;
export const MATERIAL_CRUD_RATE_WINDOW = "60 s" as const;

/**
 * Supplier CRUD rate limit: 100 requests per 60 seconds per user.
 */
export const SUPPLIER_CRUD_RATE_TOKENS = 100;
export const SUPPLIER_CRUD_RATE_WINDOW = "60 s" as const;

/**
 * Purchase order CRUD rate limit: 100 requests per 60 seconds per user.
 */
export const PO_CRUD_RATE_TOKENS = 100;
export const PO_CRUD_RATE_WINDOW = "60 s" as const;

/**
 * Reorder / draft PO creation rate limit: 30 requests per 60 seconds.
 * Creating draft POs is heavier — lower cap prevents mass creation.
 */
export const REORDER_RATE_TOKENS = 30;
export const REORDER_RATE_WINDOW = "60 s" as const;

// ── Query limits ──────────────────────────────────────────────────────────

/** Maximum POs returned in the receivable-POs query. */
export const RECEIVABLE_PO_LIMIT = 100;

/** Maximum materials per page. */
export const MATERIALS_PAGE_LIMIT = 200;

/**
 * Material category CRUD rate limit: 30 per 60s per user. Categories are
 * slow-changing org-config; the cap blocks scripted abuse without
 * impeding bulk catalog setup.
 */
export const CATEGORY_CRUD_RATE_TOKENS = 30;
export const CATEGORY_CRUD_RATE_WINDOW = "60 s" as const;

/**
 * Location-category junction CRUD rate limit: 30 per 60s per user.
 */
export const LOCATION_CATEGORY_ASSIGN_RATE_TOKENS = 30;
export const LOCATION_CATEGORY_ASSIGN_RATE_WINDOW = "60 s" as const;

/**
 * UOM conversion CRUD rate limit: 30 per 60s per user. Reused by the
 * standalone `/management/uom` page and the per-material UOM tab.
 */
export const UOM_CRUD_RATE_TOKENS = 30;
export const UOM_CRUD_RATE_WINDOW = "60 s" as const;
