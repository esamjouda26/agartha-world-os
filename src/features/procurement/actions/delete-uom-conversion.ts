"use server";

import "server-only";

import { after } from "next/server";
import { revalidatePath } from "next/cache";
import { z } from "zod";

import { fail, ok, type ServerActionResult } from "@/lib/errors";
import { loggerWith } from "@/lib/logger";
import { createRateLimiter } from "@/lib/rate-limit";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { PROCUREMENT_ROUTER_PATHS } from "@/features/procurement/cache-tags";
import {
  UOM_CRUD_RATE_TOKENS,
  UOM_CRUD_RATE_WINDOW,
} from "@/features/procurement/constants";

const inputSchema = z.object({ id: z.guid() });

const limiter = createRateLimiter({
  tokens: UOM_CRUD_RATE_TOKENS,
  window: UOM_CRUD_RATE_WINDOW,
  prefix: "procurement-uom-delete",
});

/**
 * Delete a `uom_conversions` row.
 *
 * RLS allows DELETE for `system:d` OR `procurement:d`
 * (init_schema.sql §7c). Action mirrors that gate.
 */
export async function deleteUomConversion(
  input: unknown,
): Promise<ServerActionResult<{ id: string }>> {
  // 1. Zod parse
  const parsed = inputSchema.safeParse(input);
  if (!parsed.success) {
    return fail("VALIDATION_FAILED", {
      id: parsed.error.issues[0]?.message ?? "Invalid id",
    });
  }

  const supabase = await createSupabaseServerClient();

  // 2. AuthN + RBAC
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return fail("UNAUTHENTICATED");
  const appMeta = (user.app_metadata ?? {}) as {
    domains?: Record<string, string[]>;
  };
  const sysD = appMeta.domains?.system?.includes("d") ?? false;
  const procD = appMeta.domains?.procurement?.includes("d") ?? false;
  if (!sysD && !procD) return fail("FORBIDDEN");

  // 3. Rate limit
  const lim = await limiter.limit(user.id);
  if (!lim.success) return fail("RATE_LIMITED");

  // 4. Execute DELETE
  const { error, count } = await supabase
    .from("uom_conversions")
    .delete({ count: "exact" })
    .eq("id", parsed.data.id);

  if (error) {
    const log = loggerWith({
      feature: "procurement",
      event: "delete_uom_conversion",
      user_id: user.id,
    });
    log.error(
      { code: error.code, message: error.message },
      "deleteUomConversion failed",
    );
    return fail("INTERNAL");
  }
  if (count === 0) return fail("NOT_FOUND");

  // 5. Invalidate cache
  for (const p of PROCUREMENT_ROUTER_PATHS) {
    revalidatePath(p, "page");
  }

  after(async () => {
    const log = loggerWith({
      feature: "procurement",
      event: "delete_uom_conversion",
      user_id: user.id,
    });
    log.info({ id: parsed.data.id }, "deleteUomConversion completed");
  });

  return ok({ id: parsed.data.id });
}
