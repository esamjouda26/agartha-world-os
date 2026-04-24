"use client";

import * as React from "react";
import { useQueryState, parseAsStringEnum } from "nuqs";
import { Star, MessageSquare, ThumbsUp, Users } from "lucide-react";

import { PageHeader } from "@/components/ui/page-header";
import { KpiCard } from "@/components/ui/kpi-card";
import { KpiCardRow } from "@/components/ui/kpi-card-row";
import { Sparkline } from "@/components/ui/sparkline";
import { SectionCard } from "@/components/ui/section-card";
import { Badge } from "@/components/ui/badge";
import { StackedBar } from "@/components/ui/stacked-bar";
import { BarList } from "@/components/ui/bar-list-item";

import type { GuestsDashboardData } from "@/features/guests/queries/get-guests-dashboard";

const SOURCE_LABELS: Record<string, string> = {
  in_app: "In-App",
  email: "Email",
  kiosk: "Kiosk",
  qr_code: "QR Code",
};

type GuestsDashboardViewProps = Readonly<{ data: GuestsDashboardData }>;

export function GuestsDashboardView({ data }: GuestsDashboardViewProps) {
  const [range, setRange] = useQueryState(
    "range",
    parseAsStringEnum(["30d", "90d"]).withOptions({
      clearOnDefault: true,
      history: "push",
      shallow: false,
    }),
  );
  const activeRange = range ?? "30d";

  const sentimentSeries = data.sentimentTrend.map((d) => d.avgScore);
  const npsTotal = data.npsBreakdown.total;

  return (
    <div className="flex flex-col gap-6" data-testid="guests-dashboard">
      <PageHeader
        title="Guest Satisfaction"
        description="NPS, rating distributions, complaint themes, and channel breakdown."
        eyebrow="BUSINESS · GUESTS"
        metaSlot={
          <div className="flex gap-2" role="group">
            {(["30d", "90d"] as const).map((r) => {
              const active = activeRange === r;
              return (
                <button
                  key={r}
                  type="button"
                  onClick={() => void setRange(r === "30d" ? null : r)}
                  className={[
                    "rounded-full border px-3 py-1 text-xs font-medium transition-colors",
                    active
                      ? "border-brand-primary bg-brand-primary/10 text-brand-primary"
                      : "border-border-subtle text-foreground-subtle hover:border-border hover:text-foreground",
                  ].join(" ")}
                  aria-pressed={active}
                  data-testid={`guests-range-${r}`}
                >
                  {r === "30d" ? "30 days" : "90 days"}
                </button>
              );
            })}
          </div>
        }
      />

      {/* KPIs */}
      <KpiCardRow data-testid="guests-kpis">
        <KpiCard
          label="NPS Score"
          value={data.npsScore != null ? `${data.npsScore > 0 ? "+" : ""}${data.npsScore}` : "—"}
          caption={`${data.npsBreakdown.total} rated`}
          icon={<ThumbsUp className="size-4" />}
          emphasis={data.npsScore != null && data.npsScore >= 50 ? "accent" : "default"}
          data-testid="guests-kpi-nps"
        />
        <KpiCard
          label="Avg Overall Rating"
          value={data.avgOverallRating != null ? `${data.avgOverallRating.toFixed(1)} / 10` : "—"}
          icon={<Star className="size-4" />}
          {...(sentimentSeries.length >= 2
            ? {
                sparkline: (
                  <Sparkline data={sentimentSeries} tone="brand" label="Sentiment trend" />
                ),
              }
            : {})}
          data-testid="guests-kpi-rating"
        />
        <KpiCard
          label="Total Responses"
          value={data.totalResponses}
          caption={`${data.periodFrom} – ${data.periodTo}`}
          icon={<MessageSquare className="size-4" />}
          data-testid="guests-kpi-responses"
        />
        <KpiCard
          label="Response Rate"
          value={data.responsePct != null ? `${data.responsePct}%` : "—"}
          caption={`${data.totalResponses} of ${data.completedBookings} bookings`}
          icon={<Users className="size-4" />}
          data-testid="guests-kpi-response-rate"
        />
      </KpiCardRow>

      {/* NPS + Score Distribution side by side */}
      <div className="grid grid-cols-1 gap-6 xl:grid-cols-2">
        <SectionCard
          title="NPS Breakdown"
          description="Promoters (9-10) · Passives (7-8) · Detractors (0-6)"
          data-testid="nps-breakdown"
        >
          {npsTotal === 0 ? (
            <p className="text-foreground-muted text-sm">No NPS responses in period.</p>
          ) : (
            <StackedBar
              segments={[
                { label: "Promoters", value: data.npsBreakdown.promoters, tone: "success" },
                { label: "Passives", value: data.npsBreakdown.passives, tone: "warning" },
                { label: "Detractors", value: data.npsBreakdown.detractors, tone: "danger" },
              ]}
              legend
              data-testid="nps-stacked-bar"
            />
          )}
        </SectionCard>

        <SectionCard
          title="Score Distribution"
          description="Count of responses at each overall score (0–10)"
          data-testid="score-distribution"
        >
          <div className="flex flex-col gap-1.5">
            {data.scoreDistribution.map((b) => {
              const maxBucket = Math.max(...data.scoreDistribution.map((d) => d.count), 1);
              const pct = (b.count / maxBucket) * 100;
              const tone =
                b.score >= 8
                  ? "bg-status-success-solid"
                  : b.score >= 5
                    ? "bg-status-warning-solid"
                    : "bg-status-danger-solid";
              return (
                <div key={b.score} className="flex items-center gap-2 text-xs">
                  <span className="text-foreground-muted w-3 text-right tabular-nums">
                    {b.score}
                  </span>
                  <div className="bg-muted h-4 flex-1 overflow-hidden rounded-sm">
                    <div
                      className={`${tone} h-full rounded-sm transition-[width] duration-300`}
                      style={{ width: `${pct}%` }}
                      aria-hidden
                    />
                  </div>
                  <span className="text-foreground-muted w-6 text-right tabular-nums">
                    {b.count}
                  </span>
                </div>
              );
            })}
          </div>
        </SectionCard>
      </div>

      {/* Sentiment trend */}
      {sentimentSeries.length >= 2 && (
        <SectionCard
          title="Sentiment Trend"
          description="Daily avg overall score across the period."
          data-testid="sentiment-trend"
        >
          <div className="h-16 w-full">
            <Sparkline
              data={sentimentSeries}
              tone="brand"
              label="Daily avg sentiment"
              width={800}
              height={64}
              className="w-full"
            />
          </div>
          <div className="text-foreground-muted mt-1 flex justify-between font-mono text-xs">
            <span>{data.sentimentTrend[0]?.date}</span>
            <span>{data.sentimentTrend[data.sentimentTrend.length - 1]?.date}</span>
          </div>
        </SectionCard>
      )}

      {/* Complaint themes + Channel + Experience — 3-col on xl */}
      <div className="grid grid-cols-1 gap-6 xl:grid-cols-3">
        <SectionCard
          title="Complaint Themes"
          description="Top keywords from negative responses (score ≤ 6)."
          data-testid="complaint-themes"
        >
          {data.complaintThemes.length === 0 ? (
            <p className="text-foreground-muted text-sm">No negative feedback in period.</p>
          ) : (
            <div className="flex flex-wrap gap-2">
              {data.complaintThemes.map((kw) => (
                <Badge
                  key={kw.keyword}
                  variant="outline"
                  className="text-xs"
                  data-testid={`keyword-${kw.keyword}`}
                >
                  {kw.keyword}
                  <span className="text-foreground-muted ml-1 tabular-nums">×{kw.count}</span>
                </Badge>
              ))}
            </div>
          )}
        </SectionCard>

        <SectionCard
          title="By Channel"
          description="Responses per survey source."
          data-testid="channel-breakdown"
        >
          <BarList
            items={data.channelBreakdown.map((ch) => ({
              rawValue: ch.count,
              value: String(ch.count),
              label: SOURCE_LABELS[ch.source] ?? ch.source,
            }))}
          />
        </SectionCard>

        <SectionCard
          title="By Experience"
          description="Avg score per experience."
          data-testid="experience-scores"
        >
          {data.experienceScores.length === 0 ? (
            <p className="text-foreground-muted text-sm">No linked responses.</p>
          ) : (
            <BarList
              items={data.experienceScores.map((exp) => ({
                rawValue: exp.avgScore,
                value: String(exp.avgScore),
                label: exp.experienceName,
                meta: `${exp.count} responses`,
              }))}
            />
          )}
        </SectionCard>
      </div>
    </div>
  );
}
