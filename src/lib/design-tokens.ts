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

export const TOKENS_LIGHT: TokenSnapshot = {
  brandPrimary: "#4f46e5",
  brandPrimaryForeground: "#ffffff",
  brandAccent: "#6d28d9",
  brandAccentForeground: "#ffffff",

  background: "#ffffff",
  surface: "#fafafa",
  card: "#ffffff",
  elevated: "#ffffff",

  foreground: "#09090b",
  foregroundMuted: "#3f3f46",
  foregroundSubtle: "#52525b",
  foregroundDisabled: "#a1a1aa",

  border: "#e4e4e7",
  borderStrong: "#71717a",
  borderSubtle: "#f4f4f5",

  statusSuccessSolid: "#10b981",
  statusSuccessSoft: "#ecfdf5",
  statusSuccessForeground: "#047857",
  statusSuccessBorder: "#a7f3d0",

  statusWarningSolid: "#f59e0b",
  statusWarningSoft: "#fffbeb",
  statusWarningForeground: "#b45309",
  statusWarningBorder: "#fde68a",

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

  statusAccentSolid: "#8b5cf6",
  statusAccentSoft: "#f5f3ff",
  statusAccentForeground: "#6d28d9",
  statusAccentBorder: "#ddd6fe",
};

export const TOKENS_DARK: TokenSnapshot = {
  brandPrimary: "#818cf8",
  brandPrimaryForeground: "#1e1b4b",
  brandAccent: "#a78bfa",
  brandAccentForeground: "#2e1065",

  background: "#09090b",
  surface: "#18181b",
  card: "#18181b",
  elevated: "#27272a",

  foreground: "#fafafa",
  foregroundMuted: "#d4d4d8",
  foregroundSubtle: "#a1a1aa",
  foregroundDisabled: "#71717a",

  border: "#27272a",
  borderStrong: "#a1a1aa",
  borderSubtle: "#18181b",

  statusSuccessSolid: "#10b981",
  statusSuccessSoft: "rgba(16, 185, 129, 0.15)",
  statusSuccessForeground: "#6ee7b7",
  statusSuccessBorder: "rgba(16, 185, 129, 0.4)",

  statusWarningSolid: "#f59e0b",
  statusWarningSoft: "rgba(245, 158, 11, 0.15)",
  statusWarningForeground: "#fcd34d",
  statusWarningBorder: "rgba(245, 158, 11, 0.4)",

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

  statusAccentSolid: "#a78bfa",
  statusAccentSoft: "rgba(167, 139, 250, 0.15)",
  statusAccentForeground: "#ddd6fe",
  statusAccentBorder: "rgba(167, 139, 250, 0.4)",
};

export function tokensFor(mode: ThemeMode): TokenSnapshot {
  return mode === "dark" ? TOKENS_DARK : TOKENS_LIGHT;
}
