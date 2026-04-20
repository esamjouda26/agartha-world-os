import type { LucideIcon } from "lucide-react";

import { StatusBadge, type StatusTone } from "@/components/ui/status-badge";
import { cn } from "@/lib/utils";

/**
 * StatusMessageCard — the canonical "something has happened, here's
 * what it means, here's what to do" screen. Used by the auth
 * status routes (access-revoked, not-started, on-leave), and
 * reusable for any future surface that needs to convey a persistent
 * account or system state in a premium, hospitality-grade way.
 *
 * Structure (centered column):
 *   - Tone-colored icon tile (size-14, rounded-2xl, soft bg + ring)
 *   - Glass StatusBadge with the status label
 *   - Title (h1-tier typography, tracking-tight)
 *   - Description (muted, leading-relaxed)
 *   - Action slot (typically a full-width lg Button)
 *
 * Tone semantics mirror StatusBadge — use `danger` for blocking
 * errors, `warning` for "wait / action required", `info` for
 * expected-but-non-blocking states, `success` for confirmations.
 */

export type StatusMessageTone = "success" | "warning" | "danger" | "info" | "neutral";

export type StatusMessageCardProps = Readonly<{
  icon: LucideIcon;
  tone: StatusMessageTone;
  /** The short glass-badge label (e.g. "Access revoked"). */
  badgeLabel: string;
  /** The title/heading. Rendered as an `<h1>` by default. */
  title: string;
  /** Body copy — one paragraph is plenty. */
  description: string;
  /** Action slot — typically a single full-width `<Button size="lg">`. */
  action?: React.ReactNode;
  /** Heading tier. Defaults to `1`; pass `2` when this sits inside another page's heading hierarchy. */
  headingLevel?: 1 | 2;
  "data-testid"?: string;
  className?: string;
}>;

const TONE_TILE: Record<StatusMessageTone, string> = {
  success: "bg-status-success-soft text-status-success-foreground ring-status-success-border",
  warning: "bg-status-warning-soft text-status-warning-foreground ring-status-warning-border",
  danger: "bg-status-danger-soft text-status-danger-foreground ring-status-danger-border",
  info: "bg-status-info-soft text-status-info-foreground ring-status-info-border",
  neutral: "bg-status-neutral-soft text-status-neutral-foreground ring-status-neutral-border",
};

// Map message tone → StatusBadge tone. Accent is deliberately absent
// from StatusMessageCard's tone set (it's reserved for non-status
// decorative use); status message screens always map to one of the
// five badge tones cleanly.
const TONE_BADGE: Record<StatusMessageTone, StatusTone> = {
  success: "success",
  warning: "warning",
  danger: "danger",
  info: "info",
  neutral: "neutral",
};

export function StatusMessageCard({
  icon: Icon,
  tone,
  badgeLabel,
  title,
  description,
  action,
  headingLevel = 1,
  "data-testid": testId,
  className,
}: StatusMessageCardProps) {
  const Heading = `h${headingLevel}` as "h1" | "h2";
  return (
    <div
      className={cn("flex flex-col items-center gap-5 text-center", className)}
      data-testid={testId}
    >
      <div
        aria-hidden
        className={cn(
          "flex size-14 items-center justify-center rounded-2xl ring-1",
          TONE_TILE[tone],
        )}
      >
        <Icon className="size-7" strokeWidth={2} />
      </div>
      <StatusBadge
        status={badgeLabel.toLowerCase().replace(/\s+/g, "_")}
        tone={TONE_BADGE[tone]}
        variant="glass"
        label={badgeLabel}
      />
      <div className="space-y-2">
        <Heading className="text-foreground text-2xl font-semibold tracking-tight sm:text-[28px]">
          {title}
        </Heading>
        <p className="text-foreground-muted text-sm leading-relaxed">{description}</p>
      </div>
      {action}
    </div>
  );
}
