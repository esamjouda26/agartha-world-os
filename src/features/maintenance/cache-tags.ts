export const MAINTENANCE_ROUTER_PATHS = [
  "/[locale]/crew/maintenance/orders",
  "/[locale]/management/maintenance/orders",
  "/[locale]/management/maintenance/vendors",
  "/[locale]/management/maintenance/device-topology",
] as const;

export function maintenanceOrderTag(orderId: string): string {
  return `maintenance:order:${orderId}`;
}
