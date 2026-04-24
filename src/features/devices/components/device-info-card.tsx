"use client";

import * as React from "react";
import { useForm, FormProvider } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Pencil } from "lucide-react";

import { SectionCard } from "@/components/ui/section-card";
import { Button } from "@/components/ui/button";
import { FormSheet } from "@/components/shared/form-sheet";
import { FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { toastSuccess, toastError } from "@/components/ui/toast-helpers";
import { useServerErrors } from "@/hooks/use-server-errors";
import type { ServerActionResult } from "@/lib/errors";
import { updateDevice } from "@/features/devices/actions/update-device";
import { updateDeviceSchema, type UpdateDeviceInput } from "@/features/devices/schemas/device";
import type { DeviceDetail } from "@/features/devices/types/device-detail";

function ServerErrorBridge({
  result,
}: Readonly<{ result: ServerActionResult<unknown> | undefined }>) {
  useServerErrors(result);
  return null;
}

type DeviceInfoCardProps = Readonly<{
  device: DeviceDetail;
  canEdit: boolean;
}>;

export function DeviceInfoCard({ device, canEdit }: DeviceInfoCardProps) {
  const [editOpen, setEditOpen] = React.useState(false);
  const [isPending, startTransition] = React.useTransition();
  const [serverResult, setServerResult] = React.useState<ServerActionResult<unknown> | undefined>(
    undefined,
  );

  const form = useForm<UpdateDeviceInput>({
    resolver: zodResolver(updateDeviceSchema),
    defaultValues: {
      id: device.id,
      name: device.name,
      deviceTypeId: device.deviceTypeId,
      serialNumber: device.serialNumber ?? "",
      assetTag: device.assetTag ?? "",
      manufacturer: device.manufacturer ?? "",
      model: device.model ?? "",
      firmwareVersion: device.firmwareVersion ?? "",
      ipAddress: device.ipAddress ?? "",
      macAddress: device.macAddress ?? "",
      commissionDate: device.commissionDate ?? "",
      warrantyExpiry: device.warrantyExpiry ?? "",
    },
  });

  const onSubmit = form.handleSubmit((values) => {
    startTransition(async () => {
      const result = await updateDevice(values);
      setServerResult(result);
      if (result.success) {
        toastSuccess("Device updated");
        setEditOpen(false);
        setServerResult(undefined);
      } else {
        toastError(result);
      }
    });
  });

  // ── Info rows ──────────────────────────────────────────────────────

  const rows: Array<{ label: string; value: string | null; testId: string }> = [
    { label: "Serial Number", value: device.serialNumber, testId: "device-info-serial" },
    { label: "Asset Tag", value: device.assetTag, testId: "device-info-asset-tag" },
    { label: "Manufacturer", value: device.manufacturer, testId: "device-info-manufacturer" },
    { label: "Model", value: device.model, testId: "device-info-model" },
    { label: "Firmware", value: device.firmwareVersion, testId: "device-info-firmware" },
    { label: "IP Address", value: device.ipAddress, testId: "device-info-ip" },
    { label: "MAC Address", value: device.macAddress, testId: "device-info-mac" },
    {
      label: "VLAN",
      value:
        device.vlanId != null
          ? `VLAN ${device.vlanId}${device.vlanName ? ` — ${device.vlanName}` : ""}`
          : null,
      testId: "device-info-vlan",
    },
    { label: "Zone", value: device.zoneName, testId: "device-info-zone" },
    { label: "Commission Date", value: device.commissionDate, testId: "device-info-commission" },
    { label: "Warranty Expiry", value: device.warrantyExpiry, testId: "device-info-warranty" },
  ];

  return (
    <>
      <SectionCard
        title="Device Information"
        description="Hardware identification and network configuration."
        action={
          canEdit ? (
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => setEditOpen(true)}
              data-testid="device-edit-open"
            >
              <Pencil className="mr-1.5 size-3.5" aria-hidden />
              Edit
            </Button>
          ) : undefined
        }
        data-testid="device-info-card"
      >
        <dl className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {rows.map(({ label, value, testId }) => (
            <div key={label} className="flex flex-col gap-0.5">
              <dt className="text-foreground-subtle text-xs font-medium tracking-wider uppercase">
                {label}
              </dt>
              <dd className="text-foreground font-mono text-sm" data-testid={testId}>
                {value ?? <span className="text-foreground-muted not-italic">—</span>}
              </dd>
            </div>
          ))}
        </dl>
      </SectionCard>

      {/* Edit sheet */}
      <FormSheet
        open={editOpen}
        onOpenChange={(next) => {
          if (!next) {
            form.reset();
            setServerResult(undefined);
          }
          setEditOpen(next);
        }}
        title="Edit Device"
        formId="device-edit-form"
        submitLabel="Save Changes"
        pending={isPending}
        width="lg"
        data-testid="device-edit-sheet"
      >
        <FormProvider {...form}>
          <ServerErrorBridge result={serverResult} />
          <form
            id="device-edit-form"
            onSubmit={onSubmit}
            className="flex flex-col gap-4"
            noValidate
          >
            <FormField
              control={form.control}
              name="name"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Name *</FormLabel>
                  <FormControl>
                    <Input {...field} disabled={isPending} data-testid="device-edit-name" />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <FormField
                control={form.control}
                name="serialNumber"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Serial Number</FormLabel>
                    <FormControl>
                      <Input {...field} disabled={isPending} data-testid="device-edit-serial" />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="assetTag"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Asset Tag</FormLabel>
                    <FormControl>
                      <Input {...field} disabled={isPending} data-testid="device-edit-asset-tag" />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <FormField
                control={form.control}
                name="manufacturer"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Manufacturer</FormLabel>
                    <FormControl>
                      <Input
                        {...field}
                        disabled={isPending}
                        data-testid="device-edit-manufacturer"
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="model"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Model</FormLabel>
                    <FormControl>
                      <Input {...field} disabled={isPending} data-testid="device-edit-model" />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <FormField
                control={form.control}
                name="ipAddress"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>IP Address</FormLabel>
                    <FormControl>
                      <Input {...field} disabled={isPending} data-testid="device-edit-ip" />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="macAddress"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>MAC Address</FormLabel>
                    <FormControl>
                      <Input {...field} disabled={isPending} data-testid="device-edit-mac" />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>
            <FormField
              control={form.control}
              name="firmwareVersion"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Firmware Version</FormLabel>
                  <FormControl>
                    <Input {...field} disabled={isPending} data-testid="device-edit-firmware" />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <FormField
                control={form.control}
                name="commissionDate"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Commission Date</FormLabel>
                    <FormControl>
                      <Input
                        {...field}
                        type="date"
                        disabled={isPending}
                        data-testid="device-edit-commission"
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="warrantyExpiry"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Warranty Expiry</FormLabel>
                    <FormControl>
                      <Input
                        {...field}
                        type="date"
                        disabled={isPending}
                        data-testid="device-edit-warranty"
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>
          </form>
        </FormProvider>
      </FormSheet>
    </>
  );
}
