"use client";

import * as React from "react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";

/**
 * Portal-scoped client providers — mounted from each staff-portal layout
 * (`/admin`, `/management`, `/crew`). Keeps QueryClient off auth + guest +
 * kitchen-sink routes where it's pure overhead.
 *
 * Defaults are deliberately short-lived (`staleTime: 0`) so every call site
 * must opt into staler data consciously. Matches frontend_spec.md §"Server
 * state" contract ("defaults NOT acceptable — explicit per query").
 */

const GC_TIME_MS = 5 * 60 * 1000; // evict inactive cache entries after 5 min

function makeQueryClient(): QueryClient {
  return new QueryClient({
    defaultOptions: {
      queries: {
        staleTime: 0,
        gcTime: GC_TIME_MS,
        refetchOnWindowFocus: false,
        retry: 1,
      },
      mutations: {
        retry: 0,
      },
    },
  });
}

export function PortalProviders({ children }: Readonly<{ children: React.ReactNode }>) {
  const [queryClient] = React.useState(() => makeQueryClient());
  return <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>;
}
