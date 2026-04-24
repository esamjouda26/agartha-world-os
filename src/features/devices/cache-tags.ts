/**
 * Devices feature cache invalidation targets — ADR-0006.
 *
 * Router Cache paths for `revalidatePath(path, "page")` after mutations.
 * Data Cache tags are RESERVED for future `unstable_cache`-wrapped reads.
 *
 * Also includes `/[locale]/admin/it` because the IT System Dashboard
 * shows device fleet aggregates — device mutations must invalidate it too.
 */

export const DEVICES_ROUTER_PATHS = [
  "/[locale]/admin/devices",
  "/[locale]/admin/it",
  "/[locale]/admin/system-health",
] as const;

// ── Data Cache tags — reserved for future unstable_cache reads ─────────

export const DEVICES_TAG = "devices" as const;
export const DEVICE_TYPES_TAG = "device_types" as const;

export function deviceTag(deviceId: string): string {
  return `devices:${deviceId}`;
}
