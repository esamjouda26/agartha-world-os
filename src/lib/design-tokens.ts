/**
 * Snapshot of the canonical token hex values declared in src/app/globals.css.
 * Used by:
 *  - scripts/check-contrast.ts (gate evidence)
 *  - kitchen-sink color/contrast sections (inline display)
 *
 * globals.css is the runtime source of truth. Keep this file in sync when you
 * add or change a theme-switchable token.
 */

export type ThemeMode = "light" | "dark";

export type TokenSnapshot = Readonly<{
  // Brand
  brandPrimary: string;
  brandPrimaryForeground: string;
  brandAccent: string;
  brandAccentForeground: string;

  // Surfaces
  background: string;
  surface: string;
  card: string;
  elevated: string;

  // Text
  foreground: string;
  foregroundMuted: string;
  foregroundSubtle: string;
  foregroundDisabled: string;

  // Borders
  border: string;
  borderStrong: string;
  borderSubtle: string;

  // Status (4 variants × 6 families)
  statusSuccessSolid: string;
  statusSuccessSoft: string;
  statusSuccessForeground: string;
  statusSuccessBorder: string;
  statusWarningSolid: string;
  statusWarningSoft: string;
  statusWarningForeground: string;
  statusWarningBorder: string;
  statusDangerSolid: string;
  statusDangerSoft: string;
  statusDangerForeground: string;
  statusDangerBorder: string;
  statusInfoSolid: string;
  statusInfoSoft: string;
  statusInfoForeground: string;
  statusInfoBorder: string;
  statusNeutralSolid: string;
  statusNeutralSoft: string;
  statusNeutralForeground: string;
  statusNeutralBorder: string;
  statusAccentSolid: string;
  statusAccentSoft: string;
  statusAccentForeground: string;
  statusAccentBorder: string;
}>;

// Light-mode token snapshot — mirrors `:root {}` in globals.css.
export const TOKENS_LIGHT: TokenSnapshot = {
  // Gold brand + teal accent.
  brandPrimary: "#8a5e13", // gold-700
  brandPrimaryForeground: "#ffffff",
  brandAccent: "#086b54", // teal-700
  brandAccentForeground: "#ffffff",

  // Warm-cool canvas; cards pop to true white.
  background: "#fcfbf8",
  surface: "#f6f4ef",
  card: "#ffffff",
  elevated: "#ffffff",

  foreground: "#0f0f14",
  foregroundMuted: "#3f3f47",
  foregroundSubtle: "#5a5a62",
  foregroundDisabled: "#a8a8b0",

  border: "#e7e5df",
  borderStrong: "#6b6b72",
  borderSubtle: "#f2efe9",

  statusSuccessSolid: "#10b981",
  statusSuccessSoft: "#ecfdf5",
  statusSuccessForeground: "#047857",
  statusSuccessBorder: "#a7f3d0",

  // Warning shifted off amber → orange to avoid visual collision with gold.
  statusWarningSolid: "#f97316",
  statusWarningSoft: "#fff7ed",
  statusWarningForeground: "#9a3412",
  statusWarningBorder: "#fed7aa",

  statusDangerSolid: "#ef4444",
  statusDangerSoft: "#fef2f2",
  statusDangerForeground: "#b91c1c",
  statusDangerBorder: "#fecaca",

  statusInfoSolid: "#3b82f6",
  statusInfoSoft: "#eff6ff",
  statusInfoForeground: "#1d4ed8",
  statusInfoBorder: "#bfdbfe",

  statusNeutralSolid: "#71717a",
  statusNeutralSoft: "#f4f4f5",
  statusNeutralForeground: "#3f3f46",
  statusNeutralBorder: "#e4e4e7",

  // Accent-status repurposed from violet → teal to match brand accent.
  statusAccentSolid: "#1ba87e",
  statusAccentSoft: "#ecfbf6",
  statusAccentForeground: "#086b54",
  statusAccentBorder: "#a0e9d0",
};

// Dark-mode token snapshot — mirrors `.dark {}` in globals.css.
export const TOKENS_DARK: TokenSnapshot = {
  brandPrimary: "#d4a53d", // gold-400
  brandPrimaryForeground: "#1a1004", // deep warm near-black
  brandAccent: "#3cc499", // teal-400
  brandAccentForeground: "#052e27",

  // Atmospheric canvas with layered card tints.
  background: "#08080a",
  surface: "#0f0f12",
  card: "#14141a",
  elevated: "#1c1c24",

  foreground: "#f5f5f7",
  foregroundMuted: "#c8c8cc",
  foregroundSubtle: "#8a8a92",
  foregroundDisabled: "#4a4a52",

  // Decorative hairline borders at low alpha; form-input border is solid.
  border: "rgba(255, 255, 255, 0.08)",
  borderStrong: "#7a7a82",
  borderSubtle: "rgba(255, 255, 255, 0.04)",

  statusSuccessSolid: "#10b981",
  statusSuccessSoft: "rgba(16, 185, 129, 0.15)",
  statusSuccessForeground: "#6ee7b7",
  statusSuccessBorder: "rgba(16, 185, 129, 0.4)",

  statusWarningSolid: "#f97316",
  statusWarningSoft: "rgba(249, 115, 22, 0.15)",
  statusWarningForeground: "#fdba74", // orange-300
  statusWarningBorder: "rgba(249, 115, 22, 0.4)",

  statusDangerSolid: "#ef4444",
  statusDangerSoft: "rgba(239, 68, 68, 0.15)",
  statusDangerForeground: "#fca5a5",
  statusDangerBorder: "rgba(239, 68, 68, 0.4)",

  statusInfoSolid: "#3b82f6",
  statusInfoSoft: "rgba(59, 130, 246, 0.15)",
  statusInfoForeground: "#93c5fd",
  statusInfoBorder: "rgba(59, 130, 246, 0.4)",

  statusNeutralSolid: "#a1a1aa",
  statusNeutralSoft: "rgba(113, 113, 122, 0.2)",
  statusNeutralForeground: "#d4d4d8",
  statusNeutralBorder: "rgba(113, 113, 122, 0.45)",

  statusAccentSolid: "#3cc499",
  statusAccentSoft: "rgba(60, 196, 153, 0.15)",
  statusAccentForeground: "#6ddab5",
  statusAccentBorder: "rgba(60, 196, 153, 0.4)",
};

export function tokensFor(mode: ThemeMode): TokenSnapshot {
  return mode === "dark" ? TOKENS_DARK : TOKENS_LIGHT;
}
