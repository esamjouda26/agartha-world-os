"use client";

import * as React from "react";
import { useForm, FormProvider } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";

import { FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
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
import { createOrgUnit, updateOrgUnit } from "@/features/org-units/actions/manage-org-unit";
import {
  createOrgUnitSchema,
  updateOrgUnitSchema,
  type CreateOrgUnitInput,
  type UpdateOrgUnitInput,
} from "@/features/org-units/schemas/org-unit";
import type { OrgUnitRow } from "@/features/org-units/types/org-unit";

const UNIT_TYPE_LABELS = {
  company: "Company",
  division: "Division",
  department: "Department",
} as const;

function ServerErrorBridge({
  result,
}: Readonly<{ result: ServerActionResult<unknown> | undefined }>) {
  useServerErrors(result);
  return null;
}

// ── Create form ────────────────────────────────────────────────────────

type OrgUnitCreateFormProps = Readonly<{
  parentId?: string;
  parentName?: string;
  onSuccess: (id: string) => void;
  onCancel: () => void;
}>;

export function OrgUnitCreateForm({
  parentId,
  parentName,
  onSuccess,
  onCancel,
}: OrgUnitCreateFormProps) {
  const [isPending, startTransition] = React.useTransition();
  const [serverResult, setServerResult] = React.useState<ServerActionResult<unknown> | undefined>(
    undefined,
  );

  const form = useForm<CreateOrgUnitInput>({
    resolver: zodResolver(createOrgUnitSchema),
    defaultValues: { code: "", name: "", unitType: "department", parentId, isActive: true },
  });

  const onSubmit = form.handleSubmit((values) => {
    startTransition(async () => {
      const result = await createOrgUnit(values);
      setServerResult(result);
      if (result.success) {
        toastSuccess("Org unit created");
        onSuccess(result.data.id);
      } else {
        toastError(result);
      }
    });
  });

  return (
    <FormProvider {...form}>
      <ServerErrorBridge result={serverResult} />
      <form
        onSubmit={onSubmit}
        className="flex flex-col gap-4"
        noValidate
        data-testid="org-unit-create-form"
      >
        {parentName ? (
          <p className="text-foreground-muted text-sm">
            Creating child of: <span className="text-foreground font-medium">{parentName}</span>
          </p>
        ) : (
          <p className="text-foreground-muted text-sm">Creating a root-level org unit.</p>
        )}

        <FormField
          control={form.control}
          name="code"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Code *</FormLabel>
              <FormControl>
                <Input
                  {...field}
                  placeholder="e.g. finance"
                  disabled={isPending}
                  data-testid="org-unit-create-code"
                />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        <FormField
          control={form.control}
          name="name"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Name *</FormLabel>
              <FormControl>
                <Input
                  {...field}
                  placeholder="e.g. Finance Department"
                  disabled={isPending}
                  data-testid="org-unit-create-name"
                />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        <FormField
          control={form.control}
          name="unitType"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Type *</FormLabel>
              <Select value={field.value} onValueChange={field.onChange} disabled={isPending}>
                <FormControl>
                  <SelectTrigger data-testid="org-unit-create-type">
                    <SelectValue />
                  </SelectTrigger>
                </FormControl>
                <SelectContent>
                  {Object.entries(UNIT_TYPE_LABELS).map(([v, l]) => (
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
                    data-testid="org-unit-create-active"
                  />
                </FormControl>
                <Label>Active</Label>
              </div>
            </FormItem>
          )}
        />

        <div className="flex gap-2 pt-2">
          <Button type="submit" size="sm" disabled={isPending} data-testid="org-unit-create-submit">
            Create
          </Button>
          <Button
            type="button"
            variant="ghost"
            size="sm"
            disabled={isPending}
            onClick={onCancel}
            data-testid="org-unit-create-cancel"
          >
            Cancel
          </Button>
        </div>
      </form>
    </FormProvider>
  );
}

// ── Edit form ──────────────────────────────────────────────────────────

type OrgUnitEditFormProps = Readonly<{
  unit: OrgUnitRow;
  onSuccess: () => void;
  onCancel: () => void;
}>;

export function OrgUnitEditForm({ unit, onSuccess, onCancel }: OrgUnitEditFormProps) {
  const [isPending, startTransition] = React.useTransition();
  const [serverResult, setServerResult] = React.useState<ServerActionResult<unknown> | undefined>(
    undefined,
  );

  const form = useForm<UpdateOrgUnitInput>({
    resolver: zodResolver(updateOrgUnitSchema),
    defaultValues: {
      id: unit.id,
      name: unit.name,
      unitType: unit.unitType,
      isActive: unit.isActive,
    },
  });

  const onSubmit = form.handleSubmit((values) => {
    startTransition(async () => {
      const result = await updateOrgUnit(values);
      setServerResult(result);
      if (result.success) {
        toastSuccess("Org unit updated");
        onSuccess();
      } else {
        toastError(result);
      }
    });
  });

  return (
    <FormProvider {...form}>
      <ServerErrorBridge result={serverResult} />
      <form
        onSubmit={onSubmit}
        className="flex flex-col gap-4"
        noValidate
        data-testid="org-unit-edit-form"
      >
        <div className="flex flex-col gap-0.5">
          <p className="text-foreground-subtle text-xs font-medium tracking-wider uppercase">
            Code
          </p>
          <p className="text-foreground font-mono text-sm">{unit.code}</p>
          <p className="text-foreground-muted text-xs">
            Code cannot be changed without DB-level reparent RPC.
          </p>
        </div>

        <FormField
          control={form.control}
          name="name"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Name *</FormLabel>
              <FormControl>
                <Input {...field} disabled={isPending} data-testid="org-unit-edit-name" />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        <FormField
          control={form.control}
          name="unitType"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Type *</FormLabel>
              <Select value={field.value} onValueChange={field.onChange} disabled={isPending}>
                <FormControl>
                  <SelectTrigger data-testid="org-unit-edit-type">
                    <SelectValue />
                  </SelectTrigger>
                </FormControl>
                <SelectContent>
                  {Object.entries(UNIT_TYPE_LABELS).map(([v, l]) => (
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
                    data-testid="org-unit-edit-active"
                  />
                </FormControl>
                <Label>Active</Label>
              </div>
            </FormItem>
          )}
        />

        <div className="flex gap-2 pt-2">
          <Button type="submit" size="sm" disabled={isPending} data-testid="org-unit-edit-submit">
            Save Changes
          </Button>
          <Button
            type="button"
            variant="ghost"
            size="sm"
            disabled={isPending}
            onClick={onCancel}
            data-testid="org-unit-edit-cancel"
          >
            Cancel
          </Button>
        </div>
      </form>
    </FormProvider>
  );
}
