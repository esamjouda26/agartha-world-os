"use server";

import "server-only";

import { after } from "next/server";
import { revalidatePath } from "next/cache";

import { fail, ok, type ServerActionResult } from "@/lib/errors";
import { loggerWith } from "@/lib/logger";
import { createRateLimiter } from "@/lib/rate-limit";
import { createSupabaseServerClient } from "@/lib/supabase/server";

import { ANNOUNCEMENTS_ROUTER_PATHS } from "@/features/announcements/cache-tags";

const limiter = createRateLimiter({
  tokens: 5,
  window: "1 m",
  prefix: "announcements-mark-all-read",
});

/**
 * Mark every currently-visible unread announcement as read for the
 * caller in a single transaction via
 * `rpc_mark_all_visible_announcements_read()`. Returns the number of
 * rows newly inserted (rows that weren't already read).
 */
export async function markAllAnnouncementsAsReadAction(): Promise<
  ServerActionResult<Readonly<{ markedCount: number }>>
> {
  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return fail("UNAUTHENTICATED");

  const lim = await limiter.limit(user.id);
  if (!lim.success) return fail("RATE_LIMITED");

  const { data, error } = await supabase.rpc("rpc_mark_all_visible_announcements_read");
  if (error) {
    if (error.code === "28000") return fail("UNAUTHENTICATED");
    return fail("INTERNAL");
  }

  const markedCount = typeof data === "number" ? data : 0;

  for (const path of ANNOUNCEMENTS_ROUTER_PATHS) {
    revalidatePath(path, "page");
  }

  after(async () => {
    const log = loggerWith({
      feature: "announcements",
      event: "mark_all_read",
      user_id: user.id,
    });
    log.info({ marked_count: markedCount }, "markAllAnnouncementsAsRead completed");
  });

  return ok({ markedCount });
}
