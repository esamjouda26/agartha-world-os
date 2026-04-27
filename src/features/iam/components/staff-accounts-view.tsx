"use client";

import * as React from "react";
import { ShieldAlert, ShieldOff, ShieldCheck, MoreHorizontal, Users } from "lucide-react";
import type { ColumnDef } from "@tanstack/react-table";

import { StatusBadge } from "@/components/ui/status-badge";
import { FilterableDataTable } from "@/components/shared/filterable-data-table";
import { FilterBar } from "@/components/ui/filter-bar";
import { FilterChip } from "@/components/ui/filter-chip";
import { UrlSearchInput } from "@/components/shared/url-search-input";
import { useUrlString } from "@/components/shared/url-state-helpers";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { toastSuccess, toastError } from "@/components/ui/toast-helpers";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

import type { StaffAccountsData, StaffAccountRow } from "@/features/iam/queries/get-staff-accounts";
import { directAccountAction } from "@/features/iam/actions/process-iam-request";

// ── Constants ──────────────────────────────────────────────────────────

const EMPLOYMENT_STATUSES = ["active", "pending", "on_leave", "suspended", "terminated"] as const;
type EmploymentStatus = (typeof EMPLOYMENT_STATUSES)[number];

const STATUS_LABELS: Record<EmploymentStatus, string> = {
  active: "Active",
  pending: "Pending",
  on_leave: "On Leave",
  suspended: "Suspended",
  terminated: "Terminated",
};

const STATUS_TONE: Record<string, "success" | "warning" | "danger" | "info" | "neutral"> = {
  active: "success",
  pending: "info",
  on_leave: "warning",
  suspended: "danger",
  terminated: "neutral",
};

type AccountActionType = "suspend" | "terminate" | "reactivate";

const ACTION_CONFIG: Record<
  AccountActionType,
  {
    title: string;
    descriptionFn: (name: string) => string;
    icon: React.ReactNode;
    variant: "destructive" | "default";
    confirmLabel: string;
    serverType: "suspension" | "termination" | "reactivation";
    remarkRequired: boolean;
  }
> = {
  suspend: {
    title: "Suspend Account",
    descriptionFn: (name) =>
      `Suspend ${name}'s account. They will be locked out immediately and all active sessions will be invalidated.`,
    icon: <ShieldAlert aria-hidden className="size-4" />,
    variant: "destructive",
    confirmLabel: "Suspend Account",
    serverType: "suspension",
    remarkRequired: true,
  },
  terminate: {
    title: "Terminate Account",
    descriptionFn: (name) =>
      `Permanently terminate ${name}'s account. This will revoke all access and lock the auth user.`,
    icon: <ShieldOff aria-hidden className="size-4" />,
    variant: "destructive",
    confirmLabel: "Terminate Account",
    serverType: "termination",
    remarkRequired: true,
  },
  reactivate: {
    title: "Reactivate Account",
    descriptionFn: (name) =>
      `Reactivate ${name}'s account. This will unlock the auth user and restore their employment status to active.`,
    icon: <ShieldCheck aria-hidden className="size-4" />,
    variant: "default",
    confirmLabel: "Reactivate Account",
    serverType: "reactivation",
    remarkRequired: false,
  },
};

// ── Props ──────────────────────────────────────────────────────────────

type StaffAccountsViewProps = Readonly<{
  data: StaffAccountsData;
}>;

// ── Component ──────────────────────────────────────────────────────────

export function StaffAccountsView({ data }: StaffAccountsViewProps) {
  const statusFilter = useUrlString("account_status");
  const [dialogState, setDialogState] = React.useState<{
    action: AccountActionType;
    row: StaffAccountRow;
  } | null>(null);

  // Filter data
  const filteredAccounts = React.useMemo(() => {
    let result = [...data.accounts];

    // Status filter
    if (
      statusFilter.value &&
      EMPLOYMENT_STATUSES.includes(statusFilter.value as EmploymentStatus)
    ) {
      result = result.filter((r) => r.employmentStatus === statusFilter.value);
    }

    return result;
  }, [data.accounts, statusFilter.value]);

  const hasActiveFilters = Boolean(statusFilter.value);

  const resetAll = (): void => {
    statusFilter.set(null);
  };

  // Filter chips
  const chips: React.ReactNode[] = [];
  if (statusFilter.value) {
    chips.push(
      <FilterChip
        key="account_status"
        name="Status"
        label={STATUS_LABELS[statusFilter.value as EmploymentStatus] ?? statusFilter.value}
        onRemove={() => statusFilter.set(null)}
        data-testid="staff-accounts-filter-chip-status"
      />,
    );
  }

  // Available actions per row based on current status
  const getAvailableActions = React.useCallback((status: string): AccountActionType[] => {
    switch (status) {
      case "active":
      case "on_leave":
        return ["suspend", "terminate"];
      case "suspended":
        return ["reactivate", "terminate"];
      case "terminated":
        return ["reactivate"];
      default:
        return [];
    }
  }, []);

  // Columns
  const columns = React.useMemo<ColumnDef<StaffAccountRow, unknown>[]>(
    () => [
      {
        id: "name",
        accessorKey: "legalName",
        header: "Name",
        cell: ({ row }) => (
          <div className="flex flex-col gap-0.5">
            <span className="text-foreground font-medium">
              {row.original.displayName ?? row.original.legalName}
            </span>
            {row.original.employeeId ? (
              <span className="text-foreground-muted font-mono text-xs">
                {row.original.employeeId}
              </span>
            ) : null}
          </div>
        ),
      },
      {
        id: "role",
        accessorKey: "roleName",
        header: "Role",
        cell: ({ row }) => row.original.roleName ?? "—",
      },
      {
        id: "orgUnit",
        accessorKey: "orgUnitName",
        header: "Org Unit",
        cell: ({ row }) => row.original.orgUnitName ?? "—",
      },
      {
        id: "status",
        accessorKey: "employmentStatus",
        header: "Status",
        cell: ({ row }) => (
          <StatusBadge
            status={row.original.employmentStatus}
            label={
              STATUS_LABELS[row.original.employmentStatus as EmploymentStatus] ??
              row.original.employmentStatus
            }
            tone={STATUS_TONE[row.original.employmentStatus] ?? "neutral"}
            data-testid={`staff-account-status-${row.original.id}`}
          />
        ),
        meta: { headerClassName: "w-0 whitespace-nowrap", cellClassName: "w-0 whitespace-nowrap" },
      },
      {
        id: "email",
        accessorKey: "email",
        header: "Email",
        cell: ({ row }) => (
          <span className="text-foreground-muted text-sm">{row.original.email ?? "—"}</span>
        ),
      },
      {
        id: "actions",
        header: "",
        cell: ({ row }) => {
          const actions = getAvailableActions(row.original.employmentStatus);
          if (actions.length === 0 || !row.original.profileId) return null;
          return (
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button
                  variant="ghost"
                  size="sm"
                  className="size-8 p-0"
                  data-testid={`staff-account-actions-${row.original.id}`}
                >
                  <MoreHorizontal aria-hidden className="size-4" />
                  <span className="sr-only">Actions</span>
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                {actions.map((action) => (
                  <DropdownMenuItem
                    key={action}
                    onClick={(e) => {
                      e.stopPropagation();
                      setDialogState({ action, row: row.original });
                    }}
                    className={
                      action === "suspend" || action === "terminate"
                        ? "text-destructive focus:text-destructive"
                        : ""
                    }
                    data-testid={`staff-account-${action}-${row.original.id}`}
                  >
                    {ACTION_CONFIG[action].icon}
                    <span className="ml-2">
                      {ACTION_CONFIG[action].title.replace(" Account", "")}
                    </span>
                  </DropdownMenuItem>
                ))}
              </DropdownMenuContent>
            </DropdownMenu>
          );
        },
        meta: { headerClassName: "w-0", cellClassName: "w-0" },
      },
    ],
    [getAvailableActions],
  );

  return (
    <>
      <FilterableDataTable<StaffAccountRow>
        toolbar={
          <FilterBar
            data-testid="staff-accounts-filters"
            hasActiveFilters={hasActiveFilters}
            onClearAll={resetAll}
            search={
              <UrlSearchInput
                param="account_q"
                placeholder="Search by name or employee ID…"
                aria-label="Search staff"
                debounceMs={300}
                data-testid="staff-accounts-search"
              />
            }
            controls={
              <Select
                value={statusFilter.value ?? ""}
                onValueChange={(next) => statusFilter.set(next === "" ? null : next)}
              >
                <SelectTrigger
                  className="h-10 min-w-[10rem] sm:w-auto"
                  aria-label="Employment status"
                  data-testid="staff-accounts-filter-status"
                >
                  <SelectValue placeholder="Any status" />
                </SelectTrigger>
                <SelectContent>
                  {EMPLOYMENT_STATUSES.map((s) => (
                    <SelectItem key={s} value={s}>
                      {STATUS_LABELS[s]}
                      {data.statusCounts[s] ? ` (${data.statusCounts[s]})` : ""}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            }
            chips={chips.length > 0 ? chips : null}
          />
        }
        table={{
          data: filteredAccounts,
          columns,
          mobileFieldPriority: ["name", "status", "role", "actions"],
          getRowId: (row) => row.id,
        }}
        hasActiveFilters={hasActiveFilters}
        emptyState={{
          variant: "filtered-out" as const,
          title: "No staff accounts match your filters",
          description: "Adjust the filters to see more accounts.",
          icon: <Users className="size-8" />,
        }}
        data-testid="staff-accounts-table"
      />

      {/* ── Action Confirmation Dialog ──────────────────────────────── */}
      {dialogState ? (
        <AccountActionDialog
          action={dialogState.action}
          row={dialogState.row}
          onClose={() => setDialogState(null)}
        />
      ) : null}
    </>
  );
}

// ── Action Confirmation Dialog ─────────────────────────────────────────

function AccountActionDialog({
  action,
  row,
  onClose,
}: Readonly<{
  action: AccountActionType;
  row: StaffAccountRow;
  onClose: () => void;
}>) {
  const config = ACTION_CONFIG[action];
  const staffName = row.displayName ?? row.legalName;
  const [itRemark, setItRemark] = React.useState("");
  const [isPending, startTransition] = React.useTransition();

  const handleConfirm = () => {
    startTransition(async () => {
      const result = await directAccountAction({
        staffRecordId: row.id,
        actionType: config.serverType,
        ...(itRemark.trim() ? { itRemark: itRemark.trim() } : {}),
      });
      if (result.success) {
        toastSuccess(
          action === "suspend"
            ? "Account suspended"
            : action === "terminate"
              ? "Account terminated"
              : "Account reactivated",
        );
        onClose();
      } else {
        toastError(result);
      }
    });
  };

  const isConfirmDisabled = isPending || (config.remarkRequired && itRemark.trim().length === 0);

  return (
    <Dialog
      open
      onOpenChange={(open) => {
        if (!open) onClose();
      }}
    >
      <DialogContent data-testid="staff-account-action-dialog">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            {config.icon} {config.title}
          </DialogTitle>
          <DialogDescription>{config.descriptionFn(staffName)}</DialogDescription>
        </DialogHeader>
        <div className="flex flex-col gap-2">
          <Label htmlFor="staff-account-remark">
            IT Note {config.remarkRequired ? "*" : "(optional)"}
          </Label>
          <Textarea
            id="staff-account-remark"
            value={itRemark}
            onChange={(e) => setItRemark(e.target.value)}
            placeholder="Reason for this action…"
            rows={3}
            data-testid="staff-account-action-remark"
          />
        </div>
        <DialogFooter>
          <DialogClose asChild>
            <Button type="button" variant="outline">
              Cancel
            </Button>
          </DialogClose>
          <Button
            type="button"
            variant={config.variant}
            disabled={isConfirmDisabled}
            onClick={handleConfirm}
            data-testid="staff-account-action-confirm"
          >
            {isPending ? "Processing…" : config.confirmLabel}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
