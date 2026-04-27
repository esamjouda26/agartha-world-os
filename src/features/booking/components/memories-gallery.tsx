import * as React from "react";
import Link from "next/link";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { getTranslations } from "next-intl/server";

import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

import { MemoryPhotoCard } from "@/features/booking/components/memory-photo-card";
import type { MemoriesContext } from "@/features/booking/queries/get-memories";

/**
 * MemoriesGallery — responsive grid + simple offset pagination.
 *
 * Pagination is link-based (real anchors) so it preserves history /
 * scroll position / accessibility — and the page already does the
 * server-side fetch per ?page=N via `nuqs`.
 */

export type MemoriesGalleryProps = Readonly<{
  context: MemoriesContext;
  /** Path used for pagination links — typically `/my-booking/manage/memories`. */
  basePath: string;
  className?: string;
  "data-testid"?: string;
}>;

export async function MemoriesGallery({
  context,
  basePath,
  className,
  "data-testid": testId,
}: MemoriesGalleryProps) {
  const t = await getTranslations("guest.memories");
  const totalPages = Math.max(1, Math.ceil(context.total / context.page_size));
  const hasPrev = context.page > 1;
  const hasNext = context.page < totalPages;

  const prevHref = hasPrev
    ? `${basePath}${context.page - 1 > 1 ? `?page=${context.page - 1}` : ""}`
    : null;
  const nextHref = hasNext ? `${basePath}?page=${context.page + 1}` : null;

  return (
    <section
      data-slot="memories-gallery"
      data-testid={testId ?? "memories-gallery"}
      aria-label={t("ariaCapturedPhotos")}
      className={cn("flex flex-col gap-4", className)}
    >
      {/* Responsive density:
          • <sm  → 2 cols, gap-2 — phone portrait, large tap targets.
          • sm   → 3 cols, gap-3 — tablet portrait.
          • lg   → 4 cols      — desktop typical.
          • xl+  → 5 cols      — wide displays; ~240 px tile is comfortable
                                   for thumbnail browsing without forcing
                                   the user to scroll horizontally in the
                                   eye. */}
      <ul className="grid grid-cols-2 gap-2 sm:grid-cols-3 sm:gap-3 lg:grid-cols-4 xl:grid-cols-5">
        {context.photos.map((photo) => (
          <li key={photo.id}>
            <MemoryPhotoCard photo={photo} signedUrlTtlSeconds={context.signed_url_ttl_seconds} />
          </li>
        ))}
      </ul>

      {totalPages > 1 ? (
        <nav
          aria-label={t("ariaPagination")}
          className="border-border-subtle flex items-center justify-between gap-3 border-t pt-4"
          data-testid="memories-pagination"
        >
          <Button asChild variant="ghost" size="sm" disabled={!prevHref}>
            {prevHref ? (
              <Link href={prevHref as never} data-testid="memories-pagination-prev">
                <ChevronLeft aria-hidden className="size-4" />
                {t("paginationPrevious")}
              </Link>
            ) : (
              <span aria-disabled className="text-foreground-subtle inline-flex items-center gap-2">
                <ChevronLeft aria-hidden className="size-4" />
                {t("paginationPrevious")}
              </span>
            )}
          </Button>
          <p className="text-foreground-muted text-xs" aria-live="polite">
            {t("paginationLabel", {
              page: context.page,
              total: totalPages,
              count: context.total,
            })}
          </p>
          <Button asChild variant="ghost" size="sm" disabled={!nextHref}>
            {nextHref ? (
              <Link href={nextHref as never} data-testid="memories-pagination-next">
                {t("paginationNext")}
                <ChevronRight aria-hidden className="size-4" />
              </Link>
            ) : (
              <span aria-disabled className="text-foreground-subtle inline-flex items-center gap-2">
                {t("paginationNext")}
                <ChevronRight aria-hidden className="size-4" />
              </span>
            )}
          </Button>
        </nav>
      ) : null}
    </section>
  );
}
