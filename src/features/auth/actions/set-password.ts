"use server";

import "server-only";

import { fail, ok, type ServerActionResult } from "@/lib/errors";
import { loggerWith } from "@/lib/logger";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { setPasswordSchema, type SetPasswordInput } from "@/features/auth/schemas/login.schema";

type SetPasswordData = Readonly<{ passwordSet: true }>;

export async function setPasswordAction(
  input: SetPasswordInput,
): Promise<ServerActionResult<SetPasswordData>> {
  const log = loggerWith({ feature: "auth", event: "set-password" });

  const parsed = setPasswordSchema.safeParse(input);
  if (!parsed.success) {
    const fields: Record<string, string> = {};
    for (const issue of parsed.error.issues) {
      const path = issue.path[0];
      if (typeof path === "string") fields[path] = issue.message;
    }
    return fail("VALIDATION_FAILED", fields);
  }

  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return fail("UNAUTHENTICATED");

  const { error: updateError } = await supabase.auth.updateUser({
    password: parsed.data.newPassword,
  });
  if (updateError) {
    log.error({ userId: user.id, err: updateError.message }, "updateUser failed");
    return fail("INTERNAL");
  }

  // Call rpc_confirm_password_set — init_schema.sql:5780-5791. Grant is
  // `authenticated`; schema-qualified + SECURITY DEFINER.
  const { error: rpcError } = await supabase.rpc("rpc_confirm_password_set");
  if (rpcError) {
    log.error({ userId: user.id, err: rpcError.message }, "rpc_confirm_password_set failed");
    return fail("INTERNAL");
  }

  log.info({ userId: user.id }, "password set");
  return ok({ passwordSet: true });
}
