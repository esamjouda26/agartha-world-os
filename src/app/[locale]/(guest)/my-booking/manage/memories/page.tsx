import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { getTranslations } from "next-intl/server";
import { ImageIcon } from "lucide-react";

import { Button } from "@/components/ui/button";
import { EmptyState } from "@/components/ui/empty-state";

import { GuestSubpageHeader } from "@/components/shared/guest-subpage-header";

import { MemoriesGallery } from "@/features/booking/components/memories-gallery";
import { getMemories } from "@/features/booking/queries/get-memories";

/**
 * /my-booking/manage/memories — auto-captured photos from the visit.
 *
 * The user is here to see + download their photos. The page's structure
 * privileges that goal: the gallery dominates the body; pagination is
 * subtle; pre-visit + opt-out states get descriptive empty copy that
 * routes the user back where they need to be.
 *
 * Phase 9a deliberately omits "Download all as ZIP" — JSZip adds bundle
 * weight without proven demand at this stage. Per-photo download covers
 * the user goal honestly. Add bulk export when usage data warrants it.
 */

export const dynamic = "force-dynamic";
export const revalidate = 0;

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations("guest.memories");
  return {
    title: t("metaTitle"),
    description: t("metaDescription"),
    robots: { index: false, follow: false },
  };
}

type SearchParams = Promise<Record<string, string | string[] | undefined>>;

const BASE_PATH = "/my-booking/manage/memories";

export default async function MyBookingMemoriesPage({
  searchParams,
}: Readonly<{ searchParams: SearchParams }>) {
  const params = await searchParams;
  const pageRaw = typeof params.page === "string" ? Number(params.page) : 1;
  const page = Number.isFinite(pageRaw) && pageRaw > 0 ? Math.floor(pageRaw) : 1;

  const context = await getMemories({ page });
  if (!context) {
    redirect("/my-booking" as never);
  }
  const t = await getTranslations("guest.memories");

  const description = describeHeader(context.booking, context.total, t);

  return (
    <div className="mx-auto flex w-full max-w-5xl flex-col gap-6 px-4 py-8 sm:px-6">
      <GuestSubpageHeader
        bookingRef={context.booking.booking_ref}
        title={t("title")}
        description={description}
        backHref="/my-booking/manage"
        data-testid="memories-page-header"
      />

      {context.total > 0 ? (
        <MemoriesGallery context={context} basePath={BASE_PATH} />
      ) : (
        <MemoriesEmpty
          status={context.booking.status}
          anyAutoCapture={context.booking.any_auto_capture_enabled}
        />
      )}
    </div>
  );
}

type MemoriesT = Awaited<ReturnType<typeof getTranslations<"guest.memories">>>;

function describeHeader(
  booking: { slot_date: string; status: string; any_auto_capture_enabled: boolean },
  total: number,
  t: MemoriesT,
): string {
  if (total === 0) return t("subtitleFallback");
  const dateLabel = formatHumanDate(booking.slot_date);
  // Photos are retained 30 days from visit per the operations bucket
  // policy; surface that as a concrete date rather than the abstract
  // "until they expire" so the user knows when to act.
  const expiryDate = new Date(booking.slot_date + "T00:00:00");
  expiryDate.setDate(expiryDate.getDate() + 30);
  const expiryLabel = new Intl.DateTimeFormat("en-MY", {
    month: "long",
    day: "numeric",
  }).format(expiryDate);
  return t("subtitle", { count: total, date: dateLabel, expiry: expiryLabel });
}

async function MemoriesEmpty({
  status,
  anyAutoCapture,
}: Readonly<{ status: string; anyAutoCapture: boolean }>) {
  const t = await getTranslations("guest.memories.empty");
  if (status === "confirmed" || status === "pending_payment") {
    return (
      <EmptyState
        variant="first-use"
        title={t("preVisitTitle")}
        description={t("preVisitBody")}
        icon={<ImageIcon className="size-8" />}
        action={
          <Button asChild variant="outline">
            <Link href={"/my-booking/manage/biometrics" as never}>{t("preVisitCta")}</Link>
          </Button>
        }
        data-testid="memories-empty-pre-visit"
      />
    );
  }

  if (!anyAutoCapture) {
    return (
      <EmptyState
        variant="first-use"
        title={t("noOptInTitle")}
        description={t("noOptInBody")}
        icon={<ImageIcon className="size-8" />}
        action={
          <Button asChild variant="outline">
            <Link href={"/my-booking/manage" as never}>{t("noOptInCta")}</Link>
          </Button>
        }
        data-testid="memories-empty-no-opt-in"
      />
    );
  }

  return (
    <EmptyState
      variant="first-use"
      title={t("noPhotosTitle")}
      description={t("noPhotosBody")}
      icon={<ImageIcon className="size-8" />}
      data-testid="memories-empty-no-photos"
    />
  );
}

function formatHumanDate(iso: string): string {
  if (!iso) return "your visit day";
  const d = new Date(iso + "T00:00:00");
  return new Intl.DateTimeFormat("en-MY", {
    weekday: "long",
    month: "long",
    day: "numeric",
  }).format(d);
}
