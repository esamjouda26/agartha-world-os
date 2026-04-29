import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "jsr:@supabase/supabase-js@2";

/**
 * enroll-biometric — Atomic vector enrolment Edge Function (Phase 9b).
 *
 * Pipeline (per prompt.md:509 + frontend_spec.md WF-7B + CLAUDE.md §2):
 *   1. Auth: Authorization: Bearer <SERVICE_ROLE_KEY>. The function is
 *      invoked by a guest-facing Server Action that has already validated
 *      the guest session cookie + CSRF — the Edge Function does not see
 *      those cookies. Direct browser invocation is rejected.
 *   2. Decode base64 image, validate size + MIME signature (sniff first
 *      bytes; never trust client-declared content-type).
 *   3. Compute SHA-256 over the raw bytes as the vector_hash.
 *      ⚠ Production deploys MUST swap this for a real face-embedding
 *      model (MediaPipe, FaceNet, ArcFace, etc.). The DB contract
 *      requires only a stable string ≥ 16 chars; the algorithm is opaque
 *      to it. This Phase 9b implementation establishes the data path.
 *   4. Discard raw image bytes (never persisted — CLAUDE.md §2 "Raw
 *      biometric images MUST NOT persist beyond vectorization").
 *   5. Call rpc_enroll_biometric (migration 20260429000003) which atomically:
 *        a. Validates active biometric_enrollment consent exists.
 *        b. Inserts/updates biometric_vectors (one row per attendee_id).
 *        c. Appends biometric_access_log row with event='enroll'.
 *   6. Return discriminated result.
 *
 * Idempotency: the underlying biometric_vectors.attendee_id UNIQUE
 * constraint makes re-enrolment a deterministic upsert. The function
 * returns `reused_existing: true` so callers can surface "we updated
 * your enrolment" vs "we created your enrolment".
 */

const MAX_IMAGE_BYTES = 8 * 1024 * 1024; // 8 MB cap per upload

// MIME signature bytes. Spec: validate signature, do not trust client header.
const MIME_SIGNATURES: Record<string, number[][]> = {
  "image/jpeg": [[0xff, 0xd8, 0xff]],
  "image/png": [[0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]],
  // WebP starts with "RIFF" then "WEBP" at offset 8 — we verify both.
  "image/webp": [[0x52, 0x49, 0x46, 0x46]],
};

interface EnrollRequest {
  attendee_id: string;
  image_base64: string;
  actor_type?: "guest_self" | "staff" | "system";
  actor_id?: string;
  ip_address?: string;
  user_agent?: string;
}

function jsonResponse(body: Record<string, unknown>, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "Content-Type": "application/json" },
  });
}

function detectMime(bytes: Uint8Array): string | null {
  for (const [mime, signatures] of Object.entries(MIME_SIGNATURES)) {
    for (const sig of signatures) {
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

async function sha256Hex(bytes: Uint8Array): Promise<string> {
  const digest = await crypto.subtle.digest("SHA-256", bytes);
  return Array.from(new Uint8Array(digest))
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
}

function base64ToBytes(b64: string): Uint8Array {
  const cleaned = b64.replace(/^data:image\/[a-zA-Z+]+;base64,/, "");
  const bin = atob(cleaned);
  const out = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i++) out[i] = bin.charCodeAt(i);
  return out;
}

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response(null, {
      status: 204,
      headers: {
        "Access-Control-Allow-Origin": "*",
        "Access-Control-Allow-Methods": "OPTIONS, POST",
        "Access-Control-Allow-Headers": "authorization, content-type",
      },
    });
  }
  if (req.method !== "POST") {
    return jsonResponse({ error: "Method not allowed" }, 405);
  }

  // ── Auth: service-role bearer only ───────────────────────────────────
  const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
  const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
  const authHeader = req.headers.get("Authorization") ?? "";
  if (authHeader !== `Bearer ${serviceKey}`) {
    return jsonResponse({ error: "Unauthorized" }, 401);
  }

  // ── Parse body ───────────────────────────────────────────────────────
  let body: EnrollRequest;
  try {
    body = await req.json();
  } catch {
    return jsonResponse({ error: "Invalid JSON body" }, 400);
  }

  if (!body.attendee_id || !body.image_base64) {
    return jsonResponse(
      { error: "attendee_id and image_base64 are required" },
      400,
    );
  }

  // ── Decode + validate image ──────────────────────────────────────────
  let bytes: Uint8Array;
  try {
    bytes = base64ToBytes(body.image_base64);
  } catch {
    return jsonResponse({ error: "Invalid base64 image" }, 400);
  }
  if (bytes.length === 0) {
    return jsonResponse({ error: "Empty image" }, 400);
  }
  if (bytes.length > MAX_IMAGE_BYTES) {
    return jsonResponse({ error: "Image too large (max 8MB)" }, 413);
  }
  const mime = detectMime(bytes);
  if (!mime) {
    return jsonResponse(
      { error: "Unsupported image format (jpeg/png/webp only)" },
      415,
    );
  }

  // ── Vector extraction ────────────────────────────────────────────────
  // Phase 9b establishes the data path. The hash is a placeholder that
  // satisfies the DB's vector_hash contract; production replaces this
  // with a real face-embedding model. The raw bytes are dropped after
  // hashing — never persisted.
  const vectorHash = await sha256Hex(bytes);

  // ── Atomic DB write via RPC ──────────────────────────────────────────
  const admin = createClient(supabaseUrl, serviceKey, {
    auth: { autoRefreshToken: false, persistSession: false },
  });

  const { data, error } = await admin.rpc("rpc_enroll_biometric", {
    p_attendee_id: body.attendee_id,
    p_vector_hash: vectorHash,
    p_actor_type: body.actor_type ?? "guest_self",
    p_actor_id: body.actor_id ?? null,
    p_ip_address: body.ip_address ?? null,
    p_user_agent: body.user_agent ?? null,
  });

  if (error) {
    console.error("[enroll-biometric] RPC failed:", error.message);
    return jsonResponse(
      { error: "Enrolment failed", detail: error.message },
      500,
    );
  }

  const result = data as {
    success: boolean;
    error?: string;
    attendee_id?: string;
    vector_id?: string;
    reused_existing?: boolean;
  };

  if (!result.success) {
    if (result.error === "NO_ACTIVE_CONSENT") {
      return jsonResponse(
        { error: "No active biometric consent for this attendee" },
        403,
      );
    }
    if (result.error === "INVALID_ATTENDEE") {
      return jsonResponse({ error: "Attendee not found" }, 404);
    }
    return jsonResponse({ error: result.error ?? "Unknown error" }, 500);
  }

  console.log(
    `[enroll-biometric] enrolled attendee=${body.attendee_id} reused=${result.reused_existing}`,
  );
  return jsonResponse({
    success: true,
    attendee_id: result.attendee_id,
    vector_id: result.vector_id,
    reused_existing: result.reused_existing,
    mime_detected: mime,
  });
});
