import { describe, expect, it } from "vitest";

import { RESTRICTED_MASK } from "@/features/audit/constants";
import { computeDiffRows } from "@/features/audit/utils/diff-values";

describe("computeDiffRows", () => {
  it("returns empty array when both sides are null", () => {
    expect(computeDiffRows(null, null)).toEqual([]);
  });

  it("marks added fields as changed", () => {
    const rows = computeDiffRows({}, { name: "Alice" });
    expect(rows).toHaveLength(1);
    expect(rows[0]).toMatchObject({
      field: "name",
      oldValue: null,
      newValue: "Alice",
      changed: true,
    });
  });

  it("marks removed fields as changed", () => {
    const rows = computeDiffRows({ name: "Alice" }, {});
    expect(rows[0]).toMatchObject({
      field: "name",
      oldValue: "Alice",
      newValue: null,
      changed: true,
    });
  });

  it("marks unchanged fields as not changed", () => {
    const rows = computeDiffRows({ name: "Alice", age: 30 }, { name: "Alice", age: 31 });
    const byField = Object.fromEntries(rows.map((r) => [r.field, r]));
    expect(byField.name?.changed).toBe(false);
    expect(byField.age?.changed).toBe(true);
  });

  it("stringifies nested objects for display", () => {
    const rows = computeDiffRows({ meta: { k: 1 } }, { meta: { k: 2 } });
    expect(rows[0]?.oldValue).toBe('{"k":1}');
    expect(rows[0]?.newValue).toBe('{"k":2}');
  });

  it("masks restricted columns matching _enc suffix", () => {
    const rows = computeDiffRows(
      { salary_enc: "ciphertext-old" },
      { salary_enc: "ciphertext-new" },
    );
    expect(rows[0]?.restricted).toBe(true);
    expect(rows[0]?.oldValue).toBe(RESTRICTED_MASK);
    expect(rows[0]?.newValue).toBe(RESTRICTED_MASK);
  });

  it("masks restricted columns matching prefix patterns", () => {
    const rows = computeDiffRows({ bank_account_number: "old" }, { bank_account_number: "new" });
    expect(rows[0]?.restricted).toBe(true);
    expect(rows[0]?.oldValue).toBe(RESTRICTED_MASK);
  });

  it("masks exact-match restricted keys (password)", () => {
    const rows = computeDiffRows({ password: "hunter2" }, { password: "new-hash" });
    expect(rows[0]?.restricted).toBe(true);
    expect(rows[0]?.newValue).toBe(RESTRICTED_MASK);
  });

  it("keeps non-restricted columns in the clear", () => {
    const rows = computeDiffRows({ display_name: "Alice" }, { display_name: "Bob" });
    expect(rows[0]?.restricted).toBe(false);
    expect(rows[0]?.oldValue).toBe("Alice");
    expect(rows[0]?.newValue).toBe("Bob");
  });

  it("sorts fields alphabetically", () => {
    const rows = computeDiffRows({ zulu: 1, alpha: 2, mike: 3 }, { zulu: 1, alpha: 2, mike: 3 });
    expect(rows.map((r) => r.field)).toEqual(["alpha", "mike", "zulu"]);
  });
});
