import type { Metadata } from "next";
import { redirect } from "next/navigation";

import { createSupabaseServerClient } from "@/lib/supabase/server";
import { getRestockQueue } from "@/features/inventory/queries/get-restock-queue";
import { RestockQueueView } from "@/features/inventory/components/restock-queue-view";

export const dynamic = "force-dynamic";

export async function generateMetadata(): Promise<Metadata> {
  return {
    title: "Restock Queue",
    description: "Pick and fulfil pending restock requisitions.",
  };
}

export default async function CrewRestockQueuePage({
  params,
}: Readonly<{ params: Promise<{ locale: string }> }>) {
  const { locale } = await params;

  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect(`/${locale}/auth/login`);

  const queue = await getRestockQueue(supabase, user.id);

  return <RestockQueueView initialQueue={queue} />;
}
