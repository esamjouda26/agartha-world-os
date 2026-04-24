"use client";

import { useState, useTransition } from "react";
import dynamic from "next/dynamic";

import { formatDistanceToNow } from "date-fns";
import { MapPin, LogOut } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { CardSkeleton } from "@/components/ui/skeleton-kit";
import { toastError, toastSuccess } from "@/components/ui/toast-helpers";
import { scanZoneAction } from "@/features/operations/actions/scan-zone";
import { leaveZoneAction } from "@/features/operations/actions/leave-zone";
import type { ZoneScanContext } from "@/features/operations/types";

// QR scanner loaded lazily per Phase 8 crew-specific gate (camera/QR via next/dynamic)
const QRScanner = dynamic(() => import("@/components/shared/qr-scanner").then((m) => m.QRScanner), {
  loading: () => <CardSkeleton />,
  ssr: false,
});

type ZoneScanViewProps = Readonly<{ initialContext: ZoneScanContext }>;

export function ZoneScanView({ initialContext }: ZoneScanViewProps) {
  const [context, setContext] = useState(initialContext);
  const [isPending, startTransition] = useTransition();

  function handleScan(qrValue: string) {
    startTransition(async () => {
      const result = await scanZoneAction(qrValue);
      if (result.success) {
        toastSuccess("Zone scanned.");
        // RSC will revalidate on next navigation; show optimistic feedback.
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
        setContext((prev) => ({
          ...prev,
          currentZone: null,
          recentEntries: prev.recentEntries.map((e) =>
            e.leftAt === null ? { ...e, leftAt: new Date().toISOString() } : e,
          ),
        }));
      } else {
        toastError(result);
      }
    });
  }

  return (
    <div className="flex flex-col gap-6 p-4" data-testid="zone-scan-view">
      {/* Current zone card */}
      {context.currentZone ? (
        <div
          className="border-primary/30 bg-primary/5 flex flex-col gap-3 rounded-2xl border p-4"
          data-testid="current-zone-card"
        >
          <div className="flex items-center gap-2">
            <MapPin size={16} className="text-primary" />
            <span className="text-primary font-semibold">{context.currentZone.zoneName}</span>
            <Badge variant="default" className="ml-auto text-xs">
              Active
            </Badge>
          </div>
          <p className="text-muted-foreground text-xs">
            Entered{" "}
            {formatDistanceToNow(new Date(context.currentZone.scannedAt), { addSuffix: true })}
          </p>
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
        </div>
      ) : (
        <div className="border-border bg-card text-muted-foreground rounded-2xl border p-4 text-center text-sm">
          Not currently in any zone
        </div>
      )}

      {/* QR Scanner */}
      <section aria-labelledby="zone-scan-heading">
        <h2
          id="zone-scan-heading"
          className="text-muted-foreground mb-3 text-sm font-semibold tracking-wider uppercase"
        >
          Scan Zone QR
        </h2>
        <QRScanner onScan={handleScan} disabled={isPending} />
      </section>

      {/* Recent entries */}
      {context.recentEntries.length > 0 && (
        <section aria-labelledby="zone-history-heading">
          <h2
            id="zone-history-heading"
            className="text-muted-foreground mb-3 text-sm font-semibold tracking-wider uppercase"
          >
            Recent Entries
          </h2>
          <ul className="flex flex-col gap-2" data-testid="zone-history-list">
            {context.recentEntries.map((entry) => (
              <li
                key={entry.id}
                className="border-border bg-card flex items-center justify-between gap-2 rounded-xl border px-3 py-2 text-sm"
                data-testid={`zone-entry-${entry.id}`}
              >
                <span className="font-medium">{entry.zoneName}</span>
                <span className="text-muted-foreground text-xs">
                  {formatDistanceToNow(new Date(entry.scannedAt), { addSuffix: true })}
                </span>
              </li>
            ))}
          </ul>
        </section>
      )}
    </div>
  );
}
