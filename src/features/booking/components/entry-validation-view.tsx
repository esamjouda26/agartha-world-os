"use client";

import { useState, useTransition } from "react";
import dynamic from "next/dynamic";

import { parseAsStringLiteral, useQueryState } from "nuqs";

import { Hash, User, Baby } from "lucide-react";

import { Button } from "@/components/ui/button";
import { EmptyState } from "@/components/ui/empty-state";
import { Input } from "@/components/ui/input";
import { MetadataList } from "@/components/ui/metadata-list";
import { PageHeader } from "@/components/ui/page-header";
import { SearchInput } from "@/components/ui/search-input";
import { SectionCard } from "@/components/ui/section-card";
import { CardSkeleton } from "@/components/ui/skeleton-kit";
import { StatusBadge, type StatusTone } from "@/components/ui/status-badge";
import { StatusTabBar } from "@/components/ui/status-tab-bar";
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

/**
 * Explains why the check-in CTA is unavailable for the given booking.
 * Returns `null` when the booking IS checkable (the CTA renders normally).
 *
 * Crew at the gate need to know *why* they can't admit a guest — silently
 * hiding the button forces them to triage by status badge alone, which is
 * slower and error-prone for trainees.
 */
function nonCheckableReason(booking: BookingLookupResult): {
  message: string;
  tone: StatusTone;
} | null {
  switch (booking.status) {
    case "confirmed":
    case "no_show":
      return null;
    case "checked_in":
      return {
        tone: "success",
        message: booking.checked_in_at
          ? `Already checked in at ${formatTime(booking.checked_in_at)}.`
          : "Already checked in.",
      };
    case "completed":
      return { tone: "neutral", message: "Visit already completed." };
    case "pending_payment":
      return {
        tone: "warning",
        message: "Payment not completed — direct guest to the booking desk.",
      };
    default:
      return { tone: "neutral", message: "Booking is not eligible for check-in." };
  }
}

function formatTime(iso: string): string {
  try {
    return new Date(iso).toLocaleTimeString(undefined, { hour: "2-digit", minute: "2-digit" });
  } catch {
    return iso;
  }
}

function BookingResultCard({ booking, onCheckedIn }: BookingResultCardProps) {
  const [isPending, startTransition] = useTransition();
  const blocker = nonCheckableReason(booking);
  const canCheckIn = blocker === null;

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

      {canCheckIn ? (
        <Button
          className="mt-3 min-h-[48px] w-full font-semibold"
          onClick={handleCheckin}
          disabled={isPending}
          data-testid={`booking-checkin-button-${booking.booking_id}`}
        >
          {isPending ? "Checking in…" : "Check In"}
        </Button>
      ) : (
        <div
          role="status"
          className="border-border-subtle bg-surface/40 mt-3 flex items-start gap-2 rounded-lg border p-3 text-sm"
          data-testid={`booking-checkin-blocked-${booking.booking_id}`}
        >
          <StatusBadge status={blocker.tone} tone={blocker.tone} label={booking.status} />
          <span className="text-foreground-muted leading-snug">{blocker.message}</span>
        </div>
      )}
    </SectionCard>
  );
}

// ── Main: EntryValidationView ─────────────────────────────────────────────────

const TAB_VALUES = ["qr", "ref", "email"] as const;

export function EntryValidationView() {
  // URL-backed mode picker (StatusTabBar contract). Reading via the same
  // paramKey here keeps the panel selection in sync with the bar's writes;
  // both hooks subscribe to the same query param so deep links + back/
  // forward both Just Work.
  const [activeTab] = useQueryState(
    "mode",
    parseAsStringLiteral(TAB_VALUES)
      .withDefault("qr")
      .withOptions({ clearOnDefault: true, history: "replace" }),
  );

  const [refInput, setRefInput] = useState("");
  const [emailInput, setEmailInput] = useState("");
  const [lookupResult, setLookupResult] = useState<BookingLookupResult | null>(null);
  const [searchResults, setSearchResults] = useState<ReadonlyArray<BookingSearchResult>>([]);
  const [selectedSearchId, setSelectedSearchId] = useState<string | null>(null);
  // `lastSearchedEmail` is the trimmed email of the most-recent COMPLETED
  // search. Two reasons to track it explicitly rather than infer from
  // `searchResults.length`:
  //   1. The "No bookings found" empty state must only appear AFTER a
  //      search returns zero — never while the user is typing.
  //   2. When the user re-searches with a different email, we need a
  //      single source of truth that cleanly separates "I haven't
  //      searched yet" (null) from "I searched and got nothing" (string).
  const [lastSearchedEmail, setLastSearchedEmail] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  function handleTabChange() {
    // Mode change clears prior lookup state so the panel boots fresh.
    // StatusTabBar owns the URL write itself.
    setLookupResult(null);
    setSearchResults([]);
    setSelectedSearchId(null);
    setLastSearchedEmail(null);
  }

  function handleEmailInputChange(next: string) {
    setEmailInput(next);
    // Editing the email invalidates the previous search context. Clear
    // the empty-state sentinel and any selected detail card so the user
    // never sees stale "No bookings found" or a stale BookingResultCard
    // that doesn't match what's now in the input.
    if (lastSearchedEmail !== null) setLastSearchedEmail(null);
    if (lookupResult !== null) setLookupResult(null);
    if (selectedSearchId !== null) setSelectedSearchId(null);
  }

  function handleCheckedIn() {
    setLookupResult(null);
    setSelectedSearchId(null);
    // If the user reached this booking via email search, the search
    // results panel still shows the now-stale "confirmed" badge for the
    // row they just checked in. Re-run the search so the row repaints
    // with "checked_in" — keeps the list authoritative for the next
    // guest the crew member processes.
    if (emailInput.trim() && searchResults.length > 0) {
      handleEmailSearch();
    }
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
    const trimmed = emailInput.trim();
    if (!trimmed) return;
    // Clear the prior detail card and selection at search-start so a
    // re-search with a different email never shows the previous
    // BookingResultCard stacked under the new result list. The action
    // itself is debounce-free; this UX clear is cheap.
    setLookupResult(null);
    setSelectedSearchId(null);
    startTransition(async () => {
      const result = await searchBookingsByEmailAction(trimmed);
      if (result.success) {
        setSearchResults(result.data);
        // Record what we searched FOR, not what we got back. This is
        // what gates the empty-state render — only after a completed
        // search does "No bookings found" become a valid message.
        setLastSearchedEmail(trimmed);
      } else {
        toastError(result);
      }
    });
  }

  // Hydrate the full booking detail card from a search-result row.
  // The lookup action keys on `booking_ref` (the alphanumeric AG-… code),
  // NOT the UUID — passing the wrong identifier silently failed before
  // because rpc_lookup_booking does `WHERE upper(booking_ref) = upper($1)`.
  function handleSelectSearchResult(row: BookingSearchResult) {
    setSelectedSearchId(row.booking_id);
    startTransition(async () => {
      const result = await lookupBookingAction({ kind: "ref", value: row.booking_ref });
      if (result.success) {
        setLookupResult(result.data);
      } else {
        toastError(result);
        setSelectedSearchId(null);
      }
    });
  }

  return (
    <div className="flex flex-col gap-4">
      <PageHeader
        title="Entry Validation"
        description="Scan QR code or search by ref / email"
        density="compact"
        data-testid="entry-validation-page-header"
      />
      <StatusTabBar
        tabs={[
          { value: "qr", label: "QR Scan" },
          { value: "ref", label: "Booking Ref" },
          { value: "email", label: "Email" },
        ]}
        paramKey="mode"
        defaultValue="qr"
        ariaLabel="Lookup mode"
        panelIdPrefix="entry-validation-panel"
        data-testid="entry-validation-tabs"
        onValueChange={handleTabChange}
      />

      {/* QR Panel */}
      {activeTab === "qr" && (
        <div
          role="tabpanel"
          id="entry-validation-panel-qr"
          aria-labelledby="tab-mode-qr"
          className="flex flex-col gap-3"
        >
          <QRScanner onScan={handleQRScan} disabled={isPending} />
          {isPending && <CardSkeleton />}
        </div>
      )}

      {/* Booking Ref Panel */}
      {activeTab === "ref" && (
        <div
          role="tabpanel"
          id="entry-validation-panel-ref"
          aria-labelledby="tab-mode-ref"
          className="flex flex-col gap-3"
        >
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
        </div>
      )}

      {/* Email Panel — uses SearchInput sink component */}
      {activeTab === "email" && (
        <div
          role="tabpanel"
          id="entry-validation-panel-email"
          aria-labelledby="tab-mode-email"
          className="flex flex-col gap-3"
        >
          <div className="flex gap-2">
            <SearchInput
              value={emailInput}
              onChange={handleEmailInputChange}
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
                    onClick={() => handleSelectSearchResult(r)}
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
          {/* Empty state only renders when a search has COMPLETED and
              returned zero rows for the email currently in the input.
              Gating on `lastSearchedEmail` (rather than `emailInput`)
              prevents the "No bookings found" message from flashing while
              the user is still typing. */}
          {!isPending &&
            searchResults.length === 0 &&
            lastSearchedEmail !== null &&
            lastSearchedEmail === emailInput.trim() && (
              <EmptyState
                variant="filtered-out"
                title="No bookings found"
                description="No bookings match that email address. Double-check spelling or try a different lookup mode."
                data-testid="entry-email-empty-state"
              />
            )}
        </div>
      )}

      {/* Result card */}
      {lookupResult && <BookingResultCard booking={lookupResult} onCheckedIn={handleCheckedIn} />}
    </div>
  );
}
