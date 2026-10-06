---
title: 'Mark prize given'
type: 'feature'
ticket: '2'
created: '2026-10-06'
status: 'built'
baseline_revision: '34d69ae3423fb3e7abda28ea20168d319aa42b71'
route: 'oneshot'
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

**Problem:** An admin can find a winner on /admin but cannot record the prize handout; FR-14 needs it marked exactly once with an audit row.

**Approach:** Add a "Trao quà" button on qualified, unclaimed rows in `LookupSection`; after native `confirm()` it calls the existing `admin_claim_reward(p_session_id, p_request_id)` with a fresh `crypto.randomUUID()`, then updates the row from the returned session. `OK` → "Đã trao", `ALREADY_CLAIMED` (ok=true per epic decision) → "Người này đã nhận quà trước đó" and row shows Đã trao, `FORBIDDEN` with data (not qualified) → its message; any other failure shows message. The RPC is already atomic (`for update` row lock), so no migration; extend `smoke.sql` to assert one audit row after OK and none extra after the repeat claim.

</frozen-after-approval>

## Implementation Notes

Oneshot: ~70 lines across LookupSection, its tests, and smoke.sql; the RPC already exists and is correct.
After a claim the list is re-searched instead of patched in place, because `_session_json` has no `reward_claimed_at`. The repeat-claim path was checked with sequential calls only; the concurrent case relies on the `for update` lock and has no test.

## Plan Change Log

## Review Triage Log

| # | Finding | Verdict | Route | Evidence |
|---|---------|---------|-------|----------|
| 1 | Refresh after a claim uses the current input, not the last search | medium | patch | `load()` read the live `query`. Fixed: it now uses `lastQuery`. |
| 2 | Refresh replaces in-place update; notice and error can appear together | low | reject | The refresh is needed because `_session_json` has no `reward_claimed_at` (noted under Implementation Notes). The notice next to an error happens only when the refresh fails, which is rare. |
| 3 | FORBIDDEN without data (non-admin) shown as a message | low | patch | Now calls `onForbidden()` when `!res.data`. |
| 4 | Tests cover only ALREADY_CLAIMED | low | reject | Helpers are tested; the SQL smoke test covers OK and the repeat claim; more DOM tests would mostly test mocks. |
| 5 | `unstubAllGlobals` is not in `afterEach` | low | patch | Moved into `afterEach`. |
| 6 | Smoke comment claims concurrency is tested | low | patch | Comment reworded. |

## Verification

**Commands:**
- `cd web && npm run typecheck && npm test && npm run build` -- expected: all pass.
- smoke.sql run (see header of the file) -- expected: ALL PASS, if local Postgres available.

**Manual checks (if no CLI):**
- Staging: admin marks a seeded winner from a phone; second tap shows "đã nhận".
