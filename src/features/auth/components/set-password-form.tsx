"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { useTranslations, useLocale } from "next-intl";
import { FormProvider, useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";

import { Input } from "@/components/ui/input";
import { FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { FormSubmitButton } from "@/components/ui/form-submit-button";
import { toastSuccess } from "@/components/ui/toast-helpers";
import type { ServerActionResult } from "@/lib/errors";

import { setPasswordAction } from "@/features/auth/actions/set-password";
import { setPasswordSchema, type SetPasswordInput } from "@/features/auth/schemas/login.schema";

export function SetPasswordForm() {
  const t = useTranslations("auth.setPassword");
  const router = useRouter();
  const locale = useLocale();
  const [serverResult, setServerResult] = React.useState<ServerActionResult<unknown> | undefined>();

  const form = useForm<SetPasswordInput>({
    resolver: zodResolver(setPasswordSchema),
    defaultValues: { newPassword: "", confirmPassword: "" },
  });

  React.useEffect(() => {
    if (!serverResult || serverResult.success || !serverResult.fields) return;
    for (const [field, message] of Object.entries(serverResult.fields)) {
      form.setError(field as keyof SetPasswordInput, { type: "server", message });
    }
  }, [serverResult, form]);

  const onSubmit = form.handleSubmit(async (values) => {
    setServerResult(undefined);
    const result = await setPasswordAction(values);
    setServerResult(result);
    if (result.success) {
      toastSuccess("Password updated.");
      router.replace(`/${locale}` as never);
      router.refresh();
    }
  });

  return (
    <FormProvider {...form}>
      <form onSubmit={onSubmit} noValidate className="space-y-4" data-testid="set-password-form">
        <FormField
          name="newPassword"
          render={({ field }) => (
            <FormItem>
              <FormLabel>{t("newPasswordLabel")}</FormLabel>
              <FormControl>
                <Input
                  {...field}
                  type="password"
                  autoComplete="new-password"
                  data-testid="set-password-new"
                />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
        <FormField
          name="confirmPassword"
          render={({ field }) => (
            <FormItem>
              <FormLabel>{t("confirmPasswordLabel")}</FormLabel>
              <FormControl>
                <Input
                  {...field}
                  type="password"
                  autoComplete="new-password"
                  data-testid="set-password-confirm"
                />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
        <FormSubmitButton
          className="w-full"
          pendingLabel={t("submitting")}
          data-testid="set-password-submit"
        >
          {t("submit")}
        </FormSubmitButton>
      </form>
    </FormProvider>
  );
}
