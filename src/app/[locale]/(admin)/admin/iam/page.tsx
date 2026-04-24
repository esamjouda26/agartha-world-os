import type { Metadata } from "next";

import { createSupabaseServerClient } from "@/lib/supabase/server";
import { getIamLedger } from "@/features/iam/queries/get-iam-ledger";
import { IamLedgerView } from "@/features/iam/components/iam-ledger-view";

export const dynamic = "force-dynamic";
export const revalidate = 0;

export const metadata: Metadata = {
  title: "IAM Requests | Admin",
  description:
    "Review and process identity & access management provisioning, transfer, and termination requests.",
};

/**
 * `/admin/iam` — IAM Ledger (Pattern C: RSC data → client leaf).
 *
 * Fetches IAM requests with staff + role joins, computes KPIs and
 * status tab counts, then renders the IamLedgerView client leaf.
 * Write access (`canWrite`) is derived from the user's `hr:u` permission.
 */
export default async function AdminIamPage() {
  const supabase = await createSupabaseServerClient();

  // Parallel: fetch data + check write permission
  const [
    data,
    {
      data: { user },
    },
  ] = await Promise.all([getIamLedger(supabase), supabase.auth.getUser()]);

  const appMeta = (user?.app_metadata ?? {}) as {
    domains?: Record<string, string[]>;
  };
  const canWrite = (appMeta.domains?.hr ?? []).includes("u");

  return <IamLedgerView data={data} canWrite={canWrite} />;
}
