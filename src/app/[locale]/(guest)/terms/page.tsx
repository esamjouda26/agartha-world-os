import type { Metadata } from "next";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { getTranslations } from "next-intl/server";

import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";

import { PRIVACY_CONTACT_EMAIL } from "@/features/booking/constants";

/**
 * /terms — placeholder Terms & Conditions page.
 *
 * Referenced by the booking T&C checkbox; this stub prevents a 404 mid-
 * booking. Real terms text will be drafted by legal and dropped in.
 */

export const dynamic = "force-static";
export const revalidate = 3600;

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations("guest.terms");
  return {
    title: t("metaTitle"),
    description: t("metaDescription"),
    robots: { index: true, follow: true },
  };
}

export default async function TermsPage() {
  const t = await getTranslations("guest.terms");
  const tCommon = await getTranslations("guest.common");
  return (
    <div className="mx-auto flex w-full max-w-2xl flex-col gap-6 px-4 py-10 sm:px-6 sm:py-14">
      <header className="flex flex-col gap-3">
        <Button asChild variant="ghost" size="sm" className="self-start">
          <Link href={"/" as never}>
            <ArrowLeft aria-hidden className="size-4" />
            {tCommon("backToHome")}
          </Link>
        </Button>
        <h1 className="text-foreground text-2xl font-semibold tracking-tight md:text-3xl">
          {t("title")}
        </h1>
      </header>

      <Alert variant="info">
        <AlertTitle>{t("alertTitle")}</AlertTitle>
        <AlertDescription>
          The complete terms are being finalised. The summary below covers the operative policies
          referenced when you book.
        </AlertDescription>
      </Alert>

      <section className="border-border-subtle bg-card flex flex-col gap-4 rounded-xl border p-5 sm:p-6">
        <h2 className="text-foreground text-base font-semibold tracking-tight">
          {t("sectionBooking")}
        </h2>
        <ul className="text-foreground-muted list-disc space-y-2 pl-5 text-sm leading-relaxed">
          <li>
            Bookings are held for 15 minutes after creation; payment must be completed within that
            window or the slot is automatically released.
          </li>
          <li>
            Confirmed bookings can be rescheduled up to 2 hours before the entry time. Within 2
            hours, please come to the gate and the team will help.
          </li>
          <li>
            No-shows are not refunded. If you can't make it, reschedule before the 2-hour cutoff.
          </li>
          <li>
            Promo codes are validated at booking and re-validated on reschedule against the new
            slot's day and time.
          </li>
        </ul>
      </section>

      <section className="border-border-subtle bg-card flex flex-col gap-4 rounded-xl border p-5 sm:p-6">
        <h2 className="text-foreground text-base font-semibold tracking-tight">
          {t("sectionFacePay")}
        </h2>
        <p className="text-foreground-muted text-sm leading-relaxed">
          Both features are strictly opt-in per attendee, require explicit consent, and can be
          withdrawn at any time. Templates are deleted 24 hours after your visit ends, or
          immediately on withdrawal. See{" "}
          <Link
            href={"/privacy" as never}
            className="text-brand-primary underline-offset-2 hover:underline"
          >
            Privacy Policy
          </Link>{" "}
          for full retention details.
        </p>
      </section>

      <section className="border-border-subtle bg-card flex flex-col gap-4 rounded-xl border p-5 sm:p-6">
        <h2 className="text-foreground text-base font-semibold tracking-tight">
          {t("sectionContact")}
        </h2>
        <p className="text-foreground-muted text-sm leading-relaxed">
          Questions? Email{" "}
          <a
            href={`mailto:${PRIVACY_CONTACT_EMAIL}`}
            className="text-brand-primary underline-offset-2 hover:underline"
          >
            {PRIVACY_CONTACT_EMAIL}
          </a>
          .
        </p>
      </section>
    </div>
  );
}
