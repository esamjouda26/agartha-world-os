"use client";

import { useState } from "react";
import { useForm, useFieldArray, FormProvider, type Resolver } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";

import { ClipboardCheck } from "lucide-react";

import { Button } from "@/components/ui/button";
import { EmptyStateCta } from "@/components/shared/empty-state-cta";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { SectionCard } from "@/components/ui/section-card";
import { StatusBadge } from "@/components/ui/status-badge";
import { toastError, toastSuccess } from "@/components/ui/toast-helpers";
import { updateStockCountAction } from "@/features/inventory/actions/update-stock-count";
import { updateStockCountSchema, type UpdateStockCountInput } from "@/features/inventory/schemas/update-stock-count";
import {
  FormField,
  FormItem,
  FormControl,
  FormMessage,
} from "@/components/ui/form";
import type { ReconciliationRow, StockCountItemView } from "@/features/inventory/types";

function ReconciliationCard({ rec }: Readonly<{ rec: ReconciliationRow }>) {
  const form = useForm<UpdateStockCountInput>({
    resolver: zodResolver(updateStockCountSchema) as Resolver<UpdateStockCountInput>,
    defaultValues: {
      reconciliation_id: rec.id,
      items: rec.items.map((i) => ({
        item_id: i.id,
        physical_qty: i.physicalQty ?? 0,
      })),
    },
  });

  const { fields } = useFieldArray({
    control: form.control,
    name: "items",
  });

  const [isPending, setIsPending] = useState(false);

  const handleSubmit = async (values: UpdateStockCountInput) => {
    setIsPending(true);
    try {
      const result = await updateStockCountAction(values);
      if (result.success) {
        toastSuccess("Stock count submitted.");
      } else {
        toastError(result);
        if (result.fields) {
          for (const [field, message] of Object.entries(result.fields)) {
            form.setError(field as any, { type: "server", message });
          }
        }
      }
    } finally {
      setIsPending(false);
    }
  };

  return (
    <SectionCard
      title={rec.locationName}
      description={rec.scheduledDate}
      action={
        <StatusBadge
          status={(rec.status ?? "pending").replace("_", " ")}
          tone={rec.status === "completed" ? "success" : "warning"}
          data-testid={`stock-count-status-${rec.id}`}
        />
      }
      data-testid={`stock-count-card-${rec.id}`}
    >
      <FormProvider {...form}>
        <form onSubmit={form.handleSubmit(handleSubmit)} aria-busy={isPending}>
          {/* Blind count — system_qty intentionally withheld per WF-11 spec */}
          <ul className="flex flex-col gap-3" aria-label="Items to count">
            {fields.map((field, idx) => {
              const item = rec.items.find((i) => i.id === field.item_id);
              if (!item) return null;

              return (
                <li key={field.id} className="flex items-start justify-between gap-3">
                  <div className="flex-1 min-w-0 pt-3">
                    <p className="text-sm font-medium truncate">{item.materialName}</p>
                    <p className="text-xs text-foreground-muted">{item.baseUnit}</p>
                  </div>
                  <div className="shrink-0 w-24">
                    <FormField
                      control={form.control}
                      name={`items.${idx}.physical_qty`}
                      render={({ field: qField }) => (
                        <FormItem className="space-y-1">
                          <Label htmlFor={`count-qty-${item.id}`} className="sr-only">
                            Physical count for {item.materialName}
                          </Label>
                          <FormControl>
                            <Input
                              {...qField}
                              id={`count-qty-${item.id}`}
                              type="number"
                              min={0}
                              onChange={(e) => qField.onChange(Number(e.target.value))}
                              className="w-24 min-h-[44px] text-center"
                              disabled={isPending}
                              data-testid={`count-qty-${item.id}`}
                            />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>
                </li>
              );
            })}
          </ul>

          <Button
            type="submit"
            className="mt-5 w-full min-h-[48px] font-semibold gap-2"
            disabled={isPending}
            data-testid={`stock-count-submit-${rec.id}`}
          >
            <ClipboardCheck size={16} />
            {isPending ? "Submitting…" : "Submit Count"}
          </Button>
        </form>
      </FormProvider>
    </SectionCard>
  );
}

export function StockCountView({
  reconciliations,
}: Readonly<{ reconciliations: ReadonlyArray<ReconciliationRow> }>) {
  if (reconciliations.length === 0) {
    return (
      <div className="p-4">
        <EmptyStateCta
          variant="first-use"
          title="No stock counts assigned"
          description="Scheduled stock counts assigned to you will appear here."
          data-testid="stock-count-empty"
        />
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-4 p-4" data-testid="stock-count-view">
      {reconciliations.map((rec) => (
        <ReconciliationCard key={rec.id} rec={rec} />
      ))}
    </div>
  );
}
