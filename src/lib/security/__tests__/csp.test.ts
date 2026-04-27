import { describe, expect, it } from "vitest";

import { buildCsp, mintNonce } from "@/lib/security/csp";

/**
 * CSP module unit tests.
 *
 * Plan §C3 — security regression cover for the per-request CSP nonce
 * pipeline introduced in middleware. These assertions guard the
 * production directive shape: any change that re-introduces
 * `'unsafe-inline'` to script-src, drops the Stripe whitelist, or
 * regresses `frame-ancestors 'none'` will fail the gate.
 *
 * The tests do NOT validate browser CSP parsing — they assert directive
 * presence + absence at the string level, which is the only contract we
 * own. Browser conformance is exercised end-to-end by Playwright.
 */

describe("mintNonce", () => {
  it("returns a non-empty base64-ish string", () => {
    const nonce = mintNonce();
    expect(nonce).toMatch(/^[A-Za-z0-9+/=]+$/);
    expect(nonce.length).toBeGreaterThan(16);
  });

  it("returns a fresh value on each call", () => {
    const a = mintNonce();
    const b = mintNonce();
    expect(a).not.toBe(b);
  });
});

describe("buildCsp", () => {
  const NONCE = "abc123nonceXYZ";

  it("includes the supplied nonce in script-src", () => {
    const csp = buildCsp({ nonce: NONCE, isDev: false });
    expect(csp).toContain(`'nonce-${NONCE}'`);
  });

  it("includes 'strict-dynamic' so nonce'd scripts can load chunks", () => {
    const csp = buildCsp({ nonce: NONCE, isDev: false });
    expect(csp).toContain("'strict-dynamic'");
  });

  it("does NOT include 'unsafe-inline' in script-src under prod", () => {
    const csp = buildCsp({ nonce: NONCE, isDev: false });
    // Find the script-src directive specifically.
    const scriptSrc = csp
      .split(";")
      .map((d) => d.trim())
      .find((d) => d.startsWith("script-src"));
    expect(scriptSrc).toBeDefined();
    expect(scriptSrc).not.toContain("'unsafe-inline'");
  });

  it("adds 'unsafe-eval' to script-src ONLY in dev", () => {
    const dev = buildCsp({ nonce: NONCE, isDev: true });
    const prod = buildCsp({ nonce: NONCE, isDev: false });
    expect(dev).toContain("'unsafe-eval'");
    expect(prod).not.toContain("'unsafe-eval'");
  });

  it("whitelists Stripe hosts in script-src and frame-src", () => {
    const csp = buildCsp({ nonce: NONCE, isDev: false });
    expect(csp).toContain("https://js.stripe.com");
    expect(csp).toContain("https://api.stripe.com");
    expect(csp).toContain("https://checkout.stripe.com");
  });

  it("allows Supabase + Sentry + PostHog + Upstash + Stripe in connect-src", () => {
    const csp = buildCsp({ nonce: NONCE, isDev: false });
    const connectSrc = csp
      .split(";")
      .map((d) => d.trim())
      .find((d) => d.startsWith("connect-src"));
    expect(connectSrc).toBeDefined();
    expect(connectSrc).toContain("https://*.supabase.co");
    expect(connectSrc).toContain("wss://*.supabase.co");
    expect(connectSrc).toContain("https://*.sentry.io");
    expect(connectSrc).toContain("https://*.posthog.com");
    expect(connectSrc).toContain("https://*.upstash.io");
    expect(connectSrc).toContain("https://api.stripe.com");
  });

  it("forbids framing the site (clickjacking defence-in-depth)", () => {
    const csp = buildCsp({ nonce: NONCE, isDev: false });
    expect(csp).toContain("frame-ancestors 'none'");
  });

  it("forbids object/embed/applet (CVE-prone surface)", () => {
    const csp = buildCsp({ nonce: NONCE, isDev: false });
    expect(csp).toContain("object-src 'none'");
  });

  it("forces upgrade-insecure-requests in production", () => {
    const csp = buildCsp({ nonce: NONCE, isDev: false });
    expect(csp).toContain("upgrade-insecure-requests");
  });

  it("collapses to single-space separators (browser parser hygiene)", () => {
    const csp = buildCsp({ nonce: NONCE, isDev: false });
    expect(csp).not.toMatch(/\s{2,}/);
  });

  it("allows Stripe Hosted Checkout as a form-action target", () => {
    const csp = buildCsp({ nonce: NONCE, isDev: false });
    expect(csp).toContain("form-action 'self' https://checkout.stripe.com");
  });
});
