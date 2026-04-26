"use client";

import * as React from "react";
import type { Route } from "next";
import {
  User,
  Mail,
  Phone,
  Building,
  Briefcase,
  Calendar,
  MapPin,
  ArrowRightLeft,
  Edit,
  Heart,
  Package,
} from "lucide-react";
import { format, parseISO } from "date-fns";
import { parseAsString, useQueryState } from "nuqs";

import { StatusBadge } from "@/components/ui/status-badge";
import { SectionCard } from "@/components/ui/section-card";
import { MetadataList, type MetadataItem } from "@/components/ui/metadata-list";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Label } from "@/components/ui/label";

import { Textarea } from "@/components/ui/textarea";
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { EmptyStateCta } from "@/components/shared/empty-state-cta";
import { toastSuccess, toastError } from "@/components/ui/toast-helpers";

import { DetailPageShell } from "@/components/shared/detail-page-shell";
import { StatusTabBar } from "@/components/ui/status-tab-bar";

import type { StaffDetailData } from "@/features/hr/types/staff-detail";
import {
  assignLeavePolicy,
  createTransferRequest,
} from "@/features/hr/actions/staff-detail-actions";

// ── Status tones ────────────────────────────────────────────────────────

const STATUS_TONE: Record<string, "success" | "warning" | "danger" | "info" | "neutral"> = {
  active: "success",
  pending: "info",
  on_leave: "warning",
  suspended: "danger",
  terminated: "neutral",
};

// ── Props ──────────────────────────────────────────────────────────────

type StaffDetailViewProps = Readonly<{
  data: StaffDetailData;
  canWrite: boolean;
  orgUnits: ReadonlyArray<{ id: string; name: string }>;
}>;

// ── Component ──────────────────────────────────────────────────────────

export function StaffDetailView({ data, canWrite, orgUnits }: StaffDetailViewProps) {
  const { profile } = data;

  const headerMetadata: MetadataItem[] = [
    ...(profile.employeeId
      ? [{ label: "Employee ID", value: profile.employeeId, testId: "hr-detail-empid" }]
      : []),
    ...(profile.roleName
      ? [{ label: "Role", value: profile.roleName, testId: "hr-detail-role" }]
      : []),
    ...(profile.orgUnitName
      ? [{ label: "Org Unit", value: profile.orgUnitName, testId: "hr-detail-orgunit" }]
      : []),
  ];

  return (
    <DetailPageShell
      breadcrumb={[
        { label: "HR", href: "/management/hr" as Route },
        { label: profile.displayName ?? profile.legalName, current: true as const },
      ]}
      header={{
        title: profile.displayName ?? profile.legalName,
        eyebrow: "STAFF",
        status: (
          <StatusBadge
            status={profile.employmentStatus}
            tone={STATUS_TONE[profile.employmentStatus] ?? "neutral"}
          />
        ),
        metadata: headerMetadata,
        description: profile.businessEmail ?? profile.personalEmail ?? undefined,
      }}
      data-testid="hr-staff-detail"
    >
      <StatusTabBar
        tabs={[
          { value: "profile", label: "Profile" },
          { value: "leave-policy", label: "Leave Policy", count: data.leaveBalances.length },
          { value: "equipment", label: "Equipment", count: data.equipmentAssignments.length },
        ]}
        paramKey="tab"
        defaultValue="profile"
        ariaLabel="Staff detail sections"
        panelIdPrefix="hr-detail-tab"
        data-testid="hr-detail-tabs"
      />
      <StaffDetailTabContent data={data} canWrite={canWrite} orgUnits={orgUnits} />
    </DetailPageShell>
  );
}

const STAFF_TABS = ["profile", "leave-policy", "equipment"] as const;
type StaffTabValue = (typeof STAFF_TABS)[number];

function StaffDetailTabContent({
  data,
  canWrite,
  orgUnits,
}: {
  data: StaffDetailData;
  canWrite: boolean;
  orgUnits: readonly { id: string; name: string }[];
}) {
  const [tab] = useQueryState(
    "tab",
    parseAsString.withDefault("profile").withOptions({ clearOnDefault: true, history: "replace" }),
  );
  const current: StaffTabValue = (STAFF_TABS as readonly string[]).includes(tab)
    ? (tab as StaffTabValue)
    : "profile";

  return (
    <div
      role="tabpanel"
      id={`hr-detail-tab-${current}`}
      aria-labelledby={`tab-tab-${current}`}
      data-testid={`hr-detail-panel-${current}`}
    >
      {current === "profile" ? (
        <ProfileTab data={data} canWrite={canWrite} orgUnits={orgUnits} />
      ) : null}
      {current === "leave-policy" ? <LeavePolicyTab data={data} canWrite={canWrite} /> : null}
      {current === "equipment" ? <EquipmentTab data={data} /> : null}
    </div>
  );
}

// ── Profile Tab ─────────────────────────────────────────────────────────

function ProfileTab({
  data,
  canWrite,
  orgUnits: _orgUnits,
}: Readonly<{
  data: StaffDetailData;
  canWrite: boolean;
  orgUnits: ReadonlyArray<{ id: string; name: string }>;
}>) {
  const { profile, attendanceSummary } = data;
  const [transferOpen, setTransferOpen] = React.useState(false);

  return (
    <div className="flex flex-col gap-4">
      {/* Attendance summary */}
      <SectionCard
        title="This Month"
        description="Attendance snapshot from shift records."
        data-testid="hr-detail-attendance-summary"
      >
        <MetadataList
          layout="grid"
          cols={4}
          items={[
            {
              label: "Days Present",
              value: String(attendanceSummary.daysPresent),
              testId: "hr-detail-present",
            },
            {
              label: "Days Absent",
              value: String(attendanceSummary.daysAbsent),
              testId: "hr-detail-absent",
            },
            {
              label: "Days Late",
              value: String(attendanceSummary.daysLate),
              testId: "hr-detail-late",
            },
            {
              label: "Open Exceptions",
              value: String(attendanceSummary.openExceptions),
              testId: "hr-detail-exceptions",
            },
          ]}
          data-testid="hr-detail-attendance-grid"
        />
      </SectionCard>

      {/* Personal Information */}
      <SectionCard
        title="Personal Information"
        action={
          canWrite ? (
            <Button variant="ghost" size="sm" data-testid="hr-detail-edit-personal">
              <Edit aria-hidden className="size-3.5" />
              Edit
            </Button>
          ) : undefined
        }
        data-testid="hr-detail-personal"
      >
        <MetadataList
          layout="grid"
          cols={2}
          items={[
            {
              label: (
                <span className="flex items-center gap-1.5">
                  <User aria-hidden className="size-3" />
                  Legal Name
                </span>
              ),
              value: profile.legalName,
              testId: "hr-detail-legal-name",
            },
            {
              label: (
                <span className="flex items-center gap-1.5">
                  <Mail aria-hidden className="size-3" />
                  Personal Email
                </span>
              ),
              value: profile.personalEmail ?? "—",
              testId: "hr-detail-personal-email",
            },
            {
              label: (
                <span className="flex items-center gap-1.5">
                  <Mail aria-hidden className="size-3" />
                  Business Email
                </span>
              ),
              value: profile.businessEmail ?? "—",
              testId: "hr-detail-business-email",
            },
            {
              label: (
                <span className="flex items-center gap-1.5">
                  <Phone aria-hidden className="size-3" />
                  Phone
                </span>
              ),
              value: profile.phone ?? "—",
              testId: "hr-detail-phone",
            },
            {
              label: (
                <span className="flex items-center gap-1.5">
                  <MapPin aria-hidden className="size-3" />
                  Address
                </span>
              ),
              value: profile.address ?? "—",
              testId: "hr-detail-address",
            },
          ]}
          data-testid="hr-detail-personal-grid"
        />
      </SectionCard>

      {/* Employment */}
      <SectionCard
        title="Employment"
        action={
          canWrite ? (
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setTransferOpen(true)}
              data-testid="hr-detail-transfer-btn"
            >
              <ArrowRightLeft aria-hidden className="size-3.5" />
              Transfer
            </Button>
          ) : undefined
        }
        data-testid="hr-detail-employment"
      >
        <MetadataList
          layout="grid"
          cols={2}
          items={[
            {
              label: (
                <span className="flex items-center gap-1.5">
                  <Briefcase aria-hidden className="size-3" />
                  Role
                </span>
              ),
              value: profile.roleName ?? "Unassigned",
              testId: "hr-detail-role-field",
            },
            {
              label: (
                <span className="flex items-center gap-1.5">
                  <Building aria-hidden className="size-3" />
                  Org Unit
                </span>
              ),
              value: profile.orgUnitName ?? "Unassigned",
              testId: "hr-detail-orgunit-field",
            },
            {
              label: (
                <span className="flex items-center gap-1.5">
                  <Calendar aria-hidden className="size-3" />
                  Contract Start
                </span>
              ),
              value: profile.contractStart
                ? format(parseISO(profile.contractStart), "dd MMM yyyy")
                : "—",
              testId: "hr-detail-contract-start",
            },
            {
              label: (
                <span className="flex items-center gap-1.5">
                  <Calendar aria-hidden className="size-3" />
                  Contract End
                </span>
              ),
              value: profile.contractEnd
                ? format(parseISO(profile.contractEnd), "dd MMM yyyy")
                : "Open-ended",
              testId: "hr-detail-contract-end",
            },
          ]}
          data-testid="hr-detail-employment-grid"
        />
      </SectionCard>

      {/* Next of Kin */}
      <SectionCard title="Next of Kin" data-testid="hr-detail-kin">
        <MetadataList
          layout="grid"
          cols={3}
          items={[
            {
              label: (
                <span className="flex items-center gap-1.5">
                  <Heart aria-hidden className="size-3" />
                  Name
                </span>
              ),
              value: profile.kinName ?? "—",
              testId: "hr-detail-kin-name",
            },
            {
              label: "Relationship",
              value: profile.kinRelationship ?? "—",
              testId: "hr-detail-kin-rel",
            },
            {
              label: (
                <span className="flex items-center gap-1.5">
                  <Phone aria-hidden className="size-3" />
                  Emergency Phone
                </span>
              ),
              value: profile.kinPhone ?? "—",
              testId: "hr-detail-kin-phone",
            },
          ]}
          data-testid="hr-detail-kin-grid"
        />
      </SectionCard>

      {/* Transfer Dialog */}
      {canWrite ? (
        <TransferDialog
          open={transferOpen}
          onOpenChange={setTransferOpen}
          staffRecordId={profile.id}
          currentRoleId={profile.roleId}
          availableRoles={data.availableRoles}
        />
      ) : null}
    </div>
  );
}

// ── Leave Policy Tab ────────────────────────────────────────────────────

function LeavePolicyTab({
  data,
  canWrite,
}: Readonly<{ data: StaffDetailData; canWrite: boolean }>) {
  const [isPending, startTransition] = React.useTransition();

  const handlePolicyChange = (policyId: string): void => {
    startTransition(async () => {
      const result = await assignLeavePolicy({
        staffId: data.profile.id,
        leavePolicyId: policyId,
      });
      if (result.success) {
        toastSuccess("Leave policy assigned");
      } else {
        toastError(result);
      }
    });
  };

  return (
    <div className="flex flex-col gap-4">
      {/* Policy assignment */}
      <SectionCard
        title="Assigned Policy"
        description="Controls leave entitlements and accrual rules."
        data-testid="hr-detail-leave-policy"
      >
        <div className="flex items-center gap-4">
          <div className="flex flex-col gap-1">
            <Label className="text-foreground-subtle text-xs">Current Policy</Label>
            {canWrite ? (
              <Select
                value={data.leavePolicyId ?? ""}
                onValueChange={handlePolicyChange}
                disabled={isPending}
              >
                <SelectTrigger className="w-64" data-testid="hr-detail-policy-select">
                  <SelectValue placeholder="No policy assigned" />
                </SelectTrigger>
                <SelectContent>
                  {data.availableLeavePolicies.map((p) => (
                    <SelectItem key={p.id} value={p.id}>
                      {p.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            ) : (
              <span className="text-foreground text-sm font-medium">
                {data.leavePolicyName ?? "No policy assigned"}
              </span>
            )}
          </div>
        </div>
      </SectionCard>

      {/* Balances */}
      <SectionCard
        title="Leave Balances"
        description="Current accrued, used, and remaining leave by type."
        data-testid="hr-detail-leave-balances"
      >
        {data.leaveBalances.length === 0 ? (
          <EmptyStateCta
            title="No leave balances"
            description="Assign a leave policy to see entitlements."
            icon={<Calendar className="size-8" />}
          />
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-border-subtle border-b">
                  <th className="text-foreground-subtle pb-2 text-left text-xs font-medium tracking-wider uppercase">
                    Type
                  </th>
                  <th className="text-foreground-subtle pb-2 text-right text-xs font-medium tracking-wider uppercase">
                    Accrued
                  </th>
                  <th className="text-foreground-subtle pb-2 text-right text-xs font-medium tracking-wider uppercase">
                    Carried
                  </th>
                  <th className="text-foreground-subtle pb-2 text-right text-xs font-medium tracking-wider uppercase">
                    Adjusted
                  </th>
                  <th className="text-foreground-subtle pb-2 text-right text-xs font-medium tracking-wider uppercase">
                    Used
                  </th>
                  <th className="text-foreground-subtle pb-2 text-right text-xs font-medium tracking-wider uppercase">
                    Forfeited
                  </th>
                  <th className="text-foreground-subtle pb-2 text-right text-xs font-medium tracking-wider uppercase">
                    Balance
                  </th>
                </tr>
              </thead>
              <tbody>
                {data.leaveBalances.map((lb) => (
                  <tr
                    key={lb.leaveTypeName}
                    className="border-border-subtle border-b last:border-0"
                  >
                    <td className="text-foreground py-2 font-medium">{lb.leaveTypeName}</td>
                    <td className="text-foreground-muted py-2 text-right tabular-nums">
                      {lb.accrued}
                    </td>
                    <td className="text-foreground-muted py-2 text-right tabular-nums">
                      {lb.carried}
                    </td>
                    <td className="text-foreground-muted py-2 text-right tabular-nums">
                      {lb.adjusted}
                    </td>
                    <td className="text-foreground-muted py-2 text-right tabular-nums">
                      {lb.used}
                    </td>
                    <td className="text-foreground-muted py-2 text-right tabular-nums">
                      {lb.forfeited}
                    </td>
                    <td className="text-foreground py-2 text-right font-semibold tabular-nums">
                      {lb.balance}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </SectionCard>
    </div>
  );
}

// ── Equipment Tab ───────────────────────────────────────────────────────

function EquipmentTab({ data }: Readonly<{ data: StaffDetailData }>) {
  return (
    <SectionCard
      title="Equipment Custody"
      description="Assets assigned to this staff member."
      data-testid="hr-detail-equipment"
    >
      {data.equipmentAssignments.length === 0 ? (
        <EmptyStateCta
          title="No equipment assigned"
          description="This staff member has no equipment in custody."
          icon={<Package className="size-8" />}
        />
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-border-subtle border-b">
                <th className="text-foreground-subtle pb-2 text-left text-xs font-medium tracking-wider uppercase">
                  Item
                </th>
                <th className="text-foreground-subtle pb-2 text-left text-xs font-medium tracking-wider uppercase">
                  Serial
                </th>
                <th className="text-foreground-subtle pb-2 text-left text-xs font-medium tracking-wider uppercase">
                  Assigned
                </th>
                <th className="text-foreground-subtle pb-2 text-left text-xs font-medium tracking-wider uppercase">
                  Returned
                </th>
              </tr>
            </thead>
            <tbody>
              {data.equipmentAssignments.map((eq) => (
                <tr key={eq.id} className="border-border-subtle border-b last:border-0">
                  <td className="text-foreground py-2 font-medium">{eq.materialName}</td>
                  <td className="text-foreground-muted py-2 font-mono text-xs">
                    {eq.serialNumber ?? "—"}
                  </td>
                  <td className="text-foreground-muted py-2">
                    {format(parseISO(eq.assignedAt), "dd MMM yyyy")}
                  </td>
                  <td className="py-2">
                    {eq.returnedAt ? (
                      <span className="text-foreground-muted">
                        {format(parseISO(eq.returnedAt), "dd MMM yyyy")}
                      </span>
                    ) : (
                      <StatusBadge status="in_custody" tone="info" />
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </SectionCard>
  );
}

// ── Transfer Dialog ─────────────────────────────────────────────────────

function TransferDialog({
  open,
  onOpenChange,
  staffRecordId,
  currentRoleId,
  availableRoles,
}: Readonly<{
  open: boolean;
  onOpenChange: (open: boolean) => void;
  staffRecordId: string;
  currentRoleId: string | null;
  availableRoles: ReadonlyArray<{ id: string; displayName: string }>;
}>) {
  const [targetRoleId, setTargetRoleId] = React.useState("");
  const [hrRemark, setHrRemark] = React.useState("");
  const [isPending, startTransition] = React.useTransition();

  const handleConfirm = (): void => {
    startTransition(async () => {
      const result = await createTransferRequest({
        staffRecordId,
        currentRoleId,
        targetRoleId,
        hrRemark: hrRemark.trim() || undefined,
      });
      if (result.success) {
        toastSuccess("Transfer request created", {
          description: "Awaiting IT approval.",
        });
        onOpenChange(false);
        setTargetRoleId("");
        setHrRemark("");
      } else {
        toastError(result);
      }
    });
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent data-testid="hr-detail-transfer-dialog">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <ArrowRightLeft aria-hidden className="size-4" />
            Request Role Transfer
          </DialogTitle>
          <DialogDescription>
            Create an IAM transfer request. This will be routed to IT for approval.
          </DialogDescription>
        </DialogHeader>
        <div className="flex flex-col gap-4">
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="hr-transfer-target-role">Target Role *</Label>
            <Select value={targetRoleId} onValueChange={setTargetRoleId}>
              <SelectTrigger id="hr-transfer-target-role" data-testid="hr-transfer-role-select">
                <SelectValue placeholder="Select new role" />
              </SelectTrigger>
              <SelectContent>
                {availableRoles
                  .filter((r) => r.id !== currentRoleId)
                  .map((r) => (
                    <SelectItem key={r.id} value={r.id}>
                      {r.displayName}
                    </SelectItem>
                  ))}
              </SelectContent>
            </Select>
          </div>
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="hr-transfer-remark">HR Note (optional)</Label>
            <Textarea
              id="hr-transfer-remark"
              value={hrRemark}
              onChange={(e) => setHrRemark(e.target.value)}
              placeholder="Reason for transfer…"
              rows={3}
              data-testid="hr-transfer-remark"
            />
          </div>
        </div>
        <DialogFooter>
          <DialogClose asChild>
            <Button type="button" variant="outline">
              Cancel
            </Button>
          </DialogClose>
          <Button
            type="button"
            disabled={isPending || !targetRoleId}
            onClick={handleConfirm}
            data-testid="hr-transfer-confirm"
          >
            {isPending ? "Creating…" : "Create Transfer Request"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
