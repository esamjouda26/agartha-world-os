/**
 * Minimal ambient `URLPattern` typing. The runtime is native in Node 23+,
 * Vercel Edge Runtime, and modern browsers, but `lib.dom.d.ts` does not
 * universally export it depending on TypeScript version / @types/node
 * combination. Scoped declaration keeps the surface small and centralized.
 *
 * Only the subset of the spec we actually use is declared. If a future
 * caller needs more, add it here rather than using `any`.
 */

declare class URLPattern {
  constructor(init?: string | URLPatternInit, baseURL?: string);
  test(input?: string | URLPatternInit, baseURL?: string): boolean;
  exec(input?: string | URLPatternInit, baseURL?: string): URLPatternResult | null;
  readonly protocol: string;
  readonly username: string;
  readonly password: string;
  readonly hostname: string;
  readonly port: string;
  readonly pathname: string;
  readonly search: string;
  readonly hash: string;
}

interface URLPatternInit {
  protocol?: string;
  username?: string;
  password?: string;
  hostname?: string;
  port?: string;
  pathname?: string;
  search?: string;
  hash?: string;
  baseURL?: string;
}

interface URLPatternComponentResult {
  input: string;
  groups: Record<string, string | undefined>;
}

interface URLPatternResult {
  inputs: [string | URLPatternInit];
  protocol: URLPatternComponentResult;
  username: URLPatternComponentResult;
  password: URLPatternComponentResult;
  hostname: URLPatternComponentResult;
  port: URLPatternComponentResult;
  pathname: URLPatternComponentResult;
  search: URLPatternComponentResult;
  hash: URLPatternComponentResult;
}
