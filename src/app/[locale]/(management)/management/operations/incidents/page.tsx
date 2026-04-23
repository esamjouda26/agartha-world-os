import type { Metadata } from "next";
import { redirect } from "next/navigation";

import { IncidentLogPage } from "@/components/shared/incident-log-page";
import type { IncidentGroupKey } from "@/features/incidents/constants";
import { listIncidents } from "@/features/incidents/queries/list-incidents";
import { listZoneOptions } from "@/features/incidents/queries/list-zones";
import { createSupabaseServerClient } from "@/lib/supabase/server";

/**
 * `/management/operations/incidents` — Pattern C route wrapper.
 * Operations view: safety / medical / security / guest / other groups.
 * Gate-5 on `ops:c` per `src/features/incidents/rbac.ts`.
 */
export const dynamic = "force-dynamic";
export const revalidate = 0;

export const metadata: Metadata = {
  title: "Incidents · Operations",
  description: "Triage and resolve operational incidents.",
};

const OPS_GROUPS: readonly IncidentGroupKey[] = ["safety", "medical", "security", "guest", "other"];

export default async function OperationsIncidentsPage({
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
    listIncidents({ userId: user.id, allowedGroups: OPS_GROUPS, ownOnly: false }),
    listZoneOptions(),
  ]);

  return (
    <IncidentLogPage
      canResolve={canResolve}
      allowedCategories={OPS_GROUPS}
      incidents={incidents}
      zones={zones}
    />
  );
}
