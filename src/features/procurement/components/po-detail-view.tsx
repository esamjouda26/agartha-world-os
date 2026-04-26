"use client";

import * as React from "react";
import { useForm, FormProvider, type Resolver } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Send, CheckCircle, XCircle, Edit, Plus, Trash2, Mail, Phone, Package } from "lucide-react";
import { format, parseISO } from "date-fns";
import type { ColumnDef } from "@tanstack/react-table";
import { toastSuccess, toastError } from "@/components/ui/toast-helpers";

import { Button } from "@/components/ui/button";
import { StatusBadge } from "@/components/ui/status-badge";
import { SectionCard } from "@/components/ui/section-card";
import { DataTable } from "@/components/ui/data-table";
import { Input } from "@/components/ui/input";
import { ProgressBar } from "@/components/ui/progress-bar";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { FormField, FormItem, FormLabel, FormControl, FormMessage } from "@/components/ui/form";

import { DetailPageShell } from "@/components/shared/detail-page-shell";
import { FormSheet } from "@/components/shared/form-sheet";
import { FormSection } from "@/components/ui/form-section";
import { FormRow } from "@/components/ui/form-row";

import type {
  PODetailData,
  PODetailLineItem,
  ReceivingHistoryRow,
} from "@/features/procurement/types";
import { PO_STATUS_LABELS, PO_STATUS_TONES } from "@/features/procurement/types";
import { updatePurchaseOrder } from "@/features/procurement/actions/update-purchase-order";
import { addPoLineItem } from "@/features/procurement/actions/add-po-line-item";
import { removePoLineItem } from "@/features/procurement/actions/remove-po-line-item";
import { updatePoStatus } from "@/features/procurement/actions/update-po-status";
import {
  updatePurchaseOrderSchema,
  addPoLineItemSchema,
  type UpdatePurchaseOrderInput,
  type AddPoLineItemInput,
} from "@/features/procurement/schemas/purchase-order";

// ── Props ──────────────────────────────────────────────────────────────

type PODetailViewProps = Readonly<{
  data: PODetailData;
  canWrite: boolean;
}>;

// ── Component ──────────────────────────────────────────────────────────

/**
 * PODetailView — /management/procurement/purchase-orders/[id]
 *
 * Spec: frontend_spec.md §3b
 *   Header: supplier name, status badge, order_date, expected_delivery_date, location, total value
 *   Supplier contact card (inline): contact_email, contact_phone
 *   Line items table: material, expected_qty, received_qty (progress bar), unit_price, line total, photo
 *   Receiving history: goods_movements linked to this PO
 *   Status lifecycle: draft → sent → partially_received → completed | cancelled
 */
export function PODetailView({ data, canWrite }: PODetailViewProps) {
  const [editOpen, setEditOpen] = React.useState(false);
  const [addItemOpen, setAddItemOpen] = React.useState(false);
  const [statusPending, setStatusPending] = React.useState(false);

  const isDraft = data.status === "draft";
  const isSent = data.status === "sent";
  const isPartiallyReceived = data.status === "partially_received";
  const isOpen = isDraft || isSent || isPartiallyReceived;

  // ── Status action handlers ──────────────────────────────────────────
  const handleStatusChange = async (newStatus: "sent" | "completed" | "cancelled") => {
    setStatusPending(true);
    try {
      const result = await updatePoStatus({ poId: data.id, status: newStatus });
      if (result.success) {
        toastSuccess(
          newStatus === "sent"
            ? "PO marked as sent"
            : newStatus === "completed"
              ? "PO marked as completed"
              : "PO cancelled",
        );
      } else {
        toastError(result);
      }
    } catch {
      toastError("INTERNAL");
    } finally {
      setStatusPending(false);
    }
  };

  // ── Remove line item handler ────────────────────────────────────────
  const handleRemoveLineItem = async (lineItemId: string) => {
    try {
      const result = await removePoLineItem({ lineItemId });
      if (result.success) {
        toastSuccess("Line item removed");
      } else {
        toastError(result);
      }
    } catch {
      toastError("INTERNAL");
    }
  };

  // ── Line items columns ──────────────────────────────────────────────
  const lineItemColumns = React.useMemo<ColumnDef<PODetailLineItem, unknown>[]>(
    () => [
      {
        id: "materialName",
        accessorKey: "materialName",
        header: "Material",
        cell: ({ row }) => (
          <span className="text-foreground font-medium">{row.original.materialName}</span>
        ),
      },
      {
        id: "expectedQty",
        accessorKey: "expectedQty",
        header: "Expected",
        cell: ({ row }) => (
          <span className="tabular-nums">
            {row.original.expectedQty.toLocaleString()}
            {row.original.unitAbbreviation ? ` ${row.original.unitAbbreviation}` : ""}
          </span>
        ),
        meta: {
          headerClassName: "w-0 whitespace-nowrap text-right",
          cellClassName: "w-0 whitespace-nowrap text-right",
        },
      },
      {
        id: "receivedQty",
        accessorKey: "receivedQty",
        header: "Received",
        cell: ({ row }) => (
          <div className="flex items-center gap-2">
            <ProgressBar
              value={row.original.receivedQty}
              max={row.original.expectedQty}
              size="sm"
              className="w-16"
            />
            <span className="text-foreground-muted text-xs tabular-nums">
              {row.original.receivedQty.toLocaleString()} /{" "}
              {row.original.expectedQty.toLocaleString()}
            </span>
          </div>
        ),
        meta: { headerClassName: "w-0 whitespace-nowrap", cellClassName: "w-0 whitespace-nowrap" },
      },
      {
        id: "unitPrice",
        accessorKey: "unitPrice",
        header: "Unit Price",
        cell: ({ row }) =>
          row.original.unitPrice.toLocaleString(undefined, {
            minimumFractionDigits: 2,
            maximumFractionDigits: 2,
          }),
        meta: {
          headerClassName: "w-0 whitespace-nowrap text-right",
          cellClassName: "w-0 whitespace-nowrap text-right tabular-nums",
        },
      },
      {
        id: "lineTotal",
        accessorKey: "lineTotal",
        header: "Line Total",
        cell: ({ row }) =>
          row.original.lineTotal.toLocaleString(undefined, {
            minimumFractionDigits: 2,
            maximumFractionDigits: 2,
          }),
        meta: {
          headerClassName: "w-0 whitespace-nowrap text-right",
          cellClassName: "w-0 whitespace-nowrap text-right tabular-nums",
        },
      },
      ...(isDraft && canWrite
        ? [
            {
              id: "actions",
              header: "",
              cell: ({ row }: { row: { original: PODetailLineItem } }) => (
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={(e) => {
                    e.stopPropagation();
                    handleRemoveLineItem(row.original.id);
                  }}
                  aria-label={`Remove ${row.original.materialName}`}
                  data-testid={`po-remove-item-${row.original.id}`}
                >
                  <Trash2 className="size-4 text-red-500" />
                </Button>
              ),
              enableSorting: false,
              meta: { headerClassName: "w-0", cellClassName: "w-0" },
            } satisfies ColumnDef<PODetailLineItem, unknown>,
          ]
        : []),
    ],
    [isDraft, canWrite],
  );

  // ── Receiving history columns ───────────────────────────────────────
  const historyColumns = React.useMemo<ColumnDef<ReceivingHistoryRow, unknown>[]>(
    () => [
      {
        id: "documentDate",
        accessorKey: "documentDate",
        header: "Date",
        cell: ({ row }) => format(parseISO(row.original.documentDate), "dd MMM yyyy"),
        meta: { headerClassName: "w-0 whitespace-nowrap", cellClassName: "w-0 whitespace-nowrap" },
      },
      {
        id: "receivedByName",
        accessorKey: "receivedByName",
        header: "Received By",
        cell: ({ row }) => row.original.receivedByName ?? "—",
      },
      {
        id: "items",
        header: "Items",
        cell: ({ row }) => (
          <ul className="text-foreground-muted space-y-0.5 text-sm">
            {row.original.items.map((gi, i) => (
              <li key={i}>
                {gi.materialName}: {gi.quantity} {gi.unitAbbreviation}
              </li>
            ))}
          </ul>
        ),
      },
    ],
    [],
  );

  // ── Status action buttons ────────────────────────────────────────────
  const statusActions = canWrite ? (
    <div className="flex flex-wrap items-center gap-2">
      {isDraft ? (
        <>
          <Button
            size="sm"
            variant="outline"
            onClick={() => setEditOpen(true)}
            data-testid="po-detail-edit-btn"
          >
            <Edit aria-hidden className="size-3.5" /> Edit
          </Button>
          <Button
            size="sm"
            onClick={() => handleStatusChange("sent")}
            disabled={statusPending}
            data-testid="po-detail-mark-sent-btn"
          >
            <Send aria-hidden className="size-3.5" />
            {statusPending ? "Sending…" : "Mark as Sent"}
          </Button>
        </>
      ) : null}
      {isPartiallyReceived ? (
        <Button
          size="sm"
          onClick={() => handleStatusChange("completed")}
          disabled={statusPending}
          data-testid="po-detail-force-complete-btn"
        >
          <CheckCircle aria-hidden className="size-3.5" />
          {statusPending ? "Completing…" : "Force Complete"}
        </Button>
      ) : null}
      {isOpen ? (
        <Button
          size="sm"
          variant="outline"
          onClick={() => handleStatusChange("cancelled")}
          disabled={statusPending}
          data-testid="po-detail-cancel-btn"
        >
          <XCircle aria-hidden className="size-3.5" /> Cancel
        </Button>
      ) : null}
    </div>
  ) : null;

  return (
    <DetailPageShell
      breadcrumb={[
        { label: "Procurement", href: "/management/procurement" as never },
        { label: "Purchase Orders", href: "/management/procurement/purchase-orders" as never },
        { label: data.supplierName, current: true as const },
      ]}
      header={{
        title: `PO — ${data.supplierName}`,
        status: (
          <StatusBadge status={PO_STATUS_LABELS[data.status]} tone={PO_STATUS_TONES[data.status]} />
        ),
        metadata: [
          {
            label: "Order Date",
            value: data.orderDate ? format(parseISO(data.orderDate), "dd MMM yyyy") : "—",
          },
          {
            label: "Expected Delivery",
            value: data.expectedDeliveryDate
              ? format(parseISO(data.expectedDeliveryDate), "dd MMM yyyy")
              : "—",
          },
          {
            label: "Location",
            value: data.receivingLocationName ?? "—",
          },
          {
            label: "Total Value",
            value: `$${data.totalValue.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`,
          },
        ],
        primaryAction: statusActions,
        "data-testid": "po-detail-header",
      }}
      data-testid="po-detail-shell"
    >
      {/* ── Supplier Contact Card ────────────────────────────────── */}
      {data.supplierContactEmail || data.supplierContactPhone ? (
        <SectionCard
          title="Supplier Contact"
          description="Quick-access supplier contact details for delivery inquiries."
          data-testid="po-detail-supplier-contact"
        >
          <div className="flex flex-wrap gap-6">
            {data.supplierContactEmail ? (
              <div className="flex items-center gap-2">
                <Mail aria-hidden className="text-foreground-muted size-4" />
                <a
                  href={`mailto:${data.supplierContactEmail}`}
                  className="text-brand-primary text-sm hover:underline"
                >
                  {data.supplierContactEmail}
                </a>
              </div>
            ) : null}
            {data.supplierContactPhone ? (
              <div className="flex items-center gap-2">
                <Phone aria-hidden className="text-foreground-muted size-4" />
                <a
                  href={`tel:${data.supplierContactPhone}`}
                  className="text-brand-primary text-sm hover:underline"
                >
                  {data.supplierContactPhone}
                </a>
              </div>
            ) : null}
          </div>
        </SectionCard>
      ) : null}

      {/* ── Notes ────────────────────────────────────────────────── */}
      {data.notes ? (
        <SectionCard title="Notes" data-testid="po-detail-notes">
          <p className="text-foreground-muted text-sm whitespace-pre-wrap">{data.notes}</p>
        </SectionCard>
      ) : null}

      {/* ── Line Items ───────────────────────────────────────────── */}
      <SectionCard
        title="Line Items"
        description={`${data.lineItems.length} item${data.lineItems.length !== 1 ? "s" : ""}`}
        action={
          isDraft && canWrite ? (
            <Button
              size="sm"
              variant="outline"
              onClick={() => setAddItemOpen(true)}
              data-testid="po-detail-add-item-btn"
            >
              <Plus aria-hidden className="size-3.5" /> Add Item
            </Button>
          ) : undefined
        }
        data-testid="po-detail-line-items"
      >
        {data.lineItems.length > 0 ? (
          <DataTable
            data={data.lineItems}
            columns={lineItemColumns}
            mobileFieldPriority={["materialName", "receivedQty", "lineTotal"]}
            getRowId={(row) => row.id}
            toolbar="compact"
            data-testid="po-detail-items-table"
          />
        ) : (
          <div className="text-foreground-muted flex flex-col items-center gap-2 py-8">
            <Package className="size-8 opacity-50" />
            <p className="text-sm">No line items yet.</p>
          </div>
        )}
      </SectionCard>

      {/* ── Receiving History ────────────────────────────────────── */}
      {data.receivingHistory.length > 0 ? (
        <SectionCard
          title="Receiving History"
          description="Goods movements recorded against this PO."
          data-testid="po-detail-receiving-history"
        >
          <DataTable
            data={data.receivingHistory}
            columns={historyColumns}
            mobileFieldPriority={["documentDate", "receivedByName", "items"]}
            getRowId={(row) => row.id}
            toolbar="compact"
            data-testid="po-detail-history-table"
          />
        </SectionCard>
      ) : null}

      {/* ── Edit PO FormSheet (draft only) ───────────────────────── */}
      <EditPOSheet
        open={editOpen}
        onOpenChange={setEditOpen}
        poId={data.id}
        defaultValues={{
          expectedDeliveryDate: data.expectedDeliveryDate ?? "",
          notes: data.notes ?? "",
        }}
      />

      {/* ── Add Line Item FormSheet (draft only) ─────────────────── */}
      <AddLineItemSheet
        open={addItemOpen}
        onOpenChange={setAddItemOpen}
        poId={data.id}
        materials={data.materials}
      />
    </DetailPageShell>
  );
}

// ── Edit PO FormSheet ─────────────────────────────────────────────────

function EditPOSheet({
  open,
  onOpenChange,
  poId,
  defaultValues,
}: Readonly<{
  open: boolean;
  onOpenChange: (v: boolean) => void;
  poId: string;
  defaultValues: { expectedDeliveryDate: string; notes: string };
}>) {
  const [pending, setPending] = React.useState(false);
  const form = useForm<UpdatePurchaseOrderInput>({
    resolver: zodResolver(updatePurchaseOrderSchema) as Resolver<UpdatePurchaseOrderInput>,
    defaultValues: {
      poId,
      expectedDeliveryDate: defaultValues.expectedDeliveryDate,
      notes: defaultValues.notes,
    },
  });
  const ctl = form.control;

  const handleSubmit = async (values: UpdatePurchaseOrderInput) => {
    setPending(true);
    try {
      const result = await updatePurchaseOrder(values);
      if (result.success) {
        toastSuccess("Purchase order updated");
        onOpenChange(false);
      } else {
        toastError(result);
      }
    } catch {
      toastError("INTERNAL");
    } finally {
      setPending(false);
    }
  };

  return (
    <FormSheet
      open={open}
      onOpenChange={onOpenChange}
      title="Edit Purchase Order"
      description="Update delivery date and notes for this draft PO."
      formId="edit-po-form"
      submitLabel="Save Changes"
      pending={pending}
      submitDisabled={pending}
      width="md"
      data-testid="po-detail-edit-sheet"
    >
      <FormProvider {...form}>
        <form
          id="edit-po-form"
          onSubmit={form.handleSubmit(handleSubmit as never)}
          className="flex flex-col gap-6"
        >
          <FormSection title="PO Details">
            <FormField
              control={ctl}
              name="expectedDeliveryDate"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Expected Delivery Date</FormLabel>
                  <FormControl>
                    <Input type="date" {...field} data-testid="po-edit-delivery-date" />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={ctl}
              name="notes"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Notes</FormLabel>
                  <FormControl>
                    <Input {...field} placeholder="Optional notes…" data-testid="po-edit-notes" />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
          </FormSection>
        </form>
      </FormProvider>
    </FormSheet>
  );
}

// ── Add Line Item FormSheet ───────────────────────────────────────────

function AddLineItemSheet({
  open,
  onOpenChange,
  poId,
  materials,
}: Readonly<{
  open: boolean;
  onOpenChange: (v: boolean) => void;
  poId: string;
  materials: ReadonlyArray<{ id: string; name: string; sku: string | null }>;
}>) {
  const [pending, setPending] = React.useState(false);
  const form = useForm<AddPoLineItemInput>({
    resolver: zodResolver(addPoLineItemSchema) as Resolver<AddPoLineItemInput>,
    defaultValues: {
      poId,
      materialId: "",
      expectedQty: 1,
      unitPrice: 0,
    },
  });
  const ctl = form.control;

  const handleSubmit = async (values: AddPoLineItemInput) => {
    setPending(true);
    try {
      const result = await addPoLineItem(values);
      if (result.success) {
        toastSuccess("Line item added");
        onOpenChange(false);
        form.reset({ poId, materialId: "", expectedQty: 1, unitPrice: 0 });
      } else {
        toastError(result);
      }
    } catch {
      toastError("INTERNAL");
    } finally {
      setPending(false);
    }
  };

  return (
    <FormSheet
      open={open}
      onOpenChange={onOpenChange}
      title="Add Line Item"
      description="Add a material to this purchase order."
      formId="add-po-item-form"
      submitLabel="Add Item"
      pending={pending}
      submitDisabled={pending}
      width="md"
      data-testid="po-detail-add-item-sheet"
    >
      <FormProvider {...form}>
        <form
          id="add-po-item-form"
          onSubmit={form.handleSubmit(handleSubmit as never)}
          className="flex flex-col gap-6"
        >
          <FormSection title="Item Details">
            <FormField
              control={ctl}
              name="materialId"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Material *</FormLabel>
                  <Select
                    value={field.value || "__none__"}
                    onValueChange={(v) => field.onChange(v === "__none__" ? "" : v)}
                  >
                    <FormControl>
                      <SelectTrigger data-testid="po-add-item-material">
                        <SelectValue placeholder="Select material" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      <SelectItem value="__none__" disabled className="hidden">
                        Select material
                      </SelectItem>
                      {materials.map((m) => (
                        <SelectItem key={m.id} value={m.id}>
                          {m.name}
                          {m.sku ? ` (${m.sku})` : ""}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormRow>
              <FormField
                control={ctl}
                name="expectedQty"
                render={({ field }) => (
                  <FormItem className="flex-1">
                    <FormLabel>Expected Qty *</FormLabel>
                    <FormControl>
                      <Input
                        type="number"
                        min={1}
                        step="any"
                        {...field}
                        data-testid="po-add-item-qty"
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={ctl}
                name="unitPrice"
                render={({ field }) => (
                  <FormItem className="flex-1">
                    <FormLabel>Unit Price *</FormLabel>
                    <FormControl>
                      <Input
                        type="number"
                        min={0}
                        step="0.01"
                        {...field}
                        data-testid="po-add-item-price"
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </FormRow>
          </FormSection>
        </form>
      </FormProvider>
    </FormSheet>
  );
}
