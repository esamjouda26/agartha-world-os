import "@testing-library/jest-dom/vitest";
import { cleanup } from "@testing-library/react";
import { afterEach, vi } from "vitest";

// `server-only` is Next.js's tree-shake guard for server modules. It throws
// on import outside RSC, which would crash Vitest whenever a unit test pulls
// a pure function from a server module (e.g. error-taxonomy mapping).
// Mocking it to a no-op lets the pure logic be tested in isolation without
// loosening the production boundary.
vi.mock("server-only", () => ({}));

// jsdom doesn't implement window.matchMedia. Several client hooks
// (motion.ts's usePrefersReducedMotion, theme toggle, etc.) read it
// unconditionally. Stub it with a minimal implementation that returns
// "no-preference" for every query. Per-test overrides can use
// Object.defineProperty(window, "matchMedia", ...) when behavior-specific
// assertions are needed.
if (typeof window !== "undefined" && typeof window.matchMedia !== "function") {
  Object.defineProperty(window, "matchMedia", {
    writable: true,
    configurable: true,
    value: (query: string): MediaQueryList => ({
      matches: false,
      media: query,
      onchange: null,
      addListener: () => {},
      removeListener: () => {},
      addEventListener: () => {},
      removeEventListener: () => {},
      dispatchEvent: () => false,
    }),
  });
}

// jsdom doesn't implement HTMLMediaElement.play/pause. The camera-capture
// hook calls `video.play()` inside a try/catch, so functionality isn't
// affected — but the raw "Not implemented" notice is emitted unconditionally
// by jsdom's `not-implemented.js` helper and pollutes CI logs. Stub with
// resolved-promise no-ops so tests run silent.
if (typeof HTMLMediaElement !== "undefined") {
  Object.defineProperty(HTMLMediaElement.prototype, "play", {
    configurable: true,
    writable: true,
    value: () => Promise.resolve(),
  });
  Object.defineProperty(HTMLMediaElement.prototype, "pause", {
    configurable: true,
    writable: true,
    value: () => {},
  });
}

afterEach(() => {
  cleanup();
});
