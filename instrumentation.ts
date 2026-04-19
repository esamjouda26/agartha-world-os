/**
 * Next.js `instrumentation.ts` — runs once on server boot.
 * Logs a "boot OK" line per Phase 3 observability deliverable.
 *
 * Sentry server-side init is gated on `SENTRY_DSN`; absent DSN → a log
 * line only (keeps dev + CI green without a paid project).
 */
export async function register(): Promise<void> {
  if (process.env.NEXT_RUNTIME === "nodejs") {
    const { initSentry } = await import("@/lib/telemetry");
    await initSentry();
    // `console.info` is the intentional server-boot signal; logger is not
    // wired at this point in the lifecycle. The production-log scrub grep
    // only rejects `console.log`, so this stays compliant.
    console.info("[boot] AgarthaOS server instrumentation ready.");
  }
}
