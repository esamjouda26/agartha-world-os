"use client";

import * as React from "react";
import { useTransition } from "react";
import { useRouter } from "next/navigation";
import { Camera, CheckCircle2, ChevronDown, ShieldOff, UserCircle2 } from "lucide-react";
import { useTranslations } from "next-intl";

import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import { Label } from "@/components/ui/label";
import { toastError, toastSuccess } from "@/components/ui/toast-helpers";
import { cn } from "@/lib/utils";

import { grantBiometricConsentAction } from "@/features/booking/actions/grant-biometric-consent";
import { withdrawBiometricConsentAction } from "@/features/booking/actions/withdraw-biometric-consent";
import { BiometricAccessLogStrip } from "@/features/booking/components/biometric-access-log-strip";
import type { BiometricAttendeeContext } from "@/features/booking/queries/get-biometrics-context";

/**
 * BiometricAttendeeCard — per-attendee privacy decision card.
 *
 * State machine — three branches, mapped to the data we just fetched:
 *   1. No active consent  → render the "I consent" checkbox + grant button.
 *      Until the user ticks the legally-required checkbox the button stays
 *      disabled. Tick + click commits a `consent_records` row.
 *   2. Active consent     → render the granted-at + policy-version line,
 *      the enrolment placeholder (Session 18 wires the camera widget),
 *      and a "Withdraw & delete" destructive CTA gated by ConfirmDialog
 *      with a consequence preview.
 *   3. Previously withdrawn → muted reminder of when/how. The "I consent"
 *      branch renders below so the user can re-consent — the old row
 *      stays in the ledger for audit; a new row is inserted on grant.
 *
 * Phase 9a deliberately omits the camera widget. Per the user-feedback
 * memory ("UX must make sense, not just look good"), shipping a
 * non-functional camera button would betray the user goal here. The
 * camera lands in Session 18 alongside the `enroll-biometric` Edge
 * Function. Until then, an honest placeholder explains the next step.
 */

export type BiometricAttendeeCardProps = Readonly<{
  attendee: BiometricAttendeeContext;
  className?: string;
  "data-testid"?: string;
}>;

export function BiometricAttendeeCard({
  attendee,
  className,
  "data-testid": testId,
}: BiometricAttendeeCardProps) {
  const t = useTranslations("guest.biometrics");
  const router = useRouter();
  const hasActiveConsent = attendee.active_consent !== null;
  // Default-expanded when the user still has a decision to make. Once
  // they've consented, the card collapses to its summary line so a
  // multi-attendee booking doesn't drown in stacked consent blocks.
  const [expanded, setExpanded] = React.useState(!hasActiveConsent);
  const [consented, setConsented] = React.useState(false);
  const [confirmOpen, setConfirmOpen] = React.useState(false);
  const [isGranting, startGrant] = useTransition();
  const [isWithdrawing, startWithdraw] = useTransition();

  const label = formatAttendeeLabel(attendee, t);

  // When the server-side state flips (e.g. after consent grant), keep
  // the expanded view in sync without yanking the user mid-flow.
  React.useEffect(() => {
    if (hasActiveConsent) setExpanded(false);
  }, [hasActiveConsent]);

  const handleGrant = (): void => {
    if (!consented) return;
    startGrant(async () => {
      const result = await grantBiometricConsentAction({ attendee_id: attendee.attendee_id });
      if (!result.success) {
        toastError(result);
        return;
      }
      toastSuccess(result.data.reused_existing ? t("grantReusedTitle") : t("grantSavedTitle"), {
        description: result.data.reused_existing
          ? t("grantReusedBody", { label })
          : t("grantSavedBodyNew", { label }),
      });
      setConsented(false);
      // Force a fresh RSC fetch so the page sees the new consent_records
      // row and renders the active-consent UI; without this the prop
      // `attendee.active_consent` stays null and the user sees the grant
      // flow again.
      router.refresh();
    });
  };

  const handleWithdraw = (): void => {
    startWithdraw(async () => {
      const result = await withdrawBiometricConsentAction({
        attendee_id: attendee.attendee_id,
      });
      if (!result.success) {
        toastError(result);
        return;
      }
      toastSuccess(t("withdrawSuccessTitle"), {
        description: t("withdrawSuccessBody", { label }),
      });
      setConfirmOpen(false);
      // RPC mutated consent_records, biometric_vectors, booking_attendees
      // — refresh so the card re-renders the no-consent flow and the
      // audit log strip picks up the new entry.
      router.refresh();
    });
  };

  return (
    <article
      data-slot="biometric-attendee-card"
      data-testid={testId ?? `biometric-attendee-${attendee.attendee_id}`}
      data-state={hasActiveConsent ? "active" : "no-consent"}
      className={cn(
        "border-border-subtle bg-card overflow-hidden rounded-xl border shadow-xs",
        className,
      )}
    >
      <button
        type="button"
        onClick={() => setExpanded((v) => !v)}
        aria-expanded={expanded}
        aria-controls={`biometric-attendee-body-${attendee.attendee_id}`}
        data-testid={`biometric-attendee-toggle-${attendee.attendee_id}`}
        className="hover:bg-surface focus-visible:ring-ring flex w-full items-center gap-3 px-4 py-3 text-left outline-none focus-visible:ring-2 sm:px-5 sm:py-4"
      >
        <span
          aria-hidden
          className={cn(
            "inline-flex size-10 shrink-0 items-center justify-center rounded-lg",
            hasActiveConsent
              ? "bg-status-success-soft text-status-success-foreground"
              : "bg-status-neutral-soft text-foreground-muted",
          )}
        >
          <UserCircle2 className="size-5" />
        </span>
        <div className="flex min-w-0 flex-1 flex-col gap-0.5">
          <span className="text-foreground truncate text-sm leading-tight font-semibold">
            {label}
          </span>
          <span className="text-foreground-muted truncate text-xs leading-tight">
            {attendee.attendee_type === "adult" ? t("attendeeAdult") : t("attendeeChild")} #
            {attendee.attendee_index}
            {" · "}
            {summaryFor(attendee, t)}
          </span>
        </div>
        <ConsentStatusPill attendee={attendee} t={t} />
        <ChevronDown
          aria-hidden
          className={cn(
            "text-foreground-muted size-4 shrink-0 transition-transform duration-[var(--duration-small)]",
            expanded && "rotate-180",
          )}
        />
      </button>

      {expanded ? (
        <div
          id={`biometric-attendee-body-${attendee.attendee_id}`}
          className="border-border-subtle border-t px-4 py-4 sm:px-5"
        >
          {hasActiveConsent ? (
            <ActiveConsentBlock
              attendee={attendee}
              onWithdrawClick={() => setConfirmOpen(true)}
              isWithdrawing={isWithdrawing}
              t={t}
            />
          ) : (
            <GrantConsentBlock
              attendee={attendee}
              consented={consented}
              onConsentedChange={setConsented}
              onGrant={handleGrant}
              isGranting={isGranting}
              t={t}
            />
          )}

          <BiometricAccessLogStrip
            entries={attendee.recent_access_log}
            data-testid={`access-log-${attendee.attendee_id}`}
            className="mt-4"
          />
        </div>
      ) : null}

      <ConfirmDialog
        open={confirmOpen}
        onOpenChange={setConfirmOpen}
        intent="destructive"
        title={t("withdrawConfirmTitleWithLabel", { label })}
        description={t("withdrawConfirmDescription")}
        confirmLabel={t("withdrawConfirmCta")}
        cancelLabel={t("withdrawKeepCta")}
        pending={isWithdrawing}
        onConfirm={handleWithdraw}
        data-testid={`withdraw-confirm-${attendee.attendee_id}`}
      >
        <ul className="text-foreground-muted list-disc space-y-1 pl-5 text-sm">
          <li>{t("withdrawConfirmAck.templateDeleted")}</li>
          <li>{t("withdrawConfirmAck.featuresOff")}</li>
          <li>{t("withdrawConfirmAck.bookingUnaffected")}</li>
          <li>{t("withdrawConfirmAck.canReConsent")}</li>
        </ul>
      </ConfirmDialog>
    </article>
  );
}

type BiometricsT = ReturnType<typeof useTranslations<"guest.biometrics">>;

function summaryFor(attendee: BiometricAttendeeContext, t: BiometricsT): string {
  if (attendee.active_consent && attendee.has_biometric) return t("summaryEnrolledActive");
  if (attendee.active_consent) return t("summaryConsentedAtGate");
  if (attendee.last_withdrawn) return t("summaryConsentWithdrawn");
  return t("summaryNoConsent");
}

function ConsentStatusPill({
  attendee,
  t,
}: Readonly<{ attendee: BiometricAttendeeContext; t: BiometricsT }>) {
  if (attendee.active_consent) {
    return (
      <span
        className="bg-status-success-soft text-status-success-foreground border-status-success-border inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-xs font-medium"
        data-testid={`consent-pill-active-${attendee.attendee_id}`}
      >
        <CheckCircle2 aria-hidden className="size-3.5" />
        {t("pillActiveConsent")}
      </span>
    );
  }
  if (attendee.last_withdrawn) {
    return (
      <span
        className="bg-status-warning-soft text-status-warning-foreground border-status-warning-border inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-xs font-medium"
        data-testid={`consent-pill-withdrawn-${attendee.attendee_id}`}
      >
        <ShieldOff aria-hidden className="size-3.5" />
        {t("pillWithdrawn")}
      </span>
    );
  }
  return (
    <span
      className="border-border-subtle bg-surface text-foreground-muted inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-xs font-medium"
      data-testid={`consent-pill-none-${attendee.attendee_id}`}
    >
      {t("pillNoConsent")}
    </span>
  );
}

function GrantConsentBlock({
  attendee,
  consented,
  onConsentedChange,
  onGrant,
  isGranting,
  t,
}: Readonly<{
  attendee: BiometricAttendeeContext;
  consented: boolean;
  onConsentedChange: (next: boolean) => void;
  onGrant: () => void;
  isGranting: boolean;
  t: BiometricsT;
}>) {
  const checkboxId = `consent-${attendee.attendee_id}`;
  return (
    <div className="flex flex-col gap-4">
      {attendee.last_withdrawn ? (
        <Alert variant="info" data-testid={`previously-withdrawn-${attendee.attendee_id}`}>
          <AlertTitle>{t("previouslyWithdrawnTitle")}</AlertTitle>
          <AlertDescription>
            {t("previouslyWithdrawnBody", {
              date: new Date(attendee.last_withdrawn.withdrawn_at).toLocaleString("en-MY"),
            })}
          </AlertDescription>
        </Alert>
      ) : null}

      <div className="border-border-subtle bg-surface flex items-start gap-3 rounded-lg border p-3">
        <Checkbox
          id={checkboxId}
          checked={consented}
          onCheckedChange={(state) => onConsentedChange(state === true)}
          disabled={isGranting}
          className="mt-0.5"
          data-testid={`consent-checkbox-${attendee.attendee_id}`}
        />
        <Label htmlFor={checkboxId} className="text-foreground text-sm leading-snug font-normal">
          {t.rich("consentCheckboxLabel", {
            label: formatAttendeeLabel(attendee, t),
            name: (chunks) => <span className="font-semibold">{chunks}</span>,
          })}
        </Label>
      </div>

      <Button
        type="button"
        size="sm"
        onClick={onGrant}
        disabled={!consented || isGranting}
        className="self-start"
        data-testid={`grant-button-${attendee.attendee_id}`}
      >
        {isGranting ? t("grantingCta") : t("grantCta")}
      </Button>
    </div>
  );
}

function ActiveConsentBlock({
  attendee,
  onWithdrawClick,
  isWithdrawing,
  t,
}: Readonly<{
  attendee: BiometricAttendeeContext;
  onWithdrawClick: () => void;
  isWithdrawing: boolean;
  t: BiometricsT;
}>) {
  const granted = attendee.active_consent!;
  return (
    <div className="flex flex-col gap-4">
      <div className="border-border-subtle bg-status-success-soft/30 flex flex-col gap-1 rounded-lg border p-3">
        <p className="text-foreground text-sm font-medium">
          {t("consentGrantedOn", { date: new Date(granted.granted_at).toLocaleString("en-MY") })}
        </p>
        <p className="text-foreground-muted text-xs">
          {t.rich("policyVersionInline", {
            version: granted.policy_version,
            v: (chunks) => <span className="font-mono">{chunks}</span>,
          })}
        </p>
      </div>

      <div
        className={cn(
          "border-border-subtle bg-surface flex items-start gap-3 rounded-lg border p-3",
        )}
        data-testid={`enrolment-placeholder-${attendee.attendee_id}`}
      >
        <Camera aria-hidden className="text-foreground-muted mt-0.5 size-4 shrink-0" />
        <div className="flex flex-col gap-0.5">
          <p className="text-foreground text-sm font-medium">
            {attendee.has_biometric ? t("enrolmentEnrolledTitle") : t("enrolmentPendingTitle")}
          </p>
          <p className="text-foreground-muted text-xs leading-snug">
            {attendee.has_biometric ? t("enrolmentEnrolledBody") : t("enrolmentPendingBody")}
          </p>
        </div>
      </div>

      <Button
        type="button"
        variant="outline"
        size="sm"
        onClick={onWithdrawClick}
        disabled={isWithdrawing}
        className="border-status-danger-border text-status-danger-foreground hover:bg-status-danger-soft self-start"
        data-testid={`withdraw-button-${attendee.attendee_id}`}
      >
        {t("withdrawConfirmCta")}
      </Button>
    </div>
  );
}

function formatAttendeeLabel(attendee: BiometricAttendeeContext, t: BiometricsT): string {
  if (attendee.nickname && attendee.nickname.trim().length > 0) return attendee.nickname.trim();
  const role = attendee.attendee_type === "adult" ? t("attendeeAdult") : t("attendeeChild");
  return `${role} #${attendee.attendee_index}`;
}
