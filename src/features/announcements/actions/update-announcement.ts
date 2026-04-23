"use server";

import "server-only";

import { after } from "next/server";
import { revalidatePath } from "next/cache";

import { fail, ok, type ServerActionResult } from "@/lib/errors";
import { loggerWith } from "@/lib/logger";
import { createRateLimiter } from "@/lib/rate-limit";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import type { Json } from "@/types/database";

import { ANNOUNCEMENTS_ROUTER_PATHS } from "@/features/announcements/cache-tags";
import {
  updateAnnouncementSchema,
  type UpdateAnnouncementInput,
} from "@/features/announcements/schemas/announcement";

export type UpdateAnnouncementResult = Readonly<{ id: string }>;

const limiter = createRateLimiter({
  tokens: 20,
  window: "1 m",
  prefix: "announcements-update",
});

/**
 * Update an announcement + replace its target set atomically via
 * `rpc_update_announcement`. Replace-all semantics are what the editor
 * UX provides (user sees current targets, edits the list, resubmits).
 */
export async function updateAnnouncementAction(
  input: unknown,
): Promise<ServerActionResult<UpdateAnnouncementResult>> {
  const parsed = updateAnnouncementSchema.safeParse(input);
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
  const appMeta = (user.app_metadata ?? {}) as { domains?: Record<string, readonly string[]> };
  if (!(appMeta.domains?.comms ?? []).includes("u")) return fail("FORBIDDEN");

  const lim = await limiter.limit(user.id);
  if (!lim.success) return fail("RATE_LIMITED");

  // See create-announcement.ts for the `p_expires_at` cast rationale.
  const { error } = await supabase.rpc("rpc_update_announcement", {
    p_announcement_id: parsed.data.id,
    p_title: parsed.data.title,
    p_content: parsed.data.content,
    p_is_published: parsed.data.isPublished,
    p_expires_at: parsed.data.expiresAt as unknown as string,
    p_targets: serializeTargets(parsed.data.targets),
  });
  if (error) {
    if (error.code === "42501") return fail("FORBIDDEN");
    if (error.code === "22023") return fail("VALIDATION_FAILED");
    if (error.code === "P0002") return fail("NOT_FOUND");
    return fail("INTERNAL");
  }

  for (const path of ANNOUNCEMENTS_ROUTER_PATHS) {
    revalidatePath(path, "page");
  }

  after(async () => {
    const log = loggerWith({
      feature: "announcements",
      event: "update",
      user_id: user.id,
    });
    log.info({ announcement_id: parsed.data.id }, "updateAnnouncementAction completed");
  });

  return ok({ id: parsed.data.id });
}

function serializeTargets(targets: UpdateAnnouncementInput["targets"]): Json {
  return targets.map((t) => {
    switch (t.target_type) {
      case "global":
        return { target_type: "global" };
      case "role":
        return { target_type: "role", role_id: t.role_id };
      case "org_unit":
        return { target_type: "org_unit", org_unit_id: t.org_unit_id };
      case "user":
        return { target_type: "user", user_id: t.user_id };
    }
  });
}
