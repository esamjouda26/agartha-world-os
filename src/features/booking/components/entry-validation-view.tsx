"use client";

import { useState, useTransition } from "react";
import dynamic from "next/dynamic";

import { Hash, User, Baby } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { MetadataList } from "@/components/ui/metadata-list";
import { SearchInput } from "@/components/ui/search-input";
import { SectionCard } from "@/components/ui/section-card";
import { CardSkeleton } from "@/components/ui/skeleton-kit";
import { StatusBadge, type StatusTone } from "@/components/ui/status-badge";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { toastError, toastSuccess } from "@/components/ui/toast-helpers";
import { lookupBookingAction } from "@/features/booking/actions/lookup-booking";
import { searchBookingsByEmailAction } from "@/features/booking/actions/search-bookings";
import { checkinBookingAction } from "@/features/booking/actions/checkin-booking";
import type { BookingLookupResult, BookingSearchResult } from "@/features/booking/types";

// Camera/QR widget loaded lazily per Phase 8 crew-specific gate
const QRScanner = dynamic(() => import("@/components/shared/qr-scanner").then((m) => m.QRScanner), {
  loading: () => <CardSkeleton />,
  ssr: false,
});

// ── Local: BookingResultCard ──────────────────────────────────────────────────

type BookingResultCardProps = Readonly<{
  booking: BookingLookupResult;
  onCheckedIn: () => void;
}>;

type ArrivalTone = StatusTone;
type ArrivalStatus = Readonly<{
  label: string;
  tone: ArrivalTone;
  description: string;
}>;

/**
 * Lateness classifier driven by the experience's arrival window
 * (init_schema.sql: experiences.arrival_window_minutes, surfaced by
 * rpc_lookup_booking at init_schema.sql:5600).
 *
 *   • before slot_start                          → "Early"      (info)
 *   • slot_start … slot_start + window           → "On time"   (success)
 *   • slot_start + window … +30 min              → "Late"      (warning)
 *   • > slot_start + window + 30 min             → "Very late" (danger)
 */
function classifyArrival(
  slotDate: string,
  startTime: string,
  windowMinutes: number,
  now: Date = new Date(),
): ArrivalStatus {
  const start = new Date(`${slotDate}T${startTime}`);
  if (Number.isNaN(start.getTime())) {
    return { label: "Unknown", tone: "neutral", description: "Slot time is unavailable." };
  }
  const deltaMin = (now.getTime() - start.getTime()) / 60_000;

  if (deltaMin < 0) {
    return {
      label: "Early",
      tone: "info",
      description: `Arrives in ${Math.ceil(-deltaMin)} min.`,
    };
  }
  if (deltaMin <= windowMinutes) {
    return {
      label: "On time",
      tone: "success",
      description: `Within the ${windowMinutes}-min arrival window.`,
    };
  }
  if (deltaMin <= windowMinutes + 30) {
    return {
      label: "Late",
      tone: "warning",
      description: `${Math.round(deltaMin - windowMinutes)} min past arrival window.`,
    };
  }
  return {
    label: "Very late",
    tone: "danger",
    description: `${Math.round(deltaMin - windowMinutes)} min past arrival window — verify before admitting.`,
  };
}

function BookingResultCard({ booking, onCheckedIn }: BookingResultCardProps) {
  const [isPending, startTransition] = useTransition();
  const canCheckIn = booking.status === "confirmed" || booking.status === "no_show";

  // Recompute on each render so the indicator stays accurate while the
  // crew member dwells on the result. arrival_window_minutes lives on the
  // experience row and is returned by rpc_lookup_booking.
  const arrival = classifyArrival(
    booking.slot_date,
    booking.start_time,
    booking.arrival_window_minutes ?? 0,
  );

  function handleCheckin() {
    startTransition(async () => {
      const result = await checkinBookingAction({
        bookingId: booking.booking_id,
        idempotencyKey: crypto.randomUUID(),
      });
      if (result.success) {
        toastSuccess(`Guest ${booking.booker_name} checked in.`);
        onCheckedIn();
      } else {
        toastError(result);
      }
    });
  }

  return (
    <SectionCard
      title={booking.booker_name}
      description={booking.booking_ref}
      action={
        <StatusBadge
          status={booking.status}
          enum="booking_status"
          data-testid={`booking-status-${booking.booking_id}`}
        />
      }
      data-testid={`booking-result-card-${booking.booking_id}`}
    >
      <MetadataList
        layout="grid"
        cols={2}
        items={[
          { label: "Experience", value: booking.experience_name },
          { label: "Tier", value: booking.tier_name },
          { label: "Date", value: booking.slot_date },
          { label: "Time", value: booking.start_time },
        ]}
        data-testid={`booking-meta-${booking.booking_id}`}
      />

      {/* Attendee panel — counts come straight from the booking row. */}
      <div
        className="border-border-subtle mt-3 grid grid-cols-2 gap-2 rounded-lg border p-3"
        data-testid={`booking-attendees-${booking.booking_id}`}
      >
        <div className="flex items-center gap-2">
          <User aria-hidden className="text-foreground-muted size-4" />
          <span className="text-sm">
            <span className="text-foreground font-semibold">{booking.adult_count}</span> adult
            {booking.adult_count === 1 ? "" : "s"}
          </span>
        </div>
        <div className="flex items-center gap-2">
          <Baby aria-hidden className="text-foreground-muted size-4" />
          <span className="text-sm">
            <span className="text-foreground font-semibold">{booking.child_count}</span> child
            {booking.child_count === 1 ? "" : "ren"}
          </span>
        </div>
      </div>

      {/* Arrival window / lateness indicator. */}
      <div
        className="mt-3 flex items-center justify-between gap-2 text-sm"
        data-testid={`booking-arrival-${booking.booking_id}`}
      >
        <div className="flex flex-col">
          <span className="text-foreground-muted text-xs">Arrival</span>
          <span className="text-foreground-muted text-xs">{arrival.description}</span>
        </div>
        <StatusBadge
          status={arrival.label}
          tone={arrival.tone}
          label={arrival.label}
          data-testid={`booking-arrival-badge-${booking.booking_id}`}
        />
      </div>

      {canCheckIn && (
        <Button
          className="mt-3 min-h-[48px] w-full font-semibold"
          onClick={handleCheckin}
          disabled={isPending}
          data-testid={`booking-checkin-button-${booking.booking_id}`}
        >
          {isPending ? "Checking in…" : "Check In"}
        </Button>
      )}
    </SectionCard>
  );
}

// ── Main: EntryValidationView ─────────────────────────────────────────────────

export function EntryValidationView() {
  const [activeTab, setActiveTab] = useState<"qr" | "ref" | "email">("qr");
  const [refInput, setRefInput] = useState("");
  const [emailInput, setEmailInput] = useState("");
  const [lookupResult, setLookupResult] = useState<BookingLookupResult | null>(null);
  const [searchResults, setSearchResults] = useState<ReadonlyArray<BookingSearchResult>>([]);
  const [selectedSearchId, setSelectedSearchId] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  function handleCheckedIn() {
    setLookupResult(null);
    setSelectedSearchId(null);
  }

  function handleQRScan(value: string) {
    startTransition(async () => {
      const result = await lookupBookingAction({ kind: "qr", value });
      if (result.success) {
        setLookupResult(result.data);
      } else {
        toastError(result);
        setLookupResult(null);
      }
    });
  }

  function handleRefLookup() {
    if (!refInput.trim()) return;
    startTransition(async () => {
      const result = await lookupBookingAction({ kind: "ref", value: refInput.trim() });
      if (result.success) {
        setLookupResult(result.data);
      } else {
        toastError(result);
        setLookupResult(null);
      }
    });
  }

  function handleEmailSearch() {
    if (!emailInput.trim()) return;
    startTransition(async () => {
      const result = await searchBookingsByEmailAction(emailInput.trim());
      if (result.success) {
        setSearchResults(result.data);
        if (result.data.length === 0) setSearchResults([]);
      } else {
        toastError(result);
      }
    });
  }

  async function handleSelectSearchResult(bookingId: string) {
    setSelectedSearchId(bookingId);
    const result = await lookupBookingAction({ kind: "ref", value: bookingId });
    if (result.success) {
      setLookupResult(result.data);
    }
  }

  return (
    <div className="flex flex-col gap-4 p-4">
      <Tabs
        value={activeTab}
        onValueChange={(v) => {
          setActiveTab(v as "qr" | "ref" | "email");
          setLookupResult(null);
          setSearchResults([]);
        }}
      >
        <TabsList className="w-full" data-testid="entry-validation-tabs">
          <TabsTrigger value="qr" className="flex-1" data-testid="entry-tab-qr">
            QR Scan
          </TabsTrigger>
          <TabsTrigger value="ref" className="flex-1" data-testid="entry-tab-ref">
            Booking Ref
          </TabsTrigger>
          <TabsTrigger value="email" className="flex-1" data-testid="entry-tab-email">
            Email
          </TabsTrigger>
        </TabsList>

        {/* QR Tab */}
        <TabsContent value="qr" className="mt-4">
          <QRScanner onScan={handleQRScan} disabled={isPending} />
          {isPending && <CardSkeleton />}
        </TabsContent>

        {/* Booking Ref Tab */}
        <TabsContent value="ref" className="mt-4 flex flex-col gap-3">
          <div className="flex gap-2">
            <div className="relative flex-1">
              <Hash
                size={16}
                className="text-foreground-muted absolute top-1/2 left-3 -translate-y-1/2"
                aria-hidden="true"
              />
              <Input
                value={refInput}
                onChange={(e) => setRefInput(e.target.value)}
                placeholder="e.g. AG-ABCD1234"
                className="min-h-[44px] pl-9"
                onKeyDown={(e) => e.key === "Enter" && handleRefLookup()}
                data-testid="entry-ref-input"
                aria-label="Booking reference"
              />
            </div>
            <Button
              type="button"
              onClick={handleRefLookup}
              disabled={isPending || !refInput.trim()}
              className="min-h-[44px]"
              data-testid="entry-ref-lookup-button"
            >
              {isPending ? "…" : "Look Up"}
            </Button>
          </div>
        </TabsContent>

        {/* Email Tab — uses SearchInput sink component */}
        <TabsContent value="email" className="mt-4 flex flex-col gap-3">
          <div className="flex gap-2">
            <SearchInput
              value={emailInput}
              onChange={setEmailInput}
              placeholder="guest@example.com"
              aria-label="Guest email address"
              data-testid="entry-email-input"
              onKeyDown={(e) => e.key === "Enter" && handleEmailSearch()}
            />
            <Button
              type="button"
              onClick={handleEmailSearch}
              disabled={isPending || !emailInput.trim()}
              className="min-h-[44px] shrink-0"
              data-testid="entry-email-search-button"
            >
              {isPending ? "…" : "Search"}
            </Button>
          </div>
          {searchResults.length > 0 && (
            <div className="flex flex-col gap-2" role="list" aria-label="Search results">
              {searchResults.map((r) => (
                <SectionCard
                  key={r.booking_id}
                  headless
                  className={selectedSearchId === r.booking_id ? "ring-primary ring-2" : ""}
                >
                  <button
                    type="button"
                    className="min-h-[44px] w-full p-3 text-left"
                    onClick={() => handleSelectSearchResult(r.booking_id)}
                    data-testid={`entry-search-result-${r.booking_id}`}
                  >
                    <p className="font-mono text-sm font-bold">{r.booking_ref}</p>
                    <MetadataList
                      layout="inline"
                      items={[
                        { label: "Tier", value: r.tier_name },
                        { label: "Date", value: r.slot_date },
                        { label: "Time", value: r.start_time },
                        {
                          label: "Guests",
                          value: `${r.adult_count + r.child_count}`,
                        },
                      ]}
                      className="mt-1"
                    />
                    <StatusBadge status={r.status} enum="booking_status" className="mt-1" />
                  </button>
                </SectionCard>
              ))}
            </div>
          )}
          {searchResults.length === 0 && emailInput && !isPending && (
            <p className="text-foreground-muted text-sm">No bookings found for this email.</p>
          )}
        </TabsContent>
      </Tabs>

      {/* Result card */}
      {lookupResult && <BookingResultCard booking={lookupResult} onCheckedIn={handleCheckedIn} />}
    </div>
  );
}
