"use client";

import * as React from "react";
import { Check, Clock, Sparkles } from "lucide-react";
import { useTranslations } from "next-intl";

import { formatMoney } from "@/lib/money";
import { cn } from "@/lib/utils";
import type { TierWithPerks } from "@/features/booking/types/wizard";

/**
 * ExperienceTierSelector — keyboard-navigable card grid of tiers.
 *
 * Each card surfaces:
 *   - tier name + duration
 *   - per-person breakdown (adult, child)
 *   - the *computed* total for the current guest count, so the user can
 *     compare tiers at a glance without doing arithmetic in their head
 *   - perks list
 *
 * Pure controlled sink — caller owns `selectedId`, `onSelect`, and the
 * `adultCount` / `childCount` that drive the totals.
 */

export type ExperienceTierSelectorProps = Readonly<{
  tiers: readonly TierWithPerks[];
  selectedId: string | null;
  onSelect: (tierId: string) => void;
  adultCount: number;
  childCount: number;
  currency?: string;
  className?: string;
  "data-testid"?: string;
}>;

export function ExperienceTierSelector({
  tiers,
  selectedId,
  onSelect,
  adultCount,
  childCount,
  currency = "MYR",
  className,
  "data-testid": testId,
}: ExperienceTierSelectorProps) {
  const t = useTranslations("guest.book.plan");

  return (
    <div
      role="radiogroup"
      aria-label={t("ariaChooseTier")}
      data-testid={testId ?? "experience-tier-selector"}
      className={cn("grid gap-3 sm:grid-cols-2 lg:grid-cols-3", className)}
    >
      {tiers.map((tier) => {
        const selected = selectedId === tier.id;
        const total = tier.adult_price * adultCount + tier.child_price * childCount;
        return (
          <button
            key={tier.id}
            type="button"
            role="radio"
            aria-checked={selected}
            data-state={selected ? "checked" : "unchecked"}
            data-testid={`tier-card-${tier.name.toLowerCase().replace(/\s+/g, "-")}`}
            onClick={() => onSelect(tier.id)}
            className={cn(
              "group relative flex flex-col gap-3 rounded-xl border p-4 text-left",
              "transition-[border-color,box-shadow,background-color] outline-none",
              "duration-[var(--duration-small)] [transition-timing-function:var(--ease-spring)]",
              "focus-visible:ring-ring focus-visible:ring-2 focus-visible:ring-offset-2",
              "focus-visible:ring-offset-background",
              selected
                ? "border-brand-primary bg-brand-primary/5 dark:bg-brand-primary/10 shadow-[0_0_0_1px_var(--brand-primary)]"
                : "border-border-subtle bg-card hover:border-border hover:bg-surface",
            )}
          >
            {selected ? (
              <span
                aria-hidden
                className="bg-brand-primary text-brand-primary-foreground absolute top-3 right-3 inline-flex size-6 items-center justify-center rounded-full shadow-sm"
              >
                <Check className="size-3.5" />
              </span>
            ) : null}
            <header className="flex flex-col gap-1 pr-8">
              <h3 className="text-foreground text-base font-semibold tracking-tight">
                {tier.name}
              </h3>
              <p className="text-foreground-muted flex items-center gap-1.5 text-xs">
                <Clock aria-hidden className="size-3.5" />
                {t("durationMin", { minutes: tier.duration_minutes })}
              </p>
            </header>

            <div className="border-border-subtle flex items-baseline justify-between gap-2 border-t pt-3">
              <span className="text-foreground-muted text-xs">
                {t("totalForGuests", { count: adultCount + childCount })}
              </span>
              <span className="text-foreground text-lg font-semibold tabular-nums">
                {formatMoney(total, currency, 0)}
              </span>
            </div>
            <p className="text-foreground-subtle -mt-2 text-[11px] leading-snug">
              {formatMoney(tier.adult_price, currency)}/{t("perAdult")}
              {tier.child_price > 0
                ? ` · ${formatMoney(tier.child_price, currency)}/${t("perChild")}`
                : null}
            </p>

            {tier.perks.length > 0 ? (
              <ul className="border-border-subtle flex flex-col gap-1 border-t pt-3 text-xs">
                {tier.perks.map((perk) => (
                  <li key={perk} className="text-foreground-muted flex items-start gap-1.5">
                    <Sparkles
                      aria-hidden
                      className="text-brand-primary size-3.5 shrink-0 translate-y-0.5"
                    />
                    <span className="leading-snug">{perk}</span>
                  </li>
                ))}
              </ul>
            ) : null}
          </button>
        );
      })}
    </div>
  );
}
