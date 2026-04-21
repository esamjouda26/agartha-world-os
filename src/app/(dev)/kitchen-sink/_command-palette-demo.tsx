"use client";

import * as React from "react";
import type { Route } from "next";

import { Button } from "@/components/ui/button";
import { CommandPalette, registerCommand } from "@/components/ui/command-palette";
import { toastInfo, toastSuccess } from "@/components/ui/toast-helpers";

const NAV: readonly Readonly<{
  id: string;
  label: string;
  href: Route;
  keywords?: readonly string[];
}>[] = [{ id: "ks", label: "Kitchen Sink", href: "/kitchen-sink", keywords: ["design", "demo"] }];

export function CommandPaletteDemo() {
  const [open, setOpen] = React.useState(false);

  React.useEffect(() => {
    const unregisters = [
      registerCommand({
        id: "demo-say-hi",
        label: "Say hello",
        scope: "kitchen-sink",
        keywords: ["test", "toast"],
        handler: () => toastSuccess("👋 Hello from the command palette"),
      }),
      registerCommand({
        id: "demo-copy",
        label: "Copy page URL",
        scope: "kitchen-sink",
        handler: () => {
          void navigator.clipboard.writeText(window.location.href);
          toastInfo("Copied current URL to clipboard");
        },
      }),
    ];
    return () => unregisters.forEach((fn) => fn());
  }, []);

  return (
    <div className="flex flex-col gap-3">
      <div className="flex flex-wrap items-center gap-3">
        <Button
          variant="outline"
          onClick={() => setOpen(true)}
          data-testid="kitchen-sink-command-open"
        >
          Open palette (⌘K)
        </Button>
        <p className="text-foreground-muted text-sm">
          Press <kbd className="bg-surface border-border rounded border px-1 text-xs">⌘</kbd>
          <kbd className="bg-surface border-border ml-1 rounded border px-1 text-xs">K</kbd> or
          Ctrl+K anywhere on the page to toggle.
        </p>
      </div>
      <CommandPalette
        open={open}
        onOpenChange={setOpen}
        navigation={NAV}
        data-testid="kitchen-sink-command-palette"
      />
    </div>
  );
}
