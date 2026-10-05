---
title: 'Admin shell and email lookup tracer'
type: 'feature'
ticket: '1'
created: '2026-10-06'
status: 'built'
baseline_revision: '509494afeb2e3d37f2328e23b85570e3b3b40bd0'
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

**Problem:** Admins have no web surface; prize-desk and admin-dashboard need a gated /admin entry, and the first job is finding a player by email on a phone.

**Approach:** Path-based switch in `main.tsx` renders an `AdminApp` at `/admin`: it checks the session, shows a shell with a nav driven by a plain section list (the slot later epics append to), and a lookup section over the existing `admin_search_players` RPC. Backend gate already exists; add the missing non-admin SQL assert.

## Boundaries & Constraints

**Always:** Authorization is enforced by the RPC (`FORBIDDEN`); the client gate is UX only. Reuse `callRpc` and global `style.css` classes. Mobile-first (usable at 360px width). Vietnamese UI copy.

**Never:** No router library or new dependency. No prize-claim action (entry 2) or export (entry 3). No new migration — `admin_search_players` is unchanged. No new client-side admin role check beyond calling the RPC.

## I/O & Edge-Case Matrix

| Scenario | Input / State | Expected Output / Behavior | Error Handling |
|----------|--------------|---------------------------|----------------|
| Admin search | admin session, query `p1` | rows: email, score `correct_count/12`, title "Mầm Nghề" when `qualified_for_reward`, prize status (Đã trao + time / Chưa trao / Không đủ điều kiện) | none |
| No match | admin, unknown email | "Không tìm thấy người chơi" | none |
| Non-admin | player session opens /admin | RPC returns FORBIDDEN → "Không có quyền truy cập" screen, no search UI | no data shown |
| Signed out | no session at /admin | prompt to sign in (reuse existing login flow), then return to /admin | — |
| Empty query | blank input | search button disabled | — |
| Player without session | player row, `status` NONE | shows "Chưa chơi", no title | — |

</frozen-after-approval>

## Code Map

- `web/src/main.tsx` -- App root; `screen` state L23, renders L225-245, auth bootstrap L56-60 (`getSession`), `onAuthStateChange` L91. Add early `location.pathname === '/admin'` branch rendering `AdminApp`; do not touch player flow.
- `web/src/game.ts` -- `callRpc<T>(name,args)` L40, `rpcAction(code)` ~L48. Reuse; don't change.
- `web/src/lib/supabase.ts` -- shared client.
- `web/src/components/TopBar.tsx` -- `TopBar`/`AvatarMenu`; reuse for shell header if it fits, else plain header.
- `web/src/style.css` -- global classes (`screen`, `center`, `muted`, `primary`, `footnote`).
- `supabase/migrations/20261005020000_drop_staff_role.sql` L14-32 -- `admin_search_players(p_email)` returns `{ok,code,data:[{player_id,email,session_id,status,correct_count,answered_count,completed_at,qualified_for_reward,reward_claimed,reward_claimed_at}]}`, capped 50. Title not returned: derive from `qualified_for_reward` (same rule as `_session_json`, `20261005010000_title_mam_nghe.sql`).
- `supabase/tests/smoke.sql` L29-32 -- non-admin assert for claim exists at L29; admin search at L32.
- No `vercel.json` exists; Vercel Git integration deploys `web/`, so direct load of `/admin` 404s without an SPA rewrite.

## Tasks & Acceptance

**Execution:**
- [ ] `supabase/tests/smoke.sql` -- after L29 add `assert admin_search_players('p1')->>'code' = 'FORBIDDEN';` -- ticket verify.
- [ ] `web/vercel.json` -- rewrite `/admin` to `/index.html` -- deep link works on Vercel.
- [ ] `web/src/admin/AdminApp.tsx` -- session check, FORBIDDEN/sign-in states, shell with header + nav from exported `adminSections: {id,label,render}[]` and active-section state -- the registration slot for epic-admin-dashboard.
- [ ] `web/src/admin/LookupSection.tsx` -- email input + results list per matrix; pure `prizeStatus(row)` / `titleOf(row)` helpers exported.
- [ ] `web/src/admin/lookup.test.ts` -- vitest for `prizeStatus`/`titleOf` over matrix rows.
- [ ] `web/src/main.tsx` -- path branch to `AdminApp`.
- [ ] `web/src/style.css` -- minimal admin shell/list styles.

**Acceptance Criteria:**
- Given the smoke run, when a non-admin calls `admin_search_players`, then it returns FORBIDDEN and the whole smoke passes.
- Given an admin on a 360px viewport, when they open /admin directly and search a seeded email, then the player row shows score, title and prize status without horizontal scroll.
- Given epic-admin-dashboard adds an entry to `adminSections`, when /admin loads, then a new nav item appears with no shell change.

## Implementation Notes

## Plan Change Log

## Verification

**Commands:**
- `cd web && npm run typecheck && npm test && npm run build` -- expected: all pass.
- `psql rj_test -v ON_ERROR_STOP=1 -f supabase/tests/stub_auth.sql $(ls supabase/migrations/*.sql | sed 's/^/-f /') -f supabase/tests/smoke.sql` -- expected: exit 0 (if local Postgres available).

**Manual checks (if no CLI):**
- Staging: admin finds seeded player by email; non-admin at /admin sees no-access screen.

## Review Triage Log

| # | Finding | Verdict | Route | Evidence |
|---|---------|---------|-------|----------|
| 1 | Non-admin sees search UI until first search | medium | patch | `forbidden` is only set inside `LookupSection.search()`; the matrix row requires the no-access screen on open. Fixed with an RPC probe on mount. |
| 2 | New dev dependencies `@testing-library/react` and `jsdom` | false | reject | The user explicitly chose to add DOM tests for the uncovered matrix rows. They are dev-only. |
| 3a | `/admin` redirect must be on the Supabase redirect allowlist | maybe-false (medium) | defer | Supabase dashboard config, which the repo can't show. Settled by checking the Auth URL config on staging. |
| 3b | Admin `signIn` ignores the returned error | low | reject | OAuth errors redirect away before any return value is used, so this is rare; a fix would add error state. |
| 4 | `vercel.json` does not rewrite `/admin/` | low | patch | `main.tsx` accepts the trailing slash but the rewrite only matched `/admin`. Direct correction. |
| 5a | Expired session has no route back to sign-in | low | reject | supabase-js refreshes tokens, and sign-out fires `onAuthStateChange`, which shows the sign-in screen. A fix would add a branch. |
| 5b | Old results stay visible after a failed search | low | patch | `rows` is never reset on error. One-line `setRows(null)`. |
