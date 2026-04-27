import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "jsr:@supabase/supabase-js@2";

/**
 * send-email — Unified transactional email Edge Function
 *
 * Flows:
 *   1. booking_otp           — 6-digit OTP for /my-booking lookup
 *   2. staff_invite          — Creates auth user, sends temp password
 *   3. booking_confirmation  — Post-payment success
 *   4. booking_modified      — Guest reschedule
 *   5. booking_cascaded      — Forced reschedule (slot/experience change)
 *   6. payment_failed        — Stripe `payment_intent.payment_failed`
 *   7. report_ready          — Scheduled report CSV delivery
 *
 * Idempotency: every flow consults `email_dispatch_log` via a
 * `(template_key, booking_id|recipient_email, parameters_hash)` unique
 * index. INSERT-before-send: a duplicate INSERT short-circuits to
 * `{ idempotent: true, sent: false }` without invoking Resend.
 *
 * The `parameters_hash` is SHA-256 hex of a flow-specific dedup tuple
 * (e.g. for booking_otp: `${booking_ref}|${otp_code}|${expires_at}`).
 * A fresh OTP triggers a fresh email; the same OTP twice does not.
 *
 * Requires environment variables:
 *   SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, RESEND_API_KEY
 *
 * Optional:
 *   SENDER_EMAIL  (default: AgarthaOS <onboarding@resend.dev>)
 *   APP_URL       (default: https://app.agartha.com)
 */

const RESEND_API = "https://api.resend.com/emails";

interface OtpRequest {
  type: "booking_otp";
  booking_ref: string;
}

interface StaffInviteRequest {
  type: "staff_invite";
  staff_record_id: string;
  work_email: string;
  role_id: string;
  display_name: string;
  employee_id: string;
  iam_request_id?: string;
}

interface BookingConfirmationRequest {
  type: "booking_confirmation";
  booking_ref: string;
  booker_name: string;
  booker_email: string;
  qr_code_ref: string;
  slot_date: string;
  start_time: string;
  tier_name: string;
  total_price: number;
  adult_count: number;
  child_count: number;
  discount_applied?: number;
}

interface BookingModifiedRequest {
  type: "booking_modified";
  booking_ref: string;
  booker_name: string;
  booker_email: string;
  new_slot_date: string;
  new_start_time: string;
}

interface BookingCascadedRequest {
  type: "booking_cascaded";
  booking_ref: string;
  booker_name: string;
  booker_email: string;
  old_slot_date: string;
  old_start_time: string;
  new_slot_date: string;
  new_start_time: string;
  reason?: string;
}

interface ReportReadyRequest {
  type: "report_ready";
  recipient_email: string;
  report_type: string;
  row_count: number;
  file_url: string;
}

interface PaymentFailedRequest {
  type: "payment_failed";
  booking_ref: string;
  booker_name: string;
  booker_email: string;
  reason?: string;
}

type EmailRequest =
  | OtpRequest
  | StaffInviteRequest
  | BookingConfirmationRequest
  | BookingModifiedRequest
  | BookingCascadedRequest
  | ReportReadyRequest
  | PaymentFailedRequest;

// ── Helpers ──────────────────────────────────────────────────────────────────

function jsonResponse(body: Record<string, unknown>, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "Content-Type": "application/json" },
  });
}

async function sha256Hex(input: string): Promise<string> {
  const buf = new TextEncoder().encode(input);
  const hash = await crypto.subtle.digest("SHA-256", buf);
  return Array.from(new Uint8Array(hash))
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
}

// deno-lint-ignore no-explicit-any
type SupabaseAdmin = any;

/**
 * Reserve a ledger slot. Returns:
 *   - { ok: true,  idempotent: false, ledger_id }  → caller should send Resend
 *   - { ok: true,  idempotent: true }              → duplicate; do NOT send
 *   - { ok: false, error }                         → DB-level failure
 *
 * The unique partial indexes on `email_dispatch_log` are what enforce
 * dedup: a duplicate INSERT raises Postgres `23505` which we catch and
 * surface as `idempotent: true`. Any other error bubbles.
 */
async function reserveLedgerSlot(
  admin: SupabaseAdmin,
  params: {
    template_key: string;
    booking_id: string | null;
    recipient_email: string;
    parameters_hash: string;
  }
): Promise<
  | { ok: true; idempotent: false; ledger_id: string }
  | { ok: true; idempotent: true }
  | { ok: false; error: string }
> {
  const { data, error } = await admin
    .from("email_dispatch_log")
    .insert(params)
    .select("id")
    .maybeSingle();

  if (error) {
    // 23505 = unique_violation (PostgreSQL). Any other code is a real DB
    // problem worth surfacing.
    if (error.code === "23505") {
      return { ok: true, idempotent: true };
    }
    return { ok: false, error: error.message ?? "Failed to reserve ledger slot" };
  }
  if (!data?.id) {
    return { ok: false, error: "Ledger insert returned no id" };
  }
  return { ok: true, idempotent: false, ledger_id: data.id };
}

async function markLedgerSent(
  admin: SupabaseAdmin,
  ledger_id: string,
  resend_message_id: string | null
): Promise<void> {
  await admin
    .from("email_dispatch_log")
    .update({
      sent_at: new Date().toISOString(),
      resend_message_id,
    })
    .eq("id", ledger_id);
}

async function markLedgerError(
  admin: SupabaseAdmin,
  ledger_id: string,
  error_text: string
): Promise<void> {
  await admin
    .from("email_dispatch_log")
    .update({ error: error_text })
    .eq("id", ledger_id);
}

/**
 * Resolve the optional `bookings.id` for a given `booking_ref`. Used when
 * the caller passes a booking_ref (because that's what guest portals
 * have); the ledger row needs the FK booking_id for cleaner ops queries.
 *
 * Returns `null` if the booking can't be found — the function still
 * proceeds (the ledger uses the `recipient_email` partial index instead).
 */
async function resolveBookingId(
  admin: SupabaseAdmin,
  booking_ref: string
): Promise<string | null> {
  const { data } = await admin
    .from("bookings")
    .select("id")
    .ilike("booking_ref", booking_ref)
    .maybeSingle();
  return data?.id ?? null;
}

async function sendEmail(
  apiKey: string,
  to: string,
  subject: string,
  html: string,
  from: string
): Promise<{ success: true; message_id: string | null } | { success: false; error: string }> {
  const res = await fetch(RESEND_API, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ from, to: [to], subject, html }),
  });

  if (!res.ok) {
    const err = await res.text();
    console.error("[send-email] Resend error:", err);
    return { success: false, error: err };
  }
  // Resend response shape: { id: "..." }
  let message_id: string | null = null;
  try {
    const body = (await res.json()) as { id?: string };
    message_id = body.id ?? null;
  } catch {
    // Resend returned 2xx with non-JSON body — accept the success but
    // skip message-id correlation.
  }
  return { success: true, message_id };
}

// ── Main ─────────────────────────────────────────────────────────────────────

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response(null, {
      headers: {
        "Access-Control-Allow-Origin": "*",
        "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
      },
    });
  }

  const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
  const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
  const resendApiKey = Deno.env.get("RESEND_API_KEY");
  const senderEmail = Deno.env.get("SENDER_EMAIL") ?? "AgarthaOS <onboarding@resend.dev>";
  const appUrl = Deno.env.get("APP_URL") ?? "https://app.agartha.com";

  if (!resendApiKey) {
    return jsonResponse({ error: "RESEND_API_KEY not configured" }, 500);
  }

  const admin = createClient(supabaseUrl, serviceKey, {
    auth: { autoRefreshToken: false, persistSession: false },
  });

  let body: EmailRequest;
  try {
    body = await req.json();
  } catch {
    return jsonResponse({ error: "Invalid JSON body" }, 400);
  }

  // ── Flow 1: Booking OTP ──────────────────────────────────────────────────

  if (body.type === "booking_otp") {
    const { booking_ref } = body;
    if (!booking_ref) {
      return jsonResponse({ error: "booking_ref is required" }, 400);
    }

    // Fetch the latest unverified OTP challenge
    const { data: challenge, error: challengeErr } = await admin
      .from("otp_challenges")
      .select("otp_code, expires_at")
      .eq("booking_ref", booking_ref.toUpperCase())
      .eq("verified", false)
      .order("created_at", { ascending: false })
      .limit(1)
      .single();

    if (challengeErr || !challenge) {
      return jsonResponse({ error: "No pending OTP challenge found" }, 404);
    }

    // Check expiry
    if (new Date(challenge.expires_at) < new Date()) {
      return jsonResponse({ error: "OTP has expired" }, 410);
    }

    // Fetch booker email
    const { data: booking, error: bookingErr } = await admin
      .from("bookings")
      .select("booker_email, booker_name")
      .eq("booking_ref", booking_ref.toUpperCase())
      .single();

    if (bookingErr || !booking) {
      return jsonResponse({ error: "Booking not found" }, 404);
    }

    const html = `
      <div style="font-family: 'Segoe UI', Arial, sans-serif; max-width: 480px; margin: 0 auto; padding: 32px;">
        <h2 style="color: #1a1a2e; margin-bottom: 8px;">Your Verification Code</h2>
        <p style="color: #555; margin-bottom: 24px;">
          Hi ${booking.booker_name || "Guest"}, use the code below to verify your booking
          <strong>${booking_ref.toUpperCase()}</strong>:
        </p>
        <div style="background: #f0f4ff; border-radius: 12px; padding: 24px; text-align: center; margin-bottom: 24px;">
          <span style="font-size: 36px; font-weight: 700; letter-spacing: 8px; color: #1a1a2e;">
            ${challenge.otp_code}
          </span>
        </div>
        <p style="color: #888; font-size: 13px;">
          This code expires in 5 minutes. Do not share it with anyone.
        </p>
        <hr style="border: none; border-top: 1px solid #eee; margin: 24px 0;">
        <p style="color: #aaa; font-size: 12px;">AgarthaOS — Experience Management Platform</p>
      </div>
    `;

    // Idempotency: same OTP code + same expires_at → same hash → dedup.
    // A fresh OTP issuance produces a different expires_at, so resend
    // flows correctly trigger a fresh email.
    const paramHash = await sha256Hex(
      `booking_otp|${booking_ref.toUpperCase()}|${challenge.otp_code}|${challenge.expires_at}`
    );
    const bookingId = await resolveBookingId(admin, booking_ref.toUpperCase());

    const slot = await reserveLedgerSlot(admin, {
      template_key: "booking_otp",
      booking_id: bookingId,
      recipient_email: booking.booker_email,
      parameters_hash: paramHash,
    });
    if (!slot.ok) {
      return jsonResponse({ error: "Failed to record dispatch", detail: slot.error }, 500);
    }
    if (slot.idempotent) {
      console.log(`[send-email] OTP already dispatched for ${booking_ref.toUpperCase()} — short-circuit`);
      return jsonResponse({ idempotent: true, sent: false, booking_ref: booking_ref.toUpperCase() });
    }

    const result = await sendEmail(
      resendApiKey,
      booking.booker_email,
      "Your AgarthaOS Verification Code",
      html,
      senderEmail
    );

    if (!result.success) {
      await markLedgerError(admin, slot.ledger_id, result.error);
      return jsonResponse({ error: "Failed to send email", detail: result.error }, 502);
    }

    await markLedgerSent(admin, slot.ledger_id, result.message_id);
    console.log(`[send-email] OTP sent for booking ${booking_ref.toUpperCase()}`);
    return jsonResponse({ sent: true, booking_ref: booking_ref.toUpperCase(), message_id: result.message_id });
  }

  // ── Flow 2: Staff Invite ─────────────────────────────────────────────────

  if (body.type === "staff_invite") {
    const { staff_record_id, work_email, role_id, display_name, employee_id, iam_request_id } = body;

    if (!staff_record_id || !work_email || !role_id || !display_name || !employee_id) {
      return jsonResponse(
        { error: "staff_record_id, work_email, role_id, display_name, and employee_id are required" },
        400
      );
    }

    // Authorization: caller must have system:d (admin-only gate per R21)
    // Skip auth check if the caller is the service role (trusted server-side call)
    const authHeader = req.headers.get("Authorization");
    if (authHeader) {
      const token = authHeader.replace("Bearer ", "");
      if (token !== serviceKey) {
        const { data: { user: caller } } = await admin.auth.getUser(token);
        if (!caller) {
          return jsonResponse({ error: "Invalid token" }, 401);
        }
        const domains = caller.app_metadata?.domains as Record<string, string[]> | undefined;
        if (!domains?.system?.includes("d")) {
          return jsonResponse({ error: "Forbidden: system:d domain required" }, 403);
        }
      }
    }

    // Fetch staff record for personal_email (recipient of the invite)
    const { data: staffRecord, error: srErr } = await admin
      .from("staff_records")
      .select("personal_email")
      .eq("id", staff_record_id)
      .single();

    if (srErr || !staffRecord) {
      return jsonResponse({ error: "Staff record not found" }, 404);
    }

    // Generate temp password: 16 chars, crypto-safe
    const tempPassword =
      "Ag!" + crypto.randomUUID().replace(/-/g, "").substring(0, 13);

    // Create auth user with temp password (email pre-confirmed)
    const { data: newUser, error: createErr } = await admin.auth.admin.createUser({
      email: work_email,
      password: tempPassword,
      email_confirm: true,
      user_metadata: {
        display_name,
      },
    });

    if (createErr) {
      console.error("[send-email] createUser error:", createErr.message);
      return jsonResponse({ error: "Failed to create user", detail: createErr.message }, 500);
    }

    const userId = newUser.user.id;

    // Link profile to staff_record and role
    const { error: profileErr } = await admin
      .from("profiles")
      .update({
        staff_record_id,
        role_id,
        employee_id,
        display_name,
        employment_status: "pending",
        password_set: false,
        updated_at: new Date().toISOString(),
      })
      .eq("id", userId);

    if (profileErr) {
      console.error("[send-email] profile update error:", profileErr.message);
      // User was created but profile link failed — log but don't block
    }

    // Send invite email to personal_email
    const html = `
      <div style="font-family: 'Segoe UI', Arial, sans-serif; max-width: 520px; margin: 0 auto; padding: 32px;">
        <h2 style="color: #1a1a2e; margin-bottom: 8px;">Welcome to AgarthaOS</h2>
        <p style="color: #555; margin-bottom: 24px;">
          Hi ${display_name}, your staff account has been created. Use the credentials
          below to log in for the first time:
        </p>
        <table style="width: 100%; border-collapse: collapse; margin-bottom: 24px;">
          <tr>
            <td style="padding: 12px; background: #f8f9fa; border-radius: 8px 8px 0 0; color: #888; font-size: 13px;">
              Work Email
            </td>
            <td style="padding: 12px; background: #f8f9fa; border-radius: 8px 8px 0 0; font-weight: 600;">
              ${work_email}
            </td>
          </tr>
          <tr>
            <td style="padding: 12px; background: #f0f4ff; border-radius: 0 0 8px 8px; color: #888; font-size: 13px;">
              Temporary Password
            </td>
            <td style="padding: 12px; background: #f0f4ff; border-radius: 0 0 8px 8px; font-weight: 600; font-family: monospace;">
              ${tempPassword}
            </td>
          </tr>
        </table>
        <a href="${appUrl}/login" style="display: inline-block; background: #1a1a2e; color: #fff; padding: 12px 32px; border-radius: 8px; text-decoration: none; font-weight: 600;">
          Log In Now
        </a>
        <p style="color: #d9534f; font-size: 13px; margin-top: 24px;">
          ⚠ You will be required to change your password on first login.
        </p>
        <hr style="border: none; border-top: 1px solid #eee; margin: 24px 0;">
        <p style="color: #aaa; font-size: 12px;">AgarthaOS — Operations Management Platform</p>
      </div>
    `;

    // Idempotency: keyed on staff_record_id + work_email. Note that
    // `auth.admin.createUser` above raises its own duplicate-email error
    // if the auth user already exists, so by the time we reach the email
    // send we're past the only mutating step that has independent dedup.
    const paramHash = await sha256Hex(`staff_invite|${staff_record_id}|${work_email}`);

    const slot = await reserveLedgerSlot(admin, {
      template_key: "staff_invite",
      booking_id: null,
      recipient_email: staffRecord.personal_email,
      parameters_hash: paramHash,
    });
    if (!slot.ok) {
      return jsonResponse({ error: "Failed to record dispatch", detail: slot.error }, 500);
    }
    if (slot.idempotent) {
      console.log(`[send-email] Staff invite already dispatched for ${work_email} — short-circuit`);
      return jsonResponse({
        idempotent: true,
        sent: false,
        user_id: userId,
        personal_email: staffRecord.personal_email,
      });
    }

    const result = await sendEmail(
      resendApiKey,
      staffRecord.personal_email,
      "Your AgarthaOS Staff Account Has Been Created",
      html,
      senderEmail
    );

    if (!result.success) {
      await markLedgerError(admin, slot.ledger_id, result.error);
      return jsonResponse(
        { error: "User created but invite email failed", user_id: userId, detail: result.error },
        502
      );
    }

    await markLedgerSent(admin, slot.ledger_id, result.message_id);

    // Mark invite as sent on iam_request
    if (iam_request_id) {
      await admin
        .from("iam_requests")
        .update({ invite_sent_at: new Date().toISOString() })
        .eq("id", iam_request_id);
    }

    console.log(`[send-email] Staff invite sent to ${staffRecord.personal_email} for user ${userId}`);
    return jsonResponse({
      user_id: userId,
      invite_sent: true,
      personal_email: staffRecord.personal_email,
      message_id: result.message_id,
    });
  }

  // ── Flow 3: Booking Confirmation ──────────────────────────────────────────

  if (body.type === "booking_confirmation") {
    const {
      booking_ref, booker_name, booker_email, qr_code_ref,
      slot_date, start_time, tier_name, total_price,
      adult_count, child_count, discount_applied,
    } = body;

    if (!booking_ref || !booker_email) {
      return jsonResponse({ error: "booking_ref and booker_email are required" }, 400);
    }

    const fmtPrice = (v: number) => `MYR ${Number(v).toFixed(2)}`;
    const discountLine = discount_applied && discount_applied > 0
      ? `<tr><td style="padding:8px 12px;color:#888;font-size:13px;">Discount</td><td style="padding:8px 12px;font-weight:600;color:#2ecc71;">-${fmtPrice(discount_applied)}</td></tr>`
      : "";

    const html = `
      <div style="font-family:'Segoe UI',Arial,sans-serif;max-width:520px;margin:0 auto;padding:32px;">
        <h2 style="color:#1a1a2e;margin-bottom:8px;">Booking Confirmed!</h2>
        <p style="color:#555;margin-bottom:24px;">
          Hi ${booker_name || "Guest"}, your booking <strong>${booking_ref}</strong> is confirmed.
        </p>
        <table style="width:100%;border-collapse:collapse;margin-bottom:24px;">
          <tr><td style="padding:8px 12px;background:#f8f9fa;color:#888;font-size:13px;">Date</td><td style="padding:8px 12px;background:#f8f9fa;font-weight:600;">${slot_date}</td></tr>
          <tr><td style="padding:8px 12px;color:#888;font-size:13px;">Entry Time</td><td style="padding:8px 12px;font-weight:600;">${start_time}</td></tr>
          <tr><td style="padding:8px 12px;background:#f8f9fa;color:#888;font-size:13px;">Tier</td><td style="padding:8px 12px;background:#f8f9fa;font-weight:600;">${tier_name}</td></tr>
          <tr><td style="padding:8px 12px;color:#888;font-size:13px;">Guests</td><td style="padding:8px 12px;font-weight:600;">${adult_count} adult(s), ${child_count} child(ren)</td></tr>
          ${discountLine}
          <tr><td style="padding:8px 12px;background:#f0f4ff;color:#888;font-size:13px;">Total Paid</td><td style="padding:8px 12px;background:#f0f4ff;font-weight:700;font-size:18px;">${fmtPrice(total_price)}</td></tr>
        </table>
        <div style="background:#f0f4ff;border-radius:12px;padding:16px;text-align:center;margin-bottom:24px;">
          <p style="color:#888;font-size:12px;margin:0 0 4px;">Your QR Code Reference</p>
          <span style="font-size:14px;font-weight:600;font-family:monospace;color:#1a1a2e;">${qr_code_ref}</span>
        </div>
        <p style="color:#888;font-size:13px;">Show this email or QR code at the entrance for check-in.</p>
        <a href="${appUrl}/my-booking" style="display:inline-block;background:#1a1a2e;color:#fff;padding:12px 32px;border-radius:8px;text-decoration:none;font-weight:600;margin-top:16px;">Manage Your Booking</a>
        <p style="color:#888;font-size:12px;margin-top:12px;">Set up attendee nicknames, enable biometrics, and more.</p>
        <hr style="border:none;border-top:1px solid #eee;margin:24px 0;">
        <p style="color:#aaa;font-size:12px;">AgarthaOS — Experience Management Platform</p>
      </div>
    `;

    // Idempotency: keyed on (booking_ref, qr_code_ref). Confirmation
    // fires once per successful payment; re-runs after that are usually
    // webhook retries and should short-circuit.
    const paramHash = await sha256Hex(`booking_confirmation|${booking_ref}|${qr_code_ref}`);
    const bookingId = await resolveBookingId(admin, booking_ref);

    const slot = await reserveLedgerSlot(admin, {
      template_key: "booking_confirmation",
      booking_id: bookingId,
      recipient_email: booker_email,
      parameters_hash: paramHash,
    });
    if (!slot.ok) {
      return jsonResponse({ error: "Failed to record dispatch", detail: slot.error }, 500);
    }
    if (slot.idempotent) {
      console.log(`[send-email] Confirmation already dispatched for ${booking_ref} — short-circuit`);
      return jsonResponse({ idempotent: true, sent: false, booking_ref, type: "booking_confirmation" });
    }

    const result = await sendEmail(
      resendApiKey,
      booker_email,
      `Booking Confirmed: ${booking_ref} — ${slot_date} at ${start_time}`,
      html,
      senderEmail
    );

    if (!result.success) {
      await markLedgerError(admin, slot.ledger_id, result.error);
      return jsonResponse({ error: "Failed to send confirmation email", detail: result.error }, 502);
    }

    await markLedgerSent(admin, slot.ledger_id, result.message_id);
    console.log(`[send-email] Booking confirmation sent for ${booking_ref}`);
    return jsonResponse({ sent: true, booking_ref, type: "booking_confirmation", message_id: result.message_id });
  }

  // ── Flow 4: Booking Modified (Reschedule) ───────────────────────────────

  if (body.type === "booking_modified") {
    const { booking_ref, booker_name, booker_email, new_slot_date, new_start_time } = body;

    if (!booking_ref || !booker_email) {
      return jsonResponse({ error: "booking_ref and booker_email are required" }, 400);
    }

    const html = `
      <div style="font-family:'Segoe UI',Arial,sans-serif;max-width:480px;margin:0 auto;padding:32px;">
        <h2 style="color:#1a1a2e;margin-bottom:8px;">Booking Rescheduled</h2>
        <p style="color:#555;margin-bottom:24px;">
          Hi ${booker_name || "Guest"}, your booking <strong>${booking_ref}</strong> has been rescheduled.
        </p>
        <div style="background:#f0f4ff;border-radius:12px;padding:20px;text-align:center;margin-bottom:24px;">
          <p style="color:#888;font-size:12px;margin:0 0 8px;">New Date & Time</p>
          <span style="font-size:24px;font-weight:700;color:#1a1a2e;">${new_slot_date} at ${new_start_time}</span>
        </div>
        <p style="color:#888;font-size:13px;">All other details remain unchanged.</p>
        <hr style="border:none;border-top:1px solid #eee;margin:24px 0;">
        <p style="color:#aaa;font-size:12px;">AgarthaOS — Experience Management Platform</p>
      </div>
    `;

    // Idempotency: keyed on (booking_ref, new_slot_date, new_start_time).
    // Each distinct reschedule destination produces a fresh email; the
    // same destination twice (e.g., double-clicked CTA) does not.
    const paramHash = await sha256Hex(
      `booking_modified|${booking_ref}|${new_slot_date}|${new_start_time}`
    );
    const bookingId = await resolveBookingId(admin, booking_ref);

    const slot = await reserveLedgerSlot(admin, {
      template_key: "booking_modified",
      booking_id: bookingId,
      recipient_email: booker_email,
      parameters_hash: paramHash,
    });
    if (!slot.ok) {
      return jsonResponse({ error: "Failed to record dispatch", detail: slot.error }, 500);
    }
    if (slot.idempotent) {
      console.log(`[send-email] Modified-email already dispatched for ${booking_ref} ${new_slot_date} ${new_start_time} — short-circuit`);
      return jsonResponse({ idempotent: true, sent: false, booking_ref, type: "booking_modified" });
    }

    const result = await sendEmail(
      resendApiKey,
      booker_email,
      `Booking Rescheduled: ${booking_ref} — Now ${new_slot_date} at ${new_start_time}`,
      html,
      senderEmail
    );

    if (!result.success) {
      await markLedgerError(admin, slot.ledger_id, result.error);
      return jsonResponse({ error: "Failed to send modified email", detail: result.error }, 502);
    }

    await markLedgerSent(admin, slot.ledger_id, result.message_id);
    console.log(`[send-email] Booking modified email sent for ${booking_ref}`);
    return jsonResponse({ sent: true, booking_ref, type: "booking_modified", message_id: result.message_id });
  }

  // ── Flow 5: Booking Cascaded (Forced Reschedule) ────────────────────────

  if (body.type === "booking_cascaded") {
    const {
      booking_ref, booker_name, booker_email,
      old_slot_date, old_start_time, new_slot_date, new_start_time, reason,
    } = body;

    if (!booking_ref || !booker_email) {
      return jsonResponse({ error: "booking_ref and booker_email are required" }, 400);
    }

    const reasonLine = reason
      ? `<p style="color:#555;margin-bottom:16px;"><strong>Reason:</strong> ${reason}</p>`
      : "";

    const html = `
      <div style="font-family:'Segoe UI',Arial,sans-serif;max-width:520px;margin:0 auto;padding:32px;">
        <h2 style="color:#d9534f;margin-bottom:8px;">Booking Time Changed</h2>
        <p style="color:#555;margin-bottom:24px;">
          Hi ${booker_name || "Guest"}, due to a schedule change, your booking
          <strong>${booking_ref}</strong> has been moved to a new time slot.
        </p>
        ${reasonLine}
        <table style="width:100%;border-collapse:collapse;margin-bottom:24px;">
          <tr><td style="padding:8px 12px;background:#fff3f3;color:#888;font-size:13px;">Previous</td><td style="padding:8px 12px;background:#fff3f3;text-decoration:line-through;color:#999;">${old_slot_date} at ${old_start_time}</td></tr>
          <tr><td style="padding:8px 12px;background:#f0fff4;color:#888;font-size:13px;">New</td><td style="padding:8px 12px;background:#f0fff4;font-weight:700;color:#1a1a2e;">${new_slot_date} at ${new_start_time}</td></tr>
        </table>
        <p style="color:#888;font-size:13px;">We apologize for the inconvenience. All other booking details remain unchanged.</p>
        <hr style="border:none;border-top:1px solid #eee;margin:24px 0;">
        <p style="color:#aaa;font-size:12px;">AgarthaOS — Experience Management Platform</p>
      </div>
    `;

    // Idempotency: keyed on (booking_ref, old → new). Hash includes both
    // old and new tuples so a second cascade away from the same origin
    // also dedups, but a fresh cascade from a new origin sends.
    const paramHash = await sha256Hex(
      `booking_cascaded|${booking_ref}|${old_slot_date}|${old_start_time}|${new_slot_date}|${new_start_time}`
    );
    const bookingId = await resolveBookingId(admin, booking_ref);

    const slot = await reserveLedgerSlot(admin, {
      template_key: "booking_cascaded",
      booking_id: bookingId,
      recipient_email: booker_email,
      parameters_hash: paramHash,
    });
    if (!slot.ok) {
      return jsonResponse({ error: "Failed to record dispatch", detail: slot.error }, 500);
    }
    if (slot.idempotent) {
      console.log(`[send-email] Cascaded-email already dispatched for ${booking_ref} — short-circuit`);
      return jsonResponse({ idempotent: true, sent: false, booking_ref, type: "booking_cascaded" });
    }

    const result = await sendEmail(
      resendApiKey,
      booker_email,
      `Booking Time Changed: ${booking_ref} — Now ${new_slot_date} at ${new_start_time}`,
      html,
      senderEmail
    );

    if (!result.success) {
      await markLedgerError(admin, slot.ledger_id, result.error);
      return jsonResponse({ error: "Failed to send cascaded email", detail: result.error }, 502);
    }

    await markLedgerSent(admin, slot.ledger_id, result.message_id);
    console.log(`[send-email] Booking cascaded email sent for ${booking_ref}`);
    return jsonResponse({ sent: true, booking_ref, type: "booking_cascaded", message_id: result.message_id });
  }

  // ── Flow 6: Report Ready (Scheduled Report Delivery) ───────────────────

  if (body.type === "report_ready") {
    const { recipient_email, report_type, row_count, file_url } = body;

    if (!recipient_email || !report_type || !file_url) {
      return jsonResponse(
        { error: "recipient_email, report_type, and file_url are required" },
        400
      );
    }

    const reportLabel = report_type.replace(/_/g, " ").replace(/\b\w/g, (c: string) => c.toUpperCase());

    const html = `
      <div style="font-family:'Segoe UI',Arial,sans-serif;max-width:520px;margin:0 auto;padding:32px;">
        <h2 style="color:#1a1a2e;margin-bottom:8px;">Scheduled Report Ready</h2>
        <p style="color:#555;margin-bottom:24px;">
          Your scheduled report <strong>${reportLabel}</strong> has been generated.
        </p>
        <table style="width:100%;border-collapse:collapse;margin-bottom:24px;">
          <tr><td style="padding:8px 12px;background:#f8f9fa;color:#888;font-size:13px;">Report</td><td style="padding:8px 12px;background:#f8f9fa;font-weight:600;">${reportLabel}</td></tr>
          <tr><td style="padding:8px 12px;color:#888;font-size:13px;">Rows</td><td style="padding:8px 12px;font-weight:600;">${row_count}</td></tr>
          <tr><td style="padding:8px 12px;background:#f8f9fa;color:#888;font-size:13px;">Generated</td><td style="padding:8px 12px;background:#f8f9fa;font-weight:600;">${new Date().toISOString().split("T")[0]}</td></tr>
        </table>
        <a href="${file_url}" style="display:inline-block;background:#1a1a2e;color:#fff;padding:12px 32px;border-radius:8px;text-decoration:none;font-weight:600;">
          Download CSV
        </a>
        <p style="color:#888;font-size:13px;margin-top:16px;">This download link expires in 7 days.</p>
        <hr style="border:none;border-top:1px solid #eee;margin:24px 0;">
        <p style="color:#aaa;font-size:12px;">AgarthaOS — Operations Management Platform</p>
      </div>
    `;

    // Idempotency: keyed on (recipient_email, file_url). The file_url is
    // generated freshly per scheduled run so re-dispatch of the same run
    // dedups, but a fresh execution sends.
    const paramHash = await sha256Hex(`report_ready|${recipient_email}|${file_url}`);

    const slot = await reserveLedgerSlot(admin, {
      template_key: "report_ready",
      booking_id: null,
      recipient_email,
      parameters_hash: paramHash,
    });
    if (!slot.ok) {
      return jsonResponse({ error: "Failed to record dispatch", detail: slot.error }, 500);
    }
    if (slot.idempotent) {
      console.log(`[send-email] Report-ready already dispatched to ${recipient_email} — short-circuit`);
      return jsonResponse({ idempotent: true, sent: false, recipient_email, type: "report_ready" });
    }

    const result = await sendEmail(
      resendApiKey,
      recipient_email,
      `Report Ready: ${reportLabel} — ${row_count} rows`,
      html,
      senderEmail
    );

    if (!result.success) {
      await markLedgerError(admin, slot.ledger_id, result.error);
      return jsonResponse({ error: "Failed to send report email", detail: result.error }, 502);
    }

    await markLedgerSent(admin, slot.ledger_id, result.message_id);
    console.log(`[send-email] Report ready email sent to ${recipient_email} for ${report_type}`);
    return jsonResponse({ sent: true, recipient_email, type: "report_ready", message_id: result.message_id });
  }

  // ── Flow 7: Payment Failed (Stripe payment_intent.payment_failed) ──────

  if (body.type === "payment_failed") {
    const { booking_ref, booker_name, booker_email, reason } = body;

    if (!booking_ref || !booker_email) {
      return jsonResponse({ error: "booking_ref and booker_email are required" }, 400);
    }

    const reasonLine = reason
      ? `<p style="color:#555;margin-bottom:16px;"><strong>What we know:</strong> ${reason}</p>`
      : "";

    // Hold window: bookings.created_at + 15 minutes per WF-7A.
    // The retry CTA deep-links straight back to /book/payment, where the
    // hold countdown surfaces the remaining minutes.
    const html = `
      <div style="font-family:'Segoe UI',Arial,sans-serif;max-width:520px;margin:0 auto;padding:32px;">
        <h2 style="color:#d9534f;margin-bottom:8px;">Payment couldn't be completed</h2>
        <p style="color:#555;margin-bottom:24px;">
          Hi ${booker_name || "Guest"}, we weren't able to charge your card for booking
          <strong>${booking_ref}</strong>.
        </p>
        ${reasonLine}
        <p style="color:#555;margin-bottom:16px;">
          Your seats are held for 15 minutes from when you started checking out. If you'd
          like to try again with the same or a different card, tap the button below — it'll
          take you straight back to the payment page.
        </p>
        <a href="${appUrl}/book/payment?ref=${booking_ref}" style="display:inline-block;background:#1a1a2e;color:#fff;padding:12px 32px;border-radius:8px;text-decoration:none;font-weight:600;margin-top:8px;">
          Retry payment
        </a>
        <p style="color:#888;font-size:13px;margin-top:24px;">
          If you don't retry within the hold window, the slot is released for other guests
          and you'll need to start a fresh booking.
        </p>
        <hr style="border:none;border-top:1px solid #eee;margin:24px 0;">
        <p style="color:#aaa;font-size:12px;">AgarthaOS — Experience Management Platform</p>
      </div>
    `;

    // Idempotency: keyed on (booking_ref, reason). Stripe's webhook
    // delivers a `payment_intent.payment_failed` per failed attempt; we
    // want one email per distinct failure reason, not one per webhook
    // retry of the same event.
    const paramHash = await sha256Hex(`payment_failed|${booking_ref}|${reason ?? "default"}`);
    const bookingId = await resolveBookingId(admin, booking_ref);

    const slot = await reserveLedgerSlot(admin, {
      template_key: "payment_failed",
      booking_id: bookingId,
      recipient_email: booker_email,
      parameters_hash: paramHash,
    });
    if (!slot.ok) {
      return jsonResponse({ error: "Failed to record dispatch", detail: slot.error }, 500);
    }
    if (slot.idempotent) {
      console.log(`[send-email] payment_failed already dispatched for ${booking_ref} — short-circuit`);
      return jsonResponse({ idempotent: true, sent: false, booking_ref, type: "payment_failed" });
    }

    const result = await sendEmail(
      resendApiKey,
      booker_email,
      `Payment couldn't be completed: ${booking_ref}`,
      html,
      senderEmail
    );

    if (!result.success) {
      await markLedgerError(admin, slot.ledger_id, result.error);
      return jsonResponse({ error: "Failed to send payment_failed email", detail: result.error }, 502);
    }

    await markLedgerSent(admin, slot.ledger_id, result.message_id);
    console.log(`[send-email] payment_failed sent for ${booking_ref}`);
    return jsonResponse({ sent: true, booking_ref, type: "payment_failed", message_id: result.message_id });
  }

  return jsonResponse({ error: `Unknown type: ${(body as Record<string, unknown>).type}` }, 400);
});
