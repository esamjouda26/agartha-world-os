"use client";

import * as React from "react";
import { useRouter } from "@/i18n/navigation";
import { PlusCircle } from "lucide-react";

import { DetailPageShell } from "@/components/shared/detail-page-shell";
import { StatusBadge } from "@/components/ui/status-badge";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";

import { DeviceInfoCard } from "@/features/devices/components/device-info-card";
import { HeartbeatTimeline } from "@/features/devices/components/heartbeat-timeline";
import { MaintenanceOrderList } from "@/features/devices/components/maintenance-order-list";
import type { DeviceDetailData } from "@/features/devices/types/device-detail";

type DeviceDetailViewProps = Readonly<{
  data: DeviceDetailData;
  canEdit: boolean;
}>;

export function DeviceDetailView({ data, canEdit }: DeviceDetailViewProps) {
  const router = useRouter();
  const { device, heartbeats, maintenanceOrders } = data;

  return (
    <DetailPageShell
      data-testid="device-detail"
      breadcrumb={[
        { label: "Device Registry", href: "/admin/devices" as never },
        { label: device.name, current: true },
      ]}
      header={{
        eyebrow: "IT · Device",
        title: device.name,
        status: (
          <div className="flex items-center gap-2">
            <StatusBadge status={device.status} data-testid="device-detail-status" />
            <Badge variant="secondary" className="font-mono text-xs">
              {device.deviceTypeName}
            </Badge>
          </div>
        ),
        primaryAction: (
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={() =>
              router.push(`/management/maintenance/orders?target_ci_id=${device.id}` as never)
            }
            data-testid="device-create-wo"
          >
            <PlusCircle className="mr-1.5 size-4" aria-hidden />
            Create Work Order
          </Button>
        ),
        "data-testid": "device-detail-header",
      }}
    >
      {/* Device metadata + inline edit */}
      <DeviceInfoCard device={device} canEdit={canEdit} />

      {/* Heartbeat timeline */}
      <HeartbeatTimeline heartbeats={heartbeats} />

      {/* Maintenance history */}
      <MaintenanceOrderList orders={maintenanceOrders} />
    </DetailPageShell>
  );
}
