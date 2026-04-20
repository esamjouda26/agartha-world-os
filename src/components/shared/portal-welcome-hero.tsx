import { ArrowUpRight, type LucideIcon } from "lucide-react";

import { Link } from "@/i18n/navigation";
import { StatusBadge } from "@/components/ui/status-badge";

export type PortalWelcomeQuickAction = Readonly<{
  href: string;
  label: string;
  description: string;
  Icon: LucideIcon;
}>;

export type PortalWelcomeHeroProps = Readonly<{
  /** Small-caps eyebrow label above the greeting. */
  eyebrow: string;
  /** Name token used in the "Hi, {name}." greeting. */
  name: string;
  /** Optional deeper subline rendered under the greeting. */
  description?: string;
  /** Tone-labelled glass badge rendered next to the greeting. */
  statusLabel?: string;
  /** Three-column quick-action grid. Empty / omit to hide. */
  quickActions?: ReadonlyArray<PortalWelcomeQuickAction>;
  "data-testid"?: string;
}>;

/**
 * Shared welcome hero for the two admin-portal landing pages
 * (`/admin/it`, `/admin/business`). Hero card carries a warm-gold
 * gradient wash + dark-mode glow halo; a three-tile quick-action
 * grid sits below for common navigation targets. Desktop-first by
 * content density (admin portals); collapses cleanly at < md.
 */
export function PortalWelcomeHero({
  eyebrow,
  name,
  description,
  statusLabel,
  quickActions,
  "data-testid": testId,
}: PortalWelcomeHeroProps) {
  return (
    <div className="flex flex-col gap-6" data-testid={testId}>
      <section
        className="border-border dark:shadow-glow-brand/40 bg-card relative isolate overflow-hidden rounded-2xl border shadow-sm"
        aria-label="Welcome"
      >
        {/* Warm-gold aurora wash — same recipe as the auth shell so the
            transition from login → portal feels continuous. */}
        <div
          aria-hidden
          className="from-brand-primary/10 via-brand-primary/[0.04] pointer-events-none absolute inset-x-0 top-0 h-48 bg-gradient-to-b to-transparent"
        />
        <div
          aria-hidden
          className="bg-brand-primary/10 dark:bg-brand-primary/20 pointer-events-none absolute -top-24 -right-24 h-64 w-64 rounded-full blur-3xl"
        />

        <div className="relative flex flex-col gap-3 p-6 sm:p-8">
          <div className="flex flex-wrap items-center gap-3">
            <p className="text-brand-primary text-[11px] font-medium tracking-wider uppercase">
              {eyebrow}
            </p>
            {statusLabel ? (
              <StatusBadge status="active" tone="success" variant="glass" label={statusLabel} />
            ) : null}
          </div>
          <h1 className="text-foreground text-3xl font-semibold tracking-tighter sm:text-4xl">
            {`Welcome back, ${firstName(name)}.`}
          </h1>
          {description ? (
            <p className="text-foreground-muted max-w-prose text-sm leading-relaxed sm:text-base">
              {description}
            </p>
          ) : null}
        </div>
      </section>

      {quickActions && quickActions.length > 0 ? (
        <section aria-label="Quick actions" className="grid gap-3 sm:grid-cols-3">
          {quickActions.map(({ href, label, description, Icon }) => (
            <Link
              key={href}
              href={href as never}
              className="group bg-card border-border hover:border-brand-primary/30 focus-visible:outline-ring relative flex flex-col gap-3 rounded-xl border p-5 shadow-xs transition-[transform,box-shadow,border-color] duration-[var(--duration-layout)] [transition-timing-function:var(--ease-standard)] hover:-translate-y-0.5 hover:shadow-md focus-visible:outline-2 focus-visible:outline-offset-2"
            >
              <div className="flex items-center justify-between">
                <div className="bg-brand-primary/10 text-brand-primary group-hover:bg-brand-primary/15 flex size-9 items-center justify-center rounded-lg transition-colors">
                  <Icon className="size-[18px]" strokeWidth={2} aria-hidden />
                </div>
                <ArrowUpRight
                  aria-hidden
                  className="text-foreground-subtle group-hover:text-brand-primary size-4 transition-[color,transform] group-hover:translate-x-0.5 group-hover:-translate-y-0.5"
                />
              </div>
              <div className="space-y-1">
                <p className="text-foreground text-sm font-semibold tracking-tight">{label}</p>
                <p className="text-foreground-muted text-xs leading-relaxed">{description}</p>
              </div>
            </Link>
          ))}
        </section>
      ) : null}
    </div>
  );
}

/** First-token extraction — mirrors the attendance header helper so
 *  both portal surfaces greet with a consistent one-name pattern. */
function firstName(full: string): string {
  const token = full.trim().split(/[\s·|-]+/)[0];
  return token || full;
}
