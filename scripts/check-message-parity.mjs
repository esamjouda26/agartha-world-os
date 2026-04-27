/**
 * Phase F verify — assert structural key parity between
 * `messages/en.json` and `messages/ms.json` for the `guest.*` namespace.
 *
 * Runs as part of CI (or manually) to catch drift: if a developer adds a
 * key to en.json but forgets to add it (or its translation) to ms.json,
 * the missing call would render the raw key string at runtime. We
 * surface that drift here.
 *
 * Exits 0 on parity, 1 on drift, with a list of missing/extra keys.
 */

import { readFileSync } from "node:fs";
import { resolve } from "node:path";

const EN = JSON.parse(readFileSync(resolve(process.cwd(), "messages/en.json"), "utf8"));
const MS = JSON.parse(readFileSync(resolve(process.cwd(), "messages/ms.json"), "utf8"));

function flatten(obj, prefix = "") {
  const keys = [];
  for (const [k, v] of Object.entries(obj)) {
    const path = prefix ? `${prefix}.${k}` : k;
    if (v !== null && typeof v === "object" && !Array.isArray(v)) {
      keys.push(...flatten(v, path));
    } else {
      keys.push(path);
    }
  }
  return keys;
}

const enKeys = new Set(flatten(EN.guest));
const msKeys = new Set(flatten(MS.guest));

const missingInMs = [...enKeys].filter((k) => !msKeys.has(k));
const extraInMs = [...msKeys].filter((k) => !enKeys.has(k));

if (missingInMs.length === 0 && extraInMs.length === 0) {
  process.stdout.write(
    `✓ guest.* parity OK — ${enKeys.size} keys mirrored between en and ms.\n`,
  );
  process.exit(0);
}

process.stderr.write("✗ guest.* parity check FAILED\n");
if (missingInMs.length > 0) {
  process.stderr.write(`\nMissing in ms.json (${missingInMs.length}):\n`);
  for (const k of missingInMs) process.stderr.write(`  - ${k}\n`);
}
if (extraInMs.length > 0) {
  process.stderr.write(`\nExtra in ms.json (${extraInMs.length}):\n`);
  for (const k of extraInMs) process.stderr.write(`  - ${k}\n`);
}
process.exit(1);
