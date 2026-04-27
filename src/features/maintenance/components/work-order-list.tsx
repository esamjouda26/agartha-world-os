"use client";

import { useState, useTransition } from "react";

import { formatDistanceToNow, intervalToDuration } from "date-fns";
import { Wrench } from "lucide-react";

import { useRouter } from "@/i18n/navigation";
import { Button } from "@/components/ui/button";
import { EmptyStateCta } from "@/components/shared/empty-state-cta";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { MetadataList } from "@/components/ui/metadata-list";
import { PageHeader } from "@/components/ui/page-header";
import { SectionCard } from "@/components/ui/section-card";
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetFooter } from "@/components/ui/sheet";
import { StatusBadge } from "@/components/ui/status-badge";
import { Textarea } from "@/components/ui/textarea";
import { toastError, toastSuccess } from "@/components/ui/toast-helpers";
import { authorizeOrderAction } from "@/features/maintenance/actions/authorize-order";
import { revokeOrderAction } from "@/features/maintenance/actions/revoke-order";
import type { WorkOrderView } from "@/features/maintenance/types";

type WorkOrderListProps = Readonly<{ orders: ReadonlyArray<WorkOrderView> }>;

function formatAccessLimit(minutes: number | null): string {
  if (!minutes) return "—";
  const dur = intervalToDuration({ start: 0, end: minutes * 60 * 1000 });
  return `${dur.hours ?? 0}h ${dur.minutes ?? 0}m`;
}

// ── Authorize Sheet ───────────────────────────────────────────────────────────
// Per CLAUDE.md §5: Sheet for lightweight create/edit forms on mobile.
// Dialogs reserved for lg+ confirmation flows — not suitable for auth forms
// where the crew member is typically on a phone at the job site.

function AuthorizeSheet({
  orderId,
  open,
  onClose,
}: Readonly<{ orderId: string; open: boolean; onClose: () => void }>) {
  const router = useRouter();
  const [mac, setMac] = useState("");
  const [isPending, startTransition] = useTransition();

  function handleConfirm() {
    startTransition(async () => {
      const result = await authorizeOrderAction({ orderId, vendorMacAddress: mac });
      if (result.success) {
        toastSuccess("Vendor authorized.");
        setMac("");
        onClose();
        router.refresh();
      } else {
        toastError(result);
      }
    });
  }

  function handleClose() {
    setMac("");
    onClose();
  }

  return (
    <Sheet open={open} onOpenChange={(v) => !v && handleClose()}>
      <SheetContent side="bottom" className="rounded-t-2xl">
        <SheetHeader className="mb-4">
          <SheetTitle>Authorize Vendor Access</SheetTitle>
        </SheetHeader>

        <div className="flex flex-col gap-3">
          <Label htmlFor="vendor-mac">Vendor MAC Address</Label>
          <Input
            id="vendor-mac"
            value={mac}
            onChange={(e) => setMac(e.target.value)}
            placeholder="AA:BB:CC:DD:EE:FF"
            className="min-h-[48px] font-mono"
            autoComplete="off"
            data-testid="authorize-mac-input"
            aria-describedby="vendor-mac-hint"
          />
          <p id="vendor-mac-hint" className="text-foreground-muted text-xs">
            Format: AA:BB:CC:DD:EE:FF or AA-BB-CC-DD-EE-FF
          </p>
        </div>

        <SheetFooter className="mt-6 flex flex-col gap-2">
          <Button
            className="min-h-[52px] w-full font-semibold"
            onClick={handleConfirm}
            disabled={isPending || !mac.trim()}
            data-testid="authorize-confirm"
          >
            {isPending ? "Authorizing…" : "Authorize Vendor"}
          </Button>
          <Button
            variant="ghost"
            className="min-h-[44px] w-full"
            onClick={handleClose}
            data-testid="authorize-cancel"
          >
            Cancel
          </Button>
        </SheetFooter>
      </SheetContent>
    </Sheet>
  );
}

// ── Revoke Sheet ──────────────────────────────────────────────────────────────

function RevokeSheet({
  orderId,
  open,
  onClose,
}: Readonly<{ orderId: string; open: boolean; onClose: () => void }>) {
  const router = useRouter();
  const [remark, setRemark] = useState("");
  const [isPending, startTransition] = useTransition();

  function handleConfirm() {
    startTransition(async () => {
      const result = await revokeOrderAction({ orderId, sponsorRemark: remark });
      if (result.success) {
        toastSuccess("Work order completed.");
        setRemark("");
        onClose();
        router.refresh();
      } else {
        toastError(result);
      }
    });
  }

  function handleClose() {
    setRemark("");
    onClose();
  }

  return (
    <Sheet open={open} onOpenChange={(v) => !v && handleClose()}>
      <SheetContent side="bottom" className="rounded-t-2xl">
        <SheetHeader className="mb-4">
          <SheetTitle>Complete Work Order</SheetTitle>
        </SheetHeader>

        <div className="flex flex-col gap-3">
          <Label htmlFor="sponsor-remark">Sponsor remark</Label>
          <Textarea
            id="sponsor-remark"
            value={remark}
            onChange={(e) => setRemark(e.target.value)}
            placeholder="Describe what was done or note any issues…"
            rows={4}
            className="resize-none text-base"
            data-testid="revoke-remark-input"
          />
        </div>

        <SheetFooter className="mt-6 flex flex-col gap-2">
          <Button
            className="min-h-[52px] w-full font-semibold"
            onClick={handleConfirm}
            disabled={isPending || !remark.trim()}
            data-testid="revoke-confirm"
          >
            {isPending ? "Completing…" : "Mark Completed"}
          </Button>
          <Button
            variant="ghost"
            className="min-h-[44px] w-full"
            onClick={handleClose}
            data-testid="revoke-cancel"
          >
            Cancel
          </Button>
        </SheetFooter>
      </SheetContent>
    </Sheet>
  );
}

// ── WorkOrderList ─────────────────────────────────────────────────────────────

export function WorkOrderList({ orders }: WorkOrderListProps) {
  const [authorizeId, setAuthorizeId] = useState<string | null>(null);
  const [revokeId, setRevokeId] = useState<string | null>(null);

  const scheduled = orders.filter((o) => o.status === "scheduled");
  const active = orders.filter((o) => o.status === "active");

  if (orders.length === 0) {
    return (
      <div className="flex flex-col gap-4">
        <PageHeader
          title="My Work Orders"
          description="Authorize and complete maintenance jobs"
          density="compact"
          data-testid="work-orders-page-header"
        />
        <div className="p-4">
          <EmptyStateCta
            variant="first-use"
            title="No work orders"
            description="Work orders where you are the sponsor will appear here."
            data-testid="work-orders-empty"
          />
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-4" data-testid="work-order-list">
      <PageHeader
        title="My Work Orders"
        description="Authorize and complete maintenance jobs"
        density="compact"
        data-testid="work-orders-page-header"
      />
      {/* Summary strip */}
      <MetadataList
        layout="inline"
        items={[
          {
            label: "Scheduled",
            value: <strong className="font-semibold tabular-nums">{scheduled.length}</strong>,
          },
          {
            label: "Active",
            value: (
              <strong className="text-primary font-semibold tabular-nums">{active.length}</strong>
            ),
          },
        ]}
        className="border-border bg-surface/40 rounded-xl border px-4 py-3"
        data-testid="work-order-summary"
      />

      {orders.map((order) => (
        <SectionCard
          key={order.id}
          title={
            <span className="flex min-w-0 items-center gap-2">
              <Wrench size={14} className="text-foreground-muted shrink-0" />
              <span className="truncate">{order.vendorName}</span>
            </span>
          }
          action={
            <StatusBadge
              status={order.status ?? "scheduled"}
              enum="mo_status"
              data-testid={`wo-status-${order.id}`}
            />
          }
          data-testid={`work-order-card-${order.id}`}
        >
          <MetadataList
            layout="grid"
            cols={2}
            items={[
              { label: "Topology", value: order.topology === "remote" ? "Remote" : "Onsite" },
              { label: "Device", value: order.deviceName },
              ...(order.deviceLocation ? [{ label: "Location", value: order.deviceLocation }] : []),
              {
                label: "Window",
                value: `${new Date(order.maintenanceStart).toLocaleString()} – ${new Date(order.maintenanceEnd).toLocaleTimeString()}`,
              },
              { label: "Access limit", value: formatAccessLimit(order.madLimitMinutes) },
              {
                label: "Ends",
                value: formatDistanceToNow(new Date(order.maintenanceEnd), { addSuffix: true }),
              },
            ]}
            data-testid={`wo-meta-${order.id}`}
          />

          {/* Actions — Sheets instead of Dialogs (CLAUDE.md §5: sheet for mobile forms) */}
          {order.topology === "onsite" && order.status === "scheduled" && (
            <Button
              className="mt-3 min-h-[48px] w-full font-semibold"
              onClick={() => setAuthorizeId(order.id)}
              data-testid={`work-order-authorize-${order.id}`}
            >
              Authorize Vendor
            </Button>
          )}
          {order.status === "active" && (
            <Button
              variant="outline"
              className="border-destructive text-destructive hover:bg-destructive/5 mt-3 min-h-[48px] w-full font-semibold"
              onClick={() => setRevokeId(order.id)}
              data-testid={`work-order-revoke-${order.id}`}
            >
              Mark Completed
            </Button>
          )}
        </SectionCard>
      ))}

      <AuthorizeSheet
        orderId={authorizeId ?? ""}
        open={authorizeId !== null}
        onClose={() => setAuthorizeId(null)}
      />
      <RevokeSheet
        orderId={revokeId ?? ""}
        open={revokeId !== null}
        onClose={() => setRevokeId(null)}
      />
    </div>
  );
}
