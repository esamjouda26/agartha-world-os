import "server-only";

import * as Sentry from "@sentry/nextjs";
import { after } from "next/server";

import { env } from "@/lib/env";
import { loggerWith } from "@/lib/logger";

/**
 * Guest-portal telemetry helpers.
 *
 * Plan §D3 — wraps every guest mutation in:
 *   1. A Sentry performance span (`op: "guest.action"`) so the booking
 *      funnel shows up end-to-end in Sentry Performance.
 *   2. A PostHog funnel event (anon distinct_id derived from request IP
 *      hash so we can chart drop-off without storing PII).
 *   3. A structured pino log with the same event name so Loki/Datadog
 *      tail keeps lockstep with Sentry/PostHog.
 *
 * Server-only — guest mutations all run inside Server Actions.
 *
 * Usage:
 *   return guestSpan({ name: "guest.book.create" }, async () => {
 *     // ... action body, returns ServerActionResult ...
 *   });
 *
 * The wrapper transparently propagates the inner result; on
 * thrown error it captures + re-throws so Next's Server Action error
 * boundary still kicks in.
 *
 * Per CLAUDE.md §11 + §15: NEVER pass restricted-class fields
 * (booker_email, OTP code, payment_intent_id is OK as it's an opaque
 * Stripe id) into the `attributes` map. Use the `redacted` block in
 * pino if you must log them.
 */

export type GuestSpanInput = Readonly<{
  /** Event name — convention `guest.<domain>.<verb>` (e.g. `guest.book.create`). */
  name: string;
  /** Optional non-PII attributes for span + analytics. */
  attributes?: Readonly<Record<string, string | number | boolean | undefined>>;
  /** Optional anonymous distinct_id for PostHog (e.g. hashed IP). */
  distinctId?: string;
}>;

export async function guestSpan<T>(input: GuestSpanInput, body: () => Promise<T>): Promise<T> {
  return Sentry.startSpan(
    {
      name: input.name,
      op: "guest.action",
      ...(input.attributes ? { attributes: stripUndefined(input.attributes) } : {}),
    },
    async (span) => {
      const log = loggerWith({ feature: "guest", event: input.name });
      const startedAt = Date.now();
      try {
        const result = await body();
        const durationMs = Date.now() - startedAt;
        // Log + emit PostHog event in `after()` so the user-facing
        // response isn't blocked by the analytics ingest hop.
        after(async () => {
          log.info({ ...input.attributes, duration_ms: durationMs, ok: true }, input.name);
          await emitPostHog({
            event: input.name,
            ...(input.distinctId !== undefined ? { distinctId: input.distinctId } : {}),
            properties: {
              ...input.attributes,
              duration_ms: durationMs,
              ok: true,
            },
            log,
          });
        });
        span.setAttribute("ok", true);
        return result;
      } catch (err) {
        const durationMs = Date.now() - startedAt;
        log.error(
          {
            ...input.attributes,
            duration_ms: durationMs,
            err: err instanceof Error ? err.message : String(err),
          },
          input.name,
        );
        Sentry.captureException(err, {
          tags: { feature: "guest" },
          extra: { event: input.name, ...input.attributes },
        });
        span.setAttribute("ok", false);
        throw err;
      }
    },
  );
}

/**
 * Emit a PostHog event without holding the user's response. Failures
 * here are non-fatal (logged at WARN). Distinct_id is the caller's
 * responsibility — typically a SHA-256 of request IP scoped to a
 * per-day salt so we don't store PII.
 */
async function emitPostHog(args: {
  event: string;
  distinctId?: string;
  properties?: Record<string, unknown>;
  log: ReturnType<typeof loggerWith>;
}): Promise<void> {
  const { event, distinctId, properties, log } = args;
  if (!env.NEXT_PUBLIC_POSTHOG_KEY) return;
  try {
    const { PostHog } = await import("posthog-node");
    const client = new PostHog(env.NEXT_PUBLIC_POSTHOG_KEY, {
      host: env.NEXT_PUBLIC_POSTHOG_HOST ?? "https://us.i.posthog.com",
      flushAt: 1,
      flushInterval: 0,
    });
    client.capture({
      distinctId: distinctId ?? "guest-anon",
      event,
      ...(properties ? { properties } : {}),
    });
    await client.shutdown();
  } catch (err) {
    log.warn({ err: err instanceof Error ? err.message : String(err) }, "posthog capture failed");
  }
}

function stripUndefined(
  obj: Readonly<Record<string, string | number | boolean | undefined>>,
): Record<string, string | number | boolean> {
  const out: Record<string, string | number | boolean> = {};
  for (const [k, v] of Object.entries(obj)) {
    if (v !== undefined) out[k] = v;
  }
  return out;
}

/**
 * Re-export `loggerWith` so callers don't have to import from two
 * paths. Pure convenience.
 */
export { loggerWith };
