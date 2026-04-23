import type { Metadata } from "next";
import { redirect } from "next/navigation";

import { IncidentLogPage } from "@/components/shared/incident-log-page";
import type { IncidentGroupKey } from "@/features/incidents/constants";
import { listIncidents } from "@/features/incidents/queries/list-incidents";
import { listZoneOptions } from "@/features/incidents/queries/list-zones";
import { createSupabaseServerClient } from "@/lib/supabase/server";

/**
 * `/management/maintenance/incidents` — Pattern C route wrapper.
 * Maintenance view: structural + equipment groups only. Same component
 * + interactions as the ops route; different `allowedCategories`.
 * Gate-5 on `ops:r`.
 */
export const dynamic = "force-dynamic";
export const revalidate = 0;

export const metadata: Metadata = {
  title: "Incidents · Maintenance",
  description: "Structural and equipment incidents routed to maintenance.",
};

const MAINT_GROUPS: readonly IncidentGroupKey[] = ["structural", "equipment"];

export default async function MaintenanceIncidentsPage({
  params,
}: Readonly<{ params: Promise<{ locale: string }> }>) {
  const { locale } = await params;
  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect(`/${locale}/auth/login`);

  const appMeta = (user.app_metadata ?? {}) as { domains?: Record<string, readonly string[]> };
  const canResolve = (appMeta.domains?.ops ?? []).includes("u");

  const [incidents, zones] = await Promise.all([
    listIncidents({ userId: user.id, allowedGroups: MAINT_GROUPS, ownOnly: false }),
    listZoneOptions(),
  ]);

  return (
    <IncidentLogPage
      canResolve={canResolve}
      allowedCategories={MAINT_GROUPS}
      incidents={incidents}
      zones={zones}
    />
  );
}
