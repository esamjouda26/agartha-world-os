"use client";

import { useState, useTransition } from "react";
import { useRouter } from "@/i18n/navigation";

import { formatDistanceToNow } from "date-fns";
import { MapPin, Minus, ThumbsDown, ThumbsUp } from "lucide-react";

import { ChipInput } from "@/components/ui/chip-input";
import { EmptyStateCta } from "@/components/shared/empty-state-cta";
import { FieldGroup } from "@/components/ui/field-group";
import { FormSection } from "@/components/ui/form-section";
import { Input } from "@/components/ui/input";
import { MetadataList } from "@/components/ui/metadata-list";
import { PageHeader } from "@/components/ui/page-header";
import { SectionCard } from "@/components/ui/section-card";
import { StatusBadge, type StatusTone } from "@/components/ui/status-badge";
import { StickyActionBar, StickyActionBarSpacer } from "@/components/ui/sticky-action-bar";
import { Textarea } from "@/components/ui/textarea";
import { toastError, toastSuccess } from "@/components/ui/toast-helpers";
import { submitFeedbackAction } from "@/features/marketing/actions/submit-feedback";
import { SENTIMENT_LABEL } from "@/features/marketing/constants";
import type { RecentFeedbackRow, SurveySentiment } from "@/features/marketing/types";

// ── JSX constants (cannot live in .ts — contain React nodes) ──────────────────

const SENTIMENT_OPTIONS: ReadonlyArray<{
  value: SurveySentiment;
  label: string;
  icon: React.ReactNode;
}> = [
  { value: "positive", label: SENTIMENT_LABEL.positive, icon: <ThumbsUp size={16} /> },
  { value: "neutral", label: SENTIMENT_LABEL.neutral, icon: <Minus size={16} /> },
  { value: "negative", label: SENTIMENT_LABEL.negative, icon: <ThumbsDown size={16} /> },
];

const SENTIMENT_TONE: Record<SurveySentiment, StatusTone> = {
  positive: "success",
  neutral: "warning",
  negative: "danger",
};

// ── Local: GuestFeedbackForm ──────────────────────────────────────────────────

type GuestFeedbackFormProps = Readonly<{
  onSubmitted: () => void;
  /**
   * Auto-detected location resolved from the caller's
   * `staff_records.org_unit_id → locations.org_unit_id` chain. Displayed as
   * read-only context only — `survey_responses` has no location column
   * (frontend_spec.md:3004).
   */
  autoLocationName: string | null;
}>;

function GuestFeedbackForm({ onSubmitted, autoLocationName }: GuestFeedbackFormProps) {
  const [sentiment, setSentiment] = useState<SurveySentiment>("positive");
  const [feedbackText, setFeedbackText] = useState("");
  const [keywords, setKeywords] = useState<readonly string[]>([]);
  const [score, setScore] = useState<number | null>(null);
  const [bookingRef, setBookingRef] = useState("");
  const [isPending, startTransition] = useTransition();

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    startTransition(async () => {
      const result = await submitFeedbackAction({
        sentiment,
        feedbackText,
        keywords: [...keywords],
        overallScore: score,
        bookingRef: bookingRef || undefined,
      });
      if (result.success) {
        toastSuccess("Feedback submitted.");
        setFeedbackText("");
        setKeywords([]);
        setScore(null);
        setBookingRef("");
        onSubmitted();
      } else {
        toastError(result);
      }
    });
  }

  return (
    <div data-testid="feedback-form-section">
      <form
        onSubmit={handleSubmit}
        className="flex flex-col gap-5"
        data-testid="feedback-form"
        aria-busy={isPending}
      >
        {/* Auto-detected location — displayed read-only per frontend_spec.md:3004.
            Not stored on survey_responses (no location column). */}
        {autoLocationName ? (
          <div
            className="border-border-subtle bg-surface/40 flex items-center gap-2 rounded-lg border px-3 py-2 text-sm"
            data-testid="feedback-auto-location"
          >
            <MapPin aria-hidden className="text-foreground-muted size-4" />
            <span className="text-foreground-muted">Captured at</span>
            <span className="text-foreground font-medium">{autoLocationName}</span>
          </div>
        ) : null}

        {/* Sentiment segmented control */}
        <FieldGroup legend="Guest sentiment" data-testid="feedback-sentiment-group">
          <div className="grid grid-cols-3 gap-2" role="radiogroup" aria-label="Guest sentiment">
            {SENTIMENT_OPTIONS.map((opt) => (
              <button
                key={opt.value}
                type="button"
                role="radio"
                aria-checked={sentiment === opt.value}
                onClick={() => setSentiment(opt.value)}
                disabled={isPending}
                className={`flex min-h-[60px] flex-col items-center justify-center gap-1 rounded-xl border py-3 text-sm font-medium transition-colors disabled:opacity-50 ${
                  sentiment === opt.value
                    ? "border-primary bg-primary/10 text-primary"
                    : "border-border bg-card hover:bg-accent"
                }`}
                data-testid={`feedback-sentiment-${opt.value}`}
              >
                {opt.icon}
                <span>{opt.label}</span>
              </button>
            ))}
          </div>
        </FieldGroup>

        {/* Feedback text */}
        <FieldGroup legend="What did the guest say?" data-testid="feedback-text-group">
          <Textarea
            id="feedback-text"
            value={feedbackText}
            onChange={(e) => setFeedbackText(e.target.value)}
            placeholder="Describe the guest's feedback…"
            rows={3}
            required
            minLength={10}
            className="resize-none"
            disabled={isPending}
            data-testid="feedback-text"
            aria-describedby="feedback-text-hint"
          />
          <p id="feedback-text-hint" className="text-foreground-muted text-xs">
            Minimum 10 characters
          </p>
        </FieldGroup>

        {/* Tags — replaced hand-rolled input with ChipInput sink primitive */}
        <FieldGroup legend="Tags (optional)" data-testid="feedback-tags-group">
          <ChipInput
            value={keywords}
            onChange={setKeywords}
            placeholder="e.g. wait time, cleanliness"
            validate={(candidate, existing) =>
              existing.includes(candidate) ? "Tag already added" : true
            }
            maxChips={10}
            disabled={isPending}
            aria-label="Feedback tags"
            data-testid="feedback-tags"
          />
        </FieldGroup>

        {/* Rating */}
        <FieldGroup
          legend={`Guest mood rating (optional) — ${score !== null ? `${score}/10` : "Not set"}`}
        >
          <input
            id="feedback-score"
            type="range"
            min={1}
            max={10}
            value={score ?? 5}
            onChange={(e) => setScore(Number(e.target.value))}
            className="accent-primary w-full disabled:opacity-50"
            disabled={isPending}
            data-testid="feedback-score"
            aria-label="Guest mood rating 1 to 10"
          />
          <div className="text-foreground-muted flex justify-between text-xs">
            <span>1</span>
            <span>10</span>
          </div>
          {score !== null && (
            <button
              type="button"
              className="text-foreground-muted hover:text-foreground self-start text-xs underline"
              onClick={() => setScore(null)}
              data-testid="feedback-clear-score"
            >
              Clear rating
            </button>
          )}
        </FieldGroup>

        {/* Booking ref */}
        <FieldGroup legend="Booking reference (optional)">
          <Input
            id="feedback-booking-ref"
            value={bookingRef}
            onChange={(e) => setBookingRef(e.target.value)}
            placeholder="e.g. AG-ABCD1234"
            className="min-h-[44px] font-mono"
            disabled={isPending}
            data-testid="feedback-booking-ref"
          />
        </FieldGroup>

        {/* Spacer keeps the last field visible above the sticky bar on mobile. */}
        <StickyActionBarSpacer />

        {/* Submit — FormSubmitButton requires RHF context; this form uses raw
            useState (not react-hook-form), so we render a plain button.
            Wrapped in <StickyActionBar> so the primary CTA pins to the
            bottom-100px band on mobile per Phase 8 crew-portal contract. */}
        <StickyActionBar data-testid="feedback-submit-bar">
          <button
            type="submit"
            disabled={isPending || feedbackText.length < 10}
            className="bg-primary text-primary-foreground hover:bg-primary/90 flex min-h-[52px] w-full items-center justify-center gap-2 rounded-xl text-base font-semibold transition-colors disabled:pointer-events-none disabled:opacity-50"
            data-testid="feedback-submit"
          >
            {isPending ? (
              <>
                <span className="size-4 animate-spin rounded-full border-2 border-current border-t-transparent" />
                Submitting…
              </>
            ) : (
              "Submit Feedback"
            )}
          </button>
        </StickyActionBar>
      </form>
    </div>
  );
}

// ── Local: RecentFeedbackList ─────────────────────────────────────────────────

type RecentFeedbackListProps = Readonly<{ feedback: ReadonlyArray<RecentFeedbackRow> }>;

function RecentFeedbackList({ feedback }: RecentFeedbackListProps) {
  if (feedback.length === 0) {
    return (
      <EmptyStateCta
        variant="first-use"
        title="No feedback submitted yet"
        description="Capture what guests are saying!"
        data-testid="feedback-empty-state"
      />
    );
  }

  return (
    <div className="flex flex-col gap-2" data-testid="recent-feedback-list">
      {feedback.map((item) => (
        <SectionCard key={item.id} headless data-testid={`feedback-item-${item.id}`}>
          <div className="flex flex-col gap-1.5 px-4 py-3">
            <MetadataList
              layout="inline"
              items={[
                ...(item.sentiment
                  ? [
                      {
                        label: "Sentiment",
                        value: (
                          <StatusBadge
                            status={item.sentiment}
                            tone={SENTIMENT_TONE[item.sentiment]}
                            label={item.sentiment}
                          />
                        ),
                      },
                    ]
                  : []),
                ...(item.overallScore !== null
                  ? [{ label: "Score", value: `${item.overallScore}/10` }]
                  : []),
                {
                  label: "Submitted",
                  value: formatDistanceToNow(new Date(item.createdAt), { addSuffix: true }),
                },
              ]}
            />
            {item.feedbackText && (
              <p className="text-foreground-muted line-clamp-2 text-sm">{item.feedbackText}</p>
            )}
          </div>
        </SectionCard>
      ))}
    </div>
  );
}

// ── Main: FeedbackView ────────────────────────────────────────────────────────

type FeedbackViewProps = Readonly<{
  initialFeedback: ReadonlyArray<RecentFeedbackRow>;
  autoLocationName: string | null;
}>;

export function FeedbackView({ initialFeedback, autoLocationName }: FeedbackViewProps) {
  const router = useRouter();

  return (
    <div className="flex flex-col gap-6" data-testid="feedback-page">
      <PageHeader
        title="Guest Feedback"
        description="Capture what guests are saying in passing"
        density="compact"
        data-testid="feedback-page-header"
      />
      <GuestFeedbackForm onSubmitted={() => router.refresh()} autoLocationName={autoLocationName} />

      <FormSection title="Recent Submissions" divider data-testid="feedback-recent-section">
        <RecentFeedbackList feedback={initialFeedback} />
      </FormSection>
    </div>
  );
}
