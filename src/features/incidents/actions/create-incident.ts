"use server";

import "server-only";

import { after } from "next/server";
import { revalidatePath } from "next/cache";
import { z } from "zod";

import { fail, ok, type ServerActionResult } from "@/lib/errors";
import { loggerWith } from "@/lib/logger";
import { createRateLimiter } from "@/lib/rate-limit";
import { createSupabaseServerClient } from "@/lib/supabase/server";

import { INCIDENTS_ROUTER_PATHS } from "@/features/incidents/cache-tags";
import {
  INCIDENT_ATTACHMENT_ALLOWED_MIME,
  INCIDENT_ATTACHMENT_MAX_BYTES,
  type IncidentAttachmentMime,
} from "@/features/incidents/constants";
import { createIncidentSchema } from "@/features/incidents/schemas/incident";

export type CreateIncidentResult = Readonly<{ id: string }>;

const limiter = createRateLimiter({
  tokens: 20,
  window: "1 m",
  prefix: "incidents-create",
});

const attachmentFileSchema = z
  .instanceof(File)
  .refine((f) => f.size > 0, "The selected file is empty.")
  .refine(
    (f) => f.size <= INCIDENT_ATTACHMENT_MAX_BYTES,
    `Attachment must be ${Math.round(INCIDENT_ATTACHMENT_MAX_BYTES / 1024 / 1024)} MB or smaller.`,
  )
  .refine(
    (f) => (INCIDENT_ATTACHMENT_ALLOWED_MIME as readonly string[]).includes(f.type),
    "Attachment must be JPEG, PNG, WebP, MP4, or PDF.",
  );

const MIME_TO_EXT: Record<IncidentAttachmentMime, string> = {
  "image/jpeg": "jpg",
  "image/png": "png",
  "image/webp": "webp",
  "video/mp4": "mp4",
  "application/pdf": "pdf",
};

/**
 * Report a new incident. Accepts `FormData` so the optional attachment
 * file, text fields, and selection IDs travel in a single round-trip.
 *
 * `incidents_insert` RLS is Tier-2 universal for any authenticated user
 * ([init_schema.sql:3536-3537](../../../../supabase/migrations/20260417064731_init_schema.sql#L3536)),
 * so no domain-level auth check is needed — only authentication +
 * rate-limit.
 *
 * Attachment path is stored as a bucket-relative key, not a full URL.
 * The read-side resolver expands it via `getPublicUrl` so URL-scheme
 * changes never need a backfill.
 */
export async function createIncidentAction(
  input: FormData,
): Promise<ServerActionResult<CreateIncidentResult>> {
  const rawFile = input.get("attachment");
  const hasFile = rawFile instanceof File && rawFile.size > 0;

  // Validate text fields.
  const parsed = createIncidentSchema.safeParse({
    category: input.get("category"),
    description: input.get("description"),
    zoneId: emptyToNull(input.get("zoneId")),
    // We populate `attachmentPath` after upload — seed as null so the
    // text-side schema passes; file validation is done separately below.
    attachmentPath: null,
  });
  if (!parsed.success) {
    const fields: Record<string, string> = {};
    for (const issue of parsed.error.issues) {
      fields[issue.path.join(".") || "form"] = issue.message;
    }
    return fail("VALIDATION_FAILED", fields);
  }

  // Validate the attachment file shape (if present).
  if (hasFile) {
    const fileCheck = attachmentFileSchema.safeParse(rawFile);
    if (!fileCheck.success) {
      const fields: Record<string, string> = {};
      for (const issue of fileCheck.error.issues) {
        fields.attachment = issue.message;
        break;
      }
      return fail("VALIDATION_FAILED", fields);
    }
  }

  const supabase = await createSupabaseServerClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return fail("UNAUTHENTICATED");

  const lim = await limiter.limit(user.id);
  if (!lim.success) return fail("RATE_LIMITED");

  let attachmentPath: string | null = null;
  if (hasFile) {
    const file = rawFile;
    const mime = file.type as IncidentAttachmentMime;
    const ext = MIME_TO_EXT[mime];
    // Path shape: `incidents/<user_id>/<timestamp>-<category>.<ext>`.
    // The user-id prefix is stable across uploads; the timestamp keeps
    // repeat uploads for the same category unique.
    attachmentPath = `incidents/${user.id}/${Date.now()}-${parsed.data.category}.${ext}`;
    const { error: uploadErr } = await supabase.storage
      .from("operations")
      .upload(attachmentPath, file, { contentType: file.type, upsert: false });
    if (uploadErr) return fail("DEPENDENCY_FAILED");
  }

  const { data, error } = await supabase
    .from("incidents")
    .insert({
      category: parsed.data.category,
      description: parsed.data.description,
      zone_id: parsed.data.zoneId,
      attachment_url: attachmentPath,
      status: "open",
      created_by: user.id,
    })
    .select("id")
    .single();
  if (error) return fail("INTERNAL");

  for (const path of INCIDENTS_ROUTER_PATHS) {
    revalidatePath(path, "page");
  }

  after(async () => {
    const log = loggerWith({
      feature: "incidents",
      event: "create",
      user_id: user.id,
    });
    log.info(
      {
        incident_id: data.id,
        category: parsed.data.category,
        has_attachment: hasFile,
      },
      "createIncidentAction completed",
    );
  });

  return ok({ id: data.id });
}

function emptyToNull(v: FormDataEntryValue | null): string | null {
  if (typeof v !== "string") return null;
  const t = v.trim();
  return t.length === 0 ? null : t;
}
