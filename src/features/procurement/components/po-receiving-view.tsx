"use client";

import { useEffect, useState, useTransition } from "react";

import { useRouter } from "@/i18n/navigation";

import { Button } from "@/components/ui/button";
import { CollapsibleSection } from "@/components/ui/collapsible-section";
import { EmptyStateCta } from "@/components/shared/empty-state-cta";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { PageHeader } from "@/components/ui/page-header";
import { StatusBadge } from "@/components/ui/status-badge";
import { toastError, toastSuccess } from "@/components/ui/toast-helpers";
import { createSupabaseBrowserClient } from "@/lib/supabase/browser";
import { receivePoItemsAction } from "@/features/procurement/actions/receive-po-items";
import type { ReceivablePoRow, PoItemView } from "@/features/procurement/types";

type ReceivedQtys = Record<string, number>;

function PoCard({ po }: Readonly<{ po: ReceivablePoRow }>) {
  const router = useRouter();
  const [receivedQtys, setReceivedQtys] = useState<ReceivedQtys>(() =>
    Object.fromEntries(po.items.map((i) => [i.id, i.receivedQty ?? 0])),
  );
  const [isPending, startTransition] = useTransition();

  function prefillAll() {
    setReceivedQtys(Object.fromEntries(po.items.map((i) => [i.id, i.expectedQty])));
  }

  function handleReceive() {
    startTransition(async () => {
      const result = await receivePoItemsAction({
        po_id: po.id,
        items: po.items.map((i: PoItemView) => ({
          item_id: i.id,
          received_qty: receivedQtys[i.id] ?? 0,
        })),
      });
      if (result.success) {
        toastSuccess(`PO received successfully.`);
        // Refetch RSC so the PO either disappears (status → completed) or
        // re-renders with updated received_qty. Don't trust the Realtime
        // UPDATE listener alone — the actor's UI must update deterministically.
        router.refresh();
      } else {
        toastError(result);
      }
    });
  }

  return (
    <CollapsibleSection
      title={po.supplierName}
      description={`${po.orderDate ?? "No date"} · ${po.items.length} line${po.items.length !== 1 ? "s" : ""}`}
      action={
        <StatusBadge
          status={po.status ?? "sent"}
          enum="po_status"
          data-testid={`po-status-${po.id}`}
        />
      }
      variant="card"
      data-testid={`po-card-${po.id}`}
    >
      <div className="flex flex-col gap-4">
        <Button
          type="button"
          variant="outline"
          size="sm"
          className="min-h-[40px] self-start"
          onClick={prefillAll}
          data-testid={`po-receive-all-${po.id}`}
        >
          Receive All
        </Button>

        <ul className="flex flex-col gap-3">
          {po.items.map((item: PoItemView) => (
            <li key={item.id} className="flex items-center justify-between gap-3">
              <span className="flex-1 truncate text-sm">{item.materialName}</span>
              <div className="flex shrink-0 items-center gap-2">
                <Label htmlFor={`po-recv-${item.id}`} className="sr-only">
                  Received qty for {item.materialName}
                </Label>
                <Input
                  id={`po-recv-${item.id}`}
                  type="number"
                  min={0}
                  value={receivedQtys[item.id] ?? 0}
                  onChange={(e) =>
                    setReceivedQtys((prev) => ({ ...prev, [item.id]: Number(e.target.value) }))
                  }
                  className="min-h-[40px] w-20 text-center"
                  data-testid={`po-recv-qty-${item.id}`}
                />
                <span className="text-foreground-muted w-12 text-xs">/ {item.expectedQty}</span>
              </div>
            </li>
          ))}
        </ul>

        <Button
          className="min-h-[48px] w-full font-semibold"
          onClick={handleReceive}
          disabled={isPending}
          data-testid={`po-submit-receive-${po.id}`}
        >
          {isPending ? "Saving…" : "Confirm Receipt"}
        </Button>
      </div>
    </CollapsibleSection>
  );
}

export function PoReceivingView({ pos }: Readonly<{ pos: ReadonlyArray<ReceivablePoRow> }>) {
  const router = useRouter();

  // Realtime subscription on `purchase_orders` UPDATE per
  // frontend_spec.md:3268 — newly sent or status-transitioned POs appear
  // without a manual refresh. router.refresh() refetches the RSC tree.
  useEffect(() => {
    const supabase = createSupabaseBrowserClient();
    const channel = supabase
      .channel("crew-po-receiving")
      .on("postgres_changes", { event: "UPDATE", schema: "public", table: "purchase_orders" }, () =>
        router.refresh(),
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [router]);

  if (pos.length === 0) {
    return (
      <div className="flex flex-col gap-4">
        <PageHeader
          title="PO Receiving"
          description="Enter received quantities for incoming orders"
          density="compact"
          data-testid="po-receiving-page-header"
        />
        <div className="p-4">
          <EmptyStateCta
            variant="first-use"
            title="No pending deliveries"
            description="Purchase orders awaiting receipt will appear here."
            data-testid="po-receiving-empty"
          />
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-3" data-testid="po-receiving-view">
      <PageHeader
        title="PO Receiving"
        description="Enter received quantities for incoming orders"
        density="compact"
        data-testid="po-receiving-page-header"
      />
      {pos.map((po) => (
        <PoCard key={po.id} po={po} />
      ))}
    </div>
  );
}
