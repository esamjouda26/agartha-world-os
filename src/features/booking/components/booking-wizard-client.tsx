"use client";

import * as React from "react";
import { useTransition } from "react";
import { ArrowLeft, ArrowRight, ChevronLeft, Loader2 } from "lucide-react";
import { parseAsInteger, parseAsString, parseAsStringEnum, useQueryState } from "nuqs";
import { useTranslations } from "next-intl";

import { Button } from "@/components/ui/button";
import { Calendar } from "@/components/ui/calendar";
import { EmptyState } from "@/components/ui/empty-state";
import { StickyActionBar } from "@/components/ui/sticky-action-bar";
import { toastError } from "@/components/ui/toast-helpers";
import {
  AnimatePresence,
  fadeIn,
  motion,
  motionOrStill,
  usePrefersReducedMotion,
} from "@/lib/motion";
import {
  BookingSummaryCard,
  type BookingSummaryLineItem,
} from "@/components/shared/booking-summary-card";

import { createBookingAction } from "@/features/booking/actions/create-booking";
import { getAvailableSlotsAction } from "@/features/booking/actions/get-available-slots";
import { BookerDetailsForm } from "@/features/booking/components/booker-details-form";
import { ExperienceTierSelector } from "@/features/booking/components/experience-tier-selector";
import { GuestCountStepper } from "@/features/booking/components/guest-count-stepper";
import { PromoCodeInput } from "@/features/booking/components/promo-code-input";
import { TimeSlotGrid } from "@/features/booking/components/time-slot-grid";
import { WizardProgress } from "@/features/booking/components/wizard-progress";
import {
  WIZARD_STEPS,
  WIZARD_STEP_LABELS,
  type AvailableSlot,
  type ExperienceCatalog,
  type PromoValidation,
  type WizardStep,
} from "@/features/booking/types/wizard";
import type { BookerDetailsInput } from "@/features/booking/schemas/booking-wizard";

/**
 * BookingWizardClient — public booking flow at /book.
 *
 * Five steps (Plan / Date / Time / Details / Review). "Plan" merges tier
 * selection and guest count because they're interlocked decisions — the
 * price the user sees on each tier card is a function of the count, so
 * splitting them across two screens forces unnecessary back-tracking.
 *
 * State:
 *   - URL (nuqs): step, tierId, date, slotId, adults, children. Resumable
 *     on refresh / deep link.
 *   - Local React: PII (booker name/email/phone) — never serialised to
 *     URL — and the validated promo result.
 *
 * Layout:
 *   - <lg: single column. The summary aside is HIDDEN on mobile; the
 *     sticky CTA carries the running total so the user always sees what
 *     they're paying for. The Review step renders the full summary inline.
 *   - lg+: split view, wizard 2/3 left, summary 1/3 right (sticky).
 *
 * Motion: AnimatePresence with `mode="wait"` swaps step content cleanly;
 * collapses to no-op under `prefers-reduced-motion`.
 */

type BookingWizardClientProps = Readonly<{
  catalog: ExperienceCatalog;
}>;

const stepParser = parseAsStringEnum([...WIZARD_STEPS]).withDefault("plan");
const stringParser = parseAsString.withDefault("");
const adultsParser = parseAsInteger.withDefault(1);
const childrenParser = parseAsInteger.withDefault(0);

const HISTORY_OPTS = { clearOnDefault: true, history: "push" as const };

const DEFAULT_BOOKER: BookerDetailsInput = {
  booker_name: "",
  booker_email: "",
  booker_phone: "",
  accept_terms: false,
};

const CURRENCY = "MYR";

function formatHumanDate(iso: string | null): string | null {
  if (!iso) return null;
  const d = new Date(iso + "T00:00:00");
  return new Intl.DateTimeFormat("en-MY", {
    weekday: "short",
    month: "short",
    day: "numeric",
    year: "numeric",
  }).format(d);
}

function formatHumanTime(hhmmss: string | null): string | null {
  if (!hhmmss) return null;
  const [hStr = "00", mStr = "00"] = hhmmss.split(":");
  const h = Number(hStr);
  const m = Number(mStr);
  const period = h >= 12 ? "pm" : "am";
  const h12 = h % 12 === 0 ? 12 : h % 12;
  return `${h12}:${m.toString().padStart(2, "0")} ${period}`;
}

function formatMoney(amount: number): string {
  // 2 fraction digits everywhere — matches BookingSummaryCard, the
  // payment receipt, and the underlying booking_payments.amount precision.
  // Mixing 0/2 frac-digits caused "RM 100" in the sticky CTA next to
  // "RM 100.00" in the summary card on the same screen.
  return new Intl.NumberFormat("en-MY", {
    style: "currency",
    currency: CURRENCY,
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(amount);
}

function isoDateLocal(d: Date): string {
  const yyyy = d.getFullYear().toString().padStart(4, "0");
  const mm = (d.getMonth() + 1).toString().padStart(2, "0");
  const dd = d.getDate().toString().padStart(2, "0");
  return `${yyyy}-${mm}-${dd}`;
}

function parseIsoDateLocal(iso: string | null): Date | null {
  if (!iso) return null;
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(iso);
  if (!m) return null;
  return new Date(Number(m[1]), Number(m[2]) - 1, Number(m[3]));
}

export function BookingWizardClient({ catalog }: BookingWizardClientProps) {
  const t = useTranslations("guest.book");
  const reduced = usePrefersReducedMotion();
  const [isPending, startTransition] = useTransition();

  // URL state.
  const [step, setStep] = useQueryState("step", stepParser.withOptions(HISTORY_OPTS));
  const [tierId, setTierId] = useQueryState("tierId", stringParser.withOptions(HISTORY_OPTS));
  const [date, setDate] = useQueryState("date", stringParser.withOptions(HISTORY_OPTS));
  const [slotId, setSlotId] = useQueryState("slotId", stringParser.withOptions(HISTORY_OPTS));
  const [adults, setAdults] = useQueryState("adults", adultsParser.withOptions(HISTORY_OPTS));
  const [children, setChildren] = useQueryState(
    "children",
    childrenParser.withOptions(HISTORY_OPTS),
  );

  // Local (non-URL) state.
  const [booker, setBooker] = React.useState<BookerDetailsInput>(DEFAULT_BOOKER);
  const [bookerValid, setBookerValid] = React.useState(false);
  const [promo, setPromo] = React.useState<PromoValidation | null>(null);
  const [slots, setSlots] = React.useState<readonly AvailableSlot[]>([]);
  const [slotsLoading, setSlotsLoading] = React.useState(false);
  const [slotsError, setSlotsError] = React.useState<string | null>(null);
  const [submitError, setSubmitError] = React.useState<string | null>(null);
  const validateBookerRef = React.useRef<(() => Promise<boolean>) | null>(null);

  // Derive selected tier + slot from URL state.
  const selectedTier = catalog.tiers.find((t) => t.id === tierId) ?? null;
  const selectedSlot = slots.find((s) => s.slot_id === slotId) ?? null;

  // Group bounds.
  const maxFacility = catalog.experience.max_facility_capacity;
  const maxAdults = Math.min(50, maxFacility);
  const maxChildren = Math.max(0, maxFacility - adults);

  // Slot fetch on date+tier+guestCount change.
  const guestCount = adults + children;
  const slotsKey = `${date}|${tierId}|${guestCount}`;
  const lastSlotsKey = React.useRef<string>("");
  React.useEffect(() => {
    if (!date || !tierId || guestCount < 1) {
      setSlots([]);
      setSlotsError(null);
      lastSlotsKey.current = "";
      return;
    }
    if (lastSlotsKey.current === slotsKey) return;
    lastSlotsKey.current = slotsKey;
    let cancelled = false;
    setSlotsLoading(true);
    setSlotsError(null);
    void (async () => {
      const result = await getAvailableSlotsAction({
        p_experience_id: catalog.experience.id,
        p_date: date,
        p_tier_id: tierId,
        p_guest_count: guestCount,
      });
      if (cancelled) return;
      setSlotsLoading(false);
      if (!result.success) {
        setSlots([]);
        setSlotsError(
          result.error === "RATE_LIMITED"
            ? t("time.loadErrorRateLimited")
            : t("time.loadErrorGeneric"),
        );
        return;
      }
      setSlots(result.data);
      if (slotId && !result.data.some((s) => s.slot_id === slotId)) {
        void setSlotId(null);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [slotsKey, catalog.experience.id, date, tierId, guestCount, slotId, setSlotId, t]);

  // Pricing line items + total.
  const lineItems: BookingSummaryLineItem[] = [];
  let total = 0;
  if (selectedTier) {
    if (adults > 0) {
      const subtotal = selectedTier.adult_price * adults;
      total += subtotal;
      lineItems.push({
        label: `${selectedTier.name} × ${t("plan.adults")} (${adults})`,
        amount: subtotal,
      });
    }
    if (children > 0) {
      const subtotal = selectedTier.child_price * children;
      total += subtotal;
      lineItems.push({
        label: `${selectedTier.name} × ${t("plan.children")} (${children})`,
        amount: subtotal,
      });
    }
    if (promo?.valid) {
      lineItems.push({
        label: `Promo: ${promo.promo_code}`,
        amount: -promo.discount_amount,
        hint:
          promo.discount_type === "percentage"
            ? `${promo.discount_value}% off`
            : t("details.promoValid", { amount: formatMoney(promo.discount_amount) }),
      });
      total = Math.max(0, promo.final_price);
    }
  }

  // Step → invariant. The "review" branch must defend against URL
  // tampering — if a user pastes ?step=review without completing the
  // earlier steps, every prerequisite must still hold before the
  // confirm CTA enables.
  function canAdvance(from: WizardStep): boolean {
    switch (from) {
      case "plan":
        return Boolean(selectedTier) && adults >= 1;
      case "date":
        return Boolean(date);
      case "time":
        return Boolean(selectedSlot && selectedSlot.is_available);
      case "details":
        return bookerValid;
      case "review":
        return (
          Boolean(selectedTier) &&
          adults >= 1 &&
          Boolean(date) &&
          Boolean(selectedSlot && selectedSlot.is_available) &&
          bookerValid
        );
    }
  }

  const stepIndex = WIZARD_STEPS.indexOf(step);

  function goTo(target: WizardStep): void {
    void setStep(target);
  }

  async function handleAdvance(): Promise<void> {
    if (step === "details") {
      const ok = (await validateBookerRef.current?.()) ?? bookerValid;
      if (!ok) return;
    }
    if (!canAdvance(step)) return;
    const next = WIZARD_STEPS[stepIndex + 1];
    if (next) goTo(next);
  }

  function handleBack(): void {
    const prev = WIZARD_STEPS[stepIndex - 1];
    if (prev) goTo(prev);
  }

  async function handleConfirm(): Promise<void> {
    if (!selectedTier || !selectedSlot || !date) return;
    const ok = (await validateBookerRef.current?.()) ?? bookerValid;
    if (!ok) {
      goTo("details");
      return;
    }
    setSubmitError(null);
    startTransition(async () => {
      const promoToSend = promo?.valid ? promo.promo_code : null;
      const result = await createBookingAction({
        p_experience_id: catalog.experience.id,
        p_time_slot_id: selectedSlot.slot_id,
        p_tier_id: selectedTier.id,
        p_booker_name: booker.booker_name,
        p_booker_email: booker.booker_email,
        p_booker_phone: booker.booker_phone,
        p_adult_count: adults,
        p_child_count: children,
        ...(promoToSend ? { p_promo_code: promoToSend } : {}),
      });
      if (!result.success) {
        if (result.error === "RATE_LIMITED") {
          toastError(result);
          return;
        }
        if (result.error === "CONFLICT" && result.fields?.["form"]) {
          setSubmitError(result.fields["form"]);
          goTo("time");
          lastSlotsKey.current = "";
          return;
        }
        if (result.fields?.["p_promo_code"]) {
          toastError(result);
          goTo("details");
          return;
        }
        setSubmitError(result.fields?.["form"] ?? t("review.submitErrorGeneric"));
      }
    });
  }

  const progressSteps = WIZARD_STEPS.map((id, idx) => ({
    id,
    label: WIZARD_STEP_LABELS[id],
    status: (idx < stepIndex ? "complete" : idx === stepIndex ? "current" : "upcoming") as
      | "complete"
      | "current"
      | "upcoming",
  }));

  const today = React.useMemo(() => {
    const t = new Date();
    t.setHours(0, 0, 0, 0);
    return t;
  }, []);
  const maxDate = React.useMemo(() => {
    const max = new Date(today);
    max.setDate(max.getDate() + 14);
    return max;
  }, [today]);

  const continueDisabled = !canAdvance(step) || isPending;
  const onReview = step === "review";

  return (
    <div className="mx-auto flex w-full max-w-6xl flex-col gap-6 px-4 pt-6 pb-32 sm:px-6 md:pb-12 lg:flex-row lg:items-start lg:gap-10">
      <div className="flex-1 lg:max-w-2xl xl:max-w-3xl">
        <header className="mb-6 flex flex-col gap-2">
          <p className="text-foreground-muted text-xs font-medium tracking-wide uppercase">
            {t("kicker")}
          </p>
          <h1 className="text-foreground text-2xl font-semibold tracking-tight md:text-3xl">
            {catalog.experience.name}
          </h1>
          {catalog.experience.description ? (
            <p className="text-foreground-muted max-w-prose text-sm md:text-base">
              {catalog.experience.description}
            </p>
          ) : null}
        </header>

        <WizardProgress
          steps={progressSteps}
          currentIndex={stepIndex}
          onStepClick={(id, idx) => {
            if (idx <= stepIndex) goTo(id as WizardStep);
          }}
          className="mb-6"
        />

        <AnimatePresence mode="wait" initial={false}>
          <motion.div
            key={step}
            {...motionOrStill(fadeIn({ duration: "small" }), reduced)}
            className="flex flex-col gap-5"
          >
            {step === "plan" && (
              <section
                aria-label={t("ariaPlanLabel")}
                className="flex flex-col gap-5"
                data-testid="step-plan"
              >
                <div className="border-border-subtle bg-card flex flex-col gap-4 rounded-xl border p-5 sm:flex-row sm:items-center sm:justify-between sm:gap-6">
                  <p className="text-foreground text-sm font-semibold tracking-tight">
                    {t("plan.guestCountTitle")}
                  </p>
                  <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:gap-6">
                    <GuestCountStepper
                      label={t("plan.adults")}
                      description={t("plan.adultsDescription")}
                      value={adults}
                      onChange={(n) => void setAdults(n)}
                      min={1}
                      max={maxAdults}
                      data-testid="adults-stepper"
                    />
                    <GuestCountStepper
                      label={t("plan.children")}
                      description={t("plan.childrenDescription")}
                      value={children}
                      onChange={(n) => void setChildren(n)}
                      min={0}
                      max={maxChildren}
                      data-testid="children-stepper"
                    />
                  </div>
                </div>

                <div className="flex flex-col gap-3">
                  <p className="text-foreground text-sm font-semibold tracking-tight">
                    {t("plan.tierTitle")}
                  </p>
                  {catalog.tiers.length === 0 ? (
                    <EmptyState
                      variant="first-use"
                      title={t("plan.noTiersAvailableTitle")}
                      description={t("plan.noTiersAvailableBody")}
                    />
                  ) : (
                    <ExperienceTierSelector
                      tiers={catalog.tiers}
                      selectedId={tierId || null}
                      onSelect={(id) => void setTierId(id)}
                      adultCount={adults}
                      childCount={children}
                    />
                  )}
                </div>
              </section>
            )}

            {step === "date" && (
              <section
                aria-label={t("ariaDateLabel")}
                className="border-border-subtle bg-card flex flex-col gap-3 rounded-xl border p-5"
                data-testid="step-date"
              >
                <div>
                  <p className="text-foreground text-sm font-semibold tracking-tight">
                    {t("date.title")}
                  </p>
                  <p className="text-foreground-muted mt-1 text-xs">{t("date.subtitle")}</p>
                </div>
                {/* Inline calendar instead of a popover trigger — the date
                    pick IS the step, so the calendar should be visible
                    immediately without an extra tap. */}
                <Calendar
                  mode="single"
                  selected={parseIsoDateLocal(date) ?? undefined}
                  onSelect={(d) => {
                    void setDate(d ? isoDateLocal(d) : null);
                    void setSlotId(null);
                  }}
                  disabled={(d: Date) => d < today || d > maxDate}
                  initialFocus
                  data-testid="slot-calendar"
                  className="self-center"
                />
              </section>
            )}

            {step === "time" && (
              <section
                aria-label={t("ariaTimeLabel")}
                className="border-border-subtle bg-card flex flex-col gap-3 rounded-xl border p-5"
                data-testid="step-time"
              >
                {/* Step header — date is rendered inline as part of the
                    sub-heading with a sibling "Change date" link, so the
                    affordance to swap dates lives next to the date itself
                    instead of as a small ghost button on the right edge.
                    `canAdvance("date")` already gates entry to this step,
                    so `date` is guaranteed truthy here. */}
                <div className="flex flex-col gap-1">
                  <p className="text-foreground text-sm font-semibold tracking-tight">
                    {t("time.title")}
                  </p>
                  <p className="text-foreground-muted text-xs">
                    {formatHumanDate(date)}
                    <button
                      type="button"
                      onClick={() => goTo("date")}
                      data-testid="time-change-date"
                      className="text-brand-primary ml-2 inline-flex items-center gap-0.5 underline-offset-2 hover:underline"
                    >
                      <ChevronLeft aria-hidden className="size-3.5" />
                      {t("time.changeDate")}
                    </button>
                  </p>
                </div>
                {slotsError ? (
                  <EmptyState
                    variant="error"
                    title={t("time.loadErrorTitle")}
                    description={slotsError}
                    action={
                      <Button
                        type="button"
                        variant="outline"
                        onClick={() => {
                          lastSlotsKey.current = "";
                          setSlotsError(null);
                        }}
                        data-testid="time-slot-grid-retry"
                      >
                        {t("time.tryAgainCta")}
                      </Button>
                    }
                  />
                ) : (
                  <TimeSlotGrid
                    slots={slots}
                    selectedSlotId={slotId || null}
                    onSelect={(slot) => void setSlotId(slot.slot_id)}
                    loading={slotsLoading}
                    guestCount={guestCount}
                  />
                )}
              </section>
            )}

            {step === "details" && (
              <section
                aria-label={t("ariaDetailsLabel")}
                className="border-border-subtle bg-card flex flex-col gap-4 rounded-xl border p-5"
                data-testid="step-details"
              >
                <div>
                  <p className="text-foreground text-sm font-semibold tracking-tight">
                    {t("details.title")}
                  </p>
                  <p className="text-foreground-muted mt-1 text-xs">{t("details.subtitle")}</p>
                </div>
                <BookerDetailsForm
                  defaultValues={booker}
                  onChange={(values, isValid) => {
                    setBooker(values);
                    setBookerValid(isValid);
                  }}
                  onSubmitRef={validateBookerRef}
                />
                <div className="border-border-subtle border-t pt-4">
                  <PromoCodeInput
                    tierId={tierId || null}
                    slotDate={date || null}
                    slotStartTime={selectedSlot?.start_time ?? null}
                    adultCount={adults}
                    childCount={children}
                    onValidated={setPromo}
                  />
                </div>
              </section>
            )}

            {step === "review" && (
              <section
                aria-label={t("ariaReviewLabel")}
                className="flex flex-col gap-4"
                data-testid="step-review"
              >
                {/* Review only echoes Booker/Email/Phone here — trip facts
                    (tier, date, time, guests) and pricing are owned by
                    the BookingSummaryCard below (mobile inline) and the
                    sticky aside (lg+). Avoids duplicating the same four
                    rows a second time on the screen. */}
                <div className="border-border-subtle bg-card flex flex-col gap-3 rounded-xl border p-5">
                  <p className="text-foreground text-sm font-semibold tracking-tight">
                    {t("review.yourDetailsTitle")}
                  </p>
                  <dl className="text-sm">
                    <ReviewRow
                      term={t("review.rowBooker")}
                      detail={booker.booker_name || t("review.fieldFallback")}
                    />
                    <ReviewRow
                      term={t("review.rowEmail")}
                      detail={booker.booker_email || t("review.fieldFallback")}
                    />
                    <ReviewRow
                      term={t("review.rowPhone")}
                      detail={booker.booker_phone || t("review.fieldFallback")}
                    />
                  </dl>
                </div>
                {/* Inline summary card on the Review step — the desktop
                    aside renders the same data on lg+, but on mobile this
                    is the user's last chance to see the full breakdown. */}
                <BookingSummaryCard
                  experienceName={catalog.experience.name}
                  tierName={selectedTier?.name ?? null}
                  date={formatHumanDate(date)}
                  startTime={formatHumanTime(selectedSlot?.start_time ?? null)}
                  adultCount={adults}
                  childCount={children}
                  lineItems={lineItems}
                  total={total}
                  promoCode={promo?.valid ? promo.promo_code : null}
                  data-testid="booking-summary-review"
                  className="lg:hidden"
                />
                {submitError ? (
                  <p
                    role="alert"
                    className="text-status-danger-foreground bg-status-danger-soft border-status-danger-border rounded-md border px-3 py-2 text-sm"
                    data-testid="booking-submit-error"
                  >
                    {submitError}
                  </p>
                ) : null}
              </section>
            )}
          </motion.div>
        </AnimatePresence>

        {/* Inline navigation — md+ only. <md uses the StickyActionBar. */}
        <div className="mt-6 hidden md:flex md:items-center md:justify-between">
          <Button
            type="button"
            variant="ghost"
            onClick={handleBack}
            disabled={stepIndex === 0 || isPending}
            data-testid="wizard-back"
          >
            <ArrowLeft aria-hidden className="size-4" />
            {t("back")}
          </Button>
          {onReview ? (
            <Button
              type="button"
              size="lg"
              onClick={handleConfirm}
              disabled={continueDisabled}
              data-testid="wizard-confirm"
            >
              {isPending ? <Loader2 aria-hidden className="size-4 animate-spin" /> : null}
              {isPending
                ? t("review.ctaConfirming")
                : t("review.ctaConfirm", { total: formatMoney(total) })}
            </Button>
          ) : (
            <Button
              type="button"
              size="lg"
              onClick={() => void handleAdvance()}
              disabled={continueDisabled}
              data-testid="wizard-next"
            >
              {t("continue")}
              <ArrowRight aria-hidden className="size-4" />
            </Button>
          )}
        </div>
      </div>

      {/* Summary aside — lg+ only. On mobile the StickyActionBar carries
          the running total so the summary card doesn't compete with the
          step content for vertical space. */}
      <div className="hidden lg:sticky lg:top-24 lg:block lg:w-[22rem] lg:shrink-0">
        <BookingSummaryCard
          experienceName={catalog.experience.name}
          tierName={selectedTier?.name ?? null}
          date={formatHumanDate(date)}
          startTime={formatHumanTime(selectedSlot?.start_time ?? null)}
          adultCount={adults}
          childCount={children}
          lineItems={lineItems}
          total={total}
          promoCode={promo?.valid ? promo.promo_code : null}
          data-testid="booking-summary-aside"
        />
      </div>

      {/* Mobile sticky CTA: total + step button. Two-row layout so the
          back arrow + main action don't overlap with a centered total. */}
      <StickyActionBar bottomOffset={0} className="md:hidden" data-testid="wizard-sticky-cta">
        <div className="flex flex-col gap-2">
          {selectedTier && total > 0 ? (
            <div className="flex items-baseline justify-between">
              <span className="text-foreground-muted text-xs">{t("runningTotal")}</span>
              <span
                className="text-foreground text-base font-semibold tabular-nums"
                aria-live="polite"
                data-testid="wizard-running-total"
              >
                {formatMoney(total)}
              </span>
            </div>
          ) : null}
          <div className="flex items-center gap-2">
            <Button
              type="button"
              variant="ghost"
              size="icon"
              onClick={handleBack}
              disabled={stepIndex === 0 || isPending}
              aria-label={t("ariaBack")}
              data-testid="wizard-back-mobile"
            >
              <ArrowLeft aria-hidden className="size-4" />
            </Button>
            {onReview ? (
              <Button
                type="button"
                size="lg"
                onClick={handleConfirm}
                disabled={continueDisabled}
                data-testid="wizard-confirm-mobile"
                className="flex-1"
              >
                {isPending ? <Loader2 aria-hidden className="size-4 animate-spin" /> : null}
                {isPending
                  ? t("review.ctaConfirming")
                  : t("review.ctaConfirmMobile", { total: formatMoney(total) })}
              </Button>
            ) : (
              <Button
                type="button"
                size="lg"
                onClick={() => void handleAdvance()}
                disabled={continueDisabled}
                data-testid="wizard-next-mobile"
                className="flex-1"
              >
                {t("continue")}
                <ArrowRight aria-hidden className="size-4" />
              </Button>
            )}
          </div>
        </div>
      </StickyActionBar>
    </div>
  );
}

function ReviewRow({ term, detail }: { term: string; detail: string }) {
  return (
    <div className="border-border-subtle flex items-baseline justify-between gap-4 border-b py-2 last:border-b-0">
      <dt className="text-foreground-muted">{term}</dt>
      <dd className="text-foreground text-right font-medium">{detail}</dd>
    </div>
  );
}
