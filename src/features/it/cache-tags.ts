/**
 * IT Infrastructure cache invalidation targets — ADR-0006.
 *
 * Router Cache paths for `revalidatePath(path, "page")` after mutations.
 * Data Cache tags are RESERVED for future `unstable_cache`-wrapped reads.
 */

// ── (1) Router Cache paths ─────────────────────────────────────────────

/**
 * Every route that reads IT-domain data. Server Actions mutating devices,
 * heartbeats, or device types must revalidate each path.
 */
export const IT_ROUTER_PATHS = [
  "/[locale]/admin/it",
  "/[locale]/admin/devices",
  "/[locale]/admin/system-health",
] as const;

// ── (2) Data Cache tags — reserved for future unstable_cache reads ─────

/** Collection tag for all devices. Reserved. */
export const SYSTEM_DEVICES_TAG = "system:devices" as const;

/** Single device tag. Reserved. */
export function systemDeviceTag(deviceId: string): string {
  return `system:devices:${deviceId}`;
}

/** Collection tag for heartbeats. Reserved. */
export const SYSTEM_HEARTBEATS_TAG = "system:heartbeats" as const;
