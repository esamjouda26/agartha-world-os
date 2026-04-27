import type { Metadata } from "next";
import { getTranslations } from "next-intl/server";

import { EmptyState } from "@/components/ui/empty-state";

import { BookingWizardClient } from "@/features/booking/components/booking-wizard-client";
import { getActiveExperienceCatalog } from "@/features/booking/queries/get-experience-catalog";

/**
 * /book — public multi-step booking wizard.
 *
 * RSC entry: fetches the active experience catalog (anon RLS-readable —
 * init_schema.sql:3379, 3391, 3403, 3415) and hands it to the client
 * orchestrator. All wizard state lives in `nuqs` URL params per Session 17
 * prompt §"NOTES" (overrides frontend_spec.md:3415's older "client reducer"
 * line). PII (booker email/phone) stays in component state — never
 * serialized to URL.
 *
 * Spec: frontend_spec.md:3404-3455 + WF-7A (operational_workflows.md:587-705).
 *
 * Note on caching/revalidation: this page reads anon RLS — React.cache()
 * deduplication only (ADR-0006). `dynamic="force-dynamic"` ensures the
 * cookie store is initialized for the eventual CSRF mint on first
 * mutation, and prevents Next.js from over-eagerly caching the rendered
 * shell across guests.
 */

export const dynamic = "force-dynamic";
export const revalidate = 0;

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations("guest.book");
  const title = t("metaTitle");
  const description = t("metaDescription");
  return {
    title,
    description,
    openGraph: { title, description, type: "website" },
    robots: { index: true, follow: true },
  };
}

export default async function BookPage() {
  const catalog = await getActiveExperienceCatalog();
  const t = await getTranslations("guest.book");

  if (!catalog) {
    return (
      <div className="mx-auto flex max-w-2xl flex-col gap-6 px-4 py-12 sm:px-6">
        <EmptyState
          variant="first-use"
          title={t("empty.noExperienceTitle")}
          description={t("empty.noExperienceBody")}
          data-testid="book-no-experience"
        />
      </div>
    );
  }

  if (catalog.tiers.length === 0) {
    return (
      <div className="mx-auto flex max-w-2xl flex-col gap-6 px-4 py-12 sm:px-6">
        <EmptyState
          variant="first-use"
          title={t("empty.noTiersTitle")}
          description={t("empty.noTiersBody")}
          data-testid="book-no-tiers"
        />
      </div>
    );
  }

  return <BookingWizardClient catalog={catalog} />;
}
