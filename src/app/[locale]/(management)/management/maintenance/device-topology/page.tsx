import type { Metadata } from "next";
import type { Route } from "next";

import { DeviceTopologyPage } from "@/components/shared/device-topology-page";
import { getDeviceTopology } from "@/features/devices/queries/get-topology";
import { createSupabaseServerClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";
export const revalidate = 0;

export async function generateMetadata(): Promise<Metadata> {
  return {
    title: "Device Topology · Maintenance",
    description:
      "Hierarchical device tree organized by location, with linked maintenance vendors and open work orders.",
  };
}

export default async function ManagementMaintenanceDeviceTopologyPage() {
  const supabase = await createSupabaseServerClient();
  const data = await getDeviceTopology(supabase);

  return (
    <DeviceTopologyPage
      data={data}
      // Spec line 2766: device detail's "Create Work Order" deep-links to
      // /management/maintenance/orders with target_ci_id pre-filled.
      createWorkOrderHref={"/management/maintenance/orders" as Route}
      data-testid="maintenance-device-topology"
    />
  );
}
