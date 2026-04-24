"use server";

import "server-only";

import { revalidatePath } from "next/cache";
import { after } from "next/server";

import { fail, ok, type ServerActionResult } from "@/lib/errors";
import { loggerWith } from "@/lib/logger";
import { createRateLimiter } from "@/lib/rate-limit";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { UNITS_ROUTER_PATHS } from "@/features/units/cache-tags";
import { createUnitSchema, updateUnitSchema } from "@/features/units/schemas/unit";

const limiter = createRateLimiter({ tokens: 20, window: "60 s", prefix: "units" });

export async function createUnit(input: unknown): Promise<ServerActionResult<{ id: string }>> {
  const parsed = createUnitSchema.safeParse(input);
  if (!parsed.success) {
    const fields: Record<string, string> = {};
    for (const issue of parsed.error.issues) fields[issue.path.join(".") || "form"] = issue.message;
    return fail("VALIDATION_FAILED", fields);
  }

  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return fail("UNAUTHENTICATED");
  const appMeta = (user.app_metadata ?? {}) as { domains?: Record<string, string[]> };
  if (!(appMeta.domains?.system ?? []).includes("c")) return fail("FORBIDDEN");

  const lim = await limiter.limit(user.id);
  if (!lim.success) return fail("RATE_LIMITED");

  const { data, error } = await supabase
    .from("units")
    .insert({ name: parsed.data.name, abbreviation: parsed.data.abbreviation })
    .select("id")
    .single();

  if (error) {
    if (error.code === "23505") {
      const isAbbrev = error.message.includes("abbreviation");
      return fail("CONFLICT", {
        [isAbbrev ? "abbreviation" : "name"]: isAbbrev
          ? "Abbreviation already in use"
          : "Name already in use",
      });
    }
    return fail("INTERNAL");
  }

  for (const p of UNITS_ROUTER_PATHS) revalidatePath(p, "page");

  after(async () => {
    loggerWith({ feature: "units", event: "create", user_id: user.id }).info(
      { unit_id: data.id },
      "unit created",
    );
  });

  return ok({ id: data.id });
}

export async function updateUnit(input: unknown): Promise<ServerActionResult<{ id: string }>> {
  const parsed = updateUnitSchema.safeParse(input);
  if (!parsed.success) {
    const fields: Record<string, string> = {};
    for (const issue of parsed.error.issues) fields[issue.path.join(".") || "form"] = issue.message;
    return fail("VALIDATION_FAILED", fields);
  }

  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return fail("UNAUTHENTICATED");
  const appMeta = (user.app_metadata ?? {}) as { domains?: Record<string, string[]> };
  if (!(appMeta.domains?.system ?? []).includes("u")) return fail("FORBIDDEN");

  const lim = await limiter.limit(user.id);
  if (!lim.success) return fail("RATE_LIMITED");

  const { error } = await supabase
    .from("units")
    .update({ name: parsed.data.name, abbreviation: parsed.data.abbreviation })
    .eq("id", parsed.data.id);

  if (error) {
    if (error.code === "23505") {
      const isAbbrev = error.message.includes("abbreviation");
      return fail("CONFLICT", {
        [isAbbrev ? "abbreviation" : "name"]: isAbbrev
          ? "Abbreviation already in use"
          : "Name already in use",
      });
    }
    return fail("INTERNAL");
  }

  for (const p of UNITS_ROUTER_PATHS) revalidatePath(p, "page");

  after(async () => {
    loggerWith({ feature: "units", event: "update", user_id: user.id }).info(
      { unit_id: parsed.data.id },
      "unit updated",
    );
  });

  return ok({ id: parsed.data.id });
}
