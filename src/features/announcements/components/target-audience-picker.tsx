"use client";

import * as React from "react";
import { Globe2, Plus, Trash2, Users, User, Building2 } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { SearchableSelect } from "@/components/ui/searchable-select";
import { cn } from "@/lib/utils";

import type { AnnouncementTarget } from "@/features/announcements/schemas/announcement";
import type {
  OrgUnitOption,
  RoleOption,
  StaffOption,
} from "@/features/announcements/queries/target-picker-options";

type TargetType = AnnouncementTarget["target_type"];

const TYPE_COPY: Record<TargetType, { label: string; description: string; icon: React.ReactNode }> =
  {
    global: {
      label: "Everyone",
      description: "All staff across the organisation.",
      icon: <Globe2 aria-hidden className="size-4" />,
    },
    role: {
      label: "Role",
      description: "All staff holding the selected role.",
      icon: <Users aria-hidden className="size-4" />,
    },
    org_unit: {
      label: "Org unit",
      description: "Staff in the selected org unit and its descendants.",
      icon: <Building2 aria-hidden className="size-4" />,
    },
    user: {
      label: "Specific staff member",
      description: "One named user.",
      icon: <User aria-hidden className="size-4" />,
    },
  };

export type TargetAudiencePickerProps = Readonly<{
  value: readonly AnnouncementTarget[];
  onChange: (next: AnnouncementTarget[]) => void;
  roles: readonly RoleOption[];
  orgUnits: readonly OrgUnitOption[];
  staff: readonly StaffOption[];
  /** RHF-style error message, rendered under the list when present. */
  error?: string;
  "data-testid"?: string;
}>;

/**
 * Target-audience picker for the announcement form.
 *
 * Builds an editable list of `AnnouncementTarget` rows. Each row lets
 * the author pick a `target_type` (global / role / org_unit / user),
 * and — for non-global types — pick the matching entity via
 * `<SearchableSelect>`. Rows can be added / removed; the first row is
 * pre-seeded as "global" so the form starts in a valid minimum state
 * (the DB enforces ≥1 target via `rpc_create_announcement`).
 */
export function TargetAudiencePicker({
  value,
  onChange,
  roles,
  orgUnits,
  staff,
  error,
  "data-testid": testId,
}: TargetAudiencePickerProps) {
  const updateRow = (index: number, next: AnnouncementTarget) => {
    const copy = [...value];
    copy[index] = next;
    onChange(copy);
  };

  const changeType = (index: number, nextType: TargetType) => {
    // Switching type resets the selected entity so we don't carry over
    // a stale id that doesn't match the new table.
    switch (nextType) {
      case "global":
        updateRow(index, { target_type: "global" });
        break;
      case "role":
        updateRow(index, { target_type: "role", role_id: "" });
        break;
      case "org_unit":
        updateRow(index, { target_type: "org_unit", org_unit_id: "" });
        break;
      case "user":
        updateRow(index, { target_type: "user", user_id: "" });
        break;
    }
  };

  const removeRow = (index: number) => {
    onChange(value.filter((_, i) => i !== index));
  };

  const addRow = () => {
    onChange([...value, { target_type: "global" }]);
  };

  return (
    <Card data-testid={testId ?? "announcement-target-picker"}>
      <CardHeader>
        <CardTitle>Audience</CardTitle>
        <CardDescription>
          Add at least one target. Multiple targets are unioned — anyone matching any row receives
          the announcement.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <div className="flex flex-col gap-3">
          {value.length === 0 ? (
            <p className="text-foreground-subtle text-xs" data-testid="announcement-target-empty">
              No targets yet. Click &ldquo;Add target&rdquo; to start.
            </p>
          ) : null}
          {value.map((row, index) => (
            <TargetRow
              key={index}
              row={row}
              index={index}
              roles={roles}
              orgUnits={orgUnits}
              staff={staff}
              canRemove={value.length > 1}
              onTypeChange={(t) => changeType(index, t)}
              onEntityChange={(updated) => updateRow(index, updated)}
              onRemove={() => removeRow(index)}
            />
          ))}

          <div className="flex items-center justify-between">
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={addRow}
              data-testid="announcement-target-add"
            >
              <Plus aria-hidden className="size-4" />
              <span>Add target</span>
            </Button>
          </div>

          {error ? (
            <p
              role="alert"
              className="text-status-danger-foreground text-xs"
              data-testid="announcement-target-error"
            >
              {error}
            </p>
          ) : null}
        </div>
      </CardContent>
    </Card>
  );
}

function TargetRow({
  row,
  index,
  roles,
  orgUnits,
  staff,
  canRemove,
  onTypeChange,
  onEntityChange,
  onRemove,
}: Readonly<{
  row: AnnouncementTarget;
  index: number;
  roles: readonly RoleOption[];
  orgUnits: readonly OrgUnitOption[];
  staff: readonly StaffOption[];
  canRemove: boolean;
  onTypeChange: (next: TargetType) => void;
  onEntityChange: (next: AnnouncementTarget) => void;
  onRemove: () => void;
}>) {
  return (
    <div
      className={cn(
        "border-border-subtle bg-surface/40 rounded-lg border p-3",
        "flex flex-col gap-3 md:grid md:grid-cols-[200px_1fr_auto] md:items-center",
      )}
      data-testid={`announcement-target-row-${index}`}
    >
      <Select value={row.target_type} onValueChange={(v) => onTypeChange(v as TargetType)}>
        <SelectTrigger
          className="h-10 w-full"
          data-testid={`announcement-target-row-${index}-type`}
        >
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          {(Object.keys(TYPE_COPY) as TargetType[]).map((t) => (
            <SelectItem key={t} value={t}>
              <span className="flex items-center gap-2">
                {TYPE_COPY[t].icon}
                <span>{TYPE_COPY[t].label}</span>
              </span>
            </SelectItem>
          ))}
        </SelectContent>
      </Select>

      <TargetRowEntity
        row={row}
        index={index}
        roles={roles}
        orgUnits={orgUnits}
        staff={staff}
        onEntityChange={onEntityChange}
      />

      <Button
        type="button"
        variant="ghost"
        size="icon-sm"
        onClick={onRemove}
        disabled={!canRemove}
        aria-label={`Remove target ${index + 1}`}
        data-testid={`announcement-target-row-${index}-remove`}
      >
        <Trash2 aria-hidden className="size-4" />
      </Button>
    </div>
  );
}

function TargetRowEntity({
  row,
  index,
  roles,
  orgUnits,
  staff,
  onEntityChange,
}: Readonly<{
  row: AnnouncementTarget;
  index: number;
  roles: readonly RoleOption[];
  orgUnits: readonly OrgUnitOption[];
  staff: readonly StaffOption[];
  onEntityChange: (next: AnnouncementTarget) => void;
}>) {
  if (row.target_type === "global") {
    return (
      <p className="text-foreground-muted text-xs">Visible to every authenticated staff member.</p>
    );
  }

  if (row.target_type === "role") {
    return (
      <SearchableSelect
        value={row.role_id || null}
        onChange={(next) => onEntityChange({ target_type: "role", role_id: next ?? "" })}
        options={roles.map((r) => ({ value: r.id, label: r.displayName }))}
        placeholder="Select a role"
        searchPlaceholder="Search roles…"
        emptyLabel="No roles match."
        data-testid={`announcement-target-row-${index}-role`}
      />
    );
  }

  if (row.target_type === "org_unit") {
    return (
      <SearchableSelect
        value={row.org_unit_id || null}
        onChange={(next) => onEntityChange({ target_type: "org_unit", org_unit_id: next ?? "" })}
        options={orgUnits.map((u) => ({
          value: u.id,
          label: u.name,
          description: u.code,
          searchValue: `${u.name} ${u.code} ${u.path}`,
        }))}
        placeholder="Select an org unit"
        searchPlaceholder="Search org units…"
        emptyLabel="No org units match."
        data-testid={`announcement-target-row-${index}-org-unit`}
      />
    );
  }

  return (
    <SearchableSelect
      value={row.user_id || null}
      onChange={(next) => onEntityChange({ target_type: "user", user_id: next ?? "" })}
      options={staff.map((s) => {
        const description = [s.employeeId, s.email].filter(Boolean).join(" · ");
        return {
          value: s.id,
          label: s.displayName || s.email || s.id,
          searchValue: `${s.displayName ?? ""} ${s.email ?? ""} ${s.employeeId ?? ""}`,
          ...(description ? { description } : {}),
        };
      })}
      placeholder="Select a staff member"
      searchPlaceholder="Search by name, email, or employee ID…"
      emptyLabel="No staff match."
      data-testid={`announcement-target-row-${index}-user`}
    />
  );
}
