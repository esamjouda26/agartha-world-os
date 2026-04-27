"use client";

import * as React from "react";
import { ChevronLeft, ChevronRight, MoreHorizontal } from "lucide-react";
import { useTranslations } from "next-intl";

import { Link, usePathname } from "@/i18n/navigation";
import { Button } from "@/components/ui/button";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";

import { PortalIcon } from "@/components/shared/portal-icon";
import { ShellUserCard } from "@/components/shared/shell-user-card";
import { cn } from "@/lib/utils";

import type { ShellUserInfo } from "@/lib/auth/get-shell-user-info";
import type { NavItem, NavManifest, NavSection } from "@/lib/nav/types";

/**
 * Unified responsive portal shell — matches `frontend_spec.md:14-15`.
 * ADR-0001 explains why this is the only shell for admin / management /
 * crew and why the prompt's "Sheet-based drawer on < lg" pattern is
 * superseded.
 *
 * Rendering contract (one DOM tree, no device forks):
 *   - `< md`: slim topbar + `<BottomTabBar>`. If the filtered nav list
 *     has more than 5 entries, the 5th tab is "More" — opens a bottom
 *     Sheet that hosts every overflow entry.
 *   - `>= md`: slim topbar + collapsible sidebar. Collapse state is
 *     persisted in the `SIDEBAR_COLLAPSED` cookie so the SSR layout
 *     matches the client state on refresh.
 */

const MAX_TOP_LEVEL_TABS = 5;
const SIDEBAR_COOKIE = "SIDEBAR_COLLAPSED" as const;
const COOKIE_MAX_AGE = 60 * 60 * 24 * 365;

export type ResponsivePortalShellProps = Readonly<{
  navigation: NavManifest;
  children: React.ReactNode;
  initialSidebarCollapsed?: boolean;
  /** Optional slot for a user-menu trigger. */
  userMenu?: React.ReactNode;
  /** Optional slot for a notifications trigger. */
  notifications?: React.ReactNode;
  /** Shell user identity info for sidebar footer + user menu. */
  userInfo?: ShellUserInfo;
}>;

export function ResponsivePortalShell({
  navigation,
  children,
  initialSidebarCollapsed = false,
  userMenu,
  notifications,
  userInfo,
}: ResponsivePortalShellProps) {
  const [collapsed, setCollapsed] = React.useState(initialSidebarCollapsed);
  const [moreOpen, setMoreOpen] = React.useState(false);
  const pathname = usePathname();
  const t = useTranslations();

  const flatItems = React.useMemo<readonly NavItem[]>(
    () => navigation.sections.flatMap((s) => s.items),
    [navigation],
  );

  const hasOverflow = flatItems.length > MAX_TOP_LEVEL_TABS;
  const visibleCount = hasOverflow ? MAX_TOP_LEVEL_TABS - 1 : flatItems.length;
  const visibleItems = flatItems.slice(0, visibleCount);
  const overflowItems = hasOverflow ? flatItems.slice(visibleCount) : [];

  // Rebuild section-grouped overflow so the More sheet can render proper
  // headings instead of one flat list. Each section is filtered to only
  // the items that were pushed into overflow; sections that contributed
  // nothing are dropped. Visual structure now matches the desktop sidebar.
  const overflowSections = React.useMemo<readonly NavSection[]>(() => {
    if (!hasOverflow) return [];
    const overflowIds = new Set(overflowItems.map((i) => i.id));
    return navigation.sections
      .map((section) => ({
        ...section,
        items: section.items.filter((item) => overflowIds.has(item.id)),
      }))
      .filter((section) => section.items.length > 0);
  }, [navigation.sections, overflowItems, hasOverflow]);

  const isActive = React.useCallback(
    (href: string) => {
      if (pathname === href) return true;
      if (!pathname.startsWith(`${href}/`)) return false;
      // Suppress parent highlight when a more-specific sibling is active.
      // e.g. /management/hr should NOT highlight when /management/hr/shifts is current.
      const hasDeeperMatch = flatItems.some(
        (other) =>
          other.href !== href &&
          other.href.startsWith(`${href}/`) &&
          pathname.startsWith(other.href),
      );
      return !hasDeeperMatch;
    },
    [pathname, flatItems],
  );

  const labelFor = React.useCallback(
    (item: NavItem | NavSection) =>
      "labelKey" in item && t.has(item.labelKey) ? t(item.labelKey) : item.label,
    [t],
  );

  const toggleCollapsed = React.useCallback(() => {
    setCollapsed((prev) => {
      const next = !prev;
      if (typeof document !== "undefined") {
        document.cookie = `${SIDEBAR_COOKIE}=${next ? "1" : "0"}; path=/; max-age=${COOKIE_MAX_AGE}; SameSite=Lax`;
      }
      if (typeof window !== "undefined") {
        window.localStorage.setItem(SIDEBAR_COOKIE, next ? "1" : "0");
      }
      return next;
    });
  }, []);

  // Publish the bottom-tab-bar height as a CSS variable so feature-level
  // sticky UI can anchor above the tab bar without guessing. The variable is
  // scoped to this shell's subtree — everything below consumes it via
  // `var(--shell-bottom-inset, 0px)`.
  //
  //   < md & tab bar rendered: tab min-height (56px) + bottom safe-area inset
  //   < md & no tab bar:       0px
  //   >= md (desktop sidebar): 0px (tab bar is hidden)
  //
  // Encoded as Tailwind arbitrary-property utilities so the value is
  // evaluated per breakpoint in pure CSS — no JS measurement, no layout
  // shift.
  const hasBottomBar = visibleItems.length > 0;
  const bottomInsetClasses = hasBottomBar
    ? "[--shell-bottom-inset:calc(56px+env(safe-area-inset-bottom,0px))] md:[--shell-bottom-inset:0px]"
    : "[--shell-bottom-inset:0px]";

  return (
    <div className={cn("flex min-h-dvh flex-col md:flex-row", bottomInsetClasses)}>
      {/* Desktop sidebar — frontend_spec.md:14
          Premium polish: subtle vertical gradient on the rail, brand block
          with portal pill (replaces the redundant access-level pill that
          duplicated portalName), gold left-accent on the active nav item. */}
      <aside
        data-slot="portal-sidebar"
        data-testid="portal-sidebar"
        data-collapsed={collapsed || undefined}
        aria-label="Primary"
        className={cn(
          "bg-surface border-border sticky top-0 hidden h-dvh shrink-0 flex-col border-r transition-[width] duration-200 ease-out md:flex",
          // Subtle top-down gradient — adds depth without competing with content.
          "from-surface to-surface/60 bg-gradient-to-b",
          collapsed ? "w-16" : "w-60",
        )}
      >
        <div
          className={cn(
            "border-border-subtle flex h-14 items-center border-b px-3",
            // Collapsed: the brand chip IS the toggle (single 40px target,
            // centered in the 64px rail). Expanded: brand block on the
            // left, chevron-left button on the right.
            collapsed ? "justify-center" : "justify-between gap-2",
          )}
        >
          {collapsed ? (
            // The brand mark doubles as the expand affordance — a single
            // hit target avoids the prior 32 + 8 + 32 = 72px row that
            // didn't fit in the 40px usable width of the collapsed rail.
            // Hover ring brightens to telegraph clickability.
            <button
              type="button"
              onClick={toggleCollapsed}
              aria-label="Expand sidebar"
              data-testid="portal-sidebar-toggle"
              title={`AgarthaOS · ${navigation.portalName} — click to expand`}
              className="bg-brand-primary/15 text-brand-primary ring-brand-primary/20 hover:ring-brand-primary/50 focus-visible:outline-ring flex size-9 items-center justify-center rounded-lg text-sm font-bold ring-1 transition-shadow focus-visible:outline-2 focus-visible:outline-offset-2"
            >
              A
            </button>
          ) : (
            <>
              <div className="flex min-w-0 items-center gap-2.5">
                {/* Brand mark — solid colored chip, not just a letter on
                    background, reads as a real logo lockup. */}
                <span
                  aria-hidden
                  className="bg-brand-primary/15 text-brand-primary ring-brand-primary/20 flex size-8 shrink-0 items-center justify-center rounded-lg text-sm font-bold ring-1"
                >
                  A
                </span>
                <div className="flex min-w-0 flex-col gap-0.5">
                  <span className="text-foreground truncate text-sm leading-tight font-semibold tracking-tight">
                    AgarthaOS
                  </span>
                  {/* Portal pill — replaces the duplicate access-level pill.
                      `navigation.portalName` is "Crew" / "Management" / "Admin",
                      which is the actual user-facing portal context. */}
                  <span className="text-foreground-subtle inline-flex w-fit text-[10px] leading-none font-medium tracking-[0.08em] uppercase">
                    {navigation.portalName}
                  </span>
                </div>
              </div>
              <Button
                type="button"
                variant="ghost"
                size="icon-sm"
                aria-label="Collapse sidebar"
                data-testid="portal-sidebar-toggle"
                onClick={toggleCollapsed}
              >
                <ChevronLeft className="size-4" aria-hidden />
              </Button>
            </>
          )}
        </div>
        <nav className="flex-1 overflow-y-auto px-2 py-3" data-testid="portal-nav">
          <ul className="flex flex-col gap-4">
            {navigation.sections.map((section) => (
              <li key={section.id}>
                {!collapsed ? (
                  <p className="text-foreground-subtle mb-1 px-2 text-xs font-medium tracking-wider uppercase">
                    {labelFor(section)}
                  </p>
                ) : null}
                <ul className="flex flex-col gap-0.5">
                  {section.items.map((item) => {
                    const active = isActive(item.href);
                    return (
                      <li key={item.id}>
                        <Link
                          href={item.href}
                          aria-current={active ? "page" : undefined}
                          data-active={active || undefined}
                          data-testid={`portal-nav-${item.id}`}
                          title={collapsed ? labelFor(item) : undefined}
                          className={cn(
                            // Relative anchors the absolute gold accent bar.
                            "focus-visible:outline-ring relative flex items-center gap-3 rounded-md px-2 py-2 text-sm font-medium transition-colors focus-visible:outline-2 focus-visible:outline-offset-2",
                            active
                              ? "bg-brand-primary/10 text-brand-primary"
                              : "text-foreground-muted hover:bg-surface hover:text-foreground",
                            collapsed ? "justify-center" : "",
                          )}
                        >
                          {/* Gold left-accent bar — 3px-wide pill anchored to
                              the rounded corners, only visible when active.
                              Premium signal that beats a flat tinted bg. */}
                          {active ? (
                            <span
                              aria-hidden
                              className="bg-brand-primary absolute inset-y-1 left-0 w-[3px] rounded-r-full"
                            />
                          ) : null}
                          <PortalIcon name={item.iconName} className="size-4" />
                          <span
                            className={cn("min-w-0 flex-1 truncate", collapsed ? "sr-only" : "")}
                          >
                            {labelFor(item)}
                          </span>
                        </Link>
                      </li>
                    );
                  })}
                </ul>
              </li>
            ))}
          </ul>
        </nav>
        {userInfo ? <ShellUserCard userInfo={userInfo} collapsed={collapsed} /> : null}
      </aside>

      <div className="flex min-h-dvh flex-1 flex-col">
        {/* Slim topbar — shared chrome.
            Identity moved out: the sidebar (desktop) and the avatar menu
            (mobile sheet) are the canonical identity surfaces. The topbar
            is now contextual:
              - Mobile (`<md`): brand mark + portal name pill (left). The
                sidebar is hidden here so users still need a "where am I"
                anchor.
              - Desktop (`>=md`): left slot is empty by design — the
                sidebar already shows the brand block, and the page-level
                header (`<StandardPageShell>` or component-level headings)
                renders the section title.
            Both: notifications bell + avatar (menu trigger) on the right. */}
        <header
          data-slot="portal-topbar"
          data-testid="portal-topbar"
          className="bg-surface/85 border-border-subtle sticky top-0 z-20 flex h-14 items-center gap-3 border-b px-3 backdrop-blur-md sm:px-4"
        >
          {/* Mobile-only brand block — mirrors the desktop sidebar's
              expanded header so brand expression is consistent across
              breakpoints. Hidden at md+ because the sidebar owns the
              brand on desktop.
                Row 1: AgarthaOS wordmark (the product)
                Row 2: portal pill — Crew / Management / Admin (the
                       context, since there's no sidebar to anchor it). */}
          <div className="flex min-w-0 flex-1 items-center gap-2.5 md:hidden">
            <span
              aria-hidden
              className="bg-brand-primary/15 text-brand-primary ring-brand-primary/20 flex size-8 shrink-0 items-center justify-center rounded-lg text-sm font-bold ring-1"
            >
              A
            </span>
            <div className="flex min-w-0 flex-col gap-0.5">
              <span
                className="text-foreground truncate text-sm leading-tight font-semibold tracking-tight"
                data-testid="portal-topbar-wordmark"
              >
                AgarthaOS
              </span>
              <span
                className="text-foreground-subtle inline-flex w-fit text-[10px] leading-none font-medium tracking-[0.08em] uppercase"
                data-testid="portal-topbar-portal-name"
              >
                {navigation.portalName}
              </span>
            </div>
          </div>

          {/* Desktop spacer — pushes actions to the right. The sidebar
              carries brand + identity on this breakpoint. */}
          <div className="hidden flex-1 md:block" aria-hidden />

          <div className="flex items-center gap-2">
            {notifications}
            {userMenu}
          </div>
        </header>

        <main
          data-slot="portal-main"
          data-testid="portal-main"
          className="flex-1 px-4 pt-6 pb-[calc(var(--shell-bottom-inset,0px)+theme(spacing.6))] sm:px-6 lg:px-8"
        >
          {children}
        </main>
      </div>

      {/* Mobile bottom tab bar — frontend_spec.md:15
          Premium polish: gold "indicator" pill drops from the top edge of
          the active tab (iOS-style accent), `active:scale-95` for tactile
          tap feedback, and `moreOpen` lights up the More button when its
          sheet is open so the chrome stays in sync with the user's mental
          model. */}
      {visibleItems.length > 0 ? (
        <nav
          aria-label="Primary"
          data-slot="bottom-tab-bar"
          data-testid="portal-bottom-tabs"
          className="bg-background/95 border-border-subtle supports-[backdrop-filter]:bg-background/70 fixed inset-x-0 bottom-0 z-40 border-t backdrop-blur md:hidden"
          style={{ paddingBottom: "env(safe-area-inset-bottom, 0px)" }}
        >
          <ul
            className="mx-auto grid max-w-screen-sm"
            style={{
              gridTemplateColumns: `repeat(${
                visibleItems.length + (hasOverflow ? 1 : 0)
              }, minmax(0, 1fr))`,
            }}
          >
            {visibleItems.map((item) => {
              const active = isActive(item.href);
              return (
                <li key={item.id}>
                  <Link
                    href={item.href}
                    aria-current={active ? "page" : undefined}
                    data-active={active || undefined}
                    data-testid={`bottom-tab-${item.id}`}
                    className={cn(
                      "focus-visible:outline-ring relative flex min-h-[56px] flex-col items-center justify-center gap-1 px-3 py-2 text-[11px] font-medium tracking-wide transition-transform focus-visible:outline-2 focus-visible:outline-offset-[-4px] active:scale-95",
                      active ? "text-brand-primary" : "text-foreground-muted hover:text-foreground",
                    )}
                  >
                    {/* Top accent pill — anchored to the bar's top edge,
                        32×3px, rounded-b-full so it reads as "spilling"
                        from the divider above. Premium iOS-style cue. */}
                    {active ? (
                      <span
                        aria-hidden
                        className="bg-brand-primary absolute top-0 left-1/2 h-[3px] w-8 -translate-x-1/2 rounded-b-full"
                      />
                    ) : null}
                    <span aria-hidden className="inline-flex size-6 items-center justify-center">
                      <PortalIcon name={item.iconName} className="size-5" />
                    </span>
                    <span className="text-center leading-tight">{labelFor(item)}</span>
                  </Link>
                </li>
              );
            })}
            {hasOverflow ? (
              <li>
                <button
                  type="button"
                  onClick={() => setMoreOpen(true)}
                  aria-expanded={moreOpen}
                  aria-haspopup="dialog"
                  data-active={moreOpen || undefined}
                  className={cn(
                    "focus-visible:outline-ring relative flex min-h-[56px] w-full flex-col items-center justify-center gap-1 px-3 py-2 text-[11px] font-medium tracking-wide transition-transform focus-visible:outline-2 focus-visible:outline-offset-[-4px] active:scale-95",
                    moreOpen ? "text-brand-primary" : "text-foreground-muted hover:text-foreground",
                  )}
                  data-testid="bottom-tab-more"
                >
                  {moreOpen ? (
                    <span
                      aria-hidden
                      className="bg-brand-primary absolute top-0 left-1/2 h-[3px] w-8 -translate-x-1/2 rounded-b-full"
                    />
                  ) : null}
                  <span aria-hidden className="inline-flex size-6 items-center justify-center">
                    <MoreHorizontal className="size-5" aria-hidden />
                  </span>
                  <span className="text-center leading-tight">More</span>
                </button>
              </li>
            ) : null}
          </ul>
        </nav>
      ) : null}

      <Sheet open={moreOpen} onOpenChange={setMoreOpen}>
        <SheetContent
          side="bottom"
          className="bg-card max-h-[80vh] gap-0 rounded-t-2xl border-t-0 p-0"
          data-testid="portal-more-sheet"
        >
          {/* Drag handle — purely decorative grabber pill at top centre.
              Signals "this sheet is dismissible by swipe" without taking
              real estate from the title. Mirrors iOS sheet conventions. */}
          <div className="flex shrink-0 justify-center pt-2 pb-1">
            <span aria-hidden className="bg-foreground-subtle/40 h-1 w-10 rounded-full" />
          </div>

          <SheetHeader className="border-border-subtle border-b px-4 pt-2 pb-3">
            <SheetTitle className="text-base">More</SheetTitle>
            <SheetDescription className="sr-only">
              Additional navigation grouped by section
            </SheetDescription>
          </SheetHeader>

          {/* Sectioned item list — same hierarchy as the desktop sidebar
              ("Your job" / "Everyone") so users see the same mental model
              regardless of breakpoint. Section headers in caps tracking;
              items get an icon container, label, and chevron — premium
              "list with affordance" pattern (Stripe Dashboard, Linear). */}
          <div
            className="flex flex-col gap-4 overflow-y-auto px-3 py-3"
            style={{ paddingBottom: "calc(env(safe-area-inset-bottom, 0px) + 12px)" }}
          >
            {overflowSections.map((section) => (
              <div key={section.id}>
                <p className="text-foreground-subtle mb-1 px-2 text-[11px] font-medium tracking-[0.08em] uppercase">
                  {labelFor(section)}
                </p>
                <ul className="flex flex-col gap-0.5">
                  {section.items.map((item) => {
                    const active = isActive(item.href);
                    return (
                      <li key={item.id}>
                        <Link
                          href={item.href}
                          onClick={() => setMoreOpen(false)}
                          aria-current={active ? "page" : undefined}
                          data-active={active || undefined}
                          data-testid={`portal-more-${item.id}`}
                          className={cn(
                            // Relative anchors the gold left accent for active items.
                            "focus-visible:outline-ring relative flex min-h-[52px] items-center gap-3 rounded-lg px-2 py-2 transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 active:scale-[0.98]",
                            active
                              ? "bg-brand-primary/10 text-brand-primary"
                              : "text-foreground hover:bg-surface",
                          )}
                        >
                          {active ? (
                            <span
                              aria-hidden
                              className="bg-brand-primary absolute inset-y-2 left-0 w-[3px] rounded-r-full"
                            />
                          ) : null}

                          {/* Icon in a tinted container — gives every row
                              consistent visual weight regardless of icon. */}
                          <span
                            aria-hidden
                            className={cn(
                              "flex size-9 shrink-0 items-center justify-center rounded-lg",
                              active
                                ? "bg-brand-primary/15 text-brand-primary"
                                : "bg-surface text-foreground-muted",
                            )}
                          >
                            <PortalIcon name={item.iconName} className="size-[18px]" />
                          </span>

                          <span className="min-w-0 flex-1 truncate text-sm font-medium">
                            {labelFor(item)}
                          </span>

                          {/* Trailing chevron — affordance that this row
                              navigates somewhere, mirrors native list-row
                              patterns (iOS / Material). Subdued so it
                              doesn't compete with the label. */}
                          <ChevronRight
                            aria-hidden
                            className={cn(
                              "size-4 shrink-0",
                              active ? "text-brand-primary/70" : "text-foreground-subtle",
                            )}
                          />
                        </Link>
                      </li>
                    );
                  })}
                </ul>
              </div>
            ))}
          </div>
        </SheetContent>
      </Sheet>
    </div>
  );
}
