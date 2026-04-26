import type { Metadata } from "next";
import { redirect } from "next/navigation";

import { createSupabaseServerClient } from "@/lib/supabase/server";
import { getZoneTelemetry } from "@/features/operations/queries/get-zone-telemetry";
import { ZoneTelemetryView } from "@/features/operations/components/zone-telemetry-view";

export const dynamic = "force-dynamic";
export const revalidate = 0;

export const metadata: Metadata = {
  title: "Zone Telemetry · Operations",
  description:
    "Real-time zone occupancy dashboard — guest counts, staff positions, and environmental readings.",
};

/**
 * `/management/operations/telemetry` — Pattern C route wrapper.
 *
 * Read-only dashboard. Gate on `ops:r` per frontend_spec §3e.
 * Supabase Realtime deferred — managers refresh periodically.
 */
export default async function OperationsTelemetryPage({
  params,
}: Readonly<{ params: Promise<{ locale: string }> }>) {
  const { locale } = await params;
  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect(`/${locale}/auth/login`);

  // RBAC: ops:r required
  const appMeta = (user.app_metadata ?? {}) as { domains?: Record<string, string[]> };
  const opsAccess = appMeta.domains?.ops ?? [];
  if (!opsAccess.includes("r")) redirect(`/${locale}/management`);

  const data = await getZoneTelemetry();

  return <ZoneTelemetryView data={data} />;
}
