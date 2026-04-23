"use server";

import "server-only";

import { after } from "next/server";
import { revalidatePath } from "next/cache";

import { fail, ok, type ServerActionResult } from "@/lib/errors";
import { loggerWith } from "@/lib/logger";
import { createRateLimiter } from "@/lib/rate-limit";
import { createSupabaseServerClient } from "@/lib/supabase/server";

import { ANNOUNCEMENTS_ROUTER_PATHS } from "@/features/announcements/cache-tags";
import { deleteAnnouncementSchema } from "@/features/announcements/schemas/announcement";

const limiter = createRateLimiter({
  tokens: 10,
  window: "1 m",
  prefix: "announcements-delete",
});

/**
 * Delete an announcement. Single statement — `announcement_targets` and
 * `announcement_reads` are removed via ON DELETE CASCADE
 * ([init_schema.sql:3826,3842](../../../../supabase/migrations/20260417064731_init_schema.sql#L3826)).
 * No RPC needed: one SQL statement satisfies CLAUDE.md §4.
 *
 * AuthZ: RLS `announcements_delete` gates on `comms:d`
 * ([init_schema.sql:3862-3863](../../../../supabase/migrations/20260417064731_init_schema.sql#L3862)).
 * The `.delete()` call inherits the caller's session; if they lack
 * `comms:d` the statement returns `count: 0` with no error, which we
 * detect by checking the count.
 */
export async function deleteAnnouncementAction(
  input: unknown,
): Promise<ServerActionResult<Readonly<{ id: string }>>> {
  const parsed = deleteAnnouncementSchema.safeParse(input);
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
  if (!(appMeta.domains?.comms ?? []).includes("d")) return fail("FORBIDDEN");

  const lim = await limiter.limit(user.id);
  if (!lim.success) return fail("RATE_LIMITED");

  const { error, count } = await supabase
    .from("announcements")
    .delete({ count: "exact" })
    .eq("id", parsed.data.id);
  if (error) return fail("INTERNAL");
  if ((count ?? 0) === 0) return fail("NOT_FOUND");

  for (const path of ANNOUNCEMENTS_ROUTER_PATHS) {
    revalidatePath(path, "page");
  }

  after(async () => {
    const log = loggerWith({
      feature: "announcements",
      event: "delete",
      user_id: user.id,
    });
    log.info({ announcement_id: parsed.data.id }, "deleteAnnouncementAction completed");
  });

  return ok({ id: parsed.data.id });
}
