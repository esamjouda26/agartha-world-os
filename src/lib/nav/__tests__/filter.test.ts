import { describe, expect, test } from "vitest";

import { filterNavForUser, firstAccessiblePath } from "../filter";

/**
 * Tests for `filterNavForUser`. Post-cleanup (ADR-0004 + Session-5
 * sidebar rework): only features with a landed `nav.ts` under
 * `src/features/<feature>/` appear in the sidebar. Today that means
 * Attendance only. Phases 5–9 add entries as each feature lands.
 */

function idsIn(manifest: {
  sections: ReadonlyArray<{ items: ReadonlyArray<{ id: string }> }>;
}): Set<string> {
  const ids = new Set<string>();
  for (const section of manifest.sections) {
    for (const item of section.items) ids.add(item.id);
  }
  return ids;
}

describe("filterNavForUser — attendance visibility", () => {
  test("crew with hr:c sees crew-attendance", () => {
    const domains = { hr: ["c", "r"] };
    const manifest = filterNavForUser("crew", "crew", domains);
    const ids = idsIn(manifest);
    expect(ids.has("crew-attendance")).toBe(true);
  });

  test("management manager with hr:c sees mgmt-attendance", () => {
    const domains = { hr: ["c", "r"] };
    const manifest = filterNavForUser("management", "manager", domains);
    const ids = idsIn(manifest);
    expect(ids.has("mgmt-attendance")).toBe(true);
  });

  test("admin with hr:c sees admin-attendance", () => {
    const domains = { hr: ["c", "r", "u", "d"] };
    const manifest = filterNavForUser("admin", "admin", domains);
    const ids = idsIn(manifest);
    expect(ids.has("admin-attendance")).toBe(true);
  });

  test("user without hr:c does NOT see attendance", () => {
    const manifest = filterNavForUser("crew", "crew", { pos: ["c", "r"] });
    const ids = idsIn(manifest);
    expect(ids.has("crew-attendance")).toBe(false);
  });
});

describe("filterNavForUser — baseline visibility", () => {
  test("every authenticated user sees Settings (no `requires` gate)", () => {
    // Settings is a shared route — no domain required. Surfaces across
    // admin / management / crew for any authenticated user.
    const crew = idsIn(filterNavForUser("crew", "crew", {}));
    const mgmt = idsIn(filterNavForUser("management", "manager", {}));
    const admin = idsIn(filterNavForUser("admin", "admin", {}));
    expect(crew.has("crew-settings")).toBe(true);
    expect(mgmt.has("mgmt-settings")).toBe(true);
    expect(admin.has("admin-settings")).toBe(true);
  });

  test("manifest is portal-scoped: admin does not see crew items", () => {
    const domains = { hr: ["c", "r"] };
    const adminManifest = filterNavForUser("admin", "admin", domains);
    const ids = idsIn(adminManifest);
    expect(ids.has("crew-attendance")).toBe(false);
    expect(ids.has("admin-attendance")).toBe(true);
  });
});

describe("firstAccessiblePath", () => {
  test("crew with hr:c lands on /crew/attendance", () => {
    const domains = { hr: ["c", "r"] };
    const manifest = filterNavForUser("crew", "crew", domains);
    expect(firstAccessiblePath(manifest)).toBe("/crew/attendance");
  });

  test("excludeSectionId returning no items returns null", () => {
    // Both Attendance and Settings live under "shared"; excluding that
    // section leaves nothing for a crew user with hr:c today.
    const domains = { hr: ["c", "r"] };
    const manifest = filterNavForUser("crew", "crew", domains);
    expect(firstAccessiblePath(manifest, { excludeSectionId: "shared" })).toBeNull();
  });
});
