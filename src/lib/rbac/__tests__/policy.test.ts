import { describe, expect, test } from "vitest";

import { hasDomainAccess, isSharedBypass, resolveRouteRequirement } from "../policy";
import { brandLocaleStripped } from "../types";
import { specificityScore } from "../middleware-manifest";

/**
 * Expected decisions for every registered path. Hardcoded at cutover from
 * the legacy `src/lib/rbac/route-manifest.ts`. If these values change, the
 * change MUST be accompanied by an ADR — Gate 5 is a security boundary.
 */
type Expected = Readonly<{
  path: string;
  bypass: boolean;
  resolved: Readonly<{ domain: string; access: "c" | "r" | "u" | "d" }> | null;
}>;

const EXPECTATIONS: readonly Expected[] = [
  // ── Shared-bypass: exact hits ──
  { path: "/admin/reports", bypass: true, resolved: null },
  { path: "/admin/audit", bypass: true, resolved: null },
  { path: "/admin/announcements", bypass: true, resolved: null },
  { path: "/admin/attendance", bypass: true, resolved: null },
  { path: "/admin/settings", bypass: true, resolved: null },
  { path: "/management/reports", bypass: true, resolved: null },
  { path: "/management/audit", bypass: true, resolved: null },
  { path: "/management/announcements", bypass: true, resolved: null },
  { path: "/management/attendance", bypass: true, resolved: null },
  { path: "/management/staffing", bypass: true, resolved: null },
  { path: "/management/settings", bypass: true, resolved: null },
  { path: "/crew/attendance", bypass: true, resolved: null },
  { path: "/crew/schedule", bypass: true, resolved: null },
  { path: "/crew/leave", bypass: true, resolved: null },
  { path: "/crew/zone-scan", bypass: true, resolved: null },
  { path: "/crew/feedback", bypass: true, resolved: null },
  { path: "/crew/announcements", bypass: true, resolved: null },
  { path: "/crew/settings", bypass: true, resolved: null },
  // ── Shared-bypass: child paths ──
  { path: "/admin/reports/monthly", bypass: true, resolved: null },
  { path: "/crew/attendance/history", bypass: true, resolved: null },
  // ── Domain-gated base paths ──
  { path: "/admin/iam", bypass: false, resolved: { domain: "hr", access: "c" } },
  { path: "/admin/devices", bypass: false, resolved: { domain: "it", access: "c" } },
  { path: "/admin/system-health", bypass: false, resolved: { domain: "it", access: "c" } },
  { path: "/admin/zones", bypass: false, resolved: { domain: "system", access: "c" } },
  { path: "/admin/org-units", bypass: false, resolved: { domain: "system", access: "c" } },
  { path: "/admin/permissions", bypass: false, resolved: { domain: "system", access: "c" } },
  { path: "/admin/units", bypass: false, resolved: { domain: "system", access: "c" } },
  { path: "/admin/it", bypass: false, resolved: { domain: "it", access: "c" } },
  { path: "/admin/business", bypass: false, resolved: { domain: "booking", access: "r" } },
  { path: "/admin/revenue", bypass: false, resolved: { domain: "booking", access: "r" } },
  { path: "/admin/operations", bypass: false, resolved: { domain: "ops", access: "r" } },
  { path: "/admin/costs", bypass: false, resolved: { domain: "inventory", access: "r" } },
  { path: "/admin/guests", bypass: false, resolved: { domain: "reports", access: "r" } },
  { path: "/admin/workforce", bypass: false, resolved: { domain: "hr", access: "r" } },
  { path: "/management/hr", bypass: false, resolved: { domain: "hr", access: "c" } },
  { path: "/management/pos", bypass: false, resolved: { domain: "pos", access: "c" } },
  { path: "/management/pos/bom", bypass: false, resolved: { domain: "pos", access: "c" } },
  { path: "/management/pos/price-lists", bypass: false, resolved: { domain: "pos", access: "c" } },
  {
    path: "/management/procurement",
    bypass: false,
    resolved: { domain: "procurement", access: "c" },
  },
  { path: "/management/inventory", bypass: false, resolved: { domain: "inventory", access: "c" } },
  { path: "/management/operations", bypass: false, resolved: { domain: "ops", access: "c" } },
  {
    path: "/management/operations/experiences",
    bypass: false,
    resolved: { domain: "booking", access: "c" },
  },
  {
    path: "/management/operations/scheduler",
    bypass: false,
    resolved: { domain: "booking", access: "c" },
  },
  {
    path: "/management/maintenance",
    bypass: false,
    resolved: { domain: "maintenance", access: "c" },
  },
  { path: "/management/marketing", bypass: false, resolved: { domain: "marketing", access: "c" } },
  { path: "/crew/pos", bypass: false, resolved: { domain: "pos", access: "c" } },
  { path: "/crew/active-orders", bypass: false, resolved: { domain: "pos", access: "r" } },
  { path: "/crew/entry-validation", bypass: false, resolved: { domain: "booking", access: "r" } },
  { path: "/crew/restock", bypass: false, resolved: { domain: "inventory_ops", access: "c" } },
  { path: "/crew/logistics", bypass: false, resolved: { domain: "inventory_ops", access: "c" } },
  { path: "/crew/disposals", bypass: false, resolved: { domain: "inventory_ops", access: "c" } },
  { path: "/crew/maintenance", bypass: false, resolved: { domain: "maintenance", access: "c" } },
  // /crew/incidents is shared-bypass — middleware skips Gate 5, RLS enforces row-level access.
  { path: "/crew/incidents", bypass: true, resolved: null },
  // ── Deep-link children (specificity ordering matters) ──
  { path: "/admin/iam/abc123", bypass: false, resolved: { domain: "hr", access: "c" } },
  {
    path: "/management/operations/experiences/xyz",
    bypass: false,
    resolved: { domain: "booking", access: "c" },
  },
  {
    path: "/crew/logistics/restock-queue",
    bypass: false,
    resolved: { domain: "inventory_ops", access: "c" },
  },
  {
    path: "/crew/logistics/po-receiving",
    bypass: false,
    resolved: { domain: "inventory_ops", access: "c" },
  },
  // ── Unmatched ──
  { path: "/admin/does-not-exist", bypass: false, resolved: null },
  { path: "/totally-unmatched", bypass: false, resolved: null },
];

describe("policy.isSharedBypass", () => {
  for (const e of EXPECTATIONS) {
    test(`${e.path} → bypass=${e.bypass}`, () => {
      const path = brandLocaleStripped(e.path);
      expect(isSharedBypass(path)).toBe(e.bypass);
    });
  }
});

describe("policy.resolveRouteRequirement", () => {
  for (const e of EXPECTATIONS) {
    test(`${e.path} → ${e.resolved ? `${e.resolved.domain}:${e.resolved.access}` : "null"}`, () => {
      const path = brandLocaleStripped(e.path);
      const got = resolveRouteRequirement(path);
      if (e.resolved === null) {
        expect(got).toBeNull();
      } else {
        expect(got).not.toBeNull();
        expect(got?.domain).toBe(e.resolved.domain);
        expect(got?.access).toBe(e.resolved.access);
      }
    });
  }
});

describe("policy.hasDomainAccess", () => {
  const cases: ReadonlyArray<
    [Record<string, readonly string[]> | undefined, string, "c" | "r" | "u" | "d", boolean]
  > = [
    [{ hr: ["c", "r"] }, "hr", "c", true],
    [{ hr: ["c", "r"] }, "hr", "d", false],
    [{ hr: ["c", "r"] }, "pos", "r", false],
    [undefined, "hr", "r", false],
    [{}, "hr", "r", false],
  ];
  for (const [domains, domain, access, expected] of cases) {
    test(`${JSON.stringify(domains)} ${domain}:${access} → ${expected}`, () => {
      expect(hasDomainAccess(domains, domain, access)).toBe(expected);
    });
  }
});

describe("specificityScore ordering invariants", () => {
  test("named segment beats bare prefix", () => {
    expect(specificityScore("/admin/iam/:id")).toBeGreaterThan(specificityScore("/admin/iam"));
  });
  test("deeper literal path beats wildcard sibling", () => {
    expect(specificityScore("/management/pos/bom")).toBeGreaterThan(
      specificityScore("/management/pos{/*}?"),
    );
  });
  test("experiences beats bare /management/operations{/*}?", () => {
    expect(specificityScore("/management/operations/experiences{/*}?")).toBeGreaterThan(
      specificityScore("/management/operations{/*}?"),
    );
  });
});

describe("resolveRouteRequirement deep-link semantics", () => {
  test("locale-prefixed paths never match (brand prevents it)", () => {
    // Documents the branded-type contract: middleware must strip locale
    // before branding. A locale-prefixed path branded here intentionally
    // cannot match any pattern — patterns are locale-free.
    const req = resolveRouteRequirement(brandLocaleStripped("/en/crew/incidents"));
    expect(req).toBeNull();
  });
});
