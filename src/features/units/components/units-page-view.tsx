"use client";

import * as React from "react";
import { useForm, FormProvider } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Plus } from "lucide-react";
import type { ColumnDef } from "@tanstack/react-table";

import { PageHeader } from "@/components/ui/page-header";
import { Button } from "@/components/ui/button";
import { FilterableDataTable } from "@/components/shared/filterable-data-table";
import { FormSheet } from "@/components/shared/form-sheet";
import { FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { toastSuccess, toastError } from "@/components/ui/toast-helpers";
import { useServerErrors } from "@/hooks/use-server-errors";
import type { ServerActionResult } from "@/lib/errors";
import { createUnit, updateUnit } from "@/features/units/actions/manage-unit";
import {
  createUnitSchema,
  updateUnitSchema,
  type CreateUnitInput,
  type UpdateUnitInput,
} from "@/features/units/schemas/unit";
import type { UnitRow } from "@/features/units/queries/get-units";

function ServerErrorBridge({
  result,
}: Readonly<{ result: ServerActionResult<unknown> | undefined }>) {
  useServerErrors(result);
  return null;
}

type UnitsPageViewProps = Readonly<{
  units: ReadonlyArray<UnitRow>;
  canWrite: boolean;
}>;

export function UnitsPageView({ units, canWrite }: UnitsPageViewProps) {
  const [createOpen, setCreateOpen] = React.useState(false);
  const [editTarget, setEditTarget] = React.useState<UnitRow | null>(null);

  const columns = React.useMemo<ColumnDef<UnitRow, unknown>[]>(() => {
    const base: ColumnDef<UnitRow, unknown>[] = [
      {
        id: "name",
        accessorKey: "name",
        header: "Name",
        cell: ({ row }) => <span className="text-foreground font-medium">{row.original.name}</span>,
      },
      {
        id: "abbreviation",
        accessorKey: "abbreviation",
        header: "Abbreviation",
        cell: ({ row }) => (
          <span className="text-foreground-subtle font-mono text-sm">
            {row.original.abbreviation}
          </span>
        ),
        meta: { headerClassName: "w-0 whitespace-nowrap", cellClassName: "w-0 whitespace-nowrap" },
      },
    ];
    if (!canWrite) return base;
    return [
      ...base,
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
            data-testid={`unit-edit-${row.original.id}`}
          >
            Edit
          </Button>
        ),
        meta: { headerClassName: "w-0", cellClassName: "w-0" },
      },
    ];
  }, [canWrite]);

  return (
    <div className="flex flex-col gap-6" data-testid="units-page">
      <PageHeader
        title="Units of Measure"
        description="Reference units used across materials, procurement, and inventory."
        primaryAction={
          canWrite ? (
            <Button
              type="button"
              size="sm"
              onClick={() => setCreateOpen(true)}
              data-testid="unit-create-open"
            >
              <Plus className="mr-1.5 size-4" aria-hidden />
              Add Unit
            </Button>
          ) : undefined
        }
      />

      <FilterableDataTable
        data-testid="units-table"
        emptyState={{
          variant: "first-use" as const,
          title: "No units of measure defined",
          description: "Add your first unit to enable material and procurement tracking.",
          ...(canWrite
            ? {
                action: (
                  <Button
                    type="button"
                    size="sm"
                    onClick={() => setCreateOpen(true)}
                    data-testid="unit-empty-cta"
                  >
                    Add Unit
                  </Button>
                ),
              }
            : {}),
        }}
        table={{
          data: units,
          columns,
          mobileFieldPriority: ["name", "abbreviation"],
          getRowId: (row) => row.id,
        }}
      />

      {canWrite && (
        <>
          <UnitCreateSheet open={createOpen} onClose={() => setCreateOpen(false)} />
          <UnitEditSheet target={editTarget} onClose={() => setEditTarget(null)} />
        </>
      )}
    </div>
  );
}

// ── Create sheet ────────────────────────────────────────────────────────

function UnitCreateSheet({ open, onClose }: Readonly<{ open: boolean; onClose: () => void }>) {
  const [isPending, startTransition] = React.useTransition();
  const [serverResult, setServerResult] = React.useState<ServerActionResult<unknown> | undefined>(
    undefined,
  );

  const form = useForm<CreateUnitInput>({
    resolver: zodResolver(createUnitSchema),
    defaultValues: { name: "", abbreviation: "" },
  });

  const onSubmit = form.handleSubmit((values) => {
    startTransition(async () => {
      const result = await createUnit(values);
      setServerResult(result);
      if (result.success) {
        toastSuccess("Unit created");
        form.reset();
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
      title="Add Unit of Measure"
      formId="unit-create-form"
      submitLabel="Create"
      pending={isPending}
      data-testid="unit-create-sheet"
    >
      <FormProvider {...form}>
        <ServerErrorBridge result={serverResult} />
        <form id="unit-create-form" onSubmit={onSubmit} className="flex flex-col gap-4" noValidate>
          <FormField
            control={form.control}
            name="name"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Name *</FormLabel>
                <FormControl>
                  <Input
                    {...field}
                    placeholder="e.g. Kilogram"
                    disabled={isPending}
                    data-testid="unit-create-name"
                  />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
          <FormField
            control={form.control}
            name="abbreviation"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Abbreviation *</FormLabel>
                <FormControl>
                  <Input
                    {...field}
                    placeholder="e.g. kg"
                    disabled={isPending}
                    data-testid="unit-create-abbrev"
                  />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
        </form>
      </FormProvider>
    </FormSheet>
  );
}

// ── Edit sheet ──────────────────────────────────────────────────────────

function UnitEditSheet({
  target,
  onClose,
}: Readonly<{ target: UnitRow | null; onClose: () => void }>) {
  const [isPending, startTransition] = React.useTransition();
  const [serverResult, setServerResult] = React.useState<ServerActionResult<unknown> | undefined>(
    undefined,
  );

  const form = useForm<UpdateUnitInput>({
    resolver: zodResolver(updateUnitSchema),
    defaultValues: { id: "", name: "", abbreviation: "" },
  });

  React.useEffect(() => {
    if (target) {
      form.reset({ id: target.id, name: target.name, abbreviation: target.abbreviation });
      setServerResult(undefined);
    }
  }, [target, form]);

  const onSubmit = form.handleSubmit((values) => {
    startTransition(async () => {
      const result = await updateUnit(values);
      setServerResult(result);
      if (result.success) {
        toastSuccess("Unit updated");
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
      title="Edit Unit of Measure"
      formId="unit-edit-form"
      submitLabel="Save Changes"
      pending={isPending}
      data-testid="unit-edit-sheet"
    >
      <FormProvider {...form}>
        <ServerErrorBridge result={serverResult} />
        <form id="unit-edit-form" onSubmit={onSubmit} className="flex flex-col gap-4" noValidate>
          <FormField
            control={form.control}
            name="name"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Name *</FormLabel>
                <FormControl>
                  <Input {...field} disabled={isPending} data-testid="unit-edit-name" />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
          <FormField
            control={form.control}
            name="abbreviation"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Abbreviation *</FormLabel>
                <FormControl>
                  <Input {...field} disabled={isPending} data-testid="unit-edit-abbrev" />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
        </form>
      </FormProvider>
    </FormSheet>
  );
}
