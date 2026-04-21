# AgarthaOS — Operational Workflows

> **Purpose:** This file documents every cross-role business process in the system. Each workflow defines WHO initiates, WHO approves, WHAT tables are involved, and WHAT triggers fire. The role audit sessions reference these workflows instead of re-deriving them.
>
> **Authorization model:** All RLS policies use domain-based CRUD checks (`(jwt->'app_metadata'->'domains'->'{domain}') ? '{action}'`). Zero hardcoded role strings. `access_level` exists only for frontend portal routing.

---

## WF-0: Staff Authentication & Portal Routing

**Actors:** All staff (login), Frontend middleware (routing), JWT (authorization carrier)

### Staff Login

```
Staff navigates to /auth/login
    │
    └── supabase.auth.signInWithPassword({ email, password })
            │
            ├── Supabase Auth rejects (banned_until set):
            │     Staff with employment_status = 'suspended' or 'terminated'
            │     → auth.users.banned_until blocks login at the Supabase Auth layer
            │     → Client receives auth error → show "Account locked" message
            │
            └── Supabase Auth succeeds → JWT issued with app_metadata:
                  { access_level, staff_role, org_unit_path, domains, last_permission_update }
                    │
                    ├── password_set = FALSE (first login after invite):
                    │     → Redirect to /auth/set-password
                    │     → Staff sets own password → rpc_confirm_password_set() → password_set = TRUE
                    │     → Redirect to portal
                    │
                    ├── employment_status = 'pending' (contract_start in future):
                    │     → Redirect to /auth/not-started
                    │     → cron-employment-sync will auto-activate on contract_start
                    │
                    └── Normal login:
                          → Read access_level from JWT → redirect to portal:
                            'admin'   → /admin
                                         (middleware-only endpoint; edge-level redirects:
                                          has it:c → /admin/it (System Dashboard);
                                          has booking:r + reports:r without it:c → /admin/business (Executive Dashboard);
                                          has both → /admin/it (IT priority);
                                          has neither → /auth/access-revoked)
                            'manager' → /management/*
                            'crew'    → /crew/*
```

### Session Freshness & JWT Refresh

```
On every authenticated request:
    RLS policies call is_claims_fresh():
      Compares JWT's last_permission_update against profiles.last_permission_update
        │
        ├── Fresh (JWT timestamp >= DB timestamp):
        │     → Request proceeds normally
        │
        └── Stale (JWT timestamp < DB timestamp):
              → Security-sensitive RPCs check at the top of the function:
                  IF NOT public.is_claims_fresh() THEN RAISE EXCEPTION 'STALE_JWT'; END IF;
                Server Actions catch this and return the discriminated-union error
                  { success: false, error: 'STALE_JWT' }.
              → Empty result sets are NOT treated as a staleness signal — empty is a legitimate,
                common state and MUST NOT trigger a session refresh. React Query `onError` never
                auto-refreshes on generic errors or empty data.
              → A single global Server Action response interceptor matches error = 'STALE_JWT' only:
                  calls supabase.auth.refreshSession() → retries the original action once →
                  on success, invalidates the relevant revalidateTag keys and toasts
                  "Your permissions were updated. Refreshing session..." →
                  on retry failure, redirects /auth/access-revoked.

Staleness is triggered by:
    - profiles.role_id change (handle_profile_role_change stamps last_permission_update)
    - role_domain_permissions change (trg_role_domain_permissions_changed stamps last_permission_update)
    - profiles.staff_record_id change (org_unit_path update)
```

### Middleware & Portal Routing

```
Frontend middleware runs on every navigation:
    │
    ├── No JWT (unauthenticated):
    │     → Redirect to /auth/login
    │
    ├── Valid JWT, wrong portal (e.g., crew accessing /admin/*):
    │     → Read access_level from JWT
    │     → Redirect to correct portal root based on access_level
    │
    └── Valid JWT, correct portal:
          → Allow navigation
          → Sidebar and page content filtered by domains (see below)
```

### Domain-Based UI Gating

```
Frontend reads jwt.app_metadata.domains to control visibility:

Portal layout (access_level):
    Determines WHICH portal shell renders (admin, management, or crew)
    This is coarse-grained: 3 layouts total

Feature visibility (domains):
    Determines WHAT appears within the portal
    Sidebar items: shown only if the user has the relevant domain with 'r' permission
    Action buttons (create, edit, delete): shown only if the user has 'c', 'u', 'd' respectively
    Page sections: conditionally rendered based on domain presence

    Examples:
      - Manager with comms:cru → sees "Announcements" sidebar item + "Create" button
      - Manager without comms domain → sidebar item hidden entirely
      - Crew with pos:cru → sees POS terminal + order management
      - Crew with only hr:cr → sees own leave/schedule but no POS access

    NOTE: UI gating is UX only — all security is enforced by RLS + RPC domain checks.
    Hiding a button without backend enforcement is a visual hint, not a security boundary.
```

### Tables

| Table        | Role                     | Operation                                     |
| ------------ | ------------------------ | --------------------------------------------- |
| `auth.users` | Supabase Auth            | SELECT (login validation, banned_until check) |
| `profiles`   | is_claims_fresh()        | SELECT (last_permission_update comparison)    |
| `profiles`   | rpc_confirm_password_set | UPDATE (password_set → TRUE)                  |

---

## WF-1: Staff Provisioning (New Hire)

**Initiator:** `human_resources_manager`
**Approver:** `it_admin`
**Consumer:** New staff member

### State Machine

```
HR creates staff_records (legal_name, org_unit_id, contract_start, personal_email, etc.)
    │
    └── Trigger trg_auto_create_iam_request fires:
          INSERT iam_requests (type: provisioning, staff_record_id, status: pending_it, created_by: HR)
              │
              └── IT Admin reviews pending provisioning request
                    Visible data: staff legal name, org unit, target role, contract start
                    Business email auto-generated: first.last@domain.com (numeric suffix if duplicate)
                    IT admin can override the generated business email before decision
                        │
                        ├── Approve:
                        │     1. iam_requests.status → approved, approved_by = IT admin, approved_at = NOW()
                        │     2. Server Action creates auth.users (email = business email, NO password)
                        │     3. Trigger on_auth_user_created → creates profiles (email, role_id, employee_id, display_name "first last")
                        │     4. Server Action calls auth.admin.generateLink(type: invite)
                        │     5. Edge Function send-email (type: staff_invite) → personal_email
                        │          Contains: business email + one-time invite link (48h expiry)
                        │     6. iam_requests.invite_sent_at = NOW()
                        │
                        │     Staff clicks invite → set-password flow → creates own password
                        │     rpc_confirm_password_set() → password_set = TRUE
                        │     employment_status = if contract_start > TODAY pending → middleware → /auth/not-started, else active
                        │     cron-employment-sync on contract_start → employment_status = active
                        │
                        └── Reject:
                              iam_requests.status → rejected, it_remark, approved_by = IT admin
```

### Tables

| Table           | Role          | Operation                                                 |
| --------------- | ------------- | --------------------------------------------------------- |
| `staff_records` | HR            | INSERT                                                    |
| `iam_requests`  | Trigger       | INSERT (auto, type=provisioning, status=pending_it)       |
| `iam_requests`  | IT            | UPDATE (status→approved/rejected, approved_by, it_remark) |
| `auth.users`    | Server Action | INSERT (on approval, business email, no password)         |
| `profiles`      | Trigger       | INSERT (on_auth_user_created)                             |
| `profiles`      | IT            | UPDATE (role_id assignment)                               |

### Columns (SoD proof)

- `iam_requests.created_by` = HR manager's `auth.uid()` (auto-set by trigger from HR's session)
- `iam_requests.approved_by` = IT admin's `auth.uid()`
- These MUST be different users — enforced by domain-gated CRUD separation in RLS (hr:c for create, hr:u for IT approval).

---

## WF-2: Staff Transfer (Role Change)

**Initiator:** `human_resources_manager`
**Approver:** `it_admin`
**Affected:** Existing staff member

### State Machine

```
HR creates iam_requests manually (type: transfer)
    No auto-trigger — transfers are discretionary HR decisions
    Sets: staff_record_id, current_role_id (snapshot), target_role_id, hr_remark
    status: pending_it
        │
        └── IT Admin reviews pending transfer request
              Visible data: staff name, current role → target role, org unit, HR remark
                │
                ├── Approve:
                │     1. iam_requests.status → approved, approved_by = IT admin, approved_at = NOW()
                │     2. IT updates profiles.role_id → target_role_id
                │     3. Trigger handle_profile_role_change fires:
                │          - Resolves staff_role, access_level, org_unit_path, AND full domains JSONB
                │            from role_domain_permissions
                │          - Injects ALL into auth.users.raw_app_meta_data
                │          - Stamps last_permission_update = NOW()
                │          - is_claims_fresh() invalidates user's current JWT
                │     4. On next request, security-sensitive RPCs raise STALE_JWT (see WF-0 Session Freshness).
                │          → Server Actions return { success: false, error: 'STALE_JWT' }.
                │          → Global interceptor calls refreshSession() → retries once.
                │          → New JWT with updated domains → middleware routes to correct portal.
                │          (Empty result sets never trigger refresh — only the STALE_JWT discriminator does.)
                │
                └── Reject:
                      iam_requests.status → rejected, it_remark, approved_by = IT admin
```

### Tables

| Table          | Role | Operation                                                        |
| -------------- | ---- | ---------------------------------------------------------------- |
| `iam_requests` | HR   | INSERT (type=transfer, current_role_id snapshot, target_role_id) |
| `iam_requests` | IT   | UPDATE (status→approved/rejected, approved_by, it_remark)        |
| `profiles`     | IT   | UPDATE (role_id → target_role_id)                                |

### Data Continuity

- Existing `shift_schedules`, `timecard_punches`, `leave_requests`, `leave_ledger` carry over — all tied to `staff_record_id`, not role
- `current_role_id` snapshot on iam_requests preserves audit trail of what the role WAS

### Columns (SoD proof)

- `iam_requests.created_by` = HR manager's `auth.uid()`
- `iam_requests.approved_by` = IT admin's `auth.uid()`
- These MUST be different users — enforced by domain-gated CRUD separation in RLS.

---

## WF-3: Staff Termination, Suspension & Reactivation

**Initiator:** `human_resources_manager`
**Approver:** `it_admin`

### State Machine

```
HR creates iam_requests (type: termination, suspension, OR reactivation)
    status: pending_it
    Optional: hr_remark includes expected suspension duration or reason
    │
    └── IT Admin reviews
            ├── Approve (Termination/Suspension):
            │     1. iam_requests.status → approved, approved_by, approved_at
            │     2. IT executes admin_lock_account(target_id, p_lock=TRUE, reason)
            │        Authorization: (domains->'system') ? 'd' (admin-only gate)
            │     3. RPC updates auth.users.banned_until (indefinite for termination, duration for suspension)
            │     4. Default: If no duration provided for suspension, defaults to indefinite pending review (3000-01-01).
            │     5. RPC updates profiles.employment_status ('terminated' OR 'suspended')
            │     6. RPC sets profiles.is_locked = TRUE
            │     7. Profiles trigger handle_profile_role_change syncs JWT (domains invalidated)
            │     8. is_claims_fresh() instantly invalidates active sessions
            │
            ├── Approve (Reactivation for suspended staff):
            │     1. iam_requests.status → approved, approved_by, approved_at
            │     2. IT executes admin_lock_account(target_id, p_lock=FALSE)
            │     3. RPC sets auth.users.banned_until = NULL
            │     4. RPC updates profiles.employment_status = 'active'
            │     5. RPC sets profiles.is_locked = FALSE
            │     6. profiles.last_permission_update = NOW()
            │
            └── Reject:
                  iam_requests.status → rejected, it_remark populated, approved_by = IT admin
```

### Additional: Automated Expiry & Un-Suspension

- `cron-employment-sync` Edge Function runs daily at 00:10 MYT
- Auto-activates `pending` staff when `contract_start <= TODAY`
- Auto-terminates staff when `contract_end < TODAY`
- Auto-lifts suspensions: Queries `auth.users` where `banned_until < NOW()` AND `profiles.employment_status = 'suspended'`. If found, calls admin API to lift ban (`banDuration: 'none'`), sets `employment_status = 'active'`, and sets `is_locked = FALSE`.

---

## WF-4: Leave Request Lifecycle

**Initiator:** Any staff member (all roles)
**Approver:** `human_resources_manager`

### State Machine

```
Staff creates leave_requests (status: pending)
    Exclusion constraint prevents overlapping active leaves (pending/approved) for same staff
    requested_days snapshotted at submission (supports half-day: 0.5)
    │
    ├── Staff cancels own pending leave
    │     Via rpc_cancel_leave_request (SECURITY DEFINER)
    │     Guard: only own requests, only status = pending
    │     status → cancelled
    │     (No ledger impact — pending leaves have no ledger entry)
    │
    ├── HR approves
    │     status → approved, reviewed_by, reviewed_at
    │     └── AFTER trigger trg_leave_approval_linkage fires:
    │           INSERT leave_ledger (transaction_type: usage, days: -requested_days, org_unit_path: denormalized)
    │           → v_leave_balances VIEW instantly reflects deduction (SUM of ledger)
    │           → v_shift_attendance VIEW derives 'on_leave' status at query time
    │           → Nightly sweep skips shifts covered by approved leave
    │
    ├── HR rejects
    │     status → rejected, rejection_reason (required), reviewed_by, reviewed_at
    │     (No ledger impact — rejected leaves never had a debit)
    │
    └── HR cancels previously approved leave
          status → cancelled, reviewed_by, reviewed_at
          └── AFTER trigger trg_leave_approval_linkage fires (reversal):
                INSERT leave_ledger (transaction_type: adjustment, days: +requested_days, org_unit_path: denormalized)
                → v_leave_balances VIEW instantly restores the leave quota
                → v_shift_attendance VIEW reverts to 'scheduled' (or 'absent' if past)
```

### Tables

| Table / View                | Role            | Operation                                                               |
| --------------------------- | --------------- | ----------------------------------------------------------------------- |
| `leave_requests`            | Staff           | INSERT (status=pending)                                                 |
| `leave_requests`            | Staff (via RPC) | UPDATE (status→cancelled, pending only)                                 |
| `leave_requests`            | HR              | UPDATE (status→approved/rejected/cancelled)                             |
| `leave_ledger`              | Trigger         | INSERT (usage debit on approval, adjustment credit on cancellation)     |
| `v_leave_balances` (VIEW)   | System          | SELECT — SUM(days) from leave_ledger grouped by staff/type/year         |
| `v_shift_attendance` (VIEW) | System          | SELECT — derives 'on_leave' via LATERAL JOIN to approved leave_requests |

### Enterprise Integrity (SoD & Source of Truth)

- Balance is computed from the **append-only `leave_ledger`** via `SUM(days)`. No mutable "remaining" column exists.
- Leave overlay on schedules is **derived at query time** via `v_shift_attendance` JOIN — no `linked_leave_id` FK on `shift_schedules`.
- Reversals insert **offsetting ledger entries** (positive adjustment). Ledger rows are never updated or deleted (`trg_leave_ledger_immutable` enforces this).

---

## WF-5: Attendance & Discrepancy Pipeline

**Automated actors:** SECURITY DEFINER RPCs + Triggers + pg_cron
**Reviewer:** `human_resources_manager`

### State Machine

```
Staff clocks in
    │
    ├── rpc_clock_in (SECURITY DEFINER) → INSERT timecard_punches (punch_type: clock_in)
    │     Guards: staff_record linked, shift exists today, not on approved leave,
    │             not a public holiday, not already clocked in
    │     Evidence captured per punch: GPS coordinates (JSONB), selfie_url, remark
    │     └── BEFORE trigger trg_validate_punch_window:
    │           Reject if punch_time < (shift_start - shift_types.max_early_clock_in_minutes)
    │           Reject if punch_time > (shift_start + shift_types.max_late_clock_in_minutes)
    │             ↑ Clock-in cutoff: after this, only clock-out is available
    │             ↑ HR manual punches (source = 'manual') bypass this cutoff
    │     └── AFTER trigger trg_detect_discrepancies:
    │           If punch_time > (shift_start + shift_types.grace_late_arrival_minutes)
    │           → INSERT attendance_exceptions (type: late_arrival, status: unjustified,
    │             staff_record_id + org_unit_path denormalized)
    │
    ├── rpc_clock_out (SECURITY DEFINER) → INSERT timecard_punches (punch_type: clock_out)
    │     Guards: shift exists today, not already clocked out
    │     ⚠️ Does NOT require a prior clock-in — standalone clock-out is allowed
    │     └── BEFORE trigger trg_validate_punch_window:
    │           Reject if punch_time > (shift_end + shift_types.max_late_clock_out_minutes)
    │     └── AFTER trigger trg_detect_discrepancies:
    │           If punch_time < (shift_end - shift_types.grace_early_departure_minutes)
    │           → INSERT attendance_exceptions (type: early_departure, status: unjustified)
    │           If no active clock_in punch exists for this shift
    │           → INSERT attendance_exceptions (type: missing_clock_in, status: unjustified)
    │
    └── Nightly sweep (pg_cron 00:05 daily): execute_nightly_attendance_sweep()
          Scans yesterday's shifts where shift has ended >2h ago
          Skips: shifts covered by approved leave, public holiday dates
          Denormalizes staff_record_id + org_unit_path on exception rows
          ├── No clock_in → INSERT exception (type: absent)
          └── Has clock_in but no clock_out → INSERT exception (type: missing_clock_out)
          All exceptions: ON CONFLICT (shift_schedule_id, type) DO NOTHING (idempotent)

UI clock-in/clock-out button logic:
    Before (shift_start + max_late_clock_in_minutes): show clock-in button
    After cutoff (or already clocked in): show clock-out button
    Frontend reads max_late_clock_in_minutes from shift_types via today's schedule

EXCEPTION STATE MACHINE (ADR-0007)
─────────────────────────────────
                  rpc_submit_exception_clarification
                  (staff; transitions to pending_review,
                   stamps clarification_submitted_at,
                   idempotently links attachments)
                                    │
     ┌──── unjustified ─────────────┤
     │                              ▼
     │                        pending_review ◄────────┐
 rpc_justify_exception        │          │            │
 (HR unilateral, from         │          │  rpc_reject_exception_
 the ledger — e.g.            │          │  clarification (HR; stores
 system-outage day)           │          │  reason in hr_note)
     │                        ▼          ▼            │
     ▼                    justified    rejected ──────┘
  justified              (TERMINAL)   (staff may resubmit, loops back)

Staff self-service (/crew/attendance?tab=exceptions):
    Immediate visibility for late_arrival / early_departure / missing_clock_in / missing_clock_out.
    Absent + missing_clock_out arrive after the 00:05 nightly sweep.
    Per-status affordance:
      unjustified    → "Request HR review" editor (text + attachment uploader)
      pending_review → read-only: submitted note + attachment list + "Awaiting HR"
      justified      → read-only: HR note (approval / converted-to-leave)
      rejected       → read-only rejection note + "Edit & resubmit" editor (pre-fills prior text)
    Submission path:
      1. Client uploads attachment blobs to the attendance-clarifications bucket
         path: {staff_record_id}/{exception_id}/{uuid}.{ext}
         bucket RLS locks first segment to caller's staff_record_id (10MB cap,
         image/* + PDF only)
      2. Client calls rpc_submit_exception_clarification(id, text, [paths]) as a Server Action
         RPC atomically:
           · UPDATE staff_clarification + status=pending_review +
             clarification_submitted_at + clear reviewer fields
           · INSERT clarification_attachments rows (metadata from storage.objects,
             ON CONFLICT DO NOTHING for idempotency on resubmit)

HR review — two surfaces per ADR-0007:

  /management/hr/attendance/queue   (action-required inbox)
    Scope: status = 'pending_review' ONLY
    Row actions:
      Approve       → rpc_justify_exception(id, reason)      → status=justified
      Reject        → rpc_reject_exception_clarification(id, reason) → status=rejected
                      (staff may resubmit; cycles back to pending_review)
      Convert to Leave (absent / missing_clock_in only)
                    → rpc_convert_exception_to_leave(id, leave_type_id, days, note)
                      Atomic: approved leave_request + leave_ledger usage debit +
                      exception justified with hr_note = 'Converted to <leave_type>'
                      (widened to accept pending_review source per ADR-0007)

  /management/hr/attendance/ledger  (read-only archive + unilateral path)
    Scope: v_shift_attendance — every shift, exception state as a column
    Row actions:
      "Approve without request" (unjustified only) → rpc_justify_exception(id, reason)
         The unilateral path. Use for system-outage days where every staff
         member is affected and no per-person submission is warranted.

NOTE-EXCHANGE MODEL (NO THREAD, TWO COLUMNS)
────────────────────────────────────────────
Per ADR-0007, the conversation lives in two existing columns:
    staff_clarification — staff's latest note (overwritten on resubmit)
    hr_note             — HR's latest decision note (justification on approve,
                          rejection reason on reject)
The `status` column disambiguates whether hr_note is an approval or a rejection.
Only the latest round-trip is preserved; earlier messages are overwritten.

PUNCH REMARK ≠ CLARIFICATION
────────────────────────────
    timecard_punches.remark     Quick note captured AT clock-in/out time
                                ("heavy traffic"). Reference-only; never escalates.
    attendance_exceptions.staff_clarification
                                Formal submitted clarification. Triggers state
                                transition to pending_review. Only this surface
                                reaches HR's queue.

Voiding (error correction):
    HR/Admin sets voided_at + voided_by on the erroneous punch
    → Partial unique index releases the slot → new correcting punch can be inserted
    → Voided punches excluded from all views (WHERE voided_at IS NULL)
```

### Tables

| Table                                  | Role                             | Operation                                                                                                                               |
| -------------------------------------- | -------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------- |
| `timecard_punches`                     | Staff (via SECURITY DEFINER RPC) | INSERT (clock_in, clock_out — separate rows)                                                                                            |
| `timecard_punches`                     | HR/Admin                         | UPDATE (voided_at, voided_by — void only, never delete)                                                                                 |
| `attendance_exceptions`                | Trigger / Cron                   | INSERT (auto-detected discrepancies, with denormalized staff_record_id + org_unit_path)                                                 |
| `attendance_exceptions`                | Staff (via RPC)                  | UPDATE (staff_clarification + state → pending_review, via rpc_submit_exception_clarification)                                           |
| `attendance_exceptions`                | HR (via RPC)                     | UPDATE (justified via rpc_justify_exception; rejected via rpc_reject_exception_clarification; leave via rpc_convert_exception_to_leave) |
| `attendance_clarification_attachments` | Staff (via RPC, atomic)          | INSERT (via rpc_submit_exception_clarification — never direct)                                                                          |
| `attendance_clarification_attachments` | —                                | No UPDATE / DELETE policies (append-only per ADR-0007)                                                                                  |
| `leave_requests`                       | HR (via RPC)                     | INSERT (approved, via rpc_convert_exception_to_leave for absent/missing_clock_in)                                                       |
| `leave_ledger`                         | Trigger                          | INSERT (usage debit, via trg_leave_approval_linkage fired by above)                                                                     |

### Event-Sourcing Integrity

- Each physical punch is an **immutable, append-only event** in `timecard_punches`. Rows are never updated except for voiding.
- Partial unique index `idx_timecard_punches_one_active_per_type` guarantees at most one active clock_in and one active clock_out per shift.
- `v_daily_timecards` VIEW aggregates punches into first_in / last_out pairs with gross_worked_seconds.
- `v_shift_attendance` VIEW derives status cascade: on_leave → public_holiday → completed → in_progress → absent → scheduled.

---

## WF-6: Shift Scheduling Pipeline

**Manager:** `human_resources_manager`
**Automated:** pg_cron (daily at 22:00 MYT)

### State Machine

```
HR manages scheduling at /management/hr/shifts:

Tab 1: "Roster Templates" — template CRUD + staff assignments (single tab)
    Top: Global Shift Dictionary — CRUD shift_types (code, name, times, grace periods,
         max_late_clock_in_minutes cutoff, break_duration_minutes)
    Middle: Template CRUD — roster_templates (name, cycle_length_days: 7/14/28/custom)
         Template Editor: grid of cycle_length_days columns, each cell = shift_type dropdown
         Empty cell = rest day (no roster_template_shifts row for that day_index)
         └── Trigger trg_validate_day_index enforces day_index <= cycle_length_days
    Bottom: Staff Assignments — staff_roster_assignments
         Fields: staff_record_id, template_id, effective_start_date, effective_end_date (NULL = indefinite)
         anchor_date lives on roster_templates (global "Day 1" metronome — all staff on
         same template share the same cycle phase regardless of hire date)
         EXCLUDE constraint prevents overlapping assignments for the same staff

Tab 2: "Schedule Overview" — read-only data table
    All shift_schedules joined with v_shift_attendance for derived_status
    Columns: staff name, date, shift type, start/end times, is_override, override_reason, status
    Filters: org unit, role, date range, shift type, staff search
    No edit actions — HR uses this to review before making decisions in Tab 1 or Tab 3

Tab 3: "Daily Editor" — single-day one-off changes
    HR makes direct UPDATE on individual shift_schedules
    └── BEFORE UPDATE trigger trg_shift_schedule_mark_override auto-sets is_override=TRUE
          (session variable guard: skips when called from template RPCs)

"Save & Apply" → single button on Tab 1:
    1. Server Action saves all pending template + assignment mutations to DB
    2. Server Action calls rpc_preview_pattern_change(p_from_date, p_to_date)
       Authorization: (domains->'hr') ? 'u'
       Backend auto-resolves affected staff from staff_roster_assignments (p_staff_record_ids = NULL)
       → Returns JSONB: { affected_staff_count, shifts_to_insert, shifts_to_update,
                           stale_rest_day_rows, work_day_overrides }
    3. Confirmation dialog shows preview:
         "5 staff affected. 12 new shifts. 8 shifts updated.
          4 stale rest-day rows will be deleted.
          3 work-day overrides will be preserved."
    4. Three options:
         ├── "Done" → close dialog, templates saved, no schedule propagation
         ├── "Apply" → rpc_apply_pattern_change(force_all=FALSE)
         │     Work days: upsert, skip is_override=TRUE rows
         │     Rest days: DELETE unconditionally (template is authority on WHICH days)
         └── "Reset All" → rpc_apply_pattern_change(force_all=TRUE)
               Work days: upsert, overwrite overrides too
               Rest days: DELETE unconditionally

    RPC auto-resolution: both RPCs accept p_staff_record_ids UUID[] DEFAULT NULL.
    When NULL, they query staff_roster_assignments WHERE date range overlaps → all affected staff.
    Both modes use anchor_date modulo arithmetic for N-day cycle alignment.
    Session variable app.settings.template_regeneration = 'true' prevents override trigger conflict.

    ⚠️ After changing a staff's roster assignment, HR MUST click "Save & Apply" to
       clean up stale rows from the old template. The daily cron never deletes.

"Mark Day Off" → rpc_mark_day_off(date, name)
    Authorization: (domains->'hr') ? 'c'
    INSERT public_holidays (ON CONFLICT: update name)
    Schedule rows are NOT deleted — v_shift_attendance derives 'public_holiday' status via JOIN

Daily cron: rpc_generate_schedules(14)
    Generates 14 days ahead from roster_templates + staff_roster_assignments
    ON CONFLICT (staff_record_id, shift_date) DO NOTHING — never overwrites or deletes existing rows
    Snapshots expected_start_time / expected_end_time from shift_types at generation time
    No row generated for rest days (missing day_index in template)
```

### Tables

| Table                      | Role            | Operation                                                   |
| -------------------------- | --------------- | ----------------------------------------------------------- |
| `shift_types`              | HR              | CRUD (Global Shift Dictionary)                              |
| `roster_templates`         | HR              | CRUD (N-day cycle definitions with anchor_date)             |
| `roster_template_shifts`   | HR              | CRUD (day-to-shift mapping within templates)                |
| `staff_roster_assignments` | HR              | CRUD (staff-to-template linkage with effective date ranges) |
| `shift_schedules`          | HR / RPC / Cron | INSERT/UPDATE (projected physical ledger)                   |
| `public_holidays`          | HR (via RPC)    | INSERT (company day-off calendar)                           |

---

## WF-7A: Guest Booking Flow

**Initiator:** Guest (anonymous, unauthenticated)
**Automated:** Payment gateway webhook, Edge Functions, pg_cron
**Consumer:** Guest receives confirmation email + QR code

### State Machine

```
Guest initiates booking
    │
    ├── Tier & Guest Count
    │     System auto-resolves the single active experience (idx_experiences_single_active)
    │     Reads: experience_tiers → tiers (adult_price, child_price, duration), tier_perks
    │     Guest selects:
    │       - Tier (from experience_tiers junction → tiers catalog)
    │       - Guest count: adults (min 1), children (min 0)
    │     Computed: totalPrice = (tier.adult_price × adults) + (tier.child_price × children)
    │     Guard: tier + guest count required
    │
    ├── Date & Time Selection
    │     Reads: time_slots WHERE experience_id + slot_date
    │     Effective capacity: time_slots.override_capacity ?? experience.capacity_per_slot
    │     Available = effective_capacity - booked_count
    │     Guard: slot not in the past
    │     Guard: slot.available >= (adult_count + child_count)
    │     Guard: date + slot required
    │
    ├── Booker Details
    │     Collects:
    │       - Full Name (booker_name, required, min 2 chars)
    │       - Email Address (booker_email, required, validated format)
    │       - Phone Number (booker_phone, required)
    │       - Promo Code (optional):
    │           On entry → calls rpc_validate_promo_code (read-only, no side effects)
    │           Returns: { valid, reason, discount_amount, final_price }
    │           Failure reasons surfaced to guest:
    │             PROMO_NOT_FOUND, PROMO_INACTIVE, PROMO_EXPIRED,
    │             PROMO_MAX_USES_REACHED, PROMO_GROUP_TOO_SMALL,
    │             PROMO_TIER_MISMATCH, PROMO_DAY_INVALID, PROMO_TIME_INVALID
    │           On valid: preview discount applied to order summary
    │       - Terms & Conditions acceptance (required)
    │     NOTE: Face Pay and Auto-Capture are NOT collected at booking time.
    │           These are per-attendee features managed post-booking in WF-7B.
    │     Guard: name + email + phone + terms required
    │
    ├── Booking Reservation
    │     Server Action calls rpc_create_booking:
    │       1. SELECT FOR UPDATE on time_slots (atomic capacity lock)
    │       2. Guard: booked_count + guest_count <= effective_capacity → else SLOT_FULL
    │       3. Guard: facility-wide overlap scan (max_facility_capacity) → else FACILITY_AT_CAPACITY
    │       4. Resolve tier_id via experience_tiers junction → else TIER_NOT_FOUND
    │       5. Compute price: (tier.adult_price × adults) + (tier.child_price × children)
    │       6. Validate promo_code if provided (strict — RAISE EXCEPTION on invalid):
    │            - PROMO_NOT_FOUND / PROMO_INACTIVE / PROMO_EXPIRED
    │            - PROMO_MAX_USES_REACHED / PROMO_GROUP_TOO_SMALL
    │            - PROMO_TIER_MISMATCH / PROMO_DAY_INVALID / PROMO_TIME_INVALID
    │            - On valid: apply discount ('percentage' or 'fixed', capped at total)
    │            - Increment promo_codes.current_uses
    │       7. Generate booking_ref: 'AG-' + 6 hex chars + '-' + 4 timestamp digits
    │       8. Generate qr_code_ref: 'AGARTHA:' + tier_name + ':' + guest_count + ':' + epoch
    │       9. INSERT bookings (status: pending_payment, booker_phone included)
    │      10. INSERT booking_attendees:
    │            - adult_count rows (type: 'adult', index: 1..N)
    │            - child_count rows (type: 'child', index: 1..N)
    │            - face_pay_enabled = FALSE, auto_capture_enabled = FALSE
    │            - nickname = NULL (set later in WF-7B)
    │      11. INCREMENT time_slots.booked_count
    │      12. INSERT booking_payments (method: 'card', amount: total_price, status: pending)
    │      13. RETURN booking result (ref, QR, price, date, time, discount)
    │     Capacity is now held. Booking + payment record exist as pending.
    │
    └── Payment Processing (hardened webhook pipeline — see migration 20260418000000_phase2_security_additions)
          Payment gateway processes the booking_payments.payment_intent_id
              │
              ├── Gateway webhook → Edge Function `confirm-booking-payment` (Route Handler, not a Server Action):
              │     1. HMAC signature verification against PAYMENT_WEBHOOK_SECRET (env, rotated 90d).
              │          Invalid signature → 401 + payment_webhook_invalid_signature_total counter +
              │          security alert. Unsigned payloads are never processed.
              │     2. Idempotency ledger:
              │          INSERT INTO payment_webhook_events (event_id PK, event_type, payment_intent_id,
              │          raw_payload, received_at) ON CONFLICT (event_id) DO NOTHING.
              │          Duplicate delivery → respond 200 without reprocessing.
              │     3. State correlation: look up booking_payments by payment_intent_id.
              │          Missing/mismatched → respond 200 (do not trigger gateway retry) +
              │          flag event as orphan + SEV-3 alert.
              │     4. Commit via rpc_apply_payment_event(p_event_id, p_payment_intent, p_new_status, p_paid_at):
              │          - UPDATE booking_payments SET status, paid_at (atomic, SELECT FOR UPDATE)
              │          - UPDATE bookings SET status = 'confirmed' when p_new_status = 'success'
              │          - UPDATE payment_webhook_events SET processed_at = NOW()
              │          Respond 200 only after commit.
              │     5. Notification: enqueue `send-email` (booking_confirmation) via job queue
              │          (idempotent by booking_id). Never invoked inline — webhook must return in < 5s.
              │
              ├── Payment fails:
              │     rpc_apply_payment_event(..., 'failed', NULL) → booking_payments.status = failed;
              │     booking remains pending_payment (abandonment sweep handles eventual cancel).
              │     Guest shown retry screen with one-click re-pay (new payment intent).
              │
              ├── Reconciliation cron (cron-payment-reconcile, every 5 min — recovers dropped webhooks):
              │     For each booking_payments.status = 'pending' older than 2 min, the Edge Function
              │     calls the gateway's GET /payment_intents/:id. If the gateway reports a terminal
              │     state (succeeded | failed | canceled) but the DB is still 'pending', synthesize
              │     the missed event via rpc_apply_payment_event — self-heals without user action.
              │
              ├── Dead-letter queue:
              │     Webhook events exceeding 3 processing attempts move to payment_webhook_events_dlq
              │     (SEV-2 alert on insert; admin-readable via system:r).
              │
              └── Guest abandons (never pays):
                    pg_cron 'cancel-expired-pending-payments' (every 15 min) — inline SQL cancellation.
                    pending_payment + created_at > 15 min old → status: cancelled, cancelled_at = NOW().
                    Trigger trg_booking_status_change fires:
                      - DECREMENTS time_slots.booked_count by guest_count
                      - If promo_code_id set: DECREMENTS promo_codes.current_uses

          Orphan guarantee: reconciliation cron + abandonment sweep + DLQ jointly ensure every
          pending_payment row reaches a terminal state within 15 min — no permanent orphans.
```

### Tables

| Table               | Role                          | Operation                                     |
| ------------------- | ----------------------------- | --------------------------------------------- |
| `experiences`       | Guest (anon read)             | SELECT (active experiences)                   |
| `experience_tiers`  | Guest (anon read)             | SELECT (tier junction)                        |
| `tiers`             | Guest (anon read)             | SELECT (pricing, duration)                    |
| `tier_perks`        | Guest (anon read)             | SELECT (perks list)                           |
| `time_slots`        | Guest / RPC                   | SELECT (availability) / UPDATE (booked_count) |
| `bookings`          | RPC (rpc_create_booking)      | INSERT (pending_payment)                      |
| `booking_attendees` | RPC (rpc_create_booking)      | INSERT (adult + child rows, features OFF)     |
| `promo_codes`       | RPC (rpc_validate_promo_code) | SELECT (read-only preview, no increment)      |
| `promo_codes`       | RPC (rpc_create_booking)      | SELECT + UPDATE (validate + increment uses)   |
| `promo_valid_tiers` | RPC (validate + create)       | SELECT (tier restriction check)               |
| `booking_payments`  | RPC (rpc_create_booking)      | INSERT (pending)                              |
| `booking_payments`  | Edge Function (webhook)       | UPDATE (→ success/failed)                     |
| `bookings`          | Edge Function (webhook)       | UPDATE (status → confirmed)                   |
| `bookings`          | pg_cron (timeout)             | UPDATE (status → cancelled, cancelled_at)     |

### Capacity Control

- `rpc_create_booking` atomically increments `time_slots.booked_count` with `SELECT FOR UPDATE`
- Checks both `capacity_per_slot` (or `override_capacity`) and `max_facility_capacity`
- `trg_booking_status_change` decrements `booked_count` on cancellation only
- `no_show` does NOT free capacity — the booking was real and consumed resources

---

## WF-7B: Manage Booking Flow ("My Agartha Experience")

**Initiator:** Guest (authenticated via OTP)
**Automated:** Edge Functions (OTP delivery), biometric enrollment pipeline
**Service crew:** Check-in at entry gate

### Authentication

```
Guest provides booking_ref
    │
    └── Server Action calls rpc_get_booking_identity(booking_ref, ip_address):
          1. Lookup booking by booking_ref
          2. Guard: booking.status IN ('confirmed', 'checked_in', 'completed') → else BOOKING_NOT_FOUND
          3. Guard: max 3 OTP requests per booking per 15 min → else OTP_RATE_LIMITED
          4. Invalidate any prior unverified challenges for this booking
          5. Generate 6-digit OTP (stored in otp_challenges, NOT returned to client)
          6. INSERT otp_challenges (booking_ref, otp_code, ip_address, expires_at = NOW() + 5min)
          7. Mask booker_email: "j***n@example.com"
          8. RETURN { masked_email, booking_ref, otp_sent }
          9. OTP delivery: Edge Function send-email (type: booking_otp) queries otp_challenges and sends email
              │
              └── Guest submits 6-digit OTP code
                    │
                    └── Server Action calls rpc_verify_otp(booking_ref, otp_code):
                          1. SELECT latest otp_challenges WHERE booking_ref, NOT verified, NOT expired
                          2. Guard: challenge exists → else OTP_EXPIRED
                          3. Guard: attempts < 5 → else OTP_LOCKED
                          4. Guard: otp_code matches → else OTP_INVALID (increment attempts)
                          5. Mark otp_challenges.verified = TRUE
                          6. RETURN { verified: true, booking_ref }
                          7. Guest session established (application layer, booking_ref scoped)
                              │
                              └── Guest accesses booking management
```

### Booking Details & Schedule Modification

```
Authenticated guest can view:
    booking_ref, qr_code_ref, status, date, entry/exit time, tier, duration,
    guest count, total_price, tier_perks, checked_in_at

Guest can reschedule (modify date/time):
    Guard: booking.status = 'confirmed'
    Guard: (slot_date + start_time) - NOW() >= 2 hours
        │
        ├── Guard FAILS:
        │     Reschedule blocked — booking is too close to entry time, already used, or cancelled
        │
        └── Guard PASSES:
              Guest selects new date + time slot
              Guard: new_slot.available >= (adult_count + child_count)
                  │
                  └── Server Action calls rpc_modify_booking(booking_ref, new_time_slot_id):
                        1. Lookup booking by booking_ref → else BOOKING_NOT_FOUND
                        2. Guard: booking.status = 'confirmed' → else RESCHEDULE_NOT_ALLOWED
                        3. Guard: (old slot_date + start_time) - NOW() >= 2 hours → else RESCHEDULE_TOO_LATE
                        4. Guard: new slot != old slot → else SAME_SLOT
                        5. SELECT FOR UPDATE on both old and new time_slots
                        6. Guard: new slot not in the past → else SLOT_IN_PAST
                        7. Guard: new_slot.booked_count + guest_count <= effective_capacity → else SLOT_FULL
                        8. Guard: facility-wide overlap scan on NEW slot (max_facility_capacity) → else FACILITY_AT_CAPACITY
                        9. If promo_code was used on booking:
                             Re-validate promo against NEW slot:
                             - valid_days_mask passes for new date → else PROMO_DAY_INVALID_AFTER_RESCHEDULE
                             - valid_time_start/end passes for new slot → else PROMO_TIME_INVALID_AFTER_RESCHEDULE
                             NOTE: no use-count re-check (already consumed), no price recalculation
                       10. DECREMENT old time_slots.booked_count by guest_count
                       11. INCREMENT new time_slots.booked_count by guest_count
                       12. UPDATE bookings: time_slot_id = new_slot_id
                       13. Log to system_audit_log (action: RESCHEDULE, entity_type: bookings, entity_id, new_values)
                       14. Edge Function `send-email` (type: booking_modified):
                            Sends updated date/time to booker_email
```

### Guest Details & Biometric Enrollment

### (BIPA §15 / GDPR Art. 9(2)(a) / PDPA Sec. 6 compliant — see migration 20260418000000_phase2_security_additions)

```
Attendee roster (from booking_attendees):
    Each attendee (adult_count + child_count rows) has:
      - attendee_type + attendee_index (e.g., adult #1, child #2)
      - nickname (display name, editable by guest)
      - face_pay_enabled (boolean, per-attendee, independently toggleable)
      - auto_capture_enabled (boolean, per-attendee, independently toggleable)
      - biometric enrollment status (derived: biometric_vectors EXISTS for attendee_id)
      - active consent status (derived: consent_records EXISTS WHERE consent_type='biometric_enrollment' AND withdrawn_at IS NULL)

    Per-Attendee Feature Control:
      Each attendee independently enables/disables Face Pay and/or Auto-Capture.
      UPDATE booking_attendees SET face_pay_enabled, auto_capture_enabled, nickname WHERE id = attendee_id.
      Feature flags alone DO NOT authorize capture — an active consent_records row is also required.

Consent Gate (mandatory before any biometric capture):
    The /my-booking/manage/biometrics UI renders a non-dismissable disclosure card stating:
      - What is captured (mathematical template, not the raw photo)
      - Why (Face Pay authorization + auto-capture during visit)
      - Legal basis (GDPR Art. 9(2)(a) explicit consent + BIPA written release + PDPA Sec. 6)
      - Retention (24h after visit-end, or immediately on withdrawal)
      - Withdrawal path (one click, synchronous, does not affect booking)
      - Controller + privacy contact + current policy version
    Camera activation is blocked until the "I consent" checkbox (NOT pre-checked) is ticked AND
    the following is committed server-side:
      INSERT INTO consent_records (subject_id = attendee_id, subject_type = 'booking_attendee',
        consent_type = 'biometric_enrollment', legal_basis = 'explicit_consent',
        purpose = 'face_pay_and_autocapture', retention_policy = 'visit_end_plus_24h',
        policy_version, granted_at = NOW(), ip_address, user_agent);

Biometric Enrollment (per attendee, only after consent row committed):
    1. Camera capture → POST image to Edge Function `enroll-biometric` (service_role).
    2. Edge Function:
         - Validates MIME signature + size per global upload rules
         - Extracts face vector in-memory
         - Discards raw image (raw biometric images MUST NOT persist to Storage)
         - INSERT biometric_vectors (attendee_id, vector_hash, consent_record_id FK)
         - INSERT biometric_access_log (event='enroll', actor_type='guest_self', ip_address, user_agent)
    Vector storage is envelope-encrypted via Supabase Vault / pgsodium.

Every Read of a biometric vector MUST emit an audit row:
    Face Pay gate (/crew/pos) and the auto-capture matcher INSERT INTO biometric_access_log
    (event='match_attempt', actor_type='system'|'staff', actor_id, match_result,
    confidence_score, ip_address). Read-side RPCs enforce this via trigger — reads without
    an audit log row are rejected.

Withdrawal (synchronous, atomic, guest- or staff-initiated):
    Guest action → Server Action → rpc_withdraw_biometric_consent(p_attendee_id, p_actor_type,
    p_actor_id, p_ip_address, p_user_agent):
      1. UPDATE consent_records SET withdrawn_at = NOW(), withdrawal_method
      2. DELETE biometric_vectors WHERE attendee_id
      3. UPDATE booking_attendees SET face_pay_enabled = FALSE, auto_capture_enabled = FALSE
      4. INSERT biometric_access_log (event='withdraw_and_delete')
    UI confirms deletion before returning — withdrawal is not eventual.

Automatic Retention Sweep (cron-biometric-retention, hourly):
    fn_biometric_retention_sweep() deletes biometric_vectors whose parent booking's slot ended
    more than 24h ago AND no active non-withdrawn consent remains. Each deletion emits
    biometric_access_log (event='auto_delete_retention', actor_type='system') for audit continuity.
    Consent rows covering those vectors are auto-withdrawn at the same time.
    (Existing 'purge-expired-biometrics' daily sweep remains as a 30-day fallback cleanup.)

Admin / DSR Erasure:
    Administrative purge via rpc_wipe_biometric_data(booking_ref) — domain-gated (system:d).
    Full Data Subject Request erasure via rpc_erase_subject(p_booking_id, p_reason):
      - Cascades DELETE of biometric_vectors for every attendee under the booking
      - Withdraws all open consent_records with withdrawal_method = 'dsr_erasure'
      - DELETEs captured_photos for the booking
      - Anonymizes booker_name / booker_email / booker_phone on the bookings row
      - Emits biometric_access_log (event='dsr_erasure') per attendee for 7-year legal proof
    biometric_access_log rows themselves are retained (immutable audit trail).

Consent Re-solicitation:
    On privacy-policy version bumps, prior consents are server-side expired and guests must
    re-consent via the disclosure card on their next visit before Face Pay works again.
```

### Memories Vault

```
Auto-captured media retrieval:
    │
    ├── Pre-visit (booking.status = 'confirmed'):
    │     No media available — photos captured only during visit
    │
    ├── During/post-visit (booking.status IN ('checked_in', 'completed')):
    │     Photos captured by ride cameras, matched via biometric_vectors
    │     for ANY attendee under this booking with auto_capture_enabled = TRUE
    │     Inserted by Edge Functions (service_role) into captured_photos:
    │       booking_id, attendee_id (NULL if unmatched), device_id, storage_path
    │       expires_at = captured_at + retention_days (from system config)
    │     Storage: Supabase Storage, paths scoped to booking_id
    │     Guest can: download individual photos, download all as ZIP, generate time-limited share URLs
    │
    └── Retention policy:
          expires_at set per-photo at capture time
          pg_cron daily (02:00 MYT): DELETE FROM captured_photos WHERE expires_at < NOW()
          Supabase Storage cleanup triggered by separate Edge Function after deletion
```

### Staff Check-In

```
After guest arrival:
    service_crew at entry validation:
        │
        ├── Lookup by QR code or booking_ref (separate params, one required):
        │     rpc_lookup_booking(p_qr_code_ref, p_booking_ref) → booking details + attendee list
        │     rpc_search_bookings_by_email(p_email) → list of bookings for that email
        │
        └── rpc_checkin_booking(p_booking_id):
              1. Guard: booking.status = 'confirmed' (or 'no_show' for late arrivals)
              2. bookings.status → checked_in
              3. bookings.checked_in_at = NOW()
              4. RETURN success

    Nightly sweep (pg_cron 23:30 MYT): fn_booking_status_sweep()
        1. confirmed + slot end_time passed → no_show (purely for statistics; capacity NOT freed)
        2. checked_in + (slot start_time + tier.duration_minutes) passed → completed
```

### Tables (Combined WF-7A + WF-7B)

| Table                                       | Role                                    | Operation                                                 |
| ------------------------------------------- | --------------------------------------- | --------------------------------------------------------- |
| `experiences`                               | Guest (anon read)                       | SELECT                                                    |
| `tiers` / `tier_perks` / `experience_tiers` | Guest (anon read)                       | SELECT                                                    |
| `time_slots`                                | Guest / RPC                             | SELECT / UPDATE (booked_count ±)                          |
| `bookings`                                  | RPC (rpc_create_booking)                | INSERT (pending_payment)                                  |
| `bookings`                                  | Edge Function (confirm-booking-payment) | UPDATE (→ confirmed)                                      |
| `bookings`                                  | RPC (rpc_modify_booking)                | UPDATE (time_slot_id swap + promo re-validation)          |
| `bookings`                                  | service_crew (via rpc_checkin_booking)  | UPDATE (→ checked_in)                                     |
| `bookings`                                  | pg_cron                                 | UPDATE (→ no_show, completed, cancelled)                  |
| `booking_attendees`                         | RPC (rpc_create_booking)                | INSERT (defaults: features OFF, nickname NULL)            |
| `booking_attendees`                         | Guest (session)                         | UPDATE (nickname, face_pay_enabled, auto_capture_enabled) |
| `booking_payments`                          | RPC (rpc_create_booking)                | INSERT (pending)                                          |
| `booking_payments`                          | Edge Function (confirm-booking-payment) | UPDATE (→ success/failed)                                 |
| `promo_codes`                               | RPC (rpc_validate_promo_code)           | SELECT (read-only preview)                                |
| `promo_codes`                               | RPC (rpc_create_booking)                | SELECT + UPDATE (validate + increment)                    |
| `promo_codes`                               | RPC (rpc_modify_booking)                | SELECT (day/time re-validation)                           |
| `promo_valid_tiers`                         | RPC (validate + create + modify)        | SELECT (tier restriction check)                           |
| `otp_challenges`                            | RPC (identity/verify)                   | INSERT / UPDATE (verified)                                |
| `biometric_vectors`                         | Edge Function (service_role)            | INSERT / DELETE                                           |
| `captured_photos`                           | Edge Function (service_role)            | INSERT (camera capture + face-match)                      |
| `captured_photos`                           | pg_cron (retention)                     | DELETE (expired photos)                                   |
| `system_audit_log`                          | RPC (rpc_modify_booking)                | INSERT (RESCHEDULE action)                                |

### Capacity Control

- `rpc_create_booking` atomically increments `time_slots.booked_count` with `SELECT FOR UPDATE`
- `rpc_modify_booking` atomically swaps booked_count: decrement old slot, increment new slot (both `SELECT FOR UPDATE`)
- `trg_booking_status_change` decrements on cancellation; re-increments on reactivation
- `no_show` does NOT release capacity — the booking consumed real resources
- Facility-wide max: `experiences.max_facility_capacity` checked at both booking creation and reschedule

### Data Privacy & Retention

- Biometric vectors stored as hashed embeddings only — never raw face images
- Guest can delete own biometric data at any time (per-attendee)
- Admin can purge via `rpc_wipe_biometric_data` (GDPR right-to-erasure)
- Auto-captured photos subject to configurable retention policy (post-visit purge)

---

## WF-8: Slot Override & Booking Cascade

**Manager:** `operations_manager`

### State Machine

```
Ops manager edits slot capacity at /management/operations/scheduler
    │
    ├── New capacity >= booked_count → direct update (no cascade)
    │
    └── New capacity < booked_count → overflow detected
          │
          ├── rpc_preview_slot_override(slot_id, new_capacity)
          │     Returns: table of { booking_id, current_slot, target_slot }
          │     → Manager reviews cascade plan in modal
          │
          └── rpc_confirm_slot_override(slot_id, new_capacity, constraint_type, notes)
                Atomically:
                1. Updates slot capacity + constraint_type + constraint_notes
                2. Moves overflow bookings to next available slots (same day first, then next day)
                3. Adjusts booked_count on source and target slots
                4. Returns JSON: { moved_bookings, unmoved_bookings }
                │
                └── Server Action receives cascaded bookings array
                      │
                      └── Edge Function `send-email` (type: booking_cascaded)
                            Notifies cascaded guests of their forced rescheduling
```

### Tables

| Table        | Role                  | Operation                     |
| ------------ | --------------------- | ----------------------------- |
| `time_slots` | Ops manager (via RPC) | UPDATE (capacity, constraint) |
| `bookings`   | RPC                   | UPDATE (time_slot_id moved)   |

---

## WF-9: Purchase Order Lifecycle

**Initiator:** `procurement_manager`
**Receiver:** `runner_crew`
**Automated:** Trigger `trg_po_receive_goods_movement`

### State Machine

```
Procurement manager creates PO at /management/procurement/purchase-orders
    OR via Reorder Dashboard → "Create Draft POs" (auto-grouped by default supplier)
        status: draft
            │
            ├── procurement_manager marks as sent → status: sent
            │
            └── runner_crew receives at /crew/logistics/po-receiving
                  Per line item: enters received_qty
                      └── Trigger trg_po_receive_goods_movement fires per item:
                            1. Converts purchase units → base units (via uom_conversions table)
                            2. Creates goods_movements header (movement_type: 101 Goods Receipt from PO)
                            3. Creates goods_movement_items line (positive qty = inflow at receiving_location_id)
                            4. trg_gmi_a_cache_sync updates stock_balance_cache
                            5. trg_gmi_b_valuation_update computes moving average cost
                            6. Auto-transitions PO status:
                                 If ANY item's received_qty < expected_qty AND status == 'sent' → partially_received
                                 If ALL items' received_qty >= expected_qty → completed

                             7. Post-Partial Lifecycle (if partially_received):
                                 Path A: Missing items arrive later → runner_crew updates received_qty again → auto-transitions to completed.
                                 Path B: Supplier short-ships permanently → procurement_manager manually forces PO to completed to release the 'on_order' hold in the Reorder Dashboard.
```

### Tables

| Table                  | Role                | Operation                               |
| ---------------------- | ------------------- | --------------------------------------- |
| `purchase_orders`      | procurement_manager | INSERT/UPDATE                           |
| `purchase_order_items` | procurement_manager | INSERT                                  |
| `purchase_order_items` | runner_crew         | UPDATE (received_qty)                   |
| `goods_movements`      | Trigger             | INSERT (movement_type 101)              |
| `goods_movement_items` | Trigger             | INSERT (positive qty inflow)            |
| `stock_balance_cache`  | Downstream trigger  | UPDATE (via trg_gmi_a_cache_sync)       |
| `material_valuation`   | Downstream trigger  | UPDATE (via trg_gmi_b_valuation_update) |

### Reorder Dashboard

`rpc_reorder_dashboard()` returns all procurable materials with:

- `sell_through_30d`: Sales consumption over 30 days (from goods_movement_items type 601)
- `on_hand`: SUM of current_qty from stock_balance_cache
- `on_order`: SUM of expected-received from active POs
- `effective_stock`: on_hand + on_order
- `reorder_amt`: GREATEST(0, reorder_point - effective_stock)

---

## WF-10: Material Requisition & Restock Pipeline

**Initiator:** Crew (fnb, giftshop, cleaning, health, maintenance)
**Dispatcher:** `inventory_manager`
**Runner:** `runner_crew`
**Automated:** Trigger `trg_requisition_completion_goods_movement`

### State Machine

```
Crew creates restock request at /crew/restock
    │
    └── INSERT material_requisitions:
          from_location_id = warehouse, to_location_id = crew's operational location
          status: pending
          │
          └── INSERT material_requisition_items (per line):
                material_id, requested_qty, movement_type_code:
                  '311' (Transfer Between Locations) for raw materials, trading goods
                  '201' (Issue to Cost Center) for consumables
                Frontend determines movement_type_code from material_categories.is_consumable
                BUT the movement type is per-line, not per-ticket — mixed carts are ONE requisition
              │
              ├── Inventory manager can also create requisitions at /management/inventory/requisitions
              │     (manual requisitions, suggested fulfillments, new tickets)
              │
              └── runner_crew picks from /crew/logistics/restock-queue
                    "Accept" → status: in_progress, assigned_to = runner
                        │
                        └── "Mark Delivered" → runner inputs actual delivered_qty per item → status: completed
                              └── Trigger trg_requisition_completion_goods_movement fires:
                                    For EACH material_requisition_item with delivered_qty > 0:
                                      1. Creates goods_movements header (movement_type per item's movement_type_code)
                                      2. Creates goods_movement_items:
                                         - Negative line (outflow) at from_location
                                         - Positive line (inflow) at to_location (transfer only, not consumption)
                                      3. trg_gmi_a_cache_sync updates stock_balance_cache downstream
```

### Schema Enforcements

- **Movement Type Validation:** `trg_validate_requisition_item` ensures movement_type_code exists in movement_types table and is active.
- **Delivery Physics:** Both movement types use a structured `to_location_id` so the runner knows exactly which room to walk to.
- **Partial Fulfilments:** The trigger explicitly uses `delivered_qty`. Discrepancies between requested and delivered are dropped (no backorders). The ticket closes exactly as the runner physically executed it.
- **Role Permissions:** `material_requisitions` RLS (Tier 3b, inventory_ops domain) allows crew with inventory_ops:c to submit, with ownership scoping on SELECT/UPDATE.

### Tables

| Table                        | Role                | Operation                                              |
| ---------------------------- | ------------------- | ------------------------------------------------------ |
| `material_requisitions`      | Crew / Inv. manager | INSERT                                                 |
| `material_requisition_items` | Crew / Inv. manager | INSERT                                                 |
| `material_requisitions`      | runner_crew         | UPDATE (accept, complete)                              |
| `goods_movements`            | Trigger             | INSERT (per movement_type_code)                        |
| `goods_movement_items`       | Trigger             | INSERT (signed qty: negative outflow, positive inflow) |
| `stock_balance_cache`        | Downstream trigger  | UPDATE (via trg_gmi_a_cache_sync)                      |

---

## WF-11: Stock Reconciliation (Blind Audit)

**Initiator:** `inventory_manager`
**Counter:** `runner_crew`
**Automated:** `check_reconciliation_items_counted`, `trg_reconciliation_approval_goods_movement`

### State Machine

```
Inventory manager creates reconciliation at /management/inventory/reconciliation
    Selects location, assigns runner, creates item list with system_qty snapshot
        status: pending
            │
            └── runner_crew counts at /crew/logistics/stock-count
                  Runner sees materials + units but NOT system_qty (blind count)
                  Per item: enters physical_qty
                      │
                      └── Runner submits → status: pending_review, discrepancy_found set by application logic
                            │
                            └── Manager sees pending_review task at /management/inventory/reconciliation
                                  ├── Option A: "Request Recount"
                                  │     └── RPC rpc_request_recount(uuid, new_runner_id):
                                  │           1. Deletes all inventory_reconciliation_items (wipes slate clean)
                                  │           2. Updates assigned_to if new runner selected
                                  │           3. Reverts status to in_progress (returns to active queue)
                                  │
                                  └── Option B: "Approve Adjustments"
                                        └── Updates status to completed + discrepancy_found = TRUE
                                              → Trigger trg_reconciliation_approval_goods_movement fires:
                                              For EACH item where physical_qty != system_qty:
                                                1. Creates goods_movements header (type 701 positive / 702 negative)
                                                2. Creates goods_movement_items line (signed variance delta)
                                                3. trg_gmi_a_cache_sync corrects stock_balance_cache downstream
```

### Tables

| Table                            | Role               | Operation                                    |
| -------------------------------- | ------------------ | -------------------------------------------- |
| `inventory_reconciliations`      | Inv. manager       | INSERT                                       |
| `inventory_reconciliation_items` | Inv. manager       | INSERT (with system_qty snapshot)            |
| `inventory_reconciliation_items` | runner_crew        | UPDATE (physical_qty)                        |
| `inventory_reconciliations`      | Manager            | UPDATE (status→completed, discrepancy_found) |
| `goods_movements`                | Trigger            | INSERT (type 701/702)                        |
| `goods_movement_items`           | Trigger            | INSERT (signed variance)                     |
| `stock_balance_cache`            | Downstream trigger | UPDATE (via trg_gmi_a_cache_sync)            |

---

## WF-12: Inventory Disposal (Write-Off)

**Actor:** `fnb_crew`, `giftshop_crew`, `runner_crew`
**Automated:** Trigger `trg_write_off_goods_movement`

### State Machine

```
Staff encounters wasted/damaged material (e.g. dropped food, expired item)
    │
    └── Logs disposal via UI (/crew/*/disposals)
          - Selects material_id, quantity, location_id, reason (disposal_reason ENUM)
          - explode_bom flag: TRUE for finished goods (burger → deducts BOM components),
                              FALSE for raw materials (milk → deducts directly)
          - unit_cost: resolved from material_valuation at write-off time (stored, not recomputed)
          - total_cost: auto-computed (GENERATED ALWAYS AS quantity * unit_cost)
          - cost_center_id: optional, for departmental waste attribution
          - UI Constraint: Items filtered to match location_allowed_categories
              │
              └── INSERT write_offs:
                    Single path — material_id always set, explode_bom controls deduction strategy
                        │
                        └── Trigger trg_write_off_goods_movement fires on INSERT:
                              1. Creates goods_movements header (movement_type: 551 Scrapping)
                              2. If explode_bom = TRUE: calls explode_bom() → deducts each leaf component
                              3. If explode_bom = FALSE: deducts material directly
                              4. Creates goods_movement_items lines (negative qty = outflow)
                              5. trg_gmi_a_cache_sync updates stock_balance_cache downstream
```

### Tables

| Table                  | Role               | Operation                                          |
| ---------------------- | ------------------ | -------------------------------------------------- |
| `write_offs`           | Crew               | INSERT                                             |
| `write_offs`           | Inv. manager       | SELECT (read-only review)                          |
| `goods_movements`      | Trigger            | INSERT (type 551)                                  |
| `goods_movement_items` | Trigger            | INSERT (negative qty, with optional BOM explosion) |
| `stock_balance_cache`  | Downstream trigger | UPDATE (via trg_gmi_a_cache_sync)                  |

---

## WF-13: POS Order & Stock Deduction

**Actor:** `fnb_crew` or `giftshop_crew`
**Automated:** Trigger `trg_order_completion_goods_movement`

### State Machine

```
Crew uses POS terminal at /crew/pos
    │
    └── submit_pos_order RPC:
          Authorization: (domains->'pos') ? 'c'
          Validates: pos_point_id, items (material_id + quantity + optional modifier option IDs), payment_method
          Server-side price lookup from material_sales_data (prevents client-side tampering)
          Modifier price deltas summed from pos_modifier_options
          INSERT orders (status: preparing) + INSERT order_items
          INSERT order_item_modifiers (snapshots: option_name, price_delta, material_id, quantity_delta)
              │
              ├── Crew marks order completed at /crew/active-orders
              │     orders.status → completed → trigger trg_order_completion_goods_movement fires:
              │         1. Resolves location from pos_points.location_id
              │         2. Creates goods_movements header (movement_type: 601 Goods Issue for Sale)
              │         3. Per order_item: explode_bom() → base component quantities
              │         4. Applies modifier material deltas from order_item_modifiers:
              │              - Skip if material_id IS NULL or quantity_delta = 0 (price-only modifier)
              │              - If material exists in BOM components → adjust its quantity
              │              - If material NOT in BOM → add as new deduction line
              │              - Skip any component where final quantity <= 0 (e.g., "No Sugar")
              │         5. Creates goods_movement_items lines (negative qty = outflow per final component)
              │         6. trg_gmi_a_cache_sync updates stock_balance_cache downstream
              │         7. trg_gmi_b_valuation_update records cost snapshot
              │
              └── Manager/admin can cancel → orders.status → cancelled (no stock deduction)
```

### Tables

| Table                  | Role               | Operation                                                      |
| ---------------------- | ------------------ | -------------------------------------------------------------- |
| `orders`               | Crew (via RPC)     | INSERT                                                         |
| `order_items`          | Crew (via RPC)     | INSERT                                                         |
| `order_item_modifiers` | Crew (via RPC)     | INSERT (snapshots: price_delta + material_id + quantity_delta) |
| `orders`               | Crew               | UPDATE (status→completed)                                      |
| `goods_movements`      | Trigger            | INSERT (type 601)                                              |
| `goods_movement_items` | Trigger            | INSERT (negative qty via BOM explosion)                        |
| `stock_balance_cache`  | Downstream trigger | UPDATE (via trg_gmi_a_cache_sync)                              |

---

## WF-14: Incident Lifecycle

**Reporter:** Any crew member
**Resolver:** `operations_manager` (20 categories) or `maintenance_manager` (7 categories)

### State Machine

```
Crew reports incident at /crew/incidents
    INSERT incidents (status: open, category, description, zone_id, attachment_url, metadata)
        │
        └── Category routing determines which manager sees it:
              ops_manager: safety, medical, security, guest, other groups
              maintenance_manager: structural, equipment groups
                  │
                  └── Manager resolves at /management/operations/incidents or /management/maintenance/incidents
                        Direct UPDATE: status → resolved, resolved_by = auth.uid(), resolved_at = NOW()
                        (No RPC needed — RLS allows domain-gated UPDATE:
                         ops_manager has ops:u; maintenance_manager has ops:u)
```

### Tables

| Table       | Role                        | Operation                                          |
| ----------- | --------------------------- | -------------------------------------------------- |
| `incidents` | Crew                        | INSERT (Tier 2: universal insert, no domain check) |
| `incidents` | ops_manager / maint_manager | UPDATE (resolve — via ops:u domain)                |

---

## WF-15: Maintenance Work Order Lifecycle

**Manager:** `maintenance_manager`
**Sponsor:** `internal_maintenance_crew`
**Vendor:** External (via MAC/RADIUS)

### State Machine

```
Maintenance manager creates WO at /management/maintenance/orders
    status: draft
        │
        ├── Manager schedules → status: scheduled
        │
        └── Crew sponsor authorizes at /crew/maintenance/orders
              Enters vendor_mac_address, clicks "Authorize"
                  status → active, authorized_at = NOW()
                  (Vendor MAC dynamically appears in get_active_vendors_for_radius() RPC)
                      │
                      ├── Sponsor revokes → status: completed, sponsor_remark entered
                      │
                      └── MAD timer expires (maintenance_end reached) → auto-complete
                            computed_status evaluates NOW() > maintenance_end
                            (Vendor MAC instantly vanishes from RADIUS RPC)
```

### Tables

| Table                | Role                | Operation                                                     |
| -------------------- | ------------------- | ------------------------------------------------------------- |
| `maintenance_orders` | maint_manager       | INSERT/UPDATE (create, schedule, complete, cancel)            |
| `maintenance_orders` | internal_maint_crew | UPDATE (authorize, revoke — sponsor_id match via Tier 3b RLS) |

---

## WF-16: Announcement Lifecycle

**Creator:** Any admin or manager (with comms domain)
**Consumer:** All staff (targeted by role, org_unit, or user)

### State Machine

```
Admin/manager creates announcement at /admin/announcements or /management/announcements
    INSERT announcements + INSERT announcement_targets (global, role, org_unit, or user scope)
        │
        └── Staff sees in their portal's announcements page
              Visibility resolved by get_visible_announcements() RPC (SECURITY DEFINER, bypasses RLS):
                Matches targets via: global, role_id match, org_unit ltree ancestry, or direct user_id
              announcement_reads: INSERT on open/expand (mark-on-read, ON CONFLICT DO NOTHING)
              "Mark All as Read": batch INSERT for all visible unread
              Unread badge: COUNT of targeted announcements WITHOUT a matching read row (last 30 days)
```

### Tables

| Table                  | Role                                 | Operation        |
| ---------------------- | ------------------------------------ | ---------------- |
| `announcements`        | Admin/Manager (comms:c)              | INSERT/UPDATE    |
| `announcement_targets` | Admin/Manager (comms:c)              | INSERT           |
| `announcement_reads`   | All staff (Tier 2: universal insert) | INSERT (on read) |

---

## WF-17: Zone Telemetry & Crew Declaration

**Crew:** All roles (zone scan)
**IoT:** Sensors (occupancy push)
**Consumer:** `operations_manager` (realtime dashboard)

### Flow

```
Crew scans QR at zone entry at /crew/zone-scan
    INSERT crew_zones (staff_record_id, zone_id, scanned_at)
    trg_crew_zones_auto_close fires BEFORE INSERT:
      If previous zone active (left_at IS NULL) → UPDATE set left_at = NOW()
    "Leave Zone": sets left_at on current active row

IoT sensors push to zone_telemetry (current_occupancy per zone)

Operations manager views at /management/operations/telemetry:
    Realtime subscriptions: zones UPDATE, crew_zones INSERT, zone_telemetry INSERT
    Aggregates: guest occupancy per zone, crew counts per zone, load status
```

---

## WF-18: Report Generation Pipeline

**Initiator:** Any admin or manager (role-filtered report types)
**Automated:** Edge Function `generate-report`

### Flow

```
User requests report at /admin/reports or /management/reports
    Checks if reports config row exists, if not INSERTs into reports (type, params)
    Frontend invokes Edge Function: supabase.functions.invoke('generate-report', { report_id })
        │
        └── Edge Function generate-report (running as service_role):
              INSERTs report_executions (status: processing, report_id)
              Calls Postgres RPC: execute_report(type, params) → PL/pgSQL dispatcher → _report_* sub-function
              → JSONB result converted to CSV → uploaded to Storage bucket
              → UPDATE report_executions (status: completed, file_url = signed URL)

Scheduled reports:
    reports table: schedule_cron, recipients (JSONB), is_active
    Edge Function generates on schedule → emails CSV to recipients via send-email
```

### Tables

| Table               | Role                           | Operation                               |
| ------------------- | ------------------------------ | --------------------------------------- |
| `reports`           | Admin/Manager (reports domain) | INSERT/UPDATE (scheduled report config) |
| `report_executions` | Edge Function                  | INSERT/UPDATE                           |

---

## WF-19: Domain-Based Permission Management

**Manager:** `it_admin` or `business_admin`
**Affected:** All roles

### Flow

```
Admin manages permissions at /admin/settings/permissions
    │
    ├── View: permission_domains (13 domains) — read-only reference
    │
    ├── Edit: role_domain_permissions matrix
    │     Grid: rows = roles (19), columns = domains (13), cells = CRUD checkboxes
    │     Each cell controls can_create, can_read, can_update, can_delete independently
    │     INSERT and UPDATE are separate privileges (e.g., runner can UPDATE received_qty but not CREATE POs)
    │
    └── On INSERT/UPDATE/DELETE of role_domain_permissions:
          Trigger trg_role_domain_permissions_changed fires:
            1. Resolves full domains JSONB for the affected role_id
            2. Injects domains + stamps last_permission_update into auth.users.raw_app_meta_data
               for ALL users with that role
            3. Stamps profiles.last_permission_update → is_claims_fresh() invalidates stale JWTs
            4. On next request, affected users' JWTs are refreshed with new permissions
```

### Tables

| Table                     | Role                | Operation                                    |
| ------------------------- | ------------------- | -------------------------------------------- |
| `permission_domains`      | Admin (system:r)    | SELECT (reference data)                      |
| `role_domain_permissions` | Admin (system:crud) | INSERT/UPDATE/DELETE                         |
| `profiles`                | Trigger             | UPDATE (last_permission_update stamp)        |
| `auth.users`              | Trigger             | UPDATE (raw_app_meta_data domains injection) |

---

## WF-20: Equipment Custody (Returnable Assets)

**Initiator:** `inventory_manager` or crew (via requisition)
**Tracked by:** `equipment_assignments` custody ledger

### Flow

```
Materials with is_returnable = TRUE are tracked through the custody ledger.

Assignment (issue):
    When a goods movement with movement_type 201 (Issue to Cost Center) is created
    for a returnable material, an equipment_assignments row should be created:
      material_id, assigned_to (user receiving the equipment), assigned_at = NOW()
    Tracked at /management/inventory/equipment

Return:
    Staff returns equipment → manager updates equipment_assignments:
      returned_at = NOW(), condition_on_return (notes on state)
    If damaged: manager creates a write_off (WF-12) for the damaged item

Reporting:
    Outstanding custody: SELECT * FROM equipment_assignments WHERE returned_at IS NULL
    History per material: full custody chain with condition tracking
```

### Tables

| Table                   | Role                   | Operation                                      |
| ----------------------- | ---------------------- | ---------------------------------------------- |
| `equipment_assignments` | Inv. manager / Trigger | INSERT (on issuance)                           |
| `equipment_assignments` | Inv. manager           | UPDATE (returned_at, condition_on_return)      |
| `materials`             | Reference              | is_returnable flag determines custody tracking |

---

## WF-21: Guest Feedback Capture (Staff-Submitted)

**Reporter:** Any crew member (facility-wide, no domain restriction)
**Consumer:** `marketing_manager`

### Flow

```
Crew member hears guest feedback during visit (complaint, compliment, suggestion)
    │
    └── Opens /crew/feedback on their device
          Fills quick form:
            - sentiment: positive | neutral | negative (required)
            - feedback_text (required, free text)
            - keywords (optional, tag input → JSONB array)
            - overall_score (optional, 1-10 slider)
            - booking_ref (optional — if crew knows the guest's booking)
          │
          └── Submit → Server Action (authenticated):
                1. Resolves booking_id from booking_ref if provided
                2. INSERT survey_responses:
                     survey_type = 'staff_captured'
                     staff_submitted = TRUE
                     submitted_by = auth.uid()
                     source = 'in_app'
                     sentiment, feedback_text, keywords, overall_score, booking_id
                3. RLS enforced: policy requires staff_submitted = TRUE
                   AND submitted_by = auth.uid() — prevents crew from
                   impersonating other staff or injecting guest-type surveys
                │
                └── Marketing manager reviews at /management/marketing/surveys
                      "Staff Feedback" tab: survey_responses WHERE staff_submitted = TRUE
                      Columns: submitted_by (staff name), sentiment, feedback_text,
                               keywords, overall_score, created_at, linked booking_ref
                      Used for: trend analysis, complaint patterns, operational improvements
```

### Tables

| Table              | Role                            | Operation                                                  |
| ------------------ | ------------------------------- | ---------------------------------------------------------- |
| `survey_responses` | Crew (via Tier 2 INSERT policy) | INSERT (staff_submitted = TRUE, submitted_by = auth.uid()) |
| `survey_responses` | marketing_manager (reports:r)   | SELECT (WHERE staff_submitted = TRUE for staff tab)        |

### Design Decisions

- **Reuses `survey_responses`** — no new table. The `staff_submitted` boolean + `submitted_by` FK distinguish crew-captured feedback from guest self-service surveys. Both flow into the same analytics pipeline.
- **No new RPC** — direct INSERT via Server Action. The RLS policy enforces `staff_submitted = TRUE AND submitted_by = auth.uid()` on the row, preventing injection.
- **`survey_type = 'staff_captured'`** — new ENUM value added. Allows filtering without relying on the boolean alone.
- **Separate from incidents (WF-14)** — incidents are operational events requiring resolution (spill, theft, equipment failure). Guest feedback is sentiment data for marketing analysis — different audience, different action.

---

## Automated Cron Jobs Summary

| Job                               | Schedule (MYT)     | Function                             | What It Does                                                                      |
| --------------------------------- | ------------------ | ------------------------------------ | --------------------------------------------------------------------------------- |
| `nightly-attendance-sweep`        | 00:05 daily        | `execute_nightly_attendance_sweep()` | Scans yesterday's shifts: flags absent + missing_clock_out (skips leave/holidays) |
| `employment-sync`                 | 00:10 daily        | Edge Function `cron-employment-sync` | Auto-activate/terminate by contract dates + auto-lift expired suspensions         |
| `purge-expired-otps`              | Every 6 hours      | Direct DELETE                        | Removes expired OTP challenges                                                    |
| `daily-slot-generation`           | 00:15 daily        | `fn_generate_daily_slots()`          | Auto-generates time_slots per scheduler_config                                    |
| `booking-status-sweep`            | 23:30 daily        | `fn_booking_status_sweep()`          | Marks no-shows + completes finished experiences                                   |
| `daily-schedule-generation`       | 22:00 daily        | `rpc_generate_schedules(14)`         | Auto-generates shift_schedules from N-day roster templates (14 days ahead)        |
| `monthly-leave-accruals`          | 1st of month 00:30 | `rpc_run_monthly_accruals()`         | Credits leave entitlements per leave_policy_entitlements                          |
| `cancel-expired-pending-payments` | Every 15 min       | Direct UPDATE                        | Cancels abandoned pending_payment bookings                                        |
| `purge-expired-captured-photos`   | 02:00 daily        | Direct DELETE                        | Removes expired auto-captured photos                                              |

---
