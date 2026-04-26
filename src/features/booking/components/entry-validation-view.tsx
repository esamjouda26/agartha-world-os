"use client";

import { useState, useTransition } from "react";
import dynamic from "next/dynamic";

import { Hash } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { MetadataList } from "@/components/ui/metadata-list";
import { SearchInput } from "@/components/ui/search-input";
import { SectionCard } from "@/components/ui/section-card";
import { CardSkeleton } from "@/components/ui/skeleton-kit";
import { StatusBadge } from "@/components/ui/status-badge";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { toastError, toastSuccess } from "@/components/ui/toast-helpers";
import { lookupBookingAction } from "@/features/booking/actions/lookup-booking";
import { searchBookingsByEmailAction } from "@/features/booking/actions/search-bookings";
import { checkinBookingAction } from "@/features/booking/actions/checkin-booking";
import type { BookingLookupResult, BookingSearchResult } from "@/features/booking/types";

// Camera/QR widget loaded lazily per Phase 8 crew-specific gate
const QRScanner = dynamic(
  () =>
    import("@/components/shared/qr-scanner").then(
      (m) => m.QRScanner,
    ),
  { loading: () => <CardSkeleton />, ssr: false },
);

// ── Local: BookingResultCard ──────────────────────────────────────────────────

type BookingResultCardProps = Readonly<{
  booking: BookingLookupResult;
  onCheckedIn: () => void;
}>;

function BookingResultCard({ booking, onCheckedIn }: BookingResultCardProps) {
  const [isPending, startTransition] = useTransition();
  const canCheckIn = booking.status === "confirmed" || booking.status === "no_show";

  function handleCheckin() {
    startTransition(async () => {
      const result = await checkinBookingAction(booking.booking_id);
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
          { label: "Date", value: booking.slot_date },
          { label: "Time", value: booking.slot_start_time },
          { label: "Guests", value: `${booking.adult_count + booking.child_count}` },
        ]}
        data-testid={`booking-meta-${booking.booking_id}`}
      />
      {canCheckIn && (
        <Button
          className="mt-3 w-full min-h-[48px] font-semibold"
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
                className="absolute left-3 top-1/2 -translate-y-1/2 text-foreground-muted"
                aria-hidden="true"
              />
              <Input
                value={refInput}
                onChange={(e) => setRefInput(e.target.value)}
                placeholder="e.g. AG-ABCD1234"
                className="pl-9 min-h-[44px]"
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
                  className={
                    selectedSearchId === r.booking_id
                      ? "ring-2 ring-primary"
                      : ""
                  }
                >
                  <button
                    type="button"
                    className="w-full p-3 text-left min-h-[44px]"
                    onClick={() => handleSelectSearchResult(r.booking_id)}
                    data-testid={`entry-search-result-${r.booking_id}`}
                  >
                    <p className="font-mono text-sm font-bold">{r.booking_ref}</p>
                    <MetadataList
                      layout="inline"
                      items={[
                        { label: "Experience", value: r.experience_name },
                        { label: "Date", value: r.slot_date },
                        { label: "Time", value: r.slot_start_time },
                      ]}
                      className="mt-1"
                    />
                    <StatusBadge
                      status={r.status}
                      enum="booking_status"
                      className="mt-1"
                    />
                  </button>
                </SectionCard>
              ))}
            </div>
          )}
          {searchResults.length === 0 && emailInput && !isPending && (
            <p className="text-sm text-foreground-muted">No bookings found for this email.</p>
          )}
        </TabsContent>
      </Tabs>

      {/* Result card */}
      {lookupResult && (
        <BookingResultCard booking={lookupResult} onCheckedIn={handleCheckedIn} />
      )}
    </div>
  );
}
