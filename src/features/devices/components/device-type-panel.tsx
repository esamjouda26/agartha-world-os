"use client";

import * as React from "react";
import { ChevronDown, ChevronRight, Plus, Pencil } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toastSuccess, toastError } from "@/components/ui/toast-helpers";
import { createDeviceType, updateDeviceType } from "@/features/devices/actions/manage-device-type";
import type { DeviceTypeOption } from "@/features/devices/types/device";

type DeviceTypePanelProps = Readonly<{
  deviceTypes: ReadonlyArray<DeviceTypeOption>;
  canWrite: boolean;
}>;

type EditState = { mode: "idle" } | { mode: "create" } | { mode: "edit"; id: string };

export function DeviceTypePanel({ deviceTypes, canWrite }: DeviceTypePanelProps) {
  const [collapsed, setCollapsed] = React.useState(true);
  const [editState, setEditState] = React.useState<EditState>({ mode: "idle" });
  const [nameInput, setNameInput] = React.useState("");
  const [displayNameInput, setDisplayNameInput] = React.useState("");
  const [isPending, startTransition] = React.useTransition();

  function openCreate() {
    setNameInput("");
    setDisplayNameInput("");
    setEditState({ mode: "create" });
  }

  function openEdit(dt: DeviceTypeOption) {
    setDisplayNameInput(dt.displayName);
    setEditState({ mode: "edit", id: dt.id });
  }

  function cancel() {
    setEditState({ mode: "idle" });
    setNameInput("");
    setDisplayNameInput("");
  }

  function handleCreate() {
    if (!nameInput.trim() || !displayNameInput.trim()) return;
    startTransition(async () => {
      const result = await createDeviceType({
        name: nameInput.trim(),
        displayName: displayNameInput.trim(),
      });
      if (result.success) {
        toastSuccess("Device type created");
        cancel();
      } else {
        toastError(result);
      }
    });
  }

  function handleUpdate(id: string) {
    if (!displayNameInput.trim()) return;
    startTransition(async () => {
      const result = await updateDeviceType({ id, displayName: displayNameInput.trim() });
      if (result.success) {
        toastSuccess("Device type updated");
        cancel();
      } else {
        toastError(result);
      }
    });
  }

  return (
    <div
      className="border-border bg-card rounded-xl border shadow-xs"
      data-testid="device-type-panel"
    >
      {/* Collapsible header */}
      <button
        type="button"
        className="flex w-full items-center justify-between px-4 py-3 text-sm font-medium"
        aria-expanded={!collapsed}
        onClick={() => setCollapsed((c) => !c)}
        data-testid="device-type-panel-toggle"
      >
        <span>Device Types</span>
        {collapsed ? (
          <ChevronRight className="text-foreground-muted size-4" aria-hidden />
        ) : (
          <ChevronDown className="text-foreground-muted size-4" aria-hidden />
        )}
      </button>

      {!collapsed && (
        <div className="border-border-subtle border-t px-4 pt-3 pb-4">
          {/* List */}
          <ul className="mb-3 flex flex-col gap-1" role="list">
            {deviceTypes.map((dt) => (
              <li
                key={dt.id}
                className="hover:bg-muted/50 flex items-center justify-between gap-2 rounded-lg px-2 py-1.5 text-sm"
              >
                <div className="flex flex-col">
                  <span className="font-medium">{dt.displayName}</span>
                  <span className="text-foreground-muted font-mono text-xs">{dt.name}</span>
                </div>
                {canWrite && (
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    className="size-7 shrink-0 p-0"
                    onClick={() => openEdit(dt)}
                    aria-label={`Edit ${dt.displayName}`}
                    data-testid={`device-type-edit-${dt.id}`}
                  >
                    <Pencil className="size-3.5" aria-hidden />
                  </Button>
                )}
              </li>
            ))}
            {deviceTypes.length === 0 && (
              <li className="text-foreground-muted py-2 text-center text-sm">
                No device types yet.
              </li>
            )}
          </ul>

          {/* Inline create form */}
          {canWrite && editState.mode === "create" && (
            <div className="bg-muted/40 flex flex-col gap-3 rounded-lg p-3">
              <div className="flex flex-col gap-1">
                <Label htmlFor="dt-name">Key (lowercase_underscore)</Label>
                <Input
                  id="dt-name"
                  value={nameInput}
                  onChange={(e) => setNameInput(e.target.value)}
                  placeholder="e.g. access_point"
                  disabled={isPending}
                  data-testid="device-type-create-name"
                />
              </div>
              <div className="flex flex-col gap-1">
                <Label htmlFor="dt-display">Display Name</Label>
                <Input
                  id="dt-display"
                  value={displayNameInput}
                  onChange={(e) => setDisplayNameInput(e.target.value)}
                  placeholder="e.g. Access Point"
                  disabled={isPending}
                  data-testid="device-type-create-display"
                />
              </div>
              <div className="flex gap-2">
                <Button
                  type="button"
                  size="sm"
                  disabled={isPending || !nameInput.trim() || !displayNameInput.trim()}
                  onClick={handleCreate}
                  data-testid="device-type-create-submit"
                >
                  Create
                </Button>
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  disabled={isPending}
                  onClick={cancel}
                  data-testid="device-type-create-cancel"
                >
                  Cancel
                </Button>
              </div>
            </div>
          )}

          {/* Inline edit form */}
          {canWrite && editState.mode === "edit" && (
            <div className="bg-muted/40 flex flex-col gap-3 rounded-lg p-3">
              <div className="flex flex-col gap-1">
                <Label htmlFor="dt-display-edit">Display Name</Label>
                <Input
                  id="dt-display-edit"
                  value={displayNameInput}
                  onChange={(e) => setDisplayNameInput(e.target.value)}
                  placeholder="Display name"
                  disabled={isPending}
                  data-testid="device-type-edit-display"
                />
              </div>
              <div className="flex gap-2">
                <Button
                  type="button"
                  size="sm"
                  disabled={isPending || !displayNameInput.trim()}
                  onClick={() => handleUpdate(editState.id)}
                  data-testid="device-type-edit-submit"
                >
                  Save
                </Button>
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  disabled={isPending}
                  onClick={cancel}
                  data-testid="device-type-edit-cancel"
                >
                  Cancel
                </Button>
              </div>
            </div>
          )}

          {/* Add button */}
          {canWrite && editState.mode === "idle" && (
            <Button
              type="button"
              variant="outline"
              size="sm"
              className="mt-1 w-full gap-1.5"
              onClick={openCreate}
              data-testid="device-type-add"
            >
              <Plus className="size-3.5" aria-hidden />
              Add Type
            </Button>
          )}
        </div>
      )}
    </div>
  );
}
