"use client";

import { useState } from "react";
import { useForm, useFieldArray, FormProvider, type Resolver } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";

import { Plus, Trash2 } from "lucide-react";

import { Button } from "@/components/ui/button";
import { EmptyStateCta } from "@/components/shared/empty-state-cta";
import { FormSection } from "@/components/ui/form-section";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { MetadataList } from "@/components/ui/metadata-list";
import { SectionCard } from "@/components/ui/section-card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Separator } from "@/components/ui/separator";
import { StatusBadge } from "@/components/ui/status-badge";
import { Textarea } from "@/components/ui/textarea";
import { toastError, toastSuccess } from "@/components/ui/toast-helpers";
import { submitRestockAction } from "@/features/inventory/actions/submit-restock";
import { submitRestockSchema, type SubmitRestockInput } from "@/features/inventory/schemas/submit-restock";
import {
  FormField,
  FormItem,
  FormLabel,
  FormControl,
  FormMessage,
} from "@/components/ui/form";
import type { RestockContext, MaterialOption, RequisitionRow } from "@/features/inventory/types";

// ── Types ─────────────────────────────────────────────────────────────────────

type RestockFormProps = Readonly<{
  context: RestockContext;
  onSubmitted: () => void;
}>;

function RestockForm({ context, onSubmitted }: RestockFormProps) {
  const form = useForm<SubmitRestockInput>({
    resolver: zodResolver(submitRestockSchema) as Resolver<SubmitRestockInput>,
    defaultValues: {
      to_location_id: context.autoLocationId ?? "",
      items: [{ material_id: "", requested_qty: 1 }],
      requester_remark: "",
      idempotencyKey: crypto.randomUUID(),
    },
  });

  const { fields, append, remove } = useFieldArray({
    control: form.control,
    name: "items",
  });

  const [isPending, setIsPending] = useState(false);

  const handleSubmit = async (values: SubmitRestockInput) => {
    setIsPending(true);
    try {
      const payload = {
        ...values,
        requester_remark: values.requester_remark || undefined,
      };
      
      const result = await submitRestockAction(payload);
      if (result.success) {
        toastSuccess("Restock request submitted.");
        form.reset({
          to_location_id: context.autoLocationId ?? "",
          items: [{ material_id: "", requested_qty: 1 }],
          requester_remark: "",
          idempotencyKey: crypto.randomUUID(),
        });
        onSubmitted();
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
    <FormSection
      title="Request Restock"
      description="Submit a requisition to the warehouse team."
      data-testid="restock-form-section"
    >
      <FormProvider {...form}>
        <form
          onSubmit={form.handleSubmit(handleSubmit)}
          className="flex flex-col gap-5"
          data-testid="restock-form"
          aria-busy={isPending}
        >
          {/* Location */}
          <FormField
            control={form.control}
            name="to_location_id"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Delivery location *</FormLabel>
                <FormControl>
                  <Select
                    value={field.value || "__none__"}
                    onValueChange={(v) => field.onChange(v === "__none__" ? "" : v)}
                    disabled={isPending}
                  >
                    <SelectTrigger
                      id="restock-location"
                      className="min-h-[44px]"
                      data-testid="restock-location-select"
                    >
                      <SelectValue placeholder="Select location…" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="__none__" disabled className="hidden">
                        Select location…
                      </SelectItem>
                      {context.locations.map((loc) => (
                        <SelectItem key={loc.id} value={loc.id} data-testid={`restock-location-${loc.id}`}>
                          {loc.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

          {/* Material lines */}
          <div className="flex flex-col gap-3">
            <span className="text-sm font-medium">Items to request *</span>
            {fields.map((field, idx) => (
              <div key={field.id} className="flex items-start gap-2">
                <FormField
                  control={form.control}
                  name={`items.${idx}.material_id`}
                  render={({ field: mField }) => (
                    <FormItem className="flex-1 space-y-1">
                      <Label htmlFor={`restock-material-${idx}`} className="sr-only">
                        Material {idx + 1}
                      </Label>
                      <FormControl>
                        <Select
                          value={mField.value || "__none__"}
                          onValueChange={(v) => mField.onChange(v === "__none__" ? "" : v)}
                          disabled={isPending}
                        >
                          <SelectTrigger
                            id={`restock-material-${idx}`}
                            className="min-h-[44px]"
                            data-testid={`restock-material-select-${idx}`}
                          >
                            <SelectValue placeholder="Select material…" />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="__none__" disabled className="hidden">
                              Select material…
                            </SelectItem>
                            {context.materials.map((m: MaterialOption) => (
                              <SelectItem key={m.id} value={m.id} data-testid={`restock-material-option-${m.id}`}>
                                {m.name}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name={`items.${idx}.requested_qty`}
                  render={({ field: qField }) => (
                    <FormItem className="w-20 space-y-1 shrink-0">
                      <Label htmlFor={`restock-qty-${idx}`} className="sr-only">Qty</Label>
                      <FormControl>
                        <Input
                          {...qField}
                          id={`restock-qty-${idx}`}
                          type="number"
                          min={1}
                          onChange={(e) => qField.onChange(Number(e.target.value))}
                          className="min-h-[44px] text-center"
                          disabled={isPending}
                          data-testid={`restock-qty-${idx}`}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                {fields.length > 1 && (
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    className="h-[44px] w-11 text-destructive shrink-0"
                    onClick={() => remove(idx)}
                    data-testid={`restock-remove-line-${idx}`}
                    aria-label="Remove item"
                  >
                    <Trash2 size={16} />
                  </Button>
                )}
              </div>
            ))}
            
            <Button
              type="button"
              variant="outline"
              size="sm"
              className="self-start min-h-[40px] gap-1.5"
              onClick={() => append({ material_id: "", requested_qty: 1 })}
              disabled={isPending}
              data-testid="restock-add-line"
            >
              <Plus size={14} />
              Add item
            </Button>
          </div>

          {/* Delivery note */}
          <FormField
            control={form.control}
            name="requester_remark"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Delivery instruction (optional)</FormLabel>
                <FormControl>
                  <Textarea
                    {...field}
                    id="restock-remark"
                    value={field.value || ""}
                    placeholder="e.g. Deliver to dry store before noon"
                    rows={2}
                    className="resize-none"
                    disabled={isPending}
                    data-testid="restock-remark"
                  />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

          {/* Submit */}
          <Button
            type="submit"
            className="w-full min-h-[52px] text-base font-semibold"
            disabled={isPending}
            data-testid="restock-submit"
          >
            {isPending ? "Submitting…" : "Request Restock"}
          </Button>
        </form>
      </FormProvider>
    </FormSection>
  );
}

// ── Local: RecentRequestsList ─────────────────────────────────────────────────

type RecentRequestsListProps = Readonly<{
  requisitions: ReadonlyArray<RequisitionRow>;
}>;

function RecentRequestsList({ requisitions }: RecentRequestsListProps) {
  if (requisitions.length === 0) {
    return (
      <EmptyStateCta
        variant="filtered-out"
        title="No recent requests"
        description="Your restock requests from the past 14 days will appear here."
        data-testid="restock-no-recent"
      />
    );
  }

  return (
    <div className="flex flex-col gap-2" aria-label="Recent restock requests" data-testid="restock-recent-list">
      {requisitions.map((req) => (
        <SectionCard
          key={req.id}
          headless
          data-testid={`restock-recent-${req.id}`}
        >
          <div className="flex flex-col gap-1 py-3 px-4">
            <div className="flex items-center justify-between gap-2">
              <span className="text-xs text-foreground-muted font-mono">{req.id.slice(0, 8).toUpperCase()}</span>
              <StatusBadge
                status={req.status ?? "pending"}
              />
            </div>
            {req.toLocationName && (
              <p className="text-sm">→ {req.toLocationName}</p>
            )}
            <MetadataList
              layout="inline"
              items={[
                { label: "Items", value: `${req.items.length}` },
                { label: "Date", value: new Date(req.createdAt).toLocaleDateString() },
              ]}
            />
          </div>
        </SectionCard>
      ))}
    </div>
  );
}

// ── Main: RestockView ─────────────────────────────────────────────────────────

type RestockViewProps = Readonly<{ context: RestockContext }>;

export function RestockView({ context }: RestockViewProps) {
  // Trigger a re-render of the recent list when a new request is submitted
  const [refreshKey, setRefreshKey] = useState(0);

  function handleSubmitted() {
    setRefreshKey((k) => k + 1);
  }

  return (
    <div className="flex flex-col gap-6 p-4" data-testid="restock-page">

      <RestockForm context={context} onSubmitted={handleSubmitted} />

      <Separator />

      <FormSection title="Recent Requests" divider={false} data-testid="restock-recent-section" key={refreshKey}>
        <RecentRequestsList requisitions={context.ownRecentRequisitions} />
      </FormSection>
    </div>
  );
}
