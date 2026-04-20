#!/usr/bin/env tsx
/**
 * CI gate: every staff `page.tsx` under `src/app/[locale]/(admin|management|crew)/**`
 * is either matched by a `rbac.ts` URLPattern OR listed in
 * `SHARED_BYPASS_PREFIXES`. A route with a `page.tsx` but no Gate-5
 * coverage is an orphan — middleware would let any authenticated staff
 * user in.
 *
 * Reference: ADR-0004.
 */

import { readdirSync, statSync } from "node:fs";
import { join, relative, resolve } from "node:path";

import { MIDDLEWARE_ROUTES, SHARED_BYPASS_PREFIXES } from "../src/lib/rbac/middleware-manifest";

const REPO_ROOT = resolve(__dirname, "..");
const ROOT_SEGMENTS = ["(admin)", "(management)", "(crew)"] as const;

function walk(dir: string, acc: string[] = []): string[] {
  for (const entry of readdirSync(dir)) {
    const full = join(dir, entry);
    const s = statSync(full);
    if (s.isDirectory()) walk(full, acc);
    else if (entry === "page.tsx") acc.push(full);
  }
  return acc;
}

/**
 * Convert an app-router page file path into the runtime URL path the
 * middleware sees. Strips `src/app/[locale]/(group)/` prefix and the
 * trailing `page.tsx`. Dynamic segments `[id]` become `:id` so they can
 * be tested against URLPattern. Route groups `(x)` are removed.
 */
function pageToUrlPath(abs: string): string {
  const rel = relative(resolve(REPO_ROOT, "src/app/[locale]"), abs)
    .replace(/\\/g, "/")
    .replace(/\/page\.tsx$/, "");
  // Drop route groups: segments starting with `(` and ending with `)`.
  const parts = rel.split("/").filter((s) => !(s.startsWith("(") && s.endsWith(")")));
  // Convert [id] → :id
  const normalized = parts.map((p) => p.replace(/^\[(.+)\]$/, ":$1")).join("/");
  return "/" + normalized;
}

function isBypassed(path: string): boolean {
  return SHARED_BYPASS_PREFIXES.some((prefix) => path === prefix || path.startsWith(`${prefix}/`));
}

function isGated(path: string): boolean {
  const testUrl = `https://x${path.replace(/:\w+/g, "placeholder")}`;
  return MIDDLEWARE_ROUTES.some((compiled) => compiled.pattern.test(testUrl));
}

function main(): void {
  const orphans: string[] = [];
  for (const segment of ROOT_SEGMENTS) {
    const root = resolve(REPO_ROOT, "src/app/[locale]", segment);
    try {
      statSync(root);
    } catch {
      continue;
    }
    for (const file of walk(root)) {
      const urlPath = pageToUrlPath(file);
      // Skip synthetic paths that are portal-group roots or the bare
      // "/management" landing (handled by its own page.tsx + redirect).
      if (
        urlPath === "/" ||
        urlPath === "/admin" ||
        urlPath === "/management" ||
        urlPath === "/crew"
      ) {
        continue;
      }
      if (isBypassed(urlPath) || isGated(urlPath)) continue;
      orphans.push(`${urlPath}  (from ${relative(REPO_ROOT, file)})`);
    }
  }
  if (orphans.length === 0) {
    // eslint-disable-next-line no-console -- CI script.
    console.log("rbac-orphan-routes: OK — every staff page.tsx is Gate-5 covered.");
    return;
  }
  console.error("rbac-orphan-routes: FAIL — pages without Gate-5 coverage:");
  for (const orphan of orphans) console.error(`  ${orphan}`);
  console.error(
    "\nFix: add a URL pattern to the feature's rbac.ts OR add the prefix to SHARED_BYPASS_PREFIXES in src/lib/rbac/middleware-manifest.ts.",
  );
  process.exit(1);
}

main();
