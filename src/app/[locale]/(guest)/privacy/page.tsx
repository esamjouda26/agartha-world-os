import type { Metadata } from "next";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";

import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";

import {
  BIOMETRIC_POLICY_VERSION,
  BIOMETRIC_RETENTION_POLICY,
  PRIVACY_CONTACT_EMAIL,
} from "@/features/booking/constants";

/**
 * /privacy — placeholder Privacy Policy page.
 *
 * The booking T&C checkbox + biometric consent disclosure both link
 * here, so this route must exist (404s on those links would erode
 * trust at the worst possible moment — booking + consent grant). Until
 * legal-approved policy text lands, this page surfaces:
 *   - the operative biometric policy version + retention summary
 *   - the privacy contact email
 *   - a clear "full policy coming soon" notice
 *
 * Indexable so search engines can find the policy URL referenced in
 * marketing materials.
 */

export const dynamic = "force-static";
export const revalidate = 3600;

export async function generateMetadata(): Promise<Metadata> {
  return {
    title: "Privacy Policy · AgarthaOS",
    description: "How AgarthaOS collects, uses, and retains personal data.",
    robots: { index: true, follow: true },
  };
}

export default function PrivacyPage() {
  return (
    <div className="mx-auto flex w-full max-w-2xl flex-col gap-6 px-4 py-10 sm:px-6 sm:py-14">
      <header className="flex flex-col gap-3">
        <Button asChild variant="ghost" size="sm" className="self-start">
          <Link href={"/" as never}>
            <ArrowLeft aria-hidden className="size-4" />
            Back to home
          </Link>
        </Button>
        <h1 className="text-foreground text-2xl font-semibold tracking-tight md:text-3xl">
          Privacy Policy
        </h1>
        <p className="text-foreground-muted text-sm leading-relaxed">
          Policy version <span className="font-mono">{BIOMETRIC_POLICY_VERSION}</span>
        </p>
      </header>

      <Alert variant="info">
        <AlertTitle>Full policy coming soon</AlertTitle>
        <AlertDescription>
          The complete legal text is being finalised. The summary below covers what we collect and
          how long we keep it. For specific questions email{" "}
          <a
            href={`mailto:${PRIVACY_CONTACT_EMAIL}`}
            className="text-brand-primary underline-offset-2 hover:underline"
          >
            {PRIVACY_CONTACT_EMAIL}
          </a>
          .
        </AlertDescription>
      </Alert>

      <section className="border-border-subtle bg-card flex flex-col gap-4 rounded-xl border p-5 sm:p-6">
        <h2 className="text-foreground text-base font-semibold tracking-tight">What we process</h2>
        <dl className="text-foreground-muted flex flex-col gap-3 text-sm leading-relaxed">
          <div>
            <dt className="text-foreground font-medium">Booker contact</dt>
            <dd>
              Name, email, and phone you give at booking — used to confirm the booking, send entry
              codes, and contact you about your visit. Retained for 7 years for tax / regulatory
              compliance.
            </dd>
          </div>
          <div>
            <dt className="text-foreground font-medium">Face templates (optional)</dt>
            <dd>
              When you opt in to Face Pay, we extract a mathematical template from a photo. The raw
              photo is discarded; only the template is stored. Retention:{" "}
              <span className="font-mono">{BIOMETRIC_RETENTION_POLICY.replaceAll("_", " ")}</span>{" "}
              (24 hours after your visit ends, or immediately on withdrawal).
            </dd>
          </div>
          <div>
            <dt className="text-foreground font-medium">Auto-captured photos (optional)</dt>
            <dd>
              When Auto-capture is on, photos taken at capture points where an enrolled attendee is
              matched are saved to your booking. Retained for 30 days from your visit, then
              automatically deleted unless you've downloaded them.
            </dd>
          </div>
          <div>
            <dt className="text-foreground font-medium">Survey responses</dt>
            <dd>
              Optional. Linked to your booking when you provide your reference; otherwise anonymous.
              Retained for analytics in aggregate; identifying fields purged after 13 months.
            </dd>
          </div>
        </dl>
      </section>

      <section className="border-border-subtle bg-card flex flex-col gap-4 rounded-xl border p-5 sm:p-6">
        <h2 className="text-foreground text-base font-semibold tracking-tight">Your rights</h2>
        <ul className="text-foreground-muted list-disc space-y-2 pl-5 text-sm leading-relaxed">
          <li>Access — request a copy of your personal data.</li>
          <li>Erasure — ask us to delete your data, subject to legal-retention exceptions.</li>
          <li>Rectification — correct inaccurate data.</li>
          <li>
            Withdraw biometric consent at any time on the{" "}
            <Link
              href={"/my-booking" as never}
              className="text-brand-primary underline-offset-2 hover:underline"
            >
              My booking
            </Link>{" "}
            page. Withdrawal is immediate and does not affect your booking.
          </li>
          <li>
            Lodge a complaint with the relevant supervisory authority (PDPC for Malaysia, your local
            DPA for EU/EEA).
          </li>
        </ul>
        <p className="text-foreground-muted text-sm leading-relaxed">
          To exercise any of these rights, email{" "}
          <a
            href={`mailto:${PRIVACY_CONTACT_EMAIL}`}
            className="text-brand-primary underline-offset-2 hover:underline"
          >
            {PRIVACY_CONTACT_EMAIL}
          </a>
          . We acknowledge requests within 72 hours and respond within 30 days.
        </p>
      </section>
    </div>
  );
}
