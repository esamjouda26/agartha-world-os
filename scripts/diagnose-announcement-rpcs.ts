#!/usr/bin/env tsx
/**
 * Diagnostic: probe the 4 announcement RPCs via the service-role client
 * and print the Postgres error code for each. If one returns `42883`
 * (undefined_function) we've located the runtime bug; any other code
 * (`42501` forbidden / `22023` validation / `P0002` not-found / null)
 * means the function exists and was reachable.
 *
 * Safe to re-run — every probe either short-circuits on a validation
 * branch or uses an arg shape that can't create real rows.
 */
import { createClient } from "@supabase/supabase-js";

const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!url || !serviceKey) {
  console.error("Set NEXT_PUBLIC_SUPABASE_URL + SUPABASE_SERVICE_ROLE_KEY before running.");
  process.exit(2);
}

const supabase = createClient(url, serviceKey);

async function probe(name: string, args: Record<string, unknown> | null): Promise<void> {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const call = args === null ? (supabase.rpc as any)(name) : (supabase.rpc as any)(name, args);
  const { data, error } = await call;
  if (error) {
    console.info(
      `${name}: error code=${error.code ?? "?"} message=${(error.message ?? "").slice(0, 160)}`,
    );
  } else {
    console.info(`${name}: ok data=${JSON.stringify(data).slice(0, 160)}`);
  }
}

async function main(): Promise<void> {
  await probe("rpc_get_unread_announcement_count", null);
  await probe("rpc_mark_all_visible_announcements_read", null);
  await probe("rpc_create_announcement", {
    p_title: "diagnostic",
    p_content: "probe",
    p_is_published: false,
    p_expires_at: null,
    p_targets: [{ target_type: "global" }],
  });
  await probe("rpc_update_announcement", {
    p_announcement_id: "00000000-0000-0000-0000-000000000000",
    p_title: "diagnostic",
    p_content: "probe",
    p_is_published: false,
    p_expires_at: null,
    p_targets: [{ target_type: "global" }],
  });
  await probe("get_visible_announcements", { p_unread_only: false });
}

main().catch((e) => {
  console.error("FATAL:", e);
  process.exit(1);
});
