"use client";

import { createSupabaseBrowserClient } from "@/lib/supabase/browser";

/**
 * Upload a clarification attachment blob (MC, receipt, photo, etc.) to
 * the `attendance-clarifications` storage bucket. Mirrors the selfie
 * upload pattern in [`upload-selfie.ts`](./upload-selfie.ts).
 *
 * Path shape (RLS-enforced): `{staff_record_id}/{exception_id}/{uuid}.{ext}`
 *
 * After the upload succeeds, pass the returned path into the
 * `submitClarificationAction.attachmentPaths` array — the RPC pulls
 * metadata (mime, size) back from `storage.objects` and links the row
 * to the exception atomically with the clarification text.
 *
 * Bucket constraints (migration
 * [20260422120000_attendance_clarification_workflow.sql](../../../../supabase/migrations/20260422120000_attendance_clarification_workflow.sql)):
 *   - 10 MB size cap
 *   - image/jpeg, image/png, image/webp, image/heic, application/pdf
 *   - Private — read via signed URL only (`createSignedUrl`, TTL ≤ 15 min)
 *   - No update, no delete policies — uploads are permanent audit records
 */
export const ATTENDANCE_CLARIFICATIONS_BUCKET = "attendance-clarifications" as const;

export async function uploadClarificationAttachment(
  blob: Blob,
  exceptionId: string,
  staffRecordId: string,
  fileName: string,
): Promise<string> {
  const supabase = createSupabaseBrowserClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) throw new Error("UNAUTHENTICATED");

  const ext = fileName.split(".").pop()?.toLowerCase() ?? "bin";
  const fileId = crypto.randomUUID();
  const path = `${staffRecordId}/${exceptionId}/${fileId}.${ext}`;

  const { error } = await supabase.storage
    .from(ATTENDANCE_CLARIFICATIONS_BUCKET)
    .upload(path, blob, {
      cacheControl: "0",
      contentType: blob.type || "application/octet-stream",
      upsert: false,
    });
  if (error) throw error;
  return path;
}

/**
 * Resolve a signed URL for a clarification attachment. Used when
 * rendering the thumbnail / download link in the UI.
 *
 * TTL kept at 15 min per frontend_spec.md §4 (file upload security).
 */
export async function getClarificationAttachmentSignedUrl(path: string): Promise<string> {
  const supabase = createSupabaseBrowserClient();
  const { data, error } = await supabase.storage
    .from(ATTENDANCE_CLARIFICATIONS_BUCKET)
    .createSignedUrl(path, 60 * 15);
  if (error || !data) throw error ?? new Error("SIGN_URL_FAILED");
  return data.signedUrl;
}
