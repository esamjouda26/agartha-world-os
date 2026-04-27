"use client";

import * as React from "react";
import { useTransition } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Camera, Check, ChevronDown, Loader2, UserCircle2 } from "lucide-react";
import { useTranslations } from "next-intl";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { toastError, toastSuccess } from "@/components/ui/toast-helpers";
import { cn } from "@/lib/utils";

import { updateAttendeeAction } from "@/features/booking/actions/update-attendee";
import type { ManagedAttendee } from "@/features/booking/queries/get-managed-booking";

/**
 * AttendeeManagementList — per-attendee compact row with expand-to-edit.
 *
 * Each row collapses to a single line by default (avatar · label · two
 * status dots · chevron) so a 4-attendee booking stays scannable at one
 * glance. Tapping the row reveals the edit surface (nickname + the two
 * intent toggles) inline. Saving collapses the row again.
 *
 * Face Pay and Auto-capture flags are INTENT only — actually using them
 * still requires a consent_records row + biometric enrolment. We surface
 * that gap clearly when no biometric exists.
 */

export type AttendeeManagementListProps = Readonly<{
  attendees: readonly ManagedAttendee[];
  /** Whether the booking is in a state where attendee edits are accepted. */
  editable: boolean;
  className?: string;
  "data-testid"?: string;
}>;

export function AttendeeManagementList({
  attendees,
  editable,
  className,
  "data-testid": testId,
}: AttendeeManagementListProps) {
  if (attendees.length === 0) return null;
  return (
    <ul
      data-slot="attendee-management-list"
      data-testid={testId ?? "attendee-management-list"}
      className={cn(
        "border-border-subtle bg-card divide-border-subtle flex flex-col divide-y rounded-xl border",
        className,
      )}
    >
      {attendees.map((attendee) => (
        <li key={attendee.id}>
          <AttendeeRow attendee={attendee} editable={editable} />
        </li>
      ))}
    </ul>
  );
}

function AttendeeRow({
  attendee,
  editable,
}: Readonly<{ attendee: ManagedAttendee; editable: boolean }>) {
  const t = useTranslations("guest.manage.attendees");
  const router = useRouter();
  const initialNickname = attendee.nickname ?? "";
  const [open, setOpen] = React.useState(false);
  const [nickname, setNickname] = React.useState(initialNickname);
  const [facePay, setFacePay] = React.useState(attendee.face_pay_enabled);
  const [autoCapture, setAutoCapture] = React.useState(attendee.auto_capture_enabled);
  const [isPending, startTransition] = useTransition();

  const dirty =
    nickname.trim() !== initialNickname.trim() ||
    facePay !== attendee.face_pay_enabled ||
    autoCapture !== attendee.auto_capture_enabled;

  React.useEffect(() => {
    setNickname(attendee.nickname ?? "");
    setFacePay(attendee.face_pay_enabled);
    setAutoCapture(attendee.auto_capture_enabled);
  }, [attendee.nickname, attendee.face_pay_enabled, attendee.auto_capture_enabled]);

  const handleSave = (): void => {
    startTransition(async () => {
      const trimmed = nickname.trim();
      const result = await updateAttendeeAction({
        attendee_id: attendee.id,
        nickname: trimmed,
        face_pay_enabled: facePay,
        auto_capture_enabled: autoCapture,
      });
      if (!result.success) {
        toastError(result);
        return;
      }
      toastSuccess(t("saveSuccessTitle"), {
        description: t("saveSuccessBody", {
          label: formatAttendeeLabel(attendee, trimmed || initialNickname, t),
        }),
      });
      setOpen(false);
      // Refresh so the row's flag-summary line ("Enrolled · Face Pay …")
      // reflects the saved state on next render. The local state already
      // matches the user's input, but updated_at + downstream queries
      // (e.g. memories) may want the freshest read.
      router.refresh();
    });
  };

  const label = formatAttendeeLabel(attendee, nickname, t);
  const isAdult = attendee.attendee_type === "adult";
  const subRoleLabel = isAdult ? t("subRoleAdult") : t("subRoleChild");

  return (
    <article
      data-slot="attendee-row"
      data-testid={`attendee-row-${attendee.attendee_type}-${attendee.attendee_index}`}
      data-state={open ? "open" : "collapsed"}
    >
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        aria-expanded={open}
        aria-controls={`attendee-edit-${attendee.id}`}
        className="hover:bg-surface focus-visible:ring-ring flex w-full items-center gap-3 px-4 py-3 text-left outline-none focus-visible:ring-2"
        data-testid={`attendee-toggle-${attendee.id}`}
      >
        <span
          aria-hidden
          className={cn(
            "inline-flex size-9 shrink-0 items-center justify-center rounded-full",
            attendee.has_biometric
              ? "bg-status-success-soft text-status-success-foreground"
              : "bg-surface text-foreground-muted",
          )}
        >
          <UserCircle2 className="size-5" />
        </span>
        <div className="flex min-w-0 flex-1 flex-col">
          <span className="text-foreground truncate text-sm leading-tight font-semibold">
            {label}
          </span>
          <span className="text-foreground-muted truncate text-xs leading-tight">
            {subRoleLabel} #{attendee.attendee_index} ·{" "}
            <FlagSummary
              hasBio={attendee.has_biometric}
              facePay={facePay}
              autoCapture={autoCapture}
              t={t}
            />
          </span>
        </div>
        <ChevronDown
          aria-hidden
          className={cn(
            "text-foreground-muted size-4 shrink-0 transition-transform duration-[var(--duration-small)]",
            open && "rotate-180",
          )}
        />
      </button>

      {open ? (
        <div
          id={`attendee-edit-${attendee.id}`}
          className="border-border-subtle border-t px-4 py-4 sm:px-5"
        >
          <div className="flex flex-col gap-3">
            <div className="flex flex-col gap-1.5">
              <Label
                htmlFor={`nickname-${attendee.id}`}
                className="text-foreground-muted text-xs font-medium"
              >
                {t("nicknameLabel")}
              </Label>
              <Input
                id={`nickname-${attendee.id}`}
                value={nickname}
                onChange={(e) => setNickname(e.target.value)}
                disabled={!editable || isPending}
                placeholder={
                  isAdult ? t("nicknamePlaceholderAdult") : t("nicknamePlaceholderChild")
                }
                maxLength={40}
                data-testid={`attendee-nickname-${attendee.id}`}
              />
            </div>

            <ToggleRow
              id={`face-pay-${attendee.id}`}
              label={t("facePay")}
              description={attendee.has_biometric ? t("facePayDescBio") : t("facePayDescNoBio")}
              checked={facePay}
              onCheckedChange={setFacePay}
              disabled={!editable || isPending}
              data-testid={`attendee-face-pay-${attendee.id}`}
            />
            <ToggleRow
              id={`auto-capture-${attendee.id}`}
              label={t("autoCapture")}
              description={
                attendee.has_biometric ? t("autoCaptureDescBio") : t("autoCaptureDescNoBio")
              }
              checked={autoCapture}
              onCheckedChange={setAutoCapture}
              disabled={!editable || isPending}
              data-testid={`attendee-auto-capture-${attendee.id}`}
            />
          </div>

          <div className="border-border-subtle mt-4 flex flex-wrap items-center justify-between gap-3 border-t pt-3">
            {attendee.has_biometric ? (
              <span className="text-status-success-foreground inline-flex items-center gap-1.5 text-xs font-medium">
                <Check aria-hidden className="size-3.5" />
                {t("biometricEnrolled")}
              </span>
            ) : (
              <Button
                asChild
                variant="ghost"
                size="sm"
                data-testid={`attendee-biometrics-link-${attendee.id}`}
                className="-ml-2"
              >
                <Link href={"/my-booking/manage/biometrics" as never}>
                  <Camera aria-hidden className="size-4" />
                  {t("setupBiometric")}
                </Link>
              </Button>
            )}
            <Button
              type="button"
              size="sm"
              onClick={handleSave}
              disabled={!editable || !dirty || isPending}
              data-testid={`attendee-save-${attendee.id}`}
            >
              {isPending ? <Loader2 aria-hidden className="size-4 animate-spin" /> : null}
              {isPending ? t("savingCta") : t("saveCta")}
            </Button>
          </div>
        </div>
      ) : null}
    </article>
  );
}

type AttendeesT = ReturnType<typeof useTranslations<"guest.manage.attendees">>;

function FlagSummary({
  hasBio,
  facePay,
  autoCapture,
  t,
}: Readonly<{ hasBio: boolean; facePay: boolean; autoCapture: boolean; t: AttendeesT }>) {
  if (!hasBio) {
    return <span>{t("flagNotEnrolled")}</span>;
  }
  const flags: string[] = [];
  if (facePay) flags.push(t("facePay"));
  if (autoCapture) flags.push(t("autoCapture"));
  if (flags.length === 0) return <span>{t("flagEnrolledFeaturesOff")}</span>;
  return <span>{t("flagEnrolledWithFeatures", { features: flags.join(" + ") })}</span>;
}

function ToggleRow({
  id,
  label,
  description,
  checked,
  onCheckedChange,
  disabled,
  "data-testid": testId,
}: Readonly<{
  id: string;
  label: string;
  description: string;
  checked: boolean;
  onCheckedChange: (next: boolean) => void;
  disabled: boolean;
  "data-testid"?: string;
}>) {
  return (
    <div className="flex items-start justify-between gap-4">
      <div className="flex flex-col gap-0.5 pr-3">
        <Label htmlFor={id} className="text-foreground text-sm font-medium">
          {label}
        </Label>
        <p className="text-foreground-muted text-xs leading-snug">{description}</p>
      </div>
      <Switch
        id={id}
        checked={checked}
        onCheckedChange={onCheckedChange}
        disabled={disabled}
        data-testid={testId}
        aria-label={label}
      />
    </div>
  );
}

function formatAttendeeLabel(attendee: ManagedAttendee, nickname: string, t: AttendeesT): string {
  const trimmed = nickname.trim();
  if (trimmed) return trimmed;
  const role = attendee.attendee_type === "adult" ? t("subRoleAdult") : t("subRoleChild");
  return `${role} #${attendee.attendee_index}`;
}
