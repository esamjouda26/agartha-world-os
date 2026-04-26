import type { Metadata } from "next";

import { createSupabaseServerClient } from "@/lib/supabase/server";
import { getMaterialCategoriesPage } from "@/features/procurement/queries/get-categories-page";
import { MaterialCategoriesPage } from "@/components/shared/material-categories-page";

export const dynamic = "force-dynamic";
export const revalidate = 0;

export async function generateMetadata(): Promise<Metadata> {
  return {
    title: "Material Categories",
    description:
      "Hierarchical material category tree shared by procurement and POS catalogs.",
  };
}

export default async function ManagementCategoriesPage() {
  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  // Middleware Gate 5 ensures the user holds procurement:c OR pos:c.
  // Page-level fine-grained checks for write + junction-assign:
  const appMeta = (user?.app_metadata ?? {}) as {
    domains?: Record<string, readonly string[]>;
  };
  const procC = appMeta.domains?.procurement?.includes("c") ?? false;
  const posC = appMeta.domains?.pos?.includes("c") ?? false;
  const procU = appMeta.domains?.procurement?.includes("u") ?? false;
  const posU = appMeta.domains?.pos?.includes("u") ?? false;
  const canWrite = procC || posC || procU || posU;
  const canAssignLocations = appMeta.domains?.system?.includes("c") ?? false;

  const data = await getMaterialCategoriesPage(supabase);

  return (
    <MaterialCategoriesPage
      data={data}
      canWrite={canWrite}
      canAssignLocations={canAssignLocations}
    />
  );
}
