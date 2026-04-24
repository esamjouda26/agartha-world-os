"use client";

import * as React from "react";
import { useForm, FormProvider } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";

import { FormSheet } from "@/components/shared/form-sheet";
import { FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { toastSuccess, toastError } from "@/components/ui/toast-helpers";
import { useServerErrors } from "@/hooks/use-server-errors";
import type { ServerActionResult } from "@/lib/errors";
import { createDevice } from "@/features/devices/actions/create-device";
import { createDeviceSchema, type CreateDeviceInput } from "@/features/devices/schemas/device";
import type {
  DeviceTypeOption,
  ZoneOption,
  VendorOption,
  VlanOption,
} from "@/features/devices/types/device";

// ── Server error bridge ────────────────────────────────────────────────

/** Must render inside <FormProvider>. Applies field errors from server response. */
function ServerErrorBridge({
  result,
}: Readonly<{ result: ServerActionResult<unknown> | undefined }>) {
  useServerErrors(result);
  return null;
}

// ── Props ──────────────────────────────────────────────────────────────

type DeviceCreateFormProps = Readonly<{
  open: boolean;
  onOpenChange: (open: boolean) => void;
  deviceTypes: ReadonlyArray<DeviceTypeOption>;
  zones: ReadonlyArray<ZoneOption>;
  vendors: ReadonlyArray<VendorOption>;
  vlans: ReadonlyArray<VlanOption>;
}>;

// ── Component ──────────────────────────────────────────────────────────

export function DeviceCreateForm({
  open,
  onOpenChange,
  deviceTypes,
  zones,
  vendors,
  vlans,
}: DeviceCreateFormProps) {
  const [isPending, startTransition] = React.useTransition();
  const [serverResult, setServerResult] = React.useState<ServerActionResult<unknown> | undefined>(
    undefined,
  );

  const form = useForm<CreateDeviceInput>({
    resolver: zodResolver(createDeviceSchema),
    defaultValues: {
      name: "",
      deviceTypeId: "",
      serialNumber: "",
      assetTag: "",
      manufacturer: "",
      model: "",
      firmwareVersion: "",
      ipAddress: "",
      macAddress: "",
      commissionDate: "",
      warrantyExpiry: "",
    },
  });

  function handleClose(nextOpen: boolean) {
    if (!nextOpen) {
      form.reset();
      setServerResult(undefined);
    }
    onOpenChange(nextOpen);
  }

  const onSubmit = form.handleSubmit((values) => {
    startTransition(async () => {
      const result = await createDevice(values);
      setServerResult(result);
      if (result.success) {
        toastSuccess("Device registered");
        form.reset();
        setServerResult(undefined);
        onOpenChange(false);
      } else {
        toastError(result);
      }
    });
  });

  return (
    <FormSheet
      open={open}
      onOpenChange={handleClose}
      title="Register Device"
      description="Add a new device to the IT registry."
      formId="device-create-form"
      submitLabel="Register"
      pending={isPending}
      width="lg"
      data-testid="device-create-sheet"
    >
      <FormProvider {...form}>
        <ServerErrorBridge result={serverResult} />
        <form
          id="device-create-form"
          onSubmit={onSubmit}
          className="flex flex-col gap-4"
          noValidate
        >
          {/* Name */}
          <FormField
            control={form.control}
            name="name"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Name *</FormLabel>
                <FormControl>
                  <Input
                    {...field}
                    placeholder="e.g. Router-WAN-01"
                    data-testid="device-create-name"
                    disabled={isPending}
                  />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

          {/* Device Type */}
          <FormField
            control={form.control}
            name="deviceTypeId"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Device Type *</FormLabel>
                <Select value={field.value} onValueChange={field.onChange} disabled={isPending}>
                  <FormControl>
                    <SelectTrigger data-testid="device-create-type">
                      <SelectValue placeholder="Select type" />
                    </SelectTrigger>
                  </FormControl>
                  <SelectContent>
                    {deviceTypes.map((dt) => (
                      <SelectItem key={dt.id} value={dt.id}>
                        {dt.displayName}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <FormMessage />
              </FormItem>
            )}
          />

          {/* Zone */}
          <FormField
            control={form.control}
            name="zoneId"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Zone</FormLabel>
                <Select
                  value={field.value ?? "none"}
                  onValueChange={(v) => field.onChange(v === "none" ? undefined : v)}
                  disabled={isPending}
                >
                  <FormControl>
                    <SelectTrigger data-testid="device-create-zone">
                      <SelectValue placeholder="Unzoned" />
                    </SelectTrigger>
                  </FormControl>
                  <SelectContent>
                    <SelectItem value="none">None</SelectItem>
                    {zones.map((z) => (
                      <SelectItem key={z.id} value={z.id}>
                        {z.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <FormMessage />
              </FormItem>
            )}
          />

          {/* Serial / Asset tag */}
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <FormField
              control={form.control}
              name="serialNumber"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Serial Number</FormLabel>
                  <FormControl>
                    <Input
                      {...field}
                      placeholder="SN-XXXXXXXX"
                      data-testid="device-create-serial"
                      disabled={isPending}
                    />
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
                    <Input
                      {...field}
                      placeholder="TAG-XXXXXXXX"
                      data-testid="device-create-asset-tag"
                      disabled={isPending}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
          </div>

          {/* Manufacturer / Model */}
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
                      placeholder="e.g. Cisco"
                      data-testid="device-create-manufacturer"
                      disabled={isPending}
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
                    <Input
                      {...field}
                      placeholder="e.g. ISR4351"
                      data-testid="device-create-model"
                      disabled={isPending}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
          </div>

          {/* IP / MAC */}
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <FormField
              control={form.control}
              name="ipAddress"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>IP Address</FormLabel>
                  <FormControl>
                    <Input
                      {...field}
                      placeholder="192.168.1.1"
                      data-testid="device-create-ip"
                      disabled={isPending}
                    />
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
                    <Input
                      {...field}
                      placeholder="aa:bb:cc:dd:ee:ff"
                      data-testid="device-create-mac"
                      disabled={isPending}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
          </div>

          {/* VLAN */}
          <FormField
            control={form.control}
            name="vlanId"
            render={({ field }) => (
              <FormItem>
                <FormLabel>VLAN</FormLabel>
                <Select
                  value={field.value != null ? String(field.value) : "none"}
                  onValueChange={(v) => field.onChange(v === "none" ? undefined : Number(v))}
                  disabled={isPending}
                >
                  <FormControl>
                    <SelectTrigger data-testid="device-create-vlan">
                      <SelectValue placeholder="No VLAN" />
                    </SelectTrigger>
                  </FormControl>
                  <SelectContent>
                    <SelectItem value="none">None</SelectItem>
                    {vlans.map((v) => (
                      <SelectItem key={v.vlanId} value={String(v.vlanId)}>
                        VLAN {v.vlanId} — {v.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <FormMessage />
              </FormItem>
            )}
          />

          {/* Firmware */}
          <FormField
            control={form.control}
            name="firmwareVersion"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Firmware Version</FormLabel>
                <FormControl>
                  <Input
                    {...field}
                    placeholder="e.g. 16.9.4"
                    data-testid="device-create-firmware"
                    disabled={isPending}
                  />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

          {/* Dates */}
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
                      data-testid="device-create-commission-date"
                      disabled={isPending}
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
                      data-testid="device-create-warranty"
                      disabled={isPending}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
          </div>

          {/* Maintenance Vendor */}
          <FormField
            control={form.control}
            name="maintenanceVendorId"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Maintenance Vendor</FormLabel>
                <Select
                  value={field.value ?? "none"}
                  onValueChange={(v) => field.onChange(v === "none" ? undefined : v)}
                  disabled={isPending}
                >
                  <FormControl>
                    <SelectTrigger data-testid="device-create-vendor">
                      <SelectValue placeholder="No vendor" />
                    </SelectTrigger>
                  </FormControl>
                  <SelectContent>
                    <SelectItem value="none">None</SelectItem>
                    {vendors.map((v) => (
                      <SelectItem key={v.id} value={v.id}>
                        {v.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <FormMessage />
              </FormItem>
            )}
          />
        </form>
      </FormProvider>
    </FormSheet>
  );
}
