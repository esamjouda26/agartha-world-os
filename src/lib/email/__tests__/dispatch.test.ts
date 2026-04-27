import { describe, expect, it, vi, beforeEach, afterEach } from "vitest";

// Mock env BEFORE importing the module under test so the env validation
// at module init doesn't refuse to load.
vi.mock("@/lib/env", () => ({
  env: {
    NEXT_PUBLIC_SUPABASE_URL: "http://localhost:54321",
    NEXT_PUBLIC_SUPABASE_ANON_KEY: "anon-key",
    SUPABASE_SERVICE_ROLE_KEY: "service-role",
    UPSTASH_REDIS_REST_URL: "http://localhost",
    UPSTASH_REDIS_REST_TOKEN: "token",
    NEXT_PUBLIC_FACILITY_TZ: "Asia/Kuala_Lumpur",
    NODE_ENV: "test",
    // Intentionally unset RESEND_API_KEY for the soft-fail test:
    RESEND_API_KEY: undefined,
    RESEND_FROM_EMAIL: undefined,
  },
}));

vi.mock("@/lib/logger", () => ({
  loggerWith: () => ({
    info: vi.fn(),
    warn: vi.fn(),
    error: vi.fn(),
  }),
}));

import { dispatchEmail } from "@/lib/email/dispatch";

describe("dispatchEmail", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("returns ok:false when RESEND_API_KEY is unset (soft fail)", async () => {
    const fetchSpy = vi.fn();
    vi.stubGlobal("fetch", fetchSpy);

    const result = await dispatchEmail({
      type: "booking_otp",
      booking_ref: "AG-ABC123-0001",
    });

    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.error).toMatch(/RESEND_API_KEY/);
    }
    // Most importantly: did NOT make an outbound HTTP call.
    expect(fetchSpy).not.toHaveBeenCalled();
  });
});
