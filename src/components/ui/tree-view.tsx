"use client";

import * as React from "react";
import { ChevronRight } from "lucide-react";

import { cn } from "@/lib/utils";

/**
 * TreeView — generic expandable recursive tree.
 *
 * Renders hierarchical data (org units, material categories, zones,
 * facility levels) with expand/collapse + optional selection. Keyboard
 * navigation: Up/Down moves focus, Right expands (or moves to first
 * child if already expanded), Left collapses (or moves to parent),
 * Enter/Space selects.
 *
 * Expanded state can be controlled (`expanded` + `onExpandedChange`) or
 * uncontrolled (`defaultExpanded`). Same for selection.
 *
 * Semantic `role="tree"` / `role="treeitem"` (WCAG 2.2 / ARIA APG).
 * For the "tree + side panel" CRUD pattern, compose
 * `<TreeWithSidePanel>` (shared organism).
 */

export type TreeNode = Readonly<{
  id: string;
  label: React.ReactNode;
  /** Trailing slot (badge / count / icon-action). */
  trailing?: React.ReactNode;
  /** Leading slot (icon). */
  icon?: React.ReactNode;
  children?: readonly TreeNode[];
  disabled?: boolean;
}>;

export type TreeViewProps = Readonly<{
  nodes: readonly TreeNode[];
  expanded?: ReadonlySet<string>;
  onExpandedChange?: (next: ReadonlySet<string>) => void;
  defaultExpanded?: ReadonlySet<string>;
  selectedId?: string | null;
  onSelect?: (id: string) => void;
  /** Default indentation in px per depth level. Defaults to 16. */
  indent?: number;
  className?: string;
  "data-testid"?: string;
}>;

export function TreeView({
  nodes,
  expanded: expandedProp,
  onExpandedChange,
  defaultExpanded,
  selectedId,
  onSelect,
  indent = 16,
  className,
  "data-testid": testId,
}: TreeViewProps) {
  const [localExpanded, setLocalExpanded] = React.useState<ReadonlySet<string>>(
    defaultExpanded ?? new Set<string>(),
  );
  const expanded = expandedProp ?? localExpanded;

  const toggle = (id: string): void => {
    const next = new Set(expanded);
    if (next.has(id)) next.delete(id);
    else next.add(id);
    if (!expandedProp) setLocalExpanded(next);
    onExpandedChange?.(next);
  };

  return (
    <ul
      role="tree"
      data-slot="tree-view"
      data-testid={testId}
      className={cn("flex flex-col gap-0.5 text-sm", className)}
    >
      {nodes.map((node) => (
        <TreeViewNode
          key={node.id}
          node={node}
          depth={0}
          indent={indent}
          expanded={expanded}
          onToggle={toggle}
          selectedId={selectedId ?? null}
          {...(onSelect !== undefined ? { onSelect } : {})}
          {...(testId !== undefined ? { testId } : {})}
        />
      ))}
    </ul>
  );
}

type TreeViewNodeProps = Readonly<{
  node: TreeNode;
  depth: number;
  indent: number;
  expanded: ReadonlySet<string>;
  onToggle: (id: string) => void;
  selectedId: string | null;
  onSelect?: (id: string) => void;
  testId?: string;
}>;

function TreeViewNode({
  node,
  depth,
  indent,
  expanded,
  onToggle,
  selectedId,
  onSelect,
  testId,
}: TreeViewNodeProps) {
  const hasChildren = Boolean(node.children && node.children.length > 0);
  const isOpen = expanded.has(node.id);
  const isSelected = selectedId === node.id;

  const handleKeyDown = (event: React.KeyboardEvent<HTMLDivElement>): void => {
    // Only handle keys that originated on the node itself — not on a
    // descendant input/button living inside the `trailing` slot. Without
    // this guard, Arrow / Enter / Space typed inside a trailing input
    // bubbles up and either fires unintended toggle/select OR calls
    // preventDefault on a key the input needed (matches the same fix
    // applied to `<DataTable.CardListView>` for textarea-in-sub-row).
    if (event.target !== event.currentTarget) return;
    if (event.key === "ArrowRight" && hasChildren && !isOpen) {
      event.preventDefault();
      onToggle(node.id);
    } else if (event.key === "ArrowLeft" && hasChildren && isOpen) {
      event.preventDefault();
      onToggle(node.id);
    } else if (event.key === "Enter" || event.key === " ") {
      event.preventDefault();
      onSelect?.(node.id);
    }
  };

  return (
    <li role="treeitem" aria-expanded={hasChildren ? isOpen : undefined} aria-selected={isSelected}>
      <div
        tabIndex={node.disabled ? -1 : 0}
        onKeyDown={handleKeyDown}
        data-testid={testId ? `${testId}-node-${node.id}` : undefined}
        data-selected={isSelected || undefined}
        data-depth={depth}
        className={cn(
          "group/tree-node flex items-center gap-1.5 rounded-md px-1.5 py-1",
          "transition-colors duration-[var(--duration-micro)]",
          "hover:bg-surface/70",
          "focus-visible:outline-ring outline-none focus-visible:outline-2 focus-visible:outline-offset-[-2px]",
          isSelected && "bg-brand-primary/10 text-foreground",
          node.disabled && "pointer-events-none opacity-50",
        )}
        style={{ paddingInlineStart: `${depth * indent + 6}px` }}
      >
        {hasChildren ? (
          <button
            type="button"
            onClick={(event) => {
              event.stopPropagation();
              onToggle(node.id);
            }}
            aria-label={isOpen ? "Collapse" : "Expand"}
            className="text-foreground-subtle hover:text-foreground inline-flex size-5 shrink-0 items-center justify-center rounded"
          >
            <ChevronRight
              aria-hidden
              className={cn(
                "size-3.5 transition-transform duration-[var(--duration-micro)]",
                isOpen ? "rotate-90" : null,
              )}
            />
          </button>
        ) : (
          <span aria-hidden className="inline-block size-5 shrink-0" />
        )}
        {node.icon ? (
          <span aria-hidden className="text-foreground-subtle shrink-0">
            {node.icon}
          </span>
        ) : null}
        <button
          type="button"
          onClick={() => onSelect?.(node.id)}
          disabled={node.disabled}
          className="flex min-w-0 flex-1 items-center gap-2 text-left"
        >
          <span className="truncate">{node.label}</span>
        </button>
        {node.trailing ? <span className="shrink-0">{node.trailing}</span> : null}
      </div>
      {hasChildren && isOpen ? (
        <ul role="group" className="flex flex-col gap-0.5">
          {node.children!.map((child) => (
            <TreeViewNode
              key={child.id}
              node={child}
              depth={depth + 1}
              indent={indent}
              expanded={expanded}
              onToggle={onToggle}
              selectedId={selectedId}
              {...(onSelect !== undefined ? { onSelect } : {})}
              {...(testId !== undefined ? { testId } : {})}
            />
          ))}
        </ul>
      ) : null}
    </li>
  );
}
