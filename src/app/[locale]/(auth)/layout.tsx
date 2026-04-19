import { getTranslations } from "next-intl/server";

export default async function AuthLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  const t = await getTranslations("app");
  return (
    <main
      data-testid="auth-shell"
      className="bg-background text-foreground flex min-h-dvh flex-col items-center justify-center px-4 py-12"
    >
      <div className="mb-8 text-center">
        <h2 className="text-xl font-semibold tracking-tight">{t("name")}</h2>
      </div>
      <div className="bg-card border-border w-full max-w-md rounded-xl border p-6 shadow-sm sm:p-8">
        {children}
      </div>
    </main>
  );
}
