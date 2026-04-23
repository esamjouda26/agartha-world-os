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
  createAnnouncementSchema,
  type CreateAnnouncementInput,
} from "@/features/announcements/schemas/announcement";

export type CreateAnnouncementResult = Readonly<{ id: string }>;

const limiter = createRateLimiter({
  tokens: 10,
  window: "1 m",
  prefix: "announcements-create",
});

/**
 * Create an announcement + its audience targets atomically via
 * `rpc_create_announcement` (added in
 * 20260422140000_add_announcement_crud_rpcs.sql). 8-step pipeline per
 * prompt.md.
 *
 * AuthZ is enforced in two places — Server Action checks `comms:c` fast
 * (to short-circuit before hitting the DB), and the RPC re-checks on
 * its own so direct-from-studio callers can't bypass.
 */
export async function createAnnouncementAction(
  input: unknown,
): Promise<ServerActionResult<CreateAnnouncementResult>> {
  const parsed = createAnnouncementSchema.safeParse(input);
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
  if (!(appMeta.domains?.comms ?? []).includes("c")) return fail("FORBIDDEN");

  const lim = await limiter.limit(user.id);
  if (!lim.success) return fail("RATE_LIMITED");

  // Supabase gen-types list `p_expires_at` as `string` (SQL nullability
  // doesn't round-trip to the TS signature). The RPC itself accepts NULL
  // — cast paper-overs the gen-types gap without weakening the call site.
  const { data, error } = await supabase.rpc("rpc_create_announcement", {
    p_title: parsed.data.title,
    p_content: parsed.data.content,
    p_is_published: parsed.data.isPublished,
    p_expires_at: parsed.data.expiresAt as unknown as string,
    p_targets: serializeTargets(parsed.data.targets),
  });
  if (error) {
    if (error.code === "42501") return fail("FORBIDDEN");
    if (error.code === "22023") return fail("VALIDATION_FAILED");
    return fail("INTERNAL");
  }
  if (!data) return fail("INTERNAL");

  for (const path of ANNOUNCEMENTS_ROUTER_PATHS) {
    revalidatePath(path, "page");
  }

  after(async () => {
    const log = loggerWith({
      feature: "announcements",
      event: "create",
      user_id: user.id,
    });
    log.info({ announcement_id: data }, "createAnnouncementAction completed");
  });

  return ok({ id: data });
}

function serializeTargets(targets: CreateAnnouncementInput["targets"]): Json {
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
