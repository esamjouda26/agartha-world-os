"use client";

import { useState } from "react";
import { useForm, useFieldArray, FormProvider, type Resolver } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";

import { useRouter } from "@/i18n/navigation";

import { ClipboardCheck } from "lucide-react";

import { Button } from "@/components/ui/button";
import { EmptyStateCta } from "@/components/shared/empty-state-cta";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { PageHeader } from "@/components/ui/page-header";
import { SectionCard } from "@/components/ui/section-card";
import { StatusBadge } from "@/components/ui/status-badge";
import { toastError, toastSuccess } from "@/components/ui/toast-helpers";
import { updateStockCountAction } from "@/features/inventory/actions/update-stock-count";
import {
  updateStockCountSchema,
  type UpdateStockCountInput,
} from "@/features/inventory/schemas/update-stock-count";
import { FormField, FormItem, FormControl, FormMessage } from "@/components/ui/form";
import type { ReconciliationRow, StockCountItemView } from "@/features/inventory/types";

function ReconciliationCard({ rec }: Readonly<{ rec: ReconciliationRow }>) {
  const router = useRouter();
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
        // Refetch RSC so the reconciliation either disappears (status →
        // completed) or re-renders with the new pending_review badge.
        // The action calls revalidatePath server-side; router.refresh()
        // tells the client to actually pick up the new RSC payload.
        router.refresh();
      } else {
        toastError(result);
        if (result.fields) {
          for (const [field, message] of Object.entries(result.fields)) {
            form.setError(field as never, { type: "server", message });
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
          {/* Blind count — system_qty intentionally withheld per WF-11 spec.
              Items grouped by material category so the runner can sweep the
              shelf section by section (frontend_spec.md WF-11 grouping). */}
          {(() => {
            // Group items by category, preserving the field-array order so the
            // RHF index stays stable across renders.
            const groups = new Map<
              string,
              { name: string; entries: Array<{ idx: number; item: StockCountItemView }> }
            >();
            fields.forEach((field, idx) => {
              const item = rec.items.find((i) => i.id === field.item_id);
              if (!item) return;
              const key = item.categoryId ?? "__uncategorized__";
              const existing = groups.get(key);
              if (existing) {
                existing.entries.push({ idx, item });
              } else {
                groups.set(key, { name: item.categoryName, entries: [{ idx, item }] });
              }
            });
            const sortedGroups = Array.from(groups.entries()).sort(([, a], [, b]) =>
              a.name.localeCompare(b.name),
            );

            return (
              <div className="flex flex-col gap-5" aria-label="Items to count">
                {sortedGroups.map(([catKey, group]) => (
                  <section
                    key={catKey}
                    aria-label={`${group.name} items`}
                    data-testid={`stock-count-category-${catKey}`}
                  >
                    <header className="border-border-subtle text-foreground-muted mb-2 flex items-center justify-between border-b pb-1 text-xs font-medium tracking-wide uppercase">
                      <span>{group.name}</span>
                      <span>
                        {group.entries.length} item{group.entries.length === 1 ? "" : "s"}
                      </span>
                    </header>
                    <ul className="flex flex-col gap-3">
                      {group.entries.map(({ idx, item }) => (
                        <li key={item.id} className="flex items-start justify-between gap-3">
                          <div className="min-w-0 flex-1 pt-3">
                            <p className="truncate text-sm font-medium">{item.materialName}</p>
                            <p className="text-foreground-muted text-xs">{item.baseUnit}</p>
                          </div>
                          <div className="w-24 shrink-0">
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
                                      className="min-h-[44px] w-24 text-center"
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
                      ))}
                    </ul>
                  </section>
                ))}
              </div>
            );
          })()}

          <Button
            type="submit"
            className="mt-5 min-h-[48px] w-full gap-2 font-semibold"
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
      <div className="flex flex-col gap-4">
        <PageHeader
          title="Stock Count"
          description="Blind count — enter physical quantities"
          density="compact"
          data-testid="stock-count-page-header"
        />
        <div className="p-4">
          <EmptyStateCta
            variant="first-use"
            title="No stock counts assigned"
            description="Scheduled stock counts assigned to you will appear here."
            data-testid="stock-count-empty"
          />
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-4" data-testid="stock-count-view">
      <PageHeader
        title="Stock Count"
        description="Blind count — enter physical quantities"
        density="compact"
        data-testid="stock-count-page-header"
      />
      {reconciliations.map((rec) => (
        <ReconciliationCard key={rec.id} rec={rec} />
      ))}
    </div>
  );
}
