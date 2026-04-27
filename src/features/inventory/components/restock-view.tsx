"use client";

import { useState } from "react";
import { useForm, useFieldArray, FormProvider, type Resolver } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";

import { useRouter } from "@/i18n/navigation";

import { Plus, Trash2 } from "lucide-react";

import { Button } from "@/components/ui/button";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import { EmptyStateCta } from "@/components/shared/empty-state-cta";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { MetadataList } from "@/components/ui/metadata-list";
import { PageHeader } from "@/components/ui/page-header";
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
import { StickyActionBar, StickyActionBarSpacer } from "@/components/ui/sticky-action-bar";
import { Textarea } from "@/components/ui/textarea";
import { toastError, toastSuccess } from "@/components/ui/toast-helpers";
import { submitRestockAction } from "@/features/inventory/actions/submit-restock";
import {
  submitRestockSchema,
  type SubmitRestockInput,
} from "@/features/inventory/schemas/submit-restock";
import { FormField, FormItem, FormLabel, FormControl, FormMessage } from "@/components/ui/form";
import type { RestockContext, MaterialOption, RequisitionRow } from "@/features/inventory/types";

// ── Types ─────────────────────────────────────────────────────────────────────

type RestockFormProps = Readonly<{
  context: RestockContext;
  onSubmitted: () => void;
}>;

function RestockForm({ context, onSubmitted }: RestockFormProps) {
  const { isRunner } = context;

  const form = useForm<SubmitRestockInput>({
    resolver: zodResolver(submitRestockSchema) as Resolver<SubmitRestockInput>,
    defaultValues: {
      from_location_id: undefined,
      to_location_id: context.autoLocationId ?? "",
      items: [{ material_id: "", requested_qty: 1 }],
      requester_remark: "",
      idempotencyKey: crypto.randomUUID(),
      is_runner: isRunner,
    },
  });

  const { fields, append, remove } = useFieldArray({
    control: form.control,
    name: "items",
  });

  const [isPending, setIsPending] = useState(false);
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [pendingValues, setPendingValues] = useState<SubmitRestockInput | null>(null);

  // First click on Submit only validates + opens the confirm dialog —
  // the actual mutation runs in `handleConfirm` to enforce a deliberate
  // "yes, send this requisition" interaction (frontend_spec.md confirmation
  // contract for crew mutations).
  const handleValidated = (values: SubmitRestockInput) => {
    setPendingValues(values);
    setConfirmOpen(true);
  };

  const handleConfirm = async () => {
    if (!pendingValues) return;
    setIsPending(true);
    try {
      const payload = {
        ...pendingValues,
        requester_remark: pendingValues.requester_remark || undefined,
      };

      const result = await submitRestockAction(payload);
      if (result.success) {
        toastSuccess(
          isRunner ? "Restock created and assigned to you." : "Restock request submitted.",
        );
        form.reset({
          from_location_id: undefined,
          to_location_id: context.autoLocationId ?? "",
          items: [{ material_id: "", requested_qty: 1 }],
          requester_remark: "",
          idempotencyKey: crypto.randomUUID(),
          is_runner: isRunner,
        });
        setConfirmOpen(false);
        setPendingValues(null);
        onSubmitted();
      } else {
        toastError(result);
        if (result.fields) {
          for (const [field, message] of Object.entries(result.fields)) {
            form.setError(field as never, { type: "server", message });
          }
        }
        setConfirmOpen(false);
      }
    } finally {
      setIsPending(false);
    }
  };

  const itemCount = pendingValues?.items.length ?? 0;
  const totalQty =
    pendingValues?.items.reduce((sum, item) => sum + (Number(item.requested_qty) || 0), 0) ?? 0;

  return (
    <FormProvider {...form}>
      <form
        onSubmit={form.handleSubmit(handleValidated)}
        className="flex flex-col gap-0"
        data-testid="restock-form"
        aria-busy={isPending}
      >
        <SectionCard headless contentClassName="px-4 sm:px-6" data-testid="restock-form-section">
          <div className="flex flex-col gap-6">
            {/* Source location — runner only */}
            {isRunner ? (
              <FormField
                control={form.control}
                name="from_location_id"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Source location *</FormLabel>
                    <FormControl>
                      <Select
                        value={field.value || "__none__"}
                        onValueChange={(v) => field.onChange(v === "__none__" ? "" : v)}
                        disabled={isPending}
                      >
                        <SelectTrigger
                          id="restock-source-location"
                          className="min-h-[48px] w-full"
                          data-testid="restock-source-location-select"
                        >
                          <SelectValue placeholder="Select source…" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="__none__" disabled className="hidden">
                            Select source…
                          </SelectItem>
                          {context.locations.map((loc) => (
                            <SelectItem
                              key={loc.id}
                              value={loc.id}
                              data-testid={`restock-source-location-${loc.id}`}
                            >
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
            ) : null}

            {/* Destination location */}
            <FormField
              control={form.control}
              name="to_location_id"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>
                    {isRunner ? "Destination location *" : "Delivery location *"}
                  </FormLabel>
                  <FormControl>
                    <Select
                      value={field.value || "__none__"}
                      onValueChange={(v) => field.onChange(v === "__none__" ? "" : v)}
                      disabled={isPending}
                    >
                      <SelectTrigger
                        id="restock-location"
                        className="min-h-[48px] w-full"
                        data-testid="restock-location-select"
                      >
                        <SelectValue placeholder="Select location…" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="__none__" disabled className="hidden">
                          Select location…
                        </SelectItem>
                        {context.locations.map((loc) => (
                          <SelectItem
                            key={loc.id}
                            value={loc.id}
                            data-testid={`restock-location-${loc.id}`}
                          >
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
              <span className="text-sm font-medium">
                {isRunner ? "Materials to move *" : "Items to request *"}
              </span>
              {fields.map((field, idx) => (
                <div key={field.id} className="flex items-start gap-2">
                  <FormField
                    control={form.control}
                    name={`items.${idx}.material_id`}
                    render={({ field: mField }) => (
                      <FormItem className="min-w-0 flex-1 space-y-1">
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
                              className="min-h-[48px] w-full"
                              data-testid={`restock-material-select-${idx}`}
                            >
                              <SelectValue placeholder="Select material…" />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="__none__" disabled className="hidden">
                                Select material…
                              </SelectItem>
                              {context.materials.map((m: MaterialOption) => (
                                <SelectItem
                                  key={m.id}
                                  value={m.id}
                                  data-testid={`restock-material-option-${m.id}`}
                                >
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
                      <FormItem className="w-20 shrink-0 space-y-1">
                        <Label htmlFor={`restock-qty-${idx}`} className="sr-only">
                          Qty
                        </Label>
                        <FormControl>
                          <Input
                            {...qField}
                            id={`restock-qty-${idx}`}
                            type="number"
                            min={1}
                            onChange={(e) => qField.onChange(Number(e.target.value))}
                            className="min-h-[48px] text-center"
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
                      className="text-destructive h-[48px] w-11 shrink-0"
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
                className="min-h-[40px] gap-1.5 self-start"
                onClick={() => append({ material_id: "", requested_qty: 1 })}
                disabled={isPending}
                data-testid="restock-add-line"
              >
                <Plus size={14} />
                Add item
              </Button>
            </div>

            {/* Remark */}
            <FormField
              control={form.control}
              name="requester_remark"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>
                    {isRunner ? "Note (optional)" : "Delivery instruction (optional)"}
                  </FormLabel>
                  <FormControl>
                    <Textarea
                      {...field}
                      id="restock-remark"
                      value={field.value || ""}
                      placeholder={
                        isRunner
                          ? "e.g. Moving cleaning supplies to West Wing"
                          : "e.g. Deliver to dry store before noon"
                      }
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
          </div>
        </SectionCard>

        {/* Spacer keeps the last field visible above the sticky bar on mobile. */}
        <StickyActionBarSpacer />

        {/* Submit — anchored to the bottom-100px band on mobile per Phase 8
            crew-portal contract; collapses to inline at md+. */}
        <StickyActionBar data-testid="restock-submit-bar">
          <Button
            type="submit"
            className="min-h-[52px] w-full text-base font-semibold"
            disabled={isPending}
            data-testid="restock-submit"
          >
            {isPending ? "Submitting…" : isRunner ? "Perform Restock" : "Request Restock"}
          </Button>
        </StickyActionBar>
      </form>

      <ConfirmDialog
        open={confirmOpen}
        onOpenChange={(next) => {
          if (!next && isPending) return;
          setConfirmOpen(next);
        }}
        intent="info"
        title={isRunner ? "Perform this restock?" : "Send this restock request?"}
        description={
          isRunner
            ? "The requisition will be auto-assigned to you. Mark delivery on the queue page."
            : "The warehouse team will be notified once you confirm."
        }
        confirmLabel={isPending ? "Submitting…" : isRunner ? "Confirm restock" : "Send request"}
        pending={isPending}
        onConfirm={handleConfirm}
        data-testid="restock-confirm-dialog"
      >
        <ul className="text-foreground-muted ml-4 list-disc text-sm">
          <li>
            <span className="text-foreground font-medium">{itemCount}</span> line
            {itemCount === 1 ? "" : "s"}
          </li>
          <li>
            <span className="text-foreground font-medium">{totalQty}</span> total units
          </li>
        </ul>
      </ConfirmDialog>
    </FormProvider>
  );
}

// ── Local: RecentRequestsList ─────────────────────────────────────────────────

type RecentRequestsListProps = Readonly<{
  requisitions: ReadonlyArray<RequisitionRow>;
  isRunner: boolean;
}>;

function RecentRequestsList({ requisitions, isRunner }: RecentRequestsListProps) {
  if (requisitions.length === 0) {
    return (
      <EmptyStateCta
        variant="filtered-out"
        title={isRunner ? "No recent restocks" : "No recent requests"}
        description={
          isRunner
            ? "Your manual restocks from the past 14 days will appear here."
            : "Your restock requests from the past 14 days will appear here."
        }
        data-testid="restock-no-recent"
      />
    );
  }

  return (
    <div
      className="flex flex-col gap-2"
      aria-label={isRunner ? "Recent restocks" : "Recent restock requests"}
      data-testid="restock-recent-list"
    >
      {requisitions.map((req) => (
        <SectionCard key={req.id} headless data-testid={`restock-recent-${req.id}`}>
          <div className="flex flex-col gap-1 px-4 py-3">
            <div className="flex items-center justify-between gap-2">
              <span className="text-foreground-muted font-mono text-xs">
                {req.id.slice(0, 8).toUpperCase()}
              </span>
              <StatusBadge status={req.status ?? "pending"} />
            </div>
            {req.toLocationName && <p className="text-sm">→ {req.toLocationName}</p>}
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
  const router = useRouter();

  // After a successful submit the new requisition lives in the DB; we need
  // the RSC to refetch `ownRecentRequisitions` so it appears in the list
  // immediately. The action calls `revalidatePath` server-side; that
  // invalidates the cache but the client only re-renders when we tell it
  // to via `router.refresh()`.
  function handleSubmitted() {
    router.refresh();
  }

  return (
    <div className="flex flex-col gap-6" data-testid="restock-page">
      <PageHeader
        title={context.isRunner ? "Manual Restock" : "Restock Request"}
        description={
          context.isRunner
            ? "Fulfil stock replenishment requests"
            : "Request materials from the warehouse"
        }
        density="compact"
        data-testid="restock-page-header"
      />
      {context.locations.length === 0 ? (
        <div className="p-4">
          <EmptyStateCta
            variant="first-use"
            title="No locations available"
            description="No locations found for restocking. Contact your manager."
            data-testid="restock-no-locations"
          />
        </div>
      ) : (
        <>
          <RestockForm context={context} onSubmitted={handleSubmitted} />

          <Separator />

          <div className="flex flex-col gap-3" data-testid="restock-recent-section">
            <h2 className="text-sm font-medium">
              {context.isRunner ? "Recent Restocks" : "Recent Requests"}
            </h2>
            <RecentRequestsList
              requisitions={context.ownRecentRequisitions}
              isRunner={context.isRunner}
            />
          </div>
        </>
      )}
    </div>
  );
}
