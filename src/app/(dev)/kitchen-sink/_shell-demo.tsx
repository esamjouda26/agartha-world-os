"use client";

import * as React from "react";
import {
  Activity,
  BadgeCheck,
  Boxes,
  ClipboardCheck,
  Clock4,
  LayoutDashboard,
  Megaphone,
  Printer,
  Settings,
  ShoppingBag,
  Users,
  Wrench,
} from "lucide-react";
import type { Route } from "next";

import { type BottomTabItem } from "@/components/ui/bottom-tab-bar";
import { Button } from "@/components/ui/button";
import { Sidebar, type SidebarSection, type SidebarState } from "@/components/ui/sidebar";
import { FormSubmitButton } from "@/components/ui/form-primitives";

const SECTIONS: readonly SidebarSection[] = [
  {
    id: "overview",
    label: "Overview",
    items: [
      {
        id: "dashboard",
        label: "Dashboard",
        href: "/kitchen-sink" as Route,
        icon: <LayoutDashboard className="size-4" aria-hidden />,
        active: true,
      },
      {
        id: "activity",
        label: "Activity",
        href: "/kitchen-sink" as Route,
        icon: <Activity className="size-4" aria-hidden />,
        hint: "12",
      },
    ],
  },
  {
    id: "ops",
    label: "Operations",
    items: [
      {
        id: "orders",
        label: "Orders",
        href: "/kitchen-sink" as Route,
        icon: <ShoppingBag className="size-4" aria-hidden />,
      },
      {
        id: "inventory",
        label: "Inventory",
        href: "/kitchen-sink" as Route,
        icon: <Boxes className="size-4" aria-hidden />,
      },
      {
        id: "maintenance",
        label: "Maintenance",
        href: "/kitchen-sink" as Route,
        icon: <Wrench className="size-4" aria-hidden />,
      },
    ],
  },
  {
    id: "people",
    label: "People",
    items: [
      {
        id: "staff",
        label: "Staff",
        href: "/kitchen-sink" as Route,
        icon: <Users className="size-4" aria-hidden />,
      },
      {
        id: "announcements",
        label: "Announcements",
        href: "/kitchen-sink" as Route,
        icon: <Megaphone className="size-4" aria-hidden />,
      },
    ],
  },
  {
    id: "system",
    label: "System",
    items: [
      {
        id: "settings",
        label: "Settings",
        href: "/kitchen-sink" as Route,
        icon: <Settings className="size-4" aria-hidden />,
      },
    ],
  },
];

const BOTTOM_TABS: readonly BottomTabItem[] = [
  {
    id: "clock",
    label: "Clock",
    href: "/kitchen-sink" as Route,
    icon: <Clock4 className="size-5" aria-hidden />,
    active: true,
  },
  {
    id: "orders",
    label: "Orders",
    href: "/kitchen-sink" as Route,
    icon: <ShoppingBag className="size-5" aria-hidden />,
    badge: 3,
  },
  {
    id: "tasks",
    label: "Tasks",
    href: "/kitchen-sink" as Route,
    icon: <ClipboardCheck className="size-5" aria-hidden />,
  },
  {
    id: "me",
    label: "Me",
    href: "/kitchen-sink" as Route,
    icon: <BadgeCheck className="size-5" aria-hidden />,
  },
];

export function SidebarDemo() {
  const [state, setState] = React.useState<SidebarState>("expanded");
  return (
    <div className="flex flex-col gap-3">
      <div className="flex flex-wrap gap-2">
        {(["expanded", "collapsed", "hover-expanded"] as const).map((value) => (
          <Button
            key={value}
            variant={state === value ? "default" : "outline"}
            size="sm"
            onClick={() => setState(value)}
            data-testid={`kitchen-sink-sidebar-state-${value}`}
          >
            {value}
          </Button>
        ))}
      </div>
      <div className="border-border bg-card relative flex min-h-[360px] overflow-hidden rounded-lg border">
        <Sidebar
          key={state}
          brand={
            <p className="text-foreground text-sm font-semibold">
              AgarthaOS <span className="text-foreground-subtle font-mono">v2</span>
            </p>
          }
          sections={SECTIONS}
          initialState={state}
          onStateChange={setState}
          footer={<p className="text-foreground-subtle truncate text-xs">Demo · {state}</p>}
          data-testid="kitchen-sink-sidebar"
        />
        <main className="bg-background text-foreground-muted flex-1 p-6 text-sm">
          Sidebar preview — resize this window past the <code>lg</code> breakpoint (1024px) to see
          the primitive. Below <code>lg</code>, the shell is expected to swap in a drawer — wiring
          is a Phase 3 concern.
        </main>
      </div>
    </div>
  );
}

export function BottomTabBarDemo() {
  return (
    <div className="flex flex-col gap-3">
      <p className="text-foreground-muted text-sm">
        Mobile preview — pinned-to-bottom tab bar, hidden on ≥ md. View on a 375px viewport (or
        devtools device emulator) to see the live primitive at the bottom of the screen.
      </p>
      <div className="border-border bg-surface relative mx-auto h-[520px] w-[320px] overflow-hidden rounded-[32px] border-2">
        <div className="border-border-subtle flex h-10 items-center justify-between border-b px-4 text-xs">
          <span>9:41</span>
          <span>AgarthaOS</span>
        </div>
        <div className="text-foreground-muted flex h-[calc(100%-5.5rem)] items-center justify-center px-4 text-center text-sm">
          <p>Crew content area. Primary CTA anchored to thumb-zone.</p>
        </div>
        <nav
          aria-label="Preview primary navigation"
          data-slot="bottom-tab-bar"
          className="bg-background border-border-subtle absolute inset-x-0 bottom-0 border-t"
        >
          <ul
            className="grid"
            style={{ gridTemplateColumns: `repeat(${BOTTOM_TABS.length}, minmax(0, 1fr))` }}
          >
            {BOTTOM_TABS.map((item) => (
              <li key={item.id} className="relative">
                <span
                  aria-current={item.active ? "page" : undefined}
                  data-active={item.active || undefined}
                  className={`focus-visible:outline-ring flex min-h-[56px] flex-col items-center justify-center gap-1 px-3 py-2 text-[11px] font-medium ${
                    item.active ? "text-brand-primary" : "text-foreground-muted"
                  }`}
                >
                  <span aria-hidden>{item.icon}</span>
                  <span>{item.label}</span>
                  {item.badge ? (
                    <span
                      aria-hidden
                      className="bg-status-danger-solid absolute top-2 right-1/4 inline-flex min-w-4 items-center justify-center rounded-full px-1 text-[10px] font-semibold text-white"
                    >
                      {item.badge}
                    </span>
                  ) : null}
                </span>
              </li>
            ))}
          </ul>
        </nav>
      </div>
    </div>
  );
}

export function PrintPreviewDemo() {
  const handlePrint = (): void => {
    window.print();
  };
  return (
    <div className="flex flex-col gap-3">
      <Button
        variant="outline"
        onClick={handlePrint}
        data-testid="kitchen-sink-print"
        className="self-start"
      >
        <Printer aria-hidden className="size-4" />
        Print preview
      </Button>
      <article
        data-print-receipt
        className="avoid-break border-border bg-card mx-auto w-full max-w-md space-y-3 rounded-lg border p-6 text-sm"
      >
        <header className="flex items-center justify-between">
          <h3 className="text-base font-semibold">AgarthaOS — Sample receipt</h3>
          <span className="text-foreground-muted font-mono text-xs">#2026-0419-001</span>
        </header>
        <dl className="grid grid-cols-2 gap-y-1">
          <dt className="text-foreground-muted">Booked</dt>
          <dd>2 adults · 1 child</dd>
          <dt className="text-foreground-muted">Experience</dt>
          <dd>Agartha Descent · 14:00</dd>
          <dt className="text-foreground-muted">Subtotal</dt>
          <dd>MYR 450.00</dd>
          <dt className="text-foreground-muted">Total paid</dt>
          <dd className="font-semibold">MYR 450.00</dd>
        </dl>
        <div className="no-print flex items-center gap-2 border-t pt-3">
          <span className="text-foreground-subtle text-xs">
            This note only appears on screen — hidden in print via <code>.no-print</code>.
          </span>
        </div>
        <p className="print-only text-xs">
          Thank you — retain this slip for entry. Verify ID at the visitor desk.
        </p>
      </article>
    </div>
  );
}

export function FormSubmitButtonDemo() {
  const [pending, setPending] = React.useState(false);
  return (
    <form
      onSubmit={(event) => {
        event.preventDefault();
        setPending(true);
        window.setTimeout(() => setPending(false), 1_200);
      }}
      className="border-border bg-card flex flex-wrap items-center gap-3 rounded-lg border p-4"
    >
      <FormSubmitButton isPending={pending} data-testid="kitchen-sink-form-submit-demo">
        Save changes
      </FormSubmitButton>
      <p className="text-foreground-muted text-xs">
        <code>&lt;FormSubmitButton&gt;</code> disables itself + shows a spinner while RHF reports{" "}
        <code>isSubmitting</code> or the external <code>isPending</code> prop is true.
      </p>
    </form>
  );
}
