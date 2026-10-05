---
title: 'Decide RPC error-code contract'
type: 'chore'
ticket: '1'
created: '2026-10-05'
status: 'built'
baseline_revision: 'NO_VCS'
route: 'oneshot'
route_source: 'auto'
risk: 'low'
review: 'quick'
review_source: 'pinned'
lenses_ran: ['quick']
review_loop_iteration: 0
context: ['{project-root}/PRD-nghe-nhan-tac-da.md']
---

<frozen-after-approval reason="human-owned intent — do not modify unless human renegotiates">

## Intent

**Problem:** PRD §19 lists ten stable RPC codes, but the migrations return three unlisted success codes (`NONE`, `OK`, `ALREADY_CLAIMED`), never return `RATE_LIMITED`, and reuse several codes outside their PRD meaning. Nothing records the contract later epics must follow.

**Approach:** Write one contract doc with a table of every code (meaning, `ok` value, which RPCs return it, how the client reacts) that covers every existing RPC. Record each mismatch with a decision. This story only records the contract. It does not change migrations or the client.

**Decisions (user, 2026-10-05):**
- The table includes success codes (`OK`, `NONE`, `ALREADY_CLAIMED`, `IN_PROGRESS`, `COMPLETED`), each tagged with its `ok` value.
- Overloaded uses get precise new codes: `NOT_FOUND`, `INVALID_INPUT`, `NOT_CONFIGURED`. Moving the migrations onto them is a deferred-work entry.
- `RATE_LIMITED` stays, marked reserved until RPC rate limits ship.
- The contract lives in `docs/rpc-error-codes.md`, and PRD §19 links to it.

</frozen-after-approval>

## Implementation Notes

Oneshot: the deliverable is one markdown document of roughly 60–80 lines and touches no code.

Evidence:
- Every RPC returns its result through `_res(ok, code, message, data)` at `supabase/migrations/20261005000000_init.sql:117`. No migration raises a Postgres exception.
- Live RPCs and the codes they return:
  - `get_current_session`: `UNAUTHENTICATED`, `NONE`
  - `start_session`: `UNAUTHENTICATED`, `FORBIDDEN`, `DATABASE_UNAVAILABLE`, `SESSION_ALREADY_EXISTS`, `OK`
  - `get_session_state`: `UNAUTHENTICATED`, `FORBIDDEN`
  - `submit_answer`: `UNAUTHENTICATED`, `INVALID_OPTION`, `FORBIDDEN`, `SESSION_COMPLETED`, `QUESTION_ALREADY_ANSWERED`, `QUESTION_OUT_OF_ORDER`
  - `get_result`: `CONFLICT`
  - `admin_get_dashboard`: `FORBIDDEN`
  - `admin_export_report`: `FORBIDDEN`
  - `admin_search_players`: `FORBIDDEN`
  - `admin_claim_reward`: `FORBIDDEN`, `CONFLICT`, `ALREADY_CLAIMED`

  `admin_search_players` and `admin_claim_reward` are in `20261005020000_drop_staff_role.sql`. The `staff_*` RPCs were dropped.
- The client is `web/src/main.tsx`. Line 32 retries on the `CONFLICT` list, line 81 shows the server message, and line 82 handles `NONE`.

## Verification

**Manual checks:**
- Every code returned by `grep -o "_res([^,]*, *'[A-Z_]*'" supabase/migrations/*.sql` appears in the doc's table.
- Every live RPC appears in the doc.

## Review Triage Log

Quick review, pass 1. Results: 0 high, 1 medium, 2 low, 2 false.
- medium, patched: the "Client reaction" column described behaviour the client doesn't have. It is renamed "Target client reaction", and a note now gives what `main.tsx` does today.
- low, patched: the coverage table's superscripts had no explanation. A legend line now says what they mean.
- low, patched: status codes come from `game_sessions.status`. A rule now requires updating the doc when that constraint changes.
- false: "FORBIDDEN for not-qualified is an unflagged overload". The FORBIDDEN row lists ineligibility on purpose. Refusing an action the caller isn't eligible for counts as "not allowed".
- false: "Doc shorter than estimate". The 60–80 line figure was an estimate, not an acceptance criterion.
