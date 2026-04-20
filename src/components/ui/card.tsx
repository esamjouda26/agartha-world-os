import * as React from "react";
import { cva, type VariantProps } from "class-variance-authority";

import { cn } from "@/lib/utils";

/**
 * Card — base container primitive for every surfaced tile in the app.
 *
 * Variants (R-Design-2):
 *   - `hairline`   — default. 1px border, soft shadow. Feels framed.
 *   - `borderless` — no border, stronger shadow. Floats over surface.
 *   - `elevated`   — larger radius, deep shadow. Modal / spotlight tier.
 *   - `glass`      — frosted backdrop-blur panel. Reserve for hero
 *                    surfaces — GPU-expensive.
 *
 * Sub-components (CardHeader / CardTitle / CardDescription / CardAction /
 * CardContent / CardFooter) keep the shadcn slot API so existing callers
 * are unaffected.
 */

const cardVariants = cva("flex flex-col gap-6 py-6 text-card-foreground", {
  variants: {
    variant: {
      hairline: "bg-card rounded-xl border border-border shadow-xs",
      borderless: "bg-card rounded-xl shadow-sm",
      elevated: "bg-card rounded-2xl shadow-lg",
      glass:
        "bg-[color:var(--frost-bg-md)] [backdrop-filter:var(--frost-blur-md)] rounded-2xl border border-border shadow-md",
    },
  },
  defaultVariants: { variant: "hairline" },
});

export type CardProps = React.ComponentProps<"div"> &
  VariantProps<typeof cardVariants> & {
    /**
     * Optional decorative slot rendered behind the card's content. Useful
     * for hero surfaces that want a gradient wash or radial glow without
     * the caller having to manage `relative isolate overflow-hidden` on
     * the card container themselves. The slot MUST be `aria-hidden`
     * (decorative) and should use `pointer-events-none` so it doesn't
     * capture clicks.
     */
    gradientOverlay?: React.ReactNode;
  };

function Card({ className, variant, gradientOverlay, children, ...props }: CardProps) {
  // When a gradient overlay is provided, wrap children in a relative
  // positioning context and render the overlay behind them.
  if (gradientOverlay) {
    return (
      <div
        data-slot="card"
        data-variant={variant ?? "hairline"}
        className={cn(cardVariants({ variant }), "relative isolate overflow-hidden", className)}
        {...props}
      >
        {gradientOverlay}
        <div className="relative z-10 flex flex-col gap-6">{children}</div>
      </div>
    );
  }

  return (
    <div
      data-slot="card"
      data-variant={variant ?? "hairline"}
      className={cn(cardVariants({ variant }), className)}
      {...props}
    >
      {children}
    </div>
  );
}

function CardHeader({ className, ...props }: React.ComponentProps<"div">) {
  return (
    <div
      data-slot="card-header"
      className={cn(
        "@container/card-header grid auto-rows-min grid-rows-[auto_auto] items-start gap-2 px-6 has-data-[slot=card-action]:grid-cols-[1fr_auto] [.border-b]:pb-6",
        className,
      )}
      {...props}
    />
  );
}

function CardTitle({ className, ...props }: React.ComponentProps<"div">) {
  return (
    <div
      data-slot="card-title"
      className={cn("leading-none font-semibold tracking-tight", className)}
      {...props}
    />
  );
}

function CardDescription({ className, ...props }: React.ComponentProps<"div">) {
  return (
    <div
      data-slot="card-description"
      className={cn("text-muted-foreground text-sm", className)}
      {...props}
    />
  );
}

function CardAction({ className, ...props }: React.ComponentProps<"div">) {
  return (
    <div
      data-slot="card-action"
      className={cn("col-start-2 row-span-2 row-start-1 self-start justify-self-end", className)}
      {...props}
    />
  );
}

function CardContent({ className, ...props }: React.ComponentProps<"div">) {
  return <div data-slot="card-content" className={cn("px-6", className)} {...props} />;
}

function CardFooter({ className, ...props }: React.ComponentProps<"div">) {
  return (
    <div
      data-slot="card-footer"
      className={cn("flex items-center px-6 [.border-t]:pt-6", className)}
      {...props}
    />
  );
}

export {
  Card,
  CardHeader,
  CardFooter,
  CardTitle,
  CardAction,
  CardDescription,
  CardContent,
  cardVariants,
};
