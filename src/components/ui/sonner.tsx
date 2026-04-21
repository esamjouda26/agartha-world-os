"use client";

import { CircleCheck, Info, LoaderCircle, OctagonX, TriangleAlert } from "lucide-react";
import { Toaster as Sonner, type ToasterProps } from "sonner";

import { useTheme } from "@/components/shared/theme-provider";

const Toaster = ({ ...props }: ToasterProps) => {
  const { resolvedTheme } = useTheme();

  return (
    <Sonner
      theme={resolvedTheme}
      className="toaster group"
      richColors
      icons={{
        success: <CircleCheck className="size-4" />,
        info: <Info className="size-4" />,
        warning: <TriangleAlert className="size-4" />,
        error: <OctagonX className="size-4" />,
        loading: <LoaderCircle className="size-4 animate-spin" />,
      }}
      style={
        {
          // Default (untyped — used by toast.message / toast.custom / "queued")
          "--normal-bg": "var(--popover)",
          "--normal-text": "var(--popover-foreground)",
          "--normal-border": "var(--border)",

          // Per-severity chrome bound to our status token system (prompt §A.2,
          // frontend_spec §12s). Soft bg + status-foreground text + status-border
          // — already proven AA via scripts/check-contrast.ts in both themes.
          "--success-bg": "var(--status-success-soft)",
          "--success-text": "var(--status-success-foreground)",
          "--success-border": "var(--status-success-border)",

          "--error-bg": "var(--status-danger-soft)",
          "--error-text": "var(--status-danger-foreground)",
          "--error-border": "var(--status-danger-border)",

          "--warning-bg": "var(--status-warning-soft)",
          "--warning-text": "var(--status-warning-foreground)",
          "--warning-border": "var(--status-warning-border)",

          "--info-bg": "var(--status-info-soft)",
          "--info-text": "var(--status-info-foreground)",
          "--info-border": "var(--status-info-border)",

          "--border-radius": "var(--radius)",
        } as React.CSSProperties
      }
      {...props}
    />
  );
};

export { Toaster };
