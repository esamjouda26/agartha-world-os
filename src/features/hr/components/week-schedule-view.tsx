"use client";

import {
  addWeeks,
  format,
  getISOWeek,
  getISOWeekYear,
  isToday,
  parseISO,
  startOfISOWeek,
  subWeeks,
} from "date-fns";
import { ChevronLeft, ChevronRight, MapPin, Clock, Coffee, Palmtree } from "lucide-react";
import { useRouter, usePathname } from "next/navigation";

import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { MetadataList } from "@/components/ui/metadata-list";
import { PageHeader } from "@/components/ui/page-header";
import { SectionCard } from "@/components/ui/section-card";
import { StatusBadge } from "@/components/ui/status-badge";
import type { MyScheduleData, ScheduleDay } from "@/features/hr/queries/get-my-schedule";

// ── Helpers ──────────────────────────────────────────────────────────────────

const DAY_LABELS = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"] as const;

/** Format a Date as ISO week string: "RRRR-'W'II" — e.g. "2026-W17" */
function formatISOWeek(date: Date): string {
  const year = getISOWeekYear(date);
  const week = String(getISOWeek(date)).padStart(2, "0");
  return `${year}-W${week}`;
}

/** Parse "YYYY-Wnn" back to the Monday of that ISO week. */
function parseISOWeekStr(weekStr: string): Date {
  const match = /^(\d{4})-W(\d{2})$/.exec(weekStr);
  if (!match || match[1] === undefined || match[2] === undefined) {
    return startOfISOWeek(new Date());
  }
  const year = parseInt(match[1], 10);
  const week = parseInt(match[2], 10);
  const jan4 = new Date(year, 0, 4);
  const weekOneMonday = startOfISOWeek(jan4);
  return addWeeks(weekOneMonday, week - 1);
}

/** Convert "HH:MM:SS" or "HH:MM" to "h:mm A". */
function formatTime(time: string): string {
  const [hourStr, minuteStr] = time.split(":");
  const hour = parseInt(hourStr ?? "0", 10);
  const minute = minuteStr ?? "00";
  const period = hour >= 12 ? "PM" : "AM";
  const displayHour = hour % 12 === 0 ? 12 : hour % 12;
  return `${displayHour}:${minute} ${period}`;
}

// ── Main Component ───────────────────────────────────────────────────────────

type WeekScheduleViewProps = Readonly<{
  /** Server-resolved schedule data for the requested week. */
  initialData: MyScheduleData | null;
  /** The ISO week string currently being displayed, e.g. "2026-W17". */
  currentWeek: string;
  /** Human-readable label, e.g. "Apr 20 – Apr 26, 2026". */
  weekLabel: string;
}>;

export function WeekScheduleView({ initialData, currentWeek, weekLabel }: WeekScheduleViewProps) {
  const router = useRouter();
  const pathname = usePathname();

  const currentWeekDate = parseISOWeekStr(currentWeek);

  function navigateWeek(direction: "prev" | "next"): void {
    const target =
      direction === "prev" ? subWeeks(currentWeekDate, 1) : addWeeks(currentWeekDate, 1);
    const weekParam = formatISOWeek(target);
    // Full RSC navigation — page.tsx re-executes, getMySchedule() fetches
    // the correct date range, fresh data flows down via props.
    const url = `${pathname}?week=${weekParam}`;
    router.push(url as Parameters<typeof router.push>[0]);
  }

  return (
    <div data-testid="week-schedule-view" className="flex flex-col gap-4">
      <PageHeader
        title="My Schedule"
        description="Your weekly shifts and leave"
        density="compact"
        data-testid="schedule-page-header"
      />
      {/* Header: location + week navigation */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        {initialData?.locationName ? (
          <MetadataList
            layout="inline"
            items={[
              { label: <MapPin aria-hidden className="size-4" />, value: initialData.locationName },
            ]}
          />
        ) : null}

        <div className="flex items-center gap-2">
          <Button
            type="button"
            variant="outline"
            size="icon-sm"
            onClick={() => navigateWeek("prev")}
            aria-label="Previous week"
            data-testid="schedule-prev-week"
            className="min-h-11 min-w-11"
          >
            <ChevronLeft aria-hidden className="size-4" />
          </Button>

          <span className="text-foreground min-w-[10rem] text-center text-sm font-medium tabular-nums">
            {weekLabel}
          </span>

          <Button
            type="button"
            variant="outline"
            size="icon-sm"
            onClick={() => navigateWeek("next")}
            aria-label="Next week"
            data-testid="schedule-next-week"
            className="min-h-11 min-w-11"
          >
            <ChevronRight aria-hidden className="size-4" />
          </Button>
        </div>
      </div>

      {/* No staff record linked */}
      {initialData === null ? (
        <Card>
          <CardContent className="py-10 text-center">
            <p className="text-foreground-muted text-sm">
              Your schedule is not available. Contact HR to link your staff record.
            </p>
          </CardContent>
        </Card>
      ) : (
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-7">
          {initialData.days.map((day, index) => (
            <DayCard key={day.shiftDate} label={DAY_LABELS[index] ?? ""} day={day} />
          ))}
        </div>
      )}
    </div>
  );
}

// ── DayCard ──────────────────────────────────────────────────────────────────

type DayCardProps = Readonly<{
  label: string;
  day: ScheduleDay;
}>;

function DayCard({ label, day }: DayCardProps) {
  const displayDate = format(parseISO(day.shiftDate), "d MMM");
  const today = isToday(parseISO(day.shiftDate));

  // Priority: on-leave flag takes precedence over off-day because the
  // crew member may have an approved leave on a normally-working day.
  // Off-day means no shift is scheduled — this is a rest day.
  const variant: "working" | "off" | "leave" = day.isOnLeave
    ? "leave"
    : day.isOffDay
      ? "off"
      : "working";

  return (
    <SectionCard
      headless
      className={today ? "ring-brand-primary/50 border-brand-primary/40 ring-2" : ""}
      data-testid={`schedule-day-${day.shiftDate}`}
    >
      <div className="flex flex-col gap-2.5 p-4">
        {/* Day header */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-1.5">
            <span className="text-foreground text-xs font-semibold tracking-widest uppercase">
              {label}
            </span>
            {today ? <StatusBadge status="active" tone="success" label="Today" /> : null}
          </div>
          <span className="text-foreground-muted text-xs tabular-nums">{displayDate}</span>
        </div>

        {/* Status */}
        {variant === "leave" ? (
          <div className="bg-status-warning-soft flex items-center gap-2 rounded-lg px-3 py-2">
            <Palmtree size={14} className="text-status-warning-foreground shrink-0" />
            <span className="text-status-warning-foreground text-sm font-medium">On Leave</span>
          </div>
        ) : variant === "off" ? (
          <div className="bg-surface flex items-center gap-2 rounded-lg px-3 py-2">
            <Coffee size={14} className="text-foreground-muted shrink-0" />
            <span className="text-foreground-muted text-sm font-medium">Rest Day</span>
          </div>
        ) : (
          <div className="flex flex-col gap-1.5">
            {day.shiftTypeName ? (
              <span className="text-foreground text-sm font-semibold">{day.shiftTypeName}</span>
            ) : null}
            {day.startTime && day.endTime ? (
              <MetadataList
                layout="inline"
                items={[
                  {
                    label: <Clock size={12} className="shrink-0" />,
                    value: `${formatTime(day.startTime)} – ${formatTime(day.endTime)}`,
                  },
                ]}
              />
            ) : null}
          </div>
        )}
      </div>
    </SectionCard>
  );
}
