import type { Metadata } from "next";
import { Inter, JetBrains_Mono } from "next/font/google";
import { NuqsAdapter } from "nuqs/adapters/next/app";

import { ThemeProvider } from "@/components/theme-provider";
import { Toaster } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { getThemeCookie } from "@/lib/theme";

import "./globals.css";

const inter = Inter({
  variable: "--font-inter",
  subsets: ["latin"],
  display: "swap",
});

const jetbrainsMono = JetBrains_Mono({
  variable: "--font-jetbrains-mono",
  subsets: ["latin"],
  display: "swap",
});

export const metadata: Metadata = {
  title: "AgarthaOS",
  description: "Operations platform for AgarthaOS",
};

export default async function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const theme = await getThemeCookie();
  // Cookie value drives the initial class on <html>:
  //   "light" → renders class="light" (overrides OS preference)
  //   "dark"  → renders class="dark"  (overrides OS preference)
  //   "system" or unset → no class; CSS @media (prefers-color-scheme) takes over
  // No inline script needed — the @media block in globals.css applies dark
  // tokens before paint when the OS prefers dark.
  const initialClass = theme === "system" ? "" : theme;
  return (
    <html
      lang="en"
      suppressHydrationWarning
      className={`${inter.variable} ${jetbrainsMono.variable} ${initialClass} h-full antialiased`}
    >
      <body className="bg-background text-foreground flex min-h-full flex-col">
        <ThemeProvider defaultTheme={theme}>
          <NuqsAdapter>
            <TooltipProvider delayDuration={150}>{children}</TooltipProvider>
          </NuqsAdapter>
          <Toaster />
        </ThemeProvider>
      </body>
    </html>
  );
}
