"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import type { Route } from "next";

import {
  CommandDialog,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
  CommandShortcut,
} from "@/components/ui/command";

/**
 * CommandPalette — prompt.md §2B-D.10.
 *
 * ⌘K-bound dialog that surfaces two groups:
 *   1. "Navigate" — routes the current user has access to.
 *   2. "Actions" — contextual commands registered via `registerCommand(...)`.
 *
 * Auto-mounts in the admin + management shells (Phase 3). Downstream routes
 * call `registerCommand` inside an effect to add scope-specific entries; the
 * effect returns the cleanup function.
 */

export type CommandDefinition = Readonly<{
  id: string;
  label: string;
  shortcut?: string;
  handler: () => void | Promise<void>;
  scope?: string;
  keywords?: readonly string[];
}>;

export type NavCommand = Readonly<{
  id: string;
  label: string;
  href: Route;
  keywords?: readonly string[];
}>;

type CommandStore = {
  subscribe: (listener: () => void) => () => void;
  snapshot: () => readonly CommandDefinition[];
  register: (command: CommandDefinition) => () => void;
};

const listeners = new Set<() => void>();
let commands: readonly CommandDefinition[] = [];

const store: CommandStore = {
  subscribe: (listener) => {
    listeners.add(listener);
    return () => {
      listeners.delete(listener);
    };
  },
  snapshot: () => commands,
  register: (command) => {
    commands = [...commands.filter((existing) => existing.id !== command.id), command];
    listeners.forEach((listener) => listener());
    return () => {
      commands = commands.filter((existing) => existing.id !== command.id);
      listeners.forEach((listener) => listener());
    };
  },
};

/** Imperatively add a command. Returns the unregister function. */
export function registerCommand(command: CommandDefinition): () => void {
  return store.register(command);
}

/**
 * React hook wrapper with effect-scoped lifecycle. The caller is responsible
 * for providing a `deps` array that reflects every value inside `command` the
 * effect relies on; closures over stale handlers are the caller's mistake to
 * make, not this module's.
 */
export function useRegisterCommand(
  command: CommandDefinition,
  deps: readonly unknown[] = [],
): void {
  const commandRef = React.useRef(command);
  commandRef.current = command;
  React.useEffect(() => {
    return store.register(commandRef.current);
  }, deps);
}

function useSyncedCommands(): readonly CommandDefinition[] {
  return React.useSyncExternalStore(store.subscribe, store.snapshot, store.snapshot);
}

export type CommandPaletteProps = Readonly<{
  navigation?: readonly NavCommand[];
  /** External open state; if absent, the palette manages its own toggle. */
  open?: boolean;
  onOpenChange?: (open: boolean) => void;
  /** Disable global ⌘K / Ctrl+K listener (useful in nested palettes). */
  disableHotkey?: boolean;
  emptyLabel?: string;
  "data-testid"?: string;
}>;

export function CommandPalette({
  navigation = [],
  open: controlledOpen,
  onOpenChange,
  disableHotkey = false,
  emptyLabel = "No results.",
  "data-testid": testId,
}: CommandPaletteProps) {
  const [internalOpen, setInternalOpen] = React.useState(false);
  const open = controlledOpen ?? internalOpen;
  const setOpen = React.useCallback(
    (next: boolean) => {
      if (controlledOpen === undefined) setInternalOpen(next);
      onOpenChange?.(next);
    },
    [controlledOpen, onOpenChange],
  );

  React.useEffect(() => {
    if (disableHotkey) return;
    const handler = (event: KeyboardEvent): void => {
      if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === "k") {
        event.preventDefault();
        setOpen(!open);
      }
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [disableHotkey, open, setOpen]);

  const router = useRouter();
  const registeredCommands = useSyncedCommands();

  const runCommand = (run: () => void | Promise<void>): void => {
    setOpen(false);
    void run();
  };

  return (
    <CommandDialog open={open} onOpenChange={setOpen} className="max-w-2xl" data-testid={testId}>
      <CommandInput
        placeholder="Search routes and actions..."
        data-testid="command-palette-input"
      />
      <CommandList>
        <CommandEmpty>{emptyLabel}</CommandEmpty>
        {navigation.length > 0 ? (
          <CommandGroup heading="Navigate">
            {navigation.map((item) => (
              <CommandItem
                key={item.id}
                value={`${item.label} ${item.keywords?.join(" ") ?? ""}`}
                onSelect={() =>
                  runCommand(() => {
                    router.push(item.href);
                  })
                }
                data-testid={`command-palette-nav-${item.id}`}
              >
                {item.label}
              </CommandItem>
            ))}
          </CommandGroup>
        ) : null}
        {registeredCommands.length > 0 ? (
          <CommandGroup heading="Actions">
            {registeredCommands.map((command) => (
              <CommandItem
                key={command.id}
                value={`${command.label} ${command.keywords?.join(" ") ?? ""} ${command.scope ?? ""}`}
                onSelect={() => runCommand(command.handler)}
                data-testid={`command-palette-action-${command.id}`}
              >
                {command.label}
                {command.shortcut ? <CommandShortcut>{command.shortcut}</CommandShortcut> : null}
              </CommandItem>
            ))}
          </CommandGroup>
        ) : null}
      </CommandList>
    </CommandDialog>
  );
}

/** Exported for tests to reset in between specs. */
export const __commandStore = store;
