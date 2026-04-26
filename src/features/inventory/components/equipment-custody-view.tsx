"use client";

import * as React from "react";
import { useRouter } from "@/i18n/navigation";
import { parseAsString, useQueryState } from "nuqs";
import {
  useForm,
  FormProvider,
  type Resolver,
} from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import {
  HardDrive,
  Plus,
  Hourglass,
  PackageCheck,
  ArrowLeftRight,
} from "lucide-react";
import type { ColumnDef } from "@tanstack/react-table";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { KpiCard } from "@/components/ui/kpi-card";
import { KpiCardRow } from "@/components/ui/kpi-card-row";
import { PageHeader } from "@/components/ui/page-header";
import { StatusTabBar } from "@/components/ui/status-tab-bar";
import {
  FormField,
  FormItem,
  FormLabel,
  FormControl,
  FormMessage,
} from "@/components/ui/form";
import { FormRow } from "@/components/ui/form-row";
import { FormSection } from "@/components/ui/form-section";
import { SearchableSelect } from "@/components/ui/searchable-select";
import { EmptyStateCta } from "@/components/shared/empty-state-cta";

import { FilterableDataTable } from "@/components/shared/filterable-data-table";
import { FormSheet } from "@/components/shared/form-sheet";
import { toastSuccess, toastError } from "@/components/ui/toast-helpers";

import type {
  EquipmentListData,
  EquipmentListRow,
  EquipmentTabFilter,
} from "@/features/inventory/types";
import {
  issueEquipmentSchema,
  type IssueEquipmentInput,
} from "@/features/inventory/schemas/issue-equipment";
import {
  returnEquipmentSchema,
  type ReturnEquipmentInput,
} from "@/features/inventory/schemas/return-equipment";
import { issueEquipment } from "@/features/inventory/actions/issue-equipment";
import { returnEquipment } from "@/features/inventory/actions/return-equipment";

function formatDuration(seconds: number | null): string {
  if (seconds === null || seconds < 0) return "—";
  const days = Math.floor(seconds / 86400);
  const hours = Math.floor((seconds % 86400) / 3600);
  const minutes = Math.floor((seconds % 3600) / 60);
  if (days > 0) return `${days}d ${hours}h`;
  if (hours > 0) return `${hours}h ${minutes}m`;
  return `${minutes}m`;
}
function formatRelative(iso: string): string {
  const seconds = Math.floor((Date.now() - new Date(iso).getTime()) / 1000);
  return formatDuration(seconds);
}
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
  data: EquipmentListData;
  canIssue: boolean;
  canReturn: boolean;
}>;

export function EquipmentCustodyView({
  data,
  canIssue,
  canReturn,
}: Props) {
  const router = useRouter();

  const [tab, setTab] = useQueryState(
    "tab",
    parseAsString.withDefault("issued").withOptions({
      clearOnDefault: true,
      shallow: false,
      history: "replace",
    }),
  );

  const activeTab = (tab ?? "issued") as EquipmentTabFilter;

  const filteredRows = React.useMemo(() => {
    return data.rows.filter((r) =>
      activeTab === "issued"
        ? r.returnedAt === null
        : r.returnedAt !== null,
    );
  }, [data.rows, activeTab]);

  const [issueOpen, setIssueOpen] = React.useState(false);
  const [returnTarget, setReturnTarget] =
    React.useState<EquipmentListRow | null>(null);

  const columns = React.useMemo<ColumnDef<EquipmentListRow, unknown>[]>(
    () => {
      const base: ColumnDef<EquipmentListRow, unknown>[] = [
        {
          id: "material",
          header: "Material",
          cell: ({ row }) => (
            <span className="text-foreground font-medium">
              {row.original.materialName}
              {row.original.baseUnitAbbreviation ? (
                <span className="text-foreground-muted ml-1 text-sm">
                  ({row.original.baseUnitAbbreviation})
                </span>
              ) : null}
            </span>
          ),
        },
        {
          id: "assignee",
          header: "Assigned to",
          cell: ({ row }) => row.original.assignedToName ?? "—",
        },
        {
          id: "assignedAt",
          header: "Assigned",
          cell: ({ row }) => (
            <span className="tabular-nums whitespace-nowrap">
              {formatTimestamp(row.original.assignedAt)}
            </span>
          ),
          meta: {
            headerClassName: "w-0 whitespace-nowrap",
            cellClassName: "w-0 whitespace-nowrap",
          },
        },
      ];

      if (activeTab === "issued") {
        base.push({
          id: "elapsed",
          header: "Elapsed",
          cell: ({ row }) => (
            <span className="text-foreground-muted tabular-nums">
              {formatRelative(row.original.assignedAt)}
            </span>
          ),
          meta: {
            headerClassName: "w-0 whitespace-nowrap text-right",
            cellClassName: "w-0 whitespace-nowrap text-right",
          },
        });
      } else {
        base.push(
          {
            id: "returnedAt",
            header: "Returned",
            cell: ({ row }) => (
              <span className="tabular-nums whitespace-nowrap">
                {formatTimestamp(row.original.returnedAt)}
              </span>
            ),
            meta: {
              headerClassName: "w-0 whitespace-nowrap",
              cellClassName: "w-0 whitespace-nowrap",
            },
          },
          {
            id: "condition",
            header: "Condition",
            cell: ({ row }) => row.original.conditionOnReturn ?? "—",
          },
        );
      }

      base.push({
        id: "notes",
        header: "Notes",
        cell: ({ row }) =>
          row.original.notes ? (
            <span className="text-foreground-muted text-sm">
              {row.original.notes}
            </span>
          ) : (
            "—"
          ),
      });

      if (activeTab === "issued") {
        base.push({
          id: "actions",
          header: () => <span className="sr-only">Actions</span>,
          cell: ({ row }) =>
            canReturn ? (
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={(e) => {
                  e.stopPropagation();
                  setReturnTarget(row.original);
                }}
                data-testid={`inventory-equipment-row-return-${row.original.id}`}
              >
                <ArrowLeftRight aria-hidden className="size-4" /> Return
              </Button>
            ) : null,
          meta: {
            headerClassName: "w-0 whitespace-nowrap text-right",
            cellClassName: "w-0 whitespace-nowrap text-right",
          },
        });
      }

      return base;
    },
    [activeTab, canReturn],
  );

  return (
    <div
      className="flex flex-col gap-6"
      data-testid="inventory-equipment-list"
    >
      <PageHeader
        title="Equipment Custody"
        description="Returnable assets ledger — issue equipment to staff and record returns."
        data-testid="inventory-equipment-header"
        primaryAction={
          canIssue ? (
            <Button
              size="sm"
              onClick={() => setIssueOpen(true)}
              data-testid="inventory-equipment-issue-btn"
            >
              <Plus aria-hidden className="size-4" /> Issue Equipment
            </Button>
          ) : undefined
        }
      />

      <KpiCardRow data-testid="inventory-equipment-kpis">
        <KpiCard
          label="Currently issued"
          value={data.kpis.issuedCount}
          caption="returnable assets in the field"
          icon={<HardDrive aria-hidden className="size-4" />}
          data-testid="inventory-equipment-kpi-issued"
        />
        <KpiCard
          label="Oldest unreturned"
          value={formatDuration(data.kpis.oldestUnreturnedSeconds)}
          caption={
            data.kpis.oldestUnreturnedSeconds === null
              ? "no open assignments"
              : "elapsed since assignment"
          }
          icon={<Hourglass aria-hidden className="size-4" />}
          data-testid="inventory-equipment-kpi-oldest"
        />
        <KpiCard
          label="Returned this month"
          value={data.kpis.returnedThisMonthCount}
          caption="closed assignments"
          icon={<PackageCheck aria-hidden className="size-4" />}
          data-testid="inventory-equipment-kpi-returned-month"
        />
      </KpiCardRow>

      <StatusTabBar
        ariaLabel="Equipment custody view"
        paramKey="tab"
        defaultValue="issued"
        shallow={false}
        data-testid="inventory-equipment-tabs"
        tabs={[
          {
            value: "issued",
            label: "Currently Issued",
            count: data.counts.issued,
            tone: "info",
          },
          {
            value: "history",
            label: "Return History",
            count: data.counts.history,
            tone: "neutral",
          },
        ]}
        onValueChange={(v) => void setTab(v)}
      />

      <FilterableDataTable<EquipmentListRow>
        table={{
          data: filteredRows,
          columns,
          mobileFieldPriority:
            activeTab === "issued"
              ? ["material", "assignee", "assignedAt", "elapsed"]
              : ["material", "assignee", "returnedAt", "condition"],
          getRowId: (row) => row.id,
        }}
        emptyState={
          activeTab === "issued" && canIssue ? (
            <EmptyStateCta
              variant="first-use"
              title="No equipment currently issued"
              description="Issue a returnable asset to start tracking custody."
              icon={<HardDrive className="size-8" />}
              frame="none"
              ctaLabel="Issue Equipment"
              onClick={() => setIssueOpen(true)}
              data-testid="inventory-equipment-empty-issued"
            />
          ) : (
            {
              variant: "first-use" as const,
              title:
                activeTab === "issued"
                  ? "No equipment currently issued"
                  : "No return history yet",
              description:
                activeTab === "issued"
                  ? "Returnable assets will appear here once issued."
                  : "Returned assignments will appear here once recorded.",
              icon: <HardDrive className="size-8" />,
            }
          )
        }
        data-testid="inventory-equipment-table"
      />

      <IssueEquipmentSheet
        open={issueOpen}
        onOpenChange={setIssueOpen}
        data={data}
        onIssued={() => router.refresh()}
      />

      <ReturnEquipmentSheet
        target={returnTarget}
        onClose={() => setReturnTarget(null)}
        onReturned={() => router.refresh()}
      />
    </div>
  );
}

// ── Issue sheet ──────────────────────────────────────────────────────

function IssueEquipmentSheet({
  open,
  onOpenChange,
  data,
  onIssued,
}: Readonly<{
  open: boolean;
  onOpenChange: (open: boolean) => void;
  data: EquipmentListData;
  onIssued: () => void;
}>) {
  const form = useForm<IssueEquipmentInput>({
    resolver: zodResolver(
      issueEquipmentSchema,
    ) as Resolver<IssueEquipmentInput>,
    defaultValues: {
      materialId: "",
      assignedToId: "",
      notes: null,
    },
  });

  React.useEffect(() => {
    if (open) {
      form.reset({ materialId: "", assignedToId: "", notes: null });
    }
  }, [open, form]);

  const [pending, setPending] = React.useState(false);

  const handleSubmit = async (
    values: IssueEquipmentInput,
  ): Promise<void> => {
    setPending(true);
    try {
      const result = await issueEquipment(values);
      if (result.success) {
        toastSuccess("Equipment issued");
        onOpenChange(false);
        onIssued();
      } else {
        toastError(result);
        if (result.fields) {
          for (const [field, message] of Object.entries(result.fields)) {
            form.setError(field as never, { type: "server", message });
          }
        }
      }
    } finally {
      setPending(false);
    }
  };

  const materialOptions = React.useMemo(
    () =>
      data.returnableMaterials.map((m) => ({
        value: m.id,
        label: m.sku ? `${m.name} (${m.sku})` : m.name,
        ...(m.baseUnitAbbreviation
          ? { description: m.baseUnitAbbreviation }
          : {}),
      })),
    [data.returnableMaterials],
  );
  const assigneeOptions = React.useMemo(
    () =>
      data.assignees.map((a) => ({
        value: a.userId,
        label: a.displayName,
      })),
    [data.assignees],
  );

  return (
    <FormSheet
      open={open}
      onOpenChange={onOpenChange}
      title="Issue Equipment"
      description="Hand off a returnable asset to a staff member. Only materials flagged is_returnable are listed."
      formId="inventory-equipment-issue-form"
      submitLabel="Issue"
      pending={pending}
      submitDisabled={pending}
      width="md"
      data-testid="inventory-equipment-issue-sheet"
    >
      <FormProvider {...form}>
        <form
          id="inventory-equipment-issue-form"
          onSubmit={form.handleSubmit(handleSubmit as never)}
          className="flex flex-col gap-6"
        >
          <FormSection title="Custody">
            <FormRow>
              <FormField
                control={form.control}
                name="materialId"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Returnable material *</FormLabel>
                    <FormControl>
                      <SearchableSelect
                        value={field.value || null}
                        onChange={(v) => field.onChange(v ?? "")}
                        options={materialOptions}
                        placeholder="Pick a returnable item"
                        searchPlaceholder="Search…"
                        data-testid="inventory-equipment-issue-material"
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="assignedToId"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Assigned to *</FormLabel>
                    <FormControl>
                      <SearchableSelect
                        value={field.value || null}
                        onChange={(v) => field.onChange(v ?? "")}
                        options={assigneeOptions}
                        placeholder="Pick a recipient"
                        searchPlaceholder="Search staff…"
                        data-testid="inventory-equipment-issue-assignee"
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </FormRow>
            <FormField
              control={form.control}
              name="notes"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Note (optional)</FormLabel>
                  <FormControl>
                    <Textarea
                      value={field.value ?? ""}
                      onChange={(e) =>
                        field.onChange(
                          e.target.value === "" ? null : e.target.value,
                        )
                      }
                      onBlur={field.onBlur}
                      name={field.name}
                      ref={field.ref}
                      rows={2}
                      placeholder="Serial number, accessories, etc."
                      data-testid="inventory-equipment-issue-notes"
                    />
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

// ── Return sheet ─────────────────────────────────────────────────────

function ReturnEquipmentSheet({
  target,
  onClose,
  onReturned,
}: Readonly<{
  target: EquipmentListRow | null;
  onClose: () => void;
  onReturned: () => void;
}>) {
  const open = target !== null;
  const form = useForm<ReturnEquipmentInput>({
    resolver: zodResolver(
      returnEquipmentSchema,
    ) as Resolver<ReturnEquipmentInput>,
    defaultValues: {
      assignmentId: "",
      conditionOnReturn: "",
      notes: null,
    },
  });

  React.useEffect(() => {
    if (target) {
      form.reset({
        assignmentId: target.id,
        conditionOnReturn: "",
        notes: null,
      });
    }
  }, [target, form]);

  const [pending, setPending] = React.useState(false);

  const handleSubmit = async (
    values: ReturnEquipmentInput,
  ): Promise<void> => {
    setPending(true);
    try {
      const result = await returnEquipment(values);
      if (result.success) {
        toastSuccess("Equipment returned");
        onClose();
        onReturned();
      } else {
        toastError(result);
        if (result.fields) {
          for (const [field, message] of Object.entries(result.fields)) {
            form.setError(field as never, { type: "server", message });
          }
        }
      }
    } finally {
      setPending(false);
    }
  };

  return (
    <FormSheet
      open={open}
      onOpenChange={(v) => {
        if (!v) onClose();
      }}
      title={
        target
          ? `Return: ${target.materialName}`
          : "Return equipment"
      }
      description={
        target
          ? `Recipient: ${target.assignedToName ?? "Unknown"} · issued ${formatTimestamp(target.assignedAt)}`
          : undefined
      }
      formId="inventory-equipment-return-form"
      submitLabel="Mark returned"
      pending={pending}
      submitDisabled={pending}
      width="md"
      data-testid="inventory-equipment-return-sheet"
    >
      <FormProvider {...form}>
        <form
          id="inventory-equipment-return-form"
          onSubmit={form.handleSubmit(handleSubmit as never)}
          className="flex flex-col gap-4"
        >
          <FormField
            control={form.control}
            name="conditionOnReturn"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Condition on return *</FormLabel>
                <FormControl>
                  <Input
                    {...field}
                    placeholder="e.g. Good · Damaged · Missing accessory"
                    data-testid="inventory-equipment-return-condition"
                  />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
          <FormField
            control={form.control}
            name="notes"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Notes (optional)</FormLabel>
                <FormControl>
                  <Textarea
                    value={field.value ?? ""}
                    onChange={(e) =>
                      field.onChange(
                        e.target.value === "" ? null : e.target.value,
                      )
                    }
                    onBlur={field.onBlur}
                    name={field.name}
                    ref={field.ref}
                    rows={3}
                    placeholder="Damage details, missing parts, etc."
                    data-testid="inventory-equipment-return-notes"
                  />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
          <p className="text-foreground-muted text-xs">
            If the asset is damaged, create a write-off at{" "}
            <span className="font-medium">/crew/disposals</span> after
            recording the return (WF-20 → WF-12).
          </p>
        </form>
      </FormProvider>
    </FormSheet>
  );
}
