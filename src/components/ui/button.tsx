import * as React from "react";
import { cva, type VariantProps } from "class-variance-authority";
import { Slot } from "radix-ui";

import { cn } from "@/lib/utils";

const buttonVariants = cva(
  // Tactile press feedback via spring curve — 130ms tactile duration +
  // 0.97 scale collapses to a no-op under prefers-reduced-motion
  // thanks to the global `* { transition-duration: 0.01ms !important }`
  // rule in globals.css base layer.
  "group/button inline-flex shrink-0 items-center justify-center gap-2 rounded-md text-sm font-medium whitespace-nowrap outline-none transition-[background-color,color,box-shadow,transform] duration-[var(--duration-tactile)] [transition-timing-function:var(--ease-spring)] active:scale-[0.97] focus-visible:border-ring focus-visible:ring-[3px] focus-visible:ring-ring/50 disabled:pointer-events-none disabled:opacity-50 aria-invalid:border-destructive aria-invalid:ring-destructive/20 dark:aria-invalid:ring-destructive/40 [&_svg]:pointer-events-none [&_svg]:shrink-0 [&_svg:not([class*='size-'])]:size-4",
  {
    variants: {
      variant: {
        // Primary in dark mode picks up a subtle gold-400 → gold-500
        // vertical gradient (keeps the fill interesting without being
        // garish) AND the warm-gold glow halo. Light mode stays solid so
        // the gold doesn't over-saturate the warm canvas. Hover in both
        // modes darkens via bg-primary/90; in dark the halo intensifies.
        default:
          "bg-primary text-primary-foreground hover:bg-primary/90 dark:bg-gradient-to-b dark:from-[color:var(--gold-400)] dark:to-[color:var(--gold-500)] dark:shadow-glow-brand hover:dark:shadow-[0_0_64px_-8px_rgba(212,165,61,0.55)]",
        destructive:
          "bg-destructive text-white hover:bg-destructive/90 focus-visible:ring-destructive/20 dark:bg-destructive/60 dark:focus-visible:ring-destructive/40",
        outline:
          "border bg-background shadow-xs hover:bg-surface hover:text-foreground dark:border-input dark:bg-input/30 dark:hover:bg-input/50",
        secondary: "bg-secondary text-secondary-foreground hover:bg-secondary/80",
        ghost: "hover:bg-surface hover:text-foreground dark:hover:bg-surface/60",
        link: "text-primary underline-offset-4 hover:underline",
      },
      size: {
        default: "h-9 px-4 py-2 has-[>svg]:px-3",
        xs: "h-6 gap-1 rounded-md px-2 text-xs has-[>svg]:px-1.5 [&_svg:not([class*='size-'])]:size-3",
        sm: "h-8 gap-1.5 rounded-md px-3 has-[>svg]:px-2.5",
        lg: "h-10 rounded-md px-6 has-[>svg]:px-4",
        // `xl` — decisive primary CTA (hero action, landing hero, big
        // "Save changes" form submit). Bigger radius matches premium
        // hero-button conventions; height meets mobile 44px touch target
        // with comfortable padding.
        xl: "h-12 rounded-lg px-7 text-base font-semibold has-[>svg]:px-5 [&_svg:not([class*='size-'])]:size-5",
        icon: "size-9",
        "icon-xs": "size-6 rounded-md [&_svg:not([class*='size-'])]:size-3",
        "icon-sm": "size-8",
        "icon-lg": "size-10",
        "icon-xl": "size-12 rounded-lg",
      },
    },
    defaultVariants: {
      variant: "default",
      size: "default",
    },
  },
);

function Button({
  className,
  variant = "default",
  size = "default",
  asChild = false,
  ...props
}: React.ComponentProps<"button"> &
  VariantProps<typeof buttonVariants> & {
    asChild?: boolean;
  }) {
  const Comp = asChild ? Slot.Root : "button";

  return (
    <Comp
      data-slot="button"
      data-variant={variant}
      data-size={size}
      className={cn(buttonVariants({ variant, size, className }))}
      {...props}
    />
  );
}

export { Button, buttonVariants };
