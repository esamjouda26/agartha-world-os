import { describe, expect, test } from "vitest";

import { filterNavForUser, firstAccessiblePath } from "../filter";

/**
 * Tests for `filterNavForUser`. The expected-behavior table here was
 * captured at cutover from the legacy `adminNavManifest /
 * managementNavManifest / crewNavManifest` via a parity-test transition
 * period (see git history for commit that introduced these files). The
 * hardcoded ID sets below preserve that coverage after legacy deletion.
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

describe("filterNavForUser — admin persona split", () => {
  test("IT admin (holds it:c): sees IT section, hidden from Business", () => {
    const domains = {
      it: ["c", "r", "u", "d"],
      system: ["c", "r", "u", "d"],
      hr: ["c", "r", "u", "d"],
      reports: ["c", "r", "u", "d"],
      comms: ["c", "r", "u", "d"],
      booking: ["c", "r"],
    };
    const manifest = filterNavForUser("admin", "admin", domains);
    const ids = idsIn(manifest);
    // IT section items visible
    for (const id of [
      "admin-it",
      "admin-iam",
      "admin-devices",
      "admin-system-health",
      "admin-zones",
      "admin-org-units",
      "admin-permissions",
      "admin-units",
    ]) {
      expect(ids.has(id)).toBe(true);
    }
    // Business section items hidden (IT persona exclusion)
    for (const id of [
      "admin-business",
      "admin-revenue",
      "admin-operations",
      "admin-costs",
      "admin-guests",
      "admin-workforce",
    ]) {
      expect(ids.has(id)).toBe(false);
    }
    // Shared always-visible: admin-settings regardless of domains
    expect(ids.has("admin-settings")).toBe(true);
  });

  test("Business admin (no it / no system): sees Business, NOT IT", () => {
    const domains = {
      booking: ["r"],
      reports: ["r"],
      ops: ["r"],
      inventory: ["r"],
      hr: ["r"],
      comms: ["r"],
    };
    const manifest = filterNavForUser("admin", "admin", domains);
    const ids = idsIn(manifest);
    // Business section visible
    for (const id of [
      "admin-business",
      "admin-revenue",
      "admin-operations",
      "admin-costs",
      "admin-guests",
      "admin-workforce",
    ]) {
      expect(ids.has(id)).toBe(true);
    }
    // IT section hidden (no it:c, no system:c)
    for (const id of ["admin-it", "admin-iam", "admin-devices", "admin-system-health"]) {
      expect(ids.has(id)).toBe(false);
    }
    expect(ids.has("admin-settings")).toBe(true);
  });

  test("Empty-domain admin: only always-visible items", () => {
    const manifest = filterNavForUser("admin", "admin", {});
    const ids = idsIn(manifest);
    expect(ids.has("admin-settings")).toBe(true);
    // Everything else should be filtered out
    for (const id of ["admin-it", "admin-iam", "admin-business", "admin-revenue"]) {
      expect(ids.has(id)).toBe(false);
    }
  });
});

describe("filterNavForUser — management persona", () => {
  test("HR manager (hr:c + shared read): HR + reports + settings visible", () => {
    const domains = { hr: ["c", "r", "u", "d"], comms: ["r"], reports: ["r"] };
    const manifest = filterNavForUser("management", "manager", domains);
    const ids = idsIn(manifest);
    expect(ids.has("mgmt-hr")).toBe(true);
    expect(ids.has("mgmt-reports")).toBe(true);
    expect(ids.has("mgmt-announcements")).toBe(true);
    expect(ids.has("mgmt-settings")).toBe(true);
    expect(ids.has("mgmt-pos")).toBe(false);
    expect(ids.has("mgmt-inventory")).toBe(false);
  });

  test("Empty-domain manager: only always-visible", () => {
    const manifest = filterNavForUser("management", "manager", {});
    const ids = idsIn(manifest);
    expect(ids.has("mgmt-settings")).toBe(true);
    expect(ids.has("mgmt-hr")).toBe(false);
  });
});

describe("filterNavForUser — crew persona", () => {
  test("F&B crew (pos:c + hr:c + inventory_ops:c)", () => {
    const domains = {
      pos: ["c", "r"],
      hr: ["c", "r"],
      inventory_ops: ["c"],
    };
    const manifest = filterNavForUser("crew", "crew", domains);
    const ids = idsIn(manifest);
    expect(ids.has("crew-pos")).toBe(true);
    expect(ids.has("crew-active-orders")).toBe(true);
    expect(ids.has("crew-restock")).toBe(true);
    expect(ids.has("crew-logistics")).toBe(true);
    expect(ids.has("crew-disposals")).toBe(true);
    // Attendance is owned by src/features/attendance/nav.ts
    expect(ids.has("crew-attendance")).toBe(true);
    expect(ids.has("crew-schedule")).toBe(true);
    expect(ids.has("crew-leave")).toBe(true);
    // Always-visible
    expect(ids.has("crew-zone-scan")).toBe(true);
    expect(ids.has("crew-feedback")).toBe(true);
    expect(ids.has("crew-settings")).toBe(true);
    // Shouldn't see maintenance (no domain)
    expect(ids.has("crew-maintenance")).toBe(false);
  });

  test("Runner crew (hr + maintenance + ops)", () => {
    const domains = { hr: ["c", "r"], maintenance: ["c"], ops: ["c"] };
    const manifest = filterNavForUser("crew", "crew", domains);
    const ids = idsIn(manifest);
    expect(ids.has("crew-maintenance")).toBe(true);
    expect(ids.has("crew-incidents")).toBe(true);
    expect(ids.has("crew-pos")).toBe(false);
  });
});

describe("firstAccessiblePath", () => {
  test("HR manager lands on /management/hr", () => {
    const domains = { hr: ["c", "r", "u", "d"] };
    const manifest = filterNavForUser("management", "manager", domains);
    expect(firstAccessiblePath(manifest)).toBe("/management/hr");
  });

  test("Empty-domain manager lands on Settings (always-visible)", () => {
    const manifest = filterNavForUser("management", "manager", {});
    expect(firstAccessiblePath(manifest)).toBe("/management/settings");
  });

  test("excludeSectionId='shared' skips Settings-only landing", () => {
    const domains = { hr: ["c", "r"], comms: ["r"], reports: ["r"] };
    const manifest = filterNavForUser("management", "manager", domains);
    expect(firstAccessiblePath(manifest, { excludeSectionId: "shared" })).toBe("/management/hr");
  });

  test("excludeSectionId='shared' returns null when no domain section qualifies", () => {
    const manifest = filterNavForUser("management", "manager", {});
    expect(firstAccessiblePath(manifest, { excludeSectionId: "shared" })).toBeNull();
  });
});
