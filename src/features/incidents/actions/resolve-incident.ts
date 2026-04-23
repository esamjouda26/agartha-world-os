"use server";

import "server-only";

import { after } from "next/server";
import { revalidatePath } from "next/cache";

import { fail, ok, type ServerActionResult } from "@/lib/errors";
import { loggerWith } from "@/lib/logger";
import { createRateLimiter } from "@/lib/rate-limit";
import { createSupabaseServerClient } from "@/lib/supabase/server";

import { INCIDENTS_ROUTER_PATHS } from "@/features/incidents/cache-tags";
import { RESOLUTION_NOTES_KEY } from "@/features/incidents/constants";
import { resolveIncidentSchema } from "@/features/incidents/schemas/incident";

export type ResolveIncidentResult = Readonly<{ id: string }>;

const limiter = createRateLimiter({
  tokens: 20,
  window: "1 m",
  prefix: "incidents-resolve",
});

/**
 * Resolve an open incident. `incidents_update` RLS is gated on `ops:u`
 * ([init_schema.sql:3538-3540](../../../../supabase/migrations/20260417064731_init_schema.sql#L3538));
 * this action checks the same grant server-side first so we return a
 * clean FORBIDDEN instead of letting the RLS deny silently surface as a
 * zero-row update.
 *
 * Single-statement UPDATE — no RPC needed per CLAUDE.md §4 (only multi-
 * mutation sequences require transactions). `metadata` is merged via
 * the `||` JSONB operator so existing keys survive.
 */
export async function resolveIncidentAction(
  input: unknown,
): Promise<ServerActionResult<ResolveIncidentResult>> {
  const parsed = resolveIncidentSchema.safeParse(input);
  if (!parsed.success) {
    const fields: Record<string, string> = {};
    for (const issue of parsed.error.issues) {
      fields[issue.path.join(".") || "form"] = issue.message;
    }
    return fail("VALIDATION_FAILED", fields);
  }

  const supabase = await createSupabaseServerClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return fail("UNAUTHENTICATED");
  const appMeta = (user.app_metadata ?? {}) as { domains?: Record<string, readonly string[]> };
  if (!(appMeta.domains?.ops ?? []).includes("u")) return fail("FORBIDDEN");

  const lim = await limiter.limit(user.id);
  if (!lim.success) return fail("RATE_LIMITED");

  // Read existing metadata first, merge, write back. `||` JSONB operator
  // would be cleaner in SQL but the Supabase JS client doesn't expose it
  // without raw SQL (CLAUDE.md §8 forbids that). Two round-trips is
  // acceptable because this is a manual manager action, not a hot path.
  // If volume grows, refactor to `rpc_resolve_incident(…)`.
  const { data: existing, error: readErr } = await supabase
    .from("incidents")
    .select("id, status, metadata")
    .eq("id", parsed.data.id)
    .maybeSingle();
  if (readErr) return fail("INTERNAL");
  if (!existing) return fail("NOT_FOUND");
  if (existing.status === "resolved") return fail("CONFLICT");

  const existingMeta = (existing.metadata ?? {}) as Record<string, unknown>;
  const nextMeta = { ...existingMeta, [RESOLUTION_NOTES_KEY]: parsed.data.notes };

  const { error } = await supabase
    .from("incidents")
    .update({
      status: "resolved",
      resolved_by: user.id,
      resolved_at: new Date().toISOString(),
      metadata: nextMeta,
    })
    .eq("id", parsed.data.id)
    .eq("status", "open"); // Guard against a race — don't overwrite a concurrent resolve.
  if (error) return fail("INTERNAL");

  for (const path of INCIDENTS_ROUTER_PATHS) {
    revalidatePath(path, "page");
  }

  after(async () => {
    const log = loggerWith({
      feature: "incidents",
      event: "resolve",
      user_id: user.id,
    });
    log.info({ incident_id: parsed.data.id }, "resolveIncidentAction completed");
  });

  return ok({ id: parsed.data.id });
}
