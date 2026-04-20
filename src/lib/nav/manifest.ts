import { nav as attendanceNav } from "@/features/attendance/nav";
import { nav as pendingNav } from "@/features/_pending/nav";

import type { FeatureNav } from "./types";

/**
 * Nav aggregator. Imports ONLY from each feature's `nav.ts` — never
 * from any `rbac.ts` or from `src/lib/rbac/**`. This file is imported from
 * server components (portal layouts) and the client command palette.
 *
 * The ESLint `no-restricted-imports` rule forbids middleware.ts from
 * importing anything under `src/lib/nav/**`, which prevents icon names
 * and i18n keys from reaching the Edge bundle.
 */
export const FEATURE_NAV: readonly FeatureNav[] = [attendanceNav, pendingNav] as const;
