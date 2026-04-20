"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { AlertCircle, Eye, EyeOff, Lock, Mail } from "lucide-react";
import { useTranslations, useLocale } from "next-intl";
import { FormProvider, useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";

import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Input } from "@/components/ui/input";
import {
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
  FormSubmitButton,
} from "@/components/ui/form-primitives";
import { toastError } from "@/components/ui/toast-helpers";
import { cn } from "@/lib/utils";
import type { ErrorCode, ServerActionResult } from "@/lib/errors";

import { loginAction } from "@/features/auth/actions/login";
import { loginSchema, type LoginInput } from "@/features/auth/schemas/login.schema";

type LoginData = Awaited<ReturnType<typeof loginAction>>;

function portalRoot(level: "admin" | "manager" | "crew" | null | undefined): string {
  switch (level) {
    case "admin":
      return "/admin/it";
    case "manager":
      return "/management";
    case "crew":
      return "/crew/attendance";
    default:
      return "/";
  }
}

// Auth errors are form-level concerns — mapped to a single alert
// shown above the fields rather than attributed to a specific input.
const FORM_ERROR_COPY: Partial<Record<ErrorCode, { title: string; description: string }>> = {
  UNAUTHENTICATED: {
    title: "Invalid email or password",
    description:
      "Double-check your credentials and try again. After five failed attempts we'll pause the form for a minute.",
  },
  RATE_LIMITED: {
    title: "Too many attempts",
    description:
      "Please wait a minute before trying again. If you're locked out, contact HR or your manager.",
  },
  FORBIDDEN: {
    title: "Account inactive",
    description:
      "Your account isn't permitted to sign in from this device. Contact HR if you believe this is an error.",
  },
  INTERNAL: {
    title: "Something went wrong",
    description: "We couldn't complete the sign-in. Please try again in a moment.",
  },
};

export function LoginForm({ nextPath }: Readonly<{ nextPath?: string }>) {
  const t = useTranslations("auth.login");
  const router = useRouter();
  const locale = useLocale();
  const [serverResult, setServerResult] = React.useState<ServerActionResult<unknown> | undefined>();
  const [showPassword, setShowPassword] = React.useState(false);

  const form = useForm<LoginInput>({
    resolver: zodResolver(loginSchema),
    defaultValues: { email: "", password: "" },
  });

  // Only route FIELD-LEVEL errors (validation) into RHF's per-field state.
  // Form-level errors (UNAUTHENTICATED / RATE_LIMITED / …) render in the
  // <Alert> below — never on an individual input.
  React.useEffect(() => {
    if (!serverResult || serverResult.success || !serverResult.fields) return;
    for (const [field, message] of Object.entries(serverResult.fields)) {
      form.setError(field as keyof LoginInput, { type: "server", message });
    }
  }, [serverResult, form]);

  // When the user edits either field, clear the form-level alert — a
  // sign they're retrying, keeping the banner stale would confuse.
  const emailValue = form.watch("email");
  const passwordValue = form.watch("password");
  React.useEffect(() => {
    setServerResult(undefined);
  }, [emailValue, passwordValue]);

  const onSubmit = form.handleSubmit(async (values) => {
    setServerResult(undefined);
    const result: LoginData = await loginAction(values);
    setServerResult(result);
    if (!result.success) {
      if (result.error === "RATE_LIMITED") {
        toastError({ success: false, error: "RATE_LIMITED" });
      }
      return;
    }
    const target =
      nextPath && nextPath.startsWith("/")
        ? nextPath
        : `/${locale}${portalRoot(result.data.accessLevel)}`;
    router.replace(target as never);
    router.refresh();
  });

  const formLevelError = resolveFormLevelError(serverResult);

  return (
    <FormProvider {...form}>
      <form onSubmit={onSubmit} noValidate className="space-y-5" data-testid="login-form">
        {formLevelError ? (
          <Alert
            variant="destructive"
            role="alert"
            aria-live="polite"
            data-testid="login-form-error"
          >
            <AlertCircle className="size-4" />
            <AlertTitle>{formLevelError.title}</AlertTitle>
            <AlertDescription>{formLevelError.description}</AlertDescription>
          </Alert>
        ) : null}

        <FormField
          name="email"
          render={({ field }) => (
            <FormItem>
              <FormLabel>{t("emailLabel")}</FormLabel>
              <FormControl>
                <InputWithIcon icon={<Mail aria-hidden className="size-4" />}>
                  <Input
                    {...field}
                    type="email"
                    autoComplete="email"
                    inputMode="email"
                    placeholder={t("emailPlaceholder")}
                    className="pl-9"
                    data-testid="login-email"
                  />
                </InputWithIcon>
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        <FormField
          name="password"
          render={({ field }) => (
            <FormItem>
              <FormLabel>{t("passwordLabel")}</FormLabel>
              <FormControl>
                <InputWithIcon icon={<Lock aria-hidden className="size-4" />}>
                  <Input
                    {...field}
                    type={showPassword ? "text" : "password"}
                    autoComplete="current-password"
                    className="px-9"
                    data-testid="login-password"
                  />
                  <button
                    type="button"
                    aria-label={showPassword ? "Hide password" : "Show password"}
                    aria-pressed={showPassword}
                    onClick={() => setShowPassword((v) => !v)}
                    className="text-foreground-subtle hover:text-foreground focus-visible:outline-ring absolute top-1/2 right-3 grid size-6 -translate-y-1/2 place-items-center rounded outline-none focus-visible:outline-2 focus-visible:outline-offset-2"
                    data-testid="login-password-toggle"
                    tabIndex={-1}
                  >
                    {showPassword ? (
                      <EyeOff aria-hidden className="size-4" />
                    ) : (
                      <Eye aria-hidden className="size-4" />
                    )}
                  </button>
                </InputWithIcon>
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        <FormSubmitButton
          size="xl"
          className="w-full"
          pendingLabel={t("submitting")}
          data-testid="login-submit"
        >
          {t("submit")}
        </FormSubmitButton>
      </form>
    </FormProvider>
  );
}

/** Small wrapper that overlays a leading icon on any Input child. Keeps
 *  the Input primitive itself icon-agnostic while giving forms a
 *  consistent leading-affordance treatment. */
function InputWithIcon({
  icon,
  children,
  className,
}: Readonly<{
  icon: React.ReactNode;
  children: React.ReactNode;
  className?: string;
}>) {
  return (
    <div className={cn("relative", className)}>
      <span
        aria-hidden
        className="text-foreground-subtle pointer-events-none absolute top-1/2 left-3 -translate-y-1/2"
      >
        {icon}
      </span>
      {children}
    </div>
  );
}

function resolveFormLevelError(
  result: ServerActionResult<unknown> | undefined,
): { title: string; description: string } | null {
  if (!result || result.success) return null;
  // If the server returned field-level details, treat it as field-attributed
  // (RHF already surfaces those via setError). No top-of-form banner.
  if (result.fields && Object.keys(result.fields).length > 0) return null;
  return FORM_ERROR_COPY[result.error] ?? null;
}
