"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { useTranslations, useLocale } from "next-intl";
import { FormProvider, useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";

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
import type { ServerActionResult } from "@/lib/errors";

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

export function LoginForm({ nextPath }: Readonly<{ nextPath?: string }>) {
  const t = useTranslations("auth.login");
  const router = useRouter();
  const locale = useLocale();
  const [serverResult, setServerResult] = React.useState<ServerActionResult<unknown> | undefined>();

  const form = useForm<LoginInput>({
    resolver: zodResolver(loginSchema),
    defaultValues: { email: "", password: "" },
  });

  // Route server-side `fields` errors into RHF's error state so
  // `<FormMessage>` renders them under the correct input.
  React.useEffect(() => {
    if (!serverResult || serverResult.success || !serverResult.fields) return;
    for (const [field, message] of Object.entries(serverResult.fields)) {
      form.setError(field as keyof LoginInput, { type: "server", message });
    }
  }, [serverResult, form]);

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

  return (
    <FormProvider {...form}>
      <form onSubmit={onSubmit} noValidate className="space-y-4" data-testid="login-form">
        <FormField
          name="email"
          render={({ field }) => (
            <FormItem>
              <FormLabel>{t("emailLabel")}</FormLabel>
              <FormControl>
                <Input
                  {...field}
                  type="email"
                  autoComplete="email"
                  inputMode="email"
                  placeholder={t("emailPlaceholder")}
                  data-testid="login-email"
                />
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
                <Input
                  {...field}
                  type="password"
                  autoComplete="current-password"
                  data-testid="login-password"
                />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
        <FormSubmitButton
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
