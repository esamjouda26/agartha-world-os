"use client";

import * as React from "react";

import { cn } from "@/lib/utils";

/**
 * StickyActionBar — viewport-anchored primary-CTA strip for mobile.
 *
 * Phase 8 crew-portal contract (`prompt.md:473`) requires the primary
 * mutation CTA to land in the bottom-100px band on mobile (375×667) so
 * crew can submit long forms without scrolling. At md+ the bar
 * collapses to inline so desktop layouts stay quiet.
 *
 * The form content beneath the sticky variant SHOULD include
 * `pb-24 md:pb-0` (or compose `<StickyActionBarSpacer>`) so the last
 * fields stay visible above the bar.
 *
 * `bottomOffset` defaults to 72px to clear the crew portal's
 * `<BottomTabBar>`. Override for portals without a bottom tab bar.
 */

export type StickyActionBarProps = Readonly<{
  children: React.ReactNode;
  /** Distance from viewport bottom on mobile (CSS px). Defaults to 72 to clear the crew BottomTabBar. */
  bottomOffset?: number;
  /** Optional additional classes applied to the bar. */
  className?: string;
  "data-testid"?: string;
}>;

export function StickyActionBar({
  children,
  bottomOffset = 72,
  className,
  "data-testid": testId,
}: StickyActionBarProps) {
  return (
    <div
      data-slot="sticky-action-bar"
      data-testid={testId}
      style={
        {
          "--sticky-action-bar-offset": `${bottomOffset}px`,
        } as React.CSSProperties
      }
      className={cn(
        // Mobile: fixed above the bottom tab bar with a translucent backdrop.
        "border-border-subtle bg-card/95 fixed inset-x-0 z-30 border-t px-4 py-3 shadow-[0_-4px_16px_-8px_rgba(0,0,0,0.25)] backdrop-blur-md",
        "bottom-[var(--sticky-action-bar-offset)]",
        // md+: collapse to inline — no border, no backdrop, no shadow, no padding.
        "md:relative md:bottom-auto md:border-0 md:bg-transparent md:px-0 md:py-0 md:shadow-none md:backdrop-blur-none",
        className,
      )}
    >
      {children}
    </div>
  );
}

/**
 * StickyActionBarSpacer — invisible bottom spacer that gives form
 * content room to scroll past the sticky bar on mobile. Place INSIDE
 * the form, just before `</form>` (or just after the form when the bar
 * sits outside the form).
 *
 * On md+ the spacer collapses to 0 since the bar goes inline.
 */
export function StickyActionBarSpacer({ className }: Readonly<{ className?: string }>) {
  return <div aria-hidden className={cn("h-24 md:h-0", className)} />;
}
