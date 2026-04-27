import { describe, expect, it, vi, beforeEach } from "vitest";

vi.mock("next/headers", () => {
  const cookieStore: Map<string, string> = new Map();
  const headerStore: Map<string, string> = new Map();
  return {
    cookies: () =>
      Promise.resolve({
        get: (name: string) =>
          cookieStore.has(name) ? { value: cookieStore.get(name)! } : undefined,
        set: (name: string, value: string) => {
          cookieStore.set(name, value);
        },
      }),
    headers: () =>
      Promise.resolve({
        get: (name: string) => headerStore.get(name.toLowerCase()) ?? null,
      }),
    __setHeader: (name: string, value: string) => {
      headerStore.set(name.toLowerCase(), value);
    },
    __clearHeaders: () => {
      headerStore.clear();
    },
    __setCookie: (name: string, value: string) => {
      cookieStore.set(name, value);
    },
    __clearCookies: () => {
      cookieStore.clear();
    },
  };
});

import {
  mintGuestCsrfToken,
  verifyGuestSameOrigin,
  GUEST_CSRF_COOKIE,
} from "@/lib/auth/guest-csrf";
import * as headers from "next/headers";

type Hdr = typeof headers & {
  __setHeader: (name: string, value: string) => void;
  __clearHeaders: () => void;
  __setCookie: (name: string, value: string) => void;
  __clearCookies: () => void;
};

describe("mintGuestCsrfToken", () => {
  it("emits a unique base64url token of expected length", () => {
    const a = mintGuestCsrfToken();
    const b = mintGuestCsrfToken();
    expect(a).not.toBe(b);
    // 32 bytes → ~43 base64url chars without padding.
    expect(a.length).toBeGreaterThanOrEqual(40);
    expect(a).toMatch(/^[A-Za-z0-9_-]+$/);
  });
});

describe("verifyGuestSameOrigin", () => {
  beforeEach(() => {
    (headers as Hdr).__clearHeaders();
  });

  it("accepts when Origin matches Host", async () => {
    (headers as Hdr).__setHeader("host", "agartha.example");
    (headers as Hdr).__setHeader("origin", "https://agartha.example");

    const ok = await verifyGuestSameOrigin();
    expect(ok).toBe(true);
  });

  it("rejects when Origin host differs from Host", async () => {
    (headers as Hdr).__setHeader("host", "agartha.example");
    (headers as Hdr).__setHeader("origin", "https://evil.example");

    const ok = await verifyGuestSameOrigin();
    expect(ok).toBe(false);
  });

  it("falls back to Referer when Origin missing", async () => {
    (headers as Hdr).__setHeader("host", "agartha.example");
    (headers as Hdr).__setHeader("referer", "https://agartha.example/book");

    const ok = await verifyGuestSameOrigin();
    expect(ok).toBe(true);
  });

  it("rejects bad Referer host", async () => {
    (headers as Hdr).__setHeader("host", "agartha.example");
    (headers as Hdr).__setHeader("referer", "https://evil.example/spoof");

    const ok = await verifyGuestSameOrigin();
    expect(ok).toBe(false);
  });
});

describe("GUEST_CSRF_COOKIE constant", () => {
  it("matches the documented cookie name", () => {
    expect(GUEST_CSRF_COOKIE).toBe("guest_csrf");
  });
});
