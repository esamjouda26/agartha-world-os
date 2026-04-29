import Link from "next/link";
import { getTranslations } from "next-intl/server";

/**
 * Guest shell — minimal chrome for anonymous public routes.
 *
 * Spec: frontend_spec.md:240 ("Guest shell: minimal header with back button,
 * no nav bar, full-bleed content"). Per Infrastructure Contract item #7
 * (sessions.md GLOBAL SESSION CONTRACT), this layout MUST NOT mount
 * `<PortalProviders>` — that wrapper is reserved for staff portals and
 * pulls in QueryClient with admin-tuned defaults.
 *
 * Renders inside the root LocaleLayout's NextIntlClientProvider, so client
 * components below can call useTranslations / useLocale without a second
 * provider here.
 */
export default async function GuestLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  const tApp = await getTranslations("app");
  const tShell = await getTranslations("guest.shell");
  const brand = tApp("name");

  return (
    <div className="bg-background text-foreground flex min-h-dvh flex-col">
      {/* Atmospheric brand wash — only paints on lg+ where it reads as
          premium without competing with content on small screens.
          Decorative, pointer-event inert, single layer. */}
      <div aria-hidden className="pointer-events-none fixed inset-0 -z-10 hidden lg:block">
        <div className="bg-brand-primary/5 dark:bg-brand-primary/15 absolute -top-40 -left-32 h-[28rem] w-[28rem] rounded-full blur-3xl" />
      </div>

      <header
        data-testid="guest-shell-header"
        className="border-border-subtle bg-background/80 sticky top-0 z-20 border-b backdrop-blur-md"
      >
        <div className="mx-auto flex max-w-6xl items-center justify-between px-4 py-3 sm:px-6">
          <Link
            href={"/" as never}
            className="focus-visible:outline-ring flex items-center gap-2.5 outline-none focus-visible:rounded-md focus-visible:outline-2 focus-visible:outline-offset-4"
            data-testid="guest-shell-brand-link"
          >
            <span
              aria-hidden
              className="bg-brand-primary text-brand-primary-foreground flex size-8 items-center justify-center rounded-lg shadow-sm"
            >
              <span className="text-sm font-bold tracking-tighter">A</span>
            </span>
            <span className="text-foreground text-base font-semibold tracking-tight">{brand}</span>
          </Link>
          <nav aria-label="Guest navigation" className="text-sm">
            <Link
              href={"/my-booking" as never}
              className="text-foreground-muted hover:text-foreground focus-visible:outline-ring rounded-md px-3 py-1.5 outline-none focus-visible:outline-2 focus-visible:outline-offset-2"
              data-testid="guest-shell-my-booking-link"
            >
              {tShell("myBooking")}
            </Link>
          </nav>
        </div>
      </header>

      <main className="flex-1">{children}</main>

      <footer
        data-testid="guest-shell-footer"
        className="border-border-subtle text-foreground-muted mt-12 border-t py-5 text-center text-xs"
      >
        <p className="space-x-3">
          <span>
            &copy; {new Date().getFullYear()} {brand}
          </span>
          <Link
            href={"/privacy" as never}
            className="hover:text-foreground underline-offset-2 hover:underline"
          >
            {tShell("footerPrivacy")}
          </Link>
          <Link
            href={"/terms" as never}
            className="hover:text-foreground underline-offset-2 hover:underline"
          >
            {tShell("footerTerms")}
          </Link>
        </p>
      </footer>
    </div>
  );
}
