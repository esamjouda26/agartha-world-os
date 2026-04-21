"use client";

import { createSupabaseBrowserClient } from "@/lib/supabase/browser";
import { ATTENDANCE_BUCKET } from "@/features/attendance/constants";

/**
 * Upload a selfie Blob to the private `attendance` Storage bucket.
 * RLS policies at [init_schema.sql:7050](supabase/migrations/20260417064731_init_schema.sql#L7050)
 * enforce that the first path segment must equal `auth.uid()` — we obey that
 * convention with `{uid}/{shift_date}/{kind}-{idempotencyKey}.webp`.
 *
 * Returns the object path (not a signed URL) — the RPC stores the raw path;
 * later consumers sign on demand via `storage.from(bucket).createSignedUrl`.
 */
export async function uploadSelfie(
  blob: Blob,
  shiftDate: string,
  kind: "clock-in" | "clock-out",
  fileId: string,
): Promise<string> {
  const supabase = createSupabaseBrowserClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) throw new Error("UNAUTHENTICATED");

  const path = `${user.id}/${shiftDate}/${kind}-${fileId}.webp`;
  const { error } = await supabase.storage.from(ATTENDANCE_BUCKET).upload(path, blob, {
    cacheControl: "0",
    contentType: blob.type || "image/webp",
    upsert: false,
  });
  if (error) throw error;
  return path;
}
