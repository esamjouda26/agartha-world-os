import * as React from "react";
import Link from "next/link";
import type { Route } from "next";
import { ArrowLeft, SearchX } from "lucide-react";

import { Button } from "@/components/ui/button";
import { EmptyState } from "@/components/ui/empty-state";

/**
 * DetailNotFound — canonical `[id]/not-found.tsx` body.
 *
 * Distinguishes between:
 *   - "This resource does not exist" (404, usually user-typed URL).
 *   - "This resource exists but RLS / scope filters exclude it"
 *     (also surfaces as not-found because server can't confirm existence).
 *
 * Renders `<EmptyState variant="filtered-out">` with a back-link to the
 * listing page. For actual error states (500, RPC failure, network), use
 * `<ErrorState>` instead.
 *
 * Placement: lives in `shared/` so every `[id]/not-found.tsx` across
 * every portal can render identical chrome without rebuilding copy.
 */

export type DetailNotFoundProps = Readonly<{
  /** Singular noun for the resource (e.g. "staff member", "booking"). */
  resourceNoun: string;
  /** Optional id the user was looking for — included in description. */
  id?: string;
  /** Href to the listing page. */
  listingHref: Route;
  /** Label for the back button. Defaults to "Back to {resourceNoun}s". */
  backLabel?: string;
  /** Override the title. */
  title?: string;
  /** Override the description. */
  description?: React.ReactNode;
  className?: string;
  "data-testid"?: string;
}>;

export function DetailNotFound({
  resourceNoun,
  id,
  listingHref,
  backLabel,
  title,
  description,
  className,
  "data-testid": testId,
}: DetailNotFoundProps) {
  const resolvedTitle: string = title ?? `${capitalize(resourceNoun)} not found`;
  const resolvedDescription =
    description ??
    (id ? (
      <>
        We couldn&apos;t find {indefiniteArticle(resourceNoun)} {resourceNoun} with id{" "}
        <code className="font-mono text-[0.8em]">{id}</code>. It may have been deleted or you may
        not have access.
      </>
    ) : (
      <>
        We couldn&apos;t find the {resourceNoun} you&apos;re looking for. It may have been deleted
        or you may not have access.
      </>
    ));
  const resolvedBackLabel = backLabel ?? `Back to ${resourceNoun}s`;

  return (
    <EmptyState
      variant="filtered-out"
      icon={<SearchX className="size-8" />}
      title={resolvedTitle}
      description={resolvedDescription}
      action={
        <Button asChild variant="default" size="sm">
          <Link href={listingHref}>
            <ArrowLeft aria-hidden className="size-4" />
            {resolvedBackLabel}
          </Link>
        </Button>
      }
      data-testid={testId ?? "detail-not-found"}
      className={className}
    />
  );
}

function capitalize(s: string): string {
  if (s.length === 0) return s;
  return s[0]!.toUpperCase() + s.slice(1);
}

function indefiniteArticle(s: string): "a" | "an" {
  if (s.length === 0) return "a";
  return /^[aeiou]/i.test(s) ? "an" : "a";
}
