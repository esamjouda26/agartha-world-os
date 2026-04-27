# Guest Portal Completion Plan

> **Status:** approved by the user on 2026-04-27 with the following decisions:
>
> - **Payment gateway:** Stripe (Hosted Checkout, SAQ-A scope)
> - **Email provider:** Resend
> - **Face Pay enrolment:** **deferred** — `enroll-biometric` Edge Function and the camera capture widget are out of scope for this build. The biometrics page stays in consent-grant-only mode.
> - **i18n:** ship with both `en` and `ms` (Bahasa Malaysia) translations.
> - **Stretch items (Phase E):** **in scope** — Apple/Google Wallet passes, booking history disclosure, ZIP download for memories, and realtime payment status are all approved.
>
> This document is the authoritative working spec for completing the guest portal. Each item lists scope, dependencies, files, acceptance criteria, and risks. Execute phases in order; commit per phase, not per file. After each phase, paste verification-gate evidence (typecheck + lint + build + tests) before moving on.

---

## 0. Context

### What's already shipped (Phase 9a)

All 8 guest routes ship with UI + Server Action wiring against the existing schema:

| Route                                                        | Status                                                             |
| ------------------------------------------------------------ | ------------------------------------------------------------------ |
| `/book` (5-step wizard, merged Plan step)                    | ✓                                                                  |
| `/book/payment` (4-state status display, hold countdown)     | ✓ stub: payment CTA returns `DEPENDENCY_FAILED`                    |
| `/my-booking` (booking-ref lookup, auto-format)              | ✓                                                                  |
| `/my-booking/verify` (6-box OTP, resend countdown)           | ✓ but emails not delivered (`send-email` Edge Function missing)    |
| `/my-booking/manage` (ticket hero + manage card + attendees) | ✓                                                                  |
| `/my-booking/manage/biometrics` (consent-only)               | ✓ partial: consent grant/withdraw works; camera enrolment deferred |
| `/my-booking/manage/memories` (signed URLs, paginated)       | ✓                                                                  |
| `/survey` (single-card form, chip keywords)                  | ✓                                                                  |

Plus the cross-cutting pieces:

- Guest shell with brand-mark + nav + privacy/terms footer
- Guest CSRF helpers (built but not yet enforced)
- Guest session HMAC-signed cookie (4 h TTL, path-scoped)
- Booking-ref / OTP-pending / booking-ref cookies wired
- `qrcode` SVG renderer (zero-`dangerouslySetInnerHTML`)
- ICS builder for "Add to calendar"
- Print stylesheet for `/my-booking/manage`
- Privacy + Terms placeholder pages
- Per-route post-mutation `router.refresh()` for fresh RSC data

### What's left

Three blockers to a production guest experience:

1. **Edge Functions are partially built but unwired and incomplete.** Discovered during PR-1 kickoff:
   - `supabase/functions/send-email/index.ts` **exists** with 6 flows (`booking_otp`, `staff_invite`, `booking_confirmation`, `booking_modified`, `booking_cascaded`, `report_ready`) — but inline-HTML templates (no React Email), no idempotency ledger, no `payment_failed` flow, and **the guest portal never invokes it**. OTPs land in `otp_challenges` but no email is sent.
   - `supabase/functions/confirm-booking-payment/index.ts` **exists** but is a generic shared-secret webhook (`x-webhook-signature` header equality check), not a Stripe `constructEvent` handler. No `payment_webhook_events` ledger, no DLQ, hard-coded `success | failed` status enum. Inadequate for production Stripe integration.
   - `reconcile-payments` and `cron-image-pipeline` — actually missing.
2. **CSRF double-submit token** is implemented as helpers but not wired into mutations or middleware.
3. **i18n, tests, accessibility, performance budgets, observability tags** are deferred from Phase 9a.

This plan completes all three plus the approved stretch items.

### Source-of-truth precedence (recap)

```
supabase/migrations/*.sql > operational_workflows.md > frontend_spec.md > prompt.md > CLAUDE.md > AGENTS.md
```

Where this plan disagrees with a lower-precedence doc, this plan wins. Where it disagrees with a higher-precedence doc, **this plan is wrong** — flag it and update the plan rather than the migration.

---

## 1. Decisions locked in

### 1.1 Stripe Hosted Checkout

**Why:** SAQ-A PCI scope — we never see card data. Stripe redirects the user to a hosted page; on completion the user returns to our `success_url`. Webhook delivers the event.

**Alternatives rejected:**

- **Stripe Elements (embedded):** SAQ-A-EP scope — slightly wider PCI surface, no value-add for our flow.
- **Adyen / iPay88 / Razer:** more local PSP coverage in MY but heavier integration burden; not justified for v1.

**Server-side flow:**

1. `startPaymentAction` calls `stripe.checkout.sessions.create({ ... })` with:
   - `payment_method_types: ['card']` (FPX added in v1.1)
   - `mode: 'payment'`
   - `currency: 'myr'`
   - `line_items` derived from `bookings.total_price` (single line; we don't surface tier/guest breakdown to Stripe)
   - `metadata: { booking_id, booking_ref }`
   - `success_url: ${origin}/book/payment?ref=${booking_ref}&session_id={CHECKOUT_SESSION_ID}`
   - `cancel_url: ${origin}/book/payment?ref=${booking_ref}&cancelled=1`
   - `payment_intent_data.metadata: { booking_id, booking_ref }`
2. UPDATE `booking_payments` SET `payment_intent_id`, `gateway_ref` (the Checkout Session id)
3. Return `ok({ redirectUrl: session.url })`
4. Client `window.location.assign(session.url)`

**Webhook events handled by `confirm-booking-payment`:**

- `checkout.session.completed` — primary success path
- `payment_intent.succeeded` — fallback if Checkout webhook drops
- `payment_intent.payment_failed` — failure path
- `charge.refunded` — out of scope for v1; logged + DLQ

**Test mode:** Stripe test keys for staging; production keys gated behind `vercel env add ... production`.

### 1.2 Resend for transactional email

**Why:** First-class React Email support, simple API, generous free tier, MY-friendly.

**Templates (React Email, server-rendered):**

- `BookingOtpEmail` — 6-digit code + 5-min expiry warning + "If this wasn't you, ignore"
- `BookingConfirmationEmail` — QR + booking_ref + tier/date/time/guests + "Add to calendar" link + "Manage booking" link
- `BookingModifiedEmail` — old vs new time + "Manage booking" link
- `PaymentFailedEmail` — retry CTA + 15-min hold reminder

**Idempotency:** new `email_dispatch_log` table, unique index on `(template_key, booking_id, parameters_hash)`.

**Domain setup (ops):** DKIM, SPF, DMARC for `mail.<domain>`. Out of code scope.

### 1.3 Face Pay deferred

The biometrics page keeps its current shape:

- Disclosure renders.
- Per-attendee consent grant + withdraw work end-to-end.
- The "enrolment opens during your visit" placeholder stays — no camera widget, no Edge Function.

When Face Pay is reactivated, A4 (`enroll-biometric`) and B3 (camera widget) become a follow-up phase. The schema and consent ledger are already in place, so re-enabling is a code-only change.

### 1.4 Bahasa Malaysia i18n

- Both `en` and `ms` ship.
- Source strings are English-first; `ms` translation populated by the team after structure lands.
- next-intl's ICU MessageFormat for plurals + dates + currency.
- Locale prefix: `/en/...`, `/ms/...` per existing routing.

### 1.5 Stretch items in scope

- **E1 Apple + Google Wallet passes** — accepts the cert/ops burden.
- **E2 Booking history disclosure** — small read on `system_audit_log`.
- **E3 ZIP download for memories** — server-streamed via a new Edge Function.
- **E4 Realtime payment status** — replaces the polling fallback in B2; needs an ADR exception to CLAUDE.md §3.

---

## 2. Phase A — Edge Functions

Foundational. Every other phase depends on at least one of these.

### A1. `send-email` Edge Function — patch + wire

**Spec refs:** `frontend_spec.md:3488`, `WF-7B`, prompt.md Phase 9.

**Status correction (2026-04-27):** the function already exists at `supabase/functions/send-email/index.ts` (560 lines, 6 inline-HTML flows). PR-1 patches the existing file rather than rewriting it. **React Email rewrite is deferred** — inline HTML works in production email clients, and a JSX rewrite has no functional payoff. Reopen if maintenance pain accrues.

**Files:**

- Modified: `supabase/functions/send-email/index.ts` — add idempotency check (consult `email_dispatch_log` before sending), add `payment_failed` flow, log Resend `message_id` on success
- New: `supabase/migrations/<ts>_email_dispatch_log.sql` — idempotency ledger
- New: `src/lib/email/dispatch.ts` — server-only helper that invokes the Edge Function with auth + structured logging + telemetry; used by every Server Action that needs to fire an email
- Modified: `src/lib/env.ts` — add `RESEND_API_KEY` (server, secret) and `RESEND_FROM_EMAIL` (server) to the validated schema (currently the function reads them from Deno.env at runtime, which is fine for the function but means the app never validates their presence at boot)
- Modified: `src/features/booking/actions/get-booking-identity.ts` — fire-and-forget call to `dispatchEmail({ type: "booking_otp", booking_ref })` after the RPC succeeds (via `after()` so the user redirect isn't blocked by Resend latency)
- Modified: `src/features/booking/actions/resend-otp.ts` — same
- Modified: `src/features/booking/actions/reschedule-booking.ts` — fire-and-forget call to `dispatchEmail({ type: "booking_modified", ... })` after RPC success

**Migration shape:**

```sql
CREATE TABLE public.email_dispatch_log (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  template_key TEXT NOT NULL,
  booking_id UUID REFERENCES public.bookings(id) ON DELETE SET NULL,
  parameters_hash TEXT NOT NULL,
  sent_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  resend_message_id TEXT,
  error TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE UNIQUE INDEX idx_email_dispatch_log_dedup
  ON public.email_dispatch_log (template_key, booking_id, parameters_hash);
ALTER TABLE public.email_dispatch_log ENABLE ROW LEVEL SECURITY;
-- service-role only
```

**Edge Function input (existing surface kept; new flow added):**

The function already accepts `booking_otp | staff_invite | booking_confirmation | booking_modified | booking_cascaded | report_ready`. PR-1 adds:

```ts
| { type: "payment_failed"; booking_ref: string; booker_name: string; booker_email: string; reason?: string }
```

**Pipeline (per flow, after PR-1 patch):**

1. Parse JSON body, narrow on `type`
2. Compute `parameters_hash` deterministically per flow (e.g., for `booking_otp`: SHA-256 of `${booking_ref}:${otp_code}`; for `booking_modified`: SHA-256 of `${booking_ref}:${new_slot_date}:${new_start_time}`)
3. `INSERT INTO email_dispatch_log (template_key, booking_id, parameters_hash, ...) ON CONFLICT (template_key, booking_id, parameters_hash) DO NOTHING RETURNING id` — `RETURNING` empty → duplicate; respond `{ idempotent: true }` and exit early
4. Existing fetch + render + Resend code path
5. UPDATE `email_dispatch_log SET resend_message_id, sent_at = NOW()` keyed by the inserted id; on Resend failure, UPDATE `error` instead and return 502

**Acceptance criteria:**

- ✅ All flows render in Apple Mail, Gmail, Outlook (already true for the 6 existing flows)
- ✅ Idempotent: same input twice → one email
- ✅ Failures logged with `error` column, no exceptions thrown out of the function
- ✅ `parameters_hash` includes the OTP code so a fresh OTP triggers a fresh email

**Risks:**

- DKIM/SPF setup is ops work, not code
- Domain warming for new senders — start with low volume

---

### A2. `confirm-booking-payment` Edge Function

**Spec refs:** `frontend_spec.md:3483-3496`, `WF-7A:659-704`.

**Files:**

- New: `supabase/functions/confirm-booking-payment/index.ts`
- New: `supabase/functions/confirm-booking-payment/lib/stripe.ts` — webhook signature verify + event narrowing
- New: `src/lib/payments/stripe.ts` — server-side Stripe client wrapper (used by B1)
- Modified: `src/lib/env.ts` — add `STRIPE_SECRET_KEY`, `STRIPE_WEBHOOK_SECRET`. (Replace the placeholder `PAYMENT_WEBHOOK_SECRET` or alias.)

**Pipeline (per spec line 3483):**

1. **Signature verify:** `stripe.webhooks.constructEvent(rawBody, sigHeader, env.STRIPE_WEBHOOK_SECRET)` — invalid → 401, increment `payment_webhook_invalid_signature_total` metric
2. **Idempotency ledger:** `INSERT INTO payment_webhook_events (event_id, event_type, payment_intent_id, raw_payload, received_at) ON CONFLICT (event_id) DO NOTHING` — duplicate → 200 immediately
3. **State correlation:** lookup `booking_payments` by `payment_intent_id`. Missing → 200 + flag orphan + SEV-3 alert
4. **Commit:** transactional `rpc_apply_payment_event(p_event_id, p_payment_intent, p_new_status, p_paid_at)` (already exists in DB at `phase2_security_additions.sql:230`)
5. **Notification:** call `send-email` (booking_confirmation) — A1 dependency
6. Respond 200 only after step 4 commits

**Failure DLQ:** events that throw 3 times move to `payment_webhook_events_dlq` (table already in schema). SEV-2 page on insert.

**Route handler exposure:**

- `src/app/api/webhooks/stripe/route.ts` — POST handler that forwards to the Edge Function via `supabase.functions.invoke`
- Or directly Edge-deployed at `https://<project>.functions.supabase.co/confirm-booking-payment` and Stripe configured to hit that URL

**Pick the route handler approach** because it keeps Stripe's webhook URL on our domain (better for ops + log correlation).

**Acceptance criteria:**

- ✅ Stripe CLI test webhook → booking flips to `confirmed`, payment to `success`, email enqueued
- ✅ Replaying the same webhook → no double processing, no double email
- ✅ Bad signature → 401 with metric increment
- ✅ Missing payment_intent_id → 200 + SEV-3 log entry
- ✅ Webhook responds in < 5s (notification enqueued, not awaited)

**Risks:**

- PCI scope drift if any card data accidentally lands in our logs — explicit redaction filter
- Stripe API version pinning — pin to a specific date in `stripe.config`

---

### A3. `reconcile-payments` Edge Function

**Spec refs:** `frontend_spec.md:3491`, `WF-7A:686-690`.

**Files:**

- New: `supabase/functions/reconcile-payments/index.ts`

**Flow:**

- pg_cron `cron-payment-reconcile` fires every 5 min (already scheduled)
- For each `booking_payments` WHERE `status = 'pending'` AND `created_at < NOW() - 2 minutes`:
  - `stripe.paymentIntents.retrieve(payment_intent_id)`
  - If gateway state is terminal (`succeeded`, `canceled`, `requires_payment_method` after failure), synthesize the missed event via `rpc_apply_payment_event`
  - If gateway state is still pending, skip — reconcile retries next cron run

**Acceptance criteria:**

- ✅ Drop a webhook in test → reconcile picks up within 5 min, booking flips to `confirmed`
- ✅ Stripe API rate-limit safe — back off + log
- ✅ Doesn't double-process bookings whose webhook landed normally

**Risks:**

- Stripe API rate limits — handle 429 with exponential backoff

---

### A4. `enroll-biometric` Edge Function — **DEFERRED**

Skipped per user decision. Re-add to plan when Face Pay re-enters scope.

---

### A5. `cron-image-pipeline` Storage hook

**Spec refs:** prompt.md Phase 9.

**Files:**

- New: `supabase/functions/cron-image-pipeline/index.ts`
- Modified: existing `captured_photos` schema gets a `derivative_paths JSONB DEFAULT '{}'` column via small migration to map sizes/formats to bucket paths.

**Migration:**

```sql
ALTER TABLE public.captured_photos
  ADD COLUMN IF NOT EXISTS derivative_paths JSONB NOT NULL DEFAULT '{}';
```

**Flow:**

- Triggered on `storage.objects` INSERT into the `operations` bucket
- Filter: only keys under the `captures/` prefix (so other uploads aren't reprocessed)
- Read the original via Storage admin client
- Use `sharp` to produce 6 derivatives: AVIF + WebP at 480, 960, 1920 widths
- Upload each to `captures-derivatives/<photo_id>/<width>.<format>`
- UPDATE `captured_photos.derivative_paths` JSONB

**Memories page picks the right derivative:**

- `<MemoryPhotoCard>` thumbnail uses `derivative_paths['480.webp']` (or AVIF if browser supports it via `<picture>`)
- Full-size download uses original

**Acceptance criteria:**

- ✅ New upload triggers function, derivatives appear within 30s
- ✅ Memories grid renders derivatives, not originals (verify network tab — bytes should be ~10× smaller)
- ✅ Function timeout-safe on 10 MB originals (chunk if needed)

---

## 3. Phase B — UI wire-ups (replaces Phase 9a stubs)

Once A1 + A2 land, the Phase 9a stubs become functional.

### B1. Replace `startPaymentAction` stub with real Stripe Checkout redirect

**Files:**

- Modified: `src/features/booking/actions/start-payment.ts`
- Modified: `src/lib/env.ts` — `STRIPE_SECRET_KEY`, `NEXT_PUBLIC_BASE_URL`

**Implementation:**

```ts
// pseudocode
import Stripe from "stripe";
const stripe = new Stripe(env.STRIPE_SECRET_KEY, { apiVersion: "2025-..." });

export async function startPaymentAction(input) {
  // ... existing validation + rate limit + cookie binding ...

  const supabase = createSupabaseServiceClient();
  const { data: booking } = await supabase
    .from("bookings")
    .select("id, total_price, booker_email, tier_id, ...")
    .eq("booking_ref", parsed.data.booking_ref)
    .single();

  const session = await stripe.checkout.sessions.create({
    payment_method_types: ["card"],
    mode: "payment",
    currency: "myr",
    customer_email: booking.booker_email,
    line_items: [
      {
        price_data: {
          currency: "myr",
          product_data: { name: `AgarthaOS — ${tierName}` },
          unit_amount: Math.round(booking.total_price * 100),
        },
        quantity: 1,
      },
    ],
    metadata: {
      booking_id: booking.id,
      booking_ref: parsed.data.booking_ref,
    },
    payment_intent_data: {
      metadata: {
        booking_id: booking.id,
        booking_ref: parsed.data.booking_ref,
      },
    },
    success_url: `${env.NEXT_PUBLIC_BASE_URL}/book/payment?ref=${parsed.data.booking_ref}&session_id={CHECKOUT_SESSION_ID}`,
    cancel_url: `${env.NEXT_PUBLIC_BASE_URL}/book/payment?ref=${parsed.data.booking_ref}&cancelled=1`,
  });

  await supabase
    .from("booking_payments")
    .update({
      payment_intent_id: session.payment_intent as string,
      gateway_ref: session.id,
    })
    .eq("booking_id", booking.id);

  return ok({ redirectUrl: session.url, pendingMessage: null });
}
```

**Acceptance criteria:**

- ✅ Click "Continue to payment" → redirected to Stripe Hosted Checkout
- ✅ Cancel → returns to `/book/payment?ref=…&cancelled=1` with retry CTA
- ✅ Success → returns to `/book/payment?ref=…&session_id=…`, webhook completes booking
- ✅ Test card flows through Stripe test mode

**Depends on:** A2

---

### B2. Post-gateway-return polling on `/book/payment`

**Files:**

- New: `src/features/booking/components/payment-return-poll.tsx`
- Modified: `src/app/[locale]/(guest)/book/payment/page.tsx` — render the poller when `?session_id=` is present and status is still `pending`

**Behavior:**

- On mount, polls `/book/payment` (server-side) every 3s
- Bumps to 5s after 30s; aborts at 90s with "Taking longer than expected? Refresh the page in a moment."
- When `bookings.status` flips to `confirmed`, the page renders success state on the next poll → router.refresh

**Implementation note:** uses `router.refresh()` not `router.push()` so URL state is preserved and the polling component remounts cleanly when the status changes.

**Acceptance criteria:**

- ✅ Successful payment → page shows success state within ≤ 8s of return
- ✅ Slow webhook → poller falls back to manual-refresh copy after 90s
- ✅ E4 (realtime) supersedes this for the primary path; this remains the fallback

**Depends on:** A2

---

### B3. Camera capture widget — **DEFERRED** (Face Pay out of scope)

---

### B4. Wire double-submit CSRF token

**Files:**

- Modified: `middleware.ts` — mint `guest_csrf` cookie on first guest-path visit
- Modified: every mutation Server Action under `src/features/booking/actions/` and `src/features/marketing/actions/` — call `verifyGuestCsrf()` before processing
- New: `src/components/shared/guest-csrf-provider.tsx` — reads cookie, exposes value via React context for client components to attach `x-guest-csrf` header
- Modified: every client component that calls a Server Action directly (not via `<form action>`) — read CSRF from context, send header

**Middleware addition:**

```ts
// inside the existing /book + /my-booking + /survey branch
if (!request.cookies.get("guest_csrf")) {
  const token = mintToken();
  intlResponse.cookies.set("guest_csrf", token, { ... });
}
```

**Action enforcement:**

```ts
// in every mutation action
if (!(await verifyGuestCsrf())) return fail("FORBIDDEN");
```

**Form-action submissions** (e.g., `<form action={createBookingAction}>`) skip the explicit verify — Next.js' built-in action-ID CSRF covers them. We enforce only on direct invocations from `useTransition` / `startTransition` blocks.

**Cookie rotation:** `verifyOtpAction` and `createBookingAction` already call `rotateGuestCsrf()` on success. Add the same to `verifyOtpAction`, `rescheduleBookingAction`, `grantBiometricConsentAction`, `withdrawBiometricConsentAction`.

**Acceptance criteria:**

- ✅ First guest-path visit sets the cookie
- ✅ Mutations from staged client without the header → 403
- ✅ Form-action submissions still work (Next.js action-ID CSRF handles them)
- ✅ Cookie rotates on every successful mutation

**Depends on:** none

---

### B5. "Resend booking email" CTA on `/my-booking/manage`

**Files:**

- New: `src/features/booking/actions/resend-booking-email.ts`
- Modified: `src/features/booking/components/booking-action-shelf.tsx` — add a third button

**Action flow:**

1. Validate cookie session
2. Rate-limit (1/h/IP)
3. Idempotency: check `email_dispatch_log` for a `booking_confirmation_resend` entry today; if present → ok with "Already sent today" toast
4. Invoke `send-email` Edge Function (booking_confirmation)
5. Return ok

**Acceptance criteria:**

- ✅ One-tap resends the confirmation
- ✅ Spam-resistant (1/h limit + once-per-day idempotency)

**Depends on:** A1

---

### B6. "Leave feedback" CTA on `/my-booking/manage` when status=completed

**Files:**

- Modified: `src/app/[locale]/(guest)/my-booking/manage/page.tsx` — add a `<ManageRow>` linking to `/survey?ref=<booking_ref>`

**Acceptance criteria:**

- ✅ Visible only when `booking.status === 'completed'`
- ✅ Sits beside the Memories link
- ✅ Clicking pre-fills the survey's booking-ref pill

**Depends on:** none

---

### B7. Print stylesheet for `/book/payment` success state

**Files:**

- Modified: `src/app/[locale]/(guest)/book/payment/page.tsx` — render `<BookingPrintLayout>` (already exists from Phase 9a) when `state === "success"`

**Acceptance criteria:**

- ✅ Print preview at A4 + Letter shows the same ticket layout as `/my-booking/manage`
- ✅ Screen view unaffected

**Depends on:** A2

---

### B8 (was E1). Apple + Google Wallet passes

**Files:**

- New: `src/lib/wallet/apple-pass.ts` — `.pkpass` generation via `passkit-generator`
- New: `src/lib/wallet/google-pass.ts` — JWT-signed Google Wallet add-to-wallet URL
- New: `src/features/booking/actions/get-wallet-pass.ts` — Server Action that returns a signed download URL or wallet add URL
- New: `src/app/api/wallet/apple/[bookingId]/route.ts` — serves the `.pkpass` (signed URL with TTL)
- Modified: `src/features/booking/components/booking-action-shelf.tsx` — add "Add to Apple Wallet" + "Add to Google Wallet" buttons (platform-detected)

**Apple Wallet specifics:**

- Annual Apple Developer cert ($99) — ops task
- Pass type ID + signing cert + private key (PEM) stored as Vercel/Supabase secrets
- `passkit-generator` (npm) builds the `.pkpass`; signed server-side
- The pass includes:
  - Booking ref (primary field)
  - Date + time (secondary)
  - Tier (auxiliary)
  - QR code (already in our DB as `qr_code_ref`)
  - Logo + brand colors
  - Update URL — push notifications when booking changes (v1.1)

**Google Wallet specifics:**

- Google Cloud project + Wallet API enabled — ops task
- Service account JSON for JWT signing — secret
- Pass class created server-side (one-time setup); pass object created per booking
- Add-to-wallet URL is a JWT-signed URL the user clicks

**Platform detection:**

- iOS Safari → show "Add to Apple Wallet" only
- Android Chrome → show "Add to Google Wallet" only
- Desktop / other → show both with platform labels

**Env vars:**

```
APPLE_WALLET_TEAM_ID
APPLE_WALLET_PASS_TYPE_ID
APPLE_WALLET_CERTIFICATE_PEM (secret)
APPLE_WALLET_PRIVATE_KEY_PEM (secret)
APPLE_WALLET_PRIVATE_KEY_PASSWORD (secret, optional)

GOOGLE_WALLET_ISSUER_ID
GOOGLE_WALLET_SERVICE_ACCOUNT_JSON (secret)
```

**Acceptance criteria:**

- ✅ iOS user clicks → Apple Wallet opens with pass preview, taps Add
- ✅ Android user clicks → Google Wallet opens, taps Save
- ✅ Pass shows correct booking_ref, date, time, QR
- ✅ Reschedule updates the wallet pass via push (v1.1 — out of scope for v1)

**Risks:**

- Apple cert expiry — tickets break overnight if cert lapses. Add to monitoring runbook.
- Google service account rotation — same.

**Depends on:** none

---

### B9 (was E2). Booking history disclosure

**Files:**

- New: `src/features/booking/queries/get-booking-history.ts` — service-role read on `system_audit_log` filtered by `entity_type='bookings' AND entity_id=<booking.id>`
- New: `src/features/booking/components/booking-history-disclosure.tsx` — collapsible section on `/my-booking/manage`
- Modified: `src/app/[locale]/(guest)/my-booking/manage/page.tsx`

**Display:**

- Each row: timestamp + action (e.g., "RESCHEDULE", "CHECK_IN") + delta summary (e.g., "Mar 5, 10:30 → Mar 6, 14:00")
- Collapsed by default; "Booking history (N events)" trigger
- Last 20 events; older filtered out — keeps scope tight

**Acceptance criteria:**

- ✅ After a reschedule, the history shows a new "RESCHEDULE" entry on next page load
- ✅ Renders empty state ("No history yet") for fresh bookings

**Depends on:** none

---

### B10 (was E3). ZIP download for `/memories`

**Files:**

- New: `supabase/functions/download-memories-zip/index.ts` — streams a ZIP from Storage to the user
- New: `src/features/booking/actions/start-memories-zip.ts` — Server Action that signs a one-time URL to the function
- Modified: `src/features/booking/components/memories-gallery.tsx` — add "Download all (.zip)" button at the top of the gallery when total ≥ 2

**Edge Function flow:**

1. Verify cookie session (same HMAC verify pattern)
2. Resolve booking → fetch all photo storage paths
3. Stream ZIP using `archiver` (Deno-compatible) writing to the response
4. Each photo embedded with original filename `<captured_at_iso>-<id>.jpg`

**Why server-side, not JSZip:**

- JSZip on the client = +30 KB gz to the bundle
- Large bookings (200 photos × 5 MB = 1 GB) would crash the browser tab
- Server-streaming is safer + cheaper

**Acceptance criteria:**

- ✅ Bookings with ≥ 2 photos show the button
- ✅ Click → ZIP downloads, named `agartha-<booking_ref>-memories.zip`
- ✅ Function streams (no full-buffer load) — verify with a 100-photo test

**Depends on:** signed-URL access patterns (already in place from Phase 9a)

---

### B11 (was E4). Realtime payment status

**Files:**

- New: `docs/adr/<NNNN>-guest-realtime-payment-exception.md` — ADR documenting the exception to CLAUDE.md §3
- New: `src/features/booking/components/payment-return-realtime.tsx` — Supabase Realtime subscription on `booking_payments` filtered by booking_id
- Modified: `src/app/[locale]/(guest)/book/payment/page.tsx` — render `<PaymentReturnRealtime>` instead of `<PaymentReturnPoll>` when status is pending

**ADR justification:**

- One channel per guest, scoped to one booking_id, lifetime ≤ 5 min
- Subscription auto-closes on success/failure
- The polling fallback (B2) remains as graceful degradation when the realtime connection fails

**Acceptance criteria:**

- ✅ Successful payment → page flips to success within ≤ 2s of webhook commit
- ✅ Channel closes when state is terminal
- ✅ Polling fallback engaged if WebSocket fails

**Depends on:** A2

---

## 4. Phase C — i18n, accessibility, tests

### C1. i18n sweep

**Files (heavy modifications):**

- New: `messages/en.json` keys under `guest.*` namespace
- New: `messages/ms.json` (initially mirrors `en` — translations populated post-merge)
- Modified: every guest page (RSC) — use `getTranslations`
- Modified: every guest client component — use `useTranslations`
- Modified: server-only utilities that emit user-facing strings (e.g., `start-payment.ts`'s "Payment provider integration is being finalised") — accept locale or use a server-side translation helper
- Modified: `messages/en.json` already exists for `app.name` etc.; this expands the namespace significantly

**Key namespaces:**

```
guest.shell.{brand, navMyBooking, footerCopyright, footerPrivacy, footerTerms}
guest.book.{title, planStep.*, dateStep.*, timeStep.*, detailsStep.*, reviewStep.*, ctaContinue, ctaConfirm, ...}
guest.payment.{idle.*, processing.*, success.*, failure.*, expired.*, holdCountdown}
guest.lookup.{title, description, refLabel, refPlaceholder, ctaSubmit, helpToggle, helpBody}
guest.verify.{title, description, resend.*, errors.*, ctaSubmit}
guest.manage.{ticketHero.*, actions.*, perks.*, attendees.*, reschedule.*, biometricsLink, memoriesLink}
guest.biometrics.{title, disclosure.*, attendee.*, withdraw.*}
guest.memories.{title, headerCount, expiry, empty.*, photo.{download, share}}
guest.survey.{title, description, q1.*, q2.*, q3.*, q4.*, ctaSend, confirmation.*}
guest.errors.{validationFailed, rateLimited, internal, ...}
```

**ICU usage:**

- Plurals: `{count, plural, one {# adult} other {# adults}}`
- Currency: `{amount, number, ::currency/MYR}`
- Dates: `{date, date, ::yyyyMMMd}`

**Source for `ms` translations:** placeholder strings copied from `en` initially. Real translations done post-merge by a native reviewer. The build still passes with English in both files.

**Acceptance criteria:**

- ✅ Every visible string sourced from `messages/{locale}.json`
- ✅ Switching locale via URL prefix (`/en/book` → `/ms/book`) flips the copy
- ✅ ICU plural + date + currency formatting works in both locales
- ✅ No hardcoded English left in guest components or actions

**Risks:**

- Action error-mapping copy (e.g., `RPC_ERROR_COPY` in `reschedule-booking.ts`) lives server-side. Two options:
  1. Translate inline using `getTranslations` in the action (server-side)
  2. Return error codes only, translate on the client
     Picking option 2 for simplicity — the action returns codes like `RESCHEDULE_TOO_LATE`, the client maps to translated copy.

---

### C2. Accessibility hardening

**Files:**

- Modified: `src/features/marketing/components/score-scale.tsx` — arrow-key navigation (radiogroup pattern)
- Modified: `src/features/booking/components/time-slot-grid.tsx` — same
- Modified: `src/components/shared/otp-input.tsx` — verify ArrowLeft/Right work (already implemented; add tests)
- Modified: `src/features/booking/components/reschedule-sheet.tsx` — verify focus trap on open + return on close (Radix Sheet should handle this — verify)
- New: `tests/a11y/guest-routes.spec.ts` — axe-core assertions

**Score scale pattern:**

```tsx
// On focus enter, focus the selected score (or 5 if none).
// ArrowLeft / ArrowRight move focus + select.
// Home / End jump to 0 / 10.
```

**Color-contrast audit:**

- Status pills (booking_status enum colors) verified against WCAG 2.2 AA
- NPS score selected colors (detractor/passive/promoter) verified
- Disabled button states (where the eye drops) verified

**Acceptance criteria:**

- ✅ axe-core: 0 serious / critical violations
- ✅ Keyboard-only walk-through of every guest route — every interactive element reachable + actionable
- ✅ Screen reader (NVDA) reads booking_ref correctly (currently it's `font-mono` — should be readable letter-by-letter)
- ✅ Tab order is logical on every step of the wizard

---

### C3. Test suite

**Unit tests (Vitest, `src/**/**tests**/`):\*\*

- Actions:
  - `validate-promo-code` — reason mapping, RPC error narrowing
  - `get-available-slots` — slot fetch, error narrowing
  - `create-booking` — Stripe-less path returns ok with redirect URL
  - `get-booking-identity` — OTP creation, rate-limit, BOOKING_NOT_FOUND mapping
  - `verify-otp` — OTP_INVALID / OTP_EXPIRED / OTP_LOCKED handling
  - `resend-otp` — same
  - `update-attendee` — JOIN-verify, FORBIDDEN on cross-booking attempt
  - `reschedule-booking` — every RPC error code mapped to user copy
  - `grant-biometric-consent` — idempotency
  - `withdraw-biometric-consent` — atomic call
  - `submit-survey` — sentiment derivation, anon-key INSERT path
  - `start-payment` — Stripe session creation (mocked)
  - `resend-booking-email` — once-per-day idempotency
- Helpers:
  - `formatBookingRef`
  - `buildBookingIcs` — RFC 5545 compliance check (parse output with `ical.js`)
  - `HoldCountdown` timer logic (tick-down)
  - `signGuestSession` / `readGuestSession` HMAC roundtrip + expiry

**Integration tests (RTL + MSW, `src/**/**tests**/integration/`):\*\*

- `BookingWizardClient` — happy path through 5 steps; URL state persists across rerenders
- `OtpVerifyForm` — paste 6 digits → auto-submit; OTP_INVALID → reset code → retry
- `AttendeeManagementList` — expand → edit → save → collapse; cross-booking attempt blocked
- `BiometricAttendeeCard` — grant flow → card flips to active; withdraw with confirm dialog
- `SurveyForm` — fill required → submit → confirmation panel
- `MemoryPhotoCard` — copy-link toast surfaces TTL

**E2E tests (Playwright, `tests/e2e/guest/`):**

- `book.spec.ts` — full happy path with Stripe test card
- `book-abuse.spec.ts` — invalid promo, SLOT_FULL race (concurrent bookings), RATE_LIMITED on rapid retry
- `my-booking.spec.ts` — lookup → OTP → manage → reschedule → biometric grant → memories
- `my-booking-rls.spec.ts` — anon HTTP request to `/api/...?booking_ref=...` does not return data
- `survey.spec.ts` — happy path + rate-limit
- `wallet.spec.ts` — Apple + Google Wallet button behavior on platform-emulated browsers

**Acceptance criteria:**

- ✅ Unit coverage ≥ 80% on actions
- ✅ Every E2E spec passes against staging + Stripe test mode
- ✅ axe spec passes on every route
- ✅ CI gate added; PR can't merge with failing tests

---

### C4. axe automation in CI

**Files:**

- Modified: `tests/e2e/guest/*.spec.ts` — add `@axe-core/playwright` assertions per route
- Modified: `playwright.config.ts` — ensure axe runs on every guest test

**Threshold:** zero serious or critical. Moderate/minor warnings logged but don't fail PR.

---

## 5. Phase D — Performance + observability

### D1. Bundle analysis

**Action:** run `ANALYZE=1 pnpm build` and record per-route bytes.

**Targets:**

| Route                           | Budget      | Likely heaviest deps                  |
| ------------------------------- | ----------- | ------------------------------------- |
| `/book`                         | ≤ 150 KB gz | nuqs, RHF, Calendar, framer-motion    |
| `/book/payment`                 | ≤ 80 KB gz  | HoldCountdown, SummaryCard            |
| `/my-booking`                   | ≤ 50 KB gz  | RHF, FormProvider                     |
| `/my-booking/verify`            | ≤ 60 KB gz  | OtpInput, ResendCountdown             |
| `/my-booking/manage`            | ≤ 150 KB gz | qrcode, ICS, Sheet, Reschedule client |
| `/my-booking/manage/biometrics` | ≤ 80 KB gz  | ConfirmDialog, AccessLogStrip         |
| `/my-booking/manage/memories`   | ≤ 80 KB gz  | Popover                               |
| `/survey`                       | ≤ 60 KB gz  | Textarea, ScoreScale                  |

**Likely fixes:**

- `next/dynamic({ ssr: false })` on `<Calendar>` (only the Date step needs it)
- Same for the print layout (only fires on print)
- Verify lucide-react tree-shaking — should hit only specific icons we import

**Acceptance criteria:**

- ✅ Every route under budget
- ✅ Analyzer output committed to `docs/perf/guest-bundles-<date>.html` for regression tracking

---

### D2. Lighthouse CI

**Files:**

- New: `lighthouse-ci-guest.config.js`
- Modified: `.github/workflows/ci.yml` — add guest-route Lighthouse job

**Thresholds:**

- Performance ≥ 90 on `/book`, `/my-booking`, `/survey`
- Accessibility ≥ 95 on every guest route
- Best practices ≥ 90
- SEO ≥ 90 on indexable routes (`/book`, `/my-booking`, `/survey`, `/privacy`, `/terms`)

---

### D3. Sentry guest-flow tags

**Files:**

- Modified: every guest action — wrap with `Sentry.startSpan({ name: "guest.book.create", op: "guest.action" }, ...)` for Performance tracing
- Verified: `sendDefaultPii: false` — booker_email never lands in breadcrumbs (currently logged via pino but not Sentry — verify pino transport doesn't forward)
- New: `src/lib/telemetry-guest.ts` — wrapper that adds `feature: "guest"` tag to captureException calls from guest contexts

**Funnel events for PostHog (already wired via env):**

- `guest.book.step_viewed` (per step)
- `guest.book.tier_selected`
- `guest.book.slot_picked`
- `guest.book.booker_filled`
- `guest.book.confirmed`
- `guest.payment.started`
- `guest.payment.completed`
- `guest.payment.failed`
- `guest.otp.requested`
- `guest.otp.verified`
- `guest.reschedule.completed`
- `guest.biometric.granted`
- `guest.biometric.withdrawn`
- `guest.survey.submitted`

**Acceptance criteria:**

- ✅ Sentry Performance shows the booking funnel end-to-end
- ✅ PostHog Funnels view shows drop-off per step
- ✅ Zero PII in Sentry events

---

### D4. CSP strict mode

**Files:**

- Modified: `next.config.ts` — verify CSP headers; replace any `unsafe-inline` with nonces
- Audit: every client component for inline scripts

**Acceptance criteria:**

- ✅ `Content-Security-Policy` header present with nonce-based script-src
- ✅ No CSP violations in browser console on any guest route
- ✅ Stripe + Resend domains whitelisted (`script-src` for Stripe.js, `img-src` for Resend tracking pixels — though we disable those)

---

### D5. Prefetch wizard next-step data

**Files:**

- Modified: `src/features/booking/components/booking-wizard-client.tsx` — add `<link rel="prefetch">` or `router.prefetch` calls

**Behavior:**

- On Plan step, when tier is selected, prefetch `/book?step=date&tierId=…` (Next App Router prefetch handles this automatically for `<Link>`s, but the wizard uses URL state changes — needs explicit `router.prefetch`)
- On Date step, prefetch slot data for the picked date+tier+count

**Acceptance criteria:**

- ✅ Continue button feels instant on every step
- ✅ INP ≤ 200 ms on every step transition (Lighthouse)

---

## 6. Phase E — already merged into B

E1, E2, E3, E4 are now part of Phase B as B8, B9, B10, B11. No separate phase needed.

---

## 7. Execution order

Recommended sequencing — dependencies make some parallel work possible.

```
Track 1 (backend):
  A1 send-email
   └─ A2 confirm-booking-payment
       └─ A3 reconcile-payments
   └─ A5 image-pipeline (independent of A1/A2)

Track 2 (UI wire-ups, depends on Track 1):
  B1 Stripe redirect            (after A2)
   └─ B2 polling                (after B1)
       └─ B11 realtime          (after B2 — supersedes polling)
  B7 print success              (after B1)
  B5 resend email CTA           (after A1)
  B6 feedback CTA               (no deps)
  B8 wallet passes              (no code deps; requires cert ops)
  B9 booking history            (no deps)
  B10 ZIP download              (no deps)
  B4 CSRF wiring                (no deps; ship as one PR)

Track 3 (cross-cutting, ship after Track 1+2):
  C1 i18n sweep                 (no deps; large mechanical pass)
  C2 a11y hardening             (no deps)
  C3 test suite                 (after Tracks 1 + 2 stable)
  C4 axe in CI                  (after C3)

Track 4 (release prep):
  D1 bundle audit               (after Tracks 1-3)
  D2 lighthouse CI              (after D1)
  D3 Sentry tags                (parallel with D2)
  D4 CSP audit                  (parallel)
  D5 prefetch                   (parallel)
```

**Per-PR scope:**

1. PR-1: A1 (send-email + Resend integration + idempotency table)
2. PR-2: A2 (Stripe webhook handler + signature verify)
3. PR-3: A3 (reconciler)
4. PR-4: A5 (image pipeline + derivative_paths)
5. PR-5: B1 + B2 + B7 (Stripe Checkout end-to-end)
6. PR-6: B11 (realtime — supersedes polling)
7. PR-7: B4 (CSRF wiring across all mutations + middleware)
8. PR-8: B5 + B6 (resend email + feedback CTA)
9. PR-9: B8 (wallet passes — Apple)
10. PR-10: B8 (wallet passes — Google)
11. PR-11: B9 + B10 (history + ZIP)
12. PR-12: C1 (i18n — en pass)
13. PR-13: C1 (i18n — ms translations populated)
14. PR-14: C2 (a11y hardening)
15. PR-15: C3 (test suite)
16. PR-16: D1 + D2 (bundle + Lighthouse CI)
17. PR-17: D3 + D4 + D5 (Sentry + CSP + prefetch)

---

## 8. Acceptance criteria — phase boundaries

After each phase, paste this evidence in the PR before merging:

### Phase A (after every Edge Function lands)

- ✅ `pnpm typecheck && pnpm lint && pnpm build` clean
- ✅ Function unit tests passing
- ✅ Manual test against Stripe test mode (A2) / Resend test (A1) / Storage upload (A5)
- ✅ Idempotency verified by replay
- ✅ Secrets configured in all environments

### Phase B (after each wire-up lands)

- ✅ Replaces the corresponding stub
- ✅ Happy path E2E passes against staging
- ✅ `router.refresh()` / `redirect()` correctly applied so RSC reads stay fresh

### Phase C

- ✅ All visible strings extracted to `messages/`
- ✅ axe spec passes on every guest route
- ✅ Test coverage targets met
- ✅ Locale switch (en ↔ ms) renders without layout breakage

### Phase D

- ✅ Each guest route under bundle budget
- ✅ Lighthouse perf ≥ 90 / a11y ≥ 95 on all guest routes
- ✅ Sentry events tagged + PostHog funnel populated end-to-end
- ✅ CSP header strict + no inline-script violations

---

## 9. Configuration summary (env vars + secrets)

**New runtime env vars:**

```
# Stripe (PR-2 onward)
STRIPE_SECRET_KEY                 (server, secret)
STRIPE_PUBLISHABLE_KEY            (client, optional — only if Elements is added later)
STRIPE_WEBHOOK_SECRET             (server, secret) — replaces PAYMENT_WEBHOOK_SECRET
NEXT_PUBLIC_BASE_URL              (server + client) — origin for Checkout success_url/cancel_url

# Resend (PR-1 onward)
RESEND_API_KEY                    (server, secret)
RESEND_FROM_EMAIL                 (server) — e.g., bookings@agartha.example
RESEND_REPLY_TO                   (server, optional)

# Wallet (PR-9 + PR-10)
APPLE_WALLET_TEAM_ID              (server)
APPLE_WALLET_PASS_TYPE_ID         (server)
APPLE_WALLET_CERTIFICATE_PEM      (server, secret)
APPLE_WALLET_PRIVATE_KEY_PEM      (server, secret)
APPLE_WALLET_PRIVATE_KEY_PASSWORD (server, secret, optional)

GOOGLE_WALLET_ISSUER_ID           (server)
GOOGLE_WALLET_SERVICE_ACCOUNT_JSON (server, secret)
```

**Existing env vars referenced:**

- `NEXT_PUBLIC_SUPABASE_URL`
- `NEXT_PUBLIC_SUPABASE_ANON_KEY`
- `SUPABASE_SERVICE_ROLE_KEY`
- `UPSTASH_REDIS_REST_URL`
- `UPSTASH_REDIS_REST_TOKEN`
- `NEXT_PUBLIC_FACILITY_TZ`
- `NEXT_PUBLIC_SENTRY_DSN`
- `NEXT_PUBLIC_POSTHOG_KEY`

**Secrets rotation cadence:**

- Stripe keys: 90 days
- Resend API key: 90 days
- Wallet certs: annual (Apple) / 90 days (Google service account)
- HMAC secrets (guest_session): every 6 months OR on suspected leak

---

## 10. Risks & mitigations

| Risk                                                      | Severity | Mitigation                                                                                |
| --------------------------------------------------------- | -------- | ----------------------------------------------------------------------------------------- |
| Stripe webhook signature drift after API version bump     | Medium   | Pin `apiVersion` in `Stripe()` constructor; subscribe to Stripe API changelog             |
| Resend deliverability low on cold domain                  | Medium   | Domain warming over 2 weeks; SPF/DKIM/DMARC verification; monitor bounce rate             |
| Apple Wallet cert expiry                                  | High     | Calendar reminder 30 days before annual renewal; ops runbook                              |
| Google service account key leak                           | High     | Never commit; rotate quarterly; least-privilege scope                                     |
| `email_dispatch_log` table grows unboundedly              | Low      | Partition by `sent_at` after 6 months; archive ≥ 1 year                                   |
| Image pipeline timeout on huge originals                  | Low      | 10 MB cap at upload time (already in storage policy); chunk if function timeout > 50%     |
| ZIP function memory blow-up                               | Medium   | Stream-only — no full-buffer load; log if booking has > 500 photos and trigger ops review |
| Realtime connection flap → silent stuck UI                | Medium   | Polling fallback (B2) remains as primary if WS fails 3 times in 30s                       |
| i18n string explosion → bundle bloat                      | Low      | Lazy-load locale messages per route via `next-intl`'s split pattern                       |
| `ms` translations machine-translated and ship low-quality | Medium   | Native-speaker review pass before production launch                                       |
| CSP nonce breaks third-party scripts                      | Low      | Stripe.js, PostHog, Sentry are the only third-parties — explicitly whitelisted            |

---

## 11. Out of scope (explicit)

For the avoidance of confusion, these are NOT part of this plan:

- **Face Pay enrolment** (deferred — see §1.3). Schema already in place; reactivating is a code-only follow-up.
- **Multi-region failover** for Edge Functions — single-region for v1.
- **Refund flows** — Stripe `charge.refunded` events logged but no refund UI in `/my-booking/manage`. v1.1.
- **Group bookings beyond 50 guests** — handled by sales team manually.
- **Native mobile app** — guest portal stays web-only.
- **PWA / offline mode for guest** — crew portal has it; guest doesn't need it.
- **Localisation beyond `en` + `ms`** — Arabic / Mandarin / Tamil are post-launch.

---

## 12. Working agreements

- **One phase per PR sequence.** Don't bundle Phase A and Phase B in a single PR.
- **Verification gates pasted in each PR.** Same format as Phase 9a sessions.
- **No new dependencies > 20 KB gzipped without ADR.** Stripe, Resend, passkit-generator, sharp, archiver — each gets a one-paragraph ADR justifying inclusion.
- **No schema changes outside the noted migrations.** `email_dispatch_log` and `captured_photos.derivative_paths` are the only new schema; everything else uses what's already there.
- **Stretch items can be deferred mid-execution.** If PR-9 (Apple Wallet) hits cert blockers, ship without it — the booking flow is the floor, wallets are polish.

---

## 13. Open questions for follow-up

These don't block starting; capture answers as they surface:

- Final domain for transactional email (`bookings@…` vs `noreply@…`?)
- Reply-to behaviour — bounce to `support@…` or auto-acknowledge?
- Stripe statement descriptor — what shows on the cardholder's statement
- Apple Wallet logo asset — needs designer-supplied `icon.png` + `logo.png` at exact sizes
- Google Wallet hex color for pass background
- Privacy policy text — legal review required before swapping the placeholder
- Bahasa Malaysia copy reviewer — internal team or external translator?

---

> **Approved by:** Esam Jouda · 2026-04-27
> **Author of plan:** Phase 9a session 17 enhancement pass
> **Next review:** at completion of each phase boundary
