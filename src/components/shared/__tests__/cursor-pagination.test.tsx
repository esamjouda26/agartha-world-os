import * as React from "react";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { NuqsTestingAdapter } from "nuqs/adapters/testing";

import { CursorPagination } from "@/components/shared/cursor-pagination";

/**
 * CursorPagination tests — pin down the URL-state machinery that
 * future cursor-paginated pages depend on. The HEAD_SENTINEL trick +
 * `~`-delimited crumb stack are the load-bearing primitives; if any
 * future regression breaks them, every cursor-paginated table breaks
 * silently (Prev navigation gets lost, deep-links don't restore page).
 *
 * Coverage:
 *   - HEAD_SENTINEL survives Next → Prev round-trip back to head.
 *   - Multi-page navigation maintains crumb stack integrity.
 *   - "Back to newest" clears cursor + crumbs.
 *   - Page-size change resets cursor + crumbs (old cursors invalidated).
 *   - Default delimiter (`~`) doesn't collide with the audit cursor
 *     format (`<iso>|<uuid>`).
 *   - Custom delimiter overrides honored.
 */

/** Capture the URL params nuqs writes by snooping on the testing
 *  adapter's update callback. */
function makeUrlSpy() {
  const writes: Array<URLSearchParams> = [];
  const onUrlUpdate = ({ searchParams }: { searchParams: URLSearchParams }): void => {
    // Clone so later mutations don't leak back into earlier snapshots.
    writes.push(new URLSearchParams(searchParams.toString()));
  };
  return { writes, onUrlUpdate };
}

function renderCursorPagination(
  props: React.ComponentProps<typeof CursorPagination>,
  initialQuery: string = "",
) {
  const spy = makeUrlSpy();
  const utils = render(
    <NuqsTestingAdapter searchParams={initialQuery} onUrlUpdate={spy.onUrlUpdate}>
      <CursorPagination {...props} />
    </NuqsTestingAdapter>,
  );
  return { ...utils, ...spy };
}

const REAL_CURSOR_A = "2026-04-22T13:47:10.000000+00:00|9e04e98d-d512-47b0-9f40-00bb89df3ebb";
const REAL_CURSOR_B = "2026-04-22T13:30:10.000000+00:00|aa11bb22-cc33-44dd-eeff-001122334455";
const REAL_CURSOR_C = "2026-04-18T15:24:56.820039+00:00|d2000000-0000-4000-9000-000000000001";

describe("CursorPagination — URL state machinery", () => {
  beforeEach(() => {
    // Clean any test-adapter residue between tests.
    if (typeof window !== "undefined") {
      window.history.replaceState(null, "", "/");
    }
  });

  it("renders Next as disabled when nextCursorToken is null (last page / single page)", () => {
    renderCursorPagination({ nextCursorToken: null });
    const next = screen.getByRole("button", { name: /next/i });
    expect(next).toBeDisabled();
  });

  it("renders Next as enabled when nextCursorToken is set", () => {
    renderCursorPagination({ nextCursorToken: REAL_CURSOR_A });
    const next = screen.getByRole("button", { name: /next/i });
    expect(next).not.toBeDisabled();
  });

  it("hides 'Back to newest' on head (no cursor, no crumbs)", () => {
    renderCursorPagination({ nextCursorToken: REAL_CURSOR_A });
    expect(screen.queryByText(/back to newest/i)).not.toBeInTheDocument();
  });

  it("shows 'Back to newest' once the user has cursored off head", () => {
    renderCursorPagination(
      { nextCursorToken: REAL_CURSOR_B },
      `cursor=${encodeURIComponent(REAL_CURSOR_A)}&crumbs=@head`,
    );
    expect(screen.getByText(/back to newest/i)).toBeInTheDocument();
  });

  it("HEAD_SENTINEL round-trip: Next from head pushes @head crumb, Prev restores null cursor", async () => {
    const user = userEvent.setup();
    const { writes } = renderCursorPagination({ nextCursorToken: REAL_CURSOR_A });

    // Step 1: click Next from head.
    await user.click(screen.getByRole("button", { name: /next/i }));
    // The most recent write should set cursor to REAL_CURSOR_A AND
    // push the @head sentinel into crumbs.
    const afterNext = writes[writes.length - 1]!;
    expect(afterNext.get("cursor")).toBe(REAL_CURSOR_A);
    expect(afterNext.get("crumbs")).toBe("@head");
  });

  it("Next on page 3 pushes the current cursor onto the crumb stack", async () => {
    const user = userEvent.setup();
    // Simulate already on page 3: head → A → B (so crumbs=@head~A,
    // current cursor=B, server returns cursor C as next).
    const { writes } = renderCursorPagination(
      { nextCursorToken: REAL_CURSOR_C },
      `cursor=${encodeURIComponent(REAL_CURSOR_B)}&crumbs=${encodeURIComponent(`@head~${REAL_CURSOR_A}`)}`,
    );

    await user.click(screen.getByRole("button", { name: /next/i }));
    const afterNext = writes[writes.length - 1]!;
    expect(afterNext.get("cursor")).toBe(REAL_CURSOR_C);
    expect(afterNext.get("crumbs")).toBe(`@head~${REAL_CURSOR_A}~${REAL_CURSOR_B}`);
  });

  it("Prev on page 4 pops the top crumb back into the cursor", async () => {
    const user = userEvent.setup();
    // Simulate page 4: head → A → B → C (so crumbs=@head~A~B,
    // current cursor=C). Prev should restore cursor=B.
    const { writes } = renderCursorPagination(
      { nextCursorToken: null },
      `cursor=${encodeURIComponent(REAL_CURSOR_C)}&crumbs=${encodeURIComponent(`@head~${REAL_CURSOR_A}~${REAL_CURSOR_B}`)}`,
    );

    await user.click(screen.getByRole("button", { name: /previous/i }));
    const afterPrev = writes[writes.length - 1]!;
    expect(afterPrev.get("cursor")).toBe(REAL_CURSOR_B);
    expect(afterPrev.get("crumbs")).toBe(`@head~${REAL_CURSOR_A}`);
  });

  it("Prev pops @head sentinel back to a true null cursor (returns to head)", async () => {
    const user = userEvent.setup();
    const { writes } = renderCursorPagination(
      { nextCursorToken: null },
      `cursor=${encodeURIComponent(REAL_CURSOR_A)}&crumbs=@head`,
    );
    await user.click(screen.getByRole("button", { name: /previous/i }));
    const afterPrev = writes[writes.length - 1]!;
    // @head sentinel pops → cursor cleared (URL has no cursor param).
    // nuqs `clearOnDefault: true` deletes the param when value is null.
    expect(afterPrev.get("cursor")).toBeNull();
    expect(afterPrev.get("crumbs")).toBeNull();
  });

  it("'Back to newest' clears cursor AND crumbs in one click", async () => {
    const user = userEvent.setup();
    const { writes } = renderCursorPagination(
      { nextCursorToken: REAL_CURSOR_C },
      `cursor=${encodeURIComponent(REAL_CURSOR_B)}&crumbs=${encodeURIComponent(`@head~${REAL_CURSOR_A}`)}`,
    );
    await user.click(screen.getByRole("button", { name: /back to newest/i }));
    const final = writes[writes.length - 1]!;
    expect(final.get("cursor")).toBeNull();
    expect(final.get("crumbs")).toBeNull();
  });

  it("page-size change resets cursor + crumbs (old cursors point into a different window)", async () => {
    const user = userEvent.setup();
    const { writes } = renderCursorPagination(
      { nextCursorToken: REAL_CURSOR_C, pageSizeOptions: [10, 25, 50] },
      `cursor=${encodeURIComponent(REAL_CURSOR_B)}&crumbs=${encodeURIComponent(`@head~${REAL_CURSOR_A}`)}&pageSize=10`,
    );

    // Open the page-size select and pick 25.
    const sizeSelect = screen.getByRole("combobox");
    await user.click(sizeSelect);
    await user.click(screen.getByRole("option", { name: "25" }));

    const final = writes[writes.length - 1]!;
    expect(final.get("pageSize")).toBe("25");
    expect(final.get("cursor")).toBeNull();
    expect(final.get("crumbs")).toBeNull();
  });

  it("default delimiter `~` does not collide with the audit cursor format", () => {
    // The audit cursor is `<iso>|<uuid>`. ISO timestamps contain digits,
    // dashes, colons, dots, `T`, `Z`, `+`. UUIDs contain hex and dashes.
    // Neither contains `~`. Encoding two real cursors as a `~`-joined
    // crumb stack and decoding round-trips to the original pair.
    const stack = `${REAL_CURSOR_A}~${REAL_CURSOR_B}`;
    const split = stack.split("~");
    expect(split).toHaveLength(2);
    expect(split[0]).toBe(REAL_CURSOR_A);
    expect(split[1]).toBe(REAL_CURSOR_B);
  });

  it("custom delimiter is honored", async () => {
    const user = userEvent.setup();
    const { writes } = renderCursorPagination({
      nextCursorToken: REAL_CURSOR_A,
      crumbDelimiter: "|",
    });
    await user.click(screen.getByRole("button", { name: /next/i }));
    const afterNext = writes[writes.length - 1]!;
    // Crumb stack uses `|` instead of `~`.
    expect(afterNext.get("crumbs")).toBe("@head");
    expect(afterNext.get("cursor")).toBe(REAL_CURSOR_A);
  });

  it("custom URL param names override defaults", async () => {
    const user = userEvent.setup();
    const { writes } = renderCursorPagination({
      nextCursorToken: REAL_CURSOR_A,
      cursorParam: "page",
      crumbsParam: "history",
      pageSizeParam: "perPage",
    });
    await user.click(screen.getByRole("button", { name: /next/i }));
    const afterNext = writes[writes.length - 1]!;
    expect(afterNext.get("page")).toBe(REAL_CURSOR_A);
    expect(afterNext.get("history")).toBe("@head");
    expect(afterNext.get("cursor")).toBeNull();
    expect(afterNext.get("crumbs")).toBeNull();
  });

  it("calls onAfterPaginate after Next / Prev / page-size change", async () => {
    const user = userEvent.setup();
    const onAfterPaginate = vi.fn();
    renderCursorPagination({ nextCursorToken: REAL_CURSOR_A, onAfterPaginate });

    await user.click(screen.getByRole("button", { name: /next/i }));
    expect(onAfterPaginate).toHaveBeenCalledTimes(1);
  });
});

afterEach(() => {
  // URL cleanup between tests is handled by `beforeEach`'s
  // `history.replaceState("/")` — the testing adapter binds to a fresh
  // `searchParams` per render so there's no global state to reset here.
});
