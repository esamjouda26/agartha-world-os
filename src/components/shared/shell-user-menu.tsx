"use client";

import * as React from "react";
import Image from "next/image";
import { Settings, Hash, Copy, Check, LogOut } from "lucide-react";

import { useRouter, Link } from "@/i18n/navigation";
import { Button } from "@/components/ui/button";
import { toastError } from "@/components/ui/toast-helpers";
import { logoutAction } from "@/features/auth/actions/logout";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";

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

// ── Avatar ─────────────────────────────────────────────────────────────

function UserAvatar({ userInfo, size = 32 }: Readonly<{ userInfo: ShellUserInfo; size?: number }>) {
  const ini = initials(userInfo.displayName);
  const px = `${size}px`;

  if (userInfo.avatarUrl) {
    // `next/image` per CLAUDE.md §3 (raw <img> is forbidden). Decorative
    // role: alt="" so it's a presentational decoration paired with the
    // adjacent display name. Supabase Storage `avatars` bucket; hostname
    // must be allow-listed in `next.config.ts` `images.remotePatterns`.
    return (
      <Image
        src={userInfo.avatarUrl}
        alt=""
        width={size}
        height={size}
        unoptimized
        className="shrink-0 rounded-full object-cover"
        style={{ width: px, height: px }}
      />
    );
  }

  return (
    <span
      aria-hidden
      className="bg-brand-primary/15 text-brand-primary flex shrink-0 items-center justify-center rounded-full font-semibold"
      style={{ width: px, height: px, fontSize: `${Math.round(size * 0.38)}px` }}
    >
      {ini}
    </span>
  );
}

// ── Copy Employee ID hook ──────────────────────────────────────────────

function useCopyEmployeeId(employeeId: string | null) {
  const [copied, setCopied] = React.useState(false);

  const copy = React.useCallback(() => {
    if (!employeeId) return;
    void navigator.clipboard.writeText(employeeId);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }, [employeeId]);

  return { copied, copy };
}

// ── Sign-out hook ──────────────────────────────────────────────────────

/**
 * Wraps the logout Server Action with a `useTransition` pending state and
 * a hard-redirect to `/auth/login` on success. We use `router.replace` so
 * the back button doesn't return the user to a stale authenticated route
 * after they've signed out.
 */
function useSignOut() {
  const router = useRouter();
  const [isPending, startTransition] = React.useTransition();

  const signOut = React.useCallback(() => {
    startTransition(async () => {
      const result = await logoutAction();
      if (result.success) {
        router.replace("/auth/login");
      } else {
        toastError(result);
      }
    });
  }, [router]);

  return { signOut, isPending };
}

// ── Props ──────────────────────────────────────────────────────────────

type ShellUserMenuProps = Readonly<{
  userInfo: ShellUserInfo;
  /** Portal-specific settings path, e.g. "/admin/settings" */
  settingsPath: string;
}>;

// ── Component ──────────────────────────────────────────────────────────

/**
 * Topbar user menu — responsive:
 *   - Desktop (≥ md): `DropdownMenu` triggered by avatar
 *   - Mobile (< md): bottom `Sheet` triggered by avatar
 *
 * Both are rendered in the DOM; visibility toggled via `hidden md:block` /
 * `md:hidden` — matches the responsive pattern used elsewhere in the shell.
 */
export function ShellUserMenu({ userInfo, settingsPath }: ShellUserMenuProps) {
  const subtitle = [userInfo.roleName, userInfo.orgUnitName].filter(Boolean).join(" · ");

  return (
    <>
      {/* Desktop: DropdownMenu */}
      <div className="hidden md:block">
        <DesktopUserMenu userInfo={userInfo} subtitle={subtitle} settingsPath={settingsPath} />
      </div>

      {/* Mobile: Sheet */}
      <div className="md:hidden">
        <MobileUserMenu userInfo={userInfo} subtitle={subtitle} settingsPath={settingsPath} />
      </div>
    </>
  );
}

// ── Desktop ────────────────────────────────────────────────────────────

function DesktopUserMenu({
  userInfo,
  subtitle,
  settingsPath,
}: Readonly<{
  userInfo: ShellUserInfo;
  subtitle: string;
  settingsPath: string;
}>) {
  const { copied, copy } = useCopyEmployeeId(userInfo.employeeId);
  const { signOut, isPending: isSigningOut } = useSignOut();

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button
          variant="ghost"
          size="icon-sm"
          className="ring-border-subtle hover:ring-border rounded-full ring-2 ring-offset-1 ring-offset-transparent transition-shadow"
          aria-label="User menu"
          data-testid="shell-user-menu-trigger"
        >
          <UserAvatar userInfo={userInfo} size={28} />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-64" data-testid="shell-user-menu">
        {/* Identity header — richer than the topbar so the menu earns its
            keep. Avatar + name + role · org so the user gets a full
            identity confirmation when they reach for the menu. */}
        <DropdownMenuLabel className="flex items-center gap-3 px-2 py-2 font-normal">
          <UserAvatar userInfo={userInfo} size={36} />
          <div className="flex min-w-0 flex-col gap-0.5">
            <span className="text-foreground truncate text-sm leading-tight font-semibold">
              {userInfo.displayName}
            </span>
            {subtitle ? (
              <span className="text-foreground-muted truncate text-[11px] leading-tight">
                {subtitle}
              </span>
            ) : null}
          </div>
        </DropdownMenuLabel>

        {/* Employee ID */}
        {userInfo.employeeId ? (
          <>
            <DropdownMenuSeparator />
            <DropdownMenuItem onClick={copy} data-testid="shell-user-menu-copy-id">
              <Hash aria-hidden className="size-4" />
              <span className="flex-1 font-mono text-xs">{userInfo.employeeId}</span>
              {copied ? (
                <Check aria-hidden className="text-status-success-foreground size-3.5" />
              ) : (
                <Copy aria-hidden className="text-foreground-muted size-3.5" />
              )}
            </DropdownMenuItem>
          </>
        ) : null}

        <DropdownMenuSeparator />

        {/* Settings */}
        <DropdownMenuItem asChild data-testid="shell-user-menu-settings">
          <Link href={settingsPath}>
            <Settings aria-hidden className="size-4" />
            Settings
          </Link>
        </DropdownMenuItem>

        <DropdownMenuSeparator />

        {/* Sign out — destructive intent, danger token. Disabled while the
            Server Action runs to prevent double-fire on flaky networks. */}
        <DropdownMenuItem
          onSelect={(e) => {
            e.preventDefault();
            signOut();
          }}
          disabled={isSigningOut}
          data-testid="shell-user-menu-sign-out"
          className="text-status-danger-foreground focus:text-status-danger-foreground focus:bg-status-danger-soft"
        >
          <LogOut aria-hidden className="size-4" />
          {isSigningOut ? "Signing out…" : "Sign out"}
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

// ── Mobile ─────────────────────────────────────────────────────────────

function MobileUserMenu({
  userInfo,
  subtitle,
  settingsPath,
}: Readonly<{
  userInfo: ShellUserInfo;
  subtitle: string;
  settingsPath: string;
}>) {
  const [open, setOpen] = React.useState(false);
  const { copied, copy } = useCopyEmployeeId(userInfo.employeeId);
  const { signOut, isPending: isSigningOut } = useSignOut();

  return (
    <>
      <Button
        variant="ghost"
        size="icon-sm"
        className="ring-border-subtle hover:ring-border rounded-full ring-2 ring-offset-1 ring-offset-transparent transition-shadow"
        aria-label="User menu"
        data-testid="shell-user-menu-trigger-mobile"
        onClick={() => setOpen(true)}
      >
        <UserAvatar userInfo={userInfo} size={28} />
      </Button>

      <Sheet open={open} onOpenChange={setOpen}>
        <SheetContent side="bottom" className="p-0" data-testid="shell-user-sheet">
          <SheetHeader className="border-border-subtle border-b px-4 py-4">
            <div className="flex items-center gap-3">
              <UserAvatar userInfo={userInfo} size={48} />
              <div className="flex min-w-0 flex-1 flex-col gap-0.5">
                <SheetTitle className="text-left text-base">{userInfo.displayName}</SheetTitle>
                <SheetDescription className="text-left text-xs">
                  {subtitle || "Staff member"}
                </SheetDescription>
              </div>
            </div>
          </SheetHeader>

          <div className="flex flex-col gap-1 p-2">
            {/* Employee ID */}
            {userInfo.employeeId ? (
              <button
                type="button"
                onClick={copy}
                className="text-foreground hover:bg-surface flex min-h-[44px] items-center gap-3 rounded-md px-3 py-2.5 text-sm"
                data-testid="shell-user-sheet-copy-id"
              >
                <Hash aria-hidden className="text-foreground-muted size-4" />
                <span className="flex-1 text-left font-mono text-xs">{userInfo.employeeId}</span>
                {copied ? (
                  <Check aria-hidden className="text-status-success-foreground size-4" />
                ) : (
                  <Copy aria-hidden className="text-foreground-muted size-4" />
                )}
              </button>
            ) : null}

            {/* Settings */}
            <Link
              href={settingsPath}
              onClick={() => setOpen(false)}
              className="text-foreground hover:bg-surface flex min-h-[44px] items-center gap-3 rounded-md px-3 py-2.5 text-sm"
              data-testid="shell-user-sheet-settings"
            >
              <Settings aria-hidden className="text-foreground-muted size-4" />
              Settings
            </Link>

            <div className="border-border-subtle my-1 border-t" aria-hidden />

            {/* Sign out — danger tone, full-width touch target ≥ 44px per
                CLAUDE.md §5 mobile contract. Sheet stays open during the
                async transition so the user sees the pending label. */}
            <button
              type="button"
              onClick={signOut}
              disabled={isSigningOut}
              className="text-status-danger-foreground hover:bg-status-danger-soft flex min-h-[44px] items-center gap-3 rounded-md px-3 py-2.5 text-sm disabled:opacity-60"
              data-testid="shell-user-sheet-sign-out"
            >
              <LogOut aria-hidden className="size-4" />
              {isSigningOut ? "Signing out…" : "Sign out"}
            </button>
          </div>
        </SheetContent>
      </Sheet>
    </>
  );
}
