import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { INCIDENTS_ROUTER_PATHS } from "@/features/incidents/cache-tags";

/**
 * ADR-0006 contract: every incidents mutation calls `revalidatePath(p,
 * "page")` for every path in `INCIDENTS_ROUTER_PATHS`; never
 * `revalidatePath("/", "layout")`; never `revalidateTag` / `updateTag`.
 */

const revalidatePathMock = vi.hoisted(() => vi.fn<(path: string, scope: string) => void>());
const revalidateTagMock = vi.hoisted(() => vi.fn<(tag: string) => void>());
const updateTagMock = vi.hoisted(() => vi.fn<(tag: string) => void>());
const rateLimitMock = vi.hoisted(() => vi.fn(async () => ({ success: true })));

const getUserMock = vi.hoisted(() =>
  vi.fn(async () => ({
    data: {
      user: {
        id: "00000000-0000-0000-0000-000000000001",
        app_metadata: { domains: { ops: ["c", "r", "u", "d"] } },
      },
    },
  })),
);

const insertSingleMock = vi.hoisted(() =>
  vi.fn(async () => ({ data: { id: "00000000-0000-4000-8000-000000000a1a" }, error: null })),
);
const insertChainMock = vi.hoisted(() => ({
  select: () => ({ single: insertSingleMock }),
}));

const readIncidentMock = vi.hoisted(() =>
  vi.fn(async () => ({
    data: { id: "x", status: "open", metadata: {} },
    error: null,
  })),
);
const updateChainMock = vi.hoisted(() => ({
  eq: () => ({ eq: async () => ({ error: null }) }),
}));

const fromMock = vi.hoisted(() =>
  vi.fn(() => ({
    insert: () => insertChainMock,
    select: () => ({
      eq: () => ({ maybeSingle: readIncidentMock }),
    }),
    update: () => updateChainMock,
  })),
);

const uploadMock = vi.hoisted(() => vi.fn(async () => ({ error: null })));

vi.mock("next/cache", () => ({
  revalidatePath: revalidatePathMock,
  revalidateTag: revalidateTagMock,
  updateTag: updateTagMock,
}));
vi.mock("next/server", () => ({
  after: (cb: () => void | Promise<void>) => {
    void cb();
  },
}));
vi.mock("@/lib/rate-limit", () => ({
  createRateLimiter: () => ({ limit: rateLimitMock }),
}));
vi.mock("@/lib/supabase/server", () => ({
  createSupabaseServerClient: async () => ({
    auth: { getUser: getUserMock },
    from: fromMock,
    storage: { from: () => ({ upload: uploadMock }) },
  }),
}));

beforeEach(() => {
  revalidatePathMock.mockReset();
  revalidateTagMock.mockReset();
  updateTagMock.mockReset();
  rateLimitMock.mockReset();
  rateLimitMock.mockResolvedValue({ success: true });
});

afterEach(() => {
  vi.clearAllMocks();
});

function assertSurgicalInvalidation() {
  for (const path of INCIDENTS_ROUTER_PATHS) {
    expect(revalidatePathMock).toHaveBeenCalledWith(path, "page");
  }
  expect(revalidatePathMock).not.toHaveBeenCalledWith("/", "layout");
  expect(revalidateTagMock).not.toHaveBeenCalled();
  expect(updateTagMock).not.toHaveBeenCalled();
}

describe("incidents Server Actions — ADR-0006 cache invalidation", () => {
  const uuid = "00000000-0000-4000-8000-000000000001";

  it("createIncidentAction invalidates paths surgically", async () => {
    const { createIncidentAction } = await import("@/features/incidents/actions/create-incident");
    const fd = new FormData();
    fd.set("category", "fire");
    fd.set("description", "Small fire near concession stand — extinguisher used.");
    fd.set("zoneId", uuid);
    const result = await createIncidentAction(fd);
    expect(result.success).toBe(true);
    assertSurgicalInvalidation();
  });

  it("resolveIncidentAction invalidates paths surgically", async () => {
    const { resolveIncidentAction } = await import("@/features/incidents/actions/resolve-incident");
    const result = await resolveIncidentAction({
      id: uuid,
      notes: "Dealt with — guest escorted away, shift supervisor briefed.",
    });
    expect(result.success).toBe(true);
    assertSurgicalInvalidation();
  });
});

describe("incidents Server Actions — pipeline short-circuits", () => {
  const uuid = "00000000-0000-4000-8000-000000000001";

  it("createIncidentAction rejects invalid input without touching DB", async () => {
    const { createIncidentAction } = await import("@/features/incidents/actions/create-incident");
    const fd = new FormData();
    fd.set("category", "not-a-category");
    fd.set("description", "x");
    const result = await createIncidentAction(fd);
    expect(result.success).toBe(false);
    if (!result.success) expect(result.error).toBe("VALIDATION_FAILED");
    expect(uploadMock).not.toHaveBeenCalled();
    expect(fromMock).not.toHaveBeenCalled();
  });

  it("resolveIncidentAction refuses without ops:u", async () => {
    getUserMock.mockResolvedValueOnce({
      data: {
        user: {
          id: "00000000-0000-0000-0000-000000000001",
          app_metadata: { domains: { ops: ["r"] } },
        },
      },
    });
    const { resolveIncidentAction } = await import("@/features/incidents/actions/resolve-incident");
    const result = await resolveIncidentAction({
      id: uuid,
      notes: "Attempted resolve without permission.",
    });
    expect(result.success).toBe(false);
    if (!result.success) expect(result.error).toBe("FORBIDDEN");
    expect(revalidatePathMock).not.toHaveBeenCalled();
  });
});
