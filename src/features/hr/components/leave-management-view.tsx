"use client";

import * as React from "react";
import type { Route } from "next";
import { format, parseISO } from "date-fns";
import type { ColumnDef } from "@tanstack/react-table";
import { parseAsString, useQueryState } from "nuqs";
import { Plus, Pencil, Trash2 } from "lucide-react";

import { CursorPagination } from "@/components/shared/cursor-pagination";
import {
  encodeLeaveRequestCursor,
  LEAVE_PAGE_SIZES,
  LEAVE_DEFAULT_PAGE_SIZE,
} from "@/features/hr/schemas/leave-management-filters";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";
import { StatusBadge } from "@/components/ui/status-badge";
import { FilterableDataTable } from "@/components/shared/filterable-data-table";
import { FilterBar } from "@/components/ui/filter-bar";
import { SearchInput } from "@/components/ui/search-input";
import { StandardPageShell } from "@/components/shared/standard-page-shell";
import { StatusTabBar } from "@/components/ui/status-tab-bar";
import { FormSheet } from "@/components/shared/form-sheet";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { toastSuccess, toastError } from "@/components/ui/toast-helpers";

import type {
  LeaveManagementData,
  LeaveRequestRow,
  LeaveBalanceRow,
  LeaveLedgerRow,
  LeaveTypeRow,
  LeavePolicyRow,
} from "@/features/hr/types/leave-management";
import {
  approveLeaveAction,
  rejectLeaveAction,
  cancelApprovedLeaveAction,
  createLedgerEntryAction,
  createLeaveTypeAction,
  updateLeaveTypeAction,
  deleteLeaveTypeAction,
  createPolicyAction,
  updatePolicyAction,
} from "@/features/hr/actions/leave-management-actions";

// ── Helpers ────────────────────────────────────────────────────────────

function txTypeLabel(t: string): string {
  switch (t) {
    case "accrual":
      return "Added";
    case "usage":
      return "Used";
    case "adjustment":
      return "Adjusted";
    case "carry_forward":
      return "Carried Forward";
    case "forfeiture":
      return "Forfeited";
    default:
      return t;
  }
}

// ── Props & Tabs ───────────────────────────────────────────────────────

const TABS = ["requests", "balances", "history", "policies", "types"] as const;
type TabValue = (typeof TABS)[number];

type Props = Readonly<{
  data: LeaveManagementData;
  canCreate: boolean;
  canUpdate: boolean;
  canDelete: boolean;
}>;

export function LeaveManagementView({ data, canCreate, canUpdate, canDelete }: Props) {
  return (
    <StandardPageShell
      breadcrumb={[
        { label: "HR", href: "/management/hr" as Route },
        { label: "Leave Management", current: true as const },
      ]}
      header={{
        title: "Leave Management",
        description: "Requests, balances, ledger history, and policy configuration.",
      }}
    >
      <StatusTabBar
        tabs={[
          { value: "requests", label: "Requests", count: data.pendingCount },
          { value: "balances", label: "Balances" },
          { value: "history", label: "Balance History" },
          { value: "policies", label: "Policy Setup" },
          { value: "types", label: "Leave Types" },
        ]}
        paramKey="tab"
        defaultValue="requests"
        ariaLabel="Leave management sections"
        panelIdPrefix="leave-tab"
        data-testid="hr-leave-tabs"
      />
      <LeaveTabContent
        data={data}
        canCreate={canCreate}
        canUpdate={canUpdate}
        canDelete={canDelete}
      />
    </StandardPageShell>
  );
}

function LeaveTabContent(props: Props) {
  const [tab] = useQueryState(
    "tab",
    parseAsString.withDefault("requests").withOptions({ clearOnDefault: true, history: "replace" }),
  );
  const current: TabValue = (TABS as readonly string[]).includes(tab)
    ? (tab as TabValue)
    : "requests";
  return (
    <div role="tabpanel" id={`leave-tab-${current}`} data-testid={`leave-panel-${current}`}>
      {current === "requests" && <RequestsTab {...props} />}
      {current === "balances" && <BalancesTab data={props.data} />}
      {current === "history" && <HistoryTab {...props} />}
      {current === "policies" && <PoliciesTab {...props} />}
      {current === "types" && <TypesTab {...props} />}
    </div>
  );
}

// ── Tab 1: Requests ────────────────────────────────────────────────────

function RequestsTab({ data, canUpdate }: Props) {
  const [search, setSearch] = useQueryState(
    "search",
    parseAsString
      .withDefault("")
      .withOptions({ clearOnDefault: true, history: "replace", shallow: false }),
  );
  const [statusFilter, setStatusFilter] = useQueryState(
    "status",
    parseAsString
      .withDefault("pending")
      .withOptions({ clearOnDefault: false, history: "replace", shallow: false }),
  );
  const [rejectOpen, setRejectOpen] = React.useState(false);
  const [cancelOpen, setCancelOpen] = React.useState(false);
  const [selected, setSelected] = React.useState<LeaveRequestRow | null>(null);
  const [pending, setPending] = React.useState(false);
  const rejectFormRef = React.useRef<HTMLFormElement>(null);

  const rows = data.requestsPage.rows;
  const nextCursorToken = data.requestsPage.nextCursor
    ? encodeLeaveRequestCursor(
        data.requestsPage.nextCursor.createdAt,
        data.requestsPage.nextCursor.id,
      )
    : null;

  const handleApprove = React.useCallback(async (row: LeaveRequestRow) => {
    setPending(true);
    try {
      const r = await approveLeaveAction({ requestId: row.id });
      if (r.success) toastSuccess("Leave approved");
      else toastError(r);
    } finally {
      setPending(false);
    }
  }, []);

  const handleReject = React.useCallback(async () => {
    if (!selected || !rejectFormRef.current) return;
    const fd = new FormData(rejectFormRef.current);
    setPending(true);
    try {
      const r = await rejectLeaveAction({
        requestId: selected.id,
        rejectionReason: fd.get("rejectionReason") as string,
      });
      if (r.success) {
        toastSuccess("Leave rejected");
        setRejectOpen(false);
        setSelected(null);
      } else toastError(r);
    } finally {
      setPending(false);
    }
  }, [selected]);

  const handleCancelConfirm = React.useCallback(async () => {
    if (!selected) return;
    setPending(true);
    try {
      const r = await cancelApprovedLeaveAction({ requestId: selected.id });
      if (r.success) {
        toastSuccess("Leave cancelled");
        setCancelOpen(false);
        setSelected(null);
      } else toastError(r);
    } finally {
      setPending(false);
    }
  }, [selected]);

  const cols = React.useMemo<ColumnDef<LeaveRequestRow, unknown>[]>(
    () => [
      { id: "staffName", accessorKey: "staffName", header: "Staff" },
      { id: "leaveTypeName", accessorKey: "leaveTypeName", header: "Type" },
      {
        id: "startDate",
        accessorKey: "startDate",
        header: "From",
        cell: ({ row }) => {
          try {
            return format(parseISO(row.original.startDate), "dd MMM yyyy");
          } catch {
            return row.original.startDate;
          }
        },
      },
      {
        id: "endDate",
        accessorKey: "endDate",
        header: "To",
        cell: ({ row }) => {
          try {
            return format(parseISO(row.original.endDate), "dd MMM yyyy");
          } catch {
            return row.original.endDate;
          }
        },
      },
      { id: "requestedDays", accessorKey: "requestedDays", header: "Days" },
      {
        id: "reason",
        accessorKey: "reason",
        header: "Reason",
        cell: ({ row }) => (
          <span className="text-muted-foreground max-w-[150px] truncate text-sm">
            {row.original.reason ?? "—"}
          </span>
        ),
      },
      {
        id: "status",
        accessorKey: "status",
        header: "Status",
        cell: ({ row }) => <StatusBadge status={row.original.status} />,
      },
      ...(canUpdate
        ? [
            {
              id: "actions",
              header: "",
              cell: ({ row }: { row: { original: LeaveRequestRow } }) => (
                <div className="flex gap-1">
                  {row.original.status === "pending" && (
                    <>
                      <Button
                        variant="default"
                        size="sm"
                        disabled={pending}
                        data-testid="hr-leave-approve"
                        onClick={() => handleApprove(row.original)}
                      >
                        Approve
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        disabled={pending}
                        data-testid="hr-leave-reject"
                        onClick={() => {
                          setSelected(row.original);
                          setRejectOpen(true);
                        }}
                      >
                        Reject
                      </Button>
                    </>
                  )}
                  {row.original.status === "approved" && (
                    <Button
                      variant="ghost"
                      size="sm"
                      disabled={pending}
                      data-testid="hr-leave-cancel"
                      onClick={() => {
                        setSelected(row.original);
                        setCancelOpen(true);
                      }}
                    >
                      Cancel
                    </Button>
                  )}
                </div>
              ),
            } satisfies ColumnDef<LeaveRequestRow, unknown>,
          ]
        : []),
    ],
    [canUpdate, pending, handleApprove],
  );

  return (
    <>
      <FilterableDataTable
        toolbar={
          <FilterBar
            data-testid="hr-leave-req-filters"
            search={
              <SearchInput
                value={search}
                onChange={setSearch}
                placeholder="Search staff…"
                data-testid="hr-leave-req-search"
              />
            }
            controls={
              <Select
                value={statusFilter ?? "pending"}
                onValueChange={(v) => void setStatusFilter(v)}
              >
                <SelectTrigger className="h-10 min-w-[10rem]" data-testid="hr-leave-req-status">
                  <SelectValue placeholder="Any status" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Statuses</SelectItem>
                  <SelectItem value="pending">Pending</SelectItem>
                  <SelectItem value="approved">Approved</SelectItem>
                  <SelectItem value="rejected">Rejected</SelectItem>
                  <SelectItem value="cancelled">Cancelled</SelectItem>
                </SelectContent>
              </Select>
            }
          />
        }
        table={{
          columns: cols,
          data: rows as LeaveRequestRow[],
          getRowId: (r) => r.id,
          mobileFieldPriority: ["staffName", "leaveTypeName", "status"],
        }}
        pagination={
          <CursorPagination
            nextCursorToken={nextCursorToken}
            defaultPageSize={LEAVE_DEFAULT_PAGE_SIZE}
            pageSizeOptions={LEAVE_PAGE_SIZES}
            data-testid="hr-leave-req-pagination"
          />
        }
        data-testid="hr-leave-req-table"
      />
      <FormSheet
        open={rejectOpen}
        onOpenChange={setRejectOpen}
        title="Reject Leave"
        description={`Reject leave request from ${selected?.staffName ?? "staff"}.`}
        onSubmit={handleReject}
        pending={pending}
        data-testid="hr-leave-reject-sheet"
      >
        <form ref={rejectFormRef} onSubmit={(e) => e.preventDefault()}>
          <div>
            <Label htmlFor="rejectionReason">Rejection Reason</Label>
            <Textarea
              id="rejectionReason"
              name="rejectionReason"
              required
              minLength={3}
              maxLength={500}
              data-testid="hr-leave-reject-reason"
            />
          </div>
        </form>
      </FormSheet>
      <ConfirmDialog
        open={cancelOpen}
        onOpenChange={(open) => {
          setCancelOpen(open);
          if (!open) setSelected(null);
        }}
        title="Cancel Approved Leave"
        description={`Cancel the approved leave for ${selected?.staffName ?? "staff"} (${selected?.leaveTypeName ?? ""}, ${selected?.requestedDays ?? 0} days). The balance will be restored.`}
        intent="warning"
        confirmLabel="Cancel Leave"
        onConfirm={handleCancelConfirm}
        pending={pending}
        data-testid="hr-leave-cancel-dialog"
      />
    </>
  );
}

// ── Tab 2: Balances ────────────────────────────────────────────────────

function BalancesTab({ data }: { data: LeaveManagementData }) {
  const [search, setSearch] = useQueryState(
    "bSearch",
    parseAsString.withDefault("").withOptions({ clearOnDefault: true, history: "replace" }),
  );
  const filtered = React.useMemo(() => {
    if (!search) return [...data.balances];
    const q = search.toLowerCase();
    return data.balances.filter(
      (r) => r.staffName.toLowerCase().includes(q) || r.leaveTypeName.toLowerCase().includes(q),
    );
  }, [data.balances, search]);

  const cols = React.useMemo<ColumnDef<LeaveBalanceRow, unknown>[]>(
    () => [
      { id: "staffName", accessorKey: "staffName", header: "Staff" },
      { id: "leaveTypeName", accessorKey: "leaveTypeName", header: "Leave Type" },
      { id: "fiscalYear", accessorKey: "fiscalYear", header: "Year" },
      { id: "accruedDays", accessorKey: "accruedDays", header: "Accrued" },
      { id: "carryForwardDays", accessorKey: "carryForwardDays", header: "C/F" },
      { id: "usedDays", accessorKey: "usedDays", header: "Used" },
      { id: "adjustmentDays", accessorKey: "adjustmentDays", header: "Adj" },
      {
        id: "balance",
        accessorKey: "balance",
        header: "Balance",
        cell: ({ row }) => <span className="font-semibold">{row.original.balance}</span>,
      },
    ],
    [],
  );

  return (
    <FilterableDataTable
      toolbar={
        <FilterBar
          data-testid="hr-leave-bal-filters"
          search={
            <SearchInput
              value={search}
              onChange={setSearch}
              placeholder="Search staff or type…"
              data-testid="hr-leave-bal-search"
            />
          }
        />
      }
      table={{
        columns: cols,
        data: filtered,
        getRowId: (r) => `${r.staffRecordId}-${r.leaveTypeId}-${r.fiscalYear}`,
        mobileFieldPriority: ["staffName", "leaveTypeName", "balance"],
      }}
      data-testid="hr-leave-bal-table"
    />
  );
}

// ── Tab 3: History ─────────────────────────────────────────────────────

function HistoryTab({ data, canCreate }: Props) {
  const [sheetOpen, setSheetOpen] = React.useState(false);
  const [pending, setPending] = React.useState(false);
  const formRef = React.useRef<HTMLFormElement>(null);

  const handleCreate = React.useCallback(async () => {
    if (!formRef.current) return;
    const fd = new FormData(formRef.current);
    setPending(true);
    try {
      const r = await createLedgerEntryAction({
        staffRecordId: fd.get("staffRecordId") as string,
        leaveTypeId: fd.get("leaveTypeId") as string,
        transactionType: fd.get("transactionType") as string,
        days: Number(fd.get("days")),
        fiscalYear: Number(fd.get("fiscalYear")),
        notes: (fd.get("notes") as string) || "",
      });
      if (r.success) {
        toastSuccess("Ledger entry created");
        setSheetOpen(false);
      } else toastError(r);
    } finally {
      setPending(false);
    }
  }, []);

  const cols = React.useMemo<ColumnDef<LeaveLedgerRow, unknown>[]>(
    () => [
      { id: "staffName", accessorKey: "staffName", header: "Staff" },
      { id: "leaveTypeName", accessorKey: "leaveTypeName", header: "Type" },
      {
        id: "transactionType",
        accessorKey: "transactionType",
        header: "Transaction",
        cell: ({ row }) => (
          <StatusBadge
            status={row.original.transactionType}
            label={txTypeLabel(row.original.transactionType)}
          />
        ),
      },
      {
        id: "days",
        accessorKey: "days",
        header: "Days",
        cell: ({ row }) => (
          <span className={row.original.days < 0 ? "text-destructive" : ""}>
            {row.original.days > 0 ? "+" : ""}
            {row.original.days}
          </span>
        ),
      },
      { id: "fiscalYear", accessorKey: "fiscalYear", header: "Year" },
      { id: "transactionDate", accessorKey: "transactionDate", header: "Date" },
      {
        id: "notes",
        accessorKey: "notes",
        header: "Notes",
        cell: ({ row }) => (
          <span className="text-muted-foreground max-w-[150px] truncate text-sm">
            {row.original.notes ?? "—"}
          </span>
        ),
      },
    ],
    [],
  );

  return (
    <>
      <div className="mb-3 flex items-center justify-between">
        <h3 className="text-foreground text-base font-semibold">Balance History</h3>
        {canCreate && (
          <Button size="sm" data-testid="hr-leave-add-entry" onClick={() => setSheetOpen(true)}>
            <Plus className="mr-1.5 size-4" /> Manual Entry
          </Button>
        )}
      </div>
      <FilterableDataTable
        table={{
          columns: cols,
          data: data.ledgerPage.rows as LeaveLedgerRow[],
          getRowId: (r) => r.id,
          mobileFieldPriority: ["staffName", "transactionType", "days"],
        }}
        pagination={
          <CursorPagination
            nextCursorToken={
              data.ledgerPage.nextCursor
                ? encodeLeaveRequestCursor(
                    data.ledgerPage.nextCursor.createdAt,
                    data.ledgerPage.nextCursor.id,
                  )
                : null
            }
            cursorParam="historyCursor"
            crumbsParam="historyCrumbs"
            defaultPageSize={LEAVE_DEFAULT_PAGE_SIZE}
            pageSizeOptions={LEAVE_PAGE_SIZES}
            pageSizeParam="historyPageSize"
            data-testid="hr-leave-ledger-pagination"
          />
        }
        data-testid="hr-leave-ledger-table"
      />
      <FormSheet
        open={sheetOpen}
        onOpenChange={setSheetOpen}
        title="Manual Ledger Entry"
        description="Add a manual balance transaction."
        onSubmit={handleCreate}
        pending={pending}
        data-testid="hr-leave-entry-sheet"
      >
        <form ref={formRef} className="flex flex-col gap-4" onSubmit={(e) => e.preventDefault()}>
          <div>
            <Label htmlFor="staffRecordId">Staff</Label>
            <Select name="staffRecordId" required>
              <SelectTrigger data-testid="hr-leave-entry-staff">
                <SelectValue placeholder="Select staff…" />
              </SelectTrigger>
              <SelectContent>
                {data.staffOptions.map((s) => (
                  <SelectItem key={s.id} value={s.id}>
                    {s.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div>
            <Label htmlFor="leaveTypeId">Leave Type</Label>
            <Select name="leaveTypeId" required>
              <SelectTrigger data-testid="hr-leave-entry-type">
                <SelectValue placeholder="Select type…" />
              </SelectTrigger>
              <SelectContent>
                {data.leaveTypes.map((lt) => (
                  <SelectItem key={lt.id} value={lt.id}>
                    {lt.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div>
            <Label htmlFor="transactionType">Transaction Type</Label>
            <Select name="transactionType" required>
              <SelectTrigger data-testid="hr-leave-entry-tx">
                <SelectValue placeholder="Select…" />
              </SelectTrigger>
              <SelectContent>
                {["accrual", "usage", "adjustment", "carry_forward", "forfeiture"].map((t) => (
                  <SelectItem key={t} value={t}>
                    {txTypeLabel(t)}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div>
            <Label htmlFor="days">Days</Label>
            <Input
              id="days"
              name="days"
              type="number"
              step="0.5"
              required
              data-testid="hr-leave-entry-days"
            />
          </div>
          <div>
            <Label htmlFor="fiscalYear">Fiscal Year</Label>
            <Input
              id="fiscalYear"
              name="fiscalYear"
              type="number"
              defaultValue={new Date().getFullYear()}
              required
              data-testid="hr-leave-entry-year"
            />
          </div>
          <div>
            <Label htmlFor="notes">Notes</Label>
            <Textarea id="notes" name="notes" maxLength={500} data-testid="hr-leave-entry-notes" />
          </div>
        </form>
      </FormSheet>
    </>
  );
}

// ── Tab 4: Policies ────────────────────────────────────────────────────

function PoliciesTab({ data, canCreate, canUpdate }: Props) {
  const [sheetOpen, setSheetOpen] = React.useState(false);
  const [editing, setEditing] = React.useState<LeavePolicyRow | null>(null);
  const [pending, setPending] = React.useState(false);
  const formRef = React.useRef<HTMLFormElement>(null);

  const handleSubmit = React.useCallback(async () => {
    if (!formRef.current) return;
    const fd = new FormData(formRef.current);
    setPending(true);
    try {
      const entitlements: { leaveTypeId: string; daysPerYear: number; frequency: string }[] = [];
      for (const lt of data.leaveTypes) {
        const days = fd.get(`ent_days_${lt.id}`);
        const freq = fd.get(`ent_freq_${lt.id}`);
        if (days && Number(days) > 0)
          entitlements.push({
            leaveTypeId: lt.id,
            daysPerYear: Number(days),
            frequency: (freq as string) || "annual_upfront",
          });
      }
      const payload = {
        ...(editing ? { id: editing.id } : {}),
        name: fd.get("name") as string,
        description: (fd.get("description") as string) || "",
        isActive: fd.get("isActive") === "on",
        entitlements,
      };
      const r = editing ? await updatePolicyAction(payload) : await createPolicyAction(payload);
      if (r.success) {
        toastSuccess(editing ? "Policy updated" : "Policy created");
        setSheetOpen(false);
        setEditing(null);
      } else toastError(r);
    } finally {
      setPending(false);
    }
  }, [editing, data.leaveTypes]);

  const cols = React.useMemo<ColumnDef<LeavePolicyRow, unknown>[]>(
    () => [
      { id: "name", accessorKey: "name", header: "Policy" },
      {
        id: "description",
        accessorKey: "description",
        header: "Description",
        cell: ({ row }) => row.original.description ?? "—",
      },
      {
        id: "entitlements",
        header: "Entitlements",
        cell: ({ row }) =>
          row.original.entitlements.length > 0
            ? row.original.entitlements
                .map((e) => `${e.leaveTypeName}: ${e.daysPerYear}d`)
                .join(", ")
            : "—",
      },
      {
        id: "status",
        accessorKey: "isActive",
        header: "Status",
        cell: ({ row }) => <StatusBadge status={row.original.isActive ? "active" : "inactive"} />,
      },
      ...(canUpdate
        ? [
            {
              id: "actions",
              header: "",
              cell: ({ row }: { row: { original: LeavePolicyRow } }) => (
                <Button
                  variant="ghost"
                  size="icon"
                  data-testid="hr-leave-edit-policy"
                  onClick={() => {
                    setEditing(row.original);
                    setSheetOpen(true);
                  }}
                >
                  <Pencil className="size-4" />
                </Button>
              ),
            } satisfies ColumnDef<LeavePolicyRow, unknown>,
          ]
        : []),
    ],
    [canUpdate],
  );

  return (
    <>
      <div className="mb-3 flex items-center justify-between">
        <h3 className="text-foreground text-base font-semibold">Leave Policies</h3>
        {canCreate && (
          <Button
            size="sm"
            data-testid="hr-leave-add-policy"
            onClick={() => {
              setEditing(null);
              setSheetOpen(true);
            }}
          >
            <Plus className="mr-1.5 size-4" /> Add Policy
          </Button>
        )}
      </div>
      <FilterableDataTable
        table={{
          columns: cols,
          data: data.policies as LeavePolicyRow[],
          getRowId: (r) => r.id,
          mobileFieldPriority: ["name", "status"],
        }}
        data-testid="hr-leave-policy-table"
      />
      <FormSheet
        open={sheetOpen}
        onOpenChange={setSheetOpen}
        title={editing ? "Edit Policy" : "New Policy"}
        description="Configure policy and entitlements."
        onSubmit={handleSubmit}
        pending={pending}
        data-testid="hr-leave-policy-sheet"
      >
        <form ref={formRef} className="flex flex-col gap-4" onSubmit={(e) => e.preventDefault()}>
          <div>
            <Label htmlFor="name">Name</Label>
            <Input
              id="name"
              name="name"
              required
              defaultValue={editing?.name ?? ""}
              data-testid="hr-leave-policy-name"
            />
          </div>
          <div>
            <Label htmlFor="description">Description</Label>
            <Textarea
              id="description"
              name="description"
              defaultValue={editing?.description ?? ""}
              data-testid="hr-leave-policy-desc"
            />
          </div>
          <div className="flex items-center gap-2">
            <Switch id="isActive" name="isActive" defaultChecked={editing?.isActive ?? true} />
            <Label htmlFor="isActive">Active</Label>
          </div>
          <fieldset className="border-border space-y-2 rounded-md border p-3">
            <legend className="text-sm font-medium">Entitlements per Leave Type</legend>
            {data.leaveTypes
              .filter((lt) => lt.isActive)
              .map((lt) => {
                const existing = editing?.entitlements.find((e) => e.leaveTypeId === lt.id);
                return (
                  <div key={lt.id} className="grid grid-cols-3 items-center gap-2">
                    <span className="text-sm">{lt.name}</span>
                    <Input
                      name={`ent_days_${lt.id}`}
                      type="number"
                      step="0.5"
                      min="0"
                      placeholder="Days/yr"
                      defaultValue={existing?.daysPerYear ?? ""}
                    />
                    <Select
                      name={`ent_freq_${lt.id}`}
                      defaultValue={existing?.frequency ?? "annual_upfront"}
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="annual_upfront">Annual</SelectItem>
                        <SelectItem value="monthly_prorated">Monthly</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                );
              })}
          </fieldset>
        </form>
      </FormSheet>
    </>
  );
}

// ── Tab 5: Leave Types ─────────────────────────────────────────────────

function TypesTab({ data, canCreate, canUpdate, canDelete }: Props) {
  const [sheetOpen, setSheetOpen] = React.useState(false);
  const [deleteOpen, setDeleteOpen] = React.useState(false);
  const [editing, setEditing] = React.useState<LeaveTypeRow | null>(null);
  const [deleting, setDeleting] = React.useState<LeaveTypeRow | null>(null);
  const [pending, setPending] = React.useState(false);
  const formRef = React.useRef<HTMLFormElement>(null);

  const handleSubmit = React.useCallback(async () => {
    if (!formRef.current) return;
    const fd = new FormData(formRef.current);
    setPending(true);
    try {
      const payload = {
        ...(editing ? { id: editing.id } : {}),
        code: fd.get("code") as string,
        name: fd.get("name") as string,
        isPaid: fd.get("isPaid") === "on",
        isActive: fd.get("isActive") === "on",
      };
      const r = editing
        ? await updateLeaveTypeAction(payload)
        : await createLeaveTypeAction(payload);
      if (r.success) {
        toastSuccess(editing ? "Updated" : "Created");
        setSheetOpen(false);
        setEditing(null);
      } else toastError(r);
    } finally {
      setPending(false);
    }
  }, [editing]);

  const handleDeleteConfirm = React.useCallback(async () => {
    if (!deleting) return;
    setPending(true);
    try {
      const r = await deleteLeaveTypeAction({ id: deleting.id });
      if (r.success) {
        toastSuccess("Deleted");
        setDeleteOpen(false);
        setDeleting(null);
      } else toastError(r);
    } finally {
      setPending(false);
    }
  }, [deleting]);

  const cols = React.useMemo<ColumnDef<LeaveTypeRow, unknown>[]>(
    () => [
      { id: "code", accessorKey: "code", header: "Code" },
      { id: "name", accessorKey: "name", header: "Name" },
      {
        id: "isPaid",
        accessorKey: "isPaid",
        header: "Paid",
        cell: ({ row }) => <StatusBadge status={row.original.isPaid ? "active" : "inactive"} />,
      },
      {
        id: "isActive",
        accessorKey: "isActive",
        header: "Status",
        cell: ({ row }) => <StatusBadge status={row.original.isActive ? "active" : "inactive"} />,
      },
      ...(canUpdate || canDelete
        ? [
            {
              id: "actions",
              header: "",
              cell: ({ row }: { row: { original: LeaveTypeRow } }) => (
                <div className="flex gap-1">
                  {canUpdate && (
                    <Button
                      variant="ghost"
                      size="icon"
                      data-testid="hr-leave-edit-type"
                      onClick={() => {
                        setEditing(row.original);
                        setSheetOpen(true);
                      }}
                    >
                      <Pencil className="size-4" />
                    </Button>
                  )}
                  {canDelete && (
                    <Button
                      variant="ghost"
                      size="icon"
                      data-testid="hr-leave-delete-type"
                      onClick={() => {
                        setDeleting(row.original);
                        setDeleteOpen(true);
                      }}
                    >
                      <Trash2 className="size-4" />
                    </Button>
                  )}
                </div>
              ),
            } satisfies ColumnDef<LeaveTypeRow, unknown>,
          ]
        : []),
    ],
    [canUpdate, canDelete],
  );

  return (
    <>
      <div className="mb-3 flex items-center justify-between">
        <h3 className="text-foreground text-base font-semibold">Leave Types</h3>
        {canCreate && (
          <Button
            size="sm"
            data-testid="hr-leave-add-type"
            onClick={() => {
              setEditing(null);
              setSheetOpen(true);
            }}
          >
            <Plus className="mr-1.5 size-4" /> Add Type
          </Button>
        )}
      </div>
      <FilterableDataTable
        table={{
          columns: cols,
          data: data.leaveTypes as LeaveTypeRow[],
          getRowId: (r) => r.id,
          mobileFieldPriority: ["code", "name", "isActive"],
        }}
        data-testid="hr-leave-type-table"
      />
      <FormSheet
        open={sheetOpen}
        onOpenChange={setSheetOpen}
        title={editing ? "Edit Leave Type" : "New Leave Type"}
        description="Configure leave type."
        onSubmit={handleSubmit}
        pending={pending}
        data-testid="hr-leave-type-sheet"
      >
        <form ref={formRef} className="flex flex-col gap-4" onSubmit={(e) => e.preventDefault()}>
          <div>
            <Label htmlFor="code">Code</Label>
            <Input
              id="code"
              name="code"
              required
              maxLength={20}
              defaultValue={editing?.code ?? ""}
              data-testid="hr-leave-type-code"
            />
          </div>
          <div>
            <Label htmlFor="name">Name</Label>
            <Input
              id="name"
              name="name"
              required
              maxLength={100}
              defaultValue={editing?.name ?? ""}
              data-testid="hr-leave-type-name"
            />
          </div>
          <div className="flex items-center gap-2">
            <Switch id="isPaid" name="isPaid" defaultChecked={editing?.isPaid ?? false} />
            <Label htmlFor="isPaid">Paid Leave</Label>
          </div>
          <div className="flex items-center gap-2">
            <Switch id="isActive" name="isActive" defaultChecked={editing?.isActive ?? true} />
            <Label htmlFor="isActive">Active</Label>
          </div>
        </form>
      </FormSheet>
      <ConfirmDialog
        open={deleteOpen}
        onOpenChange={(open) => {
          setDeleteOpen(open);
          if (!open) setDeleting(null);
        }}
        title="Delete Leave Type"
        description={`Permanently delete leave type "${deleting?.name ?? ""}" (${deleting?.code ?? ""}). This cannot be undone.`}
        intent="destructive"
        confirmLabel="Delete"
        onConfirm={handleDeleteConfirm}
        pending={pending}
        data-testid="hr-leave-delete-type-dialog"
      />
    </>
  );
}
