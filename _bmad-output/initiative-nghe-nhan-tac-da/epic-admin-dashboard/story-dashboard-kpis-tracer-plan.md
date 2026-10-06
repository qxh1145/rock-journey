---
title: 'Dashboard KPIs tracer'
type: 'feature'
ticket: '1'
created: '2026-10-06'
status: 'built'
baseline_revision: '5ec516ceb925c3a0f301e7e3f73092eb11fe41f3'
route: 'full'
route_source: 'auto'
risk: 'medium'
review: 'quick'
review_source: 'pinned'
lenses_ran: ['quick']
review_loop_iteration: 0
context: []
---

<frozen-after-approval reason="human-owned intent — do not modify unless human renegotiates">

## Intent

**Problem:** Admins have no overview of the event: `admin_get_dashboard` exists but is not called anywhere, it filters only by date, and its `total_players` ignores that filter. Later admin screens also have no shared filter shape to build on.

**Approach:** Replace `admin_get_dashboard` with a version that takes the shared admin filter (date range, session status, score range, prize status) and returns the eight §16A KPIs. Add a "Tổng quan" dashboard section as the first entry in `adminSections`, with a filter bar and KPI tiles, and export the filter type and its RPC-param mapper so later screens can reuse them.

## Boundaries & Constraints

**Decision (resume rate):** add `game_sessions.resume_count int not null default 0`, incremented when a player loads an existing IN_PROGRESS session; resume_rate = share of filtered sessions with resume_count > 0 (2dp, null when none). Counts only from deploy onwards.

**Always:** Non-admins get `FORBIDDEN` from the RPC. Every KPI respects every filter. Filters are server-side RPC params. UI text is in Vietnamese. Reuse `callRpc`, `message`, the `_has_role`/`_res` helpers and the existing `.admin*` CSS.

**Never:** No alerts (deferred until telemetry exists), no charts or time series (that is 4.9), no new npm dependency, no Supabase Realtime.

## I/O & Edge-Case Matrix

| Scenario | Input / State | Expected Output / Behavior | Error Handling |
|----------|--------------|---------------------------|----------------|
| No filter | seeded sessions | KPIs over all sessions | — |
| Date range | p_from/p_to | only sessions with started_at in [from,to), `total` included | — |
| Session status | `IN_PROGRESS` / `COMPLETED` | counts restricted to that status | invalid value → `INVALID_INPUT` |
| Score range | p_score_min/max | sessions with correct_count in range | min>max → `INVALID_INPUT` |
| Prize status | `NOT_ELIGIBLE` / `UNCLAIMED` / `CLAIMED` | restricted accordingly | invalid → `INVALID_INPUT` |
| Empty result | filters match nothing | zeros, avg_score null, UI shows "—" | — |
| Non-admin | player uid | `FORBIDDEN` | UI shows the forbidden screen |

</frozen-after-approval>

## Code Map

- `supabase/migrations/20261005000000_init.sql:339-361,401` -- current `admin_get_dashboard(p_from,p_to)` and its grant. `_has_role` and `_res` are near line 122. `game_sessions` (one row per player): `status`, `correct_count`, `qualified_for_reward` (generated), `reward_claimed`, `started_at`.
- `supabase/migrations/20261005020000_drop_staff_role.sql` -- the pattern for drop and re-create plus re-grant.
- `supabase/tests/smoke.sql` -- plain psql `DO $$ assert $$`, user set via `set_config('test.uid',…)`. The dashboard is only checked for `OK` at about line 40. CI runs it in `.github/workflows/deploy.yml:23-26`.
- `web/src/admin/AdminApp.tsx:10-13` -- `adminSections` slot registry. The dashboard goes first.
- `web/src/admin/ExportSection.tsx` -- an existing filter UI to copy conventions from (it does not have to use the new shape yet).
- `web/src/admin/admin.test.tsx` -- Vitest mocking pattern for `../game` and `../lib/supabase`.
- `web/src/style.css` -- `.admin`, `.muted`, `.primary`.

## Tasks & Acceptance

**Execution:**
- [ ] `supabase/migrations/20261006030000_dashboard_filters.sql` -- drop the old function. Create `admin_get_dashboard(p_from, p_to, p_status text, p_score_min int, p_score_max int, p_prize text)`, all params default null. Validate inputs. Build one filtered CTE over game_sessions and compute `total, in_progress, completed, resume_rate, avg_score, eligible, unclaimed, claimed`. Grant to authenticated. -- one source of truth for the filter
- [ ] same migration -- add `resume_count` and increment it in the player RPC that returns an existing IN_PROGRESS session (find it via `grep -n IN_PROGRESS supabase/migrations/*.sql`; re-create that function with only this change)
- [ ] `supabase/tests/smoke.sql` -- seed several sessions. Assert the exact KPIs for no filter and for each filter, `INVALID_INPUT` on bad input, and `FORBIDDEN` for a player. -- the ticket's verify
- [ ] `web/src/admin/filters.ts` -- `AdminFilter` type, `emptyFilter`, and `toRpcParams(f)`. -- the shared shape later screens import
- [ ] `web/src/admin/DashboardSection.tsx` -- filter bar (date inputs, selects, number inputs) and 8 tiles. It refetches when the filter changes, calls `onForbidden` on FORBIDDEN, and shows `message` on other errors.
- [ ] `web/src/admin/AdminApp.tsx` -- register `{id:'dashboard', label:'Tổng quan'}` first.
- [ ] `web/src/admin/dashboard.test.tsx` -- renders the tiles from a mocked RPC and checks that a filter change re-calls the RPC with the mapped params.
- [ ] `web/src/style.css` -- a small tile grid.

**Acceptance Criteria:**
- Given an admin on /admin, when the page loads, then the "Tổng quan" section shows 8 KPI tiles from the server.
- Given the dashboard, when the admin changes any filter, then the tiles update to the filtered numbers.
- Given the old two-argument call shape, when a client calls with only p_from/p_to, then it still works because the new params default to null.

## Implementation Notes

## Plan Change Log

## Design Notes

Prize status is derived: `NOT_ELIGIBLE` = not qualified_for_reward; `UNCLAIMED` = qualified and not claimed; `CLAIMED` = reward_claimed. Score means `correct_count`. `avg_score` is over COMPLETED rows only, as now. `total` counts filtered sessions, not all players. This fixes the unfiltered `total_players`. Rename `qualified` to `eligible` to match §16A. Nothing reads the old keys.

## Verification

**Commands:**
- `dropdb --if-exists rj_test; createdb rj_test && psql rj_test -v ON_ERROR_STOP=1 -f supabase/tests/stub_auth.sql $(printf -- '-f %s ' supabase/migrations/*.sql) -f supabase/tests/smoke.sql` -- expected: exit 0
- `cd web && npm test && npx tsc --noEmit` -- expected: all pass

## Review Triage Log

| # | Finding | Verdict | Route | Evidence |
|---|---------|---------|-------|----------|
| 1 | DashboardSection keeps stale tiles after a failed refetch | medium | patch | Error branch only calls setError; kpis keeps the previous data, breaking "tiles update" AC. |
| 2 | No client-side min ≤ max check | low | reject | Server returns INVALID_INPUT and the message is shown; with #1 fixed the tiles clear. |
| 3 | resume_count goes up on every get_current_session load (retries, refreshes) | low | defer | Matches plan wording; rate only checks >0, but an error-retry during a single visit still counts as a resume. |
| 4 | get_current_session lost `stable` | low | reject | Required for the UPDATE; commented in the migration; the only fix would be a plan edit. |
| 5 | Prize KPIs vs the p_prize definition | false | reject | CHECK in init.sql guarantees reward_claimed ⇒ qualified_for_reward. |
| 6 | Smoke lacks zero-arg non-admin and combined from+to coverage | low | reject | Non-admin FORBIDDEN is already asserted; from and to are each tested. |
| 7 | Smoke seed fragile / date-dependent | false | reject | now() > 2026-06-01 always holds from here on; seed emails don't collide with existing rows. |
| 8 | dashboard.test lacks error-message and re-render assertions | low | reject | Behaviour is simple; adding tests is beyond a direct correction. |
| 9 | Date boundaries use the browser timezone | low | reject | Intentional and commented; the admins are in one locale. |
| 10 | Score inputs allow decimals sent to an int param | low | patch | Direct correction: step={1}. |
| 11 | admin.test relies on data: [] for the dashboard mock | low | reject | Tests pass; cosmetic. |
| 12 | Duplicate frontmatter keys in the plan | false | reject | Already removed before review finished. |
