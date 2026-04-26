"use client";

import { useState } from "react";
import { useForm, FormProvider, type Resolver } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";

import { Button } from "@/components/ui/button";
import {
  FormField,
  FormItem,
  FormLabel,
  FormControl,
  FormMessage,
} from "@/components/ui/form";
import { FormSection } from "@/components/ui/form-section";
import { Input } from "@/components/ui/input";
import { SectionCard } from "@/components/ui/section-card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";
import { toastError, toastSuccess } from "@/components/ui/toast-helpers";
import { submitDisposalAction } from "@/features/inventory/actions/submit-disposal";
import { DISPOSAL_REASON_OPTIONS } from "@/features/inventory/constants";
import {
  submitDisposalSchema,
  type SubmitDisposalInput,
} from "@/features/inventory/schemas/submit-disposal";
import type { DisposalContext } from "@/features/inventory/types";

type DisposalFormProps = Readonly<{ context: DisposalContext }>;

export function DisposalForm({ context }: DisposalFormProps) {
  const form = useForm<SubmitDisposalInput>({
    resolver: zodResolver(submitDisposalSchema) as Resolver<SubmitDisposalInput>,
    defaultValues: {
      location_id: context.autoLocationId ?? "",
      material_id: "",
      quantity: 1,
      reason: "expired",
      notes: "",
      explode_bom: false,
      bom_id: null,
      cost_center_id: null,
    },
  });

  const [isPending, setIsPending] = useState(false);

  const materialId = form.watch("material_id");
  const explodeBom = form.watch("explode_bom");
  
  // Auto-detect BOM for selected material
  const activeBom = context.activeBoms.find((b) => b.parentMaterialId === materialId);
  const hasBom = Boolean(activeBom);

  const handleSubmit = async (values: SubmitDisposalInput) => {
    setIsPending(true);
    try {
      const payload = {
        ...values,
        notes: values.notes || undefined, // undefined maps correctly to null or optional
      };
      
      const result = await submitDisposalAction(payload);
      if (result.success) {
        toastSuccess("Disposal recorded.");
        form.reset({
          location_id: context.autoLocationId ?? "",
          material_id: "",
          quantity: 1,
          reason: "expired",
          notes: "",
          explode_bom: false,
          bom_id: null,
          cost_center_id: null,
        });
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

  // Filter materials by allowed categories for selected location
  const filteredMaterials =
    context.allowedCategoryIds.length > 0
      ? context.materials.filter((m) => context.allowedCategoryIds.includes(m.categoryId))
      : context.materials;

  return (
    <FormSection
      title="Record Disposal"
      description="Log spoiled, expired, or damaged inventory for write-off."
      data-testid="disposal-form-section"
    >
      <FormProvider {...form}>
        <form
          onSubmit={form.handleSubmit(handleSubmit)}
          className="flex flex-col gap-5"
          data-testid="disposal-form"
          aria-busy={isPending}
        >
          {/* Location */}
          <FormField
            control={form.control}
            name="location_id"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Location *</FormLabel>
                <FormControl>
                  <Select
                    value={field.value || "__none__"}
                    onValueChange={(v) => field.onChange(v === "__none__" ? "" : v)}
                    disabled={isPending}
                  >
                    <SelectTrigger
                      id="disposal-location"
                      className="min-h-[44px]"
                      data-testid="disposal-location-select"
                    >
                      <SelectValue placeholder="Select location…" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="__none__" disabled className="hidden">
                        Select location…
                      </SelectItem>
                      {context.locations.map((loc) => (
                        <SelectItem key={loc.id} value={loc.id} data-testid={`disposal-location-${loc.id}`}>
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

          {/* Material */}
          <FormField
            control={form.control}
            name="material_id"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Material *</FormLabel>
                <FormControl>
                  <Select
                    value={field.value || "__none__"}
                    onValueChange={(v) => {
                      field.onChange(v === "__none__" ? "" : v);
                      form.setValue("explode_bom", false);
                      
                      // Auto-set BOM ID if applicable
                      const bom = context.activeBoms.find((b) => b.parentMaterialId === v);
                      form.setValue("bom_id", bom ? bom.id : null);
                    }}
                    disabled={isPending}
                  >
                    <SelectTrigger
                      id="disposal-material"
                      className="min-h-[44px]"
                      data-testid="disposal-material-select"
                    >
                      <SelectValue placeholder="Select material…" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="__none__" disabled className="hidden">
                        Select material…
                      </SelectItem>
                      {filteredMaterials.map((m) => (
                        <SelectItem key={m.id} value={m.id} data-testid={`disposal-material-${m.id}`}>
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

          {/* Quantity */}
          <FormField
            control={form.control}
            name="quantity"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Quantity *</FormLabel>
                <FormControl>
                  <Input
                    {...field}
                    id="disposal-qty"
                    type="number"
                    min={1}
                    step="any"
                    onChange={(e) => field.onChange(Number(e.target.value))}
                    className="min-h-[44px]"
                    disabled={isPending}
                    data-testid="disposal-qty"
                  />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

          {/* Reason */}
          <FormField
            control={form.control}
            name="reason"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Reason *</FormLabel>
                <FormControl>
                  <Select
                    value={field.value || "__none__"}
                    onValueChange={(v) => field.onChange(v === "__none__" ? "" : v)}
                    disabled={isPending}
                  >
                    <SelectTrigger
                      id="disposal-reason"
                      className="min-h-[44px]"
                      data-testid="disposal-reason-select"
                    >
                      <SelectValue placeholder="Select a reason…" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="__none__" disabled className="hidden">
                        Select a reason…
                      </SelectItem>
                      {DISPOSAL_REASON_OPTIONS.map((r) => (
                        <SelectItem key={r.value} value={r.value} data-testid={`disposal-reason-${r.value}`}>
                          {r.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

          {/* Notes */}
          <FormField
            control={form.control}
            name="notes"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Notes (optional)</FormLabel>
                <FormControl>
                  <Textarea
                    {...field}
                    id="disposal-notes"
                    value={field.value || ""}
                    placeholder="Additional details…"
                    rows={2}
                    className="resize-none"
                    disabled={isPending}
                    data-testid="disposal-notes"
                  />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

          {/* BOM explosion toggle */}
          {hasBom && (
            <FormField
              control={form.control}
              name="explode_bom"
              render={({ field }) => (
                <FormItem>
                  <FormControl>
                    <SectionCard
                      headless
                      className="bg-surface/40"
                      data-testid="disposal-bom-toggle"
                    >
                      <div className="flex items-center justify-between gap-3 p-3">
                        <div>
                          <p className="text-sm font-medium">Deduct individual ingredients</p>
                          <p className="text-xs text-foreground-muted">
                            Uses the active recipe to deduct raw materials instead of the finished item
                          </p>
                        </div>
                        <Switch
                          id="disposal-explode-bom"
                          checked={field.value}
                          onCheckedChange={(v) => {
                            field.onChange(v);
                            // Ensure bom_id is populated when explosion is turned on
                            if (v && activeBom) {
                              form.setValue("bom_id", activeBom.id);
                            }
                          }}
                          disabled={isPending}
                          data-testid="disposal-explode-bom"
                          aria-label="Deduct individual ingredients"
                        />
                      </div>
                    </SectionCard>
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
          )}

          <Button
            type="submit"
            className="w-full min-h-[52px] text-base font-semibold"
            disabled={isPending}
            data-testid="disposal-submit"
          >
            {isPending ? "Recording…" : "Record Disposal"}
          </Button>
        </form>
      </FormProvider>
    </FormSection>
  );
}
