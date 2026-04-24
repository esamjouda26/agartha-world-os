"use client";

import * as React from "react";

import { Checkbox } from "@/components/ui/checkbox";
import { Badge } from "@/components/ui/badge";
import { Label } from "@/components/ui/label";
import { cn } from "@/lib/utils";
import { toastSuccess, toastError } from "@/components/ui/toast-helpers";
import { upsertPermission } from "@/features/permissions/actions/manage-permission";
import type {
  RoleRow,
  PermissionDomainRow,
  PermissionRow,
  AccessLevel,
} from "@/features/permissions/types/permission";

type PermissionMatrixProps = Readonly<{
  roles: ReadonlyArray<RoleRow>;
  domains: ReadonlyArray<PermissionDomainRow>;
  permissions: ReadonlyArray<PermissionRow>;
  canWrite: boolean;
}>;

type CRUDKey = "canCreate" | "canRead" | "canUpdate" | "canDelete";

const CRUD_COLS: ReadonlyArray<{ key: CRUDKey; label: string; short: string }> = [
  { key: "canCreate", label: "Create", short: "C" },
  { key: "canRead", label: "Read", short: "R" },
  { key: "canUpdate", label: "Update", short: "U" },
  { key: "canDelete", label: "Delete", short: "D" },
];

const ACCESS_LEVEL_VARIANT: Record<AccessLevel, "default" | "secondary" | "outline"> = {
  admin: "default",
  manager: "secondary",
  crew: "outline",
};

export function PermissionMatrix({ roles, domains, permissions, canWrite }: PermissionMatrixProps) {
  const [selectedRoleId, setSelectedRoleId] = React.useState<string>(roles[0]?.id ?? "");
  // Optimistic local state — mirrors server state, updated on checkbox toggle
  const [localPerms, setLocalPerms] = React.useState<Map<string, PermissionRow>>(() => {
    const m = new Map<string, PermissionRow>();
    for (const p of permissions) m.set(`${p.roleId}:${p.domainId}`, p);
    return m;
  });
  const [pendingKey, setPendingKey] = React.useState<string | null>(null);

  // Sync when server data changes (RSC revalidation)
  React.useEffect(() => {
    const m = new Map<string, PermissionRow>();
    for (const p of permissions) m.set(`${p.roleId}:${p.domainId}`, p);
    setLocalPerms(m);
  }, [permissions]);

  const selectedRole = roles.find((r) => r.id === selectedRoleId) ?? roles[0];

  function getCell(roleId: string, domainId: string): PermissionRow {
    return (
      localPerms.get(`${roleId}:${domainId}`) ?? {
        id: "",
        roleId,
        domainId,
        canCreate: false,
        canRead: false,
        canUpdate: false,
        canDelete: false,
      }
    );
  }

  async function handleToggle(
    roleId: string,
    domainId: string,
    key: CRUDKey,
    currentValue: boolean,
  ): Promise<void> {
    if (!canWrite) return;
    const mapKey = `${roleId}:${domainId}`;
    if (pendingKey === `${mapKey}:${key}`) return;

    const current = getCell(roleId, domainId);
    const next = { ...current, [key]: !currentValue };

    // Optimistic update
    setLocalPerms((prev) => new Map(prev).set(mapKey, next));
    setPendingKey(`${mapKey}:${key}`);

    const result = await upsertPermission({
      roleId,
      domainId,
      canCreate: next.canCreate,
      canRead: next.canRead,
      canUpdate: next.canUpdate,
      canDelete: next.canDelete,
    });

    setPendingKey(null);

    if (!result.success) {
      // Rollback
      setLocalPerms((prev) => new Map(prev).set(mapKey, current));
      toastError(result);
    } else {
      toastSuccess("Permission updated");
    }
  }

  return (
    <div className="flex flex-col gap-4 lg:flex-row lg:gap-6" data-testid="permission-matrix">
      {/* Role selector — left sidebar */}
      <aside className="border-border bg-card flex shrink-0 flex-col gap-1 rounded-xl border p-2 shadow-xs lg:w-56">
        <p className="text-foreground-subtle px-2 py-1 text-[11px] font-medium tracking-wider uppercase">
          Roles
        </p>
        {roles.map((role) => (
          <button
            key={role.id}
            type="button"
            onClick={() => setSelectedRoleId(role.id)}
            className={cn(
              "flex items-center justify-between gap-2 rounded-lg px-2 py-1.5 text-left text-sm transition-colors",
              selectedRoleId === role.id
                ? "bg-brand-primary/10 text-brand-primary font-medium"
                : "text-foreground hover:bg-muted/60",
            )}
            aria-pressed={selectedRoleId === role.id}
            data-testid={`role-select-${role.id}`}
          >
            <span className="truncate">{role.displayName}</span>
            <Badge variant={ACCESS_LEVEL_VARIANT[role.accessLevel]} className="shrink-0 text-xs">
              {role.accessLevel}
            </Badge>
          </button>
        ))}
      </aside>

      {/* Permission grid — right panel */}
      <div className="border-border bg-card min-w-0 flex-1 overflow-x-auto rounded-xl border shadow-xs">
        {selectedRole ? (
          <>
            <div className="border-border-subtle flex items-center gap-2 border-b px-4 py-3">
              <span className="text-foreground text-sm font-semibold">
                {selectedRole.displayName}
              </span>
              <Badge variant={ACCESS_LEVEL_VARIANT[selectedRole.accessLevel]} className="text-xs">
                {selectedRole.accessLevel}
              </Badge>
            </div>
            <table
              className="w-full text-sm"
              aria-label={`Permissions for ${selectedRole.displayName}`}
              data-testid="permission-grid"
            >
              <thead>
                <tr className="border-border-subtle border-b">
                  <th className="text-foreground-subtle px-4 py-2 text-left text-xs font-medium">
                    Domain
                  </th>
                  {CRUD_COLS.map((col) => (
                    <th
                      key={col.key}
                      className="text-foreground-subtle w-16 px-2 py-2 text-center text-xs font-medium"
                      title={col.label}
                    >
                      {col.short}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {domains.map((domain, idx) => {
                  const cell = getCell(selectedRole.id, domain.id);
                  return (
                    <tr
                      key={domain.id}
                      className={cn(
                        "border-border-subtle border-b transition-colors last:border-0",
                        idx % 2 === 0 ? "" : "bg-muted/20",
                      )}
                      data-testid={`perm-row-${domain.code}`}
                    >
                      <td className="px-4 py-2">
                        <span className="text-foreground font-medium">{domain.name}</span>
                        <span className="text-foreground-muted ml-2 font-mono text-xs">
                          {domain.code}
                        </span>
                      </td>
                      {CRUD_COLS.map((col) => {
                        const isPending =
                          pendingKey === `${selectedRole.id}:${domain.id}:${col.key}`;
                        const checked = cell[col.key];
                        const testId = `perm-${domain.code}-${col.key}`;
                        return (
                          <td key={col.key} className="px-2 py-2 text-center">
                            <div className="flex items-center justify-center">
                              <Checkbox
                                id={testId}
                                checked={checked}
                                disabled={!canWrite || isPending}
                                onCheckedChange={() =>
                                  void handleToggle(selectedRole.id, domain.id, col.key, checked)
                                }
                                aria-label={`${col.label} permission for ${domain.name}`}
                                data-testid={testId}
                              />
                              <Label htmlFor={testId} className="sr-only">
                                {col.label} — {domain.name}
                              </Label>
                            </div>
                          </td>
                        );
                      })}
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </>
        ) : (
          <p className="text-foreground-muted py-12 text-center text-sm">
            Select a role to edit its permissions.
          </p>
        )}
      </div>
    </div>
  );
}
