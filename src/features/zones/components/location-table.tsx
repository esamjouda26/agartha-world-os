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
import { createLocation, updateLocation } from "@/features/zones/actions/manage-location";
import {
  createLocationSchema,
  updateLocationSchema,
  type CreateLocationInput,
  type UpdateLocationInput,
} from "@/features/zones/schemas/zone";
import type { LocationRow, OrgUnitOption } from "@/features/zones/types/zone";

function ServerErrorBridge({
  result,
}: Readonly<{ result: ServerActionResult<unknown> | undefined }>) {
  useServerErrors(result);
  return null;
}

type LocationTableProps = Readonly<{
  locations: ReadonlyArray<LocationRow>;
  orgUnits: ReadonlyArray<OrgUnitOption>;
  canWrite: boolean;
}>;

const COLUMNS: ColumnDef<LocationRow, unknown>[] = [
  {
    id: "name",
    accessorKey: "name",
    header: "Name",
    cell: ({ row }) => <span className="text-foreground font-medium">{row.original.name}</span>,
  },
  {
    id: "orgUnitName",
    accessorKey: "orgUnitName",
    header: "Org Unit",
    cell: ({ row }) => (
      <span className="text-foreground-subtle text-sm">{row.original.orgUnitName ?? "—"}</span>
    ),
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

export function LocationTable({ locations, orgUnits, canWrite }: LocationTableProps) {
  const [createOpen, setCreateOpen] = React.useState(false);
  const [editTarget, setEditTarget] = React.useState<LocationRow | null>(null);

  return (
    <>
      <FilterableDataTable
        data-testid="location-table"
        toolbar={
          canWrite ? (
            <div className="flex justify-end">
              <Button
                type="button"
                size="sm"
                onClick={() => setCreateOpen(true)}
                data-testid="location-create-open"
              >
                <Plus className="mr-1.5 size-4" aria-hidden />
                Add Location
              </Button>
            </div>
          ) : undefined
        }
        emptyState={{
          variant: "first-use" as const,
          title: "No locations yet",
          description: "Create your first location to begin.",
        }}
        table={{
          data: locations,
          columns: canWrite
            ? [
                ...COLUMNS,
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
                      data-testid={`location-edit-${row.original.id}`}
                    >
                      Edit
                    </Button>
                  ),
                  meta: { headerClassName: "w-0", cellClassName: "w-0" },
                },
              ]
            : COLUMNS,
          mobileFieldPriority: ["name", "orgUnitName", "isActive"],
          getRowId: (row) => row.id,
        }}
      />

      {canWrite && (
        <>
          <LocationCreateSheet open={createOpen} onOpenChange={setCreateOpen} orgUnits={orgUnits} />
          <LocationEditSheet
            target={editTarget}
            onClose={() => setEditTarget(null)}
            orgUnits={orgUnits}
          />
        </>
      )}
    </>
  );
}

// ── Create sheet ────────────────────────────────────────────────────────

function LocationCreateSheet({
  open,
  onOpenChange,
  orgUnits,
}: Readonly<{
  open: boolean;
  onOpenChange: (o: boolean) => void;
  orgUnits: ReadonlyArray<OrgUnitOption>;
}>) {
  const [isPending, startTransition] = React.useTransition();
  const [serverResult, setServerResult] = React.useState<ServerActionResult<unknown> | undefined>(
    undefined,
  );

  const form = useForm<CreateLocationInput>({
    resolver: zodResolver(createLocationSchema),
    defaultValues: { name: "", isActive: true },
  });

  const onSubmit = form.handleSubmit((values) => {
    startTransition(async () => {
      const result = await createLocation(values);
      setServerResult(result);
      if (result.success) {
        toastSuccess("Location created");
        form.reset({ name: "", isActive: true });
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
      onOpenChange={(next) => {
        if (!next) {
          form.reset();
          setServerResult(undefined);
        }
        onOpenChange(next);
      }}
      title="Add Location"
      formId="location-create-form"
      submitLabel="Create"
      pending={isPending}
      data-testid="location-create-sheet"
    >
      <FormProvider {...form}>
        <ServerErrorBridge result={serverResult} />
        <form
          id="location-create-form"
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
                  <Input {...field} disabled={isPending} data-testid="location-create-name" />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
          <FormField
            control={form.control}
            name="orgUnitId"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Org Unit</FormLabel>
                <Select
                  value={field.value ?? "none"}
                  onValueChange={(v) => field.onChange(v === "none" ? undefined : v)}
                  disabled={isPending}
                >
                  <FormControl>
                    <SelectTrigger data-testid="location-create-org-unit">
                      <SelectValue placeholder="None" />
                    </SelectTrigger>
                  </FormControl>
                  <SelectContent>
                    <SelectItem value="none">None</SelectItem>
                    {orgUnits.map((ou) => (
                      <SelectItem key={ou.id} value={ou.id}>
                        {ou.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
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
                      data-testid="location-create-active"
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

function LocationEditSheet({
  target,
  onClose,
  orgUnits,
}: Readonly<{
  target: LocationRow | null;
  onClose: () => void;
  orgUnits: ReadonlyArray<OrgUnitOption>;
}>) {
  const [isPending, startTransition] = React.useTransition();
  const [serverResult, setServerResult] = React.useState<ServerActionResult<unknown> | undefined>(
    undefined,
  );

  const form = useForm<UpdateLocationInput>({
    resolver: zodResolver(updateLocationSchema),
    defaultValues: { id: "", name: "", isActive: true },
  });

  React.useEffect(() => {
    if (target) {
      form.reset({
        id: target.id,
        name: target.name,
        orgUnitId: target.orgUnitId ?? undefined,
        isActive: target.isActive,
      });
      setServerResult(undefined);
    }
  }, [target, form]);

  const onSubmit = form.handleSubmit((values) => {
    startTransition(async () => {
      const result = await updateLocation(values);
      setServerResult(result);
      if (result.success) {
        toastSuccess("Location updated");
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
        if (!next) onClose();
      }}
      title="Edit Location"
      formId="location-edit-form"
      submitLabel="Save Changes"
      pending={isPending}
      data-testid="location-edit-sheet"
    >
      <FormProvider {...form}>
        <ServerErrorBridge result={serverResult} />
        <form
          id="location-edit-form"
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
                  <Input {...field} disabled={isPending} data-testid="location-edit-name" />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
          <FormField
            control={form.control}
            name="orgUnitId"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Org Unit</FormLabel>
                <Select
                  value={field.value ?? "none"}
                  onValueChange={(v) => field.onChange(v === "none" ? undefined : v)}
                  disabled={isPending}
                >
                  <FormControl>
                    <SelectTrigger data-testid="location-edit-org-unit">
                      <SelectValue placeholder="None" />
                    </SelectTrigger>
                  </FormControl>
                  <SelectContent>
                    <SelectItem value="none">None</SelectItem>
                    {orgUnits.map((ou) => (
                      <SelectItem key={ou.id} value={ou.id}>
                        {ou.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
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
                      data-testid="location-edit-active"
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
