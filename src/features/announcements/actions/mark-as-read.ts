"use server";

import "server-only";

import { after } from "next/server";
import { revalidatePath } from "next/cache";

import { fail, ok, type ServerActionResult } from "@/lib/errors";
import { loggerWith } from "@/lib/logger";
import { createRateLimiter } from "@/lib/rate-limit";
import { createSupabaseServerClient } from "@/lib/supabase/server";

import { ANNOUNCEMENTS_ROUTER_PATHS } from "@/features/announcements/cache-tags";
import { markAsReadSchema } from "@/features/announcements/schemas/announcement";

const limiter = createRateLimiter({
  tokens: 60,
  window: "1 m",
  prefix: "announcements-mark-read",
});

/**
 * Mark a single announcement as read for the caller.
 *
 * Single INSERT on `announcement_reads` with upsert (ignoreDuplicates
 * emulates `ON CONFLICT DO NOTHING`). The table's RLS permits any
 * authenticated user to INSERT a row provided `is_claims_fresh()`
 * ([init_schema.sql:3879-3880](../../../../supabase/migrations/20260417064731_init_schema.sql#L3879)).
 * No RPC needed — single statement, no cross-table writes.
 */
export async function markAnnouncementAsReadAction(
  input: unknown,
): Promise<ServerActionResult<Readonly<{ announcementId: string }>>> {
  const parsed = markAsReadSchema.safeParse(input);
  if (!parsed.success) {
    return fail("VALIDATION_FAILED");
  }

  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return fail("UNAUTHENTICATED");

  const lim = await limiter.limit(user.id);
  if (!lim.success) return fail("RATE_LIMITED");

  const { error } = await supabase
    .from("announcement_reads")
    .upsert(
      { announcement_id: parsed.data.announcementId, user_id: user.id },
      { onConflict: "announcement_id,user_id", ignoreDuplicates: true },
    );
  if (error) return fail("INTERNAL");

  for (const path of ANNOUNCEMENTS_ROUTER_PATHS) {
    revalidatePath(path, "page");
  }

  after(async () => {
    const log = loggerWith({
      feature: "announcements",
      event: "mark_as_read",
      user_id: user.id,
    });
    log.info({ announcement_id: parsed.data.announcementId }, "markAnnouncementAsRead completed");
  });

  return ok({ announcementId: parsed.data.announcementId });
}
