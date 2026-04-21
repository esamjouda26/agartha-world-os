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
  //   PAYMENT_WEBHOOK_SECRET     → required before wiring any payment webhook
  //   NEXT_PUBLIC_SENTRY_DSN     → browser + server DSN (preferred single key)
  //   SENTRY_DSN                 → optional server-only override if client +
  //                                server report to different Sentry projects
  //   SENTRY_AUTH_TOKEN          → build-time only (source-map upload via
  //                                withSentryConfig); NOT validated here because
  //                                it's consumed by the webpack plugin, never
  //                                at runtime.
  //   NEXT_PUBLIC_POSTHOG_KEY    → required before any feature-flagged release
  PAYMENT_WEBHOOK_SECRET: z.preprocess(emptyToUndefined, z.string().min(1).optional()),
  NEXT_PUBLIC_SENTRY_DSN: z.preprocess(emptyToUndefined, z.string().url().optional()),
  SENTRY_DSN: z.preprocess(emptyToUndefined, z.string().url().optional()),
  NEXT_PUBLIC_POSTHOG_KEY: z.preprocess(emptyToUndefined, z.string().min(1).optional()),
  NEXT_PUBLIC_POSTHOG_HOST: z.preprocess(emptyToUndefined, z.string().url().optional()),

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

export const env = parsed.data;
export type Env = z.infer<typeof envSchema>;
