import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { SETTINGS_ROUTER_PATHS } from "@/features/settings/cache-tags";
import { AVATAR_MAX_BYTES } from "@/features/settings/schemas/profile";

/**
 * Cache-invalidation + 8-step pipeline contract for `updateAvatarAction`.
 * Mirrors `attendance/__tests__/cache-invalidation.test.ts` — locks in
 * ADR-0006 surgical invalidation (no layout purge, no tag APIs), and
 * verifies the action's validation / auth / rate-limit branches.
 */

type RpcCall = (name: string, params: Record<string, unknown>) => Promise<{ error: unknown }>;
type UploadCall = (
  path: string,
  file: File,
  options: Record<string, unknown>,
) => Promise<{ error: unknown }>;
type GetPublicUrlCall = (path: string) => { data: { publicUrl: string } };
type GetUserCall = () => Promise<{
  data: { user: { id: string; app_metadata: Record<string, unknown> } | null };
}>;
type RateLimitCall = (key: string) => Promise<{ success: boolean }>;

const revalidatePathMock = vi.hoisted(() => vi.fn<(path: string, scope: string) => void>());
const revalidateTagMock = vi.hoisted(() => vi.fn<(tag: string) => void>());
const updateTagMock = vi.hoisted(() => vi.fn<(tag: string) => void>());
const rateLimitMock = vi.hoisted(() => vi.fn<RateLimitCall>());
const getUserMock = vi.hoisted(() => vi.fn<GetUserCall>());
const rpcMock = vi.hoisted(() => vi.fn<RpcCall>());
const uploadMock = vi.hoisted(() => vi.fn<UploadCall>());
const getPublicUrlMock = vi.hoisted(() => vi.fn<GetPublicUrlCall>());

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
    rpc: rpcMock,
    storage: {
      from: () => ({
        upload: uploadMock,
        getPublicUrl: getPublicUrlMock,
      }),
    },
  }),
}));

function makeFormData(file: File): FormData {
  const fd = new FormData();
  fd.set("avatar", file);
  return fd;
}

function makeFile(size: number, type: string, name = "avatar.png"): File {
  const payload = new Uint8Array(size).fill(0x61);
  return new File([payload], name, { type });
}

beforeEach(() => {
  revalidatePathMock.mockReset();
  revalidateTagMock.mockReset();
  updateTagMock.mockReset();
  rateLimitMock.mockReset();
  rateLimitMock.mockResolvedValue({ success: true });
  getUserMock.mockReset();
  getUserMock.mockResolvedValue({
    data: {
      user: {
        id: "00000000-0000-0000-0000-000000000001",
        app_metadata: {},
      },
    },
  });
  rpcMock.mockReset();
  rpcMock.mockResolvedValue({ error: null });
  uploadMock.mockReset();
  uploadMock.mockResolvedValue({ error: null });
  getPublicUrlMock.mockReset();
  getPublicUrlMock.mockReturnValue({
    data: { publicUrl: "https://supabase.example/avatars/user/avatar.png" },
  });
});

function firstCall<Args extends unknown[]>(
  mock: ReturnType<typeof vi.fn<(...a: Args) => unknown>>,
): Args {
  const calls = mock.mock.calls;
  if (calls.length === 0) throw new Error("mock has no calls");
  return calls[0] as Args;
}

afterEach(() => {
  vi.clearAllMocks();
});

describe("updateAvatarAction — 8-step pipeline + ADR-0006 cache invalidation", () => {
  it("rejects a missing file with VALIDATION_FAILED and does not invalidate caches", async () => {
    const { updateAvatarAction } = await import("@/features/settings/actions/update-avatar");
    const fd = new FormData();
    const result = await updateAvatarAction(fd);
    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error).toBe("VALIDATION_FAILED");
      expect(result.fields).toBeDefined();
    }
    expect(revalidatePathMock).not.toHaveBeenCalled();
    expect(uploadMock).not.toHaveBeenCalled();
    expect(rpcMock).not.toHaveBeenCalled();
  });

  it("rejects an oversized file with VALIDATION_FAILED", async () => {
    const { updateAvatarAction } = await import("@/features/settings/actions/update-avatar");
    const file = makeFile(AVATAR_MAX_BYTES + 1, "image/png");
    const result = await updateAvatarAction(makeFormData(file));
    expect(result.success).toBe(false);
    if (!result.success) expect(result.error).toBe("VALIDATION_FAILED");
  });

  it("returns UNAUTHENTICATED when no user session", async () => {
    getUserMock.mockResolvedValueOnce({ data: { user: null } });
    const { updateAvatarAction } = await import("@/features/settings/actions/update-avatar");
    const file = makeFile(2048, "image/png");
    const result = await updateAvatarAction(makeFormData(file));
    expect(result.success).toBe(false);
    if (!result.success) expect(result.error).toBe("UNAUTHENTICATED");
    expect(uploadMock).not.toHaveBeenCalled();
  });

  it("returns RATE_LIMITED when the limiter denies", async () => {
    rateLimitMock.mockResolvedValueOnce({ success: false });
    const { updateAvatarAction } = await import("@/features/settings/actions/update-avatar");
    const file = makeFile(2048, "image/png");
    const result = await updateAvatarAction(makeFormData(file));
    expect(result.success).toBe(false);
    if (!result.success) expect(result.error).toBe("RATE_LIMITED");
    expect(uploadMock).not.toHaveBeenCalled();
  });

  it("returns DEPENDENCY_FAILED when storage upload errors", async () => {
    uploadMock.mockResolvedValueOnce({ error: { message: "Bucket offline" } });
    const { updateAvatarAction } = await import("@/features/settings/actions/update-avatar");
    const file = makeFile(2048, "image/png");
    const result = await updateAvatarAction(makeFormData(file));
    expect(result.success).toBe(false);
    if (!result.success) expect(result.error).toBe("DEPENDENCY_FAILED");
    expect(rpcMock).not.toHaveBeenCalled();
  });

  it("returns INTERNAL when the RPC errors", async () => {
    rpcMock.mockResolvedValueOnce({ error: { message: "RPC boom" } });
    const { updateAvatarAction } = await import("@/features/settings/actions/update-avatar");
    const file = makeFile(2048, "image/png");
    const result = await updateAvatarAction(makeFormData(file));
    expect(result.success).toBe(false);
    if (!result.success) expect(result.error).toBe("INTERNAL");
  });

  it("uploads, persists, and invalidates SETTINGS_ROUTER_PATHS on happy path", async () => {
    const { updateAvatarAction } = await import("@/features/settings/actions/update-avatar");
    const file = makeFile(4096, "image/png");
    const result = await updateAvatarAction(makeFormData(file));
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.avatarUrl).toContain("https://supabase.example/avatars/user/avatar.png");
      expect(result.data.avatarUrl).toContain("?v=");
    }

    // Upload targets the user's own folder with extension by MIME.
    expect(uploadMock).toHaveBeenCalledTimes(1);
    expect(firstCall(uploadMock)[0]).toBe("00000000-0000-0000-0000-000000000001/avatar.png");

    // RPC is called with the versioned public URL.
    expect(rpcMock).toHaveBeenCalledTimes(1);
    expect(firstCall(rpcMock)[0]).toBe("rpc_update_own_avatar");

    // ADR-0006: surgical path invalidation only.
    for (const path of SETTINGS_ROUTER_PATHS) {
      expect(revalidatePathMock).toHaveBeenCalledWith(path, "page");
    }
    expect(revalidatePathMock).not.toHaveBeenCalledWith("/", "layout");
    expect(revalidateTagMock).not.toHaveBeenCalled();
    expect(updateTagMock).not.toHaveBeenCalled();
  });

  it("maps image/jpeg to jpg extension in the storage key", async () => {
    const { updateAvatarAction } = await import("@/features/settings/actions/update-avatar");
    const file = makeFile(2048, "image/jpeg", "me.jpg");
    const result = await updateAvatarAction(makeFormData(file));
    expect(result.success).toBe(true);
    expect(firstCall(uploadMock)[0]).toBe("00000000-0000-0000-0000-000000000001/avatar.jpg");
  });

  it("maps image/webp to webp extension in the storage key", async () => {
    const { updateAvatarAction } = await import("@/features/settings/actions/update-avatar");
    const file = makeFile(2048, "image/webp", "me.webp");
    const result = await updateAvatarAction(makeFormData(file));
    expect(result.success).toBe(true);
    expect(firstCall(uploadMock)[0]).toBe("00000000-0000-0000-0000-000000000001/avatar.webp");
  });
});
