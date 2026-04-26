"use client";

import * as React from "react";
import type { Route } from "next";
import { useRouter } from "@/i18n/navigation";
import {
  ArrowRight,
  ClipboardList,
  Ban,
  UserCog,
  Truck,
} from "lucide-react";
import type { ColumnDef } from "@tanstack/react-table";

import { DetailPageShell } from "@/components/shared/detail-page-shell";
import { SectionCard } from "@/components/ui/section-card";
import { DataTable } from "@/components/ui/data-table";
import { Button } from "@/components/ui/button";
import { StatusBadge } from "@/components/ui/status-badge";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import { SearchableSelect } from "@/components/ui/searchable-select";
import { FormSheet } from "@/components/shared/form-sheet";
import { toastSuccess, toastError } from "@/components/ui/toast-helpers";

import type {
  RequisitionDetailData,
  RequisitionDetailItem,
  AssigneeOption,
} from "@/features/inventory/types";
import { cancelRequisition } from "@/features/inventory/actions/cancel-requisition";
import { reassignRequisition } from "@/features/inventory/actions/reassign-requisition";

const QTY = new Intl.NumberFormat("en-MY", { maximumFractionDigits: 2 });

const STATUS_LABELS: Record<string, string> = {
  pending: "Pending",
  in_progress: "In Progress",
  pending_review: "Awaiting Review",
  completed: "Completed",
  cancelled: "Cancelled",
};

const DIRECTION_TONE: Record<string, "info" | "warning" | "neutral" | "success"> = {
  in: "success",
  out: "warning",
  transfer: "info",
  neutral: "neutral",
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
  data: RequisitionDetailData;
  /** When false, the cancel + reassign actions are hidden. */
  canMutate: boolean;
  locale: string;
}>;

export function RequisitionDetailView({ data, canMutate, locale }: Props) {
  const router = useRouter();
  const isOpen = data.status === "pending" || data.status === "in_progress";

  const [cancelOpen, setCancelOpen] = React.useState(false);
  const [reassignOpen, setReassignOpen] = React.useState(false);
  const [cancelPending, setCancelPending] = React.useState(false);

  const handleCancel = async (): Promise<void> => {
    setCancelPending(true);
    try {
      const result = await cancelRequisition({ requisitionId: data.id });
      if (result.success) {
        toastSuccess("Requisition cancelled");
        setCancelOpen(false);
        router.refresh();
      } else {
        toastError(result);
      }
    } finally {
      setCancelPending(false);
    }
  };

  // `locale` reserved for future per-locale breadcrumb logic; typed-route
  // breadcrumbs use the canonical (non-locale) path because next-intl's
  // <Link> handles the locale rewrite at render time.
  void locale;
  const breadcrumb = [
    { label: "Inventory", href: "/management/inventory" as Route },
    {
      label: "Requisitions",
      href: "/management/inventory/requisitions" as Route,
    },
    { label: data.id.slice(0, 8), current: true as const },
  ];

  const columns = React.useMemo<
    ColumnDef<RequisitionDetailItem, unknown>[]
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
        id: "movement",
        header: "Movement",
        cell: ({ row }) => (
          <span className="flex items-center gap-2">
            <span className="text-foreground-muted font-mono text-xs">
              {row.original.movementTypeCode}
            </span>
            <StatusBadge
              status={row.original.movementTypeDirection}
              tone={
                DIRECTION_TONE[row.original.movementTypeDirection] ?? "neutral"
              }
              label={row.original.movementTypeName}
              variant="outline"
              data-testid={`inventory-requisition-item-movement-${row.original.id}`}
            />
          </span>
        ),
      },
      {
        id: "requested",
        header: "Requested",
        cell: ({ row }) => (
          <span className="tabular-nums">
            {QTY.format(row.original.requestedQty)}
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
        id: "delivered",
        header: "Delivered",
        cell: ({ row }) => {
          const v = row.original.deliveredQty;
          if (v === null) {
            return <span className="text-foreground-muted">—</span>;
          }
          const variance = v - row.original.requestedQty;
          return (
            <span className="tabular-nums">
              {QTY.format(v)}
              {row.original.baseUnitAbbreviation ? (
                <span className="text-foreground-muted ml-1">
                  {row.original.baseUnitAbbreviation}
                </span>
              ) : null}
              {variance !== 0 ? (
                <span
                  className={
                    variance < 0
                      ? "text-status-warning-foreground ml-2 text-xs"
                      : "text-status-info-foreground ml-2 text-xs"
                  }
                >
                  ({variance > 0 ? "+" : ""}
                  {QTY.format(variance)})
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

  return (
    <DetailPageShell
      data-testid="inventory-requisition-detail"
      breadcrumb={breadcrumb}
      header={{
        eyebrow: "Requisition",
        title: (
          <span className="flex flex-wrap items-center gap-2">
            <span>{data.fromLocationName}</span>
            <ArrowRight aria-hidden className="text-foreground-muted size-5" />
            <span>{data.toLocationName ?? "Unassigned"}</span>
          </span>
        ),
        description: data.requesterRemark ?? undefined,
        status: data.status ? (
          <StatusBadge
            status={data.status}
            label={STATUS_LABELS[data.status] ?? data.status}
            data-testid="inventory-requisition-detail-status"
          />
        ) : undefined,
        metadata: [
          {
            label: "Created",
            value: formatTimestamp(data.createdAt),
          },
          ...(data.updatedAt
            ? [{ label: "Updated", value: formatTimestamp(data.updatedAt) }]
            : []),
          {
            label: "Assigned to",
            value: data.assignedToName ?? "—",
          },
          ...(data.runnerRemark
            ? [{ label: "Runner note", value: data.runnerRemark }]
            : []),
        ],
        primaryAction:
          canMutate && isOpen ? (
            <Button
              type="button"
              variant="destructive"
              size="sm"
              onClick={() => setCancelOpen(true)}
              data-testid="inventory-requisition-detail-cancel"
            >
              <Ban aria-hidden className="size-4" /> Cancel requisition
            </Button>
          ) : undefined,
        secondaryActions:
          canMutate && isOpen ? (
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => setReassignOpen(true)}
              data-testid="inventory-requisition-detail-reassign"
            >
              <UserCog aria-hidden className="size-4" /> Reassign
            </Button>
          ) : undefined,
        "data-testid": "inventory-requisition-detail-header",
      }}
    >
      <SectionCard
        title={
          <span className="flex items-center gap-2">
            <ClipboardList aria-hidden className="size-4" />
            Line items
          </span>
        }
        description={`${data.items.length} line${data.items.length === 1 ? "" : "s"}`}
        data-testid="inventory-requisition-detail-items-section"
      >
        <DataTable<RequisitionDetailItem>
          data={data.items}
          columns={columns}
          mobileFieldPriority={["material", "requested", "delivered"]}
          getRowId={(row) => row.id}
          frame="none"
          toolbar="none"
          empty={
            <p className="text-foreground-muted py-8 text-center text-sm">
              No line items recorded for this requisition.
            </p>
          }
          data-testid="inventory-requisition-detail-items-table"
        />
      </SectionCard>

      {!isOpen ? (
        <SectionCard
          title={
            <span className="flex items-center gap-2">
              <Truck aria-hidden className="size-4" />
              Fulfillment
            </span>
          }
          description="Runner-side fulfillment is finalized on /crew/logistics/restock-queue."
          data-testid="inventory-requisition-detail-fulfillment"
        >
          <p className="text-foreground-muted text-sm">
            This requisition is in a terminal state. No further changes can be
            made from this surface.
          </p>
        </SectionCard>
      ) : null}

      {/* ── Cancel confirm ────────────────────────────────────────── */}
      <ConfirmDialog
        open={cancelOpen}
        onOpenChange={setCancelOpen}
        intent="destructive"
        title="Cancel this requisition?"
        description="Cancelling stops fulfillment. This is irreversible."
        confirmLabel="Cancel requisition"
        cancelLabel="Keep open"
        onConfirm={handleCancel}
        pending={cancelPending}
        data-testid="inventory-requisition-detail-cancel-confirm"
      />

      {/* ── Reassign sheet ────────────────────────────────────────── */}
      <ReassignSheet
        open={reassignOpen}
        onOpenChange={setReassignOpen}
        requisitionId={data.id}
        currentAssigneeId={data.assignedToId}
        assignees={data.assignees}
      />
    </DetailPageShell>
  );
}

// ── Reassign sheet ────────────────────────────────────────────────────

function ReassignSheet({
  open,
  onOpenChange,
  requisitionId,
  currentAssigneeId,
  assignees,
}: Readonly<{
  open: boolean;
  onOpenChange: (open: boolean) => void;
  requisitionId: string;
  currentAssigneeId: string | null;
  assignees: ReadonlyArray<AssigneeOption>;
}>) {
  const router = useRouter();
  const [selected, setSelected] = React.useState<string | null>(
    currentAssigneeId,
  );
  const [pending, setPending] = React.useState(false);

  React.useEffect(() => {
    if (open) setSelected(currentAssigneeId);
  }, [open, currentAssigneeId]);

  const handleSubmit = async (
    e: React.FormEvent<HTMLFormElement>,
  ): Promise<void> => {
    e.preventDefault();
    setPending(true);
    try {
      const result = await reassignRequisition({
        requisitionId,
        newAssigneeId: selected,
      });
      if (result.success) {
        toastSuccess(
          selected === null
            ? "Requisition unassigned"
            : "Requisition reassigned",
        );
        onOpenChange(false);
        router.refresh();
      } else {
        toastError(result);
      }
    } finally {
      setPending(false);
    }
  };

  const options = React.useMemo(
    () =>
      assignees.map((a) => ({
        value: a.userId,
        label: a.displayName,
      })),
    [assignees],
  );

  return (
    <FormSheet
      open={open}
      onOpenChange={onOpenChange}
      title="Reassign requisition"
      description="Pick a new runner to fulfill this requisition. Leave blank to unassign."
      formId="inventory-requisition-reassign-form"
      submitLabel="Save"
      pending={pending}
      submitDisabled={pending || selected === currentAssigneeId}
      width="md"
      data-testid="inventory-requisition-detail-reassign-sheet"
    >
      <form
        id="inventory-requisition-reassign-form"
        onSubmit={(e) => void handleSubmit(e)}
        className="flex flex-col gap-4"
      >
        <label className="flex flex-col gap-1.5">
          <span className="text-xs font-medium">Assignee</span>
          <SearchableSelect
            value={selected}
            onChange={(v) => setSelected(v)}
            options={options}
            placeholder="Unassigned"
            searchPlaceholder="Search staff…"
            data-testid="inventory-requisition-detail-reassign-picker"
          />
        </label>
      </form>
    </FormSheet>
  );
}
