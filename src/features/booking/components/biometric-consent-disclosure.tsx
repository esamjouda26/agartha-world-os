"use client";

import * as React from "react";
import { Camera, ChevronDown, Clock, FileText, Mail, ShieldCheck, Trash2 } from "lucide-react";
import { useTranslations } from "next-intl";

import { cn } from "@/lib/utils";

import { BIOMETRIC_POLICY_VERSION, PRIVACY_CONTACT_EMAIL } from "@/features/booking/constants";

/**
 * BiometricConsentDisclosure — the legally-mandatory disclosure.
 *
 * Required to satisfy:
 *   - BIPA §15 (Illinois) — written release with informed disclosure
 *   - GDPR Art. 9(2)(a) — explicit consent for special-category data
 *   - PDPA Sec. 6 (Malaysia) — informed consent
 *
 * Default open when at least one attendee still needs to make a consent
 * decision (the disclosure must precede the consent decision). Once
 * every attendee has an active consent, defaults to collapsed — the
 * disclosure has been read and can step aside for the day-to-day
 * management view.
 *
 * Either way, the disclosure remains expandable at any time, so the
 * legal text never disappears.
 */
export function BiometricConsentDisclosure({
  defaultOpen,
  className,
  "data-testid": testId,
}: Readonly<{
  defaultOpen: boolean;
  className?: string;
  "data-testid"?: string;
}>) {
  const t = useTranslations("guest.biometrics");
  const [open, setOpen] = React.useState(defaultOpen);
  return (
    <section
      data-slot="biometric-consent-disclosure"
      data-testid={testId ?? "biometric-consent-disclosure"}
      data-state={open ? "open" : "collapsed"}
      aria-label={t("disclosureTitle")}
      className={cn(
        "border-border bg-card overflow-hidden rounded-2xl border shadow-xs",
        className,
      )}
    >
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        aria-expanded={open}
        aria-controls="biometric-consent-disclosure-body"
        data-testid="biometric-consent-disclosure-toggle"
        className="hover:bg-surface focus-visible:ring-ring flex w-full items-center gap-3 px-5 py-4 text-left outline-none focus-visible:ring-2 sm:px-6"
      >
        {/* Neutral info-tone tint — disclosure is informational, not
            promotional, so the brand colour was over-cueing it as a
            primary CTA. `status-info` matches the legal/safety tone of
            the content. */}
        <span
          aria-hidden
          className="bg-status-info-soft text-status-info-foreground inline-flex size-10 shrink-0 items-center justify-center rounded-lg"
        >
          <ShieldCheck className="size-5" />
        </span>
        <div className="flex min-w-0 flex-1 flex-col">
          <span className="text-foreground text-sm leading-tight font-semibold sm:text-base">
            {t("disclosureTitle")}
          </span>
          <span className="text-foreground-muted truncate text-xs leading-snug">
            {t("disclosureSubtitle")}
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
          id="biometric-consent-disclosure-body"
          className="border-border-subtle border-t px-5 pt-4 pb-5 sm:px-6 sm:pb-6"
        >
          <p className="text-foreground-muted mb-4 text-sm leading-relaxed">
            {t.rich("disclosureIntro", {
              email: PRIVACY_CONTACT_EMAIL,
              a: (chunks) => (
                <a
                  href={`mailto:${PRIVACY_CONTACT_EMAIL}`}
                  className="text-brand-primary underline-offset-2 hover:underline"
                >
                  {chunks}
                </a>
              ),
            })}
          </p>
          <dl className="text-foreground grid gap-4 sm:grid-cols-2">
            <DisclosureItem
              icon={<Camera className="size-4" />}
              title={t("disclosureItems.captureTitle")}
              body={t("disclosureItems.captureBody")}
            />
            <DisclosureItem
              icon={<FileText className="size-4" />}
              title={t("disclosureItems.purposeTitle")}
              body={t("disclosureItems.purposeBody")}
            />
            <DisclosureItem
              icon={<ShieldCheck className="size-4" />}
              title={t("disclosureItems.legalTitle")}
              body={t("disclosureItems.legalBody")}
            />
            <DisclosureItem
              icon={<Clock className="size-4" />}
              title={t("disclosureItems.retentionTitle")}
              body={t("disclosureItems.retentionBody")}
            />
            <DisclosureItem
              icon={<Trash2 className="size-4" />}
              title={t("disclosureItems.withdrawTitle")}
              body={t("disclosureItems.withdrawBody")}
            />
            <DisclosureItem
              icon={<Mail className="size-4" />}
              title={t("disclosureItems.controllerTitle")}
              body={t.rich("disclosureItems.controllerBody", {
                email: PRIVACY_CONTACT_EMAIL,
                version: BIOMETRIC_POLICY_VERSION,
                a: (chunks) => (
                  <a
                    href={`mailto:${PRIVACY_CONTACT_EMAIL}`}
                    className="text-brand-primary underline-offset-2 hover:underline"
                  >
                    {chunks}
                  </a>
                ),
                v: (chunks) => <span className="font-mono">{chunks}</span>,
              })}
            />
          </dl>
        </div>
      ) : null}
    </section>
  );
}

function DisclosureItem({
  icon,
  title,
  body,
}: Readonly<{
  icon: React.ReactNode;
  title: string;
  body: React.ReactNode;
}>) {
  return (
    <div className="flex flex-col gap-1.5">
      <dt className="text-foreground inline-flex items-center gap-2 text-sm font-semibold">
        <span aria-hidden className="text-foreground-muted">
          {icon}
        </span>
        {title}
      </dt>
      <dd className="text-foreground-muted text-sm leading-relaxed">{body}</dd>
    </div>
  );
}
