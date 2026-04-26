import * as React from "react";

import { cn } from "@/lib/utils";
import { Card, CardContent, type CardProps } from "@/components/ui/card";

/**
 * SectionCard — settings-style card with a title/description header slot.
 *
 * Collapses the `<Card> + <CardHeader> + <CardTitle> + <CardDescription>
 * + <CardContent>` five-line boilerplate that repeats on every settings
 * section, admin sub-page, and dashboard panel. Composes `<Card>` so all
 * variants (`hairline | borderless | elevated | glass`) flow through.
 *
 * Heading level defaults to `h2` to match page-level document structure
 * under a `<PageHeader>` `h1`. Pass `headingLevel={3}` for nested usage.
 */

type SectionCardOwnProps = Readonly<{
  /** Required when headless is false (default). Ignored when headless. */
  title?: React.ReactNode;
  description?: React.ReactNode;
  /** Right-aligned slot next to the title (button, link, toggle). */
  action?: React.ReactNode;
  /** Optional footer region below `children`. */
  footer?: React.ReactNode;
  /** Remove the header entirely — equivalent to a raw `<Card>`. */
  headless?: boolean;
  headingLevel?: 2 | 3 | 4;
  contentClassName?: string;
  "data-testid"?: string;
}>;

export type SectionCardProps = SectionCardOwnProps &
  Pick<CardProps, "variant" | "gradientOverlay" | "className">;

export function SectionCard({
  title,
  description,
  action,
  footer,
  headless = false,
  headingLevel = 2,
  variant,
  gradientOverlay,
  className,
  contentClassName,
  "data-testid": testId,
  children,
  ...rest
}: SectionCardProps & { children?: React.ReactNode }) {
  const Heading = `h${headingLevel}` as "h2" | "h3" | "h4";
  return (
    <Card
      data-slot="section-card"
      data-testid={testId}
      variant={variant ?? "hairline"}
      {...(gradientOverlay !== undefined ? { gradientOverlay } : {})}
      className={cn("gap-0 py-0", className)}
      {...rest}
    >
      {!headless ? (
        <header
          data-slot="section-card-header"
          className="border-border-subtle flex flex-col gap-1 border-b px-6 py-4 sm:flex-row sm:items-start sm:justify-between sm:gap-4"
        >
          <div className="flex flex-col gap-1">
            <Heading className="text-foreground text-base leading-none font-semibold tracking-tight">
              {title}
            </Heading>
            {description ? (
              <p className="text-foreground-muted text-sm leading-relaxed">{description}</p>
            ) : null}
          </div>
          {action ? <div className="flex shrink-0 items-center gap-2">{action}</div> : null}
        </header>
      ) : null}
      {children !== undefined ? (
        <CardContent className={cn("py-4", contentClassName)}>{children}</CardContent>
      ) : null}
      {footer ? (
        <footer
          data-slot="section-card-footer"
          className="border-border-subtle flex items-center gap-2 border-t px-6 py-3"
        >
          {footer}
        </footer>
      ) : null}
    </Card>
  );
}
