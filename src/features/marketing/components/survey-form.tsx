"use client";

import * as React from "react";
import { useTransition } from "react";
import Link from "next/link";
import { CheckCircle2, Loader2, Send } from "lucide-react";
import { useTranslations } from "next-intl";

import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { StickyActionBar } from "@/components/ui/sticky-action-bar";
import { Textarea } from "@/components/ui/textarea";
import { toastError } from "@/components/ui/toast-helpers";
import { fadeIn, motion, motionOrStill, usePrefersReducedMotion } from "@/lib/motion";
import { cn } from "@/lib/utils";

import { submitSurveyAction } from "@/features/marketing/actions/submit-survey";
import { ScoreScale } from "@/features/marketing/components/score-scale";
import {
  SURVEY_KEYWORD_LABELS,
  SURVEY_KEYWORDS,
  type SurveyKeyword,
} from "@/features/marketing/schemas/submit-survey";

/**
 * SurveyForm — single calm card with horizontal-divider sections.
 *
 * Earlier iteration used four bordered fieldsets stacked vertically,
 * which read like a school exam. Replaced with one card that flows
 * top-to-bottom, sections separated by hairlines. Question numbering
 * is dropped — order is implicit, "Required" is implied by the disabled
 * CTA.
 *
 * Q3 keywords moved from bordered checkbox cards to compact pill chips
 * (toggle-as-button) — far less visual weight for a 6-option pick-any.
 */

const FEEDBACK_MAX = 2000;

export type SurveyFormProps = Readonly<{
  bookingRef: string | null;
  source: "in_app" | "email" | "kiosk" | "qr_code";
  className?: string;
  "data-testid"?: string;
}>;

export function SurveyForm({
  bookingRef,
  source,
  className,
  "data-testid": testId,
}: SurveyFormProps) {
  const t = useTranslations("guest.survey");
  const reduced = usePrefersReducedMotion();
  const [overall, setOverall] = React.useState<number | null>(null);
  const [nps, setNps] = React.useState<number | null>(null);
  const [keywords, setKeywords] = React.useState<readonly SurveyKeyword[]>([]);
  const [feedback, setFeedback] = React.useState("");
  const [isPending, startTransition] = useTransition();
  const [submitted, setSubmitted] = React.useState(false);
  const [formError, setFormError] = React.useState<string | null>(null);

  const canSubmit = overall !== null && !isPending;

  const toggleKeyword = (k: SurveyKeyword): void => {
    setKeywords((prev) => (prev.includes(k) ? prev.filter((p) => p !== k) : [...prev, k]));
  };

  const submit = (): void => {
    if (overall === null) return;
    setFormError(null);
    startTransition(async () => {
      const result = await submitSurveyAction({
        overall_score: overall,
        nps_score: nps,
        keywords: [...keywords],
        feedback_text: feedback.trim().length > 0 ? feedback.trim() : null,
        booking_ref: bookingRef,
        source,
      });
      if (!result.success) {
        if (result.error === "RATE_LIMITED") {
          setFormError(t("errors.rateLimited"));
          return;
        }
        if (result.error === "VALIDATION_FAILED") {
          setFormError(t("errors.validation"));
          return;
        }
        toastError(result);
        setFormError(t("errors.generic"));
        return;
      }
      setSubmitted(true);
    });
  };

  if (submitted) {
    return (
      <motion.section
        {...motionOrStill(fadeIn({ duration: "small" }), reduced)}
        data-testid={`${testId ?? "survey-form"}-confirmation`}
        className="border-border-subtle bg-card flex flex-col items-center gap-4 rounded-2xl border p-8 text-center shadow-xs sm:p-10"
        role="status"
        aria-live="polite"
      >
        <span
          aria-hidden
          className="bg-status-success-soft text-status-success-foreground inline-flex size-16 items-center justify-center rounded-2xl shadow-xs"
        >
          <CheckCircle2 className="size-8" />
        </span>
        <div className="flex max-w-md flex-col gap-2">
          <h2 className="text-foreground text-xl font-semibold tracking-tight">
            {t("confirmation.title")}
          </h2>
          <p className="text-foreground-muted text-sm leading-relaxed">{t("confirmation.body")}</p>
        </div>
        <Button asChild variant="outline">
          <Link href={"/" as never} data-testid="survey-confirmation-home">
            {t("confirmation.back")}
          </Link>
        </Button>
      </motion.section>
    );
  }

  return (
    <form
      onSubmit={(e) => {
        e.preventDefault();
        submit();
      }}
      data-testid={testId ?? "survey-form"}
      className={cn("flex flex-col gap-6 pb-32 md:pb-0", className)}
      noValidate
    >
      <article className="border-border-subtle bg-card divide-border-subtle flex flex-col divide-y rounded-2xl border shadow-sm">
        {/* Q1 — Overall (required) */}
        <SurveySection title={t("q1.title")} subtitle={t("q1.subtitle")}>
          <ScoreScale
            value={overall}
            onChange={setOverall}
            aria-label={t("ariaOverallRating")}
            lowLabel={t("q1.low")}
            highLabel={t("q1.high")}
            disabled={isPending}
            data-testid="survey-overall"
          />
        </SurveySection>

        {/* Q2 — NPS */}
        <SurveySection title={t("q2.title")} subtitle={t("q2.subtitle")}>
          <ScoreScale
            value={nps}
            onChange={setNps}
            tone="nps"
            aria-label={t("ariaRecommendationLikelihood")}
            lowLabel={t("q2.low")}
            highLabel={t("q2.high")}
            disabled={isPending}
            data-testid="survey-nps"
          />
        </SurveySection>

        {/* Q3 — Keywords as pill chips */}
        <SurveySection title={t("q3.title")} subtitle={t("q3.subtitle")}>
          <ul role="group" aria-label={t("ariaStandoutTopics")} className="flex flex-wrap gap-2">
            {SURVEY_KEYWORDS.map((keyword) => {
              const checked = keywords.includes(keyword);
              return (
                <li key={keyword}>
                  <button
                    type="button"
                    role="checkbox"
                    aria-checked={checked}
                    onClick={() => toggleKeyword(keyword)}
                    disabled={isPending}
                    data-testid={`survey-keyword-${keyword}`}
                    className={cn(
                      "inline-flex h-9 items-center rounded-full border px-3 text-sm",
                      "transition-[background-color,border-color] outline-none",
                      "duration-[var(--duration-small)]",
                      "focus-visible:ring-ring focus-visible:ring-2 focus-visible:ring-offset-2",
                      "disabled:cursor-not-allowed disabled:opacity-60",
                      checked
                        ? "border-brand-primary bg-brand-primary/10 text-foreground dark:bg-brand-primary/20"
                        : "border-border-subtle bg-card text-foreground-muted hover:border-border hover:bg-surface",
                    )}
                  >
                    {SURVEY_KEYWORD_LABELS[keyword]}
                  </button>
                </li>
              );
            })}
          </ul>
        </SurveySection>

        {/* Q4 — Free text */}
        <SurveySection title={t("q4.title")} subtitle={t("q4.subtitle")}>
          <Textarea
            value={feedback}
            onChange={(e) => setFeedback(e.target.value.slice(0, FEEDBACK_MAX))}
            maxLength={FEEDBACK_MAX}
            rows={4}
            disabled={isPending}
            placeholder={t("q4.placeholder")}
            aria-label={t("ariaFreeTextFeedback")}
            data-testid="survey-feedback-text"
          />
          <p
            className="text-foreground-subtle mt-1.5 self-end text-right text-xs tabular-nums"
            aria-live="polite"
            data-testid="survey-feedback-counter"
          >
            {t("feedbackCounter", { current: feedback.length, max: FEEDBACK_MAX })}
          </p>
        </SurveySection>
      </article>

      {formError ? (
        <Alert variant="destructive" data-testid="survey-form-error">
          <AlertTitle>{t("errors.alertTitle")}</AlertTitle>
          <AlertDescription>{formError}</AlertDescription>
        </Alert>
      ) : null}

      {/* Desktop submit — inline */}
      <div className="hidden md:flex md:items-center md:justify-between md:gap-3">
        <p
          className={cn(
            "text-xs",
            overall === null ? "text-foreground-muted" : "text-foreground-subtle",
          )}
          aria-live="polite"
        >
          {overall === null ? t("pickRatingHelper") : t("readyHelper")}
        </p>
        <Button type="submit" size="lg" disabled={!canSubmit} data-testid="survey-submit">
          {isPending ? (
            <Loader2 aria-hidden className="size-4 animate-spin" />
          ) : (
            <Send aria-hidden className="size-4" />
          )}
          {isPending ? t("ctaSending") : t("ctaSend")}
        </Button>
      </div>

      {/* Mobile submit — sticky */}
      <StickyActionBar bottomOffset={0} className="md:hidden" data-testid="survey-sticky-cta">
        <Button
          type="submit"
          size="lg"
          disabled={!canSubmit}
          className="w-full"
          data-testid="survey-submit-mobile"
        >
          {isPending ? <Loader2 aria-hidden className="size-4 animate-spin" /> : null}
          {isPending ? t("ctaSending") : t("ctaSend")}
        </Button>
      </StickyActionBar>
    </form>
  );
}

function SurveySection({
  title,
  subtitle,
  children,
}: Readonly<{
  title: string;
  subtitle: string;
  children: React.ReactNode;
}>) {
  return (
    <section className="flex flex-col gap-3 p-5 sm:p-6">
      <header className="flex flex-col gap-0.5">
        <h2 className="text-foreground text-base font-semibold tracking-tight">{title}</h2>
        <p className="text-foreground-muted text-xs">{subtitle}</p>
      </header>
      {children}
    </section>
  );
}
