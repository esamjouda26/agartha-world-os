import type { Metadata } from "next";
import { redirect } from "next/navigation";

import { IncidentLogPage } from "@/components/shared/incident-log-page";
import type { IncidentGroupKey } from "@/features/incidents/constants";
import { listIncidents } from "@/features/incidents/queries/list-incidents";
import { listZoneOptions } from "@/features/incidents/queries/list-zones";
import { createSupabaseServerClient } from "@/lib/supabase/server";

/**
 * `/crew/incidents` — Pattern C route wrapper.
 * Crew can report across all 7 groups and see their own reports only.
 * `canResolve=false` hides every manager action.
 */
export const dynamic = "force-dynamic";
export const revalidate = 0;

export const metadata: Metadata = {
  title: "Incidents",
  description: "Report incidents and review your own reports.",
};

const ALL_GROUPS: readonly IncidentGroupKey[] = [
  "safety",
  "medical",
  "security",
  "guest",
  "structural",
  "equipment",
  "other",
];

export default async function CrewIncidentsPage({
  params,
}: Readonly<{ params: Promise<{ locale: string }> }>) {
  const { locale } = await params;
  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect(`/${locale}/auth/login`);

  const [incidents, zones] = await Promise.all([
    listIncidents({ userId: user.id, allowedGroups: ALL_GROUPS, ownOnly: true }),
    listZoneOptions(),
  ]);

  return (
    <IncidentLogPage
      canResolve={false}
      allowedCategories={ALL_GROUPS}
      incidents={incidents}
      zones={zones}
    />
  );
}
