import type { Metadata } from "next";

import { createSupabaseServerClient } from "@/lib/supabase/server";
import { getMovementsLedger } from "@/features/inventory/queries/get-movements-ledger";
import { getMovementTypesList } from "@/features/inventory/queries/get-movement-types-list";
import { MovementsView } from "@/features/inventory/components/movements-view";
import {
  MOVEMENTS_LEDGER_DEFAULT_PAGE_SIZE,
  MOVEMENTS_LEDGER_PAGE_SIZE_OPTIONS,
} from "@/features/inventory/constants";

export const dynamic = "force-dynamic";
export const revalidate = 0;

export async function generateMetadata(): Promise<Metadata> {
  return {
    title: "Goods Movements · Inventory",
    description:
      "Read-only ledger of every stock movement and the movement-type reference catalog.",
  };
}

type SearchParams = Readonly<{
  tab?: string;
  movementType?: string;
  material?: string;
  location?: string;
  from?: string;
  to?: string;
  cursor?: string;
  pageSize?: string;
}>;

const ISO_DATE = /^\d{4}-\d{2}-\d{2}$/;
function parseIsoDate(input: string | undefined): string | null {
  return input && ISO_DATE.test(input) ? input : null;
}
function parsePageSize(input: string | undefined): number {
  if (!input) return MOVEMENTS_LEDGER_DEFAULT_PAGE_SIZE;
  const n = Number.parseInt(input, 10);
  return MOVEMENTS_LEDGER_PAGE_SIZE_OPTIONS.includes(n as 25 | 50 | 100)
    ? n
    : MOVEMENTS_LEDGER_DEFAULT_PAGE_SIZE;
}

export default async function ManagementInventoryMovementsPage({
  searchParams,
}: Readonly<{ searchParams: Promise<SearchParams> }>) {
  const sp = await searchParams;
  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  // Middleware Gate 5 enforces inventory_ops:r. Movement-type CRUD
  // gates separately on `inventory:c|u` (master-data domain, not
  // inventory_ops).
  const appMeta = (user?.app_metadata ?? {}) as {
    domains?: Record<string, readonly string[]>;
  };
  const canCreateType = appMeta.domains?.inventory?.includes("c") ?? false;
  const canUpdateType = appMeta.domains?.inventory?.includes("u") ?? false;

  const [ledger, catalog] = await Promise.all([
    getMovementsLedger(supabase, {
      movementTypeId: sp.movementType ?? null,
      materialId: sp.material ?? null,
      locationId: sp.location ?? null,
      fromDate: parseIsoDate(sp.from),
      toDate: parseIsoDate(sp.to),
      cursor: sp.cursor ?? null,
      pageSize: parsePageSize(sp.pageSize),
    }),
    getMovementTypesList(supabase),
  ]);

  return (
    <MovementsView
      ledger={ledger}
      catalog={catalog}
      canCreateType={canCreateType}
      canUpdateType={canUpdateType}
    />
  );
}
