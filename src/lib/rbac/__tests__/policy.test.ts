import { describe, expect, test } from "vitest";

import { hasDomainAccess, isSharedBypass, resolveRouteRequirement } from "../policy";
import { brandLocaleStripped } from "../types";
import { specificityScore } from "../middleware-manifest";

/**
 * Expected Gate-5 decisions for every registered surface at the end of
 * Session 5 (Phase 4 complete). `_pending/` was removed in the cleanup
 * commit per ADR-0004 — routes appear here only when their feature
 * folder lands a real `rbac.ts`. If this table grows, Phases 5–9 are
 * doing their job.
 */
type Expected = Readonly<{
  path: string;
  bypass: boolean;
  resolved: Readonly<{ domain: string; access: "c" | "r" | "u" | "d" }> | null;
}>;

const EXPECTATIONS: readonly Expected[] = [
  // ── Admin landings + shared-bypass ──
  { path: "/admin/it", bypass: true, resolved: null },
  { path: "/admin/business", bypass: true, resolved: null },
  { path: "/admin/attendance", bypass: true, resolved: null },
  { path: "/admin/settings", bypass: true, resolved: null },
  // Announcements + Reports + Audit management routes are Gate-5 via feature rbac.ts.
  { path: "/admin/announcements", bypass: false, resolved: { domain: "comms", access: "c" } },
  { path: "/admin/reports", bypass: false, resolved: { domain: "reports", access: "r" } },
  { path: "/admin/audit", bypass: false, resolved: { domain: "reports", access: "r" } },
  // ── Management landings + shared-bypass ──
  { path: "/management", bypass: true, resolved: null },
  { path: "/management/attendance", bypass: true, resolved: null },
  { path: "/management/settings", bypass: true, resolved: null },
  { path: "/management/announcements", bypass: false, resolved: { domain: "comms", access: "c" } },
  { path: "/management/reports", bypass: false, resolved: { domain: "reports", access: "r" } },
  { path: "/management/audit", bypass: false, resolved: { domain: "reports", access: "r" } },
  { path: "/management/staffing", bypass: false, resolved: { domain: "reports", access: "r" } },
  // ── Crew shared-bypass ──
  { path: "/crew/attendance", bypass: true, resolved: null },
  { path: "/crew/schedule", bypass: true, resolved: null },
  { path: "/crew/leave", bypass: true, resolved: null },
  { path: "/crew/zone-scan", bypass: true, resolved: null },
  { path: "/crew/feedback", bypass: true, resolved: null },
  { path: "/crew/incidents", bypass: true, resolved: null },
  { path: "/crew/settings", bypass: true, resolved: null },
  // Crew has no route for announcements — they read via the topbar bell
  // only. An unmatched deep-link falls through to Next's 404.
  { path: "/crew/announcements", bypass: false, resolved: null },
  // ── Deep-link children of shared-bypass prefixes ──
  { path: "/crew/attendance/history", bypass: true, resolved: null },
  // Reports child paths inherit the feature's Gate-5 requirement.
  {
    path: "/admin/reports/monthly",
    bypass: false,
    resolved: { domain: "reports", access: "r" },
  },
  // Deep-link children of the announcements Gate-5 routes inherit the
  // same comms:c requirement.
  {
    path: "/admin/announcements/new",
    bypass: false,
    resolved: { domain: "comms", access: "c" },
  },
  // ── Unmatched (no feature yet — middleware lets them through to Next's 404) ──
  { path: "/admin/iam", bypass: false, resolved: null },
  { path: "/admin/does-not-exist", bypass: false, resolved: null },
  { path: "/management/hr", bypass: false, resolved: null },
  { path: "/crew/pos", bypass: false, resolved: null },
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
