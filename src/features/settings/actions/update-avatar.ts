"use server";

import "server-only";

import { after } from "next/server";
import { revalidatePath } from "next/cache";

import { fail, ok, type ServerActionResult } from "@/lib/errors";
import { loggerWith } from "@/lib/logger";
import { createRateLimiter } from "@/lib/rate-limit";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { SETTINGS_ROUTER_PATHS } from "@/features/settings/cache-tags";
import { avatarFileSchema, type AvatarMime } from "@/features/settings/schemas/profile";

export type UpdateAvatarResult = Readonly<{
  avatarUrl: string;
}>;

const limiter = createRateLimiter({
  tokens: 5,
  window: "1 m",
  prefix: "settings-update-avatar",
});

/**
 * Update the caller's avatar — 8-step pipeline per prompt.md.
 *
 * Flow:
 *   1. Validate the File (size + MIME) against `avatarFileSchema`.
 *   2. Verify session + rate-limit.
 *   3. Upload to `avatars/{user.id}/avatar.{ext}` via the authenticated
 *      storage client. The `avatars_insert_own` / `avatars_update_own`
 *      storage policies
 *      ([init_schema.sql:7045-7046](../../../../supabase/migrations/20260417064731_init_schema.sql#L7045))
 *      permit the row owner to write into their own folder.
 *   4. Resolve the public URL (bucket is `public=TRUE` per
 *      [init_schema.sql:7035](../../../../supabase/migrations/20260417064731_init_schema.sql#L7035)).
 *   5. Persist via `rpc_update_own_avatar(p_avatar_url)` — SECURITY DEFINER
 *      RPC at [init_schema.sql:5794](../../../../supabase/migrations/20260417064731_init_schema.sql#L5794).
 *   6. Invalidate SETTINGS_ROUTER_PATHS per ADR-0006.
 *
 * Form input: FormData with a single `avatar` field holding the File.
 * Idempotency key not required — avatar update is not a financial/critical
 * mutation and the fixed object key `avatar.<ext>` already makes re-uploads
 * overwrite the prior image in place.
 */
export async function updateAvatarAction(
  input: FormData,
): Promise<ServerActionResult<UpdateAvatarResult>> {
  // 1. Zod parse
  const rawFile = input.get("avatar");
  const parsed = avatarFileSchema.safeParse(rawFile);
  if (!parsed.success) {
    const fields: Record<string, string> = {};
    for (const issue of parsed.error.issues) {
      fields[issue.path.join(".") || "avatar"] = issue.message;
    }
    return fail("VALIDATION_FAILED", fields);
  }
  const file = parsed.data;

  const supabase = await createSupabaseServerClient();

  // 2. AuthN (no RBAC — self-service endpoint)
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return fail("UNAUTHENTICATED");

  // 3. Rate limit
  const lim = await limiter.limit(user.id);
  if (!lim.success) return fail("RATE_LIMITED");

  // Map MIME → extension. Narrow to the 3 allowed types; any other MIME
  // fails Zod in step 1 so this is exhaustive against validated input.
  const extByMime: Record<AvatarMime, string> = {
    "image/jpeg": "jpg",
    "image/png": "png",
    "image/webp": "webp",
  };
  const ext = extByMime[file.type as AvatarMime];
  const objectPath = `${user.id}/avatar.${ext}`;

  // 5a. Upload — upsert so repeated uploads overwrite in place. The storage
  // policy `avatars_insert_own` requires `(storage.foldername(name))[1] =
  // auth.uid()` which `user.id` satisfies.
  const { error: uploadError } = await supabase.storage.from("avatars").upload(objectPath, file, {
    cacheControl: "3600",
    upsert: true,
    contentType: file.type,
  });
  if (uploadError) return fail("DEPENDENCY_FAILED");

  // 5b. Resolve public URL + append a cache-busting version so clients see
  // the new image without waiting for the 3600 s cache to expire.
  const { data: urlData } = supabase.storage.from("avatars").getPublicUrl(objectPath);
  const avatarUrl = `${urlData.publicUrl}?v=${Date.now()}`;

  // 5c. Persist via SECURITY DEFINER RPC — writes `profiles.avatar_url`
  // bypassing the `hr:u`-gated UPDATE policy.
  const { error: rpcError } = await supabase.rpc("rpc_update_own_avatar", {
    p_avatar_url: avatarUrl,
  });
  if (rpcError) return fail("INTERNAL");

  // 7. Surgical Router Cache invalidation (ADR-0006).
  for (const path of SETTINGS_ROUTER_PATHS) {
    revalidatePath(path, "page");
  }

  // 8. Structured log — deferred via after() so the response is not blocked.
  after(async () => {
    const log = loggerWith({
      feature: "settings",
      event: "update_avatar",
      user_id: user.id,
    });
    log.info({ success: true, bytes: file.size, mime: file.type }, "updateAvatarAction completed");
  });

  return ok({ avatarUrl });
}
