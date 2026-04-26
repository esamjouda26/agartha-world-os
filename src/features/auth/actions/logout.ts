"use server";

import "server-only";

import { createSupabaseServerClient } from "@/lib/supabase/server";
import { fail, ok, type ServerActionResult } from "@/lib/errors";

export async function logoutAction(): Promise<ServerActionResult<void>> {
  const supabase = await createSupabaseServerClient();
  const { error } = await supabase.auth.signOut();

  if (error) {
    return fail("INTERNAL");
  }

  return ok(undefined);
}
