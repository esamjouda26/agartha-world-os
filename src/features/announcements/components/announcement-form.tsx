"use client";

import * as React from "react";
import { useForm, FormProvider, Controller } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Save } from "lucide-react";

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { FormSubmitButton } from "@/components/ui/form-submit-button";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";
import { toastError, toastSuccess } from "@/components/ui/toast-helpers";
import { useServerErrors } from "@/hooks/use-server-errors";
import type { ServerActionResult } from "@/lib/errors";

import { createAnnouncementAction } from "@/features/announcements/actions/create-announcement";
import { updateAnnouncementAction } from "@/features/announcements/actions/update-announcement";
import { TargetAudiencePicker } from "@/features/announcements/components/target-audience-picker";
import {
  createAnnouncementSchema,
  type AnnouncementTarget,
} from "@/features/announcements/schemas/announcement";
import type {
  OrgUnitOption,
  RoleOption,
  StaffOption,
} from "@/features/announcements/queries/target-picker-options";

type FormValues = Readonly<{
  title: string;
  content: string;
  isPublished: boolean;
  expiresAt: string | null;
  targets: AnnouncementTarget[];
}>;

type ResultShape = { id: string };

export type AnnouncementFormProps = Readonly<{
  /** When present, the form submits an edit of this row; otherwise it creates. */
  initial?: Readonly<{
    id: string;
    title: string;
    content: string;
    isPublished: boolean;
    expiresAt: string | null;
    targets: readonly AnnouncementTarget[];
  }>;
  roles: readonly RoleOption[];
  orgUnits: readonly OrgUnitOption[];
  staff: readonly StaffOption[];
  onComplete?: () => void;
}>;

/**
 * Create / edit form for announcements. Controlled by RHF + the
 * `createAnnouncementSchema` (same schema wraps the update case — the
 * only extra constraint on edit is the `id` field, which we add as a
 * hidden prop rather than a form input).
 */
export function AnnouncementForm({
  initial,
  roles,
  orgUnits,
  staff,
  onComplete,
}: AnnouncementFormProps) {
  const isEdit = Boolean(initial);
  const form = useForm<FormValues>({
    resolver: zodResolver(createAnnouncementSchema),
    defaultValues: initial
      ? {
          title: initial.title,
          content: initial.content,
          isPublished: initial.isPublished,
          expiresAt: initial.expiresAt,
          targets: [...initial.targets],
        }
      : {
          title: "",
          content: "",
          isPublished: false,
          expiresAt: null,
          targets: [{ target_type: "global" }],
        },
    mode: "onSubmit",
  });

  const [isPending, startTransition] = React.useTransition();
  const [serverResult, setServerResult] = React.useState<
    ServerActionResult<ResultShape> | undefined
  >(undefined);

  const onSubmit = form.handleSubmit((values) => {
    startTransition(async () => {
      const payload = {
        title: values.title,
        content: values.content,
        isPublished: values.isPublished,
        expiresAt: values.expiresAt,
        targets: values.targets,
      };
      const result = isEdit
        ? await updateAnnouncementAction({ id: initial!.id, ...payload })
        : await createAnnouncementAction(payload);
      setServerResult(result);
      if (result.success) {
        toastSuccess(isEdit ? "Announcement updated" : "Announcement created", {
          description: values.isPublished
            ? "It's now visible to the targeted audience."
            : "Saved as draft. Publish to deliver it.",
        });
        if (!isEdit) {
          form.reset({
            title: "",
            content: "",
            isPublished: false,
            expiresAt: null,
            targets: [{ target_type: "global" }],
          });
        }
        onComplete?.();
      } else {
        toastError(result);
      }
    });
  });

  return (
    <FormProvider {...form}>
      <ServerErrorBridge result={serverResult} />
      <form onSubmit={onSubmit} className="flex flex-col gap-6" noValidate>
        <Card data-testid="announcement-form-body">
          <CardHeader>
            <CardTitle>{isEdit ? "Edit announcement" : "New announcement"}</CardTitle>
            <CardDescription>
              Draft in private, then publish when ready. Once published, the targeted audience will
              see it in their announcements bell.
            </CardDescription>
          </CardHeader>
          <CardContent className="flex flex-col gap-5">
            <FormField
              control={form.control}
              name="title"
              render={({ field }) => (
                <FormItem>
                  <FormLabel htmlFor="announcement-title">Title</FormLabel>
                  <FormControl>
                    <Input
                      id="announcement-title"
                      placeholder="Monthly town hall — Tuesday"
                      maxLength={200}
                      disabled={isPending}
                      data-testid="announcement-form-title"
                      {...field}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="content"
              render={({ field }) => (
                <FormItem>
                  <FormLabel htmlFor="announcement-content">Content</FormLabel>
                  <FormControl>
                    <Textarea
                      id="announcement-content"
                      rows={6}
                      placeholder="Plain text. Markdown is not rendered — keep it conversational."
                      maxLength={10_000}
                      disabled={isPending}
                      data-testid="announcement-form-content"
                      {...field}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <div className="grid grid-cols-1 gap-5 md:grid-cols-2">
              <FormField
                control={form.control}
                name="isPublished"
                render={({ field }) => (
                  <FormItem className="flex flex-row items-center justify-between gap-4">
                    <div className="flex flex-col gap-1">
                      <FormLabel htmlFor="announcement-published">Publish now</FormLabel>
                      <p className="text-foreground-muted text-xs">
                        Off saves as a draft only you (and admins) can see.
                      </p>
                    </div>
                    <FormControl>
                      <Switch
                        id="announcement-published"
                        checked={field.value}
                        onCheckedChange={field.onChange}
                        disabled={isPending}
                        data-testid="announcement-form-published"
                      />
                    </FormControl>
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="expiresAt"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel htmlFor="announcement-expires">Expires (optional)</FormLabel>
                    <FormControl>
                      <Input
                        id="announcement-expires"
                        type="datetime-local"
                        value={isoToLocalInput(field.value)}
                        onChange={(e) => field.onChange(localInputToIso(e.target.value))}
                        disabled={isPending}
                        data-testid="announcement-form-expires"
                      />
                    </FormControl>
                    <p className="text-foreground-muted text-xs">
                      After this time, the announcement disappears from the bell automatically.
                    </p>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>
          </CardContent>
        </Card>

        <Controller
          control={form.control}
          name="targets"
          render={({ field, fieldState }) => (
            <TargetAudiencePicker
              value={field.value}
              onChange={field.onChange}
              roles={roles}
              orgUnits={orgUnits}
              staff={staff}
              data-testid="announcement-form-targets"
              {...(fieldState.error?.message ? { error: fieldState.error.message } : {})}
            />
          )}
        />

        <div className="flex justify-end">
          <FormSubmitButton
            size="lg"
            isPending={isPending}
            pendingLabel={isEdit ? "Saving…" : "Publishing…"}
            data-testid="announcement-form-submit"
          >
            <Save aria-hidden className="size-4" />
            <span>{isEdit ? "Save changes" : "Create announcement"}</span>
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

/** Converts an ISO string to a `<input type="datetime-local">` value in
 *  the user's local timezone. Returns `""` for null so the input
 *  renders empty. */
function isoToLocalInput(iso: string | null): string {
  if (!iso) return "";
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "";
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

function localInputToIso(value: string): string | null {
  if (!value) return null;
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return null;
  return d.toISOString();
}
