import type { Metadata } from "next";
import { redirect } from "next/navigation";

import { DomainAuditTable } from "@/components/shared/domain-audit-table";
import { listAuditLog } from "@/features/audit/queries/list-audit-log";
import { listStaffForAuditFilter } from "@/features/audit/queries/list-staff-for-filter";
import { resolveAllowedEntityTypes } from "@/features/audit/queries/resolve-allowed-entity-types";
import { auditFiltersSchema } from "@/features/audit/schemas/filters";
import { createSupabaseServerClient } from "@/lib/supabase/server";

/**
 * `/admin/audit` — Pattern C route wrapper. Admins see every
 * entity_type (they hold every domain in the seed).
 */
export const dynamic = "force-dynamic";
export const revalidate = 0;

export const metadata: Metadata = {
  title: "Audit log · Admin",
  description: "Every change to auditable records — field-level diff + who did it.",
};

type SearchParams = Promise<Record<string, string | string[] | undefined>>;

function stringOnly(v: string | string[] | undefined): string | undefined {
  return typeof v === "string" ? v : undefined;
}

export default async function AdminAuditPage({
  params,
  searchParams,
}: Readonly<{ params: Promise<{ locale: string }>; searchParams: SearchParams }>) {
  const [{ locale }, sp] = await Promise.all([params, searchParams]);

  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect(`/${locale}/auth/login`);

  const appMeta = (user.app_metadata ?? {}) as { domains?: Record<string, readonly string[]> };
  const allowedEntityTypes = resolveAllowedEntityTypes({ domains: appMeta.domains });

  const pageSizeRaw = stringOnly(sp.pageSize);
  const pageSizeNumber = pageSizeRaw ? Number(pageSizeRaw) : undefined;

  // Narrow URL params through the schema — invalid values silently drop
  // so a malformed URL doesn't 500 the page.
  const filters = auditFiltersSchema.parse({
    entityType: stringOnly(sp.entityType),
    action: stringOnly(sp.action),
    entityId: stringOnly(sp.entityId),
    performedBy: stringOnly(sp.performedBy),
    preset: stringOnly(sp.preset),
    from: stringOnly(sp.from),
    to: stringOnly(sp.to),
    cursor: stringOnly(sp.cursor),
    pageSize: pageSizeNumber,
  });

  const [page, staff] = await Promise.all([
    listAuditLog({ allowedEntityTypes, filters }),
    listStaffForAuditFilter(),
  ]);

  return <DomainAuditTable allowedEntityTypes={allowedEntityTypes} page={page} staff={staff} />;
}
