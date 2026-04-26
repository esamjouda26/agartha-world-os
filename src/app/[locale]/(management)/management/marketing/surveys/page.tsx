import type { Metadata } from "next";

import { createSupabaseServerClient } from "@/lib/supabase/server";
import { getSurveysData } from "@/features/marketing/queries/get-surveys-data";
import { SurveysView } from "@/features/marketing/components/surveys-view";

export const dynamic = "force-dynamic";
export const revalidate = 0;

export async function generateMetadata(): Promise<Metadata> {
  return {
    title: "Survey Analytics · Marketing",
    description: "Guest sentiment, NPS, and crew-captured feedback.",
  };
}

type SearchParams = Readonly<{
  tab?: string;
  type?: string;
  source?: string;
  sentiment?: string;
  q?: string;
  from?: string;
  to?: string;
}>;

const ISO_DATE = /^\d{4}-\d{2}-\d{2}$/u;
function parseIsoDate(input: string | undefined): string | null {
  return input && ISO_DATE.test(input) ? input : null;
}

export default async function ManagementMarketingSurveysPage({
  searchParams,
}: Readonly<{ searchParams: Promise<SearchParams> }>) {
  const sp = await searchParams;
  const supabase = await createSupabaseServerClient();

  const data = await getSurveysData(supabase, {
    from: parseIsoDate(sp.from),
    to: parseIsoDate(sp.to),
  });

  return <SurveysView data={data} />;
}
