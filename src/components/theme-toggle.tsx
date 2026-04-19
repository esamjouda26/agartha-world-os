"use client";

import { Moon, Sun } from "lucide-react";
import { useEffect, useState } from "react";

import { useTheme } from "@/components/theme-provider";
import { Button } from "@/components/ui/button";

export function ThemeToggle() {
  const { resolvedTheme, setTheme } = useTheme();
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);

  // Render a stable, theme-agnostic placeholder during SSR. The icon and
  // aria-label depend on `resolvedTheme`, which can only be trusted after
  // mount (the server has no access to OS prefers-color-scheme). The onClick
  // reads OS preference live so the button works on the first click even
  // before the mount effect fires.
  if (!mounted) {
    return (
      <Button
        variant="outline"
        size="icon"
        aria-label="Toggle theme"
        data-testid="kitchen-sink-theme-toggle"
        suppressHydrationWarning
        onClick={() => {
          const osDark =
            typeof window !== "undefined" &&
            window.matchMedia("(prefers-color-scheme: dark)").matches;
          setTheme(osDark ? "light" : "dark");
        }}
      >
        <Moon aria-hidden />
      </Button>
    );
  }

  const isDark = resolvedTheme === "dark";
  return (
    <Button
      variant="outline"
      size="icon"
      aria-label={isDark ? "Switch to light theme" : "Switch to dark theme"}
      data-testid="kitchen-sink-theme-toggle"
      onClick={() => setTheme(isDark ? "light" : "dark")}
    >
      {isDark ? <Sun aria-hidden /> : <Moon aria-hidden />}
    </Button>
  );
}
