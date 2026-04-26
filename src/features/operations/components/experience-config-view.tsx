"use client";

import * as React from "react";
import { useForm, FormProvider, type Resolver } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Tags, Plus, Trash2, Settings, Clock } from "lucide-react";
import type { ColumnDef } from "@tanstack/react-table";

import { PageHeader } from "@/components/ui/page-header";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { FormField, FormItem, FormLabel, FormControl, FormMessage } from "@/components/ui/form";
import { Switch } from "@/components/ui/switch";
import { FormSection } from "@/components/ui/form-section";
import { FormRow } from "@/components/ui/form-row";
import { SectionCard } from "@/components/ui/section-card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { FilterableDataTable } from "@/components/shared/filterable-data-table";
import { FormSheet } from "@/components/shared/form-sheet";
import { toastSuccess, toastError } from "@/components/ui/toast-helpers";
import { useUrlString } from "@/components/shared/url-state-helpers";

import type {
  ExperiencesPageData,
  ExperienceRow,
  TierRow,
  SchedulerConfigRow,
} from "@/features/operations/queries/get-experiences-data";
import {
  createExperienceSchema,
  updateExperienceSchema,
  createTierSchema,
  updateTierSchema,
  upsertSchedulerConfigSchema,
  generateSlotsSchema,
  type CreateExperienceInput,
  type CreateTierInput,
  type UpsertSchedulerConfigInput,
  type GenerateSlotsInput,
} from "@/features/operations/schemas/experience";
import {
  createExperience,
  updateExperience,
  createTier,
  updateTier,
  addTierPerk,
  removeTierPerk,
  upsertSchedulerConfig,
  generateSlots,
} from "@/features/operations/actions/experience-actions";

// ── Props ──────────────────────────────────────────────────────────────

type ExperienceConfigViewProps = Readonly<{ data: ExperiencesPageData; canWrite: boolean }>;

// ── Experience Tab ─────────────────────────────────────────────────────

function ExperienceTab({
  experiences,
  tiers,
  canWrite,
  triggerCreate,
}: {
  experiences: ExperienceRow[];
  tiers: TierRow[];
  canWrite: boolean;
  triggerCreate: React.MutableRefObject<(() => void) | null>;
}) {
  const [sheetOpen, setSheetOpen] = React.useState(false);
  const [editing, setEditing] = React.useState<ExperienceRow | null>(null);
  const [pending, setPending] = React.useState(false);

  const form = useForm<CreateExperienceInput>({
    resolver: zodResolver(
      editing ? updateExperienceSchema : createExperienceSchema,
    ) as Resolver<CreateExperienceInput>,
    defaultValues: {
      name: "",
      capacityPerSlot: 50,
      maxFacilityCapacity: 200,
      arrivalWindowMinutes: 15,
      isActive: true,
    },
  });

  const openCreate = React.useCallback(() => {
    setEditing(null);
    form.reset({
      name: "",
      capacityPerSlot: 50,
      maxFacilityCapacity: 200,
      arrivalWindowMinutes: 15,
      isActive: true,
    });
    setSheetOpen(true);
  }, [form]);
  const openEdit = (row: ExperienceRow) => {
    setEditing(row);
    form.reset({
      name: row.name,
      capacityPerSlot: row.capacityPerSlot ?? 50,
      maxFacilityCapacity: row.maxFacilityCapacity,
      arrivalWindowMinutes: row.arrivalWindowMinutes,
      isActive: row.isActive,
    });
    setSheetOpen(true);
  };

  // Expose create trigger to parent PageHeader
  React.useEffect(() => {
    triggerCreate.current = openCreate;
    return () => {
      triggerCreate.current = null;
    };
  }, [openCreate, triggerCreate]);

  const handleSubmit = async (values: CreateExperienceInput) => {
    setPending(true);
    try {
      const result = editing
        ? await updateExperience({ ...values, id: editing.id })
        : await createExperience(values);
      if (result.success) {
        toastSuccess(editing ? "Experience updated" : "Experience created");
        setSheetOpen(false);
        form.reset();
      } else toastError(result);
    } finally {
      setPending(false);
    }
  };

  const columns = React.useMemo<ColumnDef<ExperienceRow, unknown>[]>(
    () => [
      {
        id: "name",
        accessorKey: "name",
        header: "Name",
        cell: ({ row }) => <span className="text-foreground font-medium">{row.original.name}</span>,
      },
      {
        id: "capacityPerSlot",
        accessorKey: "capacityPerSlot",
        header: "Slot Cap.",
        cell: ({ row }) => row.original.capacityPerSlot ?? "—",
        meta: { headerClassName: "w-0 whitespace-nowrap", cellClassName: "w-0 whitespace-nowrap" },
      },
      {
        id: "maxFacilityCapacity",
        accessorKey: "maxFacilityCapacity",
        header: "Max Cap.",
        meta: { headerClassName: "w-0 whitespace-nowrap", cellClassName: "w-0 whitespace-nowrap" },
      },
      {
        id: "arrivalWindow",
        accessorKey: "arrivalWindowMinutes",
        header: "Arrival (min)",
        meta: { headerClassName: "w-0 whitespace-nowrap", cellClassName: "w-0 whitespace-nowrap" },
      },
      {
        id: "tiers",
        header: "Tiers",
        cell: ({ row }) => {
          const names = row.original.tierIds
            .map((id) => tiers.find((t) => t.id === id)?.name)
            .filter(Boolean);
          return names.length > 0 ? (
            <span className="text-xs">{names.join(", ")}</span>
          ) : (
            <span className="text-foreground-muted">—</span>
          );
        },
      },
      {
        id: "status",
        header: "Status",
        cell: ({ row }) => (
          <Badge variant={row.original.isActive ? "outline" : "secondary"}>
            {row.original.isActive ? "Active" : "Inactive"}
          </Badge>
        ),
        meta: { headerClassName: "w-0", cellClassName: "w-0" },
      },
    ],
    [tiers],
  );

  return (
    <>
      <FilterableDataTable<ExperienceRow>
        table={{
          data: experiences,
          columns,
          mobileFieldPriority: ["name", "capacityPerSlot", "status"],
          getRowId: (r) => r.id,
          ...(canWrite ? { onRowClick: openEdit } : {}),
        }}
        hasActiveFilters={false}
        emptyState={{
          variant: "first-use",
          title: "No experiences configured",
          description: "Create your first experience to get started.",
          icon: <Tags className="size-8" />,
        }}
        data-testid="experience-table"
      />
      <FormSheet
        open={sheetOpen}
        onOpenChange={setSheetOpen}
        title={editing ? "Edit Experience" : "New Experience"}
        description="Configure experience capacity and arrival window."
        formId="experience-form"
        submitLabel={editing ? "Save" : "Create"}
        pending={pending}
        submitDisabled={pending}
        width="md"
        data-testid="experience-sheet"
      >
        <FormProvider {...form}>
          <form
            id="experience-form"
            onSubmit={form.handleSubmit(handleSubmit)}
            className="flex flex-col gap-6"
          >
            <FormSection title="Details">
              <FormField
                control={form.control}
                name="name"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Name *</FormLabel>
                    <FormControl>
                      <Input {...field} data-testid="exp-name" />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormRow>
                <FormField
                  control={form.control}
                  name="capacityPerSlot"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Capacity / Slot *</FormLabel>
                      <FormControl>
                        <Input
                          {...field}
                          onChange={(e) => field.onChange(Number(e.target.value))}
                          type="number"
                          data-testid="exp-slot-cap"
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="maxFacilityCapacity"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Max Facility *</FormLabel>
                      <FormControl>
                        <Input
                          {...field}
                          onChange={(e) => field.onChange(Number(e.target.value))}
                          type="number"
                          data-testid="exp-max-cap"
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </FormRow>
              <FormRow>
                <FormField
                  control={form.control}
                  name="arrivalWindowMinutes"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Arrival Window (min)</FormLabel>
                      <FormControl>
                        <Input
                          {...field}
                          onChange={(e) => field.onChange(Number(e.target.value))}
                          type="number"
                          data-testid="exp-arrival"
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="isActive"
                  render={({ field }) => (
                    <FormItem className="flex items-center gap-3 pt-6">
                      <FormControl>
                        <Switch
                          checked={field.value}
                          onCheckedChange={field.onChange}
                          data-testid="exp-active"
                        />
                      </FormControl>
                      <FormLabel>Active</FormLabel>
                    </FormItem>
                  )}
                />
              </FormRow>
            </FormSection>
          </form>
        </FormProvider>
      </FormSheet>
    </>
  );
}

// ── Tier Tab ───────────────────────────────────────────────────────────

function TierTab({ tiers, canWrite }: { tiers: TierRow[]; canWrite: boolean }) {
  const [sheetOpen, setSheetOpen] = React.useState(false);
  const [editing, setEditing] = React.useState<TierRow | null>(null);
  const [pending, setPending] = React.useState(false);
  const [perkInput, setPerkInput] = React.useState("");

  const form = useForm<CreateTierInput>({
    resolver: zodResolver(
      editing ? updateTierSchema : createTierSchema,
    ) as Resolver<CreateTierInput>,
    defaultValues: { name: "", adultPrice: 0, childPrice: 0, durationMinutes: 60, sortOrder: 0 },
  });

  const openCreate = () => {
    setEditing(null);
    form.reset({ name: "", adultPrice: 0, childPrice: 0, durationMinutes: 60, sortOrder: 0 });
    setSheetOpen(true);
  };
  const openEdit = (row: TierRow) => {
    setEditing(row);
    form.reset({
      name: row.name,
      adultPrice: row.adultPrice,
      childPrice: row.childPrice,
      durationMinutes: row.durationMinutes,
      sortOrder: row.sortOrder,
    });
    setSheetOpen(true);
  };

  const handleSubmit = async (values: CreateTierInput) => {
    setPending(true);
    try {
      const result = editing
        ? await updateTier({ ...values, id: editing.id })
        : await createTier(values);
      if (result.success) {
        toastSuccess(editing ? "Tier updated" : "Tier created");
        setSheetOpen(false);
      } else toastError(result);
    } finally {
      setPending(false);
    }
  };

  const handleAddPerk = async (tierId: string) => {
    if (!perkInput.trim()) return;
    const result = await addTierPerk({ tierId, perk: perkInput.trim() });
    if (result.success) {
      setPerkInput("");
      toastSuccess("Perk added");
    } else toastError(result);
  };

  const handleRemovePerk = async (tierId: string, perk: string) => {
    const result = await removeTierPerk(tierId, perk);
    if (result.success) toastSuccess("Perk removed");
    else toastError(result);
  };

  const columns = React.useMemo<ColumnDef<TierRow, unknown>[]>(
    () => [
      {
        id: "name",
        accessorKey: "name",
        header: "Tier Name",
        cell: ({ row }) => <span className="text-foreground font-medium">{row.original.name}</span>,
      },
      {
        id: "adultPrice",
        accessorKey: "adultPrice",
        header: "Adult",
        cell: ({ row }) => `RM ${row.original.adultPrice.toFixed(2)}`,
        meta: {
          headerClassName: "w-0 whitespace-nowrap text-right",
          cellClassName: "w-0 whitespace-nowrap text-right",
        },
      },
      {
        id: "childPrice",
        accessorKey: "childPrice",
        header: "Child",
        cell: ({ row }) => `RM ${row.original.childPrice.toFixed(2)}`,
        meta: {
          headerClassName: "w-0 whitespace-nowrap text-right",
          cellClassName: "w-0 whitespace-nowrap text-right",
        },
      },
      {
        id: "duration",
        accessorKey: "durationMinutes",
        header: "Duration",
        cell: ({ row }) => `${row.original.durationMinutes} min`,
        meta: { headerClassName: "w-0 whitespace-nowrap", cellClassName: "w-0 whitespace-nowrap" },
      },
      {
        id: "perks",
        header: "Perks",
        cell: ({ row }) =>
          row.original.perks.length > 0 ? (
            <span className="text-xs">
              {row.original.perks.length} perk{row.original.perks.length !== 1 ? "s" : ""}
            </span>
          ) : (
            <span className="text-foreground-muted">—</span>
          ),
      },
      {
        id: "order",
        accessorKey: "sortOrder",
        header: "Order",
        meta: { headerClassName: "w-0", cellClassName: "w-0" },
      },
    ],
    [],
  );

  return (
    <>
      {canWrite && (
        <div className="flex justify-end">
          <Button size="sm" onClick={openCreate} data-testid="tier-add-btn">
            <Plus aria-hidden className="size-4" />
            New Tier
          </Button>
        </div>
      )}
      <FilterableDataTable<TierRow>
        table={{
          data: tiers,
          columns,
          mobileFieldPriority: ["name", "adultPrice", "duration"],
          getRowId: (r) => r.id,
          ...(canWrite ? { onRowClick: openEdit } : {}),
        }}
        hasActiveFilters={false}
        emptyState={{
          variant: "first-use",
          title: "No tiers configured",
          description: "Create tier templates for your experiences.",
          icon: <Tags className="size-8" />,
        }}
        data-testid="tier-table"
      />
      <FormSheet
        open={sheetOpen}
        onOpenChange={setSheetOpen}
        title={editing ? "Edit Tier" : "New Tier"}
        description="Configure pricing and duration."
        formId="tier-form"
        submitLabel={editing ? "Save" : "Create"}
        pending={pending}
        submitDisabled={pending}
        width="md"
        data-testid="tier-sheet"
      >
        <FormProvider {...form}>
          <form
            id="tier-form"
            onSubmit={form.handleSubmit(handleSubmit)}
            className="flex flex-col gap-6"
          >
            <FormSection title="Tier Details">
              <FormField
                control={form.control}
                name="name"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Name *</FormLabel>
                    <FormControl>
                      <Input {...field} data-testid="tier-name" />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormRow>
                <FormField
                  control={form.control}
                  name="adultPrice"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Adult Price (RM)</FormLabel>
                      <FormControl>
                        <Input
                          {...field}
                          onChange={(e) => field.onChange(Number(e.target.value))}
                          type="number"
                          step="0.01"
                          data-testid="tier-adult-price"
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="childPrice"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Child Price (RM)</FormLabel>
                      <FormControl>
                        <Input
                          {...field}
                          onChange={(e) => field.onChange(Number(e.target.value))}
                          type="number"
                          step="0.01"
                          data-testid="tier-child-price"
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </FormRow>
              <FormRow>
                <FormField
                  control={form.control}
                  name="durationMinutes"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Duration (min) *</FormLabel>
                      <FormControl>
                        <Input
                          {...field}
                          onChange={(e) => field.onChange(Number(e.target.value))}
                          type="number"
                          data-testid="tier-duration"
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="sortOrder"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Sort Order</FormLabel>
                      <FormControl>
                        <Input
                          {...field}
                          onChange={(e) => field.onChange(Number(e.target.value))}
                          type="number"
                          data-testid="tier-order"
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </FormRow>
            </FormSection>
            {editing && (
              <FormSection title="Perks">
                <div className="flex flex-wrap gap-2">
                  {editing.perks.map((p) => (
                    <Badge key={p} variant="secondary" className="gap-1">
                      {p}
                      <button
                        type="button"
                        onClick={() => handleRemovePerk(editing.id, p)}
                        aria-label={`Remove ${p}`}
                      >
                        <Trash2 className="size-3" />
                      </button>
                    </Badge>
                  ))}
                </div>
                <div className="flex gap-2">
                  <Input
                    value={perkInput}
                    onChange={(e) => setPerkInput(e.target.value)}
                    placeholder="Add perk…"
                    data-testid="tier-perk-input"
                    className="flex-1"
                  />
                  <Button
                    type="button"
                    size="sm"
                    variant="outline"
                    onClick={() => handleAddPerk(editing.id)}
                    data-testid="tier-perk-add"
                  >
                    <Plus className="size-4" />
                  </Button>
                </div>
              </FormSection>
            )}
          </form>
        </FormProvider>
      </FormSheet>
    </>
  );
}

// ── Scheduler Config Tab ───────────────────────────────────────────────

function SchedulerTab({
  configs,
  experiences,
  canWrite,
}: {
  configs: SchedulerConfigRow[];
  experiences: ExperienceRow[];
  canWrite: boolean;
}) {
  const [sheetOpen, setSheetOpen] = React.useState(false);
  const [editing, setEditing] = React.useState<SchedulerConfigRow | null>(null);
  const [genOpen, setGenOpen] = React.useState(false);
  const [pending, setPending] = React.useState(false);

  const configForm = useForm<UpsertSchedulerConfigInput>({
    resolver: zodResolver(upsertSchedulerConfigSchema) as Resolver<UpsertSchedulerConfigInput>,
    defaultValues: {
      experienceId: "",
      daysAhead: 14,
      dayStartHour: 9,
      dayEndHour: 21,
      startDate: "",
      endDate: null,
    },
  });

  const genForm = useForm<GenerateSlotsInput>({
    resolver: zodResolver(generateSlotsSchema) as Resolver<GenerateSlotsInput>,
    defaultValues: {
      experienceId: "",
      startDate: "",
      days: 14,
      slotIntervalMinutes: 15,
      dayStartHour: 9,
      dayEndHour: 21,
    },
  });

  const openEdit = (row: SchedulerConfigRow) => {
    setEditing(row);
    configForm.reset({
      experienceId: row.experienceId,
      daysAhead: row.daysAhead,
      dayStartHour: row.dayStartHour,
      dayEndHour: row.dayEndHour,
      startDate: row.startDate,
      endDate: row.endDate,
    });
    setSheetOpen(true);
  };

  const openCreate = (expId: string) => {
    setEditing(null);
    configForm.reset({
      experienceId: expId,
      daysAhead: 14,
      dayStartHour: 9,
      dayEndHour: 21,
      startDate: new Date().toISOString().split("T")[0]!,
      endDate: null,
    });
    setSheetOpen(true);
  };

  const handleConfigSubmit = async (values: UpsertSchedulerConfigInput) => {
    setPending(true);
    try {
      const result = await upsertSchedulerConfig(values);
      if (result.success) {
        toastSuccess("Scheduler config saved");
        setSheetOpen(false);
      } else toastError(result);
    } finally {
      setPending(false);
    }
  };

  const handleGenerate = async (values: GenerateSlotsInput) => {
    setPending(true);
    try {
      const result = await generateSlots(values);
      if (result.success) {
        toastSuccess(`Generated ${result.data.count} time slots`);
        setGenOpen(false);
      } else toastError(result);
    } finally {
      setPending(false);
    }
  };

  const configuredIds = new Set(configs.map((c) => c.experienceId));
  const unconfigured = experiences.filter((e) => !configuredIds.has(e.id));

  return (
    <div className="flex flex-col gap-4">
      {canWrite && (
        <div className="flex justify-end gap-2">
          <Button
            size="sm"
            variant="outline"
            onClick={() => setGenOpen(true)}
            data-testid="gen-slots-btn"
          >
            <Clock aria-hidden className="size-4" />
            Generate Slots
          </Button>
        </div>
      )}

      {configs.length === 0 && unconfigured.length === 0 ? (
        <SectionCard>
          <div className="text-foreground-muted flex flex-col items-center gap-2 py-12 text-center">
            <Settings className="size-8" />
            <p className="text-sm font-medium">No scheduler configs</p>
            <p className="text-xs">Create an experience first, then configure scheduling.</p>
          </div>
        </SectionCard>
      ) : (
        <>
          {configs.map((cfg) => (
            <SectionCard
              key={cfg.experienceId}
              data-testid={`scheduler-config-${cfg.experienceId}`}
            >
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-foreground text-sm font-semibold">{cfg.experienceName}</p>
                  <p className="text-foreground-muted text-xs">
                    {cfg.dayStartHour}:00 – {cfg.dayEndHour}:00 · {cfg.daysAhead}d ahead · from{" "}
                    {cfg.startDate}
                    {cfg.endDate ? ` to ${cfg.endDate}` : ""}
                  </p>
                </div>
                {canWrite && (
                  <Button
                    size="sm"
                    variant="ghost"
                    onClick={() => openEdit(cfg)}
                    data-testid={`edit-config-${cfg.experienceId}`}
                  >
                    Edit
                  </Button>
                )}
              </div>
            </SectionCard>
          ))}
          {unconfigured.map((exp) => (
            <SectionCard key={exp.id} data-testid={`unconfigured-${exp.id}`}>
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-foreground-muted text-sm font-medium">{exp.name}</p>
                  <p className="text-foreground-muted text-xs">No scheduler config</p>
                </div>
                {canWrite && (
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => openCreate(exp.id)}
                    data-testid={`add-config-${exp.id}`}
                  >
                    Configure
                  </Button>
                )}
              </div>
            </SectionCard>
          ))}
        </>
      )}

      {/* Config Sheet */}
      <FormSheet
        open={sheetOpen}
        onOpenChange={setSheetOpen}
        title={editing ? "Edit Scheduler Config" : "New Scheduler Config"}
        description="Configure slot generation parameters."
        formId="config-form"
        submitLabel="Save"
        pending={pending}
        submitDisabled={pending}
        width="md"
        data-testid="config-sheet"
      >
        <FormProvider {...configForm}>
          <form
            id="config-form"
            onSubmit={configForm.handleSubmit(handleConfigSubmit)}
            className="flex flex-col gap-6"
          >
            <FormSection title="Schedule Parameters">
              <FormRow>
                <FormField
                  control={configForm.control}
                  name="daysAhead"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Days Ahead</FormLabel>
                      <FormControl>
                        <Input
                          {...field}
                          onChange={(e) => field.onChange(Number(e.target.value))}
                          type="number"
                          data-testid="cfg-days-ahead"
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={configForm.control}
                  name="dayStartHour"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Start Hour</FormLabel>
                      <FormControl>
                        <Input
                          {...field}
                          onChange={(e) => field.onChange(Number(e.target.value))}
                          type="number"
                          data-testid="cfg-start-hour"
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </FormRow>
              <FormRow>
                <FormField
                  control={configForm.control}
                  name="dayEndHour"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>End Hour</FormLabel>
                      <FormControl>
                        <Input
                          {...field}
                          onChange={(e) => field.onChange(Number(e.target.value))}
                          type="number"
                          data-testid="cfg-end-hour"
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={configForm.control}
                  name="startDate"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Start Date</FormLabel>
                      <FormControl>
                        <Input {...field} type="date" data-testid="cfg-start-date" />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </FormRow>
              <FormField
                control={configForm.control}
                name="endDate"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>End Date (optional)</FormLabel>
                    <FormControl>
                      <Input
                        value={field.value ?? ""}
                        onChange={(e) => field.onChange(e.target.value || null)}
                        type="date"
                        data-testid="cfg-end-date"
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

      {/* Generate Slots Sheet */}
      <FormSheet
        open={genOpen}
        onOpenChange={setGenOpen}
        title="Generate Time Slots"
        description="Bulk-create slots for an experience."
        formId="gen-form"
        submitLabel="Generate"
        pending={pending}
        submitDisabled={pending}
        width="md"
        data-testid="gen-sheet"
      >
        <FormProvider {...genForm}>
          <form
            id="gen-form"
            onSubmit={genForm.handleSubmit(handleGenerate)}
            className="flex flex-col gap-6"
          >
            <FormSection title="Slot Generation">
              <FormField
                control={genForm.control}
                name="experienceId"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Experience *</FormLabel>
                    <Select
                      value={field.value || "__none__"}
                      onValueChange={(v) => field.onChange(v === "__none__" ? "" : v)}
                    >
                      <FormControl>
                        <SelectTrigger data-testid="gen-experience">
                          <SelectValue placeholder="Select…" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        <SelectItem value="__none__" disabled className="hidden">
                          Select experience…
                        </SelectItem>
                        {experiences.map((e) => (
                          <SelectItem key={e.id} value={e.id}>
                            {e.name}
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
                  control={genForm.control}
                  name="startDate"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Start Date *</FormLabel>
                      <FormControl>
                        <Input {...field} type="date" data-testid="gen-start" />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={genForm.control}
                  name="days"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Days *</FormLabel>
                      <FormControl>
                        <Input
                          {...field}
                          onChange={(e) => field.onChange(Number(e.target.value))}
                          type="number"
                          data-testid="gen-days"
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </FormRow>
              <FormRow>
                <FormField
                  control={genForm.control}
                  name="slotIntervalMinutes"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Interval (min)</FormLabel>
                      <FormControl>
                        <Input
                          {...field}
                          onChange={(e) => field.onChange(Number(e.target.value))}
                          type="number"
                          data-testid="gen-interval"
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={genForm.control}
                  name="dayStartHour"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Start Hour</FormLabel>
                      <FormControl>
                        <Input
                          {...field}
                          onChange={(e) => field.onChange(Number(e.target.value))}
                          type="number"
                          data-testid="gen-start-hr"
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </FormRow>
              <FormField
                control={genForm.control}
                name="dayEndHour"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>End Hour</FormLabel>
                    <FormControl>
                      <Input
                        {...field}
                        onChange={(e) => field.onChange(Number(e.target.value))}
                        type="number"
                        data-testid="gen-end-hr"
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
    </div>
  );
}

// ── Main View ──────────────────────────────────────────────────────────

export function ExperienceConfigView({ data, canWrite }: ExperienceConfigViewProps) {
  const tab = useUrlString("tab");
  const activeTab = tab.value ?? "experiences";
  const triggerCreate = React.useRef<(() => void) | null>(null);

  return (
    <div className="flex flex-col gap-6" data-testid="experience-config-page">
      <PageHeader
        eyebrow="Operations"
        title="Experience Config"
        description="Configure experiences, tier templates, and scheduler settings."
        data-testid="experience-config-header"
        {...(activeTab === "experiences" && canWrite
          ? {
              primaryAction: (
                <Button
                  size="sm"
                  onClick={() => triggerCreate.current?.()}
                  data-testid="exp-add-btn"
                >
                  <Plus aria-hidden className="size-4" />
                  New Experience
                </Button>
              ),
            }
          : {})}
      />

      <Tabs
        value={activeTab}
        onValueChange={(v) => tab.set(v === "experiences" ? null : v)}
        data-testid="experience-tabs"
      >
        <TabsList>
          <TabsTrigger value="experiences" data-testid="tab-experiences">
            Experiences ({data.experiences.length})
          </TabsTrigger>
          <TabsTrigger value="tiers" data-testid="tab-tiers">
            Tier Templates ({data.tiers.length})
          </TabsTrigger>
          <TabsTrigger value="scheduler" data-testid="tab-scheduler">
            Scheduler Config ({data.schedulerConfigs.length})
          </TabsTrigger>
        </TabsList>
        <TabsContent value="experiences">
          <ExperienceTab
            experiences={data.experiences}
            tiers={data.tiers}
            canWrite={canWrite}
            triggerCreate={triggerCreate}
          />
        </TabsContent>
        <TabsContent value="tiers">
          <TierTab tiers={data.tiers} canWrite={canWrite} />
        </TabsContent>
        <TabsContent value="scheduler">
          <SchedulerTab
            configs={data.schedulerConfigs}
            experiences={data.experiences}
            canWrite={canWrite}
          />
        </TabsContent>
      </Tabs>
    </div>
  );
}
