import * as React from "react";
import { cva, type VariantProps } from "class-variance-authority";

import { cn } from "@/lib/utils";

const alertVariants = cva(
  "relative grid w-full grid-cols-[0_1fr] items-start gap-y-0.5 rounded-xl border px-4 py-3 text-sm has-[>svg]:grid-cols-[calc(var(--spacing)*4)_1fr] has-[>svg]:gap-x-3 [&>svg]:size-4 [&>svg]:translate-y-0.5 [&>svg]:text-current",
  {
    variants: {
      variant: {
        // Neutral alert — soft surface + hairline border, subtle shadow.
        default: "bg-card text-card-foreground border-border shadow-xs",
        // All tonal variants follow the same recipe: status-soft bg +
        // status-foreground text + status-border ring. Matches StatusBadge
        // tone semantics so alert + badge read as one system.
        destructive:
          "bg-status-danger-soft border-status-danger-border text-status-danger-foreground *:data-[slot=alert-description]:text-status-danger-foreground/85",
        success:
          "bg-status-success-soft border-status-success-border text-status-success-foreground *:data-[slot=alert-description]:text-status-success-foreground/85",
        warning:
          "bg-status-warning-soft border-status-warning-border text-status-warning-foreground *:data-[slot=alert-description]:text-status-warning-foreground/85",
        info: "bg-status-info-soft border-status-info-border text-status-info-foreground *:data-[slot=alert-description]:text-status-info-foreground/85",
      },
    },
    defaultVariants: {
      variant: "default",
    },
  },
);

function Alert({
  className,
  variant,
  ...props
}: React.ComponentProps<"div"> & VariantProps<typeof alertVariants>) {
  return (
    <div
      data-slot="alert"
      role="alert"
      className={cn(alertVariants({ variant }), className)}
      {...props}
    />
  );
}

function AlertTitle({ className, ...props }: React.ComponentProps<"div">) {
  return (
    <div
      data-slot="alert-title"
      className={cn("col-start-2 line-clamp-1 min-h-4 font-medium tracking-tight", className)}
      {...props}
    />
  );
}

function AlertDescription({ className, ...props }: React.ComponentProps<"div">) {
  return (
    <div
      data-slot="alert-description"
      className={cn(
        "text-muted-foreground col-start-2 grid justify-items-start gap-1 text-sm [&_p]:leading-relaxed",
        className,
      )}
      {...props}
    />
  );
}

export { Alert, AlertTitle, AlertDescription };
