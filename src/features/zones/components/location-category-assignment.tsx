"use client";

import * as React from "react";
import { X } from "lucide-react";

import { JunctionManager } from "@/components/shared/junction-manager";
import { SectionCard } from "@/components/ui/section-card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { toastSuccess, toastError } from "@/components/ui/toast-helpers";
import {
  assignCategories,
  unassignCategories,
} from "@/features/zones/actions/manage-category-assignment";
import type {
  LocationRow,
  MaterialCategoryOption,
  LocationCategoryEntry,
} from "@/features/zones/types/zone";

type LocationCategoryAssignmentProps = Readonly<{
  locations: ReadonlyArray<LocationRow>;
  materialCategories: ReadonlyArray<MaterialCategoryOption>;
  locationCategories: ReadonlyArray<LocationCategoryEntry>;
  canWrite: boolean;
}>;

export function LocationCategoryAssignment({
  locations,
  materialCategories,
  locationCategories,
  canWrite,
}: LocationCategoryAssignmentProps) {
  const [selectedLocationId, setSelectedLocationId] = React.useState<string>(
    locations[0]?.id ?? "",
  );
  const [selectedForRemoval, setSelectedForRemoval] = React.useState<readonly string[]>([]);

  // Build a map for O(1) lookup
  const catMap = React.useMemo(() => {
    const m = new Map<string, readonly string[]>();
    for (const entry of locationCategories) {
      m.set(entry.locationId, entry.categoryIds);
    }
    return m;
  }, [locationCategories]);

  const catById = React.useMemo(() => {
    const m = new Map<string, MaterialCategoryOption>();
    for (const c of materialCategories) m.set(c.id, c);
    return m;
  }, [materialCategories]);

  const assignedIds = catMap.get(selectedLocationId) ?? [];
  const assignedCategories = assignedIds
    .map((id) => catById.get(id))
    .filter((c): c is MaterialCategoryOption => c != null);

  const allOptions = materialCategories.map((c) => ({
    value: c.id,
    label: c.code ? `${c.name} (${c.code})` : c.name,
  }));

  async function handleAdd(values: readonly string[]): Promise<void> {
    const result = await assignCategories({
      locationId: selectedLocationId,
      categoryIds: [...values],
    });
    if (result.success) {
      toastSuccess(
        `${result.data.count} ${result.data.count === 1 ? "category" : "categories"} assigned`,
      );
    } else {
      toastError(result);
    }
  }

  async function handleRemove(values: readonly string[]): Promise<void> {
    const result = await unassignCategories({
      locationId: selectedLocationId,
      categoryIds: [...values],
    });
    if (result.success) {
      toastSuccess(
        `${result.data.count} ${result.data.count === 1 ? "category" : "categories"} removed`,
      );
      setSelectedForRemoval([]);
    } else {
      toastError(result);
    }
  }

  return (
    <SectionCard
      title="Allowed Categories"
      description="Control which material categories each location is permitted to stock."
      data-testid="location-category-assignment"
    >
      {/* Location selector */}
      <div className="mb-4 flex flex-col gap-1.5">
        <Label htmlFor="cat-location-select">Location</Label>
        <Select
          value={selectedLocationId}
          onValueChange={(v) => {
            setSelectedLocationId(v);
            setSelectedForRemoval([]);
          }}
        >
          <SelectTrigger
            id="cat-location-select"
            className="max-w-xs"
            data-testid="cat-location-select"
          >
            <SelectValue placeholder="Select location" />
          </SelectTrigger>
          <SelectContent>
            {locations.map((l) => (
              <SelectItem key={l.id} value={l.id} data-testid={`cat-location-${l.id}`}>
                {l.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {selectedLocationId ? (
        <JunctionManager
          title={`Categories for ${locations.find((l) => l.id === selectedLocationId)?.name ?? ""}`}
          description="Select categories to add, then click Add. Check categories to remove them in bulk."
          options={allOptions}
          assignedValues={[...assignedIds]}
          onAdd={handleAdd}
          onRemove={handleRemove}
          selectedForRemoval={selectedForRemoval}
          onSelectionClear={() => setSelectedForRemoval([])}
          addLabel="Assign"
          removeLabel="Remove selected"
          disabled={!canWrite}
          data-testid="category-junction-manager"
        >
          {/* Current assigned list */}
          {assignedCategories.length === 0 ? (
            <p className="text-foreground-muted py-3 text-center text-sm">
              No categories assigned to this location yet.
            </p>
          ) : (
            <ul className="flex flex-wrap gap-2" role="list">
              {assignedCategories.map((cat) => {
                const isSelected = selectedForRemoval.includes(cat.id);
                return (
                  <li key={cat.id}>
                    <button
                      type="button"
                      onClick={() => {
                        if (!canWrite) return;
                        setSelectedForRemoval((prev) =>
                          isSelected ? prev.filter((id) => id !== cat.id) : [...prev, cat.id],
                        );
                      }}
                      className={[
                        "inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-xs font-medium transition-colors",
                        isSelected
                          ? "border-status-danger-border bg-status-danger-soft text-status-danger-foreground"
                          : "border-border-subtle bg-surface/60 text-foreground hover:border-border",
                        !canWrite ? "cursor-default" : "cursor-pointer",
                      ].join(" ")}
                      aria-pressed={isSelected}
                      data-testid={`cat-chip-${cat.id}`}
                    >
                      {cat.name}
                      {cat.code ? (
                        <span className="text-foreground-muted">({cat.code})</span>
                      ) : null}
                      {isSelected && <X className="size-3" aria-hidden />}
                    </button>
                  </li>
                );
              })}
            </ul>
          )}
        </JunctionManager>
      ) : (
        <p className="text-foreground-muted py-3 text-center text-sm">
          Select a location above to manage its allowed categories.
        </p>
      )}
    </SectionCard>
  );
}
