"use client";

import { useEffect, useState, useTransition } from "react";
import dynamic from "next/dynamic";

import { useRouter } from "@/i18n/navigation";

import { formatDistanceToNow } from "date-fns";
import { MapPin, LogOut } from "lucide-react";

import { Button } from "@/components/ui/button";
import { EmptyStateCta } from "@/components/shared/empty-state-cta";
import { FormSection } from "@/components/ui/form-section";
import { MetadataList } from "@/components/ui/metadata-list";
import { PageHeader } from "@/components/ui/page-header";
import { SectionCard } from "@/components/ui/section-card";
import { CardSkeleton } from "@/components/ui/skeleton-kit";
import { StatusBadge } from "@/components/ui/status-badge";
import { toastError, toastSuccess } from "@/components/ui/toast-helpers";
import { scanZoneAction } from "@/features/operations/actions/scan-zone";
import { leaveZoneAction } from "@/features/operations/actions/leave-zone";
import type { ZoneScanContext } from "@/features/operations/types";

// QR scanner loaded lazily per Phase 8 crew-specific gate (camera/QR via next/dynamic)
const QRScanner = dynamic(() => import("@/components/shared/qr-scanner").then((m) => m.QRScanner), {
  loading: () => <CardSkeleton />,
  ssr: false,
});

type ZoneScanViewProps = Readonly<{ initialContext: ZoneScanContext | null }>;

export function ZoneScanView({ initialContext }: ZoneScanViewProps) {
  const router = useRouter();
  const [context, setContext] = useState(initialContext);
  const [isPending, startTransition] = useTransition();

  // Sync local state when the RSC re-renders with fresh server data
  // (after router.refresh). Optimistic updates via setContext remain
  // responsive; they are replaced by canonical server state on next render.
  useEffect(() => {
    setContext(initialContext);
  }, [initialContext]);

  function handleScan(qrValue: string) {
    startTransition(async () => {
      const result = await scanZoneAction(qrValue);
      if (result.success) {
        toastSuccess("Zone scanned.");
        router.refresh();
      } else {
        toastError(result);
      }
    });
  }

  function handleLeave() {
    startTransition(async () => {
      const result = await leaveZoneAction();
      if (result.success) {
        toastSuccess("Zone left.");
        setContext((prev) =>
          prev
            ? {
                ...prev,
                currentZone: null,
                recentEntries: prev.recentEntries.map((e) =>
                  e.leftAt === null ? { ...e, leftAt: new Date().toISOString() } : e,
                ),
              }
            : null,
        );
        router.refresh();
      } else {
        toastError(result);
      }
    });
  }

  if (!context) {
    return (
      <div className="flex flex-col gap-4">
        <PageHeader
          title="Zone Declaration"
          description="Scan QR to declare your location"
          density="compact"
          data-testid="zone-scan-page-header"
        />
        <div className="p-4">
          <EmptyStateCta
            variant="first-use"
            title="No staff record linked"
            description="Your account is not linked to a staff record. Contact HR."
            data-testid="zone-scan-no-record"
          />
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-6" data-testid="zone-scan-view">
      <PageHeader
        title="Zone Declaration"
        description="Scan QR to declare your location"
        density="compact"
        data-testid="zone-scan-page-header"
      />
      {/* Current zone card */}
      {context.currentZone ? (
        <SectionCard
          title={
            <span className="flex items-center gap-2">
              <MapPin size={16} className="text-primary" />
              <span className="text-primary font-semibold">{context.currentZone.zoneName}</span>
            </span>
          }
          action={<StatusBadge status="active" tone="success" label="Active" />}
          data-testid="current-zone-card"
        >
          <MetadataList
            layout="inline"
            items={[
              {
                label: "Entered",
                value: formatDistanceToNow(new Date(context.currentZone.scannedAt), {
                  addSuffix: true,
                }),
              },
            ]}
            className="mb-3"
          />
          <Button
            variant="outline"
            className="min-h-[48px] w-full gap-2 font-semibold"
            onClick={handleLeave}
            disabled={isPending}
            data-testid="leave-zone-button"
          >
            <LogOut size={16} />
            {isPending ? "Leaving…" : "Leave Zone"}
          </Button>
        </SectionCard>
      ) : (
        <SectionCard headless className="text-center" data-testid="no-zone-card">
          <p className="text-foreground-muted px-4 py-4 text-sm">Not currently in any zone</p>
        </SectionCard>
      )}

      {/* QR Scanner */}
      <FormSection title="Scan Zone QR" data-testid="zone-scan-section">
        <QRScanner onScan={handleScan} disabled={isPending} />
      </FormSection>

      {/* Recent entries */}
      {context.recentEntries.length > 0 && (
        <FormSection title="Recent Entries" divider data-testid="zone-history-section">
          <div className="flex flex-col gap-2" data-testid="zone-history-list">
            {context.recentEntries.map((entry) => (
              <SectionCard key={entry.id} headless data-testid={`zone-entry-${entry.id}`}>
                <div className="flex items-center justify-between gap-2 px-3 py-2">
                  <span className="text-sm font-medium">{entry.zoneName}</span>
                  <MetadataList
                    layout="inline"
                    items={[
                      {
                        label: "",
                        value: formatDistanceToNow(new Date(entry.scannedAt), { addSuffix: true }),
                      },
                    ]}
                  />
                </div>
              </SectionCard>
            ))}
          </div>
        </FormSection>
      )}
    </div>
  );
}
