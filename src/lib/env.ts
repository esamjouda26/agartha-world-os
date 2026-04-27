import "server-only";
import { z } from "zod";

// Coerces empty string ("") to undefined before Zod validation runs.
// Rationale: dotenv-style parsers (pnpm, Next.js) read `FOO=` as "", not
// absent. Without this, .optional() fields with URL validation throw when
// the key exists but is blank — breaking the dev-bypass pattern.
const emptyToUndefined = (val: unknown): unknown => (val === "" ? undefined : val);

const envSchema = z.object({
  // Required in all environments — NEXT_PUBLIC_ keys are exposed to the
  // browser bundle; SUPABASE_SERVICE_ROLE_KEY is server-only.
  NEXT_PUBLIC_SUPABASE_URL: z.string().url(),
  NEXT_PUBLIC_SUPABASE_ANON_KEY: z.string().min(1),
  SUPABASE_SERVICE_ROLE_KEY: z.string().min(1),
  UPSTASH_REDIS_REST_URL: z.string().url(),
  UPSTASH_REDIS_REST_TOKEN: z.string().min(1),

  // Optional in development. Required before the corresponding feature ships:
  //   PAYMENT_WEBHOOK_SECRET     → DEPRECATED placeholder for the legacy
  //                                shared-secret confirm-booking-payment
  //                                Edge Function. Superseded by
  //                                STRIPE_WEBHOOK_SECRET below; retained
  //                                only so existing .env files don't break
  //                                Zod parsing.
  //   STRIPE_SECRET_KEY          → server-only `sk_live_...` / `sk_test_...`
  //                                used by `startPaymentAction` to mint
  //                                Checkout Sessions. Production deploys
  //                                MUST set this; missing-key calls in dev
  //                                surface DEPENDENCY_FAILED with friendly
  //                                copy.
  //   STRIPE_WEBHOOK_SECRET      → `whsec_...` used by
  //                                `stripe.webhooks.constructEvent` in the
  //                                /api/webhooks/stripe route handler.
  //                                Without it the handler 500s — there is
  //                                no safe degradation for an unverifiable
  //                                webhook.
  //   NEXT_PUBLIC_BASE_URL       → origin used for Stripe success_url +
  //                                cancel_url. Must match the deployed
  //                                domain because Stripe re-hits this on
  //                                guest return.
  //   NEXT_PUBLIC_SENTRY_DSN     → browser + server DSN (preferred single key)
  //   SENTRY_DSN                 → optional server-only override if client +
  //                                server report to different Sentry projects
  //   SENTRY_AUTH_TOKEN          → build-time only (source-map upload via
  //                                withSentryConfig); NOT validated here because
  //                                it's consumed by the webpack plugin, never
  //                                at runtime.
  //   NEXT_PUBLIC_POSTHOG_KEY    → required before any feature-flagged release
  //   RESEND_API_KEY             → required before any guest-facing
  //                                send-email invocation. Production
  //                                deploys MUST set this; staging without
  //                                it silently swallows OTPs (failure
  //                                mode is logged in dispatchEmail).
  //   RESEND_FROM_EMAIL          → "AgarthaOS <bookings@…>" — must match a
  //                                verified Resend sender domain.
  PAYMENT_WEBHOOK_SECRET: z.preprocess(emptyToUndefined, z.string().min(1).optional()),
  STRIPE_SECRET_KEY: z.preprocess(emptyToUndefined, z.string().min(1).optional()),
  STRIPE_WEBHOOK_SECRET: z.preprocess(emptyToUndefined, z.string().min(1).optional()),
  NEXT_PUBLIC_BASE_URL: z.preprocess(emptyToUndefined, z.string().url().optional()),
  NEXT_PUBLIC_SENTRY_DSN: z.preprocess(emptyToUndefined, z.string().url().optional()),
  SENTRY_DSN: z.preprocess(emptyToUndefined, z.string().url().optional()),
  NEXT_PUBLIC_POSTHOG_KEY: z.preprocess(emptyToUndefined, z.string().min(1).optional()),
  NEXT_PUBLIC_POSTHOG_HOST: z.preprocess(emptyToUndefined, z.string().url().optional()),
  RESEND_API_KEY: z.preprocess(emptyToUndefined, z.string().min(1).optional()),
  RESEND_FROM_EMAIL: z.preprocess(emptyToUndefined, z.string().min(1).optional()),

  // Facility timezone — mirrors the `facility_timezone` row in
  // `public.app_config`. IANA zone string. Used by client-side formatters
  // (`formatAtFacility` in `src/lib/date.ts`) so displayed times always
  // reflect the facility's wall-clock regardless of where the user's
  // browser happens to be. Default matches the DB seed; override via
  // `.env.local` only if you're running against a non-MYT facility.
  NEXT_PUBLIC_FACILITY_TZ: z.preprocess(
    emptyToUndefined,
    z.string().min(1).default("Asia/Kuala_Lumpur"),
  ),

  NODE_ENV: z.enum(["development", "test", "production"]).default("development"),
});

const parsed = envSchema.safeParse(process.env);
if (!parsed.success) {
  console.error("Invalid environment variables:", parsed.error.flatten().fieldErrors);
  throw new Error("Environment validation failed — see errors above.");
}

// Production-only refinement: critical guest-flow keys MUST be set at
// runtime. Missing them in dev/preview is fine (the relevant Server
// Actions surface friendly DEPENDENCY_FAILED errors); missing them at
// production runtime is a release blocker.
//
// We deliberately SKIP this check during the production *build*
// (`NEXT_PHASE === "phase-production-build"`). Next.js loads server
// modules during static-page collection — at that point the deploy
// secrets aren't yet bound. Validating only at runtime catches
// misconfiguration on first serve without breaking local CI builds.
const isProductionRuntime =
  parsed.data.NODE_ENV === "production" && process.env.NEXT_PHASE !== "phase-production-build";

if (isProductionRuntime) {
  const missing: string[] = [];
  if (!parsed.data.STRIPE_SECRET_KEY) missing.push("STRIPE_SECRET_KEY");
  if (!parsed.data.STRIPE_WEBHOOK_SECRET) missing.push("STRIPE_WEBHOOK_SECRET");
  if (!parsed.data.NEXT_PUBLIC_BASE_URL) missing.push("NEXT_PUBLIC_BASE_URL");
  if (!parsed.data.RESEND_API_KEY) missing.push("RESEND_API_KEY");
  if (!parsed.data.RESEND_FROM_EMAIL) missing.push("RESEND_FROM_EMAIL");
  if (missing.length > 0) {
    console.error(
      `[env] Missing required production env vars: ${missing.join(", ")}. ` +
        "Guest portal flows will fail. Set them in your Vercel project before deploying.",
    );
    throw new Error(`Production env validation failed — missing: ${missing.join(", ")}`);
  }
}

export const env = parsed.data;
export type Env = z.infer<typeof envSchema>;
