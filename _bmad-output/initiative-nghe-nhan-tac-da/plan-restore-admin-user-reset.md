---
title: 'Restore existing admin route and add user reset action'
type: bugfix
created: '2026-10-07'
status: in-review
baseline_revision: 'b4f033aa44be11fa5e3a951a2f2ce33d72ee91b7'
route: full
route_source: auto
risk: medium
review: quick
review_source: pinned
lenses_ran: [quick]
review_loop_iteration: 0
context: ['docs/admin-auth.md', 'docs/audit-logs.md', '/Users/quan/.codex/RTK.md']
---

<frozen-after-approval>
## Intent

The user corrected the implementation: preserve the existing `/admin` route and all its sections, and only add one Reset lượt chơi button within Người dùng. The previous deployment incorrectly used an old branch without admin. Restore the prior production application's full source from its actual Git revision, b4f033a, and integrate reset there. This managed worktree already starts from that revision, verified against Vercel's previous production deployment metadata.

Keep the previously requested shared admin account working. It already exists on production; add email/password sign-in within the existing `/admin` login page alongside Google. Do not add admin panels, buttons, or navigation to the player game at `/`.

## Boundaries

Preserve existing admin navigation, sections, filters, pagination, user details, exports and player screens. The only logged-in product addition is a Reset lượt chơi action for a user's session in the existing Người dùng table. Retain confirmation naming the affected email and warning that score/reward state is cleared. Preserve the previously implemented server-only authorization, exact session identity, audit and idempotent retry. Never reset a real user's session as a test. The user's prior production deployment authorization persists and their current correction authorizes repairing production; parent performs deployment after verification.

## I/O Matrix

| Case | Expected behavior |
|---|---|
| `/admin` and `/admin/` | Existing admin login/navigation, never player game |
| Shared account login | Password authentication on `/admin`, then existing admin sections |
| User with current session | One Reset lượt chơi button beside existing user fields |
| Confirm reset | Capture exact session UUID via admin_get_user_detail; call existing admin_reset_player_progress; refresh list with filters/page retained |
| Cancel | No mutation |
| No session | Disabled/absent reset; no mutation |
| Lost reset response | Keep same session UUID and request ID on retry; never silently target a replacement session |
| Stale session / permission denied | Display/refetch conflict or invoke onForbidden; no false success |
| Double click | One mutation request pending |
| Existing details/filter/export/nav | Continue to behave as before |
</frozen-after-approval>

## Code Map

- `web/src/main.tsx` already routes `/admin` and `/admin/` to AdminApp. Leave this routing and the player game intact.
- `web/vercel.json` contains SPA rewrites for direct navigation; preserve.
- `web/src/admin/AdminApp.tsx` contains six original admin sections and Google login. Add shared-account password fields here or a small dedicated component using Supabase signInWithPassword. Do not use the prior separate reset/sign-in panels from the other branch.
- `web/src/admin/UsersSection.tsx` uses admin_search_users, filters/page state and detail view. Rows contain player_id but no session_id. admin_get_user_detail returns session.session_id through _session_json. Read the exact session when initiating reset, then confirm and retain the UUID/request ID through failures.
- `web/src/admin/LookupSection.tsx` demonstrates existing native confirm and pending claim patterns. Match its simple appearance for the new row button.
- `web/src/admin/users.test.tsx`, `admin.test.tsx`: existing jsdom Testing Library tests; extend meaningfully for reset/login and preservation.
- `web/package.json` and lock already contain all existing admin dependencies; do not replace with the old branch's files.
- `/Users/quan/Work/rock-journey/supabase/migrations/20261007115652_admin_reset_player_progress.sql` is the audited, tested function already deployed to production. Copy it verbatim into this worktree for migration continuity. No new SQL function or migration needed.
- Production shared account admin@hotmail.com already exists and has active admin role; parent verified credentials. Never embed credentials or privileged keys in application/tests/config.

## Tasks & Acceptance

- [x] `web/src/admin/UsersSection.tsx`: one row reset button, exact-session confirmation, loading/error/success, stable retries and refreshed list. Preserve filter/page and details.
- [x] `web/src/admin/AdminApp.tsx`: email/password login alongside Google on existing admin page; handle loading/failure; reset stale forbidden state on auth changes.
- [x] Tests adjacent to admin components: success/cancel/no-session/forbidden/stale/double-click/network retry; existing filter/detail/nav behavior; password login success/error.
- [x] Copy existing reset migration into this worktree; no production database change needed.
- [x] Preserve player UI and `/admin` rewrite from baseline; verify route in browser with controlled RPCs.

Given `/admin`, navigating/reloading must show Quản trị and its six original sections after authentication. Given a user with progress, confirming reset must call the existing RPC for their exact session and refresh only progress data. Given cancelled confirmation or a user without progress, no reset request is sent. Given a response lost after server completion, retry reuses the same target and key. Given the root URL, the original game is displayed with no newly inserted admin panel.

## Implementation Notes

This is a correction of the already approved implementation, not a new approval gate. Parent owns review and production deployment; implementer should only edit and test this worktree. Do not re-render workflows or commit/push. Use rtk for shell commands. Do not touch the original dirty checkout at /Users/quan/Work/rock-journey.

## Verification

- `rtk npm ci`, then `rtk npm run build` and `rtk npm test` from web.
- Controlled browser check at `/admin`, `/admin/`, and `/`; add route regression coverage as practical.
- Parent verifies deployed `/admin` login and Users rows read-only with existing shared admin account.

## Review Triage Log

## Implementer verification

- `rtk npm ci`: completed, zero vulnerabilities.
- `rtk npm run build`: passed.
- `rtk npm test`: 43 tests passed across 10 files, including reset cancellation, missing session, conflict, forbidden, double click, exact-target retry, filter/page preservation, password login and auth-state recovery.
- Controlled Playwright: 3 tests passed for `/admin`, `/admin/`, and `/`; all Supabase requests in authenticated route checks were intercepted.
- Copied reset migration compared byte-for-byte with original using `cmp`.
- Existing player source, routing and Vercel rewrites remain untouched. Parent owns production deployment and read-only verification.
- Unresolved retry identity is retained across admin section navigation and scoped to the signed-in account; reloading clears client pending state.

### Review triage
- medium / patch: unresolved request map is local to UsersSection and lost on tab navigation; verified AdminApp unmounts sections. Lift request ownership to account-scoped AdminApp and test return/retry.
- low / patch: list fetch recovery preserves stale loading error; separate list error from action errors and clear after success.
- low / patch: RPC/audit inventory required by context docs missing; register deployed function and writer.
