"use client";

import * as React from "react";
import Link from "next/link";
import type { Route } from "next";

import { cn } from "@/lib/utils";

/**
 * BottomTabBar — prompt.md §2B-D.12.
 *
 * Mobile crew shell primitive. Pinned to the bottom of the viewport on <md;
 * every tab maintains a ≥ 44×44 CSS-px touch target (Master Preamble §3).
 * Hidden on ≥ md — the crew shell swaps in a top bar at that breakpoint.
 */

export type BottomTabItem = Readonly<{
  id: string;
  label: string;
  href: Route;
  icon: React.ReactNode;
  active?: boolean;
  /** Optional badge — number or "!" style indicator. */
  badge?: React.ReactNode;
}>;

export type BottomTabBarProps = Readonly<{
  items: readonly BottomTabItem[];
  ariaLabel?: string;
  className?: string;
  "data-testid"?: string;
}>;

export function BottomTabBar({
  items,
  ariaLabel = "Primary",
  className,
  "data-testid": testId,
}: BottomTabBarProps) {
  return (
    <nav
      aria-label={ariaLabel}
      data-slot="bottom-tab-bar"
      data-testid={testId}
      className={cn(
        "bg-background/95 border-border-subtle supports-[backdrop-filter]:bg-background/70 fixed inset-x-0 bottom-0 z-40 border-t backdrop-blur md:hidden",
        className,
      )}
      style={{ paddingBottom: "env(safe-area-inset-bottom, 0px)" }}
    >
      <ul
        className="mx-auto grid max-w-screen-sm"
        style={{ gridTemplateColumns: `repeat(${items.length}, minmax(0, 1fr))` }}
      >
        {items.map((item) => (
          <li key={item.id} className="relative">
            <Link
              href={item.href}
              aria-current={item.active ? "page" : undefined}
              data-active={item.active || undefined}
              data-testid={`bottom-tab-${item.id}`}
              className={cn(
                "focus-visible:outline-ring relative flex min-h-[56px] flex-col items-center justify-center gap-1 px-3 py-2 text-[11px] font-medium tracking-wide focus-visible:outline-2 focus-visible:outline-offset-[-4px]",
                item.active ? "text-brand-primary" : "text-foreground-muted hover:text-foreground",
              )}
            >
              <span aria-hidden className="inline-flex size-6 items-center justify-center">
                {item.icon}
              </span>
              <span>{item.label}</span>
              {item.badge ? (
                <span
                  aria-hidden
                  className="bg-status-danger-solid absolute top-2 right-1/4 inline-flex min-w-4 items-center justify-center rounded-full px-1 text-[10px] leading-none font-semibold text-white"
                >
                  {item.badge}
                </span>
              ) : null}
            </Link>
          </li>
        ))}
      </ul>
    </nav>
  );
}
