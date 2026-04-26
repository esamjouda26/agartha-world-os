"use client";

import * as React from "react";
import { parseAsString, useQueryState } from "nuqs";
import { Calendar, Hash, MessageSquare, Smile, Star, TrendingUp, Users } from "lucide-react";
import type { ColumnDef } from "@tanstack/react-table";

import { FilterBar } from "@/components/ui/filter-bar";
import { FilterChip } from "@/components/ui/filter-chip";
import { KpiCard } from "@/components/ui/kpi-card";
import { KpiCardRow } from "@/components/ui/kpi-card-row";
import { PageHeader } from "@/components/ui/page-header";
import { SectionCard } from "@/components/ui/section-card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { StackedBar } from "@/components/ui/stacked-bar";
import { StatusBadge, type StatusTone } from "@/components/ui/status-badge";
import { StatusTabBar } from "@/components/ui/status-tab-bar";

import { EmptyStateCta } from "@/components/shared/empty-state-cta";
import { FilterableDataTable } from "@/components/shared/filterable-data-table";
import { UrlDateRangePicker } from "@/components/shared/url-date-range-picker";
import { UrlSearchInput } from "@/components/shared/url-search-input";
import { useUrlString } from "@/components/shared/url-state-helpers";

import { SENTIMENT_LABEL } from "@/features/marketing/constants";
import type {
  GuestSurveyRow,
  StaffFeedbackRow,
  SurveySentiment,
  SurveySource,
  SurveyType,
  SurveysData,
} from "@/features/marketing/types";

const NUM = new Intl.NumberFormat("en-MY");
const DATE = new Intl.DateTimeFormat("en-MY", {
  year: "numeric",
  month: "short",
  day: "2-digit",
});

const SURVEY_TYPE_LABEL: Record<SurveyType, string> = {
  post_visit: "Post-visit",
  nps: "NPS",
  csat: "CSAT",
  exit_survey: "Exit",
  staff_captured: "Staff",
};

const SOURCE_LABEL: Record<SurveySource, string> = {
  in_app: "In-app",
  email: "Email",
  kiosk: "Kiosk",
  qr_code: "QR code",
};

const SENTIMENT_TONE: Record<SurveySentiment, StatusTone> = {
  positive: "success",
  neutral: "neutral",
  negative: "danger",
};

const GUEST_SURVEY_TYPES: ReadonlyArray<SurveyType> = ["post_visit", "nps", "csat", "exit_survey"];
const SURVEY_SOURCES: ReadonlyArray<SurveySource> = ["in_app", "email", "kiosk", "qr_code"];

function formatDate(iso: string): string {
  return DATE.format(new Date(iso));
}

function avg(nums: ReadonlyArray<number>): number | null {
  if (nums.length === 0) return null;
  const sum = nums.reduce((s, n) => s + n, 0);
  return sum / nums.length;
}

function aggregateKeywords(
  rows: ReadonlyArray<{ keywords: ReadonlyArray<string> }>,
): ReadonlyArray<{ keyword: string; count: number }> {
  const counts = new Map<string, number>();
  for (const r of rows) {
    for (const k of r.keywords) {
      const key = k.trim().toLowerCase();
      if (!key) continue;
      counts.set(key, (counts.get(key) ?? 0) + 1);
    }
  }
  return [...counts.entries()]
    .map(([keyword, count]) => ({ keyword, count }))
    .sort((a, b) => b.count - a.count)
    .slice(0, 30);
}

type Props = Readonly<{ data: SurveysData }>;

export function SurveysView({ data }: Props) {
  return (
    <div className="flex flex-col gap-6" data-testid="marketing-surveys">
      <PageHeader
        title="Survey Analytics"
        description="Guest sentiment, NPS, and crew-captured feedback."
        data-testid="marketing-surveys-header"
      />

      <StatusTabBar
        ariaLabel="Survey scope"
        paramKey="tab"
        defaultValue="analytics"
        shallow
        data-testid="marketing-surveys-tabs"
        tabs={[
          {
            value: "analytics",
            label: "Guest Surveys",
            count: data.guestRows.length,
            tone: "info",
          },
          {
            value: "staff-feedback",
            label: "Staff Feedback",
            count: data.staffRows.length,
            tone: "accent",
          },
        ]}
      />

      <SurveyTabPanel data={data} />
    </div>
  );
}

function SurveyTabPanel({ data }: Props) {
  const [tab] = useQueryState(
    "tab",
    parseAsString.withDefault("analytics").withOptions({
      clearOnDefault: true,
      shallow: true,
      history: "replace",
    }),
  );

  if (tab === "staff-feedback") {
    return <StaffFeedbackTab rows={data.staffRows} thisMonthCount={data.staffThisMonthCount} />;
  }
  return <GuestSurveysTab rows={data.guestRows} />;
}

// ── Guest Surveys tab ─────────────────────────────────────────────────────

function GuestSurveysTab({ rows }: Readonly<{ rows: ReadonlyArray<GuestSurveyRow> }>) {
  const typeFilter = useUrlString("type");
  const sourceFilter = useUrlString("source");

  const filteredRows = React.useMemo(() => {
    return rows.filter((r) => {
      if (typeFilter.value && r.surveyType !== typeFilter.value) return false;
      if (sourceFilter.value && r.source !== sourceFilter.value) return false;
      return true;
    });
  }, [rows, typeFilter.value, sourceFilter.value]);

  const totalResponses = filteredRows.length;

  const overallScores = filteredRows
    .map((r) => r.overallScore)
    .filter((n): n is number => n !== null);
  const avgOverall = avg(overallScores);

  const npsScores = filteredRows.map((r) => r.npsScore).filter((n): n is number => n !== null);
  const avgNps = avg(npsScores);

  // NPS classification: 0-6 detractor, 7-8 passive, 9-10 promoter.
  const npsBuckets = React.useMemo(() => {
    let promoters = 0;
    let passives = 0;
    let detractors = 0;
    for (const score of npsScores) {
      if (score >= 9) promoters += 1;
      else if (score >= 7) passives += 1;
      else detractors += 1;
    }
    const total = promoters + passives + detractors;
    const npsValue = total === 0 ? null : ((promoters - detractors) / total) * 100;
    return { promoters, passives, detractors, total, npsValue };
  }, [npsScores]);

  // Sentiment distribution
  const sentimentBuckets = React.useMemo(() => {
    let positive = 0;
    let neutral = 0;
    let negative = 0;
    for (const r of filteredRows) {
      if (r.sentiment === "positive") positive += 1;
      else if (r.sentiment === "neutral") neutral += 1;
      else if (r.sentiment === "negative") negative += 1;
    }
    return { positive, neutral, negative };
  }, [filteredRows]);

  const keywords = React.useMemo(() => aggregateKeywords(filteredRows), [filteredRows]);

  const hasActiveFilters = Boolean(typeFilter.value || sourceFilter.value);
  const resetAll = (): void => {
    typeFilter.set(null);
    sourceFilter.set(null);
  };

  const chips: React.ReactNode[] = [];
  if (typeFilter.value) {
    chips.push(
      <FilterChip
        key="type"
        name="Type"
        label={SURVEY_TYPE_LABEL[typeFilter.value as SurveyType] ?? typeFilter.value}
        onRemove={() => typeFilter.set(null)}
        data-testid="marketing-surveys-chip-type"
      />,
    );
  }
  if (sourceFilter.value) {
    chips.push(
      <FilterChip
        key="source"
        name="Source"
        label={SOURCE_LABEL[sourceFilter.value as SurveySource] ?? sourceFilter.value}
        onRemove={() => sourceFilter.set(null)}
        data-testid="marketing-surveys-chip-source"
      />,
    );
  }

  return (
    <div className="flex flex-col gap-6" data-testid="marketing-surveys-guest-tab">
      <FilterBar
        data-testid="marketing-surveys-guest-filters"
        hasActiveFilters={hasActiveFilters}
        onClearAll={resetAll}
        controls={
          <>
            <UrlDateRangePicker
              fromParam="from"
              toParam="to"
              className="min-w-[16rem] sm:w-auto"
              data-testid="marketing-surveys-date-range"
            />
            <Select
              value={typeFilter.value ?? "all"}
              onValueChange={(v) => typeFilter.set(v === "all" ? null : v)}
            >
              <SelectTrigger
                className="h-10 min-w-[10rem] sm:w-auto"
                aria-label="Filter by survey type"
                data-testid="marketing-surveys-filter-type"
              >
                <SelectValue placeholder="All types" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All types</SelectItem>
                {GUEST_SURVEY_TYPES.map((t) => (
                  <SelectItem key={t} value={t}>
                    {SURVEY_TYPE_LABEL[t]}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Select
              value={sourceFilter.value ?? "all"}
              onValueChange={(v) => sourceFilter.set(v === "all" ? null : v)}
            >
              <SelectTrigger
                className="h-10 min-w-[10rem] sm:w-auto"
                aria-label="Filter by source"
                data-testid="marketing-surveys-filter-source"
              >
                <SelectValue placeholder="All sources" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All sources</SelectItem>
                {SURVEY_SOURCES.map((s) => (
                  <SelectItem key={s} value={s}>
                    {SOURCE_LABEL[s]}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </>
        }
        chips={chips.length > 0 ? chips : null}
      />

      <KpiCardRow data-testid="marketing-surveys-guest-kpis">
        <KpiCard
          label="Total responses"
          value={NUM.format(totalResponses)}
          icon={<MessageSquare aria-hidden className="size-4" />}
          data-testid="marketing-surveys-kpi-total"
        />
        <KpiCard
          label="Avg overall score"
          value={avgOverall === null ? "—" : avgOverall.toFixed(1)}
          caption="out of 10"
          icon={<Star aria-hidden className="size-4" />}
          data-testid="marketing-surveys-kpi-overall"
        />
        <KpiCard
          label="Avg NPS score"
          value={avgNps === null ? "—" : avgNps.toFixed(1)}
          caption="out of 10"
          icon={<TrendingUp aria-hidden className="size-4" />}
          data-testid="marketing-surveys-kpi-nps-avg"
        />
        <KpiCard
          label="NPS"
          value={npsBuckets.npsValue === null ? "—" : `${Math.round(npsBuckets.npsValue)}`}
          caption={`${npsBuckets.promoters}P / ${npsBuckets.passives}P / ${npsBuckets.detractors}D`}
          icon={<Users aria-hidden className="size-4" />}
          data-testid="marketing-surveys-kpi-nps"
        />
      </KpiCardRow>

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        <SectionCard
          title="NPS breakdown"
          description="Promoter / Passive / Detractor split"
          data-testid="marketing-surveys-nps-chart"
        >
          {npsBuckets.total === 0 ? (
            <EmptyStateCta
              variant="filtered-out"
              title="No NPS responses"
              description="Adjust the date range or filters."
              icon={<TrendingUp className="size-8" />}
              frame="none"
            />
          ) : (
            <StackedBar
              segments={[
                {
                  label: "Promoters",
                  value: npsBuckets.promoters,
                  tone: "success",
                },
                {
                  label: "Passives",
                  value: npsBuckets.passives,
                  tone: "warning",
                },
                {
                  label: "Detractors",
                  value: npsBuckets.detractors,
                  tone: "danger",
                },
              ]}
              height="lg"
              data-testid="marketing-surveys-nps-bar"
            />
          )}
        </SectionCard>

        <SectionCard
          title="Sentiment distribution"
          description="Positive / Neutral / Negative split"
          data-testid="marketing-surveys-sentiment-chart"
        >
          {sentimentBuckets.positive + sentimentBuckets.neutral + sentimentBuckets.negative ===
          0 ? (
            <EmptyStateCta
              variant="filtered-out"
              title="No sentiment data"
              description="Adjust the date range or filters."
              icon={<Smile className="size-8" />}
              frame="none"
            />
          ) : (
            <StackedBar
              segments={[
                {
                  label: "Positive",
                  value: sentimentBuckets.positive,
                  tone: "success",
                },
                {
                  label: "Neutral",
                  value: sentimentBuckets.neutral,
                  tone: "neutral",
                },
                {
                  label: "Negative",
                  value: sentimentBuckets.negative,
                  tone: "danger",
                },
              ]}
              height="lg"
              data-testid="marketing-surveys-sentiment-bar"
            />
          )}
        </SectionCard>
      </div>

      <KeywordCloud
        keywords={keywords}
        title="Top keywords"
        emptyLabel="No keywords for the selected range."
        data-testid="marketing-surveys-keywords-guest"
      />
    </div>
  );
}

// ── Staff Feedback tab ────────────────────────────────────────────────────

function StaffFeedbackTab({
  rows,
  thisMonthCount,
}: Readonly<{
  rows: ReadonlyArray<StaffFeedbackRow>;
  thisMonthCount: number;
}>) {
  const sentimentFilter = useUrlString("sentiment");
  const searchFilter = useUrlString("q");

  const filteredRows = React.useMemo(() => {
    return rows.filter((r) => {
      if (sentimentFilter.value && r.sentiment !== sentimentFilter.value) {
        return false;
      }
      const q = searchFilter.value?.toLowerCase().trim();
      if (q) {
        const haystack = [
          r.feedbackText ?? "",
          r.submittedByName ?? "",
          r.bookingRef ?? "",
          ...r.keywords,
        ]
          .join(" ")
          .toLowerCase();
        if (!haystack.includes(q)) return false;
      }
      return true;
    });
  }, [rows, sentimentFilter.value, searchFilter.value]);

  // "This month" is a fixed reference (current calendar month, server-
  // computed) — the spec literal "This month: {n}" keeps the KPI honest
  // even when the user picks a date range outside the current month.
  // Sentiment % and top theme below stay derived from filteredRows so
  // they DO respond to the date range and other filters.
  const sentimentBuckets = React.useMemo(() => {
    let positive = 0;
    let neutral = 0;
    let negative = 0;
    for (const r of filteredRows) {
      if (r.sentiment === "positive") positive += 1;
      else if (r.sentiment === "neutral") neutral += 1;
      else if (r.sentiment === "negative") negative += 1;
    }
    const total = positive + neutral + negative;
    const pct = (n: number): number => (total === 0 ? 0 : Math.round((n / total) * 100));
    return {
      positive,
      neutral,
      negative,
      total,
      positivePct: pct(positive),
      negativePct: pct(negative),
    };
  }, [filteredRows]);

  const keywords = React.useMemo(() => aggregateKeywords(filteredRows), [filteredRows]);

  const topTheme = keywords[0]?.keyword ?? null;

  const hasActiveFilters = Boolean(searchFilter.value || sentimentFilter.value);
  const resetAll = (): void => {
    searchFilter.set(null);
    sentimentFilter.set(null);
  };

  const chips: React.ReactNode[] = [];
  if (sentimentFilter.value) {
    chips.push(
      <FilterChip
        key="sentiment"
        name="Sentiment"
        label={SENTIMENT_LABEL[sentimentFilter.value as SurveySentiment] ?? sentimentFilter.value}
        onRemove={() => sentimentFilter.set(null)}
        data-testid="marketing-surveys-staff-chip-sentiment"
      />,
    );
  }

  const columns = React.useMemo<ColumnDef<StaffFeedbackRow, unknown>[]>(
    () => [
      {
        id: "submittedBy",
        header: "Submitted by",
        cell: ({ row }) => row.original.submittedByName ?? "—",
      },
      {
        id: "sentiment",
        header: "Sentiment",
        cell: ({ row }) =>
          row.original.sentiment ? (
            <StatusBadge
              status={row.original.sentiment}
              tone={SENTIMENT_TONE[row.original.sentiment]}
              label={SENTIMENT_LABEL[row.original.sentiment]}
              data-testid={`marketing-surveys-staff-row-sentiment-${row.original.id}`}
            />
          ) : (
            "—"
          ),
        meta: {
          headerClassName: "w-0 whitespace-nowrap",
          cellClassName: "w-0 whitespace-nowrap",
        },
      },
      {
        id: "feedback",
        header: "Feedback",
        cell: ({ row }) => (
          <p className="line-clamp-2 max-w-[40ch] text-sm">{row.original.feedbackText ?? "—"}</p>
        ),
      },
      {
        id: "tags",
        header: "Tags",
        cell: ({ row }) =>
          row.original.keywords.length === 0 ? (
            <span className="text-foreground-muted">—</span>
          ) : (
            <div className="flex flex-wrap gap-1">
              {row.original.keywords.slice(0, 3).map((k) => (
                <span
                  key={k}
                  className="border-border-subtle bg-surface text-foreground-muted rounded-md border px-1.5 py-0.5 text-xs"
                >
                  {k}
                </span>
              ))}
              {row.original.keywords.length > 3 ? (
                <span className="text-foreground-muted text-xs">
                  +{row.original.keywords.length - 3}
                </span>
              ) : null}
            </div>
          ),
      },
      {
        id: "rating",
        header: "Rating",
        cell: ({ row }) =>
          row.original.overallScore === null ? (
            <span className="text-foreground-muted">—</span>
          ) : (
            <span className="tabular-nums">{row.original.overallScore}/10</span>
          ),
        meta: {
          headerClassName: "w-0 whitespace-nowrap text-right",
          cellClassName: "w-0 whitespace-nowrap text-right",
        },
      },
      {
        id: "bookingRef",
        header: "Booking",
        cell: ({ row }) =>
          row.original.bookingRef ? (
            <span className="font-mono text-xs">{row.original.bookingRef}</span>
          ) : (
            <span className="text-foreground-muted">—</span>
          ),
        meta: {
          headerClassName: "w-0 whitespace-nowrap",
          cellClassName: "w-0 whitespace-nowrap",
        },
      },
      {
        id: "createdAt",
        header: "Date",
        cell: ({ row }) => (
          <span className="whitespace-nowrap tabular-nums">
            {formatDate(row.original.createdAt)}
          </span>
        ),
        meta: {
          headerClassName: "w-0 whitespace-nowrap",
          cellClassName: "w-0 whitespace-nowrap",
        },
      },
    ],
    [],
  );

  return (
    <div className="flex flex-col gap-6" data-testid="marketing-surveys-staff-tab">
      <KpiCardRow data-testid="marketing-surveys-staff-kpis">
        <KpiCard
          label="This month"
          value={NUM.format(thisMonthCount)}
          caption="staff submissions"
          icon={<Calendar aria-hidden className="size-4" />}
          data-testid="marketing-surveys-staff-kpi-month"
        />
        <KpiCard
          label="Sentiment"
          value={`${sentimentBuckets.positivePct}% +`}
          caption={`${sentimentBuckets.negativePct}% negative`}
          icon={<Smile aria-hidden className="size-4" />}
          data-testid="marketing-surveys-staff-kpi-sentiment"
        />
        <KpiCard
          label="Top theme"
          value={topTheme ?? "—"}
          caption={topTheme ? `${NUM.format(keywords[0]?.count ?? 0)} mentions` : "no keywords"}
          icon={<Hash aria-hidden className="size-4" />}
          data-testid="marketing-surveys-staff-kpi-theme"
        />
      </KpiCardRow>

      <FilterableDataTable<StaffFeedbackRow>
        toolbar={
          <FilterBar
            data-testid="marketing-surveys-staff-filters"
            hasActiveFilters={hasActiveFilters}
            onClearAll={resetAll}
            search={
              <UrlSearchInput
                param="q"
                placeholder="Search feedback, name, tag…"
                aria-label="Search staff feedback"
                debounceMs={300}
                data-testid="marketing-surveys-staff-search"
              />
            }
            controls={
              <>
                <UrlDateRangePicker
                  fromParam="from"
                  toParam="to"
                  className="min-w-[16rem] sm:w-auto"
                  data-testid="marketing-surveys-staff-date-range"
                />
                <Select
                  value={sentimentFilter.value ?? "all"}
                  onValueChange={(v) => sentimentFilter.set(v === "all" ? null : v)}
                >
                  <SelectTrigger
                    className="h-10 min-w-[10rem] sm:w-auto"
                    aria-label="Filter by sentiment"
                    data-testid="marketing-surveys-staff-filter-sentiment"
                  >
                    <SelectValue placeholder="All sentiments" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All sentiments</SelectItem>
                    <SelectItem value="positive">{SENTIMENT_LABEL.positive}</SelectItem>
                    <SelectItem value="neutral">{SENTIMENT_LABEL.neutral}</SelectItem>
                    <SelectItem value="negative">{SENTIMENT_LABEL.negative}</SelectItem>
                  </SelectContent>
                </Select>
              </>
            }
            chips={chips.length > 0 ? chips : null}
          />
        }
        table={{
          data: filteredRows,
          columns,
          mobileFieldPriority: ["sentiment", "feedback", "submittedBy", "createdAt"],
          getRowId: (row) => row.id,
        }}
        hasActiveFilters={hasActiveFilters}
        emptyState={{
          variant: "filtered-out" as const,
          title: hasActiveFilters
            ? "No feedback matches your filters"
            : "No crew-captured feedback yet",
          description: hasActiveFilters
            ? "Clear filters or try a different search."
            : "Crew can submit guest feedback from /crew/feedback.",
          icon: <MessageSquare className="size-8" />,
        }}
        data-testid="marketing-surveys-staff-table"
      />

      <KeywordCloud
        keywords={keywords}
        title="Top themes from staff submissions"
        emptyLabel="No themes for the selected range."
        data-testid="marketing-surveys-keywords-staff"
      />
    </div>
  );
}

// ── Keyword cloud ─────────────────────────────────────────────────────────

function KeywordCloud({
  keywords,
  title,
  emptyLabel,
  "data-testid": testId,
}: Readonly<{
  keywords: ReadonlyArray<{ keyword: string; count: number }>;
  title: string;
  emptyLabel: string;
  "data-testid"?: string;
}>) {
  const cardProps = testId ? { "data-testid": testId } : {};
  if (keywords.length === 0) {
    return (
      <SectionCard title={title} {...cardProps}>
        <p className="text-foreground-muted text-sm">{emptyLabel}</p>
      </SectionCard>
    );
  }
  const max = keywords[0]?.count ?? 1;
  return (
    <SectionCard title={title} {...cardProps}>
      <div className="flex flex-wrap gap-2">
        {keywords.map(({ keyword, count }) => {
          const weight = count / max;
          // Map weight 0..1 → text-sm..text-2xl plus tonal emphasis.
          const sizeClass =
            weight > 0.75
              ? "text-2xl font-semibold"
              : weight > 0.5
                ? "text-xl font-semibold"
                : weight > 0.25
                  ? "text-lg"
                  : "text-base";
          return (
            <span
              key={keyword}
              className={`border-border-subtle text-foreground inline-flex items-center gap-1.5 rounded-full border px-3 py-1 ${sizeClass}`}
              data-testid={`marketing-surveys-keyword-${keyword}`}
            >
              <span>{keyword}</span>
              <span className="text-foreground-muted text-xs tabular-nums">{count}</span>
            </span>
          );
        })}
      </div>
    </SectionCard>
  );
}
