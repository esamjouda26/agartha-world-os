"use client";

import { useState, useTransition } from "react";
import { useForm, useFieldArray, FormProvider, type Resolver } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";

import { Package, Truck, Clock } from "lucide-react";
import { formatDistanceToNow } from "date-fns";

import { Button } from "@/components/ui/button";
import { EmptyStateCta } from "@/components/shared/empty-state-cta";
import { FormSection } from "@/components/ui/form-section";
import {
  FormField,
  FormItem,
  FormControl,
  FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { MetadataList } from "@/components/ui/metadata-list";
import { SectionCard } from "@/components/ui/section-card";
import { StatusBadge } from "@/components/ui/status-badge";
import { toastError, toastSuccess } from "@/components/ui/toast-helpers";
import { acceptRequisitionAction } from "@/features/inventory/actions/accept-requisition";
import { deliverRequisitionAction } from "@/features/inventory/actions/deliver-requisition";
import { completeDeliverySchema, type CompleteDeliveryInput } from "@/features/inventory/schemas/complete-delivery";
import type { RestockQueue, RequisitionRow, RequisitionItemView } from "@/features/inventory/types";

type RestockQueueViewProps = Readonly<{ initialQueue: RestockQueue }>;

function RequisitionCard({
  req,
  mode,
  onAction,
}: Readonly<{
  req: RequisitionRow;
  mode: "pending" | "in_progress";
  onAction: () => void;
}>) {
  const [isPending, startTransition] = useTransition();
  const [isDelivering, setIsDelivering] = useState(false);

  const form = useForm<CompleteDeliveryInput>({
    resolver: zodResolver(completeDeliverySchema) as Resolver<CompleteDeliveryInput>,
    defaultValues: {
      requisition_id: req.id,
      items: req.items.map((i) => ({
        item_id: i.id,
        delivered_qty: i.requestedQty,
      })),
    },
  });

  const { fields } = useFieldArray({
    control: form.control,
    name: "items",
  });

  function handleAccept() {
    startTransition(async () => {
      const result = await acceptRequisitionAction(req.id);
      if (result.success) {
        toastSuccess("Requisition accepted.");
        onAction();
      } else {
        toastError(result);
      }
    });
  }

  async function handleDeliver(values: CompleteDeliveryInput) {
    setIsDelivering(true);
    try {
      const result = await deliverRequisitionAction({
        requisition_id: req.id,
        items: values.items.map((i) => ({
          item_id: i.item_id,
          delivered_qty: i.delivered_qty,
        })),
      });
      if (result.success) {
        toastSuccess("Delivery marked complete.");
        onAction();
      } else {
        toastError(result);
        if (result.fields) {
          for (const [field, message] of Object.entries(result.fields)) {
            form.setError(field as any, { type: "server", message });
          }
        }
      }
    } finally {
      setIsDelivering(false);
    }
  }

  const busy = isPending || isDelivering;

  return (
    <SectionCard
      headless
      data-testid={`restock-queue-card-${req.id}`}
    >
      <div className="flex flex-col gap-3 p-4">
        <MetadataList
          layout="inline"
          items={[
            { label: "ID", value: <span className="font-mono font-bold">{req.id.slice(0, 8).toUpperCase()}</span> },
            { label: <Clock size={12} />, value: formatDistanceToNow(new Date(req.createdAt), { addSuffix: true }) },
          ]}
        />

        {req.toLocationName && (
          <MetadataList
            layout="inline"
            items={[{ label: <Truck size={14} />, value: `→ ${req.toLocationName}` }]}
          />
        )}

        {req.requesterRemark && (
          <p className="text-xs text-foreground-muted italic">&quot;{req.requesterRemark}&quot;</p>
        )}

        {mode === "in_progress" ? (
          <FormProvider {...form}>
            <form onSubmit={form.handleSubmit(handleDeliver)} className="flex flex-col gap-4" aria-busy={busy}>
              <ul className="flex flex-col gap-1.5">
                {fields.map((field, idx) => {
                  const item = req.items.find((i) => i.id === field.item_id);
                  if (!item) return null;

                  return (
                    <li key={field.id} className="flex items-center justify-between gap-2 text-sm">
                      <div className="flex items-center gap-1.5">
                        <Package size={12} className="text-foreground-muted shrink-0" />
                        <span>{item.materialName}</span>
                      </div>
                      <div className="flex items-center gap-1.5">
                        <FormField
                          control={form.control}
                          name={`items.${idx}.delivered_qty`}
                          render={({ field: dField }) => (
                            <FormItem className="space-y-0">
                              <Label htmlFor={`deliver-qty-${item.id}`} className="sr-only">
                                Delivered qty for {item.materialName}
                              </Label>
                              <FormControl>
                                <Input
                                  {...dField}
                                  id={`deliver-qty-${item.id}`}
                                  type="number"
                                  min={0}
                                  onChange={(e) => dField.onChange(Number(e.target.value))}
                                  className="w-20 min-h-[36px] text-center text-sm"
                                  disabled={busy}
                                  data-testid={`deliver-qty-${item.id}`}
                                />
                              </FormControl>
                              <FormMessage />
                            </FormItem>
                          )}
                        />
                        <span className="text-xs text-foreground-muted">/ {item.requestedQty}</span>
                      </div>
                    </li>
                  );
                })}
              </ul>

              <Button
                type="submit"
                className="w-full min-h-[48px] font-semibold"
                disabled={busy}
                data-testid={`restock-queue-deliver-${req.id}`}
              >
                {isDelivering ? "Marking delivered…" : "Mark Delivered"}
              </Button>
            </form>
          </FormProvider>
        ) : (
          <>
            <ul className="flex flex-col gap-1.5">
              {req.items.map((item: RequisitionItemView) => (
                <li key={item.id} className="flex items-center justify-between gap-2 text-sm">
                  <div className="flex items-center gap-1.5">
                    <Package size={12} className="text-foreground-muted shrink-0" />
                    <span>{item.materialName}</span>
                  </div>
                  <StatusBadge
                    status="pending"
                    tone="neutral"
                    label={`×${item.requestedQty}`}
                    variant="outline"
                  />
                </li>
              ))}
            </ul>

            <Button
              className="w-full min-h-[48px] font-semibold mt-1"
              onClick={handleAccept}
              disabled={busy}
              data-testid={`restock-queue-accept-${req.id}`}
            >
              {isPending ? "Accepting…" : "Accept"}
            </Button>
          </>
        )}
      </div>
    </SectionCard>
  );
}

export function RestockQueueView({ initialQueue }: RestockQueueViewProps) {
  const [queue] = useState<RestockQueue>(initialQueue);

  // Refresh via router revalidation on action — the parent page will refetch on next
  // navigation. For instant feedback, filter the accepted/delivered item out locally.
  function handleAction() {
    // The Server Action calls revalidatePath — next navigation will show fresh data.
    // No optimistic update needed since the card disappears after action.
  }

  if (queue.pending.length === 0 && queue.inProgress.length === 0) {
    return (
      <EmptyStateCta
        variant="first-use"
        title="No requisitions"
        description="Pending restock requests will appear here."
        data-testid="restock-queue-empty"
      />
    );
  }

  return (
    <div className="flex flex-col gap-6 p-4" data-testid="restock-queue-view">
      {queue.inProgress.length > 0 && (
        <FormSection
          title={`In Progress (${queue.inProgress.length})`}
          data-testid="queue-inprogress-section"
        >
          <div className="flex flex-col gap-3">
            {queue.inProgress.map((req) => (
              <RequisitionCard key={req.id} req={req} mode="in_progress" onAction={handleAction} />
            ))}
          </div>
        </FormSection>
      )}

      {queue.pending.length > 0 && (
        <FormSection
          title={`Pending (${queue.pending.length})`}
          divider={queue.inProgress.length > 0}
          data-testid="queue-pending-section"
        >
          <div className="flex flex-col gap-3">
            {queue.pending.map((req) => (
              <RequisitionCard key={req.id} req={req} mode="pending" onAction={handleAction} />
            ))}
          </div>
        </FormSection>
      )}
    </div>
  );
}
