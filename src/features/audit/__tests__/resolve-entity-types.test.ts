import { describe, expect, it } from "vitest";

import { resolveAllowedEntityTypes } from "@/features/audit/queries/resolve-allowed-entity-types";

describe("resolveAllowedEntityTypes", () => {
  it("returns empty array for a user with no read grants", () => {
    expect(resolveAllowedEntityTypes({ domains: undefined })).toEqual([]);
    expect(resolveAllowedEntityTypes({ domains: {} })).toEqual([]);
    // Write-only grants don't grant visibility.
    expect(resolveAllowedEntityTypes({ domains: { hr: ["c", "u"] } })).toEqual([]);
  });

  it("returns only hr entity types for an HR manager", () => {
    const result = resolveAllowedEntityTypes({
      domains: { hr: ["c", "r", "u", "d"], comms: ["c", "r", "u"], system: ["r"], reports: ["r"] },
    });
    // HR-owned tables
    expect(result).toContain("staff_records");
    expect(result).toContain("profiles");
    expect(result).toContain("timecard_punches");
    // Not HR-owned
    expect(result).not.toContain("pos_points");
    expect(result).not.toContain("orders");
    expect(result).not.toContain("purchase_orders");
    // system:r unlocks the system bucket (roles, org_units, etc.)
    expect(result).toContain("roles");
  });

  it("returns every known entity type for an admin (holds every domain)", () => {
    // Mirror the seed — admins get every domain with full CRUD.
    const allDomains = {
      hr: ["c", "r", "u", "d"],
      pos: ["c", "r", "u", "d"],
      procurement: ["c", "r", "u", "d"],
      inventory: ["c", "r", "u", "d"],
      inventory_ops: ["c", "r", "u", "d"],
      ops: ["c", "r", "u", "d"],
      booking: ["c", "r", "u", "d"],
      marketing: ["c", "r", "u", "d"],
      maintenance: ["c", "r", "u", "d"],
      comms: ["c", "r", "u", "d"],
      system: ["c", "r", "u", "d"],
      reports: ["c", "r", "u", "d"],
      finance: ["c", "r", "u", "d"],
      it: ["c", "r", "u", "d"],
    };
    const result = resolveAllowedEntityTypes({ domains: allDomains });
    // Should include types from every bucket.
    expect(result).toContain("staff_records");
    expect(result).toContain("orders");
    expect(result).toContain("incidents");
    expect(result).toContain("roles");
    expect(result).toContain("permission_domains");
  });

  it("handles multi-owner entity types (incidents owned by ops + maintenance)", () => {
    // User holds maintenance:r but not ops:r. Should still see incidents.
    const result = resolveAllowedEntityTypes({ domains: { maintenance: ["r"] } });
    expect(result).toContain("incidents");
    expect(result).toContain("maintenance_orders");
    expect(result).toContain("devices");
  });
});
