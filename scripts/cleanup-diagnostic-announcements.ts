#!/usr/bin/env tsx
/**
 * One-shot cleanup: remove the `title = 'diagnostic'` rows that the
 * `diagnose-announcement-rpcs.ts` script inserted into the cloud DB.
 * Safe to re-run; it only targets rows whose content also matches.
 */
import { createClient } from "@supabase/supabase-js";

const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!url || !serviceKey) {
  console.error("Set NEXT_PUBLIC_SUPABASE_URL + SUPABASE_SERVICE_ROLE_KEY before running.");
  process.exit(2);
}

const supabase = createClient(url, serviceKey);

async function main(): Promise<void> {
  const { data, error } = await supabase
    .from("announcements")
    .delete({ count: "exact" })
    .eq("title", "diagnostic")
    .eq("content", "probe")
    .select("id");
  if (error) {
    console.error("FAIL:", error);
    process.exit(1);
  }
  console.info(`Removed ${data?.length ?? 0} diagnostic row(s).`);
}

main().catch((e) => {
  console.error("FATAL:", e);
  process.exit(1);
});
