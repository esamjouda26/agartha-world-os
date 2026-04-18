import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "jsr:@supabase/supabase-js@2";

/**
 * cron-employment-sync — Nightly employment lifecycle sync
 *
 * Called by pg_cron via pg_net at 00:10 MYT (16:10 UTC).
 * Auth: shared CRON_SECRET (not a JWT — verify_jwt must be disabled).
 *
 * Two operations:
 *   1. Activate: pending staff whose contract_start <= today → active
 *   2. Terminate: active staff whose contract_end < today → terminated + auth ban
 *
 * Requires environment secrets:
 *   CRON_SECRET              — shared secret matching app.settings.cron_secret
 *   SUPABASE_URL             — auto-injected
 *   SUPABASE_SERVICE_ROLE_KEY — auto-injected
 */

function jsonResponse(body: Record<string, unknown>, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "Content-Type": "application/json" },
  });
}

/** Get current date in Asia/Kuala_Lumpur (MYT = UTC+8) as YYYY-MM-DD */
function getMytDate(): string {
  const now = new Date();
  const myt = new Date(now.getTime() + 8 * 60 * 60 * 1000);
  return myt.toISOString().split("T")[0];
}

Deno.serve(async (req: Request) => {
  // ── Auth: validate cron secret ────────────────────────────────────────────

  const cronSecret = Deno.env.get("CRON_SECRET");
  if (!cronSecret) {
    console.error("[cron-employment-sync] CRON_SECRET not configured");
    return jsonResponse({ error: "CRON_SECRET not configured" }, 500);
  }

  const authHeader = req.headers.get("Authorization");
  if (authHeader !== `Bearer ${cronSecret}`) {
    return jsonResponse({ error: "Unauthorized" }, 401);
  }

  // ── Setup ─────────────────────────────────────────────────────────────────

  const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
  const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
  const supabase = createClient(supabaseUrl, serviceKey, {
    auth: { autoRefreshToken: false, persistSession: false },
  });

  const today = getMytDate();
  const results = {
    activated: [] as string[],
    terminated: [] as string[],
    unsuspended: [] as string[],
    errors: [] as string[],
    run_date: today,
    run_at: new Date().toISOString(),
  };

  // ── 1. Activate pending staff ─────────────────────────────────────────────
  //
  // Condition: profiles.employment_status = 'pending'
  //            AND linked staff_records.contract_start <= today
  //
  // Join path: profiles.staff_record_id → staff_records.contract_start

  const { data: pendingProfiles, error: fetchPendingErr } = await supabase
    .from("profiles")
    .select("id, staff_record_id, display_name, staff_records!inner(contract_start)")
    .eq("employment_status", "pending")
    .not("staff_record_id", "is", null);

  if (fetchPendingErr) {
    results.errors.push(`fetch_pending: ${fetchPendingErr.message}`);
  } else if (pendingProfiles) {
    for (const profile of pendingProfiles) {
      const contractStart = (profile.staff_records as { contract_start: string }).contract_start;

      if (contractStart && contractStart <= today) {
        const { error: updateErr } = await supabase
          .from("profiles")
          .update({ employment_status: "active" })
          .eq("id", profile.id);

        if (updateErr) {
          results.errors.push(`activate_${profile.id}: ${updateErr.message}`);
        } else {
          results.activated.push(profile.id);
          console.log(
            `[cron-employment-sync] Activated: ${profile.display_name} (${profile.id}), contract_start=${contractStart}`
          );
        }
      }
    }
  }

  // ── 2. Terminate expired contracts ────────────────────────────────────────
  //
  // Condition: profiles.employment_status = 'active'
  //            AND linked staff_records.contract_end IS NOT NULL
  //            AND staff_records.contract_end < today
  //
  // On termination:
  //   a) Set profiles.employment_status = 'terminated'
  //   b) Ban the user in auth.users (prevents all login)

  const { data: activeProfiles, error: fetchActiveErr } = await supabase
    .from("profiles")
    .select("id, staff_record_id, display_name, staff_records!inner(contract_end)")
    .eq("employment_status", "active")
    .not("staff_record_id", "is", null);

  if (fetchActiveErr) {
    results.errors.push(`fetch_active: ${fetchActiveErr.message}`);
  } else if (activeProfiles) {
    for (const profile of activeProfiles) {
      const contractEnd = (profile.staff_records as { contract_end: string | null }).contract_end;

      // Skip if no end date (indefinite contract) or not yet expired
      if (!contractEnd || contractEnd >= today) {
        continue;
      }

      // a) Update profile status
      const { error: updateErr } = await supabase
        .from("profiles")
        .update({ employment_status: "terminated" })
        .eq("id", profile.id);

      if (updateErr) {
        results.errors.push(`terminate_${profile.id}: ${updateErr.message}`);
        continue;
      }

      // b) Ban the user in Supabase Auth (prevents login)
      const { error: banErr } = await supabase.auth.admin.updateUserById(
        profile.id,
        { ban_duration: "876000h" } // ~100 years
      );

      if (banErr) {
        results.errors.push(`ban_${profile.id}: ${banErr.message}`);
      }

      results.terminated.push(profile.id);
      console.log(
        `[cron-employment-sync] Terminated: ${profile.display_name} (${profile.id}), contract_end=${contractEnd}`
      );
    }
  }

  // ── 3. Auto-lift expired suspensions ────────────────────────────────────
  //
  // Condition: profiles.employment_status = 'suspended'
  //            AND auth.users.banned_until IS NOT NULL
  //            AND auth.users.banned_until < NOW()
  //
  // On unsuspend:
  //   a) Lift auth ban (ban_duration: 'none')
  //   b) Set profiles.employment_status = 'active'
  //   c) Set profiles.is_locked = FALSE

  const { data: suspendedProfiles, error: fetchSuspendedErr } = await supabase
    .from("profiles")
    .select("id, display_name")
    .eq("employment_status", "suspended");

  if (fetchSuspendedErr) {
    results.errors.push(`fetch_suspended: ${fetchSuspendedErr.message}`);
  } else if (suspendedProfiles) {
    for (const profile of suspendedProfiles) {
      // Check if auth ban has expired
      const { data: userData, error: userErr } = await supabase.auth.admin.getUserById(profile.id);

      if (userErr || !userData?.user) {
        results.errors.push(`fetch_user_${profile.id}: ${userErr?.message || "user not found"}`);
        continue;
      }

      const bannedUntil = userData.user.banned_until;
      if (!bannedUntil) continue;

      // Parse banned_until — skip if still in the future
      const banExpiry = new Date(bannedUntil);
      if (banExpiry >= new Date()) continue;

      // a) Lift auth ban
      const { error: unbanErr } = await supabase.auth.admin.updateUserById(
        profile.id,
        { ban_duration: "none" }
      );

      if (unbanErr) {
        results.errors.push(`unban_${profile.id}: ${unbanErr.message}`);
        continue;
      }

      // b+c) Reactivate profile
      const { error: reactivateErr } = await supabase
        .from("profiles")
        .update({
          employment_status: "active",
          is_locked: false,
          locked_reason: null,
          locked_at: null,
          locked_by: null,
        })
        .eq("id", profile.id);

      if (reactivateErr) {
        results.errors.push(`reactivate_${profile.id}: ${reactivateErr.message}`);
        continue;
      }

      results.unsuspended.push(profile.id);
      console.log(
        `[cron-employment-sync] Unsuspended: ${profile.display_name} (${profile.id}), ban expired at ${bannedUntil}`
      );
    }
  }

  // ── Result ────────────────────────────────────────────────────────────────

  console.log(
    `[cron-employment-sync] Complete — activated: ${results.activated.length}, terminated: ${results.terminated.length}, unsuspended: ${results.unsuspended.length}, errors: ${results.errors.length}`
  );

  return jsonResponse({
    activated_count: results.activated.length,
    terminated_count: results.terminated.length,
    unsuspended_count: results.unsuspended.length,
    error_count: results.errors.length,
    ...(results.errors.length > 0 && { errors: results.errors }),
    run_date: results.run_date,
    run_at: results.run_at,
  });
});
