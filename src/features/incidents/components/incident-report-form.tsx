"use client";

import * as React from "react";
import { useForm, FormProvider } from "react-hook-form";
import { Camera, Paperclip, Send, X } from "lucide-react";

import { Button } from "@/components/ui/button";
import { FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { FormSubmitButton } from "@/components/ui/form-submit-button";
import { Label } from "@/components/ui/label";
import { SearchableSelect } from "@/components/ui/searchable-select";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { toastError, toastSuccess } from "@/components/ui/toast-helpers";
import { useServerErrors } from "@/hooks/use-server-errors";
import type { ServerActionResult } from "@/lib/errors";

import { createIncidentAction } from "@/features/incidents/actions/create-incident";
import {
  CATEGORY_LABEL,
  GROUP_LABEL,
  INCIDENT_ATTACHMENT_ALLOWED_MIME,
  INCIDENT_ATTACHMENT_MAX_BYTES,
  INCIDENT_GROUPS,
  type IncidentCategory,
  type IncidentGroupKey,
} from "@/features/incidents/constants";
import type { ZoneOption } from "@/features/incidents/queries/list-zones";
import { DESCRIPTION_MAX, DESCRIPTION_MIN } from "@/features/incidents/schemas/incident";

type FormValues = Readonly<{
  category: IncidentCategory | "";
  description: string;
  zoneId: string | null;
  attachmentPath: string | null; // populated server-side; form input is a File
}>;

export type IncidentReportFormProps = Readonly<{
  allowedGroups: readonly IncidentGroupKey[];
  zones: readonly ZoneOption[];
  onComplete?: () => void;
}>;

export function IncidentReportForm({ allowedGroups, zones, onComplete }: IncidentReportFormProps) {
  const [group, setGroup] = React.useState<IncidentGroupKey | "">("");
  const [file, setFile] = React.useState<File | null>(null);
  const [fileError, setFileError] = React.useState<string | null>(null);
  const fileInputRef = React.useRef<HTMLInputElement | null>(null);
  const cameraInputRef = React.useRef<HTMLInputElement | null>(null);
  const [isPending, startTransition] = React.useTransition();

  const handleFileChange = React.useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const next = e.target.files?.[0] ?? null;
    setFile(next);
    setFileError(validateFile(next));
  }, []);
  const [serverResult, setServerResult] = React.useState<
    ServerActionResult<{ id: string }> | undefined
  >(undefined);

  // No zodResolver — the schema's `category` is a discriminated enum that
  // doesn't accept `""`, but the form value must allow `""` during the
  // two-step picker journey. We validate manually in `onSubmit` and
  // re-validate server-side via `createIncidentSchema` inside the action,
  // which is the authoritative check anyway.
  const form = useForm<FormValues>({
    defaultValues: {
      category: "",
      description: "",
      zoneId: null,
      attachmentPath: null,
    },
    mode: "onSubmit",
  });

  const categoriesInGroup = React.useMemo<readonly IncidentCategory[]>(
    () => (group === "" ? [] : INCIDENT_GROUPS[group]),
    [group],
  );

  const validateFile = (f: File | null): string | null => {
    if (!f) return null;
    if (f.size === 0) return "The selected file is empty.";
    if (f.size > INCIDENT_ATTACHMENT_MAX_BYTES) {
      return `Attachment must be ${Math.round(INCIDENT_ATTACHMENT_MAX_BYTES / 1024 / 1024)} MB or smaller.`;
    }
    if (!(INCIDENT_ATTACHMENT_ALLOWED_MIME as readonly string[]).includes(f.type)) {
      return "Attachment must be JPEG, PNG, WebP, MP4, or PDF.";
    }
    return null;
  };

  const onSubmit = form.handleSubmit((values) => {
    if (values.category === "") {
      form.setError("category", { type: "manual", message: "Select a category." });
      return;
    }
    const trimmedDescription = values.description.trim();
    if (trimmedDescription.length < DESCRIPTION_MIN) {
      form.setError("description", {
        type: "manual",
        message: `Description must be at least ${DESCRIPTION_MIN} characters.`,
      });
      return;
    }
    if (trimmedDescription.length > DESCRIPTION_MAX) {
      form.setError("description", {
        type: "manual",
        message: `Description must be at most ${DESCRIPTION_MAX} characters.`,
      });
      return;
    }
    const attachErr = validateFile(file);
    if (attachErr) {
      setFileError(attachErr);
      return;
    }

    startTransition(async () => {
      const fd = new FormData();
      fd.set("category", values.category);
      fd.set("description", values.description);
      if (values.zoneId) fd.set("zoneId", values.zoneId);
      if (file) fd.set("attachment", file);
      const result = await createIncidentAction(fd);
      setServerResult(result);
      if (result.success) {
        toastSuccess("Incident reported", { description: "Managers have been notified." });
        form.reset();
        setGroup("");
        setFile(null);
        setFileError(null);
        if (fileInputRef.current) fileInputRef.current.value = "";
        if (cameraInputRef.current) cameraInputRef.current.value = "";
        onComplete?.();
      } else {
        toastError(result);
      }
    });
  });

  return (
    <FormProvider {...form}>
      <ServerErrorBridge result={serverResult} />
      <form onSubmit={onSubmit} className="flex flex-col gap-5" noValidate>
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
          {/* Step 1 — group. Local UI-only state (not tracked by RHF),
               so we use the plain <Label> primitive instead of <FormField>
               + <FormLabel>, which would require field context. */}
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="incident-group">Category group</Label>
            <Select
              value={group}
              onValueChange={(v) => {
                setGroup(v as IncidentGroupKey);
                form.setValue("category", "" as IncidentCategory | "");
              }}
            >
              <SelectTrigger
                id="incident-group"
                className="h-10 w-full"
                data-testid="incident-form-group"
              >
                <SelectValue placeholder="Select a group" />
              </SelectTrigger>
              <SelectContent>
                {allowedGroups.map((g) => (
                  <SelectItem key={g} value={g}>
                    {GROUP_LABEL[g]}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Step 2 — specific category */}
          <FormField
            control={form.control}
            name="category"
            render={({ field }) => (
              <FormItem>
                <FormLabel htmlFor="incident-category">Category</FormLabel>
                <FormControl>
                  <Select
                    value={field.value || ""}
                    onValueChange={(v) => field.onChange(v as IncidentCategory)}
                    disabled={group === ""}
                  >
                    <SelectTrigger
                      id="incident-category"
                      className="h-10 w-full"
                      data-testid="incident-form-category"
                    >
                      <SelectValue
                        placeholder={group === "" ? "Pick a group first" : "Select a category"}
                      />
                    </SelectTrigger>
                    <SelectContent>
                      {categoriesInGroup.map((c) => (
                        <SelectItem key={c} value={c}>
                          {CATEGORY_LABEL[c]}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
        </div>

        <FormField
          control={form.control}
          name="description"
          render={({ field }) => (
            <FormItem>
              <FormLabel htmlFor="incident-description">Description</FormLabel>
              <FormControl>
                <Textarea
                  id="incident-description"
                  rows={4}
                  placeholder="What happened? Where? Any injuries, damage, or risks?"
                  maxLength={2000}
                  disabled={isPending}
                  data-testid="incident-form-description"
                  {...field}
                />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        <FormField
          control={form.control}
          name="zoneId"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Zone (optional)</FormLabel>
              <FormControl>
                <SearchableSelect
                  value={field.value}
                  onChange={field.onChange}
                  options={zones.map((z) => ({ value: z.id, label: z.name }))}
                  placeholder="Select a zone"
                  searchPlaceholder="Search zones…"
                  emptyLabel="No zones match."
                  clearable
                  data-testid="incident-form-zone"
                />
              </FormControl>
            </FormItem>
          )}
        />

        {/* File input lives in local state (not RHF), so no <FormField>
             context exists. Using hidden inputs with dual-action trigger box. */}
        <div className="flex flex-col gap-1.5">
          <Label>Evidence (optional)</Label>
          <input
            type="file"
            accept="image/*"
            capture="environment"
            ref={cameraInputRef}
            onChange={handleFileChange}
            className="hidden"
            disabled={isPending}
            data-testid="incident-form-camera-input"
          />
          <input
            type="file"
            accept={INCIDENT_ATTACHMENT_ALLOWED_MIME.join(",")}
            ref={fileInputRef}
            onChange={handleFileChange}
            className="hidden"
            disabled={isPending}
            data-testid="incident-form-file-input"
          />

          {!file ? (
            <div className="border-border-subtle hover:border-border hover:bg-surface/50 flex flex-col items-center gap-4 rounded-xl border-2 border-dashed p-6 transition-colors">
              <div className="text-foreground-muted text-center text-sm">
                Take a clear photo of the incident or upload an existing file.
              </div>
              <div className="flex flex-wrap items-center justify-center gap-3">
                <Button
                  type="button"
                  variant="secondary"
                  onClick={() => cameraInputRef.current?.click()}
                  disabled={isPending}
                  data-testid="incident-form-btn-camera"
                >
                  <Camera aria-hidden className="size-4" />
                  <span>Take photo</span>
                </Button>
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => fileInputRef.current?.click()}
                  disabled={isPending}
                  data-testid="incident-form-btn-upload"
                >
                  <Paperclip aria-hidden className="size-4" />
                  <span>Choose file</span>
                </Button>
              </div>
            </div>
          ) : (
            <div className="border-border bg-surface flex items-center justify-between gap-3 rounded-xl border p-4">
              <div className="flex min-w-0 items-center gap-3">
                <div className="bg-brand-primary/10 text-brand-primary flex size-10 shrink-0 items-center justify-center rounded-lg">
                  {file.type.startsWith("image/") ? (
                    <Camera className="size-5" aria-hidden />
                  ) : (
                    <Paperclip className="size-5" aria-hidden />
                  )}
                </div>
                <div className="flex min-w-0 flex-col">
                  <p className="text-foreground truncate text-sm font-medium">{file.name}</p>
                  <p className="text-foreground-muted text-xs">
                    {(file.size / 1024 / 1024).toFixed(2)} MB
                  </p>
                </div>
              </div>
              <Button
                type="button"
                variant="ghost"
                size="icon"
                onClick={() => {
                  setFile(null);
                  setFileError(null);
                  if (fileInputRef.current) fileInputRef.current.value = "";
                  if (cameraInputRef.current) cameraInputRef.current.value = "";
                }}
                disabled={isPending}
                aria-label="Remove attachment"
                data-testid="incident-form-btn-remove"
              >
                <X aria-hidden className="size-4" />
              </Button>
            </div>
          )}
          <p className="text-foreground-muted text-xs">
            JPEG / PNG / WebP / MP4 / PDF, up to{" "}
            {Math.round(INCIDENT_ATTACHMENT_MAX_BYTES / 1024 / 1024)} MB.
          </p>
          {fileError ? (
            <p
              role="alert"
              className="text-status-danger-foreground text-xs"
              data-testid="incident-form-attachment-error"
            >
              {fileError}
            </p>
          ) : null}
        </div>

        <div className="flex justify-end">
          <FormSubmitButton
            size="lg"
            isPending={isPending}
            pendingLabel="Reporting…"
            data-testid="incident-form-submit"
          >
            <Send aria-hidden className="size-4" />
            <span>Report incident</span>
          </FormSubmitButton>
        </div>
      </form>
    </FormProvider>
  );
}

function ServerErrorBridge({
  result,
}: Readonly<{ result: ServerActionResult<unknown> | undefined }>) {
  useServerErrors(result);
  return null;
}
