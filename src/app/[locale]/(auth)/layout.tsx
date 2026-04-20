import { getTranslations } from "next-intl/server";

import { ThemeToggle } from "@/components/theme-toggle";

/**
 * Auth shell — the non-portal surface. Renders every auth-flow route
 * (login, set-password, access-revoked, not-started, on-leave).
 *
 * Redesign: atmospheric warm-gold + cool-teal aurora on the canvas,
 * centered glass card with hairline border + gold glow halo in dark
 * mode. The page content below is the card's body — keep it tight,
 * the shell does the premium-feel work.
 */
export default async function AuthLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  const t = await getTranslations("app");
  return (
    <main
      data-testid="auth-shell"
      className="bg-background text-foreground relative flex min-h-dvh flex-col items-center justify-center overflow-hidden px-4 py-12"
    >
      {/* Atmospheric aurora wash. Two blurred radial blobs anchor the
          brand palette onto the canvas without needing a hero image.
          Both are decorative and pointer-event inert. */}
      <div aria-hidden className="pointer-events-none absolute inset-0 -z-10">
        <div className="bg-brand-primary/10 dark:bg-brand-primary/20 absolute -top-40 -left-32 h-[28rem] w-[28rem] rounded-full blur-3xl" />
        <div className="bg-brand-accent/10 dark:bg-brand-accent/25 absolute -right-32 -bottom-40 h-[28rem] w-[28rem] rounded-full blur-3xl" />
      </div>

      {/* Theme toggle for users who arrive via a deep link in the wrong
          mode (the SSR cookie is honored on first paint, but an
          explicit opt-out is expected UX on auth surfaces). */}
      <div className="absolute top-4 right-4">
        <ThemeToggle />
      </div>

      {/* Brand wordmark — tracking-widest small-caps reads as a heritage
          lockup without needing a custom SVG, matches the hospitality
          palette's antique-brass vibe. */}
      <header className="mb-10 flex flex-col items-center gap-2">
        <p className="text-brand-primary text-sm font-semibold tracking-[0.3em] uppercase">
          {t("name")}
        </p>
        <p className="text-foreground-subtle text-xs">Staff workspace</p>
      </header>

      {/* Glass auth card. Frosted surface, hairline border, soft shadow
          in light; gold halo in dark so the card reads as lit against
          the atmospheric canvas. */}
      <div className="bg-card border-border-subtle dark:shadow-glow-brand/40 w-full max-w-md rounded-2xl border p-6 shadow-xl sm:p-8">
        {children}
      </div>
    </main>
  );
}
