import type { Metadata } from "next";
import Link from "next/link";
import { getTranslations } from "next-intl/server";

import { redirect } from "@/i18n/navigation";
import { CalendarClock, Camera, ChevronRight, ImageIcon, MessageSquareHeart } from "lucide-react";

import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { formatHumanDateLong, formatHumanTime } from "@/lib/date";
import { env } from "@/lib/env";
import { cn } from "@/lib/utils";

import { AttendeeManagementList } from "@/features/booking/components/attendee-management-list";
import { BookingActionShelf } from "@/features/booking/components/booking-action-shelf";
import { BookingPrintLayout } from "@/features/booking/components/booking-print-layout";
import { BookingTicketHero } from "@/features/booking/components/booking-ticket-hero";
import { RescheduleSheet } from "@/features/booking/components/reschedule-sheet";
import { getManagedBooking, hoursUntilSlot } from "@/features/booking/queries/get-managed-booking";

/**
 * /my-booking/manage — guest's ticket + booking management hub.
 *
 * Layout intent (responsive ladder):
 *   • <lg  → single column (max-w-3xl). Ticket hero, then manage actions,
 *     then attendees, then any cancellation banner. Reads top-to-bottom.
 *   • lg+  → two columns (max-w-6xl). Ticket hero on the left absorbs
 *     the page's primary content (QR, facts, perks); the right column
 *     stacks "Manage your visit" + Attendees so the user's tasks live
 *     where their eye lands after registering the QR.
 *
 * Gate corrections vs Phase 9a:
 *   • Biometrics row only renders for `confirmed` or `checked_in`. The
 *     prior `!isCompleted` test rendered it for cancelled / no_show /
 *     pending_payment too — bookings that have no business advertising
 *     biometric setup.
 *   • Memories row renders for `checked_in` (mid-visit) as well as
 *     `completed`. Photos start arriving at first capture point, so
 *     hiding the link until the visit is over made the user hunt for
 *     incoming captures.
 *   • Manage section as a whole is gated on having at least one row to
 *     render — no empty bordered container for no_show / cancelled.
 */

export const dynamic = "force-dynamic";
export const revalidate = 0;

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations("guest.manage");
  return {
    title: t("metaTitle"),
    description: t("metaDescription"),
    robots: { index: false, follow: false },
  };
}

const RESCHEDULE_CUTOFF_HOURS = 2;

export default async function MyBookingManagePage({
  params,
}: Readonly<{ params: Promise<{ locale: string }> }>) {
  const { locale } = await params;
  const booking = await getManagedBooking();
  if (!booking) {
    redirect({ href: "/my-booking", locale });
    return null;
  }
  const t = await getTranslations("guest.manage");

  const dateLabel = formatHumanDateLong(booking.slot_date);
  const timeLabel = formatHumanTime(booking.start_time);
  const hours = hoursUntilSlot(booking.slot_date, booking.start_time);

  const canReschedule = booking.status === "confirmed" && hours >= RESCHEDULE_CUTOFF_HOURS;
  const editable = booking.status === "confirmed" || booking.status === "checked_in";
  const showRescheduleRow = booking.status === "confirmed";
  const showBiometricsRow = booking.status === "confirmed" || booking.status === "checked_in";
  const showMemoriesRow = booking.status === "checked_in" || booking.status === "completed";
  const showFeedbackRow = booking.status === "completed";
  const hasManageActions =
    showRescheduleRow || showBiometricsRow || showMemoriesRow || showFeedbackRow;
  const showCancelledBanner = booking.status === "cancelled";

  return (
    <>
      <div
        className="mx-auto w-full max-w-3xl px-4 py-6 sm:px-6 sm:py-8 lg:max-w-6xl print:hidden"
        data-testid="manage-shell"
      >
        {/* Responsive shell:
            • <lg → flex column, single track.
            • lg+ → CSS grid with two explicit tracks: 1fr for the ticket
              hero, 22rem for the tasks column. Grid (vs flex) enforces
              the aside width regardless of ticket content reflow, and
              keeps both columns top-aligned without `items-start` glue. */}
        <div className="flex flex-col gap-5 lg:grid lg:grid-cols-[1fr_22rem] lg:items-start lg:gap-8">
          {/* Ticket column — dominates left on lg+, full width on <lg. */}
          <div>
            <BookingTicketHero
              bookingRef={booking.booking_ref}
              qrCodeRef={booking.qr_code_ref}
              status={booking.status}
              experienceName="AgarthaOS"
              tierName={booking.tier_name}
              dateLabel={dateLabel}
              timeLabel={timeLabel}
              durationMinutes={booking.duration_minutes}
              adultCount={booking.adult_count}
              childCount={booking.child_count}
              perks={booking.perks}
              checkedInAt={booking.checked_in_at}
              actionShelf={
                <BookingActionShelf
                  ics={{
                    bookingRef: booking.booking_ref,
                    experienceName: "AgarthaOS",
                    tierName: booking.tier_name,
                    slotDate: booking.slot_date,
                    startTime: booking.start_time,
                    durationMinutes: booking.duration_minutes,
                    timezone: env.NEXT_PUBLIC_FACILITY_TZ,
                  }}
                />
              }
              data-testid="manage-ticket-hero"
            />
          </div>

          {/* Tasks column — stacks on the right at lg+, below ticket on <lg.
              Grid track sizing is owned by the parent (1fr | 22rem); this
              container only handles vertical stacking. */}
          <div className="flex flex-col gap-5">
            {hasManageActions ? (
              <section
                aria-label="Manage your visit"
                className="border-border-subtle bg-card divide-border-subtle flex flex-col divide-y rounded-xl border"
                data-testid="manage-actions-section"
              >
                {showRescheduleRow ? (
                  canReschedule ? (
                    <ManageRow
                      icon={<CalendarClock className="size-5" />}
                      title={t("rescheduleAvailableTitle")}
                      description={t("rescheduleAvailableBody", { hours: RESCHEDULE_CUTOFF_HOURS })}
                      trailing={
                        <RescheduleSheet
                          experienceId={booking.experience_id}
                          tierId={booking.tier_id}
                          guestCount={booking.adult_count + booking.child_count}
                          currentSlotDate={booking.slot_date}
                          currentSlotId={booking.time_slot_id}
                          triggerLabel={t("rescheduleCta")}
                        />
                      }
                    />
                  ) : (
                    <ManageRow
                      icon={<CalendarClock className="size-5" />}
                      title={t("rescheduleClosedTitle")}
                      description={t("rescheduleClosedBody", { hours: RESCHEDULE_CUTOFF_HOURS })}
                      muted
                      data-testid="reschedule-blocked-notice"
                    />
                  )
                ) : null}

                {showBiometricsRow ? (
                  <ManageRow
                    href="/my-booking/manage/biometrics"
                    icon={<Camera className="size-5" />}
                    title={t("biometricsTitle")}
                    description={t("biometricsBody")}
                    data-testid="biometrics-link"
                  />
                ) : null}

                {showMemoriesRow ? (
                  <ManageRow
                    href="/my-booking/manage/memories"
                    icon={<ImageIcon className="size-5" />}
                    title={t("memoriesTitle")}
                    description={t("memoriesBody")}
                    data-testid="memories-link"
                  />
                ) : null}

                {/* B6 — Feedback CTA. Pre-fills the survey via the `?ref`
                    URL param the survey page already parses (see
                    survey/page.tsx:38-46). Only renders post-visit so we
                    don't ask before the experience has actually happened. */}
                {showFeedbackRow ? (
                  <ManageRow
                    href={`/survey?ref=${booking.booking_ref}&source=in_app`}
                    icon={<MessageSquareHeart className="size-5" />}
                    title={t("feedbackTitle")}
                    description={t("feedbackBody")}
                    data-testid="feedback-link"
                  />
                ) : null}
              </section>
            ) : null}

            <section
              aria-label="Attendees"
              className="flex flex-col gap-2"
              data-testid="manage-attendees-section"
            >
              <header className="flex items-baseline justify-between gap-3 px-1">
                <h2 className="text-foreground text-base font-semibold tracking-tight">
                  {t("attendeesTitle")}
                </h2>
                <p className="text-foreground-muted text-xs">
                  {t("attendeesCount", { count: booking.attendees.length })}
                </p>
              </header>
              <p className="text-foreground-muted px-1 text-xs leading-relaxed">
                {t("attendeesHint")}
              </p>
              <AttendeeManagementList attendees={booking.attendees} editable={editable} />
            </section>

            {showCancelledBanner ? (
              <Alert variant="warning" data-testid="manage-cancelled-notice">
                <AlertTitle>{t("cancelledTitle")}</AlertTitle>
                <AlertDescription>{t("cancelledBody")}</AlertDescription>
              </Alert>
            ) : null}
          </div>
        </div>
      </div>

      <BookingPrintLayout
        bookingRef={booking.booking_ref}
        qrCodeRef={booking.qr_code_ref}
        bookerName={booking.booker_name}
        experienceName="AgarthaOS"
        tierName={booking.tier_name}
        durationMinutes={booking.duration_minutes}
        dateLabel={dateLabel}
        timeLabel={timeLabel}
        adultCount={booking.adult_count}
        childCount={booking.child_count}
        perks={booking.perks}
      />
    </>
  );
}

function ManageRow({
  href,
  icon,
  title,
  description,
  trailing,
  muted = false,
  "data-testid": testId,
}: Readonly<{
  href?: string;
  icon: React.ReactNode;
  title: string;
  description: string;
  trailing?: React.ReactNode;
  muted?: boolean;
  "data-testid"?: string;
}>) {
  const body = (
    <>
      <span
        aria-hidden
        className={cn(
          "inline-flex size-10 shrink-0 items-center justify-center rounded-lg",
          muted
            ? "bg-surface text-foreground-muted"
            : "bg-brand-primary/10 dark:bg-brand-primary/20 text-brand-primary",
        )}
      >
        {icon}
      </span>
      <div className="flex min-w-0 flex-1 flex-col">
        <span
          className={cn(
            "text-sm leading-tight font-semibold",
            muted ? "text-foreground-muted" : "text-foreground",
          )}
        >
          {title}
        </span>
        <span className="text-foreground-muted text-xs leading-snug">{description}</span>
      </div>
      {trailing ? (
        <div className="shrink-0">{trailing}</div>
      ) : href ? (
        <ChevronRight aria-hidden className="text-foreground-muted size-4 shrink-0" />
      ) : null}
    </>
  );

  if (href) {
    return (
      <Link
        href={href as never}
        data-testid={testId}
        className="hover:bg-surface focus-visible:bg-surface focus-visible:ring-ring flex items-center gap-3 px-4 py-3.5 outline-none focus-visible:ring-2 sm:px-5"
      >
        {body}
      </Link>
    );
  }
  return (
    <div
      data-testid={testId}
      className={cn("flex items-center gap-3 px-4 py-3.5 sm:px-5", muted && "opacity-90")}
    >
      {body}
    </div>
  );
}
