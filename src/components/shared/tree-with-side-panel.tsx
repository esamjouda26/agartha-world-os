"use client";

import * as React from "react";

import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { TreeView, type TreeViewProps } from "@/components/ui/tree-view";

/**
 * TreeWithSidePanel — left-pane `<TreeView>` + right-pane CRUD surface.
 *
 * Used for hierarchical CRUD: org units, material categories, zones,
 * facility levels. Selection in the tree drives the side panel's
 * content (caller renders the form/view based on `selectedId`).
 *
 * Below `lg`, the side panel stacks under the tree rather than sitting
 * beside it — the tree remains visible so context isn't lost.
 *
 * Pattern C: caller wires `selectedId` (URL param via `nuqs`), builds
 * the tree nodes, and renders the side-panel contents.
 */

export type TreeWithSidePanelProps = Readonly<{
  /** Tree data + interaction — all forwarded to `<TreeView>`. */
  tree: TreeViewProps;
  /** Right pane content — form, read-only view, or empty hint. */
  panel: React.ReactNode;
  /** Primary action above the tree (e.g. "+ New category"). */
  treeAction?: React.ReactNode;
  /** Optional heading above the tree. */
  treeHeading?: React.ReactNode;
  /** Optional heading above the panel. */
  panelHeading?: React.ReactNode;
  /** Optional empty-panel state when no node is selected. */
  panelPlaceholder?: React.ReactNode;
  /** Max height for the tree viewport on lg+. Defaults to 70dvh. */
  treeMaxHeight?: string;
  className?: string;
  "data-testid"?: string;
}>;

export function TreeWithSidePanel({
  tree,
  panel,
  treeAction,
  treeHeading,
  panelHeading,
  panelPlaceholder,
  treeMaxHeight = "70dvh",
  className,
  "data-testid": testId,
}: TreeWithSidePanelProps) {
  const selectedId = tree.selectedId ?? null;
  const showPanel = selectedId !== null;

  return (
    <div
      data-slot="tree-with-side-panel"
      data-testid={testId}
      className={cn(
        "grid grid-cols-1 gap-4 lg:grid-cols-[minmax(0,20rem)_minmax(0,1fr)] lg:gap-6",
        className,
      )}
    >
      <section
        data-slot="tree-with-side-panel-tree"
        className="border-border-subtle bg-card flex flex-col overflow-hidden rounded-xl border shadow-xs"
      >
        {treeHeading || treeAction ? (
          <header className="border-border-subtle flex items-center justify-between gap-2 border-b px-3 py-2">
            {treeHeading ? (
              <p className="text-foreground-subtle text-[11px] font-medium tracking-wider uppercase">
                {treeHeading}
              </p>
            ) : (
              <span />
            )}
            {treeAction}
          </header>
        ) : null}
        <div className="min-h-40 overflow-y-auto px-2 py-2" style={{ maxHeight: treeMaxHeight }}>
          <TreeView {...tree} />
        </div>
      </section>
      <section
        data-slot="tree-with-side-panel-panel"
        className="border-border-subtle bg-card flex flex-col gap-0 overflow-hidden rounded-xl border shadow-xs"
      >
        {panelHeading ? (
          <header className="border-border-subtle border-b px-4 py-3">{panelHeading}</header>
        ) : null}
        <div className="flex flex-1 flex-col gap-4 p-4">
          {showPanel
            ? panel
            : (panelPlaceholder ?? (
                <p className="text-foreground-muted py-12 text-center text-sm">
                  Select an item on the left to view its details.
                </p>
              ))}
        </div>
      </section>
    </div>
  );
}

/**
 * Convenience helper — pairs a "New" button with the tree action slot so
 * callers don't rebuild the same right-aligned button chrome on every
 * tree page.
 */
export function TreeNewButton({
  label,
  onClick,
  "data-testid": testId,
}: Readonly<{ label: string; onClick: () => void; "data-testid"?: string }>) {
  return (
    <Button type="button" variant="outline" size="sm" onClick={onClick} data-testid={testId}>
      {label}
    </Button>
  );
}
