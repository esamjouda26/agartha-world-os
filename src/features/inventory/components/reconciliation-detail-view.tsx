"use client";

import * as React from "react";
import type { Route } from "next";
import { useRouter } from "@/i18n/navigation";
import {
  ScanLine,
  AlertTriangle,
  CheckCircle2,
  RotateCcw,
  TrendingDown,
  TrendingUp,
} from "lucide-react";
import type { ColumnDef } from "@tanstack/react-table";

import { DetailPageShell } from "@/components/shared/detail-page-shell";
import { SectionCard } from "@/components/ui/section-card";
import { DataTable } from "@/components/ui/data-table";
import { Button } from "@/components/ui/button";
import { StatusBadge } from "@/components/ui/status-badge";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import { SearchableSelect } from "@/components/ui/searchable-select";
import { toastSuccess, toastError } from "@/components/ui/toast-helpers";

import type {
  ReconciliationDetailData,
  ReconciliationDetailItem,
} from "@/features/inventory/types";
import { approveReconciliation } from "@/features/inventory/actions/approve-reconciliation";
import { requestRecount } from "@/features/inventory/actions/request-recount";

const QTY = new Intl.NumberFormat("en-MY", { maximumFractionDigits: 2 });
const SIGNED_QTY = new Intl.NumberFormat("en-MY", {
  maximumFractionDigits: 2,
  signDisplay: "exceptZero",
});

const STATUS_LABELS: Record<string, string> = {
  pending: "Pending",
  in_progress: "In Progress",
  pending_review: "Awaiting Review",
  completed: "Completed",
  cancelled: "Cancelled",
};

function formatTimestamp(iso: string | null): string {
  if (!iso) return "—";
  return new Date(iso).toLocaleString("en-MY", {
    year: "numeric",
    month: "short",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
  });
}

type Props = Readonly<{
  data: ReconciliationDetailData;
  /** When false, approve + recount actions are hidden. */
  canMutate: boolean;
  locale: string;
}>;

export function ReconciliationDetailView({
  data,
  canMutate,
  locale,
}: Props) {
  const router = useRouter();
  void locale;
  const isReviewable = data.status === "pending_review";

  const [approveOpen, setApproveOpen] = React.useState(false);
  const [recountOpen, setRecountOpen] = React.useState(false);
  const [approvePending, setApprovePending] = React.useState(false);
  const [recountPending, setRecountPending] = React.useState(false);
  const [recountAssigneeId, setRecountAssigneeId] = React.useState<
    string | null
  >(data.assignedToId);

  const handleApprove = async (): Promise<void> => {
    setApprovePending(true);
    try {
      const result = await approveReconciliation({
        reconciliationId: data.id,
      });
      if (result.success) {
        toastSuccess(
          result.data.discrepancyFound
            ? "Adjustments approved"
            : "Count confirmed",
          {
            description: result.data.discrepancyFound
              ? "Goods movements created from variance."
              : "All quantities matched system snapshot.",
          },
        );
        setApproveOpen(false);
        router.refresh();
      } else {
        toastError(result);
      }
    } finally {
      setApprovePending(false);
    }
  };

  const handleRecount = async (): Promise<void> => {
    setRecountPending(true);
    try {
      const result = await requestRecount({
        reconciliationId: data.id,
        newAssigneeId: recountAssigneeId,
      });
      if (result.success) {
        toastSuccess("Recount requested", {
          description: "Items cleared. Runner can recount at the count surface.",
        });
        setRecountOpen(false);
        router.refresh();
      } else {
        toastError(result);
      }
    } finally {
      setRecountPending(false);
    }
  };

  const breadcrumb = [
    { label: "Inventory", href: "/management/inventory" as Route },
    {
      label: "Reconciliation",
      href: "/management/inventory/reconciliation" as Route,
    },
    { label: data.id.slice(0, 8), current: true as const },
  ];

  const columns = React.useMemo<
    ColumnDef<ReconciliationDetailItem, unknown>[]
  >(
    () => [
      {
        id: "material",
        header: "Material",
        cell: ({ row }) => (
          <span className="text-foreground font-medium">
            {row.original.materialName}
          </span>
        ),
      },
      {
        id: "system",
        header: "System",
        cell: ({ row }) => (
          <span className="text-foreground tabular-nums">
            {QTY.format(row.original.systemQty)}
            {row.original.baseUnitAbbreviation ? (
              <span className="text-foreground-muted ml-1">
                {row.original.baseUnitAbbreviation}
              </span>
            ) : null}
          </span>
        ),
        meta: {
          headerClassName: "text-right whitespace-nowrap",
          cellClassName: "text-right whitespace-nowrap",
        },
      },
      {
        id: "physical",
        header: "Physical",
        cell: ({ row }) => (
          <span className="text-foreground tabular-nums">
            {QTY.format(row.original.physicalQty)}
            {row.original.baseUnitAbbreviation ? (
              <span className="text-foreground-muted ml-1">
                {row.original.baseUnitAbbreviation}
              </span>
            ) : null}
          </span>
        ),
        meta: {
          headerClassName: "text-right whitespace-nowrap",
          cellClassName: "text-right whitespace-nowrap",
        },
      },
      {
        id: "variance",
        header: "Variance",
        cell: ({ row }) => {
          const v = row.original.variance;
          if (v === 0) {
            return <span className="text-foreground-muted text-sm">—</span>;
          }
          const Icon = v > 0 ? TrendingUp : TrendingDown;
          const tone =
            v > 0
              ? "text-status-info-foreground"
              : "text-status-warning-foreground";
          return (
            <span
              className={`inline-flex items-center gap-1 tabular-nums font-medium ${tone}`}
            >
              <Icon aria-hidden className="size-3.5" />
              {SIGNED_QTY.format(v)}
              {row.original.baseUnitAbbreviation ? (
                <span className="text-foreground-muted ml-1 font-normal">
                  {row.original.baseUnitAbbreviation}
                </span>
              ) : null}
            </span>
          );
        },
        meta: {
          headerClassName: "text-right whitespace-nowrap",
          cellClassName: "text-right whitespace-nowrap",
        },
      },
    ],
    [],
  );

  const approveLabel = data.hasVariance ? "Approve adjustments" : "Confirm count";

  const assigneeOptions = React.useMemo(
    () =>
      data.assignees.map((a) => ({
        value: a.userId,
        label: a.displayName,
      })),
    [data.assignees],
  );

  return (
    <DetailPageShell
      data-testid="inventory-reconciliation-detail"
      breadcrumb={breadcrumb}
      header={{
        eyebrow: "Stock Reconciliation",
        title: data.locationName,
        description: data.managerRemark ?? undefined,
        status: data.status ? (
          <StatusBadge
            status={data.status}
            label={STATUS_LABELS[data.status] ?? data.status}
            data-testid="inventory-reconciliation-detail-status"
          />
        ) : undefined,
        metadata: [
          {
            label: "Scheduled",
            value: `${data.scheduledDate} · ${data.scheduledTime.slice(0, 5)}`,
          },
          { label: "Runner", value: data.assignedToName ?? "—" },
          {
            label: "Items",
            value: String(data.items.length),
          },
          {
            label: "Variance",
            value: data.hasVariance
              ? `${QTY.format(data.totalAbsVariance)} total |Δ|`
              : "None",
          },
          ...(data.crewRemark
            ? [{ label: "Runner note", value: data.crewRemark }]
            : []),
        ],
        primaryAction:
          canMutate && isReviewable ? (
            <Button
              type="button"
              variant={data.hasVariance ? "default" : "default"}
              size="sm"
              onClick={() => setApproveOpen(true)}
              data-testid="inventory-reconciliation-detail-approve"
            >
              <CheckCircle2 aria-hidden className="size-4" /> {approveLabel}
            </Button>
          ) : undefined,
        secondaryActions:
          canMutate && isReviewable ? (
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => {
                setRecountAssigneeId(data.assignedToId);
                setRecountOpen(true);
              }}
              data-testid="inventory-reconciliation-detail-recount"
            >
              <RotateCcw aria-hidden className="size-4" /> Request recount
            </Button>
          ) : undefined,
        "data-testid": "inventory-reconciliation-detail-header",
      }}
    >
      <SectionCard
        title={
          <span className="flex items-center gap-2">
            <ScanLine aria-hidden className="size-4" />
            Items
          </span>
        }
        description={
          data.hasVariance
            ? `${data.items.filter((i) => i.variance !== 0).length} of ${data.items.length} item${data.items.length === 1 ? "" : "s"} differ from system_qty`
            : "All counts match system snapshot."
        }
        data-testid="inventory-reconciliation-detail-items-section"
      >
        <DataTable<ReconciliationDetailItem>
          data={data.items}
          columns={columns}
          mobileFieldPriority={["material", "system", "physical", "variance"]}
          getRowId={(row) => row.id}
          frame="none"
          toolbar="none"
          empty={
            <p className="text-foreground-muted py-8 text-center text-sm">
              No items recorded for this count.
            </p>
          }
          data-testid="inventory-reconciliation-detail-items-table"
        />
      </SectionCard>

      {data.status === "completed" ? (
        <SectionCard
          title={
            <span className="flex items-center gap-2">
              <CheckCircle2 aria-hidden className="size-4" /> Approved
            </span>
          }
          description={
            data.discrepancyFound
              ? "Adjustments approved — `goods_movements` 701/702 entries created automatically by the approval trigger."
              : "Count confirmed with no variance — no goods movements created."
          }
          data-testid="inventory-reconciliation-detail-completed"
        >
          <p className="text-foreground-muted text-sm">
            Completed {formatTimestamp(data.updatedAt)}.
          </p>
        </SectionCard>
      ) : null}

      {data.status === "cancelled" ? (
        <SectionCard
          title={
            <span className="flex items-center gap-2">
              <AlertTriangle aria-hidden className="size-4" /> Cancelled
            </span>
          }
          description="This count was cancelled and no longer affects stock balances."
          data-testid="inventory-reconciliation-detail-cancelled"
        >
          <p className="text-foreground-muted text-sm">
            Cancelled {formatTimestamp(data.updatedAt)}.
          </p>
        </SectionCard>
      ) : null}

      {/* ── Approve confirm ───────────────────────────────────────── */}
      <ConfirmDialog
        open={approveOpen}
        onOpenChange={setApproveOpen}
        intent={data.hasVariance ? "warning" : "info"}
        title={
          data.hasVariance ? "Approve adjustments?" : "Confirm count?"
        }
        description={
          data.hasVariance
            ? `Variance found in ${data.items.filter((i) => i.variance !== 0).length} item${data.items.filter((i) => i.variance !== 0).length === 1 ? "" : "s"}. Approving creates goods_movements entries (type 701/702) per varied item to bring stock_balance_cache in line with the physical count.`
            : "All counts match the system snapshot. Approving closes this reconciliation with no variance — no goods movements will be created."
        }
        confirmLabel={approveLabel}
        cancelLabel="Cancel"
        onConfirm={handleApprove}
        pending={approvePending}
        data-testid="inventory-reconciliation-detail-approve-confirm"
      />

      {/* ── Recount confirm ───────────────────────────────────────── */}
      <ConfirmDialog
        open={recountOpen}
        onOpenChange={setRecountOpen}
        intent="warning"
        title="Request recount?"
        description="All current items will be cleared and the count returns to in-progress. The runner can re-enter physical_qty per material at /crew/logistics/stock-count."
        confirmLabel="Request recount"
        cancelLabel="Cancel"
        onConfirm={handleRecount}
        pending={recountPending}
        data-testid="inventory-reconciliation-detail-recount-confirm"
      >
        <div className="flex flex-col gap-1.5">
          <span className="text-xs font-medium">Reassign runner (optional)</span>
          <SearchableSelect
            value={recountAssigneeId}
            onChange={(v) => setRecountAssigneeId(v)}
            options={assigneeOptions}
            placeholder="Keep current runner"
            searchPlaceholder="Search staff…"
            data-testid="inventory-reconciliation-detail-recount-assignee"
          />
          <span className="text-foreground-muted text-xs">
            Leave to keep{" "}
            <span className="font-medium">
              {data.assignedToName ?? "the current runner"}
            </span>
            .
          </span>
        </div>
      </ConfirmDialog>
    </DetailPageShell>
  );
}
