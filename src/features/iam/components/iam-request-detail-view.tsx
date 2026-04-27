"use client";

import * as React from "react";
import {
  Check,
  X,
  Clock,
  User,
  Briefcase,
  Mail,
  Building,
  Calendar,
  MessageSquare,
} from "lucide-react";
import { SectionCard } from "@/components/ui/section-card";
import { StatusBadge } from "@/components/ui/status-badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { toastSuccess, toastError } from "@/components/ui/toast-helpers";

import type { IamRequestDetail } from "@/features/iam/queries/get-iam-request-detail";
import { approveIamRequest, rejectIamRequest } from "@/features/iam/actions/process-iam-request";

// ── Props ──────────────────────────────────────────────────────────────

type IamRequestDetailViewProps = Readonly<{
  request: IamRequestDetail;
  canWrite: boolean;
}>;

// ── Component ──────────────────────────────────────────────────────────

export function IamRequestDetailView({ request, canWrite }: IamRequestDetailViewProps) {
  const isPendingIT = request.status === "pending_it";
  const waitingSince = isPendingIT ? formatDuration(new Date(request.createdAt)) : null;

  return (
    <div className="flex flex-col gap-6" data-testid="iam-request-detail">
      {/* ── Status Header ────────────────────────────────────────────── */}
      <div className="flex flex-wrap items-center gap-3">
        <StatusBadge status={request.requestType} tone={getTypeTone(request.requestType)} />
        <StatusBadge status={request.status} />
        {waitingSince ? (
          <span className="text-foreground-muted text-sm">• Waiting {waitingSince}</span>
        ) : null}
      </div>

      {/* ── HR Remark (always visible if present) ────────────────────── */}
      {request.hrRemark ? (
        <SectionCard
          title="HR Notes"
          description="Remarks submitted by Human Resources with this request."
          data-testid="iam-detail-hr-notes"
        >
          <div className="flex items-start gap-3">
            <MessageSquare aria-hidden className="text-brand-primary mt-0.5 size-4 shrink-0" />
            <p className="text-foreground text-sm whitespace-pre-wrap">{request.hrRemark}</p>
          </div>
        </SectionCard>
      ) : null}

      {/* ── IT Remark (shown if present — post-decision) ─────────────── */}
      {request.itRemark ? (
        <SectionCard
          title="IT Notes"
          description="Remarks added by IT during processing."
          data-testid="iam-detail-it-notes"
        >
          <div className="flex items-start gap-3">
            <MessageSquare aria-hidden className="text-foreground-muted mt-0.5 size-4 shrink-0" />
            <p className="text-foreground text-sm whitespace-pre-wrap">{request.itRemark}</p>
          </div>
        </SectionCard>
      ) : null}

      {/* ── Action Strip (pending only — approve / reject) ───────────── */}
      {isPendingIT && canWrite ? (
        <PendingActions
          requestId={request.id}
          requestType={request.requestType}
          staffName={request.staffName}
        />
      ) : null}

      {/* ── Staff Details Card ───────────────────────────────────────── */}
      <SectionCard
        title="Staff Information"
        description="HR record linked to this IAM request."
        data-testid="iam-detail-staff"
      >
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <MetadataField
            icon={<User aria-hidden className="size-4" />}
            label="Legal Name"
            value={request.staffName}
            testId="iam-detail-staff-name"
          />
          <MetadataField
            icon={<Mail aria-hidden className="size-4" />}
            label="Personal Email"
            value={request.personalEmail}
            testId="iam-detail-staff-email"
          />
          <MetadataField
            icon={<Building aria-hidden className="size-4" />}
            label="Org Unit"
            value={request.orgUnitName ?? "—"}
            testId="iam-detail-org-unit"
          />
          <MetadataField
            icon={<Calendar aria-hidden className="size-4" />}
            label="Contract"
            value={`${formatDate(request.contractStart)}${request.contractEnd ? ` → ${formatDate(request.contractEnd)}` : " → Present"}`}
            testId="iam-detail-contract"
          />
        </div>
      </SectionCard>

      {/* ── Request-Specific Section ─────────────────────────────────── */}
      <SectionCard
        title={getRequestSectionTitle(request.requestType)}
        description={getRequestSectionDescription(request.requestType)}
        data-testid="iam-detail-request-section"
      >
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          {(request.requestType === "provisioning" || request.requestType === "transfer") && (
            <>
              <MetadataField
                icon={<Briefcase aria-hidden className="size-4" />}
                label="Target Role"
                value={request.targetRoleName ?? "—"}
                testId="iam-detail-target-role"
              />
              <MetadataField
                icon={<Briefcase aria-hidden className="size-4" />}
                label="Current Role"
                value={request.currentRoleName ?? "N/A"}
                testId="iam-detail-current-role"
              />
            </>
          )}

          {request.requestType === "provisioning" && request.status !== "pending_it" && (
            <MetadataField
              icon={<Mail aria-hidden className="size-4" />}
              label="Business Email"
              value={generateBusinessEmail(request.staffName)}
              testId="iam-detail-business-email"
            />
          )}
        </div>
      </SectionCard>

      {/* ── Timeline / Resolution ────────────────────────────────────── */}
      <SectionCard title="Timeline" data-testid="iam-detail-timeline">
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <MetadataField
            icon={<Clock aria-hidden className="size-4" />}
            label="Created"
            value={formatDateTime(request.createdAt)}
            testId="iam-detail-created"
          />
          {waitingSince && (
            <MetadataField
              icon={<Clock aria-hidden className="size-4" />}
              label="Waiting"
              value={waitingSince}
              testId="iam-detail-waiting"
            />
          )}
          {request.approvedAt && (
            <MetadataField
              label={request.status === "approved" ? "Approved" : "Resolved"}
              value={formatDateTime(request.approvedAt)}
              testId="iam-detail-resolved-at"
            />
          )}
          {request.approvedByName && (
            <MetadataField
              label="Processed by"
              value={request.approvedByName}
              testId="iam-detail-resolved-by"
            />
          )}
          {request.inviteSentAt && (
            <MetadataField
              label="Invite Sent"
              value={formatDateTime(request.inviteSentAt)}
              testId="iam-detail-invite-sent"
            />
          )}
        </div>
      </SectionCard>
    </div>
  );
}

// ── Pending Actions (Approve / Reject with IT remark dialog) ───────────

type DialogAction = "approve" | "reject" | null;

function PendingActions({
  requestId,
  requestType,
  staffName,
}: Readonly<{
  requestId: string;
  requestType: string;
  staffName: string;
}>) {
  const [dialogAction, setDialogAction] = React.useState<DialogAction>(null);
  const [itRemark, setItRemark] = React.useState("");
  const [isPending, startTransition] = React.useTransition();

  const isProvisioning = requestType === "provisioning";
  const defaultEmail = isProvisioning ? generateBusinessEmail(staffName) : "";
  const [businessEmail, setBusinessEmail] = React.useState(defaultEmail);

  // Display name: first + last from legal_name
  const nameParts = staffName.trim().split(/\s+/);
  const defaultDisplayName =
    nameParts.length > 1 ? `${nameParts[0]} ${nameParts[nameParts.length - 1]}` : nameParts[0];
  const [displayName, setDisplayName] = React.useState(defaultDisplayName);

  // Employee ID: auto-generated placeholder (real value computed server-side)
  const [employeeId, setEmployeeId] = React.useState("");

  const closeDialog = () => {
    setDialogAction(null);
    setItRemark("");
  };

  const handleConfirm = () => {
    if (dialogAction === "approve") {
      startTransition(async () => {
        const result = await approveIamRequest({
          requestId,
          ...(itRemark.trim() ? { itRemark: itRemark.trim() } : {}),
          ...(isProvisioning && businessEmail !== defaultEmail
            ? { businessEmailOverride: businessEmail }
            : {}),
          ...(isProvisioning && displayName !== defaultDisplayName
            ? { displayNameOverride: displayName }
            : {}),
          ...(isProvisioning && employeeId ? { employeeIdOverride: employeeId } : {}),
        });
        if (result.success) {
          toastSuccess("Request approved");
          closeDialog();
        } else {
          toastError(result);
        }
      });
    } else if (dialogAction === "reject") {
      startTransition(async () => {
        const result = await rejectIamRequest({ requestId, itRemark });
        if (result.success) {
          toastSuccess("Request rejected");
          closeDialog();
        } else {
          toastError(result);
        }
      });
    }
  };

  return (
    <>
      {/* Action Strip */}
      <div
        className="border-brand-primary/30 bg-brand-primary/5 flex flex-col gap-4 rounded-lg border px-4 py-4"
        data-testid="iam-detail-action-strip"
      >
        <p className="text-foreground text-sm font-medium">
          This request is awaiting your decision.
        </p>

        {/* Provisioning override fields */}
        {isProvisioning ? (
          <div className="flex w-full flex-wrap gap-3">
            <div className="flex min-w-[200px] flex-1 flex-col gap-1.5">
              <Label htmlFor="iam-business-email" className="text-foreground-muted text-xs">
                Business Email (editable)
              </Label>
              <Input
                id="iam-business-email"
                type="email"
                value={businessEmail}
                onChange={(e) => setBusinessEmail(e.target.value)}
                placeholder="first.last@agartha.com"
                data-testid="iam-detail-business-email-input"
              />
            </div>
            <div className="flex min-w-[160px] flex-1 flex-col gap-1.5">
              <Label htmlFor="iam-display-name" className="text-foreground-muted text-xs">
                Display Name (editable)
              </Label>
              <Input
                id="iam-display-name"
                value={displayName}
                onChange={(e) => setDisplayName(e.target.value)}
                placeholder={defaultDisplayName}
                data-testid="iam-detail-display-name-input"
              />
            </div>
            <div className="flex min-w-[120px] flex-col gap-1.5">
              <Label htmlFor="iam-employee-id" className="text-foreground-muted text-xs">
                Employee ID (auto or override)
              </Label>
              <Input
                id="iam-employee-id"
                value={employeeId}
                onChange={(e) => setEmployeeId(e.target.value)}
                placeholder="EMP0120 (auto)"
                data-testid="iam-detail-employee-id-input"
              />
            </div>
          </div>
        ) : null}

        <div className="flex items-center gap-2">
          <Button
            type="button"
            variant="default"
            size="sm"
            onClick={() => setDialogAction("approve")}
            data-testid="iam-detail-approve"
          >
            <Check aria-hidden className="size-4" />
            Approve
          </Button>
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={() => setDialogAction("reject")}
            data-testid="iam-detail-reject"
          >
            <X aria-hidden className="size-4" />
            Reject
          </Button>
        </div>
      </div>

      {/* Shared IT Remark dialog for both approve and reject */}
      <Dialog
        open={dialogAction !== null}
        onOpenChange={(open) => {
          if (!open) closeDialog();
        }}
      >
        <DialogContent data-testid="iam-detail-action-dialog">
          <DialogHeader>
            <DialogTitle>
              {dialogAction === "approve" ? "Approve" : "Reject"} IAM Request
            </DialogTitle>
            <DialogDescription>
              {dialogAction === "approve"
                ? "Add an optional IT note before approving. Leave blank to approve without a note."
                : "Please provide a reason for rejecting this request. This will be visible to HR."}
            </DialogDescription>
          </DialogHeader>
          <div className="flex flex-col gap-2">
            <Label htmlFor="iam-action-remark">
              IT Note {dialogAction === "reject" ? "(required)" : "(optional)"}
            </Label>
            <Textarea
              id="iam-action-remark"
              value={itRemark}
              onChange={(e) => setItRemark(e.target.value)}
              placeholder={
                dialogAction === "approve"
                  ? "Optional note for this approval…"
                  : "Reason for rejection…"
              }
              rows={3}
              data-testid="iam-detail-action-remark"
            />
          </div>
          <DialogFooter>
            <DialogClose asChild>
              <Button type="button" variant="outline">
                Cancel
              </Button>
            </DialogClose>
            <Button
              type="button"
              variant={dialogAction === "reject" ? "destructive" : "default"}
              disabled={isPending || (dialogAction === "reject" && itRemark.trim().length === 0)}
              onClick={handleConfirm}
              data-testid="iam-detail-action-confirm"
            >
              {isPending
                ? "Processing…"
                : dialogAction === "approve"
                  ? "Confirm Approval"
                  : "Reject Request"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}

// ── Metadata Field ──────────────────────────────────────────────────────

function MetadataField({
  icon,
  label,
  value,
  testId,
}: Readonly<{
  icon?: React.ReactNode;
  label: string;
  value: string;
  testId: string;
}>) {
  return (
    <div className="flex items-start gap-3" data-testid={testId}>
      {icon ? <span className="text-foreground-subtle mt-0.5 shrink-0">{icon}</span> : null}
      <div className="flex flex-col gap-0.5">
        <span className="text-foreground-subtle text-xs font-medium tracking-wider uppercase">
          {label}
        </span>
        <span className="text-foreground text-sm">{value}</span>
      </div>
    </div>
  );
}

// ── Helpers ─────────────────────────────────────────────────────────────

function getTypeTone(type: string) {
  switch (type) {
    case "provisioning":
      return "info" as const;
    case "transfer":
      return "accent" as const;
    case "termination":
      return "danger" as const;
    case "suspension":
      return "warning" as const;
    case "reactivation":
      return "success" as const;
    default:
      return "neutral" as const;
  }
}

function formatDuration(since: Date): string {
  const now = Date.now();
  const diffMs = now - since.getTime();
  const diffHours = Math.floor(diffMs / 3600000);
  if (diffHours < 1) return `${Math.max(1, Math.floor(diffMs / 60000))}m ago`;
  if (diffHours < 24) return `${diffHours}h ago`;
  return `${Math.floor(diffHours / 24)}d ago`;
}

function formatDate(iso: string): string {
  return new Date(iso).toLocaleDateString("en-MY", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
}

function formatDateTime(iso: string): string {
  return new Date(iso).toLocaleString("en-MY", {
    day: "2-digit",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function generateBusinessEmail(legalName: string): string {
  const parts = legalName.toLowerCase().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return "unknown@agartha.com";
  if (parts.length === 1) return `${parts[0]}@agartha.com`;
  return `${parts[0]}.${parts[parts.length - 1]}@agartha.com`;
}

function getRequestSectionTitle(type: string): string {
  switch (type) {
    case "provisioning":
      return "Provisioning Details";
    case "transfer":
      return "Transfer Details";
    case "termination":
      return "Termination Details";
    case "suspension":
      return "Suspension Details";
    case "reactivation":
      return "Reactivation Details";
    default:
      return "Request Details";
  }
}

function getRequestSectionDescription(type: string): string {
  switch (type) {
    case "provisioning":
      return "New account provisioning and role assignment.";
    case "transfer":
      return "Role transfer from current to target position.";
    case "termination":
      return "Account termination and access revocation.";
    case "suspension":
      return "Temporary account suspension.";
    case "reactivation":
      return "Account reactivation and access restoration.";
    default:
      return "Request information.";
  }
}
