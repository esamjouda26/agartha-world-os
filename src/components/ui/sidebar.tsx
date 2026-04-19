"use client";

import * as React from "react";
import Link from "next/link";
import type { Route } from "next";
import { ChevronsLeft, ChevronsRight } from "lucide-react";

import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";

/**
 * Sidebar — prompt.md §2B-D.11.
 *
 * Three states: `expanded` (240px, default), `collapsed` (64px, icon-only),
 * `hover-expanded` (starts collapsed, widens over content on hover without
 * shifting layout). Persists the collapsed preference in the
 * `SIDEBAR_COLLAPSED` cookie. The primitive is hidden below the `lg`
 * breakpoint per the Responsive Strategy matrix — drawer replacement is a
 * portal-shell concern handled in Phase 3.
 */

export const SIDEBAR_COOKIE = "SIDEBAR_COLLAPSED" as const;
const COOKIE_MAX_AGE = 60 * 60 * 24 * 365;

export type SidebarItem = Readonly<{
  id: string;
  label: string;
  href: Route;
  icon: React.ReactNode;
  /** Optional sub-label for matched routes (e.g., a count). */
  hint?: React.ReactNode;
  /** Mark as the current page for styling + aria-current. */
  active?: boolean;
}>;

export type SidebarSection = Readonly<{
  id: string;
  label: string;
  items: readonly SidebarItem[];
}>;

export type SidebarState = "expanded" | "collapsed" | "hover-expanded";

export type SidebarProps = Readonly<{
  brand: React.ReactNode;
  sections: readonly SidebarSection[];
  initialState?: SidebarState;
  onStateChange?: (state: SidebarState) => void;
  footer?: React.ReactNode;
  className?: string;
  "data-testid"?: string;
}>;

function writeCollapsedCookie(collapsed: boolean): void {
  if (typeof document === "undefined") return;
  document.cookie = `${SIDEBAR_COOKIE}=${collapsed ? "1" : "0"}; path=/; max-age=${COOKIE_MAX_AGE}; SameSite=Lax`;
}

export function Sidebar({
  brand,
  sections,
  initialState = "expanded",
  onStateChange,
  footer,
  className,
  "data-testid": testId,
}: SidebarProps) {
  const [state, setState] = React.useState<SidebarState>(initialState);
  const [hoverExpanded, setHoverExpanded] = React.useState(false);

  const setAndNotify = (next: SidebarState): void => {
    setState(next);
    onStateChange?.(next);
    writeCollapsedCookie(next !== "expanded");
  };

  const resolvedState: SidebarState =
    state === "hover-expanded" && hoverExpanded ? "expanded" : state;
  const isCompact = resolvedState === "collapsed";

  return (
    <aside
      data-slot="sidebar"
      data-state={state}
      data-resolved-state={resolvedState}
      data-testid={testId}
      aria-label="Primary navigation"
      onMouseEnter={() => state === "hover-expanded" && setHoverExpanded(true)}
      onMouseLeave={() => state === "hover-expanded" && setHoverExpanded(false)}
      className={cn(
        "bg-surface border-border relative hidden h-full flex-col border-r transition-[width] duration-200 ease-out lg:flex",
        isCompact ? "w-16" : "w-60",
        state === "hover-expanded" && hoverExpanded ? "absolute z-30 shadow-lg" : "",
        className,
      )}
    >
      <div className="border-border-subtle flex h-14 items-center justify-between gap-2 border-b px-3">
        <div className={cn("min-w-0 truncate", isCompact ? "sr-only" : "")}>{brand}</div>
        <Tooltip>
          <TooltipTrigger asChild>
            <Button
              type="button"
              variant="ghost"
              size="icon-sm"
              aria-label={state === "expanded" ? "Collapse sidebar" : "Expand sidebar"}
              data-testid="sidebar-toggle"
              onClick={() => setAndNotify(state === "expanded" ? "collapsed" : "expanded")}
            >
              {state === "expanded" ? (
                <ChevronsLeft className="size-4" aria-hidden />
              ) : (
                <ChevronsRight className="size-4" aria-hidden />
              )}
            </Button>
          </TooltipTrigger>
          <TooltipContent side="right">
            {state === "expanded" ? "Collapse" : "Expand"}
          </TooltipContent>
        </Tooltip>
      </div>

      <nav className="flex-1 overflow-y-auto px-2 py-3">
        <ul className="flex flex-col gap-4">
          {sections.map((section) => (
            <li key={section.id}>
              {!isCompact ? (
                <p className="text-foreground-subtle mb-1 px-2 text-xs font-medium tracking-wider uppercase">
                  {section.label}
                </p>
              ) : null}
              <ul className="flex flex-col gap-0.5">
                {section.items.map((item) => (
                  <li key={item.id}>
                    <SidebarLink item={item} compact={isCompact} />
                  </li>
                ))}
              </ul>
            </li>
          ))}
        </ul>
      </nav>

      {footer ? (
        <div
          className={cn(
            "border-border-subtle border-t px-2 py-3",
            isCompact ? "flex justify-center" : "",
          )}
        >
          {footer}
        </div>
      ) : null}

      <Tooltip>
        <TooltipTrigger asChild>
          <Button
            type="button"
            variant="ghost"
            size="icon-sm"
            aria-label={state === "hover-expanded" ? "Pin sidebar" : "Set hover mode"}
            data-testid="sidebar-hover-mode"
            className="mx-2 mb-3 self-start"
            onClick={() =>
              setAndNotify(state === "hover-expanded" ? "collapsed" : "hover-expanded")
            }
          >
            <span aria-hidden className="font-mono text-xs">
              {state === "hover-expanded" ? "▣" : "◫"}
            </span>
          </Button>
        </TooltipTrigger>
        <TooltipContent side="right">
          {state === "hover-expanded" ? "Pin" : "Hover mode"}
        </TooltipContent>
      </Tooltip>
    </aside>
  );
}

function SidebarLink({ item, compact }: Readonly<{ item: SidebarItem; compact: boolean }>) {
  const content = (
    <Link
      href={item.href}
      aria-current={item.active ? "page" : undefined}
      data-active={item.active || undefined}
      data-testid={`sidebar-link-${item.id}`}
      className={cn(
        "focus-visible:outline-ring flex items-center gap-3 rounded-md px-2 py-2 text-sm font-medium transition-colors focus-visible:outline-2 focus-visible:outline-offset-2",
        item.active
          ? "bg-brand-primary/10 text-brand-primary"
          : "text-foreground-muted hover:bg-surface hover:text-foreground",
        compact ? "justify-center" : "",
      )}
    >
      <span aria-hidden className="inline-flex size-5 items-center justify-center">
        {item.icon}
      </span>
      <span className={cn("min-w-0 flex-1 truncate", compact ? "sr-only" : "")}>{item.label}</span>
      {!compact && item.hint ? (
        <span className="text-foreground-subtle text-xs">{item.hint}</span>
      ) : null}
    </Link>
  );

  if (!compact) return content;
  return (
    <Tooltip>
      <TooltipTrigger asChild>{content}</TooltipTrigger>
      <TooltipContent side="right">{item.label}</TooltipContent>
    </Tooltip>
  );
}
