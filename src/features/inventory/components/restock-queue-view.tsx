"use client";

import { useEffect, useState, useTransition } from "react";
import { useForm, useFieldArray, FormProvider, type Resolver } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";

import { useRouter } from "@/i18n/navigation";

import { Package, Truck, Clock } from "lucide-react";
import { formatDistanceToNow } from "date-fns";

import { Button } from "@/components/ui/button";
import { EmptyStateCta } from "@/components/shared/empty-state-cta";
import { FormSection } from "@/components/ui/form-section";
import { FormField, FormItem, FormControl, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { MetadataList } from "@/components/ui/metadata-list";
import { PageHeader } from "@/components/ui/page-header";
import { SectionCard } from "@/components/ui/section-card";
import { StatusBadge } from "@/components/ui/status-badge";
import { toastError, toastSuccess } from "@/components/ui/toast-helpers";
import { createSupabaseBrowserClient } from "@/lib/supabase/browser";
import { acceptRequisitionAction } from "@/features/inventory/actions/accept-requisition";
import { deliverRequisitionAction } from "@/features/inventory/actions/deliver-requisition";
import {
  completeDeliverySchema,
  type CompleteDeliveryInput,
} from "@/features/inventory/schemas/complete-delivery";
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
      const result = await acceptRequisitionAction({ requisition_id: req.id });
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
            form.setError(field as never, { type: "server", message });
          }
        }
      }
    } finally {
      setIsDelivering(false);
    }
  }

  const busy = isPending || isDelivering;

  return (
    <SectionCard headless data-testid={`restock-queue-card-${req.id}`}>
      <div className="flex flex-col gap-3 p-4">
        <MetadataList
          layout="inline"
          items={[
            {
              label: "ID",
              value: (
                <span className="font-mono font-bold">{req.id.slice(0, 8).toUpperCase()}</span>
              ),
            },
            {
              label: <Clock size={12} />,
              value: formatDistanceToNow(new Date(req.createdAt), { addSuffix: true }),
            },
          ]}
        />

        {req.toLocationName && (
          <MetadataList
            layout="inline"
            items={[{ label: <Truck size={14} />, value: `→ ${req.toLocationName}` }]}
          />
        )}

        {req.requesterRemark && (
          <p className="text-foreground-muted text-xs italic">&quot;{req.requesterRemark}&quot;</p>
        )}

        {mode === "in_progress" ? (
          <FormProvider {...form}>
            <form
              onSubmit={form.handleSubmit(handleDeliver)}
              className="flex flex-col gap-4"
              aria-busy={busy}
            >
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
                                  className="min-h-[36px] w-20 text-center text-sm"
                                  disabled={busy}
                                  data-testid={`deliver-qty-${item.id}`}
                                />
                              </FormControl>
                              <FormMessage />
                            </FormItem>
                          )}
                        />
                        <span className="text-foreground-muted text-xs">/ {item.requestedQty}</span>
                      </div>
                    </li>
                  );
                })}
              </ul>

              <Button
                type="submit"
                className="min-h-[48px] w-full font-semibold"
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
              className="mt-1 min-h-[48px] w-full font-semibold"
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
  const router = useRouter();

  // Realtime subscription on `material_requisitions` (INSERT, UPDATE) per
  // frontend_spec.md:3231 — new requests + status changes appear live for
  // every connected runner. router.refresh() refetches the RSC tree so the
  // queue stays in sync with cloud state without a manual reload.
  useEffect(() => {
    const supabase = createSupabaseBrowserClient();
    const channel = supabase
      .channel("crew-restock-queue")
      .on(
        "postgres_changes",
        { event: "INSERT", schema: "public", table: "material_requisitions" },
        () => router.refresh(),
      )
      .on(
        "postgres_changes",
        { event: "UPDATE", schema: "public", table: "material_requisitions" },
        () => router.refresh(),
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [router]);

  function handleAction() {
    // Server Action revalidatePath fires; Realtime keeps peers in sync.
    router.refresh();
  }

  if (initialQueue.pending.length === 0 && initialQueue.inProgress.length === 0) {
    return (
      <div className="flex flex-col gap-4">
        <PageHeader
          title="Restock Queue"
          description="Accept and fulfil material requisitions"
          density="compact"
          data-testid="restock-queue-page-header"
        />
        <div className="p-4">
          <EmptyStateCta
            variant="first-use"
            title="No requisitions"
            description="Pending restock requests will appear here."
            data-testid="restock-queue-empty"
          />
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-6" data-testid="restock-queue-view">
      <PageHeader
        title="Restock Queue"
        description="Accept and fulfil material requisitions"
        density="compact"
        data-testid="restock-queue-page-header"
      />
      {initialQueue.inProgress.length > 0 && (
        <FormSection
          title={`In Progress (${initialQueue.inProgress.length})`}
          data-testid="queue-inprogress-section"
        >
          <div className="flex flex-col gap-3">
            {initialQueue.inProgress.map((req) => (
              <RequisitionCard key={req.id} req={req} mode="in_progress" onAction={handleAction} />
            ))}
          </div>
        </FormSection>
      )}

      {initialQueue.pending.length > 0 && (
        <FormSection
          title={`Pending (${initialQueue.pending.length})`}
          divider={initialQueue.inProgress.length > 0}
          data-testid="queue-pending-section"
        >
          <div className="flex flex-col gap-3">
            {initialQueue.pending.map((req) => (
              <RequisitionCard key={req.id} req={req} mode="pending" onAction={handleAction} />
            ))}
          </div>
        </FormSection>
      )}
    </div>
  );
}
