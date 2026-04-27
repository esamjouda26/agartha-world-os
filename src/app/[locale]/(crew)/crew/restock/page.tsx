import type { Metadata } from "next";
import { redirect } from "next/navigation";

import { createSupabaseServerClient } from "@/lib/supabase/server";
import { getRestockContext } from "@/features/inventory/queries/get-restock-context";
import { RestockView } from "@/features/inventory/components/restock-view";

export const dynamic = "force-dynamic";

export async function generateMetadata(): Promise<Metadata> {
  return {
    title: "Restock",
    description: "Request or perform material restocking operations.",
  };
}

export default async function CrewRestockPage({
  params,
}: Readonly<{ params: Promise<{ locale: string }> }>) {
  const { locale } = await params;

  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect(`/${locale}/auth/login`);

  const appMetadata = (user.app_metadata ?? {}) as {
    domains?: Record<string, readonly string[]>;
  };
  const isRunner = appMetadata.domains?.["inventory_ops"]?.includes("u") ?? false;

  const context = await getRestockContext(supabase, user.id, isRunner);

  return <RestockView context={context} />;
}
