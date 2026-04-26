import type { Database } from "@/types/database";

/**
 * POS domain types — narrow views over generated Database types.
 * No hand-authored shapes; every row projection derived from
 * supabase/migrations/20260417064731_init_schema.sql.
 */

export type PosPoint = Database["public"]["Tables"]["pos_points"]["Row"];
export type DisplayCategory = Database["public"]["Tables"]["display_categories"]["Row"];
export type MaterialSalesData = Database["public"]["Tables"]["material_sales_data"]["Row"];
export type PosModifierGroup = Database["public"]["Tables"]["pos_modifier_groups"]["Row"];
export type PosModifierOption = Database["public"]["Tables"]["pos_modifier_options"]["Row"];
export type MaterialModifierGroup = Database["public"]["Tables"]["material_modifier_groups"]["Row"];
export type Order = Database["public"]["Tables"]["orders"]["Row"];
export type OrderItem = Database["public"]["Tables"]["order_items"]["Row"];
export type OrderItemModifier = Database["public"]["Tables"]["order_item_modifiers"]["Row"];

export type PaymentMethod = Database["public"]["Enums"]["payment_method"];
export type OrderStatus = Database["public"]["Enums"]["order_status"];

// ── Catalog ─────────────────────────────────────────────────────────────

/** A modifier option enriched with its group metadata. */
export type CatalogModifierOption = Readonly<{
  id: string;
  name: string;
  priceDelta: number;
  materialId: string | null;
  quantityDelta: number;
  sortOrder: number;
}>;

export type CatalogModifierGroup = Readonly<{
  id: string;
  displayName: string;
  minSelections: number;
  maxSelections: number;
  sortOrder: number;
  options: ReadonlyArray<CatalogModifierOption>;
}>;

/** A single sellable item in the POS catalog. */
export type CatalogItem = Readonly<{
  materialId: string;
  materialName: string;
  displayName: string | null;
  sellingPrice: number;
  imageUrl: string | null;
  allergens: string | null;
  sortOrder: number;
  categoryId: string | null;
  modifierGroups: ReadonlyArray<CatalogModifierGroup>;
}>;

/** Category with its items — the UI renders one section per category. */
export type CatalogCategory = Readonly<{
  id: string | null;
  name: string;
  sortOrder: number;
  items: ReadonlyArray<CatalogItem>;
}>;

/** Full catalog payload returned to the RSC page. */
export type PosContext = Readonly<{
  posPointId: string;
  posPointName: string;
  categories: ReadonlyArray<CatalogCategory>;
}>;

// ── Cart ────────────────────────────────────────────────────────────────

export type CartModifierSelection = Readonly<{
  optionId: string;
  optionName: string;
  priceDelta: number;
}>;

export type CartLine = Readonly<{
  /** Stable cart key: materialId + sorted optionIds joined */
  key: string;
  materialId: string;
  materialName: string;
  basePrice: number;
  quantity: number;
  selectedModifiers: ReadonlyArray<CartModifierSelection>;
  lineTotal: number;
}>;

// ── Submit order payload ────────────────────────────────────────────────

export type SubmitOrderItem = Readonly<{
  material_id: string;
  quantity: number;
  modifiers: ReadonlyArray<string>; // modifier_option UUIDs
}>;

export type SubmitOrderInput = Readonly<{
  posPointId: string;
  items: ReadonlyArray<SubmitOrderItem>;
  paymentMethod: PaymentMethod;
}>;

// ── KDS (active-orders) ─────────────────────────────────────────────────

export type KdsOrderItem = Readonly<{
  id: string;
  materialName: string;
  quantity: number;
  modifiers: ReadonlyArray<{ optionName: string }>;
}>;

export type KdsOrder = Readonly<{
  id: string;
  shortId: string;
  posPointName: string;
  createdAt: string;
  elapsedMs: number;
  isOverdue: boolean;
  itemCount: number;
  items: ReadonlyArray<KdsOrderItem>;
}>;
