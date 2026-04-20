#!/usr/bin/env tsx
/**
 * Asserts that the `URLPattern` global exists in the current runtime and
 * that a representative matrix of (pattern, path) pairs resolves
 * identically to the reference table below. Run in CI ahead of Playwright
 * so that any divergence between Node, Vitest, and Vercel Edge surfaces
 * before the middleware ships.
 *
 * Reference: ADR-0004, CLAUDE.md §7 (TypeScript Strictness), §18 (Deps).
 */

type Case = Readonly<{
  pattern: string;
  path: string;
  expected: boolean;
  note: string;
}>;

const CASES: readonly Case[] = [
  {
    pattern: "/crew/attendance{/*}?",
    path: "/crew/attendance",
    expected: true,
    note: "exact base path",
  },
  {
    pattern: "/crew/attendance{/*}?",
    path: "/crew/attendance/history",
    expected: true,
    note: "deep child path",
  },
  {
    pattern: "/crew/attendance{/*}?",
    path: "/admin/attendance",
    expected: false,
    note: "different portal",
  },
  {
    pattern: "/admin/iam/:id",
    path: "/admin/iam/123",
    expected: true,
    note: "named segment",
  },
  {
    pattern: "/admin/iam/:id",
    path: "/admin/iam",
    expected: false,
    note: "named segment requires value",
  },
  {
    pattern: "/admin/iam/:id?",
    path: "/admin/iam",
    expected: true,
    note: "optional named segment, absent",
  },
  {
    pattern: "/management/pos{/*}?",
    path: "/management/pos/bom",
    expected: true,
    note: "wildcard child",
  },
  {
    pattern: "/management/pos{/*}?",
    path: "/management/pos",
    expected: true,
    note: "wildcard tolerates zero children",
  },
  {
    pattern: "/management/pos{/*}?",
    path: "/management/other",
    expected: false,
    note: "no false-positive on sibling",
  },
  {
    pattern: "/crew/incidents{/*}?",
    path: "/en/crew/incidents",
    expected: false,
    note: "locale prefix must NOT match — middleware strips it first",
  },
];

function assertURLPatternAvailable(): void {
  if (typeof URLPattern === "undefined") {
    throw new Error(
      "URLPattern is not defined in this runtime. Required for Edge Middleware RBAC (ADR-0004). Minimum Node 23+; Vercel Edge Runtime has it native.",
    );
  }
}

function run(): void {
  assertURLPatternAvailable();
  const failures: string[] = [];
  for (const c of CASES) {
    const compiled = new URLPattern({ pathname: c.pattern });
    const actual = compiled.test(`https://x${c.path}`);
    if (actual !== c.expected) {
      failures.push(
        `  pattern=${c.pattern}  path=${c.path}  expected=${c.expected} actual=${actual}  note=${c.note}`,
      );
    }
  }
  if (failures.length > 0) {
    console.error(
      `verify-urlpattern-runtime: ${failures.length} mismatch(es)\n${failures.join("\n")}`,
    );
    process.exit(1);
  }
  // eslint-disable-next-line no-console -- Build-time script; intentionally uses console.log for human-readable stdout.
  console.log(
    `verify-urlpattern-runtime: ${CASES.length} case(s) matched across Node ${process.version}.`,
  );
}

run();
