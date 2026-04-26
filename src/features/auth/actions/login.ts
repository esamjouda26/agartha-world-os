"use server";

import "server-only";

import { headers } from "next/headers";

import { fail, ok, type ServerActionResult } from "@/lib/errors";
import { loggerWith } from "@/lib/logger";
import { createRateLimiter } from "@/lib/rate-limit";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { loginSchema, type LoginInput } from "@/features/auth/schemas/login.schema";

// CLAUDE.md §11 — 5 attempts/min/IP+email baseline.
const productionLimiter = createRateLimiter({
  tokens: 5,
  window: "1 m",
  prefix: "auth:login",
});

// Tests relax the bucket for seeded roles that get reused across many
// tests within one minute. Dedicated "ratelimit-probe-*" emails still
// flow through `productionLimiter` so the rate-limit gate test is real.
const testLimiter = createRateLimiter({
  tokens: 200,
  window: "1 m",
  prefix: `auth:login:test:${process.pid}`,
});

function pickLimiter(email: string) {
  if (process.env.TEST_RELAX_RATE_LIMITS !== "1") return productionLimiter;
  if (email.toLowerCase().includes("ratelimit-probe")) return productionLimiter;
  return testLimiter;
}

type EmploymentStatus = "active" | "pending" | "on_leave" | "suspended" | "terminated";
type LoginData = Readonly<{
  accessLevel: "admin" | "manager" | "crew" | null;
  passwordSet: boolean;
  employmentStatus: EmploymentStatus;
}>;

async function clientKey(email: string): Promise<string> {
  const hdr = await headers();
  const forwarded = hdr.get("x-forwarded-for") ?? "";
  const ip = forwarded.split(",")[0]?.trim() || hdr.get("x-real-ip") || "unknown";
  return `${ip}|${email.toLowerCase()}`;
}

export async function loginAction(input: LoginInput): Promise<ServerActionResult<LoginData>> {
  const log = loggerWith({ feature: "auth", event: "login" });

  // 1. Validate input.
  const parsed = loginSchema.safeParse(input);
  if (!parsed.success) {
    const fields: Record<string, string> = {};
    for (const issue of parsed.error.issues) {
      const path = issue.path[0];
      if (typeof path === "string") fields[path] = issue.message;
    }
    return fail("VALIDATION_FAILED", fields);
  }
  const { email, password } = parsed.data;

  // 3. Rate limit (pipeline step 3; no auth yet so step 2 is N/A).
  const key = await clientKey(email);
  const rl = await pickLimiter(email).limit(key);
  if (!rl.success) {
    log.warn({ email }, "login rate-limited");
    return fail("RATE_LIMITED");
  }

  // 5. Execute via Supabase Auth.
  const supabase = await createSupabaseServerClient();
  const { data, error } = await supabase.auth.signInWithPassword({ email, password });
  if (error || !data.session) {
    log.info({ email, err: error?.message }, "login failed");

    // Supabase Auth returns a specific error when the user is banned
    // (i.e. suspended/terminated via admin_lock_account).
    const isBanned = error?.message?.toLowerCase().includes("banned");
    if (isBanned) {
      return fail("FORBIDDEN");
    }

    // Do NOT attribute the error to a specific field. Marking the email
    // field red implies the email was the problem, when in reality
    // either input could be — and leaking which one narrows an
    // attacker's guessing space. The form renders a top-of-form alert
    // for credential errors instead.
    return fail("UNAUTHENTICATED");
  }

  const accessLevel =
    (data.session.user.app_metadata as { access_level?: LoginData["accessLevel"] } | undefined)
      ?.access_level ?? null;

  // Check profile status flags (new provisioned staff, employment gate)
  const { data: profile } = await supabase
    .from("profiles")
    .select("password_set, employment_status")
    .eq("id", data.session.user.id)
    .maybeSingle();
  const passwordSet = profile?.password_set !== false; // null or true → treated as set
  const employmentStatus = (profile?.employment_status ?? "active") as EmploymentStatus;

  log.info(
    { userId: data.session.user.id, accessLevel, passwordSet, employmentStatus },
    "login ok",
  );
  return ok({ accessLevel, passwordSet, employmentStatus });
}
