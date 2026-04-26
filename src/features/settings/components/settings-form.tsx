"use client";

import * as React from "react";
import { useForm, FormProvider } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useLocale } from "next-intl";
import { Loader2, Upload, LogOut } from "lucide-react";

import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { toastError, toastSuccess } from "@/components/ui/toast-helpers";
import { ThemeToggle } from "@/components/shared/theme-toggle";
import { useServerErrors } from "@/hooks/use-server-errors";
import type { ServerActionResult } from "@/lib/errors";

import { updateAvatarAction } from "@/features/settings/actions/update-avatar";
import { logoutAction } from "@/features/auth/actions/logout";
import {
  AVATAR_ALLOWED_MIME,
  AVATAR_MAX_BYTES,
  avatarFileSchema,
} from "@/features/settings/schemas/profile";

const avatarFormSchema = z.object({ avatar: avatarFileSchema });

type AvatarFormShape = z.infer<typeof avatarFormSchema>;

type UpdateAvatarResult = { avatarUrl: string };

type SettingsFormProps = Readonly<{
  user: Readonly<{
    id: string;
    email: string;
    displayName: string;
    avatarUrl: string | null;
    employeeId: string | null;
  }>;
}>;

function resolveInitials(displayName: string, email: string): string {
  const source = displayName.trim() || email.trim();
  if (!source) return "??";
  const parts = source.split(/\s+/).filter(Boolean);
  if (parts.length === 1) return source.slice(0, 2).toUpperCase();
  return (parts[0]![0]! + parts[parts.length - 1]![0]!).toUpperCase();
}

/** Tiny labeled static value — display-only field inside the profile Card.
 *  Local to SettingsForm; promote to a primitive if a second caller lands. */
function ReadOnlyField({
  label,
  value,
  testId,
}: Readonly<{ label: string; value: string; testId: string }>) {
  return (
    <div className="flex flex-col gap-1.5">
      <span className="text-foreground-muted text-xs font-medium tracking-wide uppercase">
        {label}
      </span>
      <span
        data-testid={testId}
        className="text-foreground bg-surface/60 border-border rounded-lg border px-3 py-2 text-sm"
      >
        {value}
      </span>
    </div>
  );
}

/** Keeps `useServerErrors` inside the <FormProvider> tree without the
 *  parent juggling another hook call site. */
function ServerErrorBridge({
  result,
}: Readonly<{ result: ServerActionResult<unknown> | undefined }>) {
  useServerErrors(result);
  return null;
}

function LogoutButton() {
  const [isPending, startTransition] = React.useTransition();
  const locale = useLocale();

  const handleLogout = () => {
    startTransition(async () => {
      const result = await logoutAction();
      if (result.success) {
        window.location.href = `/${locale}/auth/login`;
      } else {
        toastError(result);
      }
    });
  };

  return (
    <Button
      type="button"
      variant="outline"
      onClick={handleLogout}
      disabled={isPending}
      data-testid="settings-logout-btn"
    >
      {isPending ? (
        <Loader2 aria-hidden className="size-4 animate-spin" />
      ) : (
        <LogOut aria-hidden className="size-4" />
      )}
      <span>Sign Out</span>
    </Button>
  );
}

/**
 * Settings client leaf — profile card (display_name / email / employee_id
 * are all read-only; display_name is HR-governed and not user-editable
 * per the project's permission model), avatar uploader, theme toggle.
 *
 * The avatar uploader uses `react-hook-form` + `@hookform/resolvers/zod`,
 * bridged to the Server Action via `startTransition` + `useServerErrors`.
 */
export function SettingsForm({ user }: SettingsFormProps) {
  const form = useForm<AvatarFormShape>({
    // Resolver wraps the avatarFormSchema (File → { avatar: File }). RHF
    // runs it on submit to surface validation messages into <FormMessage>.
    resolver: zodResolver(avatarFormSchema),
    defaultValues: { avatar: undefined as unknown as File },
    mode: "onSubmit",
  });
  const [isPending, startTransition] = React.useTransition();
  const [serverResult, setServerResult] = React.useState<
    ServerActionResult<UpdateAvatarResult> | undefined
  >(undefined);
  const fileInputRef = React.useRef<HTMLInputElement | null>(null);
  const selectedFile = form.watch("avatar");

  const onSubmit = form.handleSubmit((values) => {
    startTransition(async () => {
      const fd = new FormData();
      fd.set("avatar", values.avatar);
      const result = await updateAvatarAction(fd);
      setServerResult(result);
      if (result.success) {
        toastSuccess("Avatar updated", {
          description: "Your new avatar is live across AgarthaOS.",
        });
        form.reset({ avatar: undefined as unknown as File });
        if (fileInputRef.current) fileInputRef.current.value = "";
      } else {
        toastError(result);
      }
    });
  });

  return (
    <FormProvider {...form}>
      <ServerErrorBridge result={serverResult} />
      <div className="flex flex-col gap-6">
        <Card data-testid="settings-profile-card">
          <CardHeader>
            <CardTitle>Your profile</CardTitle>
            <CardDescription>
              Display name, email, and employee ID are managed by HR. Contact your HR partner if any
              of these need to change.
            </CardDescription>
          </CardHeader>
          <CardContent className="grid grid-cols-1 gap-4 md:grid-cols-2">
            <ReadOnlyField
              label="Display name"
              value={user.displayName || "—"}
              testId="settings-profile-display-name"
            />
            <ReadOnlyField
              label="Email"
              value={user.email || "—"}
              testId="settings-profile-email"
            />
            <ReadOnlyField
              label="Employee ID"
              value={user.employeeId ?? "—"}
              testId="settings-profile-employee-id"
            />
          </CardContent>
        </Card>

        <Card data-testid="settings-avatar-card">
          <CardHeader>
            <CardTitle>Avatar</CardTitle>
            <CardDescription>
              JPEG, PNG, or WebP · up to {Math.round(AVATAR_MAX_BYTES / 1024 / 1024)} MB · visible
              to your teammates.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={onSubmit} className="flex flex-col gap-6" noValidate>
              <div className="flex items-center gap-5">
                <Avatar size="lg" className="size-20" data-testid="settings-avatar-preview">
                  {user.avatarUrl ? (
                    <AvatarImage src={user.avatarUrl} alt={user.displayName || "Avatar"} />
                  ) : null}
                  <AvatarFallback>{resolveInitials(user.displayName, user.email)}</AvatarFallback>
                </Avatar>
                <div className="flex min-w-0 flex-col gap-1">
                  <p className="text-foreground text-sm font-medium">
                    {user.displayName || "Unnamed"}
                  </p>
                  <p className="text-foreground-muted truncate text-xs">{user.email}</p>
                </div>
              </div>

              <FormField
                control={form.control}
                name="avatar"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel htmlFor="settings-avatar-input">Upload a new avatar</FormLabel>
                    <FormControl>
                      <Input
                        id="settings-avatar-input"
                        type="file"
                        accept={AVATAR_ALLOWED_MIME.join(",")}
                        ref={(el) => {
                          fileInputRef.current = el;
                        }}
                        onBlur={field.onBlur}
                        onChange={(event) => {
                          const file = event.target.files?.[0];
                          field.onChange(file ?? undefined);
                        }}
                        disabled={isPending}
                        data-testid="settings-avatar-input"
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <div className="flex items-center justify-between gap-3">
                <p className="text-foreground-muted text-xs">
                  {selectedFile instanceof File
                    ? `Ready to upload: ${selectedFile.name}`
                    : "No file selected yet."}
                </p>
                <Button
                  type="submit"
                  disabled={isPending || !(selectedFile instanceof File)}
                  aria-busy={isPending || undefined}
                  data-testid="settings-avatar-submit"
                >
                  {isPending ? (
                    <>
                      <Loader2 aria-hidden className="size-4 animate-spin" />
                      <span>Uploading…</span>
                    </>
                  ) : (
                    <>
                      <Upload aria-hidden className="size-4" />
                      <span>Upload avatar</span>
                    </>
                  )}
                </Button>
              </div>
            </form>
          </CardContent>
        </Card>

        <Card data-testid="settings-theme-card">
          <CardHeader>
            <CardTitle>Appearance</CardTitle>
            <CardDescription>
              Toggle between light and dark themes. Saved on this device.
            </CardDescription>
          </CardHeader>
          <CardContent className="flex items-center justify-between">
            <div className="flex flex-col gap-1">
              <p className="text-foreground text-sm font-medium">Theme</p>
              <p className="text-foreground-muted text-xs">Default: dark.</p>
            </div>
            <ThemeToggle />
          </CardContent>
        </Card>

        <Card data-testid="settings-session-card">
          <CardHeader>
            <CardTitle>Session</CardTitle>
            <CardDescription>
              Sign out of your account on this device.
            </CardDescription>
          </CardHeader>
          <CardContent className="flex items-center justify-between">
            <div className="flex flex-col gap-1">
              <p className="text-foreground text-sm font-medium">Sign Out</p>
              <p className="text-foreground-muted text-xs">End your current session.</p>
            </div>
            <LogoutButton />
          </CardContent>
        </Card>
      </div>
    </FormProvider>
  );
}
