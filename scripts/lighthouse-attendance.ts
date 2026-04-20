/**
 * Authenticated Lighthouse run for `/en/crew/attendance`.
 *
 * Phase 4 follow-up fix #13. Logs in as fnb_crew via the Supabase SSR
 * auth flow (email + password), extracts the resulting session cookies,
 * and invokes Lighthouse with those cookies as request headers. Asserts:
 *
 *   - performance score >= 90   (CLAUDE.md §14)
 *   - accessibility score >= 95 (CLAUDE.md §19)
 *
 * Usage:
 *   pnpm build && pnpm start          # in one terminal
 *   pnpm exec tsx scripts/lighthouse-attendance.ts   # in another
 *
 * Exits 0 on pass, 1 on fail — CI-ready.
 */

import { createClient } from "@supabase/supabase-js";
import { spawn } from "node:child_process";
import { mkdirSync, writeFileSync } from "node:fs";
import { join } from "node:path";

const TARGET_URL = process.env.LIGHTHOUSE_TARGET ?? "http://localhost:3000/en/crew/attendance";
const LOGIN_EMAIL = process.env.LIGHTHOUSE_USER ?? "fnb_crew@agartha.test";
const LOGIN_PASSWORD = process.env.LIGHTHOUSE_PASSWORD ?? "Password1!";
const PERF_MIN = Number(process.env.LIGHTHOUSE_PERF_MIN ?? 90);
const A11Y_MIN = Number(process.env.LIGHTHOUSE_A11Y_MIN ?? 95);

type SessionCookies = Readonly<{
  accessToken: string;
  refreshToken: string;
}>;

async function loginAndExtractCookies(): Promise<SessionCookies> {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!url || !anonKey) {
    throw new Error(
      "lighthouse-attendance: NEXT_PUBLIC_SUPABASE_URL + NEXT_PUBLIC_SUPABASE_ANON_KEY required",
    );
  }
  const supabase = createClient(url, anonKey, {
    auth: { autoRefreshToken: false, persistSession: false },
  });
  const { data, error } = await supabase.auth.signInWithPassword({
    email: LOGIN_EMAIL,
    password: LOGIN_PASSWORD,
  });
  if (error || !data.session) {
    throw new Error(`lighthouse-attendance: login failed — ${error?.message ?? "no session"}`);
  }
  return {
    accessToken: data.session.access_token,
    refreshToken: data.session.refresh_token,
  };
}

function runLighthouse(
  targetUrl: string,
  cookies: SessionCookies,
  reportPath: string,
): Promise<{ performance: number; accessibility: number }> {
  return new Promise((resolve, reject) => {
    const extraHeaders = JSON.stringify({
      // The Supabase SSR cookie naming convention. Match how
      // src/lib/supabase/server.ts reads cookies.
      Cookie: `sb-access-token=${cookies.accessToken}; sb-refresh-token=${cookies.refreshToken}`,
    });

    const args = [
      targetUrl,
      "--only-categories=performance,accessibility",
      "--chrome-flags=--headless=new --no-sandbox",
      "--output=json",
      `--output-path=${reportPath}`,
      `--extra-headers=${extraHeaders}`,
      "--quiet",
    ];

    const proc = spawn("pnpm", ["dlx", "lighthouse@12", ...args], { shell: true });
    let stderr = "";
    proc.stderr.on("data", (chunk) => {
      stderr += String(chunk);
    });
    proc.on("close", (code) => {
      if (code !== 0) {
        reject(new Error(`lighthouse exited ${code}\n${stderr}`));
        return;
      }
      try {
        // eslint-disable-next-line @typescript-eslint/no-require-imports
        const report = require(reportPath) as {
          categories: {
            performance: { score: number };
            accessibility: { score: number };
          };
        };
        resolve({
          performance: Math.round(report.categories.performance.score * 100),
          accessibility: Math.round(report.categories.accessibility.score * 100),
        });
      } catch (err) {
        reject(err instanceof Error ? err : new Error(String(err)));
      }
    });
  });
}

async function main(): Promise<void> {
  const cookies = await loginAndExtractCookies();
  const outDir = join(process.cwd(), ".lighthouse");
  mkdirSync(outDir, { recursive: true });
  const reportPath = join(outDir, "crew-attendance.json");

  const { performance, accessibility } = await runLighthouse(TARGET_URL, cookies, reportPath);

  const summary = {
    url: TARGET_URL,
    performance,
    accessibility,
    thresholds: { perf: PERF_MIN, a11y: A11Y_MIN },
  };
  writeFileSync(join(outDir, "crew-attendance-summary.json"), JSON.stringify(summary, null, 2));

  console.info(`lighthouse /crew/attendance — perf=${performance} a11y=${accessibility}`);

  if (performance < PERF_MIN || accessibility < A11Y_MIN) {
    console.error(
      `FAIL — thresholds perf>=${PERF_MIN} a11y>=${A11Y_MIN}; got perf=${performance} a11y=${accessibility}`,
    );
    process.exit(1);
  }
  console.info("PASS");
}

main().catch((err) => {
  console.error(err instanceof Error ? (err.stack ?? err.message) : err);
  process.exit(1);
});
