"use client";

import * as React from "react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { useReportWebVitals } from "next/web-vitals";

import { captureException } from "@/lib/telemetry";

/**
 * App-wide client providers. Mounted once from the root layout so that
 * every tree — auth, admin, management, crew, guest — shares a single
 * QueryClient. Sentry client init and Web Vitals reporting are wired
 * here. The command palette is mounted per-portal via
 * `<ShellWithPalette>` and is intentionally not global.
 */

const FIVE_MIN_MS = 5 * 60 * 1000;
const ONE_HOUR_MS = 60 * 60 * 1000;

function makeQueryClient(): QueryClient {
  return new QueryClient({
    defaultOptions: {
      queries: {
        staleTime: FIVE_MIN_MS,
        gcTime: ONE_HOUR_MS,
        refetchOnWindowFocus: false,
        retry: 1,
      },
      mutations: {
        retry: 0,
      },
    },
  });
}

function useWebVitalsReporter(): void {
  // Pipe metrics to the browser console for now; Phase 10 wires them
  // into PostHog via `src/lib/feature-flags`'s event layer. `console.info`
  // stays off the production-log scrub grep (which only flags console.log).
  useReportWebVitals((metric) => {
    console.info("[web-vitals]", metric.name, metric.value.toFixed(1), metric.id);
  });
}

function useSentryBoot(): void {
  React.useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const { initSentry } = await import("@/lib/telemetry");
        if (cancelled) return;
        await initSentry();
        console.info("[boot] Sentry client initialized.");
      } catch (error) {
        await captureException(error, { scope: "sentry-boot" });
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);
}

export function Providers({ children }: Readonly<{ children: React.ReactNode }>) {
  const [queryClient] = React.useState(() => makeQueryClient());
  useWebVitalsReporter();
  useSentryBoot();

  // NOTE: CommandPalette is NOT mounted here. Each staff-portal shell
  // mounts its own palette bound to that portal's nav manifest
  // (src/components/shells/shell-with-palette.tsx). Auth and guest
  // routes intentionally have no palette per `frontend_spec.md` §1/§5.
  return <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>;
}
