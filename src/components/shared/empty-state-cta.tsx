import * as React from "react";
import Link from "next/link";
import type { Route } from "next";

import { Button } from "@/components/ui/button";
import { EmptyState, type EmptyStateProps } from "@/components/ui/empty-state";

/**
 * EmptyStateCta — `<EmptyState>` with a strongly-typed primary CTA slot.
 *
 * Thin wrapper that enforces the "first-use empty state + typed-route
 * CTA" shape ("No devices registered. [Register Device →]"). Keeps
 * feature pages from wiring the same `<Button asChild><Link href=…>`
 * chrome on every empty-state surface.
 *
 * Two CTA modes:
 *   - href:   renders a typed-route `<Link>`.
 *   - onClick: renders a `<Button>` that fires a callback (open a sheet,
 *             trigger a mutation).
 *
 * For the filtered-out state, prefer `<EmptyState variant="filtered-out">`
 * directly — this wrapper is tuned for the first-use case where a single
 * primary CTA is the right affordance.
 */

type EmptyStateCtaBase = Omit<EmptyStateProps, "action" | "secondaryAction" | "variant" | "icon"> &
  Readonly<{
    icon?: React.ReactNode;
    /** Optional secondary action (rendered right of the primary). */
    secondaryAction?: React.ReactNode;
    /** Variant defaults to first-use — override to `filtered-out` / `error`. */
    variant?: EmptyStateProps["variant"];
  }>;

type WithHref = EmptyStateCtaBase &
  Readonly<{
    ctaLabel: string;
    href: Route;
    onClick?: undefined;
  }>;

type WithClick = EmptyStateCtaBase &
  Readonly<{
    ctaLabel: string;
    onClick: () => void;
    href?: undefined;
  }>;

type NoCta = EmptyStateCtaBase &
  Readonly<{ ctaLabel?: undefined; href?: undefined; onClick?: undefined }>;

export type EmptyStateCtaProps = WithHref | WithClick | NoCta;

export function EmptyStateCta(props: EmptyStateCtaProps) {
  const { ctaLabel, href, onClick, secondaryAction, ...rest } = props;

  const action =
    ctaLabel && href ? (
      <Button
        asChild
        variant="default"
        size="sm"
        data-testid={props["data-testid"] ? `${props["data-testid"]}-cta` : undefined}
      >
        <Link href={href}>{ctaLabel}</Link>
      </Button>
    ) : ctaLabel && onClick ? (
      <Button
        type="button"
        variant="default"
        size="sm"
        onClick={onClick}
        data-testid={props["data-testid"] ? `${props["data-testid"]}-cta` : undefined}
      >
        {ctaLabel}
      </Button>
    ) : undefined;

  return (
    <EmptyState
      {...rest}
      {...(action !== undefined ? { action } : {})}
      {...(secondaryAction !== undefined ? { secondaryAction } : {})}
    />
  );
}
