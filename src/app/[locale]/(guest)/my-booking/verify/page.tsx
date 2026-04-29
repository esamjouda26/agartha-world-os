import type { Metadata } from "next";
import Link from "next/link";
import { cookies } from "next/headers";
import { getTranslations } from "next-intl/server";

import { redirect } from "@/i18n/navigation";

import { OtpVerifyForm } from "@/features/booking/components/otp-verify-form";
import { GUEST_OTP_PENDING_COOKIE } from "@/features/booking/constants";

/**
 * /my-booking/verify — OTP verification step.
 *
 * Layout intent: the OTP grid is the page. The hero icon was competing
 * with the OTP boxes (both visually heavy at the top of the card); we
 * dropped it. The "use a different reference" link is demoted to a
 * small inline link since it's a recovery path, not the main flow.
 *
 * Card chrome is inlined (single bordered div) instead of routing
 * through `<SectionCard headless>` — that variant only contributed
 * border + padding, so the wrapper was dead weight.
 */

export const dynamic = "force-dynamic";
export const revalidate = 0;

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations("guest.verify");
  return {
    title: t("metaTitle"),
    description: t("metaDescription"),
    robots: { index: false, follow: false },
  };
}

type PendingPayload = Readonly<{ booking_ref: string; masked_email: string }>;

function parsePending(raw: string | undefined): PendingPayload | null {
  if (!raw) return null;
  try {
    const parsed = JSON.parse(raw) as PendingPayload;
    if (typeof parsed.booking_ref !== "string" || !parsed.booking_ref) return null;
    if (typeof parsed.masked_email !== "string" || !parsed.masked_email) return null;
    return parsed;
  } catch {
    return null;
  }
}

export default async function MyBookingVerifyPage({
  params,
}: Readonly<{ params: Promise<{ locale: string }> }>) {
  const { locale } = await params;
  const store = await cookies();
  const pending = parsePending(store.get(GUEST_OTP_PENDING_COOKIE)?.value);
  if (!pending) {
    redirect({ href: "/my-booking", locale });
    return null;
  }
  const t = await getTranslations("guest.verify");

  return (
    <div className="mx-auto flex w-full max-w-md flex-col gap-5 px-4 py-10 sm:px-6 sm:py-14">
      <header className="flex flex-col gap-1.5">
        <h1 className="text-foreground text-2xl font-semibold tracking-tight md:text-3xl">
          {t("title")}
        </h1>
        <p className="text-foreground-muted text-sm leading-relaxed">
          {t.rich("subtitle", {
            maskedEmail: pending.masked_email,
            bookingRef: pending.booking_ref,
            email: (chunks) => <span className="text-foreground font-medium">{chunks}</span>,
            ref: (chunks) => <span className="text-foreground font-mono">{chunks}</span>,
          })}
        </p>
      </header>

      <div className="border-border-subtle bg-card rounded-xl border p-5 shadow-xs sm:p-6">
        <OtpVerifyForm bookingRef={pending.booking_ref} data-testid="otp-verify-form" />
      </div>

      <p className="text-foreground-subtle text-center text-xs">
        {t("wrongBookingPrompt")}{" "}
        <Link
          href={"/my-booking" as never}
          className="text-foreground-muted hover:text-foreground underline-offset-2 hover:underline"
          data-testid="otp-verify-change-ref"
        >
          {t("useDifferentRef")}
        </Link>
      </p>
    </div>
  );
}
