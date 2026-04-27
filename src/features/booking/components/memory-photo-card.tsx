"use client";

import * as React from "react";
import { AlertTriangle, Download, Link2, MoreHorizontal, User } from "lucide-react";
import { useTranslations } from "next-intl";

import { Button } from "@/components/ui/button";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { toastError, toastSuccess } from "@/components/ui/toast-helpers";
import { cn } from "@/lib/utils";

import type { MemoryPhoto } from "@/features/booking/queries/get-memories";

/**
 * MemoryPhotoCard — single photo card.
 *
 * Density rework: actions live in a small overlay popover anchored to
 * the thumbnail's top-right corner instead of a button row at the foot
 * of the card. Frees vertical space on mobile so each photo gets a
 * larger preview, and matches the gallery patterns guests expect from
 * Apple Photos / Google Photos.
 *
 * Why plain <img> instead of next/image: signed URLs are per-request,
 * cookie-bound, and short-lived (15 min). next/image's static loader
 * cache + host-allowlist actively fight that. A plain <img> with an
 * aspect-ratio container + lazy-loading achieves the same CLS / perf
 * characteristics for this surface.
 */

export type MemoryPhotoCardProps = Readonly<{
  photo: MemoryPhoto;
  /** TTL of the signed URL — surfaced in the share toast copy. */
  signedUrlTtlSeconds: number;
  className?: string;
  "data-testid"?: string;
}>;

export function MemoryPhotoCard({
  photo,
  signedUrlTtlSeconds,
  className,
  "data-testid": testId,
}: MemoryPhotoCardProps) {
  const t = useTranslations("guest.memories");
  const expiringSoon = isExpiringSoon(photo.expires_at);
  const filename = `agartha-memory-${photo.id.slice(0, 8)}.jpg`;
  const ttlMinutes = Math.round(signedUrlTtlSeconds / 60);

  const handleCopyLink = async (): Promise<void> => {
    if (!photo.signed_url) {
      toastError({ success: false, error: "INTERNAL" });
      return;
    }
    try {
      await navigator.clipboard.writeText(photo.signed_url);
      toastSuccess(t("shareCopiedTitle"), {
        description: t("shareCopyDescription", { minutes: ttlMinutes }),
      });
    } catch {
      toastError({ success: false, error: "INTERNAL" });
    }
  };

  return (
    <article
      data-slot="memory-photo-card"
      data-testid={testId ?? `memory-photo-${photo.id}`}
      className={cn(
        "border-border-subtle bg-card group relative flex flex-col overflow-hidden rounded-xl border shadow-xs",
        className,
      )}
    >
      {/* Single aspect-ratio across breakpoints. The earlier 3/4 → 4/5
          switch at sm caused a CLS hit on viewport-resize through the
          breakpoint; 4/5 reads cleanly for both portrait phone shots and
          DSLR captures from the visit. */}
      <div className="bg-surface relative aspect-[4/5] overflow-hidden">
        {photo.signed_url ? (
          /* eslint-disable-next-line @next/next/no-img-element */
          <img
            src={photo.signed_url}
            alt={
              photo.attendee
                ? t("ariaPhotoOfAttendee", { attendee: formatAttendee(photo.attendee) })
                : t("ariaPhotoGeneric")
            }
            loading="lazy"
            decoding="async"
            className="h-full w-full object-cover transition-transform duration-300 ease-out group-hover:scale-[1.03]"
            data-testid={`memory-photo-img-${photo.id}`}
          />
        ) : (
          <div
            role="alert"
            className="text-foreground-muted flex h-full w-full flex-col items-center justify-center gap-2 px-4 text-center text-xs"
            data-testid={`memory-photo-broken-${photo.id}`}
          >
            <AlertTriangle aria-hidden className="size-5" />
            <span>{t("photoBroken")}</span>
          </div>
        )}

        {/* Overlay action menu — sits in the photo's top-right corner so
            it never steals card real estate. The download button is its
            own quick action; share lives in the menu. */}
        <div className="absolute top-2 right-2 z-10 flex items-center gap-1">
          {photo.signed_url ? (
            <Button
              asChild
              size="icon-sm"
              variant="default"
              className="bg-black/55 text-white shadow-md backdrop-blur hover:bg-black/70 dark:bg-black/65 dark:hover:bg-black/80"
              data-testid={`memory-photo-download-${photo.id}`}
            >
              <a
                href={photo.signed_url}
                download={filename}
                rel="noreferrer noopener"
                aria-label={t("photoDownloadAria")}
              >
                <Download aria-hidden className="size-4" />
              </a>
            </Button>
          ) : null}
          <Popover>
            <PopoverTrigger asChild>
              <Button
                type="button"
                size="icon-sm"
                variant="default"
                className="bg-black/55 text-white shadow-md backdrop-blur hover:bg-black/70 dark:bg-black/65 dark:hover:bg-black/80"
                aria-label={t("photoActionsAria")}
                data-testid={`memory-photo-actions-${photo.id}`}
              >
                <MoreHorizontal aria-hidden className="size-4" />
              </Button>
            </PopoverTrigger>
            <PopoverContent align="end" className="w-56 p-1">
              <button
                type="button"
                onClick={() => void handleCopyLink()}
                disabled={!photo.signed_url}
                className="text-foreground hover:bg-surface focus-visible:bg-surface focus-visible:ring-ring flex w-full items-center gap-2 rounded-md px-2.5 py-2 text-left text-sm outline-none focus-visible:ring-2 disabled:cursor-not-allowed disabled:opacity-50"
                data-testid={`memory-photo-share-${photo.id}`}
              >
                <Link2 aria-hidden className="text-foreground-muted size-4" />
                <div className="flex flex-1 flex-col">
                  <span>{t("shareCta")}</span>
                  <span className="text-foreground-subtle text-[11px]">
                    {t("shareExpiresLabel", { minutes: ttlMinutes })}
                  </span>
                </div>
              </button>
            </PopoverContent>
          </Popover>
        </div>

        {expiringSoon ? (
          <span
            className="bg-status-warning-soft text-status-warning-foreground border-status-warning-border absolute top-2 left-2 z-10 rounded-full border px-2 py-0.5 text-[10px] font-medium shadow-sm"
            data-testid={`memory-photo-expiring-${photo.id}`}
          >
            {t("photoExpiresOn", { date: formatExpiry(photo.expires_at) })}
          </span>
        ) : null}
      </div>
      <div className="flex flex-col gap-0.5 px-3 py-2.5">
        <p className="text-foreground text-xs leading-tight font-medium">
          {formatCaptured(photo.captured_at)}
        </p>
        {photo.attendee ? (
          <p className="text-foreground-muted inline-flex items-center gap-1 text-[11px]">
            <User aria-hidden className="size-3" />
            {formatAttendee(photo.attendee)}
          </p>
        ) : (
          <p className="text-foreground-subtle text-[11px]">{t("photoUnmatched")}</p>
        )}
      </div>
    </article>
  );
}

function formatCaptured(iso: string): string {
  const d = new Date(iso);
  return new Intl.DateTimeFormat("en-MY", {
    weekday: "short",
    hour: "numeric",
    minute: "2-digit",
  }).format(d);
}

function formatExpiry(iso: string): string {
  const d = new Date(iso);
  return new Intl.DateTimeFormat("en-MY", {
    month: "short",
    day: "numeric",
  }).format(d);
}

function isExpiringSoon(iso: string): boolean {
  const expiry = new Date(iso).getTime();
  const now = Date.now();
  const days = (expiry - now) / (1000 * 60 * 60 * 24);
  return days >= 0 && days <= 2;
}

function formatAttendee(attendee: NonNullable<MemoryPhoto["attendee"]>): string {
  if (attendee.nickname && attendee.nickname.trim().length > 0) return attendee.nickname.trim();
  return `${attendee.attendee_type === "adult" ? "Adult" : "Child"} #${attendee.attendee_index}`;
}
