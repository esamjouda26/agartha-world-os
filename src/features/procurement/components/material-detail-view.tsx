"use client";

import * as React from "react";
import type { Route } from "next";
import {
  Package,
  Barcode,
  Layers,
  Scale,
  Thermometer,
  RotateCcw,
  Warehouse,
  ShieldCheck,
  DollarSign,
  Truck,
  ClipboardList,
  ArrowLeftRight,
  Pencil,
  Plus,
} from "lucide-react";
import { format, parseISO } from "date-fns";
import { parseAsString, useQueryState } from "nuqs";
import { useForm, FormProvider, type Resolver } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { toastSuccess, toastError } from "@/components/ui/toast-helpers";

import { StatusBadge } from "@/components/ui/status-badge";
import { SectionCard } from "@/components/ui/section-card";
import { MetadataList, type MetadataItem } from "@/components/ui/metadata-list";
import { EmptyStateCta } from "@/components/shared/empty-state-cta";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";

import { DetailPageShell } from "@/components/shared/detail-page-shell";
import { StatusTabBar } from "@/components/ui/status-tab-bar";
import { FormSheet } from "@/components/shared/form-sheet";
import { FormSection } from "@/components/ui/form-section";
import { FormRow } from "@/components/ui/form-row";

import { updateMaterial } from "@/features/procurement/actions/update-material";
import { upsertSupplierAssignment } from "@/features/procurement/actions/upsert-supplier-assignment";
import { upsertUomConversion } from "@/features/procurement/actions/upsert-uom-conversion";
import {
  updateMaterialSchema,
  upsertSupplierAssignmentSchema,
  upsertUomConversionSchema,
  MATERIAL_TYPES,
  VALUATION_METHODS,
  type UpdateMaterialInput,
  type UpsertSupplierAssignmentInput,
  type UpsertUomConversionInput,
} from "@/features/procurement/schemas/material";
import type { MaterialDetailData } from "@/features/procurement/types";

// ── Constants ──────────────────────────────────────────────────────────

const MATERIAL_TYPE_LABELS: Record<string, string> = {
  raw: "Raw Material",
  semi_finished: "Semi-Finished",
  finished: "Finished Good",
  trading: "Trading Good",
  consumable: "Consumable",
  service: "Service",
};

const VALUATION_LABELS: Record<string, string> = {
  standard: "Standard Cost",
  moving_avg: "Moving Average",
  fifo: "FIFO",
};

const MATERIAL_TYPE_TONES: Record<
  string,
  "success" | "warning" | "info" | "neutral" | "accent"
> = {
  raw: "info",
  semi_finished: "warning",
  finished: "success",
  trading: "accent",
  consumable: "neutral",
  service: "neutral",
};

// ── Props ──────────────────────────────────────────────────────────────

type MaterialDetailViewProps = Readonly<{
  data: MaterialDetailData;
  canWrite: boolean;
}>;

// ── Component ──────────────────────────────────────────────────────────

/**
 * MaterialDetailView — /management/procurement/[id]
 *
 * Spec: frontend_spec.md §3b `/management/procurement/[id]`
 *   Tabs: info | suppliers | uom
 *   - Info tab: material fields (editable via FormSheet)
 *   - Suppliers tab: material_procurement_data CRUD
 *   - UOM Conversions tab: material-specific + global conversions CRUD
 */
export function MaterialDetailView({
  data,
  canWrite,
}: MaterialDetailViewProps) {
  const { profile } = data;

  const headerMetadata: MetadataItem[] = [
    ...(profile.sku
      ? [
          {
            label: "SKU",
            value: profile.sku,
            testId: "procurement-detail-sku",
          },
        ]
      : []),
    ...(profile.categoryName
      ? [
          {
            label: "Category",
            value: profile.categoryName,
            testId: "procurement-detail-category",
          },
        ]
      : []),
    ...(profile.baseUnitAbbreviation
      ? [
          {
            label: "Unit",
            value: profile.baseUnitAbbreviation,
            testId: "procurement-detail-unit",
          },
        ]
      : []),
  ];

  return (
    <DetailPageShell
      breadcrumb={[
        { label: "Procurement", href: "/management/procurement" as Route },
        { label: profile.name, current: true as const },
      ]}
      header={{
        title: profile.name,
        eyebrow: "MATERIAL",
        status: (
          <>
            <StatusBadge
              status={profile.isActive ? "active" : "inactive"}
              tone={profile.isActive ? "success" : "neutral"}
            />
            <StatusBadge
              status={profile.materialType}
              label={
                MATERIAL_TYPE_LABELS[profile.materialType] ??
                profile.materialType
              }
              tone={MATERIAL_TYPE_TONES[profile.materialType] ?? "neutral"}
              variant="outline"
            />
          </>
        ),
        metadata: headerMetadata,
        description: profile.barcode
          ? `Barcode: ${profile.barcode}`
          : undefined,
      }}
      data-testid="procurement-material-detail"
    >
      <StatusTabBar
        tabs={[
          { value: "info", label: "Info" },
          {
            value: "suppliers",
            label: "Suppliers",
            count: data.suppliers.length,
          },
          {
            value: "uom",
            label: "UOM Conversions",
            count: data.uomConversions.length,
          },
        ]}
        paramKey="tab"
        defaultValue="info"
        ariaLabel="Material detail sections"
        panelIdPrefix="procurement-detail-tab"
        data-testid="procurement-detail-tabs"
      />
      <MaterialDetailTabContent data={data} canWrite={canWrite} />
    </DetailPageShell>
  );
}

// ── Tab Router ─────────────────────────────────────────────────────────

const TABS = ["info", "suppliers", "uom"] as const;
type TabValue = (typeof TABS)[number];

function MaterialDetailTabContent({
  data,
  canWrite,
}: Readonly<{ data: MaterialDetailData; canWrite: boolean }>) {
  const [tab] = useQueryState(
    "tab",
    parseAsString
      .withDefault("info")
      .withOptions({ clearOnDefault: true, history: "replace" }),
  );
  const current: TabValue = (TABS as readonly string[]).includes(tab)
    ? (tab as TabValue)
    : "info";

  return (
    <div
      role="tabpanel"
      id={`procurement-detail-tab-${current}`}
      aria-labelledby={`tab-tab-${current}`}
      data-testid={`procurement-detail-panel-${current}`}
    >
      {current === "info" ? <InfoTab data={data} canWrite={canWrite} /> : null}
      {current === "suppliers" ? (
        <SuppliersTab data={data} canWrite={canWrite} />
      ) : null}
      {current === "uom" ? (
        <UomTab data={data} canWrite={canWrite} />
      ) : null}
    </div>
  );
}

// ── Info Tab ───────────────────────────────────────────────────────────

function InfoTab({ data, canWrite }: Readonly<{ data: MaterialDetailData; canWrite: boolean }>) {
  const { profile } = data;
  const [editOpen, setEditOpen] = React.useState(false);
  const [pending, setPending] = React.useState(false);

  const form = useForm<UpdateMaterialInput>({
    resolver: zodResolver(updateMaterialSchema) as Resolver<UpdateMaterialInput>,
    defaultValues: {
      id: profile.id,
      name: profile.name,
      sku: profile.sku ?? "",
      barcode: profile.barcode ?? "",
      materialType: profile.materialType as UpdateMaterialInput["materialType"],
      categoryId: profile.categoryId,
      baseUnitId: profile.baseUnitId,
      reorderPoint: profile.reorderPoint,
      safetyStock: profile.safetyStock,
      standardCost: profile.standardCost ?? undefined,
      valuationMethod: profile.valuationMethod as UpdateMaterialInput["valuationMethod"],
      shelfLifeDays: profile.shelfLifeDays ?? undefined,
      storageConditions: profile.storageConditions ?? "",
      weightKg: profile.weightKg ?? undefined,
      isReturnable: profile.isReturnable,
      isActive: profile.isActive,
    },
  });
  const ctl = form.control;

  const handleUpdate = async (values: UpdateMaterialInput): Promise<void> => {
    setPending(true);
    try {
      const result = await updateMaterial(values);
      if (result.success) {
        toastSuccess("Material updated");
        setEditOpen(false);
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
    <div className="flex flex-col gap-4">
      {/* Stock Summary */}
      <SectionCard
        title="Stock Status"
        description="Current inventory from the stock balance cache."
        data-testid="procurement-detail-stock"
      >
        <MetadataList
          layout="grid"
          cols={4}
          items={[
            {
              label: (
                <span className="flex items-center gap-1.5">
                  <Warehouse aria-hidden className="size-3" />
                  On Hand
                </span>
              ),
              value: data.stock.onHand.toLocaleString(),
              testId: "procurement-detail-on-hand",
            },
            {
              label: "Allocated",
              value: data.stock.allocated.toLocaleString(),
              testId: "procurement-detail-allocated",
            },
            {
              label: (
                <span className="flex items-center gap-1.5">
                  <ShieldCheck aria-hidden className="size-3" />
                  Available
                </span>
              ),
              value: data.stock.available.toLocaleString(),
              testId: "procurement-detail-available",
            },
            {
              label: "Last Synced",
              value: data.stock.lastCountedAt
                ? format(parseISO(data.stock.lastCountedAt), "dd MMM yyyy")
                : "Never",
              testId: "procurement-detail-last-sync",
            },
          ]}
          data-testid="procurement-detail-stock-grid"
        />
      </SectionCard>

      {/* Material Properties */}
      <SectionCard
        title="Material Properties"
        action={
          canWrite ? (
            <Button size="sm" variant="outline" onClick={() => setEditOpen(true)} data-testid="procurement-edit-material-btn">
              <Pencil aria-hidden className="size-3.5" /> Edit
            </Button>
          ) : undefined
        }
        data-testid="procurement-detail-properties"
      >
        <MetadataList
          layout="grid"
          cols={2}
          items={[
            {
              label: (<span className="flex items-center gap-1.5"><Package aria-hidden className="size-3" /> Type</span>),
              value: MATERIAL_TYPE_LABELS[profile.materialType] ?? profile.materialType,
              testId: "procurement-detail-type",
            },
            {
              label: (<span className="flex items-center gap-1.5"><Layers aria-hidden className="size-3" /> Category</span>),
              value: profile.categoryName ?? "—",
              testId: "procurement-detail-cat",
            },
            {
              label: (<span className="flex items-center gap-1.5"><Scale aria-hidden className="size-3" /> Base Unit</span>),
              value: profile.baseUnitName ? `${profile.baseUnitName} (${profile.baseUnitAbbreviation})` : "—",
              testId: "procurement-detail-base-unit",
            },
            {
              label: (<span className="flex items-center gap-1.5"><Barcode aria-hidden className="size-3" /> Barcode</span>),
              value: profile.barcode ?? "—",
              testId: "procurement-detail-barcode",
            },
          ]}
          data-testid="procurement-detail-props-grid"
        />
      </SectionCard>

      {/* Inventory Parameters */}
      <SectionCard title="Inventory Parameters" data-testid="procurement-detail-inventory">
        <MetadataList
          layout="grid"
          cols={3}
          items={[
            { label: "Reorder Point", value: profile.reorderPoint.toLocaleString(), testId: "procurement-detail-reorder-pt" },
            { label: "Safety Stock", value: profile.safetyStock.toLocaleString(), testId: "procurement-detail-safety-stock" },
            {
              label: (<span className="flex items-center gap-1.5"><DollarSign aria-hidden className="size-3" /> Standard Cost</span>),
              value: profile.standardCost != null ? profile.standardCost.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 }) : "—",
              testId: "procurement-detail-std-cost",
            },
            { label: "Valuation Method", value: VALUATION_LABELS[profile.valuationMethod] ?? profile.valuationMethod, testId: "procurement-detail-valuation" },
            {
              label: (<span className="flex items-center gap-1.5"><Thermometer aria-hidden className="size-3" /> Shelf Life</span>),
              value: profile.shelfLifeDays ? `${profile.shelfLifeDays} days` : "—",
              testId: "procurement-detail-shelf-life",
            },
            {
              label: (<span className="flex items-center gap-1.5"><RotateCcw aria-hidden className="size-3" /> Returnable</span>),
              value: profile.isReturnable ? "Yes" : "No",
              testId: "procurement-detail-returnable",
            },
          ]}
          data-testid="procurement-detail-inventory-grid"
        />
      </SectionCard>

      {/* Storage & Physical */}
      {profile.storageConditions || profile.weightKg != null ? (
        <SectionCard title="Storage & Physical" data-testid="procurement-detail-storage">
          <MetadataList layout="grid" cols={2} items={[
            { label: "Storage Conditions", value: profile.storageConditions ?? "—", testId: "procurement-detail-storage-cond" },
            { label: "Weight", value: profile.weightKg != null ? `${profile.weightKg} kg` : "—", testId: "procurement-detail-weight" },
          ]} data-testid="procurement-detail-storage-grid" />
        </SectionCard>
      ) : null}

      {/* Open POs */}
      {data.openPoCount > 0 ? (
        <SectionCard title="Open Purchase Orders" data-testid="procurement-detail-open-po">
          <div className="text-foreground-muted flex items-center gap-2 text-sm">
            <ClipboardList aria-hidden className="size-4" />
            <span>{data.openPoCount} open PO{data.openPoCount > 1 ? "s" : ""} reference this material.</span>
          </div>
        </SectionCard>
      ) : null}

      {/* Timestamps */}
      <SectionCard title="Record Info" data-testid="procurement-detail-record-info">
        <MetadataList layout="grid" cols={2} items={[
          { label: "Created", value: format(parseISO(profile.createdAt), "dd MMM yyyy HH:mm"), testId: "procurement-detail-created" },
          { label: "Last Updated", value: profile.updatedAt ? format(parseISO(profile.updatedAt), "dd MMM yyyy HH:mm") : "—", testId: "procurement-detail-updated" },
        ]} data-testid="procurement-detail-record-grid" />
      </SectionCard>

      {/* ── Edit Material FormSheet ─────────────────────────────── */}
      <FormSheet
        open={editOpen}
        onOpenChange={setEditOpen}
        title="Edit Material"
        description="Update material properties, inventory parameters, and storage info."
        formId="edit-material-form"
        submitLabel="Save Changes"
        pending={pending}
        submitDisabled={pending}
        width="lg"
        data-testid="procurement-edit-material-sheet"
      >
        <FormProvider {...form}>
          <form id="edit-material-form" onSubmit={form.handleSubmit(handleUpdate as never)} className="flex flex-col gap-6">
            <FormSection title="Identification">
              <FormRow>
                <FormField control={ctl} name="name" render={({ field }) => (
                  <FormItem className="flex-1"><FormLabel>Name *</FormLabel><FormControl><Input {...field} data-testid="procurement-edit-name" /></FormControl><FormMessage /></FormItem>
                )} />
                <FormField control={ctl} name="sku" render={({ field }) => (
                  <FormItem className="flex-1"><FormLabel>SKU</FormLabel><FormControl><Input {...field} data-testid="procurement-edit-sku" /></FormControl><FormMessage /></FormItem>
                )} />
              </FormRow>
              <FormRow>
                <FormField control={ctl} name="barcode" render={({ field }) => (
                  <FormItem className="flex-1"><FormLabel>Barcode</FormLabel><FormControl><Input {...field} data-testid="procurement-edit-barcode" /></FormControl><FormMessage /></FormItem>
                )} />
                <FormField control={ctl} name="materialType" render={({ field }) => (
                  <FormItem className="flex-1"><FormLabel>Type *</FormLabel><Select value={field.value || "__none__"} onValueChange={(v) => field.onChange(v === "__none__" ? "" : v)}><FormControl><SelectTrigger data-testid="procurement-edit-type"><SelectValue /></SelectTrigger></FormControl><SelectContent><SelectItem value="__none__" disabled className="hidden">Select Type...</SelectItem>{MATERIAL_TYPES.map((t) => (<SelectItem key={t} value={t}>{MATERIAL_TYPE_LABELS[t] ?? t}</SelectItem>))}</SelectContent></Select><FormMessage /></FormItem>
                )} />
              </FormRow>
              <FormRow>
                <FormField control={ctl} name="categoryId" render={({ field }) => (
                  <FormItem className="flex-1"><FormLabel>Category *</FormLabel><Select value={field.value || "__none__"} onValueChange={(v) => field.onChange(v === "__none__" ? "" : v)}><FormControl><SelectTrigger data-testid="procurement-edit-category"><SelectValue /></SelectTrigger></FormControl><SelectContent><SelectItem value="__none__" disabled className="hidden">Select Category...</SelectItem>{data.categories.map((c) => (<SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>))}</SelectContent></Select><FormMessage /></FormItem>
                )} />
                <FormField control={ctl} name="baseUnitId" render={({ field }) => (
                  <FormItem className="flex-1"><FormLabel>Base Unit *</FormLabel><Select value={field.value || "__none__"} onValueChange={(v) => field.onChange(v === "__none__" ? "" : v)}><FormControl><SelectTrigger data-testid="procurement-edit-unit"><SelectValue /></SelectTrigger></FormControl><SelectContent><SelectItem value="__none__" disabled className="hidden">Select Unit...</SelectItem>{data.units.map((u) => (<SelectItem key={u.id} value={u.id}>{u.name} ({u.abbreviation})</SelectItem>))}</SelectContent></Select><FormMessage /></FormItem>
                )} />
              </FormRow>
            </FormSection>
            <FormSection title="Inventory Parameters">
              <FormRow>
                <FormField control={ctl} name="reorderPoint" render={({ field }) => (
                  <FormItem className="flex-1"><FormLabel>Reorder Point</FormLabel><FormControl><Input type="number" min={0} {...field} data-testid="procurement-edit-reorder" /></FormControl><FormMessage /></FormItem>
                )} />
                <FormField control={ctl} name="safetyStock" render={({ field }) => (
                  <FormItem className="flex-1"><FormLabel>Safety Stock</FormLabel><FormControl><Input type="number" min={0} {...field} data-testid="procurement-edit-safety" /></FormControl><FormMessage /></FormItem>
                )} />
                <FormField control={ctl} name="standardCost" render={({ field }) => (
                  <FormItem className="flex-1"><FormLabel>Standard Cost</FormLabel><FormControl><Input type="number" min={0} step="0.01" {...field} value={field.value ?? ""} data-testid="procurement-edit-cost" /></FormControl><FormMessage /></FormItem>
                )} />
              </FormRow>
              <FormRow>
                <FormField control={ctl} name="valuationMethod" render={({ field }) => (
                  <FormItem className="flex-1"><FormLabel>Valuation Method</FormLabel><Select value={field.value || "__none__"} onValueChange={(v) => field.onChange(v === "__none__" ? "" : v)}><FormControl><SelectTrigger data-testid="procurement-edit-valuation"><SelectValue /></SelectTrigger></FormControl><SelectContent><SelectItem value="__none__" disabled className="hidden">Select Method...</SelectItem>{VALUATION_METHODS.map((v) => (<SelectItem key={v} value={v}>{VALUATION_LABELS[v] ?? v}</SelectItem>))}</SelectContent></Select><FormMessage /></FormItem>
                )} />
                <FormField control={ctl} name="shelfLifeDays" render={({ field }) => (
                  <FormItem className="flex-1"><FormLabel>Shelf Life (days)</FormLabel><FormControl><Input type="number" min={1} {...field} value={field.value ?? ""} data-testid="procurement-edit-shelf" /></FormControl><FormMessage /></FormItem>
                )} />
              </FormRow>
            </FormSection>
            <FormSection title="Physical & Status">
              <FormRow>
                <FormField control={ctl} name="storageConditions" render={({ field }) => (
                  <FormItem className="flex-1"><FormLabel>Storage Conditions</FormLabel><FormControl><Input {...field} data-testid="procurement-edit-storage" /></FormControl><FormMessage /></FormItem>
                )} />
                <FormField control={ctl} name="weightKg" render={({ field }) => (
                  <FormItem className="flex-1"><FormLabel>Weight (kg)</FormLabel><FormControl><Input type="number" min={0} step="0.01" {...field} value={field.value ?? ""} data-testid="procurement-edit-weight" /></FormControl><FormMessage /></FormItem>
                )} />
              </FormRow>
              <FormRow>
                <FormField control={ctl} name="isReturnable" render={({ field }) => (
                  <FormItem className="flex items-center gap-3"><FormControl><Switch checked={field.value} onCheckedChange={field.onChange} data-testid="procurement-edit-returnable" /></FormControl><FormLabel className="!mt-0">Returnable</FormLabel></FormItem>
                )} />
                <FormField control={ctl} name="isActive" render={({ field }) => (
                  <FormItem className="flex items-center gap-3"><FormControl><Switch checked={field.value} onCheckedChange={field.onChange} data-testid="procurement-edit-active" /></FormControl><FormLabel className="!mt-0">Active</FormLabel></FormItem>
                )} />
              </FormRow>
            </FormSection>
          </form>
        </FormProvider>
      </FormSheet>
    </div>
  );
}

// ── Suppliers Tab ──────────────────────────────────────────────────────

function SuppliersTab({ data, canWrite }: Readonly<{ data: MaterialDetailData; canWrite: boolean }>) {
  const [addOpen, setAddOpen] = React.useState(false);
  const [pending, setPending] = React.useState(false);

  const form = useForm<UpsertSupplierAssignmentInput>({
    resolver: zodResolver(upsertSupplierAssignmentSchema) as Resolver<UpsertSupplierAssignmentInput>,
    defaultValues: {
      materialId: data.profile.id,
      supplierId: "",
      supplierSku: "",
      costPrice: 0,
      purchaseUnitId: "",
      leadTimeDays: 0,
      minOrderQty: 1,
      isDefault: false,
    },
  });
  const ctl = form.control;

  const handleSubmit = async (values: UpsertSupplierAssignmentInput): Promise<void> => {
    setPending(true);
    try {
      const result = await upsertSupplierAssignment(values);
      if (result.success) {
        toastSuccess("Supplier assignment saved");
        setAddOpen(false);
        form.reset({ materialId: data.profile.id, supplierId: "", supplierSku: "", costPrice: 0, purchaseUnitId: "", leadTimeDays: 0, minOrderQty: 1, isDefault: false });
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
    <SectionCard
      title="Suppliers"
      action={canWrite ? (
        <Button size="sm" variant="outline" onClick={() => setAddOpen(true)} data-testid="procurement-add-supplier-btn">
          <Plus aria-hidden className="size-3.5" /> Add Supplier
        </Button>
      ) : undefined}
      data-testid="procurement-detail-suppliers"
    >
      {data.suppliers.length === 0 ? (
        <EmptyStateCta title="No suppliers linked" description="Add procurement data to link suppliers to this material." icon={<Truck className="size-8" />} />
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-border-subtle border-b">
                <th className="text-foreground-subtle pb-2 text-left text-xs font-medium uppercase tracking-wider">Supplier</th>
                <th className="text-foreground-subtle pb-2 text-left text-xs font-medium uppercase tracking-wider">Supplier SKU</th>
                <th className="text-foreground-subtle pb-2 text-right text-xs font-medium uppercase tracking-wider">Cost Price</th>
                <th className="text-foreground-subtle pb-2 text-left text-xs font-medium uppercase tracking-wider">Purchase Unit</th>
                <th className="text-foreground-subtle pb-2 text-right text-xs font-medium uppercase tracking-wider">Lead Time</th>
                <th className="text-foreground-subtle pb-2 text-right text-xs font-medium uppercase tracking-wider">Min Order</th>
                <th className="text-foreground-subtle pb-2 text-center text-xs font-medium uppercase tracking-wider">Default</th>
              </tr>
            </thead>
            <tbody>
              {data.suppliers.map((s) => (
                <tr key={s.supplierId} className="border-border-subtle border-b last:border-0">
                  <td className="text-foreground py-2 font-medium">{s.supplierName}</td>
                  <td className="text-foreground-muted py-2 font-mono text-xs">{s.supplierSku ?? "—"}</td>
                  <td className="text-foreground-muted py-2 text-right tabular-nums">{s.costPrice.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</td>
                  <td className="text-foreground-muted py-2">{s.purchaseUnitName ?? "—"}</td>
                  <td className="text-foreground-muted py-2 text-right tabular-nums">{s.leadTimeDays}d</td>
                  <td className="text-foreground-muted py-2 text-right tabular-nums">{s.minOrderQty.toLocaleString()}</td>
                  <td className="py-2 text-center">{s.isDefault ? <StatusBadge status="default" tone="success" /> : <span className="text-foreground-muted">—</span>}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Add Supplier FormSheet */}
      <FormSheet
        open={addOpen}
        onOpenChange={setAddOpen}
        title="Add Supplier Assignment"
        description={`Link a supplier to ${data.profile.name}.`}
        formId="add-supplier-form"
        submitLabel="Save"
        pending={pending}
        submitDisabled={pending}
        width="md"
        data-testid="procurement-add-supplier-sheet"
      >
        <FormProvider {...form}>
          <form id="add-supplier-form" onSubmit={form.handleSubmit(handleSubmit as never)} className="flex flex-col gap-6">
            <FormSection title="Supplier Info">
              <FormRow>
                <FormField control={ctl} name="supplierId" render={({ field }) => (
                  <FormItem className="flex-1"><FormLabel>Supplier *</FormLabel><Select value={field.value || "__none__"} onValueChange={(v) => field.onChange(v === "__none__" ? "" : v)}><FormControl><SelectTrigger data-testid="procurement-supplier-select"><SelectValue placeholder="Select supplier" /></SelectTrigger></FormControl><SelectContent><SelectItem value="__none__" disabled className="hidden">Select supplier</SelectItem>{data.allSuppliers.map((s) => (<SelectItem key={s.id} value={s.id}>{s.name}</SelectItem>))}</SelectContent></Select><FormMessage /></FormItem>
                )} />
                <FormField control={ctl} name="supplierSku" render={({ field }) => (
                  <FormItem className="flex-1"><FormLabel>Supplier SKU</FormLabel><FormControl><Input {...field} /></FormControl><FormMessage /></FormItem>
                )} />
              </FormRow>
              <FormRow>
                <FormField control={ctl} name="costPrice" render={({ field }) => (
                  <FormItem className="flex-1"><FormLabel>Cost Price *</FormLabel><FormControl><Input type="number" min={0} step="0.01" {...field} /></FormControl><FormMessage /></FormItem>
                )} />
                <FormField control={ctl} name="purchaseUnitId" render={({ field }) => (
                  <FormItem className="flex-1"><FormLabel>Purchase Unit *</FormLabel><Select value={field.value || "__none__"} onValueChange={(v) => field.onChange(v === "__none__" ? "" : v)}><FormControl><SelectTrigger><SelectValue placeholder="Select unit" /></SelectTrigger></FormControl><SelectContent><SelectItem value="__none__" disabled className="hidden">Select unit</SelectItem>{data.units.map((u) => (<SelectItem key={u.id} value={u.id}>{u.name} ({u.abbreviation})</SelectItem>))}</SelectContent></Select><FormMessage /></FormItem>
                )} />
              </FormRow>
              <FormRow>
                <FormField control={ctl} name="leadTimeDays" render={({ field }) => (
                  <FormItem className="flex-1"><FormLabel>Lead Time (days)</FormLabel><FormControl><Input type="number" min={0} {...field} /></FormControl><FormMessage /></FormItem>
                )} />
                <FormField control={ctl} name="minOrderQty" render={({ field }) => (
                  <FormItem className="flex-1"><FormLabel>Min Order Qty</FormLabel><FormControl><Input type="number" min={0} {...field} /></FormControl><FormMessage /></FormItem>
                )} />
              </FormRow>
              <FormField control={ctl} name="isDefault" render={({ field }) => (
                <FormItem className="flex items-center gap-3"><FormControl><Switch checked={field.value} onCheckedChange={field.onChange} /></FormControl><FormLabel className="!mt-0">Default supplier for this material</FormLabel></FormItem>
              )} />
            </FormSection>
          </form>
        </FormProvider>
      </FormSheet>
    </SectionCard>
  );
}

// ── UOM Conversions Tab ────────────────────────────────────────────────

function UomTab({ data, canWrite }: Readonly<{ data: MaterialDetailData; canWrite: boolean }>) {
  const materialSpecific = data.uomConversions.filter((c) => !c.isGlobal);
  const globalConversions = data.uomConversions.filter((c) => c.isGlobal);

  const [addOpen, setAddOpen] = React.useState(false);
  const [pending, setPending] = React.useState(false);

  const form = useForm<UpsertUomConversionInput>({
    resolver: zodResolver(upsertUomConversionSchema) as Resolver<UpsertUomConversionInput>,
    defaultValues: { materialId: data.profile.id, fromUnitId: "", toUnitId: "", factor: 1 },
  });
  const ctl = form.control;

  const handleSubmit = async (values: UpsertUomConversionInput): Promise<void> => {
    setPending(true);
    try {
      const result = await upsertUomConversion(values);
      if (result.success) {
        toastSuccess("UOM conversion saved");
        setAddOpen(false);
        form.reset({ materialId: data.profile.id, fromUnitId: "", toUnitId: "", factor: 1 });
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
    <div className="flex flex-col gap-4">
      {data.uomConversions.length === 0 && !canWrite ? (
        <SectionCard title="UOM Conversions" data-testid="procurement-detail-uom">
          <EmptyStateCta title="No conversions defined" description="Add unit of measure conversions for this material." icon={<ArrowLeftRight className="size-8" />} />
        </SectionCard>
      ) : (
        <>
          {/* Material-specific conversions */}
          <SectionCard
            title="Material-Specific Conversions"
            action={canWrite ? (
              <Button size="sm" variant="outline" onClick={() => setAddOpen(true)} data-testid="procurement-add-uom-btn">
                <Plus aria-hidden className="size-3.5" /> Add Conversion
              </Button>
            ) : undefined}
            data-testid="procurement-detail-uom-specific"
          >
            {materialSpecific.length > 0 ? (
              <UomConversionTable conversions={materialSpecific} />
            ) : (
              <EmptyStateCta title="No material-specific conversions" description="Add a conversion for this material." icon={<ArrowLeftRight className="size-8" />} />
            )}
          </SectionCard>

          {/* Global conversions (read-only) */}
          {globalConversions.length > 0 ? (
            <SectionCard title="Global Conversions" description="System-wide conversions available to all materials." data-testid="procurement-detail-uom-global">
              <UomConversionTable conversions={globalConversions} />
            </SectionCard>
          ) : null}
        </>
      )}

      {/* Add UOM Conversion FormSheet */}
      <FormSheet
        open={addOpen}
        onOpenChange={setAddOpen}
        title="Add UOM Conversion"
        description={`Add a unit conversion for ${data.profile.name}.`}
        formId="add-uom-form"
        submitLabel="Save"
        pending={pending}
        submitDisabled={pending}
        width="sm"
        data-testid="procurement-add-uom-sheet"
      >
        <FormProvider {...form}>
          <form id="add-uom-form" onSubmit={form.handleSubmit(handleSubmit as never)} className="flex flex-col gap-6">
            <FormSection title="Conversion">
              <FormRow>
                <FormField control={ctl} name="fromUnitId" render={({ field }) => (
                  <FormItem className="flex-1"><FormLabel>From Unit *</FormLabel><Select value={field.value || "__none__"} onValueChange={(v) => field.onChange(v === "__none__" ? "" : v)}><FormControl><SelectTrigger><SelectValue placeholder="Select unit" /></SelectTrigger></FormControl><SelectContent><SelectItem value="__none__" disabled className="hidden">Select unit</SelectItem>{data.units.map((u) => (<SelectItem key={u.id} value={u.id}>{u.name} ({u.abbreviation})</SelectItem>))}</SelectContent></Select><FormMessage /></FormItem>
                )} />
                <FormField control={ctl} name="toUnitId" render={({ field }) => (
                  <FormItem className="flex-1"><FormLabel>To Unit *</FormLabel><Select value={field.value || "__none__"} onValueChange={(v) => field.onChange(v === "__none__" ? "" : v)}><FormControl><SelectTrigger><SelectValue placeholder="Select unit" /></SelectTrigger></FormControl><SelectContent><SelectItem value="__none__" disabled className="hidden">Select unit</SelectItem>{data.units.map((u) => (<SelectItem key={u.id} value={u.id}>{u.name} ({u.abbreviation})</SelectItem>))}</SelectContent></Select><FormMessage /></FormItem>
                )} />
              </FormRow>
              <FormField control={ctl} name="factor" render={({ field }) => (
                <FormItem><FormLabel>Factor *</FormLabel><FormControl><Input type="number" min={0} step="any" {...field} /></FormControl><FormMessage /></FormItem>
              )} />
            </FormSection>
          </form>
        </FormProvider>
      </FormSheet>
    </div>
  );
}

function UomConversionTable({
  conversions,
}: Readonly<{
  conversions: MaterialDetailData["uomConversions"];
}>) {
  return (
    <div className="overflow-x-auto">
      <table className="w-full text-sm">
        <thead>
          <tr className="border-border-subtle border-b">
            <th className="text-foreground-subtle pb-2 text-left text-xs font-medium uppercase tracking-wider">
              From
            </th>
            <th className="text-foreground-subtle pb-2 text-center text-xs font-medium uppercase tracking-wider">
              →
            </th>
            <th className="text-foreground-subtle pb-2 text-left text-xs font-medium uppercase tracking-wider">
              To
            </th>
            <th className="text-foreground-subtle pb-2 text-right text-xs font-medium uppercase tracking-wider">
              Factor
            </th>
          </tr>
        </thead>
        <tbody>
          {conversions.map((c) => (
            <tr
              key={c.id}
              className="border-border-subtle border-b last:border-0"
            >
              <td className="text-foreground py-2 font-medium">
                {c.fromUnitName}{" "}
                <span className="text-foreground-muted text-xs">
                  ({c.fromUnitAbbreviation})
                </span>
              </td>
              <td className="text-foreground-muted py-2 text-center">→</td>
              <td className="text-foreground py-2 font-medium">
                {c.toUnitName}{" "}
                <span className="text-foreground-muted text-xs">
                  ({c.toUnitAbbreviation})
                </span>
              </td>
              <td className="text-foreground-muted py-2 text-right tabular-nums">
                {c.factor.toLocaleString(undefined, {
                  maximumFractionDigits: 6,
                })}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
