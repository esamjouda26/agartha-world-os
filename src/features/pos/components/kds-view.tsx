"use client";

import { useEffect, useState, useTransition } from "react";

import { formatDistanceToNow } from "date-fns";
import { Clock, ChefHat } from "lucide-react";
import { useQuery, useQueryClient } from "@tanstack/react-query";

import { Button } from "@/components/ui/button";
import { EmptyStateCta } from "@/components/shared/empty-state-cta";
import { FormSection } from "@/components/ui/form-section";
import { MetadataList } from "@/components/ui/metadata-list";
import { SectionCard } from "@/components/ui/section-card";
import { StatusBadge } from "@/components/ui/status-badge";
import { toastError, toastSuccess } from "@/components/ui/toast-helpers";
import { completeOrderAction } from "@/features/pos/actions/complete-order";
import { createSupabaseBrowserClient } from "@/lib/supabase/browser";
import { ACTIVE_ORDERS_QUERY_KEY, fetchActiveOrders } from "@/features/pos/queries/active-orders-query";
import type { KdsOrder } from "@/features/pos/types";

type KDSViewProps = Readonly<{ initialOrders: ReadonlyArray<KdsOrder> }>;

// ── Local: elapsed-time hook ──────────────────────────────────────────────────

/** Live elapsed time ticker — rerenders every 30 s so overdue status can flip. */
function useElapsedLabel(createdAt: string): string {
  const [label, setLabel] = useState(() =>
    formatDistanceToNow(new Date(createdAt), { addSuffix: false }),
  );
  useEffect(() => {
    const id = setInterval(() => {
      setLabel(formatDistanceToNow(new Date(createdAt), { addSuffix: false }));
    }, 30_000);
    return () => clearInterval(id);
  }, [createdAt]);
  return label;
}

// ── Local: KdsOrderCard ───────────────────────────────────────────────────────

type KdsOrderCardProps = Readonly<{ order: KdsOrder }>;

function KdsOrderCard({ order }: KdsOrderCardProps) {
  const elapsedLabel = useElapsedLabel(order.createdAt);
  const [isPending, startTransition] = useTransition();

  function handleComplete() {
    startTransition(async () => {
      const result = await completeOrderAction(order.id);
      if (result.success) {
        toastSuccess(`Order ${order.shortId} marked completed.`);
      } else {
        toastError(result);
      }
    });
  }

  return (
    <SectionCard
      headless
      className={
        order.isOverdue
          ? "border-status-danger-border bg-status-danger-soft/30"
          : ""
      }
      data-testid={`kds-order-card-${order.id}`}
    >
      <div
        className="flex flex-col gap-3 p-4"
        aria-label={`Order ${order.shortId}, ${order.isOverdue ? "overdue" : "in queue"}`}
      >
        <div className="flex items-center justify-between gap-2">
          <div className="flex items-center gap-2">
            <span className="font-mono text-sm font-bold">{order.shortId}</span>
            <StatusBadge
              status={order.isOverdue ? "overdue" : "preparing"}
              tone={order.isOverdue ? "danger" : "info"}
              label={`${order.itemCount} item${order.itemCount !== 1 ? "s" : ""}`}
            />
          </div>
          <MetadataList
            layout="inline"
            items={[{ label: <Clock size={12} />, value: elapsedLabel }]}
          />
        </div>

        <MetadataList
          layout="inline"
          items={[{ label: <ChefHat size={12} />, value: order.posPointName }]}
          className="text-foreground-muted"
        />

        <ul className="flex flex-col gap-1.5" aria-label="Order items">
          {order.items.map((item) => (
            <li key={item.id} className="text-sm">
              <span className="font-medium">
                {item.quantity}× {item.materialName}
              </span>
              {item.modifiers.length > 0 && (
                <span className="ml-1 text-foreground-muted text-xs">
                  ({item.modifiers.map((m) => m.optionName).join(", ")})
                </span>
              )}
            </li>
          ))}
        </ul>

        <Button
          className="mt-1 w-full min-h-[48px] font-semibold"
          onClick={handleComplete}
          disabled={isPending}
          data-testid={`kds-complete-button-${order.id}`}
        >
          {isPending ? "Marking done…" : "Mark Completed"}
        </Button>
      </div>
    </SectionCard>
  );
}

// ── Main: KDSView ─────────────────────────────────────────────────────────────

/**
 * KDS live view — React Query for server-state + Supabase Realtime to
 * invalidate on INSERT/UPDATE to `orders`. Per prompt.md Absolute Rule #18,
 * useEffect is used exclusively for the subscription cleanup,
 * not for data fetching.
 */
export function KDSView({ initialOrders }: KDSViewProps) {
  const queryClient = useQueryClient();

  const { data: orders = initialOrders } = useQuery({
    queryKey: ACTIVE_ORDERS_QUERY_KEY,
    queryFn: () => {
      const supabase = createSupabaseBrowserClient();
      return fetchActiveOrders(supabase);
    },
    initialData: initialOrders,
    staleTime: 10_000,
    gcTime: 60_000,
    refetchOnWindowFocus: true,
  });

  // Realtime subscription — useEffect is the correct hook for subscriptions
  // with cleanup. Per prompt.md §18, useEffect is reserved for exactly this.
  // Per prompt.md §23: explicit filter + cleanup; ≤ 2 channels per route.
  useEffect(() => {
    const supabase = createSupabaseBrowserClient();
    const channel = supabase
      .channel("kds-orders")
      .on(
        "postgres_changes",
        { event: "INSERT", schema: "public", table: "orders", filter: "status=eq.preparing" },
        () => {
          queryClient.invalidateQueries({ queryKey: ACTIVE_ORDERS_QUERY_KEY });
        },
      )
      .on(
        "postgres_changes",
        { event: "UPDATE", schema: "public", table: "orders" },
        () => {
          queryClient.invalidateQueries({ queryKey: ACTIVE_ORDERS_QUERY_KEY });
        },
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [queryClient]);

  const overdueOrders = orders.filter((o) => o.isOverdue);
  const queuedOrders = orders.filter((o) => !o.isOverdue);

  if (orders.length === 0) {
    return (
      <div className="p-4">
        <EmptyStateCta
          variant="first-use"
          title="No active orders"
          description="Preparing orders will appear here in real time."
          data-testid="kds-empty-state"
        />
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-6 p-4">
      {overdueOrders.length > 0 && (
        <FormSection
          title={`⚠ Overdue (${overdueOrders.length})`}
          data-testid="kds-overdue-section"
        >
          <div className="flex flex-col gap-3 sm:grid sm:grid-cols-2 lg:grid-cols-3">
            {overdueOrders.map((order) => (
              <KdsOrderCard key={order.id} order={order} />
            ))}
          </div>
        </FormSection>
      )}

      {queuedOrders.length > 0 && (
        <FormSection
          title={`In Queue (${queuedOrders.length})`}
          divider={overdueOrders.length > 0}
          data-testid="kds-queue-section"
        >
          <div className="flex flex-col gap-3 sm:grid sm:grid-cols-2 lg:grid-cols-3">
            {queuedOrders.map((order) => (
              <KdsOrderCard key={order.id} order={order} />
            ))}
          </div>
        </FormSection>
      )}
    </div>
  );
}
