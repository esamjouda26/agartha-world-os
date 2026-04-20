import * as React from "react";

import { cn } from "@/lib/utils";

/**
 * InputWithIcon — absolute-positioned leading (and optional trailing)
 * icon overlays on top of a child `<Input>`. Keeps the Input primitive
 * icon-agnostic while giving forms a consistent leading-affordance
 * treatment across auth, feature forms, and settings surfaces.
 *
 * Usage:
 *
 *   <InputWithIcon icon={<Mail className="size-4" aria-hidden />}>
 *     <Input
 *       {...field}
 *       type="email"
 *       placeholder="name@company.com"
 *       className="pl-9"   // leave room for the leading icon
 *     />
 *   </InputWithIcon>
 *
 * For trailing actions (password show/hide, clear button, etc.) pass
 * them as a second child / via the `trailing` prop — the wrapper
 * provides the positioning context; the caller controls the pixel
 * placement + padding on the Input child.
 */

export type InputWithIconProps = Readonly<{
  /** Leading icon — typically a lucide 16-20px glyph. `aria-hidden` recommended. */
  icon?: React.ReactNode;
  /** Optional trailing content (eye-toggle, clear button). Rendered as-is. */
  trailing?: React.ReactNode;
  children: React.ReactNode;
  className?: string;
}>;

export function InputWithIcon({ icon, trailing, children, className }: InputWithIconProps) {
  return (
    <div className={cn("relative", className)}>
      {icon ? (
        <span
          aria-hidden
          className="text-foreground-subtle pointer-events-none absolute top-1/2 left-3 -translate-y-1/2"
        >
          {icon}
        </span>
      ) : null}
      {children}
      {trailing ? (
        <span className="absolute top-1/2 right-2 -translate-y-1/2">{trailing}</span>
      ) : null}
    </div>
  );
}
