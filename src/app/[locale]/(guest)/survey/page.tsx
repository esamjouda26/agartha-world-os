import type { Metadata } from "next";
import { getTranslations } from "next-intl/server";

import { SurveyForm } from "@/features/marketing/components/survey-form";
import { BOOKING_REF_REGEX } from "@/features/booking/schemas/booking-lookup";

/**
 * /survey — anonymous post-visit feedback collection.
 *
 * URL params:
 *   ?ref=AG-XXXXXX-NNNN   — links the response to a booking_id
 *                           (silently ignored if it doesn't parse)
 *   ?source=qr_code|email|kiosk|in_app
 *                         — attribution; defaults to in_app
 *
 * Single-page form. Optimised for completion: only overall_score is
 * required.
 *
 * Indexed because /survey is a meaningful destination — guest receives
 * the URL on a printed QR / post-visit email and may share it.
 *
 * Header is intentionally chrome-light: no decorative icon, no card
 * wrapper. The form below carries the visual weight; this header just
 * names the goal and (optionally) anchors the response to a booking.
 */

export const dynamic = "force-dynamic";
export const revalidate = 0;

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations("guest.survey");
  return {
    title: t("metaTitle"),
    description: t("metaDescription"),
    robots: { index: true, follow: false },
  };
}

const SOURCES = ["in_app", "email", "kiosk", "qr_code"] as const;
type SurveySource = (typeof SOURCES)[number];

type SearchParams = Promise<Record<string, string | string[] | undefined>>;

export default async function SurveyPage({
  searchParams,
}: Readonly<{ searchParams: SearchParams }>) {
  const params = await searchParams;

  const refRaw = typeof params.ref === "string" ? params.ref.toUpperCase() : null;
  const bookingRef = refRaw && BOOKING_REF_REGEX.test(refRaw) ? refRaw : null;

  const sourceRaw = typeof params.source === "string" ? params.source : "in_app";
  const source: SurveySource = (SOURCES as readonly string[]).includes(sourceRaw)
    ? (sourceRaw as SurveySource)
    : "in_app";

  const t = await getTranslations("guest.survey");

  return (
    <div className="mx-auto flex w-full max-w-2xl flex-col gap-6 px-4 py-8 sm:px-6 md:py-12">
      <header className="flex flex-col items-center gap-3 text-center">
        <h1 className="text-foreground text-2xl font-semibold tracking-tight md:text-3xl">
          {t("title")}
        </h1>
        <p className="text-foreground-muted max-w-md text-sm leading-relaxed">{t("subtitle")}</p>
        {bookingRef ? (
          <p
            className="text-foreground-muted bg-surface border-border-subtle inline-flex items-center gap-1.5 rounded-full border px-3 py-1 text-xs"
            data-testid="survey-booking-ref-pill"
          >
            {t.rich("bookingPill", {
              ref: bookingRef,
              code: (chunks) => <span className="text-foreground font-mono">{chunks}</span>,
            })}
          </p>
        ) : null}
      </header>

      <SurveyForm bookingRef={bookingRef} source={source} />
    </div>
  );
}
