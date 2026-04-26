"use server";

import "server-only";

import { z } from "zod";
import { revalidatePath } from "next/cache";
import { after } from "next/server";

import { fail, ok, type ServerActionResult } from "@/lib/errors";
import { loggerWith } from "@/lib/logger";
import { createRateLimiter } from "@/lib/rate-limit";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { posBomDetailPath } from "@/features/pos/cache-tags";

const deleteSchema = z.object({
  componentId: z.guid(),
  bomId: z.guid(),
});

const limiter = createRateLimiter({ tokens: 30, window: "60 s", prefix: "pos-bom-comp-del" });

/**
 * Delete a bom_component.
 * Schema: init_schema.sql:2248 — bom_components
 * RLS: DELETE pos:d (init_schema.sql:2413-2414)
 */
export async function deleteBomComponent(
  input: unknown,
): Promise<ServerActionResult<void>> {
  const parsed = deleteSchema.safeParse(input);
  if (!parsed.success) return fail("VALIDATION_FAILED");

  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return fail("UNAUTHENTICATED");

  const appMeta = (user.app_metadata ?? {}) as { domains?: Record<string, string[]> };
  if (!appMeta.domains?.pos?.includes("d")) return fail("FORBIDDEN");

  const lim = await limiter.limit(user.id);
  if (!lim.success) return fail("RATE_LIMITED");

  const { componentId, bomId } = parsed.data;

  const { error } = await supabase
    .from("bom_components")
    .delete()
    .eq("id", componentId)
    .eq("bom_id", bomId);

  if (error) {
    loggerWith({ feature: "pos", event: "delete-bom-component", user_id: user.id }).error(
      { error: error.message },
      "failed to delete bom_component",
    );
    return fail("INTERNAL");
  }

  revalidatePath(posBomDetailPath(bomId), "page");

  after(async () => {
    loggerWith({ feature: "pos", event: "delete-bom-component", user_id: user.id }).info(
      { component_id: componentId, bom_id: bomId },
      "deleteBomComponent completed",
    );
  });

  return ok(undefined);
}
