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
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
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
import { createRole, updateRole } from "@/features/permissions/actions/manage-role";
import {
  createRoleSchema,
  updateRoleSchema,
  type CreateRoleInput,
  type UpdateRoleInput,
} from "@/features/permissions/schemas/permission";
import type { RoleRow, AccessLevel } from "@/features/permissions/types/permission";

function ServerErrorBridge({
  result,
}: Readonly<{ result: ServerActionResult<unknown> | undefined }>) {
  useServerErrors(result);
  return null;
}

const ACCESS_LEVEL_LABELS: Record<AccessLevel, string> = {
  admin: "Admin",
  manager: "Manager",
  crew: "Crew",
};

type RolesTableProps = Readonly<{
  roles: ReadonlyArray<RoleRow>;
  canWrite: boolean;
}>;

const BASE_COLUMNS: ColumnDef<RoleRow, unknown>[] = [
  {
    id: "displayName",
    accessorKey: "displayName",
    header: "Display Name",
    cell: ({ row }) => (
      <span className="text-foreground font-medium">{row.original.displayName}</span>
    ),
  },
  {
    id: "name",
    accessorKey: "name",
    header: "Key",
    cell: ({ row }) => (
      <span className="text-foreground-muted font-mono text-xs">{row.original.name}</span>
    ),
  },
  {
    id: "accessLevel",
    accessorKey: "accessLevel",
    header: "Access Level",
    cell: ({ row }) => (
      <Badge variant="outline" className="font-mono text-xs">
        {ACCESS_LEVEL_LABELS[row.original.accessLevel]}
      </Badge>
    ),
    meta: { headerClassName: "w-0 whitespace-nowrap", cellClassName: "w-0 whitespace-nowrap" },
  },
];

export function RolesTable({ roles, canWrite }: RolesTableProps) {
  const [createOpen, setCreateOpen] = React.useState(false);
  const [editTarget, setEditTarget] = React.useState<RoleRow | null>(null);

  const columns = React.useMemo<ColumnDef<RoleRow, unknown>[]>(() => {
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
            data-testid={`role-edit-${row.original.id}`}
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
        data-testid="roles-table"
        toolbar={
          canWrite ? (
            <div className="flex justify-end">
              <Button
                type="button"
                size="sm"
                onClick={() => setCreateOpen(true)}
                data-testid="role-create-open"
              >
                <Plus className="mr-1.5 size-4" aria-hidden />
                Add Role
              </Button>
            </div>
          ) : undefined
        }
        emptyState={{
          variant: "first-use" as const,
          title: "No roles",
          description: "Create your first role.",
        }}
        table={{
          data: roles,
          columns,
          mobileFieldPriority: ["displayName", "accessLevel", "name"],
          getRowId: (row) => row.id,
        }}
      />

      {canWrite && (
        <>
          <RoleCreateSheet open={createOpen} onClose={() => setCreateOpen(false)} />
          <RoleEditSheet target={editTarget} onClose={() => setEditTarget(null)} />
        </>
      )}
    </>
  );
}

// ── Create ──────────────────────────────────────────────────────────────

function RoleCreateSheet({ open, onClose }: Readonly<{ open: boolean; onClose: () => void }>) {
  const [isPending, startTransition] = React.useTransition();
  const [serverResult, setServerResult] = React.useState<ServerActionResult<unknown> | undefined>(
    undefined,
  );

  const form = useForm<CreateRoleInput>({
    resolver: zodResolver(createRoleSchema),
    defaultValues: { name: "", displayName: "", accessLevel: "crew" },
  });

  const onSubmit = form.handleSubmit((values) => {
    startTransition(async () => {
      const result = await createRole(values);
      setServerResult(result);
      if (result.success) {
        toastSuccess("Role created");
        form.reset({ name: "", displayName: "", accessLevel: "crew" });
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
      title="Add Role"
      formId="role-create-form"
      submitLabel="Create"
      pending={isPending}
      data-testid="role-create-sheet"
    >
      <FormProvider {...form}>
        <ServerErrorBridge result={serverResult} />
        <form id="role-create-form" onSubmit={onSubmit} className="flex flex-col gap-4" noValidate>
          <FormField
            control={form.control}
            name="name"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Key (lowercase_underscore) *</FormLabel>
                <FormControl>
                  <Input
                    {...field}
                    placeholder="e.g. senior_manager"
                    disabled={isPending}
                    data-testid="role-create-name"
                  />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
          <FormField
            control={form.control}
            name="displayName"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Display Name *</FormLabel>
                <FormControl>
                  <Input
                    {...field}
                    placeholder="e.g. Senior Manager"
                    disabled={isPending}
                    data-testid="role-create-display"
                  />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
          <FormField
            control={form.control}
            name="accessLevel"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Access Level *</FormLabel>
                <Select value={field.value} onValueChange={field.onChange} disabled={isPending}>
                  <FormControl>
                    <SelectTrigger data-testid="role-create-level">
                      <SelectValue />
                    </SelectTrigger>
                  </FormControl>
                  <SelectContent>
                    {Object.entries(ACCESS_LEVEL_LABELS).map(([v, l]) => (
                      <SelectItem key={v} value={v}>
                        {l}
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

// ── Edit ────────────────────────────────────────────────────────────────

function RoleEditSheet({
  target,
  onClose,
}: Readonly<{ target: RoleRow | null; onClose: () => void }>) {
  const [isPending, startTransition] = React.useTransition();
  const [serverResult, setServerResult] = React.useState<ServerActionResult<unknown> | undefined>(
    undefined,
  );

  const form = useForm<UpdateRoleInput>({
    resolver: zodResolver(updateRoleSchema),
    defaultValues: { id: "", displayName: "", accessLevel: "crew" },
  });

  React.useEffect(() => {
    if (target) {
      form.reset({
        id: target.id,
        displayName: target.displayName,
        accessLevel: target.accessLevel,
      });
      setServerResult(undefined);
    }
  }, [target, form]);

  const onSubmit = form.handleSubmit((values) => {
    startTransition(async () => {
      const result = await updateRole(values);
      setServerResult(result);
      if (result.success) {
        toastSuccess("Role updated");
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
      title="Edit Role"
      formId="role-edit-form"
      submitLabel="Save Changes"
      pending={isPending}
      data-testid="role-edit-sheet"
    >
      <FormProvider {...form}>
        <ServerErrorBridge result={serverResult} />
        <form id="role-edit-form" onSubmit={onSubmit} className="flex flex-col gap-4" noValidate>
          {target ? (
            <div className="flex flex-col gap-0.5">
              <p className="text-foreground-subtle text-xs font-medium tracking-wider uppercase">
                Key
              </p>
              <p className="text-foreground font-mono text-sm">{target.name}</p>
            </div>
          ) : null}
          <FormField
            control={form.control}
            name="displayName"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Display Name *</FormLabel>
                <FormControl>
                  <Input {...field} disabled={isPending} data-testid="role-edit-display" />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
          <FormField
            control={form.control}
            name="accessLevel"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Access Level *</FormLabel>
                <Select value={field.value} onValueChange={field.onChange} disabled={isPending}>
                  <FormControl>
                    <SelectTrigger data-testid="role-edit-level">
                      <SelectValue />
                    </SelectTrigger>
                  </FormControl>
                  <SelectContent>
                    {Object.entries(ACCESS_LEVEL_LABELS).map(([v, l]) => (
                      <SelectItem key={v} value={v}>
                        {l}
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
