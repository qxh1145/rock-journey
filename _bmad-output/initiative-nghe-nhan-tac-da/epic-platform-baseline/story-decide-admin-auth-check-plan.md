---
title: 'Decide admin-auth check'
type: 'chore'
ticket: '2'
created: '2026-10-05'
status: 'built'
baseline_revision: '0578573836c99357ad31ef204dbfdd9fbbf36bf5'
route: 'oneshot'
route_source: 'auto'
risk: 'low'
review: 'quick'
review_source: 'pinned'
lenses_ran: ['quick']
review_loop_iteration: 0
context: ['{project-root}/PRD-nghe-nhan-tac-da.md', '{project-root}/docs/rpc-error-codes.md']
---

<frozen-after-approval reason="human-owned intent — do not modify unless human renegotiates">

## Intent

**Problem:** PRD §14/§17 say admin rights live in `admin_roles` and that the default role is `player`, but `admin_roles.role` only allows `'admin'`, and nothing records the exact check later epics' admin RPCs and admin UI must use.

**Approach:** Write one short contract doc that states the admin rule (row in `admin_roles` with `user_id = auth.uid()`, `active`, `role = 'admin'`, checked server-side via `_has_role('admin')` as the first statement of every `admin_*` RPC), defines "player" as any authenticated user without such a row (never stored), and covers granting/revoking and the client's role. Confirm the four existing admin RPCs follow it. This story records the rule; it changes no migration.

**Decisions (user, 2026-10-05):**
- Revocation sets `active = false` and stamps `revoked_at` for audit; the check reads `active` only.
- The contract lives in `docs/admin-auth.md`, linked from PRD §14.

</frozen-after-approval>

## Implementation Notes

Oneshot: one markdown doc of ~40 lines plus a PRD link; no code.

Evidence:
- `_has_role(p_role)` at `supabase/migrations/20261005020000_drop_staff_role.sql:6`: `security definer`, `user_id = auth.uid() and active and role = p_role`. Not executable by clients (revoked at `20261005000000_init.sql:396`; `create or replace` keeps that).
- `admin_roles` at `20261005000000_init.sql:71`; role check narrowed to `'admin'` at `20261005020000_drop_staff_role.sql:4`. RLS on, no policies → clients cannot read or write it. `revoked_at` exists but the check ignores it.
- All four live admin RPCs open with `if not _has_role('admin') then return _res(false, 'FORBIDDEN', ...)`, are `security definer`, granted to `authenticated` only: `admin_get_dashboard` (init:342), `admin_export_report` (init:368), `admin_search_players` (drop_staff:17), `admin_claim_reward` (drop_staff:38).
- `web/src` has no admin UI or admin check yet.
- Doc style: mirror `docs/rpc-error-codes.md`; PRD §19 already links that doc.

## Verification

**Manual checks:**
- `grep -n "function public.admin_" supabase/migrations/*.sql` — every listed RPC appears in the doc's compliance table, and each one's first statement is the `_has_role('admin')` guard.

## Review Triage Log

Quick review, pass 1. Results: 0 high, 2 medium, 2 low, 0 false. One low was rejected.
- medium, patched: the doc said an existing admin can grant, but `admin_roles` has no policies and there is no grant RPC. It now says grants go through the service role until an RPC exists.
- medium, patched: `user_id` is the PK, so re-granting after a revoke cannot insert a row. A Re-grant bullet now says to update the row, and that the history comes from `audit_logs`.
- low, patched: the audit sentence read as if it were already enforced. It is now worded as a requirement on whoever adds the grant/revoke RPC.
- low, patched: the PRD link was plain text in the middle of the sentence. It is now a Markdown link at the end of the bullet.
- low, rejected: §17 `AdminRole` still says "Role mặc định `player`" without a pointer. The decision only asked for a link from §14, and the doc explains the term.
