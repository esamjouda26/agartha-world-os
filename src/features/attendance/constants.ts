/**
 * Attendance feature constants — prompt.md "Mandatory Patterns / No magic
 * numbers" + Phase 4 scope. Every literal used in conditional logic lives
 * here so code review surfaces threshold changes explicitly.
 */

/**
 * Cache tag taxonomy for attendance moved to
 * `@/features/attendance/cache-tags.ts` alongside the Router Cache path
 * list. Import `ATTENDANCE_ROUTER_PATHS` for Server-Action invalidation.
 */

/**
 * Staleness: shift data is tied to clock window cutoffs, so we keep it
 * short-lived but not live. React Query default (0s) would thrash on every
 * route transition; 30s matches the shortest clock-in/out action budget.
 */
export const SHIFT_STALE_MS = 30_000;

/** Exceptions & stats refresh less aggressively — HR triage is not real-time. */
export const EXCEPTION_STALE_MS = 60_000;
export const STATS_STALE_MS = 5 * 60_000;

/** Selfie capture — 5 MB cap matches the `attendance` Storage bucket. */
export const SELFIE_MAX_BYTES = 5 * 1024 * 1024;
export const SELFIE_MIME = "image/webp" as const;
export const SELFIE_QUALITY = 0.8;

/** Target capture resolution: 640×480 is enough for operator verification. */
export const SELFIE_CAPTURE_WIDTH = 640;
export const SELFIE_CAPTURE_HEIGHT = 480;

/** Per-user clock-in/out rate limit — frontend_spec.md §2 "20/min/user". */
export const CLOCK_RATE_LIMIT_TOKENS = 20;
export const CLOCK_RATE_LIMIT_WINDOW = "1 m" as const;

/** Clarification RPC rate limit — gentler, 10 per minute is generous for a UI flow. */
export const CLARIFICATION_RATE_LIMIT_TOKENS = 10;
export const CLARIFICATION_RATE_LIMIT_WINDOW = "1 m" as const;

/** Clarification max length — schema-level ceiling to keep the UI honest. */
export const CLARIFICATION_MAX_LEN = 500;

/** Banner/tab count threshold — anything ≥ 1 unjustified exception triggers the banner. */
export const UNJUSTIFIED_BANNER_THRESHOLD = 1;

/** Storage bucket — [init_schema.sql:7036](supabase/migrations/20260417064731_init_schema.sql#L7036). */
export const ATTENDANCE_BUCKET = "attendance" as const;
