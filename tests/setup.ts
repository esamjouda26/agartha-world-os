import "@testing-library/jest-dom/vitest";
import { cleanup } from "@testing-library/react";
import { afterEach, vi } from "vitest";
import * as React from "react";

// `server-only` is Next.js's tree-shake guard for server modules. It throws
// on import outside RSC, which would crash Vitest whenever a unit test pulls
// a pure function from a server module (e.g. error-taxonomy mapping).
// Mocking it to a no-op lets the pure logic be tested in isolation without
// loosening the production boundary.
vi.mock("server-only", () => ({}));

// `@/i18n/navigation` invokes `createNavigation(routing)` from next-intl at
// module init. In Vitest under jsdom + Node's strict ESM resolver, the
// transitive `import { redirect } from "next/navigation"` resolves to a
// CJS interop that doesn't expose the names next-intl expects, crashing
// any test tree that touches a component using `<Link>` or
// `useRouter`. Stubbing the wrapper directly with a typed shim mirrors the
// surface the app uses without evaluating next-intl in the test process.
vi.mock("@/i18n/navigation", () => {
  type LinkHref = string | { pathname: string };
  type LinkProps = Omit<React.ComponentProps<"a">, "href"> & {
    href: LinkHref;
  };
  const Link = React.forwardRef<HTMLAnchorElement, LinkProps>(
    function MockLink({ href, children, ...rest }, ref) {
      const target = typeof href === "string" ? href : href.pathname;
      return React.createElement("a", { ref, href: target, ...rest }, children);
    },
  );
  return {
    Link,
    redirect: vi.fn(),
    usePathname: vi.fn(() => "/"),
    useRouter: vi.fn(() => ({
      push: vi.fn(),
      replace: vi.fn(),
      back: vi.fn(),
      forward: vi.fn(),
      refresh: vi.fn(),
      prefetch: vi.fn(),
    })),
    getPathname: vi.fn((opts: { href: string }) => opts.href),
  };
});

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

// jsdom doesn't implement Element pointer-capture or scrollIntoView. Radix
// Select / DropdownMenu / Popover / Combobox call these on every open and
// crash with "TypeError: target.hasPointerCapture is not a function" when
// rendered in tests. Stub with no-ops — pointer capture is meaningless in
// jsdom (no real pointer device) and scroll-into-view has no visual effect
// in a non-painting environment. Same shape as widely-recommended Radix
// + Vitest setup snippets.
if (typeof Element !== "undefined") {
  if (!Element.prototype.hasPointerCapture) {
    Object.defineProperty(Element.prototype, "hasPointerCapture", {
      configurable: true,
      writable: true,
      value: () => false,
    });
  }
  if (!Element.prototype.setPointerCapture) {
    Object.defineProperty(Element.prototype, "setPointerCapture", {
      configurable: true,
      writable: true,
      value: () => {},
    });
  }
  if (!Element.prototype.releasePointerCapture) {
    Object.defineProperty(Element.prototype, "releasePointerCapture", {
      configurable: true,
      writable: true,
      value: () => {},
    });
  }
  if (!Element.prototype.scrollIntoView) {
    Object.defineProperty(Element.prototype, "scrollIntoView", {
      configurable: true,
      writable: true,
      value: () => {},
    });
  }
}

afterEach(() => {
  cleanup();
});
