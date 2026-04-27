"use client";

import Image from "next/image";

import { cn } from "@/lib/utils";

import type { ShellUserInfo } from "@/lib/auth/get-shell-user-info";

// ── Helpers ────────────────────────────────────────────────────────────

function initials(name: string): string {
  const parts = name.split(/\s+/).filter(Boolean);
  const first = parts[0] ?? "";
  const last = parts[parts.length - 1] ?? first;
  if (!first) return "?";
  if (parts.length === 1) return first.charAt(0).toUpperCase();
  return (first.charAt(0) + last.charAt(0)).toUpperCase();
}

// ── Component ──────────────────────────────────────────────────────────

type ShellUserCardProps = Readonly<{
  userInfo: ShellUserInfo;
  collapsed: boolean;
}>;

/**
 * Sidebar footer identity card — desktop-only (the sidebar itself is
 * `hidden md:flex` in `<ResponsivePortalShell>`).
 *
 * Purely informational: avatar + name + role/org + employee ID. Action
 * affordances (Settings, Sign Out) live on the topbar avatar menu so the
 * sidebar footer stays calm and doesn't duplicate the menu surface.
 *
 * Two states:
 * - **Expanded** (`collapsed=false`): 40-px avatar + presence dot, name,
 *   role · org subtitle, employee ID.
 * - **Collapsed** (`collapsed=true`): 32-px avatar + presence dot, native
 *   `title` tooltip exposes the full identity context.
 */
export function ShellUserCard({ userInfo, collapsed }: ShellUserCardProps) {
  const { displayName, avatarUrl, roleName, orgUnitName, employeeId } = userInfo;
  const ini = initials(displayName);

  const subtitle = [roleName, orgUnitName].filter(Boolean).join(" · ");
  const tooltipText = [displayName, subtitle].filter(Boolean).join("\n");
  const avatarSize = collapsed ? 32 : 40;

  return (
    <div
      data-slot="shell-user-card"
      data-testid="shell-user-card"
      title={collapsed ? tooltipText : undefined}
      className={cn(
        "border-border-subtle from-surface to-surface/50 flex items-center gap-3 border-t bg-gradient-to-b px-3 py-3",
        collapsed ? "justify-center" : "",
      )}
    >
      {/* Avatar with presence dot. `relative` carries the dot anchor.
          `next/image` per CLAUDE.md §3 (raw <img> is forbidden). */}
      <div className="relative shrink-0">
        {avatarUrl ? (
          <Image
            src={avatarUrl}
            alt=""
            width={avatarSize}
            height={avatarSize}
            unoptimized
            className="rounded-full object-cover"
            style={{ width: avatarSize, height: avatarSize }}
          />
        ) : (
          <span
            aria-hidden
            className="bg-brand-primary/15 text-brand-primary flex items-center justify-center rounded-full text-sm font-semibold"
            style={{ width: avatarSize, height: avatarSize }}
          >
            {ini}
          </span>
        )}
        {/* Presence dot — purely decorative "active session" affordance
            so the card reads as alive, not just a static label. */}
        <span
          aria-hidden
          className="border-surface bg-status-success-solid absolute right-0 bottom-0 size-2.5 rounded-full border-2"
        />
      </div>

      {/* Identity text — hidden when collapsed */}
      {!collapsed ? (
        <div className="flex min-w-0 flex-1 flex-col gap-0.5">
          <span className="text-foreground truncate text-sm leading-tight font-semibold">
            {displayName}
          </span>
          {subtitle ? (
            <span className="text-foreground-muted truncate text-[11px] leading-tight">
              {subtitle}
            </span>
          ) : null}
          {employeeId ? (
            <span className="text-foreground-subtle font-mono text-[10px] leading-tight">
              {employeeId}
            </span>
          ) : null}
        </div>
      ) : null}
    </div>
  );
}
