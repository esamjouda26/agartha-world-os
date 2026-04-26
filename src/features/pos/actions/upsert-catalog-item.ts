"use server";

import "server-only";

import { revalidatePath } from "next/cache";
import { after } from "next/server";

import { fail, ok, type ServerActionResult } from "@/lib/errors";
import { loggerWith } from "@/lib/logger";
import { createRateLimiter } from "@/lib/rate-limit";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { POS_ROUTER_PATHS, posPosPointDetailPath } from "@/features/pos/cache-tags";
import { upsertCatalogItemSchema } from "@/features/pos/schemas/catalog-item";

const limiter = createRateLimiter({ tokens: 60, window: "60 s", prefix: "pos-catalog-item" });

/**
 * Create or update a material_sales_data row (composite PK: material_id, pos_point_id).
 *
 * Schema: init_schema.sql:2168 — material_sales_data
 * RLS: INSERT pos:c, UPDATE pos:u (init_schema.sql:2376-2380)
 *
 * sellingPrice is received as decimal MYR from the form — stored as-is
 * in the DB NUMERIC(12,2) column. The query layer multiplies by 100 when
 * reading back into integer cents.
 */
export async function upsertCatalogItem(
  input: unknown,
): Promise<ServerActionResult<{ materialId: string }>> {
  const parsed = upsertCatalogItemSchema.safeParse(input);
  if (!parsed.success) {
    const fields: Record<string, string> = {};
    for (const issue of parsed.error.issues) {
      fields[issue.path.join(".") || "form"] = issue.message;
    }
    return fail("VALIDATION_FAILED", fields);
  }

  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return fail("UNAUTHENTICATED");

  const appMeta = (user.app_metadata ?? {}) as { domains?: Record<string, string[]> };
  const posAccess = appMeta.domains?.pos ?? [];
  if (parsed.data.isUpdate && !posAccess.includes("u")) return fail("FORBIDDEN");
  if (!parsed.data.isUpdate && !posAccess.includes("c")) return fail("FORBIDDEN");

  const lim = await limiter.limit(user.id);
  if (!lim.success) return fail("RATE_LIMITED");

  const { materialId, posPointId, displayName, sellingPrice, displayCategoryId, imageUrl, allergens, sortOrder, isActive } =
    parsed.data;

  const { error } = await supabase.from("material_sales_data").upsert(
    {
      material_id: materialId,
      pos_point_id: posPointId,
      display_name: displayName ?? null,
      selling_price: sellingPrice,
      display_category_id: displayCategoryId ?? null,
      image_url: imageUrl ?? null,
      allergens: allergens ?? null,
      sort_order: sortOrder,
      is_active: isActive,
      updated_by: user.id,
    },
    { onConflict: "material_id,pos_point_id" },
  );

  if (error) {
    loggerWith({ feature: "pos", event: "upsert-catalog-item", user_id: user.id }).error(
      { error: error.message, code: error.code },
      "failed to upsert catalog item",
    );
    return fail("INTERNAL");
  }

  for (const path of POS_ROUTER_PATHS) {
    revalidatePath(path, "page");
  }
  revalidatePath(posPosPointDetailPath(posPointId), "page");

  after(async () => {
    loggerWith({ feature: "pos", event: "upsert-catalog-item", user_id: user.id }).info(
      { material_id: materialId, pos_point_id: posPointId },
      "upsertCatalogItem completed",
    );
  });

  return ok({ materialId });
}
