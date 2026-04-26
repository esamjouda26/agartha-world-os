import type { Metadata } from "next";

import { createSupabaseServerClient } from "@/lib/supabase/server";
import { getWriteOffsList } from "@/features/inventory/queries/get-write-offs-list";
import { WriteOffsListView } from "@/features/inventory/components/write-offs-list-view";
import {
  DISPOSAL_REASON_OPTIONS,
  WRITE_OFFS_DEFAULT_PAGE_SIZE,
  WRITE_OFFS_PAGE_SIZE_OPTIONS,
} from "@/features/inventory/constants";
import type {
  DisposalReason,
  WriteOffReviewedFilter,
} from "@/features/inventory/types";

export const dynamic = "force-dynamic";
export const revalidate = 0;

export async function generateMetadata(): Promise<Metadata> {
  return {
    title: "Write-Offs · Inventory",
    description:
      "Review crew-submitted disposal records and mark them as reviewed.",
  };
}

type SearchParams = Readonly<{
  reviewed?: string;
  reason?: string;
  material?: string;
  location?: string;
  from?: string;
  to?: string;
  cursor?: string;
  pageSize?: string;
}>;

const REVIEWED_VALUES: ReadonlyArray<WriteOffReviewedFilter> = [
  "unreviewed",
  "reviewed",
  "all",
];

const REASON_VALUES = DISPOSAL_REASON_OPTIONS.map((o) => o.value);

function parseReviewed(input: string | undefined): WriteOffReviewedFilter {
  return REVIEWED_VALUES.includes(input as WriteOffReviewedFilter)
    ? (input as WriteOffReviewedFilter)
    : "unreviewed";
}

function parseReason(input: string | undefined): DisposalReason | null {
  return REASON_VALUES.includes(input as DisposalReason)
    ? (input as DisposalReason)
    : null;
}

function parsePageSize(input: string | undefined): number {
  if (!input) return WRITE_OFFS_DEFAULT_PAGE_SIZE;
  const n = Number.parseInt(input, 10);
  return WRITE_OFFS_PAGE_SIZE_OPTIONS.includes(n as 25 | 50 | 100)
    ? n
    : WRITE_OFFS_DEFAULT_PAGE_SIZE;
}

const ISO_DATE = /^\d{4}-\d{2}-\d{2}$/;
function parseIsoDate(input: string | undefined): string | null {
  return input && ISO_DATE.test(input) ? input : null;
}

export default async function ManagementInventoryWriteOffsPage({
  searchParams,
}: Readonly<{ searchParams: Promise<SearchParams> }>) {
  const sp = await searchParams;
  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  // Middleware Gate 5 enforces inventory_ops:r OR pos:r (additionalDomains
  // OR pattern). Fine-grained "Mark reviewed" CTA gates on :u for either
  // domain.
  const appMeta = (user?.app_metadata ?? {}) as {
    domains?: Record<string, readonly string[]>;
  };
  const canReview =
    (appMeta.domains?.inventory_ops?.includes("u") ?? false) ||
    (appMeta.domains?.pos?.includes("u") ?? false);

  const data = await getWriteOffsList(supabase, {
    reviewedFilter: parseReviewed(sp.reviewed),
    reasonFilter: parseReason(sp.reason),
    materialFilter: sp.material ?? null,
    locationFilter: sp.location ?? null,
    fromDate: parseIsoDate(sp.from),
    toDate: parseIsoDate(sp.to),
    cursor: sp.cursor ?? null,
    pageSize: parsePageSize(sp.pageSize),
  });

  return <WriteOffsListView data={data} canReview={canReview} />;
}
