"use client";

import * as React from "react";
import { useRouter } from "@/i18n/navigation";
import { useForm, FormProvider, type Resolver } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import {
  Edit,
  Mail,
  Phone,
  MapPin,
  Package,
  FileText,
} from "lucide-react";
import { format, parseISO } from "date-fns";
import type { ColumnDef } from "@tanstack/react-table";
import { toastSuccess, toastError } from "@/components/ui/toast-helpers";

import { Button } from "@/components/ui/button";
import { StatusBadge } from "@/components/ui/status-badge";
import { SectionCard } from "@/components/ui/section-card";
import { DataTable } from "@/components/ui/data-table";
import { Input } from "@/components/ui/input";
import { Checkbox } from "@/components/ui/checkbox";
import {
  FormField,
  FormItem,
  FormLabel,
  FormControl,
  FormMessage,
} from "@/components/ui/form";

import { DetailPageShell } from "@/components/shared/detail-page-shell";
import { FormSheet } from "@/components/shared/form-sheet";
import { FormSection } from "@/components/ui/form-section";
import { FormRow } from "@/components/ui/form-row";

import type {
  SupplierDetailData,
  SupplierMaterialRow,
  SupplierPoHistoryRow,
} from "@/features/procurement/types";
import {
  PO_STATUS_LABELS,
  PO_STATUS_TONES,
} from "@/features/procurement/types";
import { updateSupplier } from "@/features/procurement/actions/update-supplier";
import {
  updateSupplierSchema,
  type UpdateSupplierInput,
} from "@/features/procurement/schemas/supplier";

// ── Props ──────────────────────────────────────────────────────────────

type SupplierDetailViewProps = Readonly<{
  data: SupplierDetailData;
  canWrite: boolean;
}>;

// ── Component ──────────────────────────────────────────────────────────

/**
 * SupplierDetailView — /management/procurement/suppliers/[id]
 *
 * Spec: frontend_spec.md §3b
 *   Header: supplier name, contact info, status
 *   Materials section: material_procurement_data with cost_price, lead_time
 *   PO history section: purchase_orders ORDER BY order_date DESC
 *   Edit supplier inline form
 */
export function SupplierDetailView({
  data,
  canWrite,
}: SupplierDetailViewProps) {
  const router = useRouter();
  const [editOpen, setEditOpen] = React.useState(false);

  // ── Material columns ────────────────────────────────────────────────
  const materialColumns = React.useMemo<ColumnDef<SupplierMaterialRow, unknown>[]>(
    () => [
      {
        id: "materialName",
        accessorKey: "materialName",
        header: "Material",
        cell: ({ row }) => (
          <div className="flex flex-col">
            <span className="text-foreground font-medium">{row.original.materialName}</span>
            {row.original.materialSku ? (
              <span className="text-foreground-muted font-mono text-xs">{row.original.materialSku}</span>
            ) : null}
          </div>
        ),
      },
      {
        id: "supplierSku",
        accessorKey: "supplierSku",
        header: "Supplier SKU",
        cell: ({ row }) => (
          <span className="text-foreground-muted font-mono text-sm">
            {row.original.supplierSku ?? "—"}
          </span>
        ),
        meta: { headerClassName: "w-0 whitespace-nowrap", cellClassName: "w-0 whitespace-nowrap" },
      },
      {
        id: "costPrice",
        accessorKey: "costPrice",
        header: "Cost Price",
        cell: ({ row }) =>
          row.original.costPrice.toLocaleString(undefined, {
            minimumFractionDigits: 2,
            maximumFractionDigits: 2,
          }),
        meta: {
          headerClassName: "w-0 whitespace-nowrap text-right",
          cellClassName: "w-0 whitespace-nowrap text-right tabular-nums",
        },
      },
      {
        id: "leadTimeDays",
        accessorKey: "leadTimeDays",
        header: "Lead Time",
        cell: ({ row }) => `${row.original.leadTimeDays}d`,
        meta: {
          headerClassName: "w-0 whitespace-nowrap text-right",
          cellClassName: "w-0 whitespace-nowrap text-right tabular-nums",
        },
      },
      {
        id: "minOrderQty",
        accessorKey: "minOrderQty",
        header: "Min Qty",
        cell: ({ row }) => row.original.minOrderQty.toLocaleString(),
        meta: {
          headerClassName: "w-0 whitespace-nowrap text-right",
          cellClassName: "w-0 whitespace-nowrap text-right tabular-nums",
        },
      },
      {
        id: "isDefault",
        accessorKey: "isDefault",
        header: "Default",
        cell: ({ row }) =>
          row.original.isDefault ? (
            <StatusBadge status="Default" tone="success" variant="dot" />
          ) : (
            <span className="text-foreground-muted">—</span>
          ),
        meta: { headerClassName: "w-0 whitespace-nowrap", cellClassName: "w-0 whitespace-nowrap" },
      },
    ],
    [],
  );

  // ── PO history columns ──────────────────────────────────────────────
  const poColumns = React.useMemo<ColumnDef<SupplierPoHistoryRow, unknown>[]>(
    () => [
      {
        id: "orderDate",
        accessorKey: "orderDate",
        header: "Order Date",
        cell: ({ row }) =>
          row.original.orderDate
            ? format(parseISO(row.original.orderDate), "dd MMM yyyy")
            : "—",
        meta: { headerClassName: "w-0 whitespace-nowrap", cellClassName: "w-0 whitespace-nowrap" },
      },
      {
        id: "status",
        accessorKey: "status",
        header: "Status",
        cell: ({ row }) => (
          <StatusBadge
            status={PO_STATUS_LABELS[row.original.status]}
            tone={PO_STATUS_TONES[row.original.status]}
          />
        ),
        meta: { headerClassName: "w-0 whitespace-nowrap", cellClassName: "w-0 whitespace-nowrap" },
      },
      {
        id: "expectedDeliveryDate",
        accessorKey: "expectedDeliveryDate",
        header: "Expected Delivery",
        cell: ({ row }) =>
          row.original.expectedDeliveryDate
            ? format(parseISO(row.original.expectedDeliveryDate), "dd MMM yyyy")
            : "—",
        meta: { headerClassName: "w-0 whitespace-nowrap", cellClassName: "w-0 whitespace-nowrap" },
      },
      {
        id: "receivingLocationName",
        accessorKey: "receivingLocationName",
        header: "Location",
        cell: ({ row }) => row.original.receivingLocationName ?? "—",
      },
      {
        id: "itemCount",
        accessorKey: "itemCount",
        header: "Items",
        cell: ({ row }) => row.original.itemCount.toLocaleString(),
        meta: {
          headerClassName: "w-0 whitespace-nowrap text-right",
          cellClassName: "w-0 whitespace-nowrap text-right tabular-nums",
        },
      },
      {
        id: "totalValue",
        accessorKey: "totalValue",
        header: "Total Value",
        cell: ({ row }) =>
          row.original.totalValue.toLocaleString(undefined, {
            minimumFractionDigits: 2,
            maximumFractionDigits: 2,
          }),
        meta: {
          headerClassName: "w-0 whitespace-nowrap text-right",
          cellClassName: "w-0 whitespace-nowrap text-right tabular-nums",
        },
      },
    ],
    [],
  );

  return (
    <DetailPageShell
      breadcrumb={[
        { label: "Procurement", href: "/management/procurement" as never },
        { label: "Suppliers", href: "/management/procurement/suppliers" as never },
        { label: data.name, current: true as const },
      ]}
      header={{
        title: data.name,
        status: (
          <StatusBadge
            status={data.isActive ? "Active" : "Inactive"}
            variant="dot"
            tone={data.isActive ? "success" : "neutral"}
          />
        ),
        metadata: [
          ...(data.contactEmail
            ? [{ label: "Email", value: data.contactEmail }]
            : []),
          ...(data.contactPhone
            ? [{ label: "Phone", value: data.contactPhone }]
            : []),
          ...(data.address
            ? [{ label: "Address", value: data.address }]
            : []),
          {
            label: "Created",
            value: format(parseISO(data.createdAt), "dd MMM yyyy"),
          },
        ],
        primaryAction: canWrite ? (
          <Button
            size="sm"
            variant="outline"
            onClick={() => setEditOpen(true)}
            data-testid="supplier-detail-edit-btn"
          >
            <Edit aria-hidden className="size-3.5" /> Edit Supplier
          </Button>
        ) : undefined,
        "data-testid": "supplier-detail-header",
      }}
      aside={
        /* Contact card as aside */
        (data.contactEmail || data.contactPhone || data.address) ? (
          <SectionCard
            title="Contact"
            data-testid="supplier-detail-contact"
          >
            <div className="flex flex-col gap-3">
              {data.contactEmail ? (
                <div className="flex items-center gap-2">
                  <Mail aria-hidden className="text-foreground-muted size-4 shrink-0" />
                  <a
                    href={`mailto:${data.contactEmail}`}
                    className="text-brand-primary text-sm hover:underline"
                  >
                    {data.contactEmail}
                  </a>
                </div>
              ) : null}
              {data.contactPhone ? (
                <div className="flex items-center gap-2">
                  <Phone aria-hidden className="text-foreground-muted size-4 shrink-0" />
                  <a
                    href={`tel:${data.contactPhone}`}
                    className="text-brand-primary text-sm hover:underline"
                  >
                    {data.contactPhone}
                  </a>
                </div>
              ) : null}
              {data.address ? (
                <div className="flex items-start gap-2">
                  <MapPin aria-hidden className="text-foreground-muted mt-0.5 size-4 shrink-0" />
                  <span className="text-foreground-muted text-sm">{data.address}</span>
                </div>
              ) : null}
            </div>
          </SectionCard>
        ) : undefined
      }
      data-testid="supplier-detail-shell"
    >
      {/* ── Description ──────────────────────────────────────────── */}
      {data.description ? (
        <SectionCard title="About" data-testid="supplier-detail-about">
          <p className="text-foreground-muted text-sm whitespace-pre-wrap">{data.description}</p>
        </SectionCard>
      ) : null}

      {/* ── Materials Section ────────────────────────────────────── */}
      <SectionCard
        title="Linked Materials"
        description={`${data.materials.length} material${data.materials.length !== 1 ? "s" : ""} linked`}
        data-testid="supplier-detail-materials"
      >
        {data.materials.length > 0 ? (
          <DataTable
            data={data.materials}
            columns={materialColumns}
            mobileFieldPriority={["materialName", "costPrice", "leadTimeDays", "isDefault"]}
            getRowId={(row) => row.materialId}
            toolbar="compact"
            data-testid="supplier-materials-table"
          />
        ) : (
          <div className="text-foreground-muted flex flex-col items-center gap-2 py-8">
            <Package className="size-8 opacity-50" />
            <p className="text-sm">No materials linked to this supplier.</p>
          </div>
        )}
      </SectionCard>

      {/* ── PO History Section ───────────────────────────────────── */}
      <SectionCard
        title="Purchase Order History"
        description={`${data.poHistory.length} order${data.poHistory.length !== 1 ? "s" : ""}`}
        data-testid="supplier-detail-po-history"
      >
        {data.poHistory.length > 0 ? (
          <DataTable
            data={data.poHistory}
            columns={poColumns}
            mobileFieldPriority={["orderDate", "status", "totalValue"]}
            getRowId={(row) => row.id}
            onRowClick={(row) =>
              router.push(`/management/procurement/purchase-orders/${row.id}` as never)
            }
            toolbar="compact"
            data-testid="supplier-po-history-table"
          />
        ) : (
          <div className="text-foreground-muted flex flex-col items-center gap-2 py-8">
            <FileText className="size-8 opacity-50" />
            <p className="text-sm">No purchase orders yet.</p>
          </div>
        )}
      </SectionCard>

      {/* ── Edit Supplier FormSheet ──────────────────────────────── */}
      <EditSupplierSheet
        open={editOpen}
        onOpenChange={setEditOpen}
        data={data}
      />
    </DetailPageShell>
  );
}

// ── Edit Supplier FormSheet ───────────────────────────────────────────

function EditSupplierSheet({
  open,
  onOpenChange,
  data,
}: Readonly<{
  open: boolean;
  onOpenChange: (v: boolean) => void;
  data: SupplierDetailData;
}>) {
  const [pending, setPending] = React.useState(false);
  const form = useForm<UpdateSupplierInput>({
    resolver: zodResolver(updateSupplierSchema) as Resolver<UpdateSupplierInput>,
    defaultValues: {
      supplierId: data.id,
      name: data.name,
      contactEmail: data.contactEmail ?? "",
      contactPhone: data.contactPhone ?? "",
      address: data.address ?? "",
      description: data.description ?? "",
      isActive: data.isActive,
    },
  });
  const ctl = form.control;

  const handleSubmit = async (values: UpdateSupplierInput) => {
    setPending(true);
    try {
      const result = await updateSupplier(values);
      if (result.success) {
        toastSuccess("Supplier updated");
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
      title="Edit Supplier"
      description="Update supplier details and contact information."
      formId="edit-supplier-form"
      submitLabel="Save Changes"
      pending={pending}
      submitDisabled={pending}
      width="md"
      data-testid="supplier-detail-edit-sheet"
    >
      <FormProvider {...form}>
        <form
          id="edit-supplier-form"
          onSubmit={form.handleSubmit(handleSubmit as never)}
          className="flex flex-col gap-6"
        >
          <FormSection title="Supplier Info">
            <FormField
              control={ctl}
              name="name"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Name *</FormLabel>
                  <FormControl>
                    <Input {...field} data-testid="supplier-edit-name" />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormRow>
              <FormField
                control={ctl}
                name="contactEmail"
                render={({ field }) => (
                  <FormItem className="flex-1">
                    <FormLabel>Contact Email</FormLabel>
                    <FormControl>
                      <Input type="email" {...field} data-testid="supplier-edit-email" />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={ctl}
                name="contactPhone"
                render={({ field }) => (
                  <FormItem className="flex-1">
                    <FormLabel>Phone</FormLabel>
                    <FormControl>
                      <Input {...field} data-testid="supplier-edit-phone" />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </FormRow>
            <FormField
              control={ctl}
              name="address"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Address</FormLabel>
                  <FormControl>
                    <Input {...field} data-testid="supplier-edit-address" />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={ctl}
              name="description"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Description</FormLabel>
                  <FormControl>
                    <Input {...field} data-testid="supplier-edit-description" />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={ctl}
              name="isActive"
              render={({ field }) => (
                <FormItem className="flex items-center gap-2">
                  <FormControl>
                    <Checkbox
                      checked={field.value}
                      onCheckedChange={field.onChange}
                      data-testid="supplier-edit-active"
                    />
                  </FormControl>
                  <FormLabel className="!mt-0">Active</FormLabel>
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
