/**
 * Phase 2A verification gate: contrast measurements per prompt §E.
 *
 * For every body-text + UI-component token pair (light + dark), prints the
 * WCAG 2.x contrast ratio and PASS/FAIL verdict against the spec thresholds:
 *   - body text   ≥ 4.5:1 (AA normal text)
 *   - UI element  ≥ 3:1   (AA non-text contrast)
 *
 * Invocation:
 *   pnpm exec tsx scripts/check-contrast.ts
 *
 * Exit code: 0 on all-PASS, 1 on any FAIL.
 */

import { classifyText, classifyUi, contrastRatio } from "../src/lib/color-contrast";
import {
  TOKENS_DARK,
  TOKENS_LIGHT,
  type ThemeMode,
  type TokenSnapshot,
} from "../src/lib/design-tokens";

type Row = {
  pair: string;
  fg: string;
  bg: string;
  ratio: number;
  threshold: 4.5 | 3;
  verdict: string;
  exempt?: boolean;
  decorative?: boolean;
};

type TextPair = Readonly<{
  label: string;
  fgKey: keyof TokenSnapshot;
  bgKey: keyof TokenSnapshot;
  exempt?: boolean;
}>;

const TEXT_PAIRS: readonly TextPair[] = [
  // Body text on every surface tier
  { label: "foreground / background", fgKey: "foreground", bgKey: "background" },
  { label: "foreground / surface", fgKey: "foreground", bgKey: "surface" },
  { label: "foreground / card", fgKey: "foreground", bgKey: "card" },
  { label: "foreground / elevated", fgKey: "foreground", bgKey: "elevated" },

  { label: "foreground-muted / background", fgKey: "foregroundMuted", bgKey: "background" },
  { label: "foreground-muted / surface", fgKey: "foregroundMuted", bgKey: "surface" },
  { label: "foreground-muted / card", fgKey: "foregroundMuted", bgKey: "card" },
  { label: "foreground-muted / elevated", fgKey: "foregroundMuted", bgKey: "elevated" },

  { label: "foreground-subtle / background", fgKey: "foregroundSubtle", bgKey: "background" },
  { label: "foreground-subtle / surface", fgKey: "foregroundSubtle", bgKey: "surface" },
  { label: "foreground-subtle / card", fgKey: "foregroundSubtle", bgKey: "card" },
  { label: "foreground-subtle / elevated", fgKey: "foregroundSubtle", bgKey: "elevated" },

  // foreground-disabled is exempt from body contrast (WCAG 2.2 §1.4.3 inactive)
  // — we still report it against background as a UI-level check for completeness.
  {
    label: "foreground-disabled / background (UI ≥ 3:1; body exempt)",
    fgKey: "foregroundDisabled",
    bgKey: "background",
    exempt: true,
  },

  // Brand button text on brand surface
  {
    label: "brand-primary-foreground / brand-primary",
    fgKey: "brandPrimaryForeground",
    bgKey: "brandPrimary",
  },
  {
    label: "brand-accent-foreground / brand-accent",
    fgKey: "brandAccentForeground",
    bgKey: "brandAccent",
  },

  // Status foreground on soft backgrounds (the bg-X-soft text-X-foreground pattern)
  // The soft bg is composited over background by color-contrast.compositeOver.
  {
    label: "status-success-foreground / status-success-soft (over background)",
    fgKey: "statusSuccessForeground",
    bgKey: "statusSuccessSoft",
  },
  {
    label: "status-warning-foreground / status-warning-soft (over background)",
    fgKey: "statusWarningForeground",
    bgKey: "statusWarningSoft",
  },
  {
    label: "status-danger-foreground / status-danger-soft (over background)",
    fgKey: "statusDangerForeground",
    bgKey: "statusDangerSoft",
  },
  {
    label: "status-info-foreground / status-info-soft (over background)",
    fgKey: "statusInfoForeground",
    bgKey: "statusInfoSoft",
  },
  {
    label: "status-neutral-foreground / status-neutral-soft (over background)",
    fgKey: "statusNeutralForeground",
    bgKey: "statusNeutralSoft",
  },
  {
    label: "status-accent-foreground / status-accent-soft (over background)",
    fgKey: "statusAccentForeground",
    bgKey: "statusAccentSoft",
  },

  // status-solid colors are used for icon/dot accents — never as a body-text
  // background. The canonical text-on-status pattern (per frontend_spec §12s)
  // is `bg-X-soft text-X-foreground`, already covered above.
];

type UiPair = Readonly<{
  label: string;
  fgKey: keyof TokenSnapshot;
  bgKey: keyof TokenSnapshot;
  decorative?: boolean;
}>;

const UI_PAIRS: readonly UiPair[] = [
  // Interactive boundary — must meet 1.4.11 (≥ 3:1)
  {
    label: "border-strong / background  (form input borders)",
    fgKey: "borderStrong",
    bgKey: "background",
  },
  // Focus ring — meets 1.4.11 for interactive state
  { label: "brand-primary (focus ring) / background", fgKey: "brandPrimary", bgKey: "background" },
  // Decorative dividers — exempt from 1.4.11 (decorative graphics)
  {
    label: "border / background  (decorative — informational)",
    fgKey: "border",
    bgKey: "background",
    decorative: true,
  },
  {
    label: "border / card  (decorative — informational)",
    fgKey: "border",
    bgKey: "card",
    decorative: true,
  },
  {
    label: "border-subtle / background  (decorative — informational)",
    fgKey: "borderSubtle",
    bgKey: "background",
    decorative: true,
  },
];

function compositeIfNeeded(
  fgHex: string,
  bgHex: string,
  surfaceHex: string,
): { fg: string; bg: string } {
  // If bg is translucent rgba (status-soft in dark mode), composite over surface.
  if (bgHex.startsWith("rgba")) {
    // For ratio purposes, treat the visible bg as the composite of bg over surface.
    // contrastRatio handles fg alpha; we composite the bg side here.
    const composedBg = compositeColorOnBackground(bgHex, surfaceHex);
    return { fg: fgHex, bg: composedBg };
  }
  return { fg: fgHex, bg: bgHex };
}

function compositeColorOnBackground(rgbaHex: string, bgHex: string): string {
  // Reuse compositeOver via parseColor through contrastRatio's helpers.
  // For simplicity inline a tiny implementation.
  const m = /^rgba?\((\d+),\s*(\d+),\s*(\d+),\s*([\d.]+)\)$/i.exec(rgbaHex);
  if (!m) return rgbaHex;
  const r = Number(m[1]),
    g = Number(m[2]),
    b = Number(m[3]),
    a = Number(m[4]);
  const bg = parseHex(bgHex);
  const out = {
    r: Math.round(r * a + bg.r * (1 - a)),
    g: Math.round(g * a + bg.g * (1 - a)),
    b: Math.round(b * a + bg.b * (1 - a)),
  };
  return `#${out.r.toString(16).padStart(2, "0")}${out.g.toString(16).padStart(2, "0")}${out.b.toString(16).padStart(2, "0")}`;
}

function parseHex(hex: string): { r: number; g: number; b: number } {
  let h = hex.replace(/^#/, "");
  if (h.length === 3)
    h = h
      .split("")
      .map((c) => c + c)
      .join("");
  return {
    r: parseInt(h.slice(0, 2), 16),
    g: parseInt(h.slice(2, 4), 16),
    b: parseInt(h.slice(4, 6), 16),
  };
}

function check(mode: ThemeMode): { rows: Row[]; failed: number } {
  const tokens = mode === "dark" ? TOKENS_DARK : TOKENS_LIGHT;
  const rows: Row[] = [];
  let failed = 0;

  for (const pair of TEXT_PAIRS) {
    const { fg, bg } = compositeIfNeeded(tokens[pair.fgKey], tokens[pair.bgKey], tokens.background);
    const ratio = contrastRatio(fg, bg);
    const verdict = pair.exempt ? classifyUi(ratio) : classifyText(ratio);
    // Exempt pairs are reported informationally; they do not fail the gate.
    if (!pair.exempt && verdict === "FAIL") failed += 1;
    rows.push({
      pair: pair.label,
      fg,
      bg,
      ratio,
      threshold: pair.exempt ? 3 : 4.5,
      verdict,
      exempt: pair.exempt,
    });
  }

  for (const pair of UI_PAIRS) {
    const { fg, bg } = compositeIfNeeded(tokens[pair.fgKey], tokens[pair.bgKey], tokens.background);
    const ratio = contrastRatio(fg, bg);
    const verdict = classifyUi(ratio);
    if (!pair.decorative && verdict === "FAIL") failed += 1;
    rows.push({
      pair: pair.label,
      fg,
      bg,
      ratio,
      threshold: 3,
      verdict,
      decorative: pair.decorative,
    });
  }

  return { rows, failed };
}

function pad(s: string, n: number): string {
  return s.length >= n ? s : s + " ".repeat(n - s.length);
}

function printTable(mode: ThemeMode, rows: Row[]): void {
  console.info(`\n=== ${mode.toUpperCase()} MODE ===`);
  console.info(
    `${pad("pair", 70)}  ${pad("fg", 9)}  ${pad("bg", 9)}  ${pad("ratio", 8)}  ${pad("min", 4)}  verdict`,
  );
  console.info("-".repeat(120));
  for (const r of rows) {
    const tag = r.exempt
      ? "  (UI scope, body exempt)"
      : r.decorative
        ? "  (decorative — informational)"
        : "";
    console.info(
      `${pad(r.pair, 70)}  ${pad(r.fg, 9)}  ${pad(r.bg, 9)}  ${pad(r.ratio.toFixed(2) + ":1", 8)}  ${pad(String(r.threshold), 4)}  ${r.verdict}${tag}`,
    );
  }
}

const light = check("light");
const dark = check("dark");

printTable("light", light.rows);
printTable("dark", dark.rows);

const totalFailed = light.failed + dark.failed;
console.info(`\nTotal pairs checked: ${light.rows.length + dark.rows.length}`);
console.info(`Failures: ${totalFailed}`);

if (totalFailed > 0) {
  console.error(`\n[FAIL] ${totalFailed} pair(s) below WCAG threshold.`);
  process.exit(1);
}
console.info(`\n[PASS] All token pairs meet WCAG thresholds.`);
