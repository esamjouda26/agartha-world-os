# 0006 — Cache Model: `cache()` for RLS Reads + Surgical `revalidatePath`

**Status:** Accepted — 2026-04-21
**Decision owner:** Pre-Phase-5 standardization sweep
**Overrides:** `frontend_spec.md §"Cache invalidation taxonomy"` (the `revalidateTag`-preferred wording) for RLS-scoped per-user reads specifically. Org-wide reads (future POS catalog, location directory, role manifest) remain eligible for `unstable_cache` + tags per the original spec.

---

## Context

Next.js App Router exposes four distinct cache layers:

1. **Request memoization** — React's `cache(fn)`. Dedupes calls within a single render. Lives for one request only. Not tag-invalidatable.
2. **Data Cache** — `unstable_cache(fn, keys, {tags})` and tagged `fetch`. Persistent across requests. Invalidated via `revalidateTag`.
3. **Full Route Cache** — SSG/ISR output. Invalidated via `revalidateTag` when backed by Data Cache, or via `revalidatePath`.
4. **Router Cache** — client-side RSC payload cache. Invalidated via `revalidatePath(path, scope)`.

The original implementation mixed these incorrectly:

- Queries wrapped in `cache()` only (layer 1).
- Server Actions called `updateTag('hr:attendance')` (layer 2) — a **no-op** because no `unstable_cache` existed to tag.
- Server Actions then called `revalidatePath("/", "layout")` (layer 4) — the nuclear option, purging every route's Router Cache on every mutation.

The result was tag ceremony that did nothing plus a layout-wide cache bust that hurt sibling-route performance on every clock-in.

## The real constraint: RLS + `unstable_cache` are incompatible

Moving RLS-scoped queries into `unstable_cache` to make the tags functional is the obvious "fix." It does not work:

- `unstable_cache`'s work function runs **detached from the request context** during cache misses and background revalidation. `cookies()` is not available inside it.
- Without cookies, `createSupabaseServerClient()` cannot mint an authenticated session — it would have to use the service-role client.
- The service-role client **bypasses RLS**, shifting the security boundary from Postgres (where CLAUDE.md §2 "Zero-Trust RLS" places it) to application code.
- Re-implementing every RLS policy as explicit WHERE clauses in the cached fetcher is a massive attack surface we refuse to maintain.

Enterprise apps solve this two ways:

- **Cal.com / Dub / Supabase official Next.js template**: keep RLS-scoped reads out of `unstable_cache`. Use `cache()` for per-request dedup + `revalidatePath` for cross-request Router-Cache invalidation.
- **Certain Supabase-heavy apps**: move to service-role + manual auth gates at the cache boundary. More complex, sacrifices the RLS-first principle.

We adopt the first pattern.

## Decision

### Reads

- **RLS-scoped reads** (everything currently in `src/features/*/queries/`) wrap with React `cache()` only. One fetch per request tree, fresh on every request.
- **Org-wide reads that are safe to run without user context** — POS catalog, role directory, location list — MAY wrap with `unstable_cache` + tags. Not in scope today; pattern will emerge in Phase 7.

### Writes

- Server Actions invalidate via `revalidatePath(path, "page")` targeted to the specific routes that consume the mutated data.
- The list of paths per domain lives in a dedicated module (e.g. `src/features/attendance/cache-tags.ts#ATTENDANCE_ROUTER_PATHS`). Paths use Next's dynamic-segment syntax (`/[locale]/crew/attendance`), so a single call covers every locale.
- `revalidatePath(..., "layout")` is reserved for structural route-tree changes, never data. `revalidatePath("/", "layout")` is forbidden in application code.

### Tags

- `cache-tags.ts` exports both the Router Cache path list AND per-user tag builders (`hrAttendanceUserTag`, `hrAttendanceDayTag`, etc.).
- The tag builders are **reserved**, not used. They exist so Phase 7+ org-wide reads can opt into `unstable_cache` + tags with a consistent shape, without re-inventing the taxonomy.

### Client-side

- Interactive surfaces (data tables, real-time feeds) use `@tanstack/react-query` with explicit `staleTime`/`gcTime` per query. RSCs prefetch + `<HydrationBoundary>` the initial state.
- `react-query` invalidation is independent of server-side cache — `queryClient.invalidateQueries({ queryKey })` triggers client refetch; server-side `revalidatePath` triggers RSC re-render on navigation. Both may fire after one mutation.

## Consequences

- **Write amplification**: every attendance mutation busts Router Cache for every route in `ATTENDANCE_ROUTER_PATHS`. Acceptable — the list is bounded and scoped to attendance-consuming routes only.
- **No cross-user cache sharing**: RLS-scoped reads never share bytes across users (each request re-runs the fetcher). For attendance that is correct — one user's clock-in must not surface in another's Today view due to stale cache.
- **Future phases**: when POS catalog and similar org-wide reads land, introduce `unstable_cache` + per-entity tags at that point, with the existing tag builders.
- **Documentation**: every query module's header MUST reference this ADR. Any change of model — migrating a query to `unstable_cache` — requires a new ADR.

## Compliance

- `src/features/attendance/queries/*.ts` — `cache()` only ✓
- `src/features/attendance/actions/*.ts` — `revalidatePath(path, "page")` with paths from `ATTENDANCE_ROUTER_PATHS`, no `updateTag`, no layout-wide purge ✓
- `src/features/attendance/cache-tags.ts` — documents the model + hosts path list + reserved tag builders ✓
- ESLint — `no-restricted-imports` patterns block `revalidateTag`/`updateTag` usage outside a dedicated allowlist when Phase 7 introduces org-wide reads. Not enforced today (no violations to guard against).

## References

- [`src/features/attendance/queries/get-today-shift.ts`](../../src/features/attendance/queries/get-today-shift.ts)
- [`src/features/attendance/cache-tags.ts`](../../src/features/attendance/cache-tags.ts)
- [`src/features/attendance/actions/clock-in.ts`](../../src/features/attendance/actions/clock-in.ts)
- Next.js App Router caching: https://nextjs.org/docs/app/building-your-application/caching
- Supabase SSR + Next.js template: https://github.com/supabase/supabase/tree/master/examples/auth/nextjs
