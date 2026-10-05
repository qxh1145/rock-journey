---
title: 'Decide audit_logs shape'
type: 'chore'
ticket: '3'
created: '2026-10-05'
status: 'built'
baseline_revision: 'aeab50c9a08a930aa2899cf72573acb5af96b7c0'
route: 'oneshot'
route_source: 'auto'
risk: 'low'
review: 'quick'
review_source: 'pinned'
lenses_ran: ['quick']
review_loop_iteration: 0
context: ['{project-root}/PRD-nghe-nhan-tac-da.md', '{project-root}/docs/admin-auth.md']
---

<frozen-after-approval reason="human-owned intent — do not modify unless human renegotiates">

## Intent

**Problem:** PRD §17 `AuditLog` (`auditId, actorId, action, sessionId, before, after, createdAt, requestId, metadata`) conflicts with §18 and the live `audit_logs` table (`id, actor_id, actor_email, action, target_type, target_id, before_json, after_json, created_at, request_id`), and no rule says how audited actions fill it.

**Approach:** Write `docs/audit-logs.md` that adopts the §18 shape exactly as the table stands (no migration): column meanings, how §17 fields map (`sessionId` → `target_type = 'game_session'` + `target_id`; `metadata` → `after_json`), the action naming and the existing writers. Link it from PRD §17 `AuditLog`.

**Decisions (user, 2026-10-05):**
- Shape is §18 as-is; no `metadata` column, no new FK, no migration.

</frozen-after-approval>

## Implementation Notes

Oneshot: one ~45-line doc plus a PRD link; no code.

Evidence:
- Table at `supabase/migrations/20261005000000_init.sql:81`; RLS on, no policies → only `security definer` RPCs write it.
- Live writers: `admin_claim_reward` (`20261005020000_drop_staff_role.sql:50`, action `reward_claimed`, target `game_session`, before/after) and `admin_export_report` (`init.sql:387`, action `report_exported`, target `report`, filters + `row_count` in `after_json`). The init.sql:331 writer belongs to dropped `staff_claim_reward`.
- `request_id` is `unique` and nullable; a reused id raises a unique violation.
- Doc style mirrors `docs/admin-auth.md`.

## Verification

**Manual checks:**
- `grep -n "insert into audit_logs" supabase/migrations/*.sql` — every writer in a live function appears in the doc's writers table with matching action and target_type.

## Review Triage Log

Quick review, pass 1. Results: 0 high, 2 medium, 0 low, 0 false.
- medium, patched: the `request_id` row described a pre-insert check that neither live writer performs. The row now states the actual behavior (a reused key fails with a unique violation) and limits the check to new writers.
- medium, patched: the doc claimed §18 matches the table and left out §18's `actor_id` → `auth.users` FK bullet. The doc now records that the FK is deliberately left out.
