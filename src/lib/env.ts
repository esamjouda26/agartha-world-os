import "server-only";
import { z } from "zod";

const envSchema = z.object({
  // Required in all environments
  NEXT_PUBLIC_SUPABASE_URL: z.string().url(),
  NEXT_PUBLIC_SUPABASE_ANON_KEY: z.string().min(1),
  SUPABASE_SERVICE_ROLE_KEY: z.string().min(1),
  UPSTASH_REDIS_REST_URL: z.string().url(),
  UPSTASH_REDIS_REST_TOKEN: z.string().min(1),

  // Optional in development. Required before the corresponding feature ships:
  //   PAYMENT_WEBHOOK_SECRET  → required before wiring any payment webhook
  //   SENTRY_DSN              → required for staging + prod
  //   NEXT_PUBLIC_POSTHOG_KEY → required before any feature-flagged release
  PAYMENT_WEBHOOK_SECRET: z.string().optional(),
  SENTRY_DSN: z.string().url().optional(),
  NEXT_PUBLIC_POSTHOG_KEY: z.string().optional(),
  NEXT_PUBLIC_POSTHOG_HOST: z.string().url().optional(),

  NODE_ENV: z.enum(["development", "test", "production"]).default("development"),
});

const parsed = envSchema.safeParse(process.env);
if (!parsed.success) {
  console.error("Invalid environment variables:", parsed.error.flatten().fieldErrors);
  throw new Error("Environment validation failed — see errors above.");
}

export const env = parsed.data;
export type Env = z.infer<typeof envSchema>;
