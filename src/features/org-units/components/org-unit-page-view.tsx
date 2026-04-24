"use client";

import * as React from "react";
import { useQueryState } from "nuqs";
import { Building2, GitBranch, Users, Plus } from "lucide-react";

import { PageHeader } from "@/components/ui/page-header";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { TreeWithSidePanel, TreeNewButton } from "@/components/shared/tree-with-side-panel";
import type { TreeNode } from "@/components/ui/tree-view";

import { OrgUnitCreateForm } from "@/features/org-units/components/org-unit-form";
import { OrgUnitEditForm } from "@/features/org-units/components/org-unit-form";
import type { OrgUnitRow, OrgUnitNode } from "@/features/org-units/types/org-unit";

const UNIT_TYPE_ICON = {
  company: Building2,
  division: GitBranch,
  department: Users,
} as const;

type OrgUnitPageViewProps = Readonly<{
  rows: ReadonlyArray<OrgUnitRow>;
  tree: ReadonlyArray<OrgUnitNode>;
  canWrite: boolean;
}>;

// ── Build TreeNode list from OrgUnitNode tree ──────────────────────────

function toTreeNodes(nodes: readonly OrgUnitNode[]): TreeNode[] {
  return nodes.map((node) => {
    const Icon = UNIT_TYPE_ICON[node.unitType] ?? Building2;
    return {
      id: node.id,
      icon: <Icon className="size-4 shrink-0" aria-hidden />,
      label: (
        <span className="flex min-w-0 items-center gap-2">
          <span className="truncate font-medium">{node.name}</span>
          <span className="text-foreground-muted font-mono text-xs">{node.code}</span>
        </span>
      ),
      trailing: (
        <div className="flex shrink-0 items-center gap-1.5">
          {!node.isActive && (
            <Badge variant="secondary" className="text-xs">
              Inactive
            </Badge>
          )}
          {node.staffCount > 0 && (
            <span className="text-foreground-muted text-xs tabular-nums">{node.staffCount}</span>
          )}
        </div>
      ),
      ...(node.children.length > 0 ? { children: toTreeNodes(node.children) } : {}),
    };
  });
}

// ── Component ──────────────────────────────────────────────────────────

export function OrgUnitPageView({ rows, tree, canWrite }: OrgUnitPageViewProps) {
  const [selectedId, setSelectedId] = useQueryState("id", {
    clearOnDefault: true,
    history: "replace",
    shallow: true,
  });
  const [mode, setMode] = useQueryState("mode", {
    clearOnDefault: true,
    history: "replace",
    shallow: true,
  });

  const rowMap = React.useMemo(() => {
    const m = new Map<string, OrgUnitRow>();
    for (const r of rows) m.set(r.id, r);
    return m;
  }, [rows]);

  const selectedUnit = selectedId ? rowMap.get(selectedId) : null;
  const treeNodes = React.useMemo(() => toTreeNodes(tree), [tree]);

  function handleSelect(id: string) {
    void setSelectedId(id);
    void setMode(null);
  }

  function handleCreateRoot() {
    void setSelectedId(null);
    void setMode("create");
  }

  function handleCreateChild() {
    void setMode("create");
  }

  function handleEditSelected() {
    void setMode("edit");
  }

  function handleFormSuccess(id?: string) {
    if (id) void setSelectedId(id);
    void setMode(null);
  }

  function handleFormCancel() {
    void setMode(null);
  }

  // ── Panel content ──────────────────────────────────────────────────
  let panelContent: React.ReactNode;

  if (mode === "create") {
    panelContent = (
      <OrgUnitCreateForm
        {...(selectedId != null ? { parentId: selectedId } : {})}
        {...(selectedUnit?.name != null ? { parentName: selectedUnit.name } : {})}
        onSuccess={(id) => handleFormSuccess(id)}
        onCancel={handleFormCancel}
      />
    );
  } else if (mode === "edit" && selectedUnit) {
    panelContent = (
      <OrgUnitEditForm
        unit={selectedUnit}
        onSuccess={() => handleFormSuccess()}
        onCancel={handleFormCancel}
      />
    );
  } else if (selectedUnit) {
    // Read-only summary + action buttons
    const Icon = UNIT_TYPE_ICON[selectedUnit.unitType] ?? Building2;
    panelContent = (
      <div className="flex flex-col gap-4" data-testid="org-unit-detail">
        <div className="flex flex-col gap-1">
          <div className="flex items-center gap-2">
            <Icon className="text-foreground-subtle size-5" aria-hidden />
            <span className="text-foreground text-lg font-semibold">{selectedUnit.name}</span>
          </div>
          <p className="text-foreground-muted font-mono text-sm">{selectedUnit.code}</p>
        </div>
        <dl className="grid grid-cols-2 gap-3 text-sm">
          {[
            { label: "Type", value: selectedUnit.unitType },
            { label: "Status", value: selectedUnit.isActive ? "Active" : "Inactive" },
            { label: "Staff", value: String(selectedUnit.staffCount) },
            { label: "Path", value: selectedUnit.path },
          ].map(({ label, value }) => (
            <div key={label} className="flex flex-col gap-0.5">
              <dt className="text-foreground-subtle text-xs font-medium tracking-wider uppercase">
                {label}
              </dt>
              <dd className="text-foreground font-mono">{value}</dd>
            </div>
          ))}
        </dl>
        {canWrite && (
          <div className="flex gap-2 pt-2">
            <Button
              type="button"
              size="sm"
              variant="outline"
              onClick={handleEditSelected}
              data-testid="org-unit-edit-open"
            >
              Edit
            </Button>
            <Button
              type="button"
              size="sm"
              variant="outline"
              onClick={handleCreateChild}
              data-testid="org-unit-add-child"
            >
              <Plus className="mr-1.5 size-3.5" aria-hidden />
              Add Child
            </Button>
          </div>
        )}
      </div>
    );
  } else {
    // No selection, no mode — inline placeholder keeps the panel always open
    panelContent = (
      <p className="text-foreground-muted py-8 text-center text-sm">
        Select a unit on the left to view its details.
      </p>
    );
  }

  // TreeWithSidePanel only renders the `panel` slot when selectedId !== null.
  // When creating a root unit (no selection), pass a sentinel so the panel
  // stays visible. The sentinel doesn't match any real node so nothing gets
  // highlighted in the tree.
  const SENTINEL = "__new__";
  const treeSelectedId = mode === "create" && selectedId === null ? SENTINEL : selectedId;

  return (
    <div className="flex flex-col gap-6" data-testid="org-units-page">
      <PageHeader
        title="Org Units"
        description="Manage the organizational hierarchy that scopes data access via ltree RLS."
        primaryAction={
          canWrite ? (
            <Button
              type="button"
              size="sm"
              onClick={handleCreateRoot}
              data-testid="org-unit-create-root"
            >
              <Plus className="mr-1.5 size-4" aria-hidden />
              New Root Unit
            </Button>
          ) : undefined
        }
      />

      <TreeWithSidePanel
        data-testid="org-unit-tree-shell"
        treeHeading="Hierarchy"
        panelHeading={
          mode === "create"
            ? selectedUnit
              ? `New child of ${selectedUnit.name}`
              : "New Root Unit"
            : mode === "edit" && selectedUnit
              ? `Edit — ${selectedUnit.name}`
              : selectedUnit
                ? selectedUnit.name
                : "Details"
        }
        tree={{
          nodes: treeNodes,
          selectedId: treeSelectedId,
          onSelect: handleSelect,
          defaultExpanded: new Set(rows.map((r) => r.id)),
          "data-testid": "org-unit-tree",
        }}
        panel={panelContent}
        treeAction={
          canWrite ? (
            <TreeNewButton
              label="+ Child"
              onClick={handleCreateChild}
              data-testid="org-unit-add-child-tree"
            />
          ) : undefined
        }
      />
    </div>
  );
}
