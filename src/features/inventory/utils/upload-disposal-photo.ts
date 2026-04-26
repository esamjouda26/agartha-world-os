"use client";

import { createSupabaseBrowserClient } from "@/lib/supabase/browser";

/**
 * Upload a disposal photo to the private `operations` Storage bucket.
 *
 * Bucket policy at [init_schema.sql:7060](../../../supabase/migrations/20260417064731_init_schema.sql#L7060)
 * allows any authenticated insert. Per [frontend_spec.md:66](../../../frontend_spec.md#L66)
 * the `operations` bucket hosts incident attachments, write-off photos,
 * maintenance photos, and auto-captured guest photos.
 *
 * Returns the storage object path (NOT a signed URL) — the `write_offs.photo_proof_url`
 * column stores the path; later viewers sign on demand via
 * `storage.from("operations").createSignedUrl(path, ttl)`.
 */
export async function uploadDisposalPhoto(file: File, idempotencyKey: string): Promise<string> {
  const supabase = createSupabaseBrowserClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) throw new Error("UNAUTHENTICATED");

  const ext = inferExtension(file.type, file.name);
  const path = `${user.id}/disposals/${idempotencyKey}.${ext}`;

  const { error } = await supabase.storage.from("operations").upload(path, file, {
    cacheControl: "3600",
    contentType: file.type || "image/jpeg",
    upsert: false,
  });
  if (error) throw error;
  return path;
}

function inferExtension(mime: string, fileName: string): string {
  switch (mime) {
    case "image/jpeg":
      return "jpg";
    case "image/png":
      return "png";
    case "image/webp":
      return "webp";
    case "image/heic":
      return "heic";
    default: {
      const dot = fileName.lastIndexOf(".");
      return dot >= 0 ? fileName.slice(dot + 1).toLowerCase() : "bin";
    }
  }
}
