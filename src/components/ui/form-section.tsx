import * as React from "react";

import { cn } from "@/lib/utils";

/**
 * FormSection — titled group inside a larger form.
 *
 * Groups a coherent set of fields under a heading + description, with
 * optional right-aligned action slot (toggle, reset-section link).
 * Use when a form spans multiple domains ("Personal", "Employment",
 * "Equipment") or when you need visual separation between batches
 * of fields on a settings page.
 *
 * Heading level defaults to `h2` since forms almost always sit under a
 * `<PageHeader>` `h1`. Pass `headingLevel={3}` inside nested contexts.
 */

export type FormSectionProps = Readonly<{
  title: React.ReactNode;
  description?: React.ReactNode;
  /** Right-aligned slot on the section header row. */
  action?: React.ReactNode;
  /** Optional separator above the section (rendered as a top border). */
  divider?: boolean;
  headingLevel?: 2 | 3 | 4;
  className?: string;
  "data-testid"?: string;
  children: React.ReactNode;
}>;

export function FormSection({
  title,
  description,
  action,
  divider = false,
  headingLevel = 2,
  className,
  "data-testid": testId,
  children,
}: FormSectionProps) {
  const Heading = `h${headingLevel}` as "h2" | "h3" | "h4";
  return (
    <section
      data-slot="form-section"
      data-testid={testId}
      className={cn(
        "flex flex-col gap-4",
        divider ? "border-border-subtle border-t pt-6" : null,
        className,
      )}
    >
      <header className="flex flex-col gap-1 sm:flex-row sm:items-start sm:justify-between sm:gap-4">
        <div className="flex flex-col gap-1">
          <Heading className="text-foreground text-base font-semibold tracking-tight">
            {title}
          </Heading>
          {description ? (
            <p className="text-foreground-muted max-w-prose text-sm leading-relaxed">
              {description}
            </p>
          ) : null}
        </div>
        {action ? <div className="flex shrink-0 items-center gap-2">{action}</div> : null}
      </header>
      <div className="flex flex-col gap-4">{children}</div>
    </section>
  );
}
