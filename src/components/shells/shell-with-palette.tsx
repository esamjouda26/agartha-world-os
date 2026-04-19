"use client";

import * as React from "react";

import {
  ResponsivePortalShell,
  type ResponsivePortalShellProps,
} from "@/components/shared/responsive-portal-shell";
import { CommandPalette } from "@/components/ui/command-palette";

/**
 * Portal wrapper that pairs the unified shell with a
 * portal-scoped `<CommandPalette>`. The palette's "Navigate" list is
 * the same manifest the sidebar / bottom tab bar render from, so the
 * two surfaces cannot drift (ADR-0001).
 *
 * The app-level `<CommandPalette>` mounted from `src/components/providers.tsx`
 * carries no routes; each staff portal mounts a scoped palette here that
 * DOES carry routes. The global one handles the auth / guest shells.
 */
export function ShellWithPalette({
  navigation,
  children,
  initialSidebarCollapsed,
  userMenu,
  notifications,
}: ResponsivePortalShellProps) {
  const navCommands = React.useMemo(
    () =>
      navigation.sections.flatMap((section) =>
        section.items.map((item) => ({
          id: item.id,
          label: item.label,
          href: item.href,
          keywords: [section.label, item.iconName],
        })),
      ),
    [navigation],
  );

  return (
    <ResponsivePortalShell
      navigation={navigation}
      initialSidebarCollapsed={initialSidebarCollapsed}
      userMenu={userMenu}
      notifications={notifications}
    >
      {children}
      <CommandPalette navigation={navCommands} data-testid="portal-command-palette" />
    </ResponsivePortalShell>
  );
}
