/**
 * Audit feature cache paths — ADR-0006.
 *
 * No mutations land here (audit log is immutable), so this list exists
 * only for future invalidation if an `/admin/audit`-adjacent write path
 * is ever added. Kept for parity with other feature modules.
 */
export const AUDIT_ROUTER_PATHS = ["/[locale]/admin/audit", "/[locale]/management/audit"] as const;
