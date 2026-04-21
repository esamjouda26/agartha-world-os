# 0007 — Attendance Exception: Clarification-as-Request Workflow

**Status:** Accepted — 2026-04-22
**Decision owner:** Pre-Phase-5 operational refinement
**Overrides:** `operational_workflows.md §WF-5` state machine (binary `unjustified|justified`) and `frontend_spec.md §/management/hr/attendance/queue` scope (all unjustified rows).
**Supersedes-for:** `attendance_exceptions` lifecycle + `/management/hr/attendance/{queue,ledger}` scoping + `/crew/attendance?tab=exceptions` affordances. No other domain is affected.

---

## Context

The original `WF-5` modeled attendance discrepancies as a binary toggle:

```
Staff clocks in/out (or nightly sweep) → INSERT attendance_exceptions (status=unjustified)
HR opens /management/hr/attendance/queue → sees every unjustified row → Justify / Convert to Leave
Staff opens /crew/attendance?tab=exceptions → may add a free-text `staff_clarification`
```

The queue was the "HR inbox" but it surfaced **every** unjustified row — including ones where the staff member was entirely unresponsive, had no context to add, or the exception type didn't warrant explanation (e.g., a clear absence without any prior notice). The result was a noisy HR backlog, a `staff_clarification` field that was edited but never formally "submitted," and no rejection path — HR's only options were "justify" or "convert to leave"; there was no way to push a weak explanation back to the staff member for a better one.

Separately, the spec offered no surface for attaching supporting documents (medical certificates, cab receipts, photos of a broken-down car) to the clarification — staff would explain in text, HR would have no corroboration.

## Decision

### 1. Staff-initiated escalation (four-state workflow)

Expand `exception_status` from `unjustified | justified` to:

```
unjustified → pending_review → justified   (terminal)
                           ↘ → rejected    (semi-terminal — staff may resubmit)
rejected   → pending_review                (resubmission loop)
unjustified → justified                    (unilateral HR approval, from the ledger)
```

Transitions:

| From             | To               | Via                                  | Actor                                 |
| ---------------- | ---------------- | ------------------------------------ | ------------------------------------- |
| `unjustified`    | `pending_review` | `rpc_submit_exception_clarification` | Staff (own row)                       |
| `pending_review` | `justified`      | `rpc_justify_exception`              | HR (`hr:u`)                           |
| `pending_review` | `rejected`       | `rpc_reject_exception_clarification` | HR (`hr:u`)                           |
| `rejected`       | `pending_review` | `rpc_submit_exception_clarification` | Staff (own row)                       |
| `unjustified`    | `justified`      | `rpc_justify_exception`              | HR (`hr:u`) — unilateral, from ledger |

Unilateral HR approval is preserved for the "broad system-outage" case (every staff member was affected; HR justifies them in bulk from the ledger). Unilateral HR **rejection** is deliberately NOT modelled — rejection only makes sense as a response to a submission.

### 2. Surface split: queue vs ledger

| Surface                            | Scope                                                                    | Purpose                                                                                                                              |
| ---------------------------------- | ------------------------------------------------------------------------ | ------------------------------------------------------------------------------------------------------------------------------------ |
| `/management/hr/attendance/queue`  | `WHERE status = 'pending_review'`                                        | HR's action-required inbox. Every row carries a staff-submitted note + attachments.                                                  |
| `/management/hr/attendance/ledger` | `v_shift_attendance` — every shift, every exception regardless of status | HR's "see everything" view. Row actions: unilateral approval for `unjustified`, convert-to-leave for `unjustified`/`pending_review`. |
| `/crew/attendance?tab=exceptions`  | Staff's own exceptions — every status                                    | Status-aware affordances: submit editor on `unjustified` + `rejected`; read-only summary on `pending_review` + `justified`.          |

### 3. Note-exchange via existing columns (no messages table)

Per user decision 2026-04-21, we intentionally do NOT introduce a threaded-messages table. Two free-text columns on `attendance_exceptions` carry the conversation:

| Column                | Written by                                       | Semantics                                                                                                    |
| --------------------- | ------------------------------------------------ | ------------------------------------------------------------------------------------------------------------ |
| `staff_clarification` | Staff (via `rpc_submit_exception_clarification`) | Latest staff note. Overwritten on resubmission.                                                              |
| `hr_note`             | HR (via justify or reject RPC)                   | Latest HR decision note. For `justified`, it's the justification. For `rejected`, it's the rejection reason. |

The `status` column disambiguates whether `hr_note` is an approval or a rejection — no separate columns needed. Only the latest round-trip is preserved; earlier messages are overwritten. Accept this trade-off for v1 simplicity.

Column consolidation (this ADR renames):

```
justified_by         → reviewed_by
justified_at         → reviewed_at
justification_reason → hr_note
```

### 4. Attachments — append-only, signed-URL access

Supporting documents are stored in a new `attendance-clarifications` Storage bucket:

- **Private**, 10 MB cap, MIME allowlist: `image/jpeg`, `image/png`, `image/webp`, `image/heic`, `application/pdf`.
- **Path convention:** `{staff_record_id}/{exception_id}/{uuid}.{ext}` — storage RLS pins the first path segment to the caller's own staff_record_id.
- **Read via signed URL** (TTL ≤ 15 min), never public. Owner or `hr:r` only.
- **No UPDATE / DELETE policies** — "save without deletion" per user decision 2026-04-21. Retention per CLAUDE.md §15 (employment duration + 7 years).

Each upload is linked to the exception in a companion table:

```
attendance_clarification_attachments (
  id, exception_id FK, file_path, file_name, mime_type, file_size_bytes,
  created_by FK, created_at
)
```

Also append-only (no UPDATE / DELETE RLS policies).

### 5. RPC surface

| RPC                                                                          | Actor | Role                                                                                                                                                                              |
| ---------------------------------------------------------------------------- | ----- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------- |
| `rpc_submit_exception_clarification(exception_id, text, attachment_paths[])` | Staff | Atomically: write `staff_clarification`, stamp `clarification_submitted_at`, transition to `pending_review`, clear prior reviewer fields, idempotently link uploaded attachments. |
| `rpc_reject_exception_clarification(exception_id, reason)`                   | HR    | Transition `pending_review → rejected`, store reason in `hr_note`.                                                                                                                |
| `rpc_justify_exception(exception_id, reason)`                                | HR    | Transition `unjustified                                                                                                                                                           | pending_review → justified`, store reason in `hr_note`. Mirrors the reject RPC for audit symmetry. |
| `rpc_convert_exception_to_leave(exception_id, leave_type_id, days, note)`    | HR    | Widened to accept `pending_review` source (previously `unjustified` only). Atomic: approved leave request + ledger debit + exception justified.                                   |

`rpc_add_exception_clarification` (pre-ADR-0007) is dropped.

## Consequences

- **Queue narrowed.** HR's inbox no longer drowns in `unjustified` rows; only staff-initiated submissions appear. The ledger is the surface for the long tail.
- **Rejection loop enables back-and-forth without a messages table.** Staff read HR's rejection note in `hr_note`, revise `staff_clarification`, resubmit — transitions back to `pending_review`.
- **Attachments are permanent.** PDPA retention aligns with attendance records. Signed URLs enforce read-access RLS; public buckets remain forbidden.
- **Thread history is NOT preserved.** Only the latest staff note + latest HR note persist. If detailed history is ever required, introduce `attendance_exception_messages` in a future ADR — out of scope for v1.
- **Unilateral HR approval path preserved** for legitimate operational cases (system outages, approved bulk exceptions). Invoked from the ledger, not the queue.
- **Cron-driven absent detection unchanged.** Nightly sweep at 00:05 still inserts `unjustified` rows for no-show cases; staff either submits a clarification (→ `pending_review`) or HR converts to leave from the ledger.

## Compliance

- **Schema migration:** [`20260422120000_attendance_clarification_workflow.sql`](../../supabase/migrations/20260422120000_attendance_clarification_workflow.sql)
- **Tag builder + router path list:** [`src/features/attendance/cache-tags.ts`](../../src/features/attendance/cache-tags.ts) — `ATTENDANCE_ROUTER_PATHS` now includes `/management/hr/attendance/{queue,ledger}` so HR actions bust them (route shells land in Phase 7).
- **Cache model:** inherits ADR-0006 — RLS-scoped reads via React `cache()`, invalidation via surgical `revalidatePath(path, "page")`. No `revalidateTag`, no `unstable_cache`.
- **Enforcement tests:** [`src/features/attendance/__tests__/cache-invalidation.test.ts`](../../src/features/attendance/__tests__/cache-invalidation.test.ts) covers submit + reject + justify contract.

## Out of scope (intentional)

- Multi-round message history (future ADR if needed).
- Notifications when HR decides — staff polls the tab.
- Rejection cap — unlimited resubmissions for v1.
- HR-side attachment upload — only staff uploads today.
- Auto-expiry of stale pending reviews.

## References

- [`supabase/migrations/20260422120000_attendance_clarification_workflow.sql`](../../supabase/migrations/20260422120000_attendance_clarification_workflow.sql)
- [`src/features/attendance/actions/submit-clarification.ts`](../../src/features/attendance/actions/submit-clarification.ts)
- [`src/features/attendance/actions/reject-clarification.ts`](../../src/features/attendance/actions/reject-clarification.ts)
- [`src/features/attendance/actions/justify-exception.ts`](../../src/features/attendance/actions/justify-exception.ts)
- [`src/features/attendance/utils/upload-clarification-attachment.ts`](../../src/features/attendance/utils/upload-clarification-attachment.ts)
- ADR-0006 — cache model (unchanged)
- WF-5 in `operational_workflows.md` (rewritten as part of this ADR landing)
