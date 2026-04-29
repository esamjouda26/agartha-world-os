import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "jsr:@supabase/supabase-js@2";

/**
 * cron-image-pipeline — Storage object-created hook that pre-warms
 * AVIF + WebP derivatives at three widths.
 *
 * Trigger: a Supabase Storage webhook configured on bucket(s) carrying
 * user-supplied imagery (e.g. `captured-photos`). The webhook fires
 * AFTER INSERT on `storage.objects` and POSTs this Edge Function with a
 * payload of shape:
 *   {
 *     type: "INSERT",
 *     table: "objects",
 *     schema: "storage",
 *     record: { id, name, bucket_id, owner, metadata, created_at, ... },
 *     old_record: null
 *   }
 *
 * Pipeline (per frontend_spec.md:115):
 *   1. Auth: Authorization: Bearer <CRON_SECRET>. Storage webhook is
 *      configured with the secret in its custom-headers section. Anyone
 *      else hitting this URL gets 401.
 *   2. Skip self-recursion: if the object path already matches a
 *      derivative pattern (`*.<width>w.<format>`), short-circuit.
 *   3. Skip non-image MIME (per record.metadata.mimetype). Buckets that
 *      hold mixed content (e.g. PDFs in incident attachments) avoid
 *      pointless render calls this way.
 *   4. Validate MIME signature by downloading the first 16 bytes via
 *      Range request — never trust the client-declared mimetype.
 *   5. For each (width, format) in {320, 768, 1280} × {avif, webp}:
 *        - Fetch /storage/v1/render/image/authenticated/<bucket>/<path>
 *          ?width=N&format=F&quality=80 (Supabase's Image Transformation
 *          handles decode, resize, EXIF strip, and re-encode).
 *        - Upload result to <bucket>/<original-stem>.<N>w.<format>
 *          (alongside the original). upsert: false → idempotent re-runs.
 *
 * Output naming: `<owner>/<resource>/<uuid>.original.<ext>` →
 *                `<owner>/<resource>/<uuid>.<width>w.<format>`
 * Display layer (next/image custom loader) computes derivative URLs from
 * the original path deterministically — no metadata table required.
 *
 * Failure handling: per-derivative errors are collected and reported but
 * do not fail the whole webhook (HTTP 2xx). Storage webhook timeout is
 * generous; we don't want a single missing format to keep retrying.
 */

const WIDTHS = [320, 768, 1280] as const;
const FORMATS = ["avif", "webp"] as const;
const RENDER_QUALITY = 80;
// Range request budget for MIME sniffing — first 16 bytes is enough for
// JPEG (ff d8 ff), PNG (89 50 4e 47 0d 0a 1a 0a), WebP (RIFF…WEBP), HEIC.
const SNIFF_BYTES = 16;

const MIME_SIGNATURES: Record<string, number[][]> = {
  "image/jpeg": [[0xff, 0xd8, 0xff]],
  "image/png": [[0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]],
  "image/webp": [[0x52, 0x49, 0x46, 0x46]],
  "image/heic": [[0x66, 0x74, 0x79, 0x70, 0x68, 0x65, 0x69, 0x63]], // ftypheic
  "image/heif": [[0x66, 0x74, 0x79, 0x70, 0x6d, 0x69, 0x66, 0x31]], // ftypmif1
};

interface StorageWebhookPayload {
  type: "INSERT" | "UPDATE" | "DELETE";
  table: string;
  schema: string;
  record: {
    id?: string;
    name: string;
    bucket_id: string;
    owner?: string | null;
    metadata?: { size?: number; mimetype?: string } | null;
    created_at?: string;
  } | null;
  old_record: unknown;
}

function jsonResponse(body: Record<string, unknown>, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "Content-Type": "application/json" },
  });
}

/** True iff the path ends with `.<digits>w.<avif|webp>` — i.e. a derivative we already created. */
function isDerivativePath(name: string): boolean {
  return /\.\d+w\.(avif|webp)$/i.test(name);
}

/** Detect file MIME by sniffing the first bytes; returns null on no match. */
function detectMime(bytes: Uint8Array): string | null {
  // HEIC/HEIF: signature lives at offset 4 (after the 4-byte box length).
  if (bytes.length >= 12) {
    for (const [mime, sigs] of Object.entries(MIME_SIGNATURES)) {
      if (mime !== "image/heic" && mime !== "image/heif") continue;
      for (const sig of sigs) {
        let match = true;
        for (let i = 0; i < sig.length; i++) {
          if (bytes[4 + i] !== sig[i]) {
            match = false;
            break;
          }
        }
        if (match) return mime;
      }
    }
  }
  // Standard signatures live at offset 0.
  for (const [mime, sigs] of Object.entries(MIME_SIGNATURES)) {
    if (mime === "image/heic" || mime === "image/heif") continue;
    for (const sig of sigs) {
      if (bytes.length < sig.length) continue;
      let match = true;
      for (let i = 0; i < sig.length; i++) {
        if (bytes[i] !== sig[i]) {
          match = false;
          break;
        }
      }
      if (!match) continue;
      if (mime === "image/webp") {
        if (bytes.length < 12) return null;
        const tag = String.fromCharCode(bytes[8], bytes[9], bytes[10], bytes[11]);
        if (tag !== "WEBP") return null;
      }
      return mime;
    }
  }
  return null;
}

/**
 * Compute the derivative storage path. Originals follow the convention
 * `<owner>/<resource>/<uuid>.original.<ext>`. Derivatives drop the
 * `.original` infix and replace the extension:
 *   user1/abc/uuid.original.jpg → user1/abc/uuid.768w.avif
 * If the original lacks `.original.`, we just append `.<width>w.<fmt>`
 * before the extension; the loader will need a parallel rule.
 */
function derivativePath(originalName: string, width: number, format: string): string {
  const originalMatch = originalName.match(/^(.*)\.original(\.[^.]+)?$/);
  if (originalMatch) {
    return `${originalMatch[1]}.${width}w.${format}`;
  }
  // Fallback: insert .<width>w.<format> before final extension.
  const lastDot = originalName.lastIndexOf(".");
  if (lastDot === -1) return `${originalName}.${width}w.${format}`;
  return `${originalName.substring(0, lastDot)}.${width}w.${format}`;
}

Deno.serve(async (req: Request) => {
  if (req.method !== "POST") {
    return jsonResponse({ error: "Method not allowed" }, 405);
  }

  // ── Auth ─────────────────────────────────────────────────────────────
  const cronSecret = Deno.env.get("CRON_SECRET");
  if (!cronSecret) {
    return jsonResponse({ error: "CRON_SECRET not configured" }, 500);
  }
  const authHeader = req.headers.get("Authorization") ?? "";
  if (authHeader !== `Bearer ${cronSecret}`) {
    return jsonResponse({ error: "Unauthorized" }, 401);
  }

  const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
  const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

  // ── Parse webhook payload ────────────────────────────────────────────
  let payload: StorageWebhookPayload;
  try {
    payload = await req.json();
  } catch {
    return jsonResponse({ error: "Invalid JSON body" }, 400);
  }

  if (payload.type !== "INSERT" || !payload.record) {
    // We only act on object-created events; ignore everything else.
    return jsonResponse({ skipped: true, reason: "not_insert" });
  }

  const { name, bucket_id: bucket, metadata } = payload.record;
  if (!name || !bucket) {
    return jsonResponse({ skipped: true, reason: "missing_name_or_bucket" });
  }

  // 1. Skip self-recursion: don't process derivatives we already created.
  if (isDerivativePath(name)) {
    return jsonResponse({ skipped: true, reason: "is_derivative", name });
  }

  // 2. Skip non-image MIME early (cheap header-level filter).
  const declaredMime = metadata?.mimetype ?? "";
  if (declaredMime && !declaredMime.startsWith("image/")) {
    return jsonResponse({
      skipped: true,
      reason: "non_image_mimetype",
      mimetype: declaredMime,
    });
  }

  // 3. Sniff actual signature via Range request — Trust no client header.
  const downloadUrl = `${supabaseUrl}/storage/v1/object/${bucket}/${encodeURI(name)}`;
  const sniffRes = await fetch(downloadUrl, {
    headers: {
      Authorization: `Bearer ${serviceKey}`,
      apikey: serviceKey,
      Range: `bytes=0-${SNIFF_BYTES - 1}`,
    },
  });
  if (!sniffRes.ok) {
    console.error(
      `[cron-image-pipeline] sniff fetch failed ${sniffRes.status} for ${bucket}/${name}`,
    );
    return jsonResponse(
      { error: "Failed to sniff original", status: sniffRes.status },
      502,
    );
  }
  const sniffBuf = new Uint8Array(await sniffRes.arrayBuffer());
  const detectedMime = detectMime(sniffBuf);
  if (!detectedMime) {
    console.warn(
      `[cron-image-pipeline] unsupported MIME for ${bucket}/${name} (declared=${declaredMime})`,
    );
    return jsonResponse({
      skipped: true,
      reason: "unsupported_mime_signature",
      declared_mime: declaredMime,
    });
  }

  // ── Generate derivatives via Supabase Storage Image Transformation ──
  //
  // The /render/image/authenticated/... endpoint decodes the original,
  // strips EXIF, resizes to ?width=N, and re-encodes to ?format=F. We
  // download the rendered output and persist it as a real Storage object
  // alongside the original, so display URLs hit Storage's edge cache
  // directly without running through the on-the-fly transform on every
  // request (which is metered and slower than a static asset).
  const admin = createClient(supabaseUrl, serviceKey, {
    auth: { autoRefreshToken: false, persistSession: false },
  });

  const created: string[] = [];
  const skipped: string[] = [];
  const errors: string[] = [];

  for (const width of WIDTHS) {
    for (const format of FORMATS) {
      const targetPath = derivativePath(name, width, format);

      // Idempotency: if the derivative already exists, skip the work.
      const { data: existing } = await admin.storage
        .from(bucket)
        .list(targetPath.substring(0, targetPath.lastIndexOf("/")) || "", {
          search: targetPath.substring(targetPath.lastIndexOf("/") + 1),
          limit: 1,
        });
      if (existing && existing.length > 0) {
        skipped.push(targetPath);
        continue;
      }

      const renderUrl =
        `${supabaseUrl}/storage/v1/render/image/authenticated/${bucket}/${encodeURI(name)}` +
        `?width=${width}&format=${format}&quality=${RENDER_QUALITY}&resize=contain`;

      try {
        const renderRes = await fetch(renderUrl, {
          headers: {
            Authorization: `Bearer ${serviceKey}`,
            apikey: serviceKey,
          },
        });
        if (!renderRes.ok) {
          errors.push(
            `${targetPath}: render ${renderRes.status} ${await renderRes.text().catch(() => "")}`,
          );
          continue;
        }
        const derivativeBytes = new Uint8Array(await renderRes.arrayBuffer());

        const { error: uploadErr } = await admin.storage
          .from(bucket)
          .upload(targetPath, derivativeBytes, {
            contentType: `image/${format}`,
            upsert: false,
            cacheControl: "31536000, immutable",
          });
        if (uploadErr) {
          // Duplicate (raced with another invocation) is fine — it's the
          // idempotency path we just couldn't see in the list-call.
          if (uploadErr.message?.toLowerCase().includes("already exists")) {
            skipped.push(targetPath);
          } else {
            errors.push(`${targetPath}: upload ${uploadErr.message}`);
          }
          continue;
        }
        created.push(targetPath);
      } catch (err) {
        errors.push(
          `${targetPath}: ${err instanceof Error ? err.message : String(err)}`,
        );
      }
    }
  }

  console.log(
    `[cron-image-pipeline] ${bucket}/${name} mime=${detectedMime} created=${created.length} skipped=${skipped.length} errors=${errors.length}`,
  );

  return jsonResponse({
    bucket,
    original: name,
    detected_mime: detectedMime,
    created,
    skipped,
    errors: errors.slice(0, 10),
  });
});
