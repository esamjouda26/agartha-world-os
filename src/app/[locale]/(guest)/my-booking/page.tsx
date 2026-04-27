import type { Metadata } from "next";
import { getTranslations } from "next-intl/server";

import { BookingRefInput } from "@/features/booking/components/booking-ref-input";
import { BOOKING_REF_REGEX } from "@/features/booking/schemas/booking-lookup";

/**
 * /my-booking — anonymous booking lookup.
 *
 * Layout intent: the input IS the page. We strip the icon hero and the
 * separate "lost your reference?" footer; the help affordance is now an
 * inline disclosure inside the input's label, where it's discoverable
 * without competing for primary attention.
 *
 * Auto-fills from a `?ref=AG-…` URL param so a confirmation-email link
 * is one click.
 *
 * Card chrome is inlined (single bordered div) instead of routing through
 * `<SectionCard headless>` — that variant strips title/description/action
 * and only contributed border + padding, so the wrapper was dead weight.
 */

export const dynamic = "force-dynamic";
export const revalidate = 0;

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations("guest.lookup");
  return {
    title: t("metaTitle"),
    description: t("metaDescription"),
    robots: { index: true, follow: true },
  };
}

type SearchParams = Promise<Record<string, string | string[] | undefined>>;

export default async function MyBookingPage({
  searchParams,
}: Readonly<{ searchParams: SearchParams }>) {
  const params = await searchParams;
  const refRaw = typeof params.ref === "string" ? params.ref.toUpperCase() : null;
  const prefill = refRaw && BOOKING_REF_REGEX.test(refRaw) ? refRaw : undefined;
  const t = await getTranslations("guest.lookup");

  return (
    <div className="mx-auto flex w-full max-w-md flex-col gap-5 px-4 py-10 sm:px-6 sm:py-14">
      <header className="flex flex-col gap-1.5">
        <h1 className="text-foreground text-2xl font-semibold tracking-tight md:text-3xl">
          {t("title")}
        </h1>
        <p className="text-foreground-muted text-sm leading-relaxed">{t("subtitle")}</p>
      </header>

      <div className="border-border-subtle bg-card rounded-xl border p-5 shadow-xs sm:p-6">
        <BookingRefInput
          {...(prefill !== undefined ? { defaultValue: prefill } : {})}
          data-testid="my-booking-ref-form"
        />
      </div>
    </div>
  );
}
