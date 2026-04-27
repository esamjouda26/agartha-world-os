import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { getTranslations } from "next-intl/server";

import { EmptyState } from "@/components/ui/empty-state";

import { GuestSubpageHeader } from "@/components/shared/guest-subpage-header";

import { BiometricAttendeeCard } from "@/features/booking/components/biometric-attendee-card";
import { BiometricConsentDisclosure } from "@/features/booking/components/biometric-consent-disclosure";
import { BIOMETRIC_POLICY_VERSION, PRIVACY_CONTACT_EMAIL } from "@/features/booking/constants";
import { getBiometricsContext } from "@/features/booking/queries/get-biometrics-context";

/**
 * /my-booking/manage/biometrics — per-attendee privacy decision surface.
 *
 * The user is here to make a privacy decision for each attendee:
 *   - Grant consent (so Face Pay / Auto-capture work during the visit)
 *   - Or audit / withdraw existing consent
 *
 * The legally-mandatory disclosure is anchored at the top so it precedes
 * every consent decision below it (BIPA §15 informed-disclosure
 * requirement). Per-attendee cards then carry the decision UI.
 *
 * Phase 9a does NOT render a camera widget — the `enroll-biometric`
 * Edge Function lands in Session 18. Until then, the cards explain that
 * enrolment happens at the gate. This is the "make sense" path: the
 * consent decision is fully actionable today; the capture surface comes
 * with its backend partner.
 */

export const dynamic = "force-dynamic";
export const revalidate = 0;

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations("guest.biometrics");
  return {
    title: t("metaTitle"),
    description: t("metaDescription"),
    robots: { index: false, follow: false },
  };
}

export default async function MyBookingBiometricsPage() {
  const context = await getBiometricsContext();
  if (!context) {
    redirect("/my-booking" as never);
  }
  const t = await getTranslations("guest.biometrics");

  return (
    <div className="mx-auto flex w-full max-w-3xl flex-col gap-6 px-4 py-8 sm:px-6">
      <GuestSubpageHeader
        bookingRef={context.booking.booking_ref}
        title={t("title")}
        description={t("subtitle")}
        backHref="/my-booking/manage"
        data-testid="biometrics-page-header"
      />

      <BiometricConsentDisclosure
        defaultOpen={context.attendees.some((a) => a.active_consent === null)}
      />

      {context.attendees.length === 0 ? (
        <EmptyState
          variant="filtered-out"
          title={t("emptyTitle")}
          description={t("emptyBody")}
          data-testid="biometrics-empty"
        />
      ) : (
        <section
          aria-label={t("attendeeSectionTitle")}
          data-testid="biometrics-attendees-section"
          className="flex flex-col gap-3"
        >
          <header className="flex items-baseline justify-between gap-3">
            <h2 className="text-foreground text-base font-semibold tracking-tight">
              {t("attendeeSectionTitle")}
            </h2>
            <p className="text-foreground-muted text-xs">
              {t("attendeeCount", { count: context.attendees.length })}
            </p>
          </header>
          <ul className="flex flex-col gap-3">
            {context.attendees.map((attendee) => (
              <li key={attendee.attendee_id}>
                <BiometricAttendeeCard attendee={attendee} />
              </li>
            ))}
          </ul>
        </section>
      )}

      <footer
        className="border-border-subtle text-foreground-muted flex flex-col gap-1.5 border-t pt-4 text-xs"
        data-testid="biometrics-footer"
      >
        <p>
          {t.rich("privacyContact", {
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
        </p>
        <p>{t("retentionFootnote")}</p>
      </footer>
    </div>
  );
}
