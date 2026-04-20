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
import { ThemeToggle } from "@/components/theme-toggle";
import { PortalIcon } from "@/components/shells/portal-icon";
import { cn } from "@/lib/utils";

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
}>;

export function ResponsivePortalShell({
  navigation,
  children,
  initialSidebarCollapsed = false,
  userMenu,
  notifications,
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

  const isActive = React.useCallback(
    (href: string) => pathname === href || pathname.startsWith(`${href}/`),
    [pathname],
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
      {/* Desktop sidebar — frontend_spec.md:14 */}
      <aside
        data-slot="portal-sidebar"
        data-testid="portal-sidebar"
        data-collapsed={collapsed || undefined}
        aria-label="Primary"
        className={cn(
          "bg-surface border-border sticky top-0 hidden h-dvh shrink-0 flex-col border-r transition-[width] duration-200 ease-out md:flex",
          collapsed ? "w-16" : "w-60",
        )}
      >
        <div className="border-border-subtle flex h-14 items-center justify-between gap-2 border-b px-3">
          <div
            className={cn(
              "min-w-0 truncate font-semibold tracking-tight",
              collapsed ? "sr-only" : "",
            )}
          >
            {navigation.portalName}
          </div>
          <Button
            type="button"
            variant="ghost"
            size="icon-sm"
            aria-label={collapsed ? "Expand sidebar" : "Collapse sidebar"}
            data-testid="portal-sidebar-toggle"
            onClick={toggleCollapsed}
          >
            {collapsed ? (
              <ChevronRight className="size-4" aria-hidden />
            ) : (
              <ChevronLeft className="size-4" aria-hidden />
            )}
          </Button>
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
                            "focus-visible:outline-ring flex items-center gap-3 rounded-md px-2 py-2 text-sm font-medium focus-visible:outline-2 focus-visible:outline-offset-2",
                            active
                              ? "bg-brand-primary/10 text-brand-primary"
                              : "text-foreground-muted hover:bg-surface hover:text-foreground",
                            collapsed ? "justify-center" : "",
                          )}
                        >
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
      </aside>

      <div className="flex min-h-dvh flex-1 flex-col">
        {/* Slim topbar — shared by every breakpoint. */}
        <header
          data-slot="portal-topbar"
          data-testid="portal-topbar"
          className="bg-surface/90 border-border-subtle sticky top-0 z-20 flex h-14 items-center gap-3 border-b px-3 backdrop-blur sm:px-4"
        >
          <div className="min-w-0 flex-1 truncate font-semibold tracking-tight">
            {navigation.portalName}
          </div>
          <div className="flex items-center gap-2">
            {notifications}
            {userMenu}
            <ThemeToggle />
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

      {/* Mobile bottom tab bar — frontend_spec.md:15 */}
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
                      "focus-visible:outline-ring relative flex min-h-[56px] flex-col items-center justify-center gap-1 px-3 py-2 text-[11px] font-medium tracking-wide focus-visible:outline-2 focus-visible:outline-offset-[-4px]",
                      active ? "text-brand-primary" : "text-foreground-muted hover:text-foreground",
                    )}
                  >
                    <span aria-hidden className="inline-flex size-6 items-center justify-center">
                      <PortalIcon name={item.iconName} className="size-5" />
                    </span>
                    <span>{labelFor(item)}</span>
                  </Link>
                </li>
              );
            })}
            {hasOverflow ? (
              <li>
                <button
                  type="button"
                  onClick={() => setMoreOpen(true)}
                  className="focus-visible:outline-ring text-foreground-muted hover:text-foreground relative flex min-h-[56px] w-full flex-col items-center justify-center gap-1 px-3 py-2 text-[11px] font-medium tracking-wide focus-visible:outline-2 focus-visible:outline-offset-[-4px]"
                  data-testid="bottom-tab-more"
                  aria-haspopup="dialog"
                >
                  <span aria-hidden className="inline-flex size-6 items-center justify-center">
                    <MoreHorizontal className="size-5" aria-hidden />
                  </span>
                  <span>More</span>
                </button>
              </li>
            ) : null}
          </ul>
        </nav>
      ) : null}

      <Sheet open={moreOpen} onOpenChange={setMoreOpen}>
        <SheetContent side="bottom" className="p-0" data-testid="portal-more-sheet">
          <SheetHeader className="border-border-subtle border-b px-4 py-3">
            <SheetTitle>More</SheetTitle>
            <SheetDescription className="sr-only">Additional navigation</SheetDescription>
          </SheetHeader>
          <ul className="divide-border-subtle flex max-h-[60vh] flex-col divide-y overflow-y-auto">
            {overflowItems.map((item) => {
              const active = isActive(item.href);
              return (
                <li key={item.id}>
                  <Link
                    href={item.href}
                    onClick={() => setMoreOpen(false)}
                    aria-current={active ? "page" : undefined}
                    className={cn(
                      "focus-visible:outline-ring flex items-center gap-3 px-4 py-3 text-sm font-medium focus-visible:outline-2 focus-visible:outline-offset-[-2px]",
                      active ? "text-brand-primary" : "text-foreground hover:bg-surface",
                    )}
                    data-testid={`portal-more-${item.id}`}
                  >
                    <PortalIcon name={item.iconName} className="size-5" />
                    <span>{labelFor(item)}</span>
                  </Link>
                </li>
              );
            })}
          </ul>
        </SheetContent>
      </Sheet>
    </div>
  );
}
