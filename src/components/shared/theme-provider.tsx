"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";

import { THEME_COOKIE, type ThemePreference } from "@/lib/theme-constants";

type ResolvedTheme = "light" | "dark";

interface ThemeContextValue {
  theme: ThemePreference;
  resolvedTheme: ResolvedTheme;
  setTheme: (theme: ThemePreference) => void;
}

const ThemeContext = createContext<ThemeContextValue | null>(null);
const COOKIE_MAX_AGE = 60 * 60 * 24 * 365;

export function useTheme(): ThemeContextValue {
  const ctx = useContext(ThemeContext);
  if (!ctx) throw new Error("useTheme must be used within <ThemeProvider>");
  return ctx;
}

function resolveSystemTheme(): ResolvedTheme {
  if (typeof window === "undefined") return "light";
  return window.matchMedia("(prefers-color-scheme: dark)").matches ? "dark" : "light";
}

function resolveTheme(preference: ThemePreference): ResolvedTheme {
  return preference === "system" ? resolveSystemTheme() : preference;
}

/**
 * Sync the user's theme preference onto <html>.
 *   "light"  → class="light"  (overrides OS preference)
 *   "dark"   → class="dark"   (overrides OS preference)
 *   "system" → no class       (CSS @media takes over via globals.css)
 */
function applyThemeClass(preference: ThemePreference): void {
  const root = document.documentElement;
  root.classList.remove("light", "dark");
  if (preference !== "system") root.classList.add(preference);
}

function writeCookie(theme: ThemePreference): void {
  document.cookie = `${THEME_COOKIE}=${theme}; path=/; max-age=${COOKIE_MAX_AGE}; SameSite=Lax`;
}

export function ThemeProvider({
  children,
  defaultTheme,
}: Readonly<{
  children: ReactNode;
  defaultTheme: ThemePreference;
}>) {
  const [theme, setThemeState] = useState<ThemePreference>(defaultTheme);
  const [resolvedTheme, setResolvedTheme] = useState<ResolvedTheme>(() =>
    resolveTheme(defaultTheme),
  );

  // Sync class on <html> whenever preference changes. Initial paint is already
  // correct from SSR + CSS @media; this keeps later toggles in lockstep.
  useEffect(() => {
    applyThemeClass(theme);
    setResolvedTheme(resolveTheme(theme));
  }, [theme]);

  // When preference is "system", respond to OS preference changes live.
  useEffect(() => {
    if (theme !== "system") return;
    const mq = window.matchMedia("(prefers-color-scheme: dark)");
    const handler = () => setResolvedTheme(mq.matches ? "dark" : "light");
    mq.addEventListener("change", handler);
    return () => mq.removeEventListener("change", handler);
  }, [theme]);

  const setTheme = useCallback((next: ThemePreference) => {
    setThemeState(next);
    writeCookie(next);
  }, []);

  const value = useMemo(
    () => ({ theme, resolvedTheme, setTheme }),
    [theme, resolvedTheme, setTheme],
  );

  return <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>;
}
