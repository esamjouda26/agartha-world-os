"use client";

import { useRef, useState } from "react";
import { useForm, FormProvider, type Resolver } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";

import { Camera, Paperclip, X } from "lucide-react";

import { Button } from "@/components/ui/button";
import { FormField, FormItem, FormLabel, FormControl, FormMessage } from "@/components/ui/form";
import { FormSection } from "@/components/ui/form-section";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { SectionCard } from "@/components/ui/section-card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { StickyActionBar, StickyActionBarSpacer } from "@/components/ui/sticky-action-bar";
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";
import { toastError, toastSuccess } from "@/components/ui/toast-helpers";
import { submitDisposalAction } from "@/features/inventory/actions/submit-disposal";
import {
  DISPOSAL_PHOTO_ALLOWED_MIME,
  DISPOSAL_PHOTO_MAX_BYTES,
  DISPOSAL_REASON_OPTIONS,
} from "@/features/inventory/constants";
import {
  submitDisposalSchema,
  type SubmitDisposalInput,
} from "@/features/inventory/schemas/submit-disposal";
import type { DisposalContext } from "@/features/inventory/types";
import { uploadDisposalPhoto } from "@/features/inventory/utils/upload-disposal-photo";

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
  const [photoFile, setPhotoFile] = useState<File | null>(null);
  const [photoError, setPhotoError] = useState<string | null>(null);
  const cameraInputRef = useRef<HTMLInputElement | null>(null);
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  const materialId = form.watch("material_id");

  // Auto-detect BOM for selected material
  const activeBom = context.activeBoms.find((b) => b.parentMaterialId === materialId);
  const hasBom = Boolean(activeBom);

  function validatePhoto(f: File | null): string | null {
    if (!f) return null;
    if (f.size === 0) return "The selected file is empty.";
    if (f.size > DISPOSAL_PHOTO_MAX_BYTES) {
      return `Photo must be ${Math.round(DISPOSAL_PHOTO_MAX_BYTES / 1024 / 1024)} MB or smaller.`;
    }
    if (!(DISPOSAL_PHOTO_ALLOWED_MIME as readonly string[]).includes(f.type)) {
      return "Photo must be JPEG, PNG, WebP, or HEIC.";
    }
    return null;
  }

  const handlePhotoChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const next = e.target.files?.[0] ?? null;
    setPhotoFile(next);
    setPhotoError(validatePhoto(next));
  };

  const removePhoto = () => {
    setPhotoFile(null);
    setPhotoError(null);
    if (cameraInputRef.current) cameraInputRef.current.value = "";
    if (fileInputRef.current) fileInputRef.current.value = "";
  };

  const handleSubmit = async (values: SubmitDisposalInput) => {
    const photoErr = validatePhoto(photoFile);
    if (photoErr) {
      setPhotoError(photoErr);
      return;
    }

    setIsPending(true);
    try {
      let photoPath: string | undefined;
      if (photoFile) {
        try {
          photoPath = await uploadDisposalPhoto(photoFile, crypto.randomUUID());
        } catch {
          toastError({ success: false, error: "DEPENDENCY_FAILED" });
          return;
        }
      }

      const payload = {
        ...values,
        notes: values.notes || undefined,
        photo_proof_url: photoPath,
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
        removePhoto();
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
                        <SelectItem
                          key={loc.id}
                          value={loc.id}
                          data-testid={`disposal-location-${loc.id}`}
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
                        <SelectItem
                          key={m.id}
                          value={m.id}
                          data-testid={`disposal-material-${m.id}`}
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
                        <SelectItem
                          key={r.value}
                          value={r.value}
                          data-testid={`disposal-reason-${r.value}`}
                        >
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

          {/* Photo proof — optional. Captured live (capture="environment") on
              mobile, file picker fallback on desktop. Uploaded to the
              `operations` Storage bucket on submit; the bucket path is
              persisted as `write_offs.photo_proof_url`. */}
          <div className="flex flex-col gap-1.5" data-testid="disposal-photo-section">
            <Label>Photo proof (optional)</Label>
            <input
              type="file"
              accept="image/*"
              capture="environment"
              ref={cameraInputRef}
              onChange={handlePhotoChange}
              className="hidden"
              disabled={isPending}
              data-testid="disposal-photo-camera-input"
            />
            <input
              type="file"
              accept={DISPOSAL_PHOTO_ALLOWED_MIME.join(",")}
              ref={fileInputRef}
              onChange={handlePhotoChange}
              className="hidden"
              disabled={isPending}
              data-testid="disposal-photo-file-input"
            />
            {!photoFile ? (
              <div className="border-border-subtle hover:border-border hover:bg-surface/50 flex flex-col items-center gap-3 rounded-xl border-2 border-dashed p-4 transition-colors">
                <p className="text-foreground-muted text-center text-xs">
                  Photograph the spoiled or damaged item for the audit trail.
                </p>
                <div className="flex flex-wrap items-center justify-center gap-2">
                  <Button
                    type="button"
                    variant="secondary"
                    size="sm"
                    onClick={() => cameraInputRef.current?.click()}
                    disabled={isPending}
                    data-testid="disposal-photo-btn-camera"
                  >
                    <Camera aria-hidden className="size-4" />
                    <span>Take photo</span>
                  </Button>
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() => fileInputRef.current?.click()}
                    disabled={isPending}
                    data-testid="disposal-photo-btn-upload"
                  >
                    <Paperclip aria-hidden className="size-4" />
                    <span>Choose file</span>
                  </Button>
                </div>
              </div>
            ) : (
              <div className="border-border bg-surface flex items-center justify-between gap-3 rounded-xl border p-3">
                <div className="flex min-w-0 items-center gap-3">
                  <div className="bg-brand-primary/10 text-brand-primary flex size-9 shrink-0 items-center justify-center rounded-lg">
                    <Camera className="size-4" aria-hidden />
                  </div>
                  <div className="flex min-w-0 flex-col">
                    <p className="text-foreground truncate text-sm font-medium">{photoFile.name}</p>
                    <p className="text-foreground-muted text-xs">
                      {(photoFile.size / 1024 / 1024).toFixed(2)} MB
                    </p>
                  </div>
                </div>
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  onClick={removePhoto}
                  disabled={isPending}
                  aria-label="Remove photo"
                  data-testid="disposal-photo-btn-remove"
                >
                  <X aria-hidden className="size-4" />
                </Button>
              </div>
            )}
            <p className="text-foreground-muted text-xs">
              JPEG / PNG / WebP / HEIC, up to {Math.round(DISPOSAL_PHOTO_MAX_BYTES / 1024 / 1024)}{" "}
              MB.
            </p>
            {photoError ? (
              <p
                role="alert"
                className="text-status-danger-foreground text-xs"
                data-testid="disposal-photo-error"
              >
                {photoError}
              </p>
            ) : null}
          </div>

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
                          <p className="text-foreground-muted text-xs">
                            Uses the active recipe to deduct raw materials instead of the finished
                            item
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

          {/* Spacer keeps the last field visible above the sticky bar on mobile. */}
          <StickyActionBarSpacer />

          {/* Submit — anchored to the bottom-100px band on mobile per Phase 8
              crew-portal contract; collapses to inline at md+. */}
          <StickyActionBar data-testid="disposal-submit-bar">
            <Button
              type="submit"
              className="min-h-[52px] w-full text-base font-semibold"
              disabled={isPending}
              data-testid="disposal-submit"
            >
              {isPending ? "Recording…" : "Record Disposal"}
            </Button>
          </StickyActionBar>
        </form>
      </FormProvider>
    </FormSection>
  );
}
