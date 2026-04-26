"use client";

import * as React from "react";
import type { Route } from "next";
import { format, parseISO } from "date-fns";
import type { ColumnDef } from "@tanstack/react-table";
import { parseAsString, parseAsInteger, useQueryState, useQueryStates } from "nuqs";
import { Clock, Calendar, Plus, Pencil, Trash2, AlertTriangle } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { StatusBadge } from "@/components/ui/status-badge";
import { KpiCard } from "@/components/ui/kpi-card";
import { KpiCardRow } from "@/components/ui/kpi-card-row";
import { FilterableDataTable } from "@/components/shared/filterable-data-table";
import { CursorPagination } from "@/components/shared/cursor-pagination";
import { UrlSearchInput } from "@/components/shared/url-search-input";
import { UrlDateRangePicker } from "@/components/shared/url-date-range-picker";
import {
  CURSOR_RESET_PARAMS,
  useUrlString,
  useUrlEnum,
} from "@/components/shared/url-state-helpers";
import { FilterBar } from "@/components/ui/filter-bar";
import { FilterChip } from "@/components/ui/filter-chip";
import { toastSuccess, toastError } from "@/components/ui/toast-helpers";

import { StandardPageShell } from "@/components/shared/standard-page-shell";
import { StatusTabBar } from "@/components/ui/status-tab-bar";
import { FormSheet } from "@/components/shared/form-sheet";
import { RosterTemplateGrid } from "@/components/shared/roster-template-grid";

import type {
  ShiftPageData,
  ShiftTypeRow,
  RosterTemplateRow,
  StaffAssignmentRow,
  ScheduleOverviewRow,
  ScheduleOverviewPage,
  PublicHolidayRow,
} from "@/features/hr/types/shifts";
import type { PatternPreview } from "@/features/hr/types/shifts";
import {
  encodeShiftCursor,
  SHIFT_OVERVIEW_PAGE_SIZES,
  SHIFT_OVERVIEW_DEFAULT_PAGE_SIZE,
} from "@/features/hr/schemas/shift-overview-filters";
import {
  createShiftType,
  updateShiftType,
  createRosterTemplate,
  updateRosterTemplate,
  createStaffAssignment,
  deleteStaffAssignment,
  updateScheduleOverride,
  applyPatternChange,
  previewPatternChange,
  markDayOff,
  deleteHoliday,
  upsertTemplateShift,
  deleteTemplateShift,
} from "@/features/hr/actions/shift-actions";

// ── Props ──────────────────────────────────────────────────────────────

type Props = Readonly<{
  data: ShiftPageData;
  overviewPage: ScheduleOverviewPage;
  canWrite: boolean;
  canApply: boolean;
}>;

const FILTER_PARAMS_RESET = {
  staffSearch: parseAsString,
  shiftTypeId: parseAsString,
  override: parseAsString,
  from: parseAsString,
  to: parseAsString,
  cursor: parseAsString,
  crumbs: parseAsString,
  pageSize: parseAsInteger,
} as const;

export function ShiftSchedulingView({ data, overviewPage, canWrite, canApply }: Props) {
  const [, setFilterParams] = useQueryStates(FILTER_PARAMS_RESET, {
    history: "replace",
    shallow: false,
  });

  const handleTabChange = (): void => {
    void setFilterParams({
      staffSearch: null,
      shiftTypeId: null,
      override: null,
      from: null,
      to: null,
      cursor: null,
      crumbs: null,
      pageSize: null,
    });
  };

  return (
    <StandardPageShell
      breadcrumb={[
        { label: "HR", href: "/management/hr" as Route },
        { label: "Shift Scheduling", current: true as const },
      ]}
      header={{
        title: "Shift Scheduling",
        description: "Roster templates, schedule overview, and daily overrides.",
      }}
    >
      <StatusTabBar
        tabs={[
          { value: "templates", label: "Roster Templates" },
          { value: "overview", label: "Schedule Overview" },
          { value: "daily", label: "Daily Editor" },
        ]}
        paramKey="tab"
        defaultValue="templates"
        ariaLabel="Shift scheduling sections"
        panelIdPrefix="shifts-tab"
        onValueChange={handleTabChange}
        data-testid="hr-shifts-tabs"
      />
      <ShiftTabContent
        data={data}
        overviewPage={overviewPage}
        canWrite={canWrite}
        canApply={canApply}
      />
    </StandardPageShell>
  );
}

const SHIFT_TABS = ["templates", "overview", "daily"] as const;
type ShiftTabValue = (typeof SHIFT_TABS)[number];

function ShiftTabContent({
  data,
  overviewPage,
  canWrite,
  canApply,
}: {
  data: ShiftPageData;
  overviewPage: ScheduleOverviewPage;
  canWrite: boolean;
  canApply: boolean;
}) {
  const [tab] = useQueryState(
    "tab",
    parseAsString
      .withDefault("templates")
      .withOptions({ clearOnDefault: true, history: "replace" }),
  );
  const current: ShiftTabValue = (SHIFT_TABS as readonly string[]).includes(tab)
    ? (tab as ShiftTabValue)
    : "templates";

  return (
    <div
      role="tabpanel"
      id={`shifts-tab-${current}`}
      aria-labelledby={`tab-tab-${current}`}
      data-testid={`shifts-panel-${current}`}
    >
      {current === "templates" ? <TemplatesTab data={data} canWrite={canWrite} /> : null}
      {current === "overview" ? <OverviewTab data={data} overviewPage={overviewPage} /> : null}
      {current === "daily" ? (
        <DailyTab data={data} overviewPage={overviewPage} canApply={canApply} />
      ) : null}
    </div>
  );
}

function TemplatesTab({ data, canWrite }: { data: ShiftPageData; canWrite: boolean }) {
  return (
    <div className="flex flex-col gap-8">
      <ShiftDictionarySection shiftTypes={data.shiftTypes} canWrite={canWrite} />
      <RosterTemplateSection data={data} canWrite={canWrite} />
      <StaffAssignmentSection data={data} canWrite={canWrite} />
      <HolidaysSection holidays={data.holidays} canWrite={canWrite} />
    </div>
  );
}

// ── Shift Dictionary ───────────────────────────────────────────────────

function ShiftDictionarySection({
  shiftTypes,
  canWrite,
}: {
  shiftTypes: readonly ShiftTypeRow[];
  canWrite: boolean;
}) {
  const [sheetOpen, setSheetOpen] = React.useState(false);
  const [editing, setEditing] = React.useState<ShiftTypeRow | null>(null);
  const [pending, setPending] = React.useState(false);

  const handleSubmit = React.useCallback(
    async (fd: FormData) => {
      setPending(true);
      try {
        const payload = {
          ...(editing ? { id: editing.id } : {}),
          code: fd.get("code") as string,
          name: fd.get("name") as string,
          startTime: fd.get("startTime") as string,
          endTime: fd.get("endTime") as string,
          breakDurationMinutes: Number(fd.get("breakDurationMinutes")),
          graceLateArrivalMinutes: Number(fd.get("graceLateArrivalMinutes")),
          graceEarlyDepartureMinutes: Number(fd.get("graceEarlyDepartureMinutes")),
          maxLateClockInMinutes: Number(fd.get("maxLateClockInMinutes")),
          maxEarlyClockInMinutes: Number(fd.get("maxEarlyClockInMinutes")),
          maxLateClockOutMinutes: Number(fd.get("maxLateClockOutMinutes")),
          color: (fd.get("color") as string) || null,
          isActive: fd.get("isActive") === "on",
        };
        const result = editing ? await updateShiftType(payload) : await createShiftType(payload);
        if (result.success) {
          toastSuccess(editing ? "Shift type updated" : "Shift type created");
          setSheetOpen(false);
          setEditing(null);
        } else {
          toastError(result);
        }
      } finally {
        setPending(false);
      }
    },
    [editing],
  );

  const cols = React.useMemo<ColumnDef<ShiftTypeRow, unknown>[]>(
    () => [
      { id: "code", accessorKey: "code", header: "Code" },
      { id: "name", accessorKey: "name", header: "Name" },
      { id: "startTime", accessorKey: "startTime", header: "Start" },
      { id: "endTime", accessorKey: "endTime", header: "End" },
      { id: "break", accessorKey: "breakDurationMinutes", header: "Break (min)" },
      {
        id: "status",
        accessorKey: "isActive",
        header: "Status",
        cell: ({ row }) => <StatusBadge status={row.original.isActive ? "active" : "inactive"} />,
      },
      ...(canWrite
        ? [
            {
              id: "actions",
              header: "",
              cell: ({ row }: { row: { original: ShiftTypeRow } }) => (
                <Button
                  variant="ghost"
                  size="icon"
                  data-testid="hr-shifts-edit-type"
                  onClick={() => {
                    setEditing(row.original);
                    setSheetOpen(true);
                  }}
                >
                  <Pencil className="size-4" />
                </Button>
              ),
            } satisfies ColumnDef<ShiftTypeRow, unknown>,
          ]
        : []),
    ],
    [canWrite],
  );

  return (
    <section>
      <div className="mb-3 flex items-center justify-between">
        <h3 className="text-foreground text-base font-semibold">Shift Dictionary</h3>
        {canWrite && (
          <Button
            size="sm"
            data-testid="hr-shifts-add-type"
            onClick={() => {
              setEditing(null);
              setSheetOpen(true);
            }}
          >
            <Plus className="mr-1.5 size-4" /> Add Shift Type
          </Button>
        )}
      </div>
      <FilterableDataTable
        table={{
          columns: cols,
          data: shiftTypes as ShiftTypeRow[],
          getRowId: (r) => r.id,
          mobileFieldPriority: ["code", "name", "startTime"],
        }}
        data-testid="hr-shifts-dict-table"
      />
      <FormSheet
        open={sheetOpen}
        onOpenChange={(o) => {
          if (!o) setEditing(null);
          setSheetOpen(o);
        }}
        title={editing ? "Edit Shift Type" : "New Shift Type"}
        formId="shift-type-form"
        submitLabel="Save"
        pending={pending}
        data-testid="hr-shifts-type-sheet"
      >
        <form id="shift-type-form" action={handleSubmit} className="flex flex-col gap-4">
          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label htmlFor="code">Code *</Label>
              <Input
                id="code"
                name="code"
                defaultValue={editing?.code ?? ""}
                required
                data-testid="hr-shifts-type-code"
              />
            </div>
            <div>
              <Label htmlFor="st-name">Name *</Label>
              <Input
                id="st-name"
                name="name"
                defaultValue={editing?.name ?? ""}
                required
                data-testid="hr-shifts-type-name"
              />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label htmlFor="startTime">Start *</Label>
              <Input
                id="startTime"
                name="startTime"
                type="time"
                defaultValue={editing?.startTime ?? "08:00"}
                required
                data-testid="hr-shifts-type-start"
              />
            </div>
            <div>
              <Label htmlFor="endTime">End *</Label>
              <Input
                id="endTime"
                name="endTime"
                type="time"
                defaultValue={editing?.endTime ?? "17:00"}
                required
                data-testid="hr-shifts-type-end"
              />
            </div>
          </div>
          <div className="grid grid-cols-3 gap-3">
            <div>
              <Label htmlFor="breakDurationMinutes">Break (min)</Label>
              <Input
                id="breakDurationMinutes"
                name="breakDurationMinutes"
                type="number"
                min={0}
                defaultValue={editing?.breakDurationMinutes ?? 60}
                data-testid="hr-shifts-type-break"
              />
            </div>
            <div>
              <Label htmlFor="graceLateArrivalMinutes">Grace Late</Label>
              <Input
                id="graceLateArrivalMinutes"
                name="graceLateArrivalMinutes"
                type="number"
                min={0}
                defaultValue={editing?.graceLateArrivalMinutes ?? 5}
                data-testid="hr-shifts-type-grace-late"
              />
            </div>
            <div>
              <Label htmlFor="graceEarlyDepartureMinutes">Grace Early</Label>
              <Input
                id="graceEarlyDepartureMinutes"
                name="graceEarlyDepartureMinutes"
                type="number"
                min={0}
                defaultValue={editing?.graceEarlyDepartureMinutes ?? 5}
                data-testid="hr-shifts-type-grace-early"
              />
            </div>
          </div>
          <div className="grid grid-cols-3 gap-3">
            <div>
              <Label htmlFor="maxLateClockInMinutes">Max Late In</Label>
              <Input
                id="maxLateClockInMinutes"
                name="maxLateClockInMinutes"
                type="number"
                min={0}
                defaultValue={editing?.maxLateClockInMinutes ?? 30}
                data-testid="hr-shifts-type-max-late-in"
              />
            </div>
            <div>
              <Label htmlFor="maxEarlyClockInMinutes">Max Early In</Label>
              <Input
                id="maxEarlyClockInMinutes"
                name="maxEarlyClockInMinutes"
                type="number"
                min={0}
                defaultValue={editing?.maxEarlyClockInMinutes ?? 30}
                data-testid="hr-shifts-type-max-early-in"
              />
            </div>
            <div>
              <Label htmlFor="maxLateClockOutMinutes">Max Late Out</Label>
              <Input
                id="maxLateClockOutMinutes"
                name="maxLateClockOutMinutes"
                type="number"
                min={0}
                defaultValue={editing?.maxLateClockOutMinutes ?? 30}
                data-testid="hr-shifts-type-max-late-out"
              />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label htmlFor="color">Color</Label>
              <Input
                id="color"
                name="color"
                type="color"
                defaultValue={editing?.color ?? "#3b82f6"}
                data-testid="hr-shifts-type-color"
              />
            </div>
            <div className="flex items-center gap-2 pt-5">
              <Switch
                id="isActive"
                name="isActive"
                defaultChecked={editing?.isActive ?? true}
                data-testid="hr-shifts-type-active"
              />
              <Label htmlFor="isActive">Active</Label>
            </div>
          </div>
        </form>
      </FormSheet>
    </section>
  );
}

// ── Roster Templates ───────────────────────────────────────────────────

function RosterTemplateSection({ data, canWrite }: { data: ShiftPageData; canWrite: boolean }) {
  const [sheetOpen, setSheetOpen] = React.useState(false);
  const [editing, setEditing] = React.useState<RosterTemplateRow | null>(null);
  const [pending, setPending] = React.useState(false);
  const [applyOpen, setApplyOpen] = React.useState(false);
  const [applyPending, setApplyPending] = React.useState(false);
  const [preview, setPreview] = React.useState<PatternPreview | null>(null);
  const [applyDates, setApplyDates] = React.useState<{ from: string; to: string }>({
    from: "",
    to: "",
  });
  const [expandedTemplate, setExpandedTemplate] = React.useState<string | null>(null);

  const handleSubmit = React.useCallback(
    async (fd: FormData) => {
      setPending(true);
      try {
        const payload = {
          ...(editing ? { id: editing.id } : {}),
          name: fd.get("name") as string,
          cycleLengthDays: Number(fd.get("cycleLengthDays")),
          anchorDate: fd.get("anchorDate") as string,
          isActive: fd.get("isActive") === "on",
        };
        const result = editing
          ? await updateRosterTemplate(payload)
          : await createRosterTemplate(payload);
        if (result.success) {
          toastSuccess(editing ? "Template updated" : "Template created");
          setSheetOpen(false);
          setEditing(null);
        } else toastError(result);
      } finally {
        setPending(false);
      }
    },
    [editing],
  );

  const handlePreview = React.useCallback(async (fd: FormData) => {
    const from = fd.get("fromDate") as string;
    const to = fd.get("toDate") as string;
    setApplyDates({ from, to });
    setApplyPending(true);
    try {
      const result = await previewPatternChange({ fromDate: from, toDate: to, forceAll: false });
      if (result.success) setPreview(result.data as PatternPreview);
      else toastError(result);
    } finally {
      setApplyPending(false);
    }
  }, []);

  const handleApply = React.useCallback(
    async (forceAll: boolean) => {
      setApplyPending(true);
      try {
        const result = await applyPatternChange({
          fromDate: applyDates.from,
          toDate: applyDates.to,
          forceAll,
        });
        if (result.success) {
          toastSuccess(`Pattern applied: ${result.data.count} schedules updated`);
          setApplyOpen(false);
          setPreview(null);
        } else toastError(result);
      } finally {
        setApplyPending(false);
      }
    },
    [applyDates],
  );

  const handleGridAssign = React.useCallback(
    async (templateId: string, dayIndex: number, shiftTypeId: string) => {
      const result = await upsertTemplateShift({ templateId, dayIndex, shiftTypeId });
      if (result.success) toastSuccess("Day assigned");
      else toastError(result);
    },
    [],
  );

  const handleGridRemove = React.useCallback(async (id: string) => {
    const result = await deleteTemplateShift({ id });
    if (result.success) toastSuccess("Day cleared");
    else toastError(result);
  }, []);

  const shiftOptions = React.useMemo(
    () =>
      data.shiftTypes
        .filter((s) => s.isActive)
        .map((s) => ({ id: s.id, name: s.name, code: s.code, color: s.color })),
    [data.shiftTypes],
  );

  const cols = React.useMemo<ColumnDef<RosterTemplateRow, unknown>[]>(
    () => [
      { id: "name", accessorKey: "name", header: "Template Name" },
      { id: "cycle", accessorKey: "cycleLengthDays", header: "Cycle (days)" },
      {
        id: "anchor",
        accessorKey: "anchorDate",
        header: "Anchor Date",
        cell: ({ row }) =>
          row.original.anchorDate ? format(parseISO(row.original.anchorDate), "MMM d, yyyy") : "—",
      },
      {
        id: "status",
        accessorKey: "isActive",
        header: "Status",
        cell: ({ row }) => <StatusBadge status={row.original.isActive ? "active" : "inactive"} />,
      },
      {
        id: "grid",
        header: "Pattern",
        cell: ({ row }) => (
          <Button
            variant="ghost"
            size="sm"
            data-testid="hr-shifts-expand-grid"
            onClick={() =>
              setExpandedTemplate(expandedTemplate === row.original.id ? null : row.original.id)
            }
          >
            {expandedTemplate === row.original.id ? "Collapse" : "Edit Pattern"}
          </Button>
        ),
      },
      ...(canWrite
        ? [
            {
              id: "actions",
              header: "",
              cell: ({ row }: { row: { original: RosterTemplateRow } }) => (
                <Button
                  variant="ghost"
                  size="icon"
                  data-testid="hr-shifts-edit-template"
                  onClick={() => {
                    setEditing(row.original);
                    setSheetOpen(true);
                  }}
                >
                  <Pencil className="size-4" />
                </Button>
              ),
            } satisfies ColumnDef<RosterTemplateRow, unknown>,
          ]
        : []),
    ],
    [canWrite, expandedTemplate],
  );

  return (
    <section>
      <div className="mb-3 flex items-center justify-between">
        <h3 className="text-foreground text-base font-semibold">Roster Templates</h3>
        <div className="flex gap-2">
          {canWrite && (
            <>
              <Button
                size="sm"
                variant="outline"
                data-testid="hr-shifts-apply-pattern"
                onClick={() => {
                  setPreview(null);
                  setApplyOpen(true);
                }}
              >
                Save &amp; Apply
              </Button>
              <Button
                size="sm"
                data-testid="hr-shifts-add-template"
                onClick={() => {
                  setEditing(null);
                  setSheetOpen(true);
                }}
              >
                <Plus className="mr-1.5 size-4" /> Add Template
              </Button>
            </>
          )}
        </div>
      </div>
      <FilterableDataTable
        table={{
          columns: cols,
          data: data.rosterTemplates as RosterTemplateRow[],
          getRowId: (r) => r.id,
          mobileFieldPriority: ["name", "cycle"],
        }}
        data-testid="hr-shifts-templates-table"
      />

      {/* Expanded grid editor for selected template */}
      {expandedTemplate &&
        (() => {
          const tmpl = data.rosterTemplates.find((t) => t.id === expandedTemplate);
          if (!tmpl) return null;
          const templateAssignments = data.templateShifts
            .filter((ts) => ts.templateId === expandedTemplate)
            .map((ts) => ({ id: ts.id, dayIndex: ts.dayIndex, shiftTypeId: ts.shiftTypeId }));
          return (
            <div className="border-border-subtle bg-surface mt-3 rounded-lg border p-4">
              <p className="text-foreground mb-2 text-sm font-medium">
                {tmpl.name} — Pattern Editor
              </p>
              <RosterTemplateGrid
                templateId={expandedTemplate}
                cycleLengthDays={tmpl.cycleLengthDays}
                assignments={templateAssignments}
                shiftOptions={shiftOptions}
                onAssign={handleGridAssign}
                onRemove={handleGridRemove}
                disabled={!canWrite}
                data-testid="hr-shifts-template-grid"
              />
            </div>
          );
        })()}

      <FormSheet
        open={sheetOpen}
        onOpenChange={(o) => {
          if (!o) setEditing(null);
          setSheetOpen(o);
        }}
        title={editing ? "Edit Template" : "New Template"}
        formId="roster-template-form"
        pending={pending}
        data-testid="hr-shifts-template-sheet"
      >
        <form id="roster-template-form" action={handleSubmit} className="flex flex-col gap-4">
          <div>
            <Label htmlFor="rt-name">Name *</Label>
            <Input
              id="rt-name"
              name="name"
              defaultValue={editing?.name ?? ""}
              required
              data-testid="hr-shifts-template-name"
            />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label htmlFor="rt-cycle">Cycle (days) *</Label>
              <Input
                id="rt-cycle"
                name="cycleLengthDays"
                type="number"
                min={1}
                max={366}
                defaultValue={editing?.cycleLengthDays ?? 7}
                required
                data-testid="hr-shifts-template-cycle"
              />
            </div>
            <div>
              <Label htmlFor="rt-anchor">Anchor Date *</Label>
              <Input
                id="rt-anchor"
                name="anchorDate"
                type="date"
                defaultValue={editing?.anchorDate ?? ""}
                required
                data-testid="hr-shifts-template-anchor"
              />
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Switch
              id="rt-active"
              name="isActive"
              defaultChecked={editing?.isActive ?? true}
              data-testid="hr-shifts-template-active"
            />
            <Label htmlFor="rt-active">Active</Label>
          </div>
        </form>
      </FormSheet>

      {/* Save & Apply with preview step */}
      <FormSheet
        open={applyOpen}
        onOpenChange={(o) => {
          if (!o) {
            setPreview(null);
          }
          setApplyOpen(o);
        }}
        title="Save & Apply Pattern"
        description={
          preview ? "Review the impact before applying." : "Select a date range to preview changes."
        }
        {...(!preview ? { formId: "apply-preview-form", submitLabel: "Preview" } : {})}
        pending={applyPending}
        data-testid="hr-shifts-apply-sheet"
      >
        {!preview ? (
          <form id="apply-preview-form" action={handlePreview} className="flex flex-col gap-4">
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label htmlFor="ap-from">From *</Label>
                <Input
                  id="ap-from"
                  name="fromDate"
                  type="date"
                  required
                  data-testid="hr-shifts-apply-from"
                />
              </div>
              <div>
                <Label htmlFor="ap-to">To *</Label>
                <Input
                  id="ap-to"
                  name="toDate"
                  type="date"
                  required
                  data-testid="hr-shifts-apply-to"
                />
              </div>
            </div>
          </form>
        ) : (
          <div className="flex flex-col gap-4">
            <div className="bg-surface border-border-subtle rounded-lg border p-4 text-sm">
              <p className="text-foreground mb-2 font-medium">Impact Preview</p>
              <ul className="text-foreground-muted space-y-1">
                <li>
                  Staff affected:{" "}
                  <strong className="text-foreground">{preview.affected_staff_count}</strong>
                </li>
                <li>
                  New shifts to create:{" "}
                  <strong className="text-foreground">{preview.shifts_to_insert}</strong>
                </li>
                <li>
                  Existing shifts to update:{" "}
                  <strong className="text-foreground">{preview.shifts_to_update}</strong>
                </li>
                <li>
                  Stale rest days to clean:{" "}
                  <strong className="text-foreground">{preview.stale_rest_day_rows}</strong>
                </li>
                <li>
                  Manual overrides (kept):{" "}
                  <strong className="text-foreground">{preview.work_day_overrides}</strong>
                </li>
              </ul>
            </div>
            <div className="flex gap-2">
              <Button
                variant="outline"
                className="flex-1"
                data-testid="hr-shifts-apply-cancel"
                onClick={() => setPreview(null)}
              >
                Back
              </Button>
              <Button
                className="flex-1"
                data-testid="hr-shifts-apply-confirm"
                disabled={applyPending}
                onClick={() => void handleApply(false)}
              >
                Apply
              </Button>
              <Button
                variant="destructive"
                className="flex-1"
                data-testid="hr-shifts-apply-reset"
                disabled={applyPending}
                onClick={() => void handleApply(true)}
              >
                Reset All
              </Button>
            </div>
          </div>
        )}
      </FormSheet>
    </section>
  );
}

// ── Staff Assignments ──────────────────────────────────────────────────

function StaffAssignmentSection({ data, canWrite }: { data: ShiftPageData; canWrite: boolean }) {
  const [sheetOpen, setSheetOpen] = React.useState(false);
  const [pending, setPending] = React.useState(false);

  const handleSubmit = React.useCallback(async (fd: FormData) => {
    setPending(true);
    try {
      const result = await createStaffAssignment({
        staffRecordId: fd.get("staffRecordId") as string,
        rosterTemplateId: fd.get("rosterTemplateId") as string,
        effectiveStartDate: fd.get("effectiveStartDate") as string,
        effectiveEndDate: (fd.get("effectiveEndDate") as string) || undefined,
      });
      if (result.success) {
        toastSuccess("Assignment created");
        setSheetOpen(false);
      } else toastError(result);
    } finally {
      setPending(false);
    }
  }, []);

  const handleDelete = React.useCallback(async (id: string) => {
    const result = await deleteStaffAssignment({ id });
    if (result.success) toastSuccess("Assignment removed");
    else toastError(result);
  }, []);

  const cols = React.useMemo<ColumnDef<StaffAssignmentRow, unknown>[]>(
    () => [
      { id: "staff", accessorKey: "staffName", header: "Staff" },
      { id: "template", accessorKey: "rosterTemplateName", header: "Template" },
      {
        id: "start",
        accessorKey: "effectiveStartDate",
        header: "Start",
        cell: ({ row }) => format(parseISO(row.original.effectiveStartDate), "MMM d, yyyy"),
      },
      {
        id: "end",
        accessorKey: "effectiveEndDate",
        header: "End",
        cell: ({ row }) =>
          row.original.effectiveEndDate
            ? format(parseISO(row.original.effectiveEndDate), "MMM d, yyyy")
            : "Indefinite",
      },
      ...(canWrite
        ? [
            {
              id: "actions",
              header: "",
              cell: ({ row }: { row: { original: StaffAssignmentRow } }) => (
                <Button
                  variant="ghost"
                  size="icon"
                  data-testid="hr-shifts-delete-assignment"
                  onClick={() => void handleDelete(row.original.id)}
                >
                  <Trash2 className="size-4" />
                </Button>
              ),
            } satisfies ColumnDef<StaffAssignmentRow, unknown>,
          ]
        : []),
    ],
    [canWrite, handleDelete],
  );

  return (
    <section>
      <div className="mb-3 flex items-center justify-between">
        <h3 className="text-foreground text-base font-semibold">Staff Assignments</h3>
        {canWrite && (
          <Button size="sm" data-testid="hr-shifts-assign-staff" onClick={() => setSheetOpen(true)}>
            <Plus className="mr-1.5 size-4" /> Assign Staff
          </Button>
        )}
      </div>
      <FilterableDataTable
        table={{
          columns: cols,
          data: data.staffAssignments as StaffAssignmentRow[],
          getRowId: (r) => r.id,
          mobileFieldPriority: ["staff", "template"],
        }}
        data-testid="hr-shifts-assignments-table"
      />
      <FormSheet
        open={sheetOpen}
        onOpenChange={setSheetOpen}
        title="Assign Staff to Roster"
        formId="staff-assignment-form"
        pending={pending}
        data-testid="hr-shifts-assignment-sheet"
      >
        <form id="staff-assignment-form" action={handleSubmit} className="flex flex-col gap-4">
          <div>
            <Label htmlFor="sa-staff">Staff *</Label>
            <Select name="staffRecordId" required>
              <SelectTrigger id="sa-staff" data-testid="hr-shifts-assignment-staff">
                <SelectValue placeholder="Select staff" />
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
            <Label htmlFor="sa-template">Template *</Label>
            <Select name="rosterTemplateId" required>
              <SelectTrigger id="sa-template" data-testid="hr-shifts-assignment-template">
                <SelectValue placeholder="Select template" />
              </SelectTrigger>
              <SelectContent>
                {data.rosterTemplates.map((t) => (
                  <SelectItem key={t.id} value={t.id}>
                    {t.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label htmlFor="sa-start">Start *</Label>
              <Input
                id="sa-start"
                name="effectiveStartDate"
                type="date"
                required
                data-testid="hr-shifts-assignment-start"
              />
            </div>
            <div>
              <Label htmlFor="sa-end">End</Label>
              <Input
                id="sa-end"
                name="effectiveEndDate"
                type="date"
                data-testid="hr-shifts-assignment-end"
              />
            </div>
          </div>
        </form>
      </FormSheet>
    </section>
  );
}

// ── Tab 2: Schedule Overview ───────────────────────────────────────────

const OVERRIDE_VALUES = ["true"] as const;

function OverviewTab({
  data,
  overviewPage,
}: {
  data: ShiftPageData;
  overviewPage: ScheduleOverviewPage;
}) {
  const shiftTypeId = useUrlString("shiftTypeId", { resetParams: CURSOR_RESET_PARAMS });
  const override = useUrlEnum("override", OVERRIDE_VALUES, { resetParams: CURSOR_RESET_PARAMS });

  const hasActiveFilters = !!shiftTypeId.value || !!override.value;

  const resetAll = (): void => {
    shiftTypeId.set(null);
    override.set(null);
  };

  const selectedShiftType = React.useMemo(
    () => data.shiftTypes.find((s) => s.id === shiftTypeId.value) ?? null,
    [data.shiftTypes, shiftTypeId.value],
  );

  const chips: React.ReactNode[] = [];
  if (selectedShiftType) {
    chips.push(
      <FilterChip
        key="shift"
        name="Shift"
        label={selectedShiftType.name}
        onRemove={() => shiftTypeId.set(null)}
        data-testid="hr-shifts-overview-chip-shift"
      />,
    );
  }
  if (override.value) {
    chips.push(
      <FilterChip
        key="override"
        name="Filter"
        label="Overrides only"
        onRemove={() => override.set(null)}
        data-testid="hr-shifts-overview-chip-override"
      />,
    );
  }

  const cols = React.useMemo<ColumnDef<ScheduleOverviewRow, unknown>[]>(
    () => [
      { id: "staff", accessorKey: "staffName", header: "Staff" },
      {
        id: "date",
        accessorKey: "shiftDate",
        header: "Date",
        cell: ({ row }) => format(parseISO(row.original.shiftDate), "EEE, MMM d"),
      },
      { id: "shift", accessorKey: "shiftTypeName", header: "Shift" },
      {
        id: "start",
        accessorKey: "expectedStartTime",
        header: "Start",
        cell: ({ row }) => row.original.expectedStartTime ?? "—",
      },
      {
        id: "end",
        accessorKey: "expectedEndTime",
        header: "End",
        cell: ({ row }) => row.original.expectedEndTime ?? "—",
      },
      {
        id: "override",
        accessorKey: "isOverride",
        header: "Override",
        cell: ({ row }) =>
          row.original.isOverride ? (
            <StatusBadge status="override" tone="accent" label="Override" />
          ) : null,
      },
    ],
    [],
  );

  const nextCursorToken = overviewPage.nextCursor
    ? encodeShiftCursor(overviewPage.nextCursor.shiftDate, overviewPage.nextCursor.id)
    : null;

  return (
    <FilterableDataTable
      kpis={
        <KpiCardRow>
          <KpiCard
            label="Total Shifts"
            value={overviewPage.totalShifts}
            icon={<Calendar aria-hidden className="size-4" />}
            data-testid="hr-shifts-kpi-total"
          />
          <KpiCard
            label="Overrides"
            value={overviewPage.overridesCount}
            icon={<AlertTriangle aria-hidden className="size-4" />}
            data-testid="hr-shifts-kpi-overrides"
          />
          <KpiCard
            label="Unfilled Days"
            value={0}
            icon={<Clock aria-hidden className="size-4" />}
            data-testid="hr-shifts-kpi-unfilled"
          />
        </KpiCardRow>
      }
      toolbar={
        <FilterBar
          data-testid="hr-shifts-overview-filters"
          hasActiveFilters={hasActiveFilters}
          onClearAll={resetAll}
          search={
            <UrlSearchInput
              param="staffSearch"
              resetParams={CURSOR_RESET_PARAMS}
              placeholder="Search staff…"
              aria-label="Search staff"
              debounceMs={300}
              data-testid="hr-shifts-overview-search"
            />
          }
          controls={
            <>
              <UrlDateRangePicker
                fromParam="from"
                toParam="to"
                resetParams={CURSOR_RESET_PARAMS}
                placeholder="Any date"
                clearable
                aria-label="Date range"
                data-testid="hr-shifts-overview-filter-date"
                className="min-w-[16rem] sm:w-auto"
              />
              <Select
                value={shiftTypeId.value ?? ""}
                onValueChange={(next) => shiftTypeId.set(next === "" ? null : next)}
              >
                <SelectTrigger
                  className="h-10 min-w-[10rem] sm:w-auto"
                  aria-label="Shift type"
                  data-testid="hr-shifts-overview-filter-shift"
                >
                  <SelectValue placeholder="Any shift" />
                </SelectTrigger>
                <SelectContent>
                  {data.shiftTypes.map((s) => (
                    <SelectItem key={s.id} value={s.id}>
                      {s.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <Button
                variant={override.value ? "default" : "outline"}
                size="sm"
                className="h-10"
                onClick={() => override.set(override.value ? null : "true")}
                data-testid="hr-shifts-overview-filter-override"
              >
                <AlertTriangle className="mr-1.5 size-4" aria-hidden /> Overrides only
              </Button>
            </>
          }
          chips={chips.length > 0 ? chips : null}
        />
      }
      table={{
        columns: cols,
        data: overviewPage.rows as ScheduleOverviewRow[],
        getRowId: (r) => r.id,
        mobileFieldPriority: ["staff", "date", "shift"],
      }}
      pagination={
        <CursorPagination
          nextCursorToken={nextCursorToken}
          defaultPageSize={SHIFT_OVERVIEW_DEFAULT_PAGE_SIZE}
          pageSizeOptions={SHIFT_OVERVIEW_PAGE_SIZES}
          onAfterPaginate={() => {
            if (typeof window !== "undefined") window.scrollTo({ top: 0, behavior: "smooth" });
          }}
          data-testid="hr-shifts-overview-pagination"
        />
      }
      hasActiveFilters={hasActiveFilters}
      data-testid="hr-shifts-overview-table"
    />
  );
}

// ── Tab 3: Daily Editor ────────────────────────────────────────────────

function DailyTab({
  data,
  overviewPage,
  canApply,
}: {
  data: ShiftPageData;
  overviewPage: ScheduleOverviewPage;
  canApply: boolean;
}) {
  const [dayOffOpen, setDayOffOpen] = React.useState(false);
  const [dayOffPending, setDayOffPending] = React.useState(false);

  const shiftTypeId = useUrlString("shiftTypeId", { resetParams: CURSOR_RESET_PARAMS });
  const hasActiveFilters = !!shiftTypeId.value;

  const resetAll = (): void => {
    shiftTypeId.set(null);
  };

  const handleMarkDayOff = React.useCallback(async (fd: FormData) => {
    setDayOffPending(true);
    try {
      const result = await markDayOff({
        date: fd.get("date") as string,
        name: fd.get("name") as string,
      });
      if (result.success) {
        toastSuccess("Day off marked");
        setDayOffOpen(false);
      } else toastError(result);
    } finally {
      setDayOffPending(false);
    }
  }, []);

  const handleOverride = React.useCallback(async (scheduleId: string, shiftTypeIdVal: string) => {
    const result = await updateScheduleOverride({ id: scheduleId, shiftTypeId: shiftTypeIdVal });
    if (result.success) toastSuccess("Schedule updated");
    else toastError(result);
  }, []);

  const selectedShiftType = React.useMemo(
    () => data.shiftTypes.find((s) => s.id === shiftTypeId.value) ?? null,
    [data.shiftTypes, shiftTypeId.value],
  );

  const chips: React.ReactNode[] = [];
  if (selectedShiftType) {
    chips.push(
      <FilterChip
        key="shift"
        name="Shift"
        label={selectedShiftType.name}
        onRemove={() => shiftTypeId.set(null)}
        data-testid="hr-shifts-daily-chip-shift"
      />,
    );
  }

  const cols = React.useMemo<ColumnDef<ScheduleOverviewRow, unknown>[]>(
    () => [
      { id: "staff", accessorKey: "staffName", header: "Staff" },
      {
        id: "date",
        accessorKey: "shiftDate",
        header: "Date",
        cell: ({ row }) => format(parseISO(row.original.shiftDate), "EEE, MMM d"),
      },
      { id: "shift", accessorKey: "shiftTypeName", header: "Current Shift" },
      ...(canApply
        ? [
            {
              id: "change",
              header: "Change Shift",
              cell: ({ row }: { row: { original: ScheduleOverviewRow } }) => (
                <Select onValueChange={(v) => void handleOverride(row.original.id, v)}>
                  <SelectTrigger className="h-8 w-32" data-testid="hr-shifts-override-select">
                    <SelectValue placeholder="Override…" />
                  </SelectTrigger>
                  <SelectContent>
                    {data.shiftTypes
                      .filter((s) => s.isActive)
                      .map((s) => (
                        <SelectItem key={s.id} value={s.id}>
                          {s.name}
                        </SelectItem>
                      ))}
                  </SelectContent>
                </Select>
              ),
            } satisfies ColumnDef<ScheduleOverviewRow, unknown>,
          ]
        : []),
    ],
    [canApply, data.shiftTypes, handleOverride],
  );

  const nextCursorToken = overviewPage.nextCursor
    ? encodeShiftCursor(overviewPage.nextCursor.shiftDate, overviewPage.nextCursor.id)
    : null;

  return (
    <>
      <FilterableDataTable
        toolbar={
          <FilterBar
            data-testid="hr-shifts-daily-filters"
            hasActiveFilters={hasActiveFilters}
            onClearAll={resetAll}
            search={
              <UrlSearchInput
                param="staffSearch"
                resetParams={CURSOR_RESET_PARAMS}
                placeholder="Search staff…"
                aria-label="Search staff"
                debounceMs={300}
                data-testid="hr-shifts-daily-search"
              />
            }
            controls={
              <>
                <UrlDateRangePicker
                  fromParam="from"
                  toParam="to"
                  resetParams={CURSOR_RESET_PARAMS}
                  placeholder="Any date"
                  clearable
                  aria-label="Date range"
                  data-testid="hr-shifts-daily-filter-date"
                  className="min-w-[16rem] sm:w-auto"
                />
                <Select
                  value={shiftTypeId.value ?? ""}
                  onValueChange={(next) => shiftTypeId.set(next === "" ? null : next)}
                >
                  <SelectTrigger
                    className="h-10 min-w-[10rem] sm:w-auto"
                    aria-label="Shift type"
                    data-testid="hr-shifts-daily-filter-shift"
                  >
                    <SelectValue placeholder="Any shift" />
                  </SelectTrigger>
                  <SelectContent>
                    {data.shiftTypes.map((s) => (
                      <SelectItem key={s.id} value={s.id}>
                        {s.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </>
            }
            moreAction={
              canApply ? (
                <Button
                  size="sm"
                  variant="outline"
                  data-testid="hr-shifts-mark-dayoff"
                  onClick={() => setDayOffOpen(true)}
                >
                  <Calendar className="mr-1.5 size-4" aria-hidden /> Mark Day Off
                </Button>
              ) : null
            }
            chips={chips.length > 0 ? chips : null}
          />
        }
        table={{
          columns: cols,
          data: overviewPage.rows as ScheduleOverviewRow[],
          getRowId: (r) => r.id,
          mobileFieldPriority: ["staff", "date", "shift"],
        }}
        pagination={
          <CursorPagination
            nextCursorToken={nextCursorToken}
            defaultPageSize={SHIFT_OVERVIEW_DEFAULT_PAGE_SIZE}
            pageSizeOptions={SHIFT_OVERVIEW_PAGE_SIZES}
            onAfterPaginate={() => {
              if (typeof window !== "undefined") window.scrollTo({ top: 0, behavior: "smooth" });
            }}
            data-testid="hr-shifts-daily-pagination"
          />
        }
        hasActiveFilters={hasActiveFilters}
        data-testid="hr-shifts-daily-table"
      />
      <FormSheet
        open={dayOffOpen}
        onOpenChange={setDayOffOpen}
        title="Mark Day Off"
        formId="day-off-form"
        submitLabel="Mark Day Off"
        pending={dayOffPending}
        data-testid="hr-shifts-dayoff-sheet"
      >
        <form id="day-off-form" action={handleMarkDayOff} className="flex flex-col gap-4">
          <div>
            <Label htmlFor="do-date">Date *</Label>
            <Input
              id="do-date"
              name="date"
              type="date"
              required
              data-testid="hr-shifts-dayoff-date"
            />
          </div>
          <div>
            <Label htmlFor="do-name">Name *</Label>
            <Input
              id="do-name"
              name="name"
              placeholder="Company Day Off"
              required
              data-testid="hr-shifts-dayoff-name"
            />
          </div>
        </form>
      </FormSheet>
    </>
  );
}

// ── Holidays Section ───────────────────────────────────────────────────

function HolidaysSection({
  holidays,
  canWrite,
}: {
  holidays: readonly PublicHolidayRow[];
  canWrite: boolean;
}) {
  const handleDelete = React.useCallback(async (id: string) => {
    const result = await deleteHoliday({ id });
    if (result.success) toastSuccess("Holiday removed");
    else toastError(result);
  }, []);

  const cols = React.useMemo<ColumnDef<PublicHolidayRow, unknown>[]>(
    () => [
      {
        id: "date",
        accessorKey: "holidayDate",
        header: "Date",
        cell: ({ row }) => format(parseISO(row.original.holidayDate), "EEE, MMM d, yyyy"),
      },
      { id: "name", accessorKey: "name", header: "Name" },
      ...(canWrite
        ? [
            {
              id: "actions",
              header: "",
              cell: ({ row }: { row: { original: PublicHolidayRow } }) => (
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={() => void handleDelete(row.original.id)}
                >
                  <Trash2 className="size-4" />
                </Button>
              ),
            } satisfies ColumnDef<PublicHolidayRow, unknown>,
          ]
        : []),
    ],
    [canWrite, handleDelete],
  );

  return (
    <section>
      <h3 className="text-foreground mb-3 text-base font-semibold">Public Holidays</h3>
      <FilterableDataTable
        table={{
          columns: cols,
          data: holidays as PublicHolidayRow[],
          getRowId: (r) => r.id,
          mobileFieldPriority: ["date", "name"],
        }}
        data-testid="hr-shifts-holidays-table"
      />
    </section>
  );
}
