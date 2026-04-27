"use client";

import * as React from "react";
import { ChevronDown, ChevronUp, Eye, ShieldCheck, Trash2 } from "lucide-react";
import { useTranslations } from "next-intl";

import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

import type { BiometricAccessLogEntry } from "@/features/booking/queries/get-biometrics-context";

/**
 * BiometricAccessLogStrip — collapsible per-attendee audit visibility.
 *
 * Spec: frontend_spec.md:3644 — "Last match attempt: {timestamp}, Total
 * matches: {n}". Renders the most-recent five `biometric_access_log`
 * entries so the guest can see every time their template was touched.
 *
 * Collapsed by default — most users don't audit on every visit, and the
 * privacy-decision controls above are the page's primary work.
 */

export type BiometricAccessLogStripProps = Readonly<{
  entries: readonly BiometricAccessLogEntry[];
  className?: string;
  "data-testid"?: string;
}>;

const EVENT_ICON: Record<
  BiometricAccessLogEntry["event"],
  React.ComponentType<{ className?: string }>
> = {
  enroll: ShieldCheck,
  match_attempt: Eye,
  withdraw_and_delete: Trash2,
  auto_delete_retention: Trash2,
  dsr_erasure: Trash2,
};

export function BiometricAccessLogStrip({
  entries,
  className,
  "data-testid": testId,
}: BiometricAccessLogStripProps) {
  const t = useTranslations("guest.biometrics");
  const [open, setOpen] = React.useState(false);
  const matchAttempts = entries.filter((e) => e.event === "match_attempt").length;
  const eventLabel = (event: BiometricAccessLogEntry["event"]): string => t(`auditEvent.${event}`);

  return (
    <section
      data-slot="biometric-access-log-strip"
      data-testid={testId ?? "biometric-access-log-strip"}
      className={cn(
        "border-border-subtle text-foreground-muted flex flex-col gap-2 rounded-lg border-t pt-3 text-xs",
        className,
      )}
    >
      <Button
        type="button"
        variant="ghost"
        size="sm"
        onClick={() => setOpen((v) => !v)}
        aria-expanded={open}
        className="text-foreground-muted hover:text-foreground -ml-2 self-start"
        data-testid={testId ? `${testId}-toggle` : undefined}
      >
        {open ? (
          <ChevronUp aria-hidden className="size-4" />
        ) : (
          <ChevronDown aria-hidden className="size-4" />
        )}
        {t("auditToggleTitle")}
        {entries.length > 0 ? <span> {t("auditCount", { count: entries.length })}</span> : null}
        {matchAttempts > 0 ? (
          <span className="text-foreground-subtle ml-1.5 font-normal">
            · {t("auditMatchAttempts", { count: matchAttempts })}
          </span>
        ) : null}
      </Button>

      {open ? (
        entries.length === 0 ? (
          <p className="text-foreground-subtle px-2 py-1">{t("auditEmpty")}</p>
        ) : (
          <ul className="flex flex-col gap-2">
            {entries.map((entry) => {
              const Icon = EVENT_ICON[entry.event];
              return (
                <li
                  key={entry.id}
                  className="flex items-start gap-2.5 rounded-md px-2 py-1.5"
                  data-testid={`access-log-entry-${entry.id}`}
                >
                  <Icon
                    aria-hidden
                    className={cn(
                      "mt-0.5 size-3.5 shrink-0",
                      entry.event === "match_attempt"
                        ? "text-status-info-foreground"
                        : entry.event === "enroll"
                          ? "text-status-success-foreground"
                          : "text-status-warning-foreground",
                    )}
                  />
                  <div className="flex flex-col gap-0.5">
                    <span className="text-foreground font-medium">
                      {eventLabel(entry.event)}
                      {entry.event === "match_attempt" ? (
                        <span
                          className={cn(
                            "ml-1.5 text-xs font-normal",
                            entry.match_result
                              ? "text-status-success-foreground"
                              : "text-status-danger-foreground",
                          )}
                        >
                          · {entry.match_result ? t("auditMatchApproved") : t("auditMatchDenied")}
                        </span>
                      ) : null}
                    </span>
                    <span className="text-foreground-subtle">
                      {new Date(entry.created_at).toLocaleString("en-MY")}
                      {" · "}
                      {entry.actor_type === "guest_self"
                        ? t("auditActorBy")
                        : entry.actor_type === "staff"
                          ? t("auditActorByStaff")
                          : t("auditActorBySystem")}
                    </span>
                  </div>
                </li>
              );
            })}
          </ul>
        )
      ) : null}
    </section>
  );
}
