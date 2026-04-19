// Throwaway Phase 1 verification. Deletes in Phase 10 per prompt.md §Phase 10 step 10.
// Asserts it_admin@agartha.test can sign in and carries the expected domain claims.
// Additionally counts @agartha.test profiles via service role to satisfy Phase 1's
// profile-count gate (psql alternative since psql is not on this workstation's PATH).

import { loadEnvFile } from "node:process";

import { createClient } from "@supabase/supabase-js";

loadEnvFile("./.env.local");

const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!url || !anonKey || !serviceKey) {
  console.error(
    "Missing NEXT_PUBLIC_SUPABASE_URL / NEXT_PUBLIC_SUPABASE_ANON_KEY / SUPABASE_SERVICE_ROLE_KEY in .env.local.",
  );
  process.exit(1);
}

const REQUIRED_DOMAIN_KEYS = ["it", "system", "hr", "reports", "comms"] as const;
const EXPECTED_PROFILE_COUNT = 19;

async function main(): Promise<void> {
  const anon = createClient(url!, anonKey!);

  const { data, error } = await anon.auth.signInWithPassword({
    email: "it_admin@agartha.test",
    password: "Password1!",
  });
  if (error || !data.session) {
    console.error("[FAIL] sign-in failed:", error?.message ?? "no session returned");
    process.exit(1);
  }

  const appMetadata = data.session.user.app_metadata as {
    domains?: Record<string, string>;
  };
  const domains = appMetadata.domains;
  if (!domains) {
    console.error("[FAIL] session.user.app_metadata.domains is missing");
    process.exit(1);
  }

  console.info("domains claim for it_admin:", JSON.stringify(domains, null, 2));

  const missing = REQUIRED_DOMAIN_KEYS.filter((k) => !(k in domains));
  if (missing.length > 0) {
    console.error("[FAIL] missing domain keys on it_admin:", missing.join(", "));
    process.exit(1);
  }
  console.info(
    "[PASS] it_admin app_metadata.domains contains required keys:",
    REQUIRED_DOMAIN_KEYS.join(", "),
  );

  await anon.auth.signOut();

  const service = createClient(url!, serviceKey!, {
    auth: { autoRefreshToken: false, persistSession: false, detectSessionInUrl: false },
  });

  const { count, error: countError } = await service
    .from("profiles")
    .select("id", { count: "exact", head: true })
    .like("email", "%@agartha.test");

  if (countError) {
    console.error("[FAIL] profile count query error:", countError.message);
    process.exit(1);
  }
  if (count !== EXPECTED_PROFILE_COUNT) {
    console.error(
      `[FAIL] expected ${EXPECTED_PROFILE_COUNT} @agartha.test profiles, found ${count}`,
    );
    process.exit(1);
  }
  console.info(`[PASS] public.profiles rows WHERE email LIKE '%@agartha.test' = ${count}`);
}

main().catch((err) => {
  console.error("[FAIL] unhandled error:", err);
  process.exit(1);
});
