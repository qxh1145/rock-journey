---
title: 'User search and detail'
type: 'feature'
ticket: '2'
created: '2026-10-06'
status: 'built'
baseline_revision: 'ddc5b8b2f4bc8bb41e9bae808811bb61fd64c0bf'
route: 'full'
route_source: 'auto'
review: 'quick'
review_source: 'pinned'
lenses_ran: ['quick']
risk: 'medium'
review_loop_iteration: 0
context: []
---

<frozen-after-approval reason="human-owned intent — do not modify unless human renegotiates">

## Intent

**Problem:** Admins can only look up a player by email (`admin_search_players`, capped at 50 rows, no filters). They cannot browse users with the dashboard filters or see one user's progress and answers (FR-18). The §19 RPCs `admin_search_users` and `admin_get_user_detail` do not exist yet.

**Approach:** Add `admin_search_users`, a paginated search that takes an email substring plus the shared admin filter from 4.1. Add `admin_get_user_detail`, which returns the profile, session, and answers. Add a "Người dùng" admin section with a filtered user list. Clicking a row opens a read-only detail view.

## Boundaries & Constraints

**Always:** Non-admins get `FORBIDDEN` from both RPCs. Filters reuse `AdminFilter`/`toRpcParams` from 4.1 and are validated server-side the same way (`INVALID_INPUT`). Pagination is server-side with a fixed page size of 20, and the response returns the total count. UI text is in Vietnamese. Reuse `callRpc`, `message`, `_has_role`, `_res`, and the existing `.admin*` CSS.

**Never:** No read-audit row for the detail view (epic decision). No edits, lock, or anonymize actions (that is entry 3). Keep `admin_search_players` and the Lookup section unchanged. No new npm dependency.

## I/O & Edge-Case Matrix

| Scenario | Input / State | Expected Output / Behavior | Error Handling |
|----------|--------------|---------------------------|----------------|
| No filter, page 1 | seeded players | first 20 rows ordered by email, `total` = all players including those without a session | — |
| Email substring | `p_q='p3'` | matching players only; `%`/`_` escaped | — |
| Session filter set | any of status/score/prize/date | only players whose session matches; players without a session excluded | invalid value or min>max → `INVALID_INPUT` |
| Page beyond end | `p_page` past last | `rows: []`, `total` unchanged | `p_page < 1` → `INVALID_INPUT` |
| Detail, played | player id | profile + session (incl. resume_count, reward fields) + answers ordered by question_index with prompt, selected option text, is_correct, answered_at | — |
| Detail, never played | player id, no session | profile, `session: null`, `answers: []` | — |
| Detail, unknown id | random uuid | — | `NOT_FOUND` |
| Non-admin | player uid | `FORBIDDEN` from both | UI shows the forbidden screen |

</frozen-after-approval>

## Code Map

- `supabase/migrations/20261006030000_dashboard_filters.sql` -- the filter validation and `where` clause to copy (prize derivation via `case`), plus the revoke/grant pattern.
- `supabase/migrations/20261005020000_drop_staff_role.sql:14-30` -- `admin_search_players`: email `like` escaping to reuse.
- `supabase/migrations/20261005000000_init.sql:28-68,131` -- `players`, `game_sessions`, `answers`, `questions` (the `options` jsonb holds `{id,text}`), and `_session_json(s)` for the session payload. Join questions on `(question_set_version, question_id)`.
- `supabase/tests/smoke.sql` -- the second `DO` block already seeds P1 (COMPLETED 10/12, claimed), P3–P5, and the admin user. Append a new block after it.
- `web/src/admin/filters.ts` -- `AdminFilter`, `emptyFilter`, `toRpcParams`. Leave unchanged.
- `web/src/admin/DashboardSection.tsx:41-55` -- the inline filter bar. Extract it so both sections share it.
- `web/src/admin/AdminApp.tsx:10-14` -- `adminSections`. Add the users section after the dashboard.
- `web/src/admin/LookupSection.tsx` -- `prizeStatus`/`PlayerRow` are similar but tied to the old RPC. Don't change them.
- `web/src/admin/dashboard.test.tsx` -- the Vitest mocking pattern to copy.

## Tasks & Acceptance

**Execution:**
- [ ] `supabase/migrations/20261006040000_admin_users.sql` -- `admin_search_users(p_q text, p_from, p_to, p_status, p_score_min, p_score_max, p_prize, p_page int default 1)` returns `{total, page, page_size, rows:[{player_id,email,display_name,locked,status('NONE' when no session),correct_count,answered_count,started_at,completed_at,prize}]}`. `admin_get_user_detail(p_user_id uuid)` returns `{profile, session, answers}`. Revoke from public/anon and grant to authenticated.
- [ ] `supabase/tests/smoke.sql` -- new block: assert the exact total and rows for no filter, email, status, and prize filters; page 2 empty with page size 20; `INVALID_INPUT` for a bad status and `p_page=0`; detail for P1 (12 answers, q3 wrong); P3 detail without answers; `NOT_FOUND`; `FORBIDDEN` for a player on both RPCs.
- [ ] `web/src/admin/FilterBar.tsx` -- move the filter bar out of DashboardSection: `{value, onChange}` props, same labels and markup.
- [ ] `web/src/admin/DashboardSection.tsx` -- use `<FilterBar>`, no behavior change.
- [ ] `web/src/admin/UsersSection.tsx` -- email search box + FilterBar + table + Trước/Sau pager ("Trang x/y · N người"). Clicking a row loads the detail view: profile, session summary, and an answers table (câu, nội dung, đã chọn, đúng/sai, thời gian), plus a "← Danh sách" back button that keeps the filter and page. Handle FORBIDDEN → `onForbidden`, other errors → `message`.
- [ ] `web/src/admin/AdminApp.tsx` -- register `{id:'users', label:'Người dùng'}` second.
- [ ] `web/src/admin/users.test.tsx` -- list renders from the mocked RPC; a filter change re-calls with `toRpcParams` + `p_q` + `p_page:1`; Sau requests page 2; a row click calls detail and shows the answers; FORBIDDEN calls `onForbidden`.

**Acceptance Criteria:**
- Given an admin on /admin, when they open "Người dùng", then a paginated list of users with status, score, and prize appears.
- Given the list, when the admin changes the email or any filter, then the list reloads from page 1 with matching users.
- Given a seeded player who answered questions, when the admin clicks that row, then their profile, progress, and every answer with correct/incorrect are shown read-only.
- Given the dashboard after the refactor, when filters change, then it behaves as before (existing dashboard tests pass).

## Implementation Notes

## Plan Change Log

## Review Triage Log

| # | Finding | Verdict | Route | Evidence |
|---|---------|---------|-------|----------|
| 1 | List rendered as `<ul>`, not a table; started/completed omitted | medium | patch | Plan task says "table"; RPC returns started_at/completed_at that the UI drops. |
| 2 | `open()` has no stale-response guard | low | reject | Needs two rapid row clicks with out-of-order responses; the fix adds a guard (complexity). |
| 3 | Detail prints "Hoàn thành —" for IN_PROGRESS; no status fallback | low | patch | Unconditional render in the session line; a direct correction. |
| 4 | `p_page` > ~1e8 overflows the offset | low | reject | Needs a hand-crafted RPC call; the pager can't reach it. |
| 5 | `\` not escaped in the LIKE pattern | low | reject | Emails rarely contain `\`; same pattern as the existing admin_search_players. |
| 6 | No test for detail FORBIDDEN/error | low | reject | Plan asks only for FORBIDDEN → onForbidden, which is tested; this is a coverage nicety. |
| 7 | Hardcoded hex border color | false | reject | style.css already uses raw hex (e.g. `#d1d1d6`); no rule broken. |

## Design Notes

Search uses `players left join game_sessions`. When any session filter is set, the session predicate excludes rows with a null session, which is natural with the `is null or …` pattern plus a `s.id is not null` guard that applies only when a session filter is present. `total` comes from `count(*) over ()` or a separate count on the same CTE. `prize` uses the same derivation as the dashboard. The detail view shows the correct option because the viewer is an admin after play, so the §19 "no bulk answers before answering" rule does not apply.

## Verification

**Commands:**
- `dropdb --if-exists rj_test; createdb rj_test && psql rj_test -v ON_ERROR_STOP=1 -f supabase/tests/stub_auth.sql $(printf -- '-f %s ' supabase/migrations/*.sql) -f supabase/tests/smoke.sql` -- expected: exit 0
- `cd web && npm test && npx tsc --noEmit` -- expected: all pass
