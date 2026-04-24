"use client";

import * as React from "react";
import { useForm, FormProvider } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Plus } from "lucide-react";
import type { ColumnDef } from "@tanstack/react-table";

import { FilterableDataTable } from "@/components/shared/filterable-data-table";
import { FormSheet } from "@/components/shared/form-sheet";
import { FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
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
import { createZone, updateZone } from "@/features/zones/actions/manage-zone";
import {
  createZoneSchema,
  updateZoneSchema,
  type CreateZoneInput,
  type UpdateZoneInput,
} from "@/features/zones/schemas/zone";
import type { ZoneRow, LocationRow } from "@/features/zones/types/zone";

function ServerErrorBridge({
  result,
}: Readonly<{ result: ServerActionResult<unknown> | undefined }>) {
  useServerErrors(result);
  return null;
}

type ZoneTableProps = Readonly<{
  zones: ReadonlyArray<ZoneRow>;
  locations: ReadonlyArray<LocationRow>;
  canWrite: boolean;
}>;

const BASE_COLUMNS: ColumnDef<ZoneRow, unknown>[] = [
  {
    id: "name",
    accessorKey: "name",
    header: "Name",
    cell: ({ row }) => <span className="text-foreground font-medium">{row.original.name}</span>,
  },
  {
    id: "locationName",
    accessorKey: "locationName",
    header: "Location",
    cell: ({ row }) => (
      <span className="text-foreground-subtle text-sm">{row.original.locationName}</span>
    ),
  },
  {
    id: "capacity",
    accessorKey: "capacity",
    header: "Capacity",
    cell: ({ row }) => (
      <span className="text-foreground-subtle text-sm tabular-nums">{row.original.capacity}</span>
    ),
    meta: { headerClassName: "w-0 whitespace-nowrap", cellClassName: "w-0 whitespace-nowrap" },
  },
  {
    id: "isActive",
    accessorKey: "isActive",
    header: "Status",
    cell: ({ row }) => (
      <Badge variant={row.original.isActive ? "default" : "secondary"}>
        {row.original.isActive ? "Active" : "Inactive"}
      </Badge>
    ),
    meta: { headerClassName: "w-0 whitespace-nowrap", cellClassName: "w-0 whitespace-nowrap" },
  },
];

export function ZoneTable({ zones, locations, canWrite }: ZoneTableProps) {
  const [createOpen, setCreateOpen] = React.useState(false);
  const [editTarget, setEditTarget] = React.useState<ZoneRow | null>(null);

  const columns = React.useMemo<ColumnDef<ZoneRow, unknown>[]>(() => {
    if (!canWrite) return BASE_COLUMNS;
    return [
      ...BASE_COLUMNS,
      {
        id: "actions",
        header: "",
        cell: ({ row }) => (
          <Button
            type="button"
            variant="ghost"
            size="sm"
            onClick={(e) => {
              e.stopPropagation();
              setEditTarget(row.original);
            }}
            data-testid={`zone-edit-${row.original.id}`}
          >
            Edit
          </Button>
        ),
        meta: { headerClassName: "w-0", cellClassName: "w-0" },
      },
    ];
  }, [canWrite]);

  return (
    <>
      <FilterableDataTable
        data-testid="zone-table"
        toolbar={
          canWrite ? (
            <div className="flex justify-end">
              <Button
                type="button"
                size="sm"
                onClick={() => setCreateOpen(true)}
                data-testid="zone-create-open"
              >
                <Plus className="mr-1.5 size-4" aria-hidden />
                Add Zone
              </Button>
            </div>
          ) : undefined
        }
        emptyState={{
          variant: "first-use" as const,
          title: "No zones yet",
          description: "Create your first zone to organise floor space.",
        }}
        table={{
          data: zones,
          columns,
          mobileFieldPriority: ["name", "locationName", "capacity", "isActive"],
          getRowId: (row) => row.id,
        }}
      />

      {canWrite && (
        <>
          <ZoneCreateSheet
            open={createOpen}
            onClose={() => setCreateOpen(false)}
            locations={locations}
          />
          <ZoneEditSheet
            target={editTarget}
            onClose={() => setEditTarget(null)}
            locations={locations}
          />
        </>
      )}
    </>
  );
}

// ── Shared location field ───────────────────────────────────────────────

type LocationSelectProps = Readonly<{
  value: string;
  onChange: (v: string) => void;
  locations: ReadonlyArray<LocationRow>;
  disabled: boolean;
  testId: string;
}>;

function LocationSelectField({
  value,
  onChange,
  locations,
  disabled,
  testId,
}: LocationSelectProps) {
  return (
    <Select value={value} onValueChange={onChange} disabled={disabled}>
      <SelectTrigger data-testid={testId}>
        <SelectValue placeholder="Select location" />
      </SelectTrigger>
      <SelectContent>
        {locations.map((l) => (
          <SelectItem key={l.id} value={l.id}>
            {l.name}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}

// ── Create sheet ────────────────────────────────────────────────────────

function ZoneCreateSheet({
  open,
  onClose,
  locations,
}: Readonly<{ open: boolean; onClose: () => void; locations: ReadonlyArray<LocationRow> }>) {
  const [isPending, startTransition] = React.useTransition();
  const [serverResult, setServerResult] = React.useState<ServerActionResult<unknown> | undefined>(
    undefined,
  );

  const form = useForm<CreateZoneInput>({
    resolver: zodResolver(createZoneSchema),
    defaultValues: { name: "", capacity: 1, locationId: "", isActive: true },
  });

  const onSubmit = form.handleSubmit((values) => {
    startTransition(async () => {
      const result = await createZone(values);
      setServerResult(result);
      if (result.success) {
        toastSuccess("Zone created");
        form.reset({ name: "", capacity: 1, locationId: "", isActive: true });
        setServerResult(undefined);
        onClose();
      } else {
        toastError(result);
      }
    });
  });

  return (
    <FormSheet
      open={open}
      onOpenChange={(next) => {
        if (!next) {
          form.reset();
          setServerResult(undefined);
          onClose();
        }
      }}
      title="Add Zone"
      formId="zone-create-form"
      submitLabel="Create"
      pending={isPending}
      data-testid="zone-create-sheet"
    >
      <FormProvider {...form}>
        <ServerErrorBridge result={serverResult} />
        <form id="zone-create-form" onSubmit={onSubmit} className="flex flex-col gap-4" noValidate>
          <FormField
            control={form.control}
            name="name"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Name *</FormLabel>
                <FormControl>
                  <Input {...field} disabled={isPending} data-testid="zone-create-name" />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
          <FormField
            control={form.control}
            name="locationId"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Location *</FormLabel>
                <FormControl>
                  <LocationSelectField
                    value={field.value}
                    onChange={field.onChange}
                    locations={locations}
                    disabled={isPending}
                    testId="zone-create-location"
                  />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
          <FormField
            control={form.control}
            name="capacity"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Capacity *</FormLabel>
                <FormControl>
                  <Input
                    type="number"
                    min={1}
                    {...field}
                    onChange={(e) => field.onChange(Number(e.target.value))}
                    disabled={isPending}
                    data-testid="zone-create-capacity"
                  />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
          <FormField
            control={form.control}
            name="description"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Description</FormLabel>
                <FormControl>
                  <Textarea
                    {...field}
                    value={field.value ?? ""}
                    rows={2}
                    disabled={isPending}
                    data-testid="zone-create-description"
                  />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
          <FormField
            control={form.control}
            name="isActive"
            render={({ field }) => (
              <FormItem>
                <div className="flex items-center gap-3">
                  <FormControl>
                    <Switch
                      checked={field.value}
                      onCheckedChange={field.onChange}
                      disabled={isPending}
                      data-testid="zone-create-active"
                    />
                  </FormControl>
                  <Label>Active</Label>
                </div>
              </FormItem>
            )}
          />
        </form>
      </FormProvider>
    </FormSheet>
  );
}

// ── Edit sheet ──────────────────────────────────────────────────────────

function ZoneEditSheet({
  target,
  onClose,
  locations,
}: Readonly<{
  target: ZoneRow | null;
  onClose: () => void;
  locations: ReadonlyArray<LocationRow>;
}>) {
  const [isPending, startTransition] = React.useTransition();
  const [serverResult, setServerResult] = React.useState<ServerActionResult<unknown> | undefined>(
    undefined,
  );

  const form = useForm<UpdateZoneInput>({
    resolver: zodResolver(updateZoneSchema),
    defaultValues: { id: "", name: "", capacity: 1, locationId: "", isActive: true },
  });

  React.useEffect(() => {
    if (target) {
      form.reset({
        id: target.id,
        name: target.name,
        description: target.description ?? undefined,
        capacity: target.capacity,
        locationId: target.locationId,
        isActive: target.isActive,
      });
      setServerResult(undefined);
    }
  }, [target, form]);

  const onSubmit = form.handleSubmit((values) => {
    startTransition(async () => {
      const result = await updateZone(values);
      setServerResult(result);
      if (result.success) {
        toastSuccess("Zone updated");
        setServerResult(undefined);
        onClose();
      } else {
        toastError(result);
      }
    });
  });

  return (
    <FormSheet
      open={target !== null}
      onOpenChange={(next) => {
        if (!next) {
          setServerResult(undefined);
          onClose();
        }
      }}
      title="Edit Zone"
      formId="zone-edit-form"
      submitLabel="Save Changes"
      pending={isPending}
      data-testid="zone-edit-sheet"
    >
      <FormProvider {...form}>
        <ServerErrorBridge result={serverResult} />
        <form id="zone-edit-form" onSubmit={onSubmit} className="flex flex-col gap-4" noValidate>
          <FormField
            control={form.control}
            name="name"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Name *</FormLabel>
                <FormControl>
                  <Input {...field} disabled={isPending} data-testid="zone-edit-name" />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
          <FormField
            control={form.control}
            name="locationId"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Location *</FormLabel>
                <FormControl>
                  <LocationSelectField
                    value={field.value}
                    onChange={field.onChange}
                    locations={locations}
                    disabled={isPending}
                    testId="zone-edit-location"
                  />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
          <FormField
            control={form.control}
            name="capacity"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Capacity *</FormLabel>
                <FormControl>
                  <Input
                    type="number"
                    min={1}
                    {...field}
                    onChange={(e) => field.onChange(Number(e.target.value))}
                    disabled={isPending}
                    data-testid="zone-edit-capacity"
                  />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
          <FormField
            control={form.control}
            name="description"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Description</FormLabel>
                <FormControl>
                  <Textarea
                    {...field}
                    value={field.value ?? ""}
                    rows={2}
                    disabled={isPending}
                    data-testid="zone-edit-description"
                  />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
          <FormField
            control={form.control}
            name="isActive"
            render={({ field }) => (
              <FormItem>
                <div className="flex items-center gap-3">
                  <FormControl>
                    <Switch
                      checked={field.value}
                      onCheckedChange={field.onChange}
                      disabled={isPending}
                      data-testid="zone-edit-active"
                    />
                  </FormControl>
                  <Label>Active</Label>
                </div>
              </FormItem>
            )}
          />
        </form>
      </FormProvider>
    </FormSheet>
  );
}
