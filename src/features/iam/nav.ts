import type { FeatureNav } from "@/lib/nav/types";

/**
 * Navigation entries for the IAM feature.
 * Consumed ONLY by `src/lib/nav/manifest.ts`.
 *
 * IAM is an IT-admin route — visible only to admins with `hr:c`.
 * The deep-link `/admin/iam/[id]` does NOT appear in nav (per FeatureNavItem docs).
 */
export const nav: FeatureNav = {
  featureId: "iam",
  items: [
    {
      id: "admin-iam",
      portal: "admin",
      path: "/admin/iam",
      section: "it",
      order: 15,
      iconName: "ShieldCheck",
      labelKey: "nav.admin.iam",
      label: "IAM Requests",
      requires: { domain: "it", access: "c" },
    },
  ],
} as const;
