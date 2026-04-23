import type { Database } from "@/types/database";

/**
 * Incident category groupings — single source of truth for the IncidentLogPage
 * UI (group-filter dropdown, KPI cards) AND for the `allowedCategories` prop
 * each route wrapper injects (ADR-0007 Universal Pattern C).
 *
 * The full list of 26 enum values is mirrored here as keys of
 * `INCIDENT_GROUPS`. If a new value is added to the `incident_category`
 * enum in Postgres, `Database["public"]["Enums"]["incident_category"]`
 * changes, and the `satisfies` guard below surfaces the drift at compile
 * time — you'll get a "Property 'x' is missing in type" error until every
 * new value is placed in a group.
 *
 * Source of truth: [init_schema.sql:118-128](../../../supabase/migrations/20260417064731_init_schema.sql#L118).
 */

export type IncidentCategory = Database["public"]["Enums"]["incident_category"];

export type IncidentGroupKey =
  | "safety"
  | "medical"
  | "security"
  | "guest"
  | "structural"
  | "equipment"
  | "other";

/** Authoritative list of every `incident_category` enum value as a
 *  literal tuple. Zod narrows `z.enum(CATEGORY_VALUES).parse(x)` to the
 *  exact `IncidentCategory` union, which the Supabase Insert row type
 *  requires. Don't replace this with `Object.values(INCIDENT_GROUPS).flat()` —
 *  TS widens that back to `IncidentCategory[]` and you lose the tuple. */
export const CATEGORY_VALUES = [
  "fire",
  "safety_hazard",
  "biohazard",
  "suspicious_package",
  "spill",
  "medical_emergency",
  "heat_exhaustion",
  "guest_injury",
  "theft",
  "vandalism",
  "unauthorized_access",
  "altercation",
  "guest_complaint",
  "lost_child",
  "found_child",
  "crowd_congestion",
  "lost_property",
  "found_property",
  "structural",
  "prop_damage",
  "equipment_failure",
  "pos_failure",
  "hardware_failure",
  "power_outage",
  "network_outage",
  "other",
] as const satisfies readonly IncidentCategory[];

export const INCIDENT_GROUPS = {
  safety: ["fire", "safety_hazard", "biohazard", "suspicious_package", "spill"],
  medical: ["medical_emergency", "heat_exhaustion", "guest_injury"],
  security: ["theft", "vandalism", "unauthorized_access", "altercation"],
  guest: [
    "guest_complaint",
    "lost_child",
    "found_child",
    "crowd_congestion",
    "lost_property",
    "found_property",
  ],
  structural: ["structural", "prop_damage"],
  equipment: [
    "equipment_failure",
    "pos_failure",
    "hardware_failure",
    "power_outage",
    "network_outage",
  ],
  other: ["other"],
} as const satisfies Record<IncidentGroupKey, readonly IncidentCategory[]>;

/** Reverse map — `category → group`. Built at module load; O(1) lookup. */
const CATEGORY_TO_GROUP: ReadonlyMap<IncidentCategory, IncidentGroupKey> = (() => {
  const m = new Map<IncidentCategory, IncidentGroupKey>();
  for (const [group, cats] of Object.entries(INCIDENT_GROUPS) as [
    IncidentGroupKey,
    readonly IncidentCategory[],
  ][]) {
    for (const cat of cats) m.set(cat, group);
  }
  return m;
})();

export function categoryToGroup(cat: IncidentCategory): IncidentGroupKey {
  const g = CATEGORY_TO_GROUP.get(cat);
  // Guaranteed by the `satisfies Record<...>` — every enum value maps.
  // The `!` here is a runtime invariant, not a TS escape.
  return g!;
}

/** Flatten a set of allowed groups into the underlying category list. */
export function categoriesForGroups(
  groups: readonly IncidentGroupKey[],
): readonly IncidentCategory[] {
  const out: IncidentCategory[] = [];
  for (const g of groups) {
    for (const cat of INCIDENT_GROUPS[g]) out.push(cat);
  }
  return out;
}

/** Display label for the category badge. `replaceAll("_"," ")` would work
 *  but a few values read better with explicit copy. */
export const CATEGORY_LABEL: Readonly<Record<IncidentCategory, string>> = {
  fire: "Fire",
  safety_hazard: "Safety hazard",
  biohazard: "Biohazard",
  suspicious_package: "Suspicious package",
  spill: "Spill",
  medical_emergency: "Medical emergency",
  heat_exhaustion: "Heat exhaustion",
  guest_injury: "Guest injury",
  theft: "Theft",
  vandalism: "Vandalism",
  unauthorized_access: "Unauthorized access",
  altercation: "Altercation",
  guest_complaint: "Guest complaint",
  lost_child: "Lost child",
  found_child: "Found child",
  crowd_congestion: "Crowd congestion",
  lost_property: "Lost property",
  found_property: "Found property",
  other: "Other",
  structural: "Structural",
  prop_damage: "Prop damage",
  equipment_failure: "Equipment failure",
  pos_failure: "POS failure",
  hardware_failure: "Hardware failure",
  power_outage: "Power outage",
  network_outage: "Network outage",
};

export const GROUP_LABEL: Readonly<Record<IncidentGroupKey, string>> = {
  safety: "Safety",
  medical: "Medical",
  security: "Security",
  guest: "Guest",
  structural: "Structural",
  equipment: "Equipment",
  other: "Other",
};

/** Resolve notes live at `metadata.resolution_notes`. Using a single
 *  constant prevents "resolutionNotes" vs "resolution_notes" drift. */
export const RESOLUTION_NOTES_KEY = "resolution_notes" as const;

/** Attachment upload constraints — match the `operations` storage bucket
 *  ([init_schema.sql:7038](../../../supabase/migrations/20260417064731_init_schema.sql#L7038)). */
export const INCIDENT_ATTACHMENT_MAX_BYTES = 10 * 1024 * 1024;
export const INCIDENT_ATTACHMENT_ALLOWED_MIME = [
  "image/jpeg",
  "image/png",
  "image/webp",
  "video/mp4",
  "application/pdf",
] as const;
export type IncidentAttachmentMime = (typeof INCIDENT_ATTACHMENT_ALLOWED_MIME)[number];
