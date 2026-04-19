import type { Metadata } from "next";
import { notFound } from "next/navigation";

import { ThemeToggle } from "@/components/theme-toggle";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { classifyText, classifyUi, contrastRatio } from "@/lib/color-contrast";
import { TOKENS_DARK, TOKENS_LIGHT, type ThemeMode } from "@/lib/design-tokens";

import { FormsDemo, OverlaysDemo, ToastsDemo } from "./_interactive";

// Must stay dynamic so the root layout's cookies() read picks up NEXT_THEME on
// every request. force-static would freeze the layout HTML at build time and
// the toggle would refresh back to system default.
export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Kitchen Sink — Phase 2A",
  description: "Design-token + shadcn primitive surface for design review.",
  robots: { index: false, follow: false },
};

const TYPE_SCALE = [
  { token: "--text-4xl", name: "Display", className: "text-4xl" },
  { token: "--text-3xl", name: "H1", className: "text-3xl" },
  { token: "--text-2xl", name: "H2", className: "text-2xl" },
  { token: "--text-xl", name: "H3", className: "text-xl" },
  { token: "--text-lg", name: "H4 / Lead", className: "text-lg" },
  { token: "--text-base", name: "Body", className: "text-base" },
  { token: "--text-sm", name: "Body small", className: "text-sm" },
  { token: "--text-xs", name: "Caption", className: "text-xs" },
] as const;

const STATUS_FAMILIES = [
  {
    name: "success",
    badge: "bg-status-success-soft text-status-success-foreground border-status-success-border",
    solid: "bg-status-success-solid text-white",
    soft: "bg-status-success-soft text-status-success-foreground",
    fg: "bg-status-success-foreground text-white",
    border: "bg-status-success-border text-foreground",
  },
  {
    name: "warning",
    badge: "bg-status-warning-soft text-status-warning-foreground border-status-warning-border",
    solid: "bg-status-warning-solid text-white",
    soft: "bg-status-warning-soft text-status-warning-foreground",
    fg: "bg-status-warning-foreground text-white",
    border: "bg-status-warning-border text-foreground",
  },
  {
    name: "danger",
    badge: "bg-status-danger-soft text-status-danger-foreground border-status-danger-border",
    solid: "bg-status-danger-solid text-white",
    soft: "bg-status-danger-soft text-status-danger-foreground",
    fg: "bg-status-danger-foreground text-white",
    border: "bg-status-danger-border text-foreground",
  },
  {
    name: "info",
    badge: "bg-status-info-soft text-status-info-foreground border-status-info-border",
    solid: "bg-status-info-solid text-white",
    soft: "bg-status-info-soft text-status-info-foreground",
    fg: "bg-status-info-foreground text-white",
    border: "bg-status-info-border text-foreground",
  },
  {
    name: "neutral",
    badge: "bg-status-neutral-soft text-status-neutral-foreground border-status-neutral-border",
    solid: "bg-status-neutral-solid text-white",
    soft: "bg-status-neutral-soft text-status-neutral-foreground",
    fg: "bg-status-neutral-foreground text-white",
    border: "bg-status-neutral-border text-foreground",
  },
  {
    name: "accent",
    badge: "bg-status-accent-soft text-status-accent-foreground border-status-accent-border",
    solid: "bg-status-accent-solid text-white",
    soft: "bg-status-accent-soft text-status-accent-foreground",
    fg: "bg-status-accent-foreground text-white",
    border: "bg-status-accent-border text-foreground",
  },
] as const;
type StatusFamily = (typeof STATUS_FAMILIES)[number];

const BUTTON_VARIANTS = [
  "default",
  "secondary",
  "outline",
  "ghost",
  "link",
  "destructive",
] as const;
const BUTTON_SIZES = ["xs", "sm", "default", "lg"] as const;

export default function KitchenSinkPage() {
  if (process.env.NODE_ENV === "production") {
    notFound();
  }

  return (
    <main className="bg-background text-foreground min-h-screen">
      <header className="border-border bg-card/60 sticky top-0 z-10 border-b backdrop-blur">
        <div className="mx-auto flex max-w-6xl items-center justify-between gap-4 px-6 py-4">
          <div>
            <p className="text-foreground-subtle font-mono text-xs tracking-wider uppercase">
              Phase 2A · Design Review Gate #1
            </p>
            <h1 className="text-2xl font-semibold">Kitchen Sink</h1>
          </div>
          <div className="flex items-center gap-3">
            <Badge variant="outline">dev only</Badge>
            <ThemeToggle />
          </div>
        </div>
      </header>

      <div className="mx-auto max-w-6xl space-y-16 px-6 py-12">
        <Section
          number="1"
          title="Typography"
          description="Inter sans + JetBrains Mono. 8 sizes per prompt §A.8 (heading reads '7 tiers' but lists 8)."
        >
          <div className="space-y-4">
            {TYPE_SCALE.map((t) => (
              <div
                key={t.token}
                className="border-border-subtle flex items-baseline gap-6 border-b pb-2"
              >
                <code className="text-foreground-subtle w-32 font-mono text-xs">{t.token}</code>
                <span className={`${t.className} font-sans`}>{t.name} · The quick brown fox</span>
              </div>
            ))}
            <div className="border-border-subtle flex items-baseline gap-6 border-b pb-2">
              <code className="text-foreground-subtle w-32 font-mono text-xs">--font-mono</code>
              <span className="font-mono text-base">
                const x = computeRoute({"{"} portal: "crew" {"}"});
              </span>
            </div>
          </div>
        </Section>

        <Section
          number="2"
          title="Color tokens"
          description="Brand, surface, and text tiers. Hex shown for current spec; ratios computed against the displayed surface."
        >
          <ContrastTable mode="light" />
          <div className="h-6" />
          <ContrastTable mode="dark" />
        </Section>

        <Section
          number="3"
          title="Status tokens"
          description="6 families × 4 variants. Maps 1:1 to frontend_spec.md §12s StatusBadge map."
        >
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {STATUS_FAMILIES.map((family) => (
              <StatusFamilyCard key={family.name} family={family} />
            ))}
          </div>
        </Section>

        <Section
          number="4"
          title="Buttons"
          description="Variant × size matrix. Default size = h-9; CVA configured in src/components/ui/button.tsx."
        >
          <div className="space-y-4">
            {BUTTON_VARIANTS.map((variant) => (
              <div key={variant} className="flex flex-wrap items-center gap-3">
                <code className="text-foreground-subtle w-28 font-mono text-xs">
                  variant={variant}
                </code>
                {BUTTON_SIZES.map((size) => (
                  <Button
                    key={size}
                    variant={variant}
                    size={size}
                    data-testid={`kitchen-sink-button-${variant}-${size}`}
                  >
                    {size}
                  </Button>
                ))}
              </div>
            ))}
            <div className="border-border-subtle flex flex-wrap items-center gap-3 border-t pt-4">
              <code className="text-foreground-subtle w-28 font-mono text-xs">state</code>
              <Button disabled>Disabled</Button>
              <Button aria-busy>Loading</Button>
            </div>
          </div>
        </Section>

        <Section
          number="5"
          title="Forms"
          description="Every field type. Errors via aria-invalid + aria-describedby; disabled state distinct from invalid."
        >
          <FormsDemo />
        </Section>

        <Section
          number="6"
          title="Dialogs + Sheets"
          description="Focus-trap on open, focus-return on close, Escape closes — verify by keyboard."
        >
          <OverlaysDemo />
        </Section>

        <Section
          number="7"
          title="Toasts"
          description="sonner-driven. success / error / queued / info / warning."
        >
          <ToastsDemo />
        </Section>

        <Section
          number="8"
          title="Theme toggle"
          description="Cookie-persisted via NEXT_THEME (next-themes storageKey). The header toggle drives every section."
        >
          <div className="border-border bg-card flex items-center gap-4 rounded-lg border p-4">
            <ThemeToggle />
            <div>
              <p className="text-sm font-medium">Toggle light ⇄ dark</p>
              <p className="text-foreground-muted text-sm">
                Each press writes the NEXT_THEME cookie + flips the .dark class on &lt;html&gt;. No
                flash on reload (next-themes inline script).
              </p>
            </div>
          </div>
        </Section>
      </div>
    </main>
  );
}

function Section({
  number,
  title,
  description,
  children,
}: Readonly<{
  number: string;
  title: string;
  description: string;
  children: React.ReactNode;
}>) {
  return (
    <section className="space-y-6">
      <div className="flex items-baseline gap-4">
        <span className="text-foreground-subtle font-mono text-xs">§{number}</span>
        <div>
          <h2 className="text-xl font-semibold">{title}</h2>
          <p className="text-foreground-muted text-sm">{description}</p>
        </div>
      </div>
      {children}
    </section>
  );
}

const TEXT_TOKEN_PAIRS = [
  { fg: "foreground", label: "foreground" },
  { fg: "foregroundMuted", label: "foreground-muted" },
  { fg: "foregroundSubtle", label: "foreground-subtle" },
  {
    fg: "foregroundDisabled",
    label: "foreground-disabled (UI ≥ 3:1; body exempt per WCAG 2.2 §1.4.3 inactive)",
  },
] as const;

const SURFACE_KEYS = ["background", "surface", "card", "elevated"] as const;

function ContrastTable({ mode }: Readonly<{ mode: ThemeMode }>) {
  const tokens = mode === "dark" ? TOKENS_DARK : TOKENS_LIGHT;
  return (
    <div
      role="region"
      aria-label={`${mode === "dark" ? "Dark" : "Light"} mode contrast table`}
      tabIndex={0}
      className="border-border bg-card focus-visible:outline-ring overflow-x-auto rounded-lg border"
    >
      <div className="border-border-subtle flex items-center justify-between border-b px-4 py-3">
        <h3 className="text-sm font-semibold tracking-wider uppercase">
          {mode === "dark" ? "Dark mode" : "Light mode"}
        </h3>
        <code className="text-foreground-subtle font-mono text-xs">body ≥ 4.5:1 · UI ≥ 3:1</code>
      </div>
      <table className="w-full text-sm">
        <thead>
          <tr className="border-border-subtle border-b text-left">
            <th className="px-4 py-2 font-medium">text token</th>
            <th className="px-4 py-2 font-medium">hex</th>
            {SURFACE_KEYS.map((s) => (
              <th key={s} className="px-4 py-2 font-medium">
                on {s}
                <span className="text-foreground-subtle ml-1 font-mono text-xs">{tokens[s]}</span>
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {TEXT_TOKEN_PAIRS.map((pair) => {
            const fgHex = tokens[pair.fg];
            return (
              <tr key={pair.fg} className="border-border-subtle border-b">
                <td className="px-4 py-2">{pair.label}</td>
                <td className="px-4 py-2">
                  <span className="inline-flex items-center gap-2">
                    <span
                      aria-hidden
                      className="border-border h-4 w-4 rounded-sm border"
                      style={{ background: fgHex }}
                    />
                    <code className="font-mono text-xs">{fgHex}</code>
                  </span>
                </td>
                {SURFACE_KEYS.map((s) => {
                  const ratio = contrastRatio(fgHex, tokens[s]);
                  const verdict =
                    pair.fg === "foregroundDisabled" ? classifyUi(ratio) : classifyText(ratio);
                  return (
                    <td key={s} className="px-4 py-2">
                      <span className="font-mono text-xs">{ratio.toFixed(2)}:1</span>
                      <span
                        className={`ml-2 inline-block rounded-sm px-1.5 py-0.5 font-mono text-[10px] uppercase ${
                          verdict === "FAIL"
                            ? "bg-status-danger-soft text-status-danger-foreground"
                            : "bg-status-success-soft text-status-success-foreground"
                        }`}
                      >
                        {verdict}
                      </span>
                    </td>
                  );
                })}
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}

function StatusFamilyCard({ family }: Readonly<{ family: StatusFamily }>) {
  return (
    <div className="border-border bg-card space-y-3 rounded-lg border p-4">
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-semibold capitalize">{family.name}</h3>
        <Badge className={family.badge} variant="outline">
          badge
        </Badge>
      </div>
      <div className="grid grid-cols-4 gap-2">
        <Swatch label="solid" tokenClass={family.solid} />
        <Swatch label="soft" tokenClass={family.soft} />
        <Swatch label="fg" tokenClass={family.fg} />
        <Swatch label="border" tokenClass={family.border} />
      </div>
    </div>
  );
}

function Swatch({ label, tokenClass }: Readonly<{ label: string; tokenClass: string }>) {
  // Label is rendered on the card background (not on the swatch) so its
  // contrast is text-foreground / card — always passing — regardless of the
  // saturated color in the swatch above it.
  return (
    <div className="space-y-1">
      <div aria-hidden className={`border-border-subtle h-9 rounded-md border ${tokenClass}`} />
      <span className="text-foreground-subtle block text-center font-mono text-[10px] uppercase">
        {label}
      </span>
    </div>
  );
}
