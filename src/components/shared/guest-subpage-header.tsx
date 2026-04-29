import Link from "next/link";
import { ArrowLeft } from "lucide-react";

import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

/**
 * GuestSubpageHeader — shared chrome for guest sub-routes that hang off
 * `/my-booking/manage` (e.g. `/biometrics`, `/memories`).
 *
 * Replaces the duplicated "back link + booking-ref breadcrumb + h1 +
 * description" block that previously lived inline in each page. RSC-safe
 * (no client-only state).
 *
 * Layout intent:
 *   - Single column header — never competes with the page body.
 *   - Back link sits above the breadcrumb so the spatial relationship is
 *     unambiguous: tap to leave, label to ground.
 *   - Description copy is `max-w-prose` so long compliance text wraps on
 *     legible measure rather than stretching across desktop viewports.
 */
export type GuestSubpageHeaderProps = Readonly<{
  bookingRef: string;
  title: string;
  description: string;
  backHref: string;
  /** Translated "Back to my booking" — required, no default. */
  backLabel: string;
  /** Translated breadcrumb prefix, e.g. "Booking" — rendered before the ref. */
  breadcrumbPrefix: string;
  className?: string;
  "data-testid"?: string;
}>;

export function GuestSubpageHeader({
  bookingRef,
  title,
  description,
  backHref,
  backLabel,
  breadcrumbPrefix,
  className,
  "data-testid": testId,
}: GuestSubpageHeaderProps) {
  return (
    <header
      data-slot="guest-subpage-header"
      data-testid={testId ?? "guest-subpage-header"}
      className={cn("flex flex-col gap-3", className)}
    >
      <Button asChild variant="ghost" size="sm" className="self-start">
        <Link href={backHref as never} data-testid="guest-subpage-back-link">
          <ArrowLeft aria-hidden className="size-4" />
          {backLabel}
        </Link>
      </Button>
      <div>
        <p className="text-foreground-muted text-xs font-medium tracking-wide uppercase">
          {breadcrumbPrefix} · <span className="font-mono">{bookingRef}</span>
        </p>
        <h1 className="text-foreground mt-1 text-2xl font-semibold tracking-tight md:text-3xl">
          {title}
        </h1>
        <p className="text-foreground-muted mt-1.5 max-w-prose text-sm leading-relaxed">
          {description}
        </p>
      </div>
    </header>
  );
}
