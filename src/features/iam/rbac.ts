import type { FeatureRbac } from "@/lib/rbac/types";

/**
 * RBAC declarations for the IAM feature (admin portal).
 * Consumed ONLY by `src/lib/rbac/middleware-manifest.ts` (Edge bundle).
 *
 * Routes:
 *   /admin/iam      — IAM Ledger (list)
 *   /admin/iam/:id  — IAM Request Detail
 *
 * Per spec: list visible with `hr:r`; approve/reject actions require `hr:u`.
 * Middleware gates on `hr:r` for list and `hr:u` for detail (where actions live).
 */
export const rbac: FeatureRbac = {
  featureId: "iam",
  routes: [
    {
      pattern: "/admin/iam",
      domain: "hr",
      access: "r",
      primaryTables: ["iam_requests", "staff_records", "roles"],
    },
    {
      pattern: "/admin/iam/:id",
      domain: "hr",
      access: "r",
      primaryTables: ["iam_requests", "staff_records", "roles", "profiles"],
    },
  ],
} as const;
