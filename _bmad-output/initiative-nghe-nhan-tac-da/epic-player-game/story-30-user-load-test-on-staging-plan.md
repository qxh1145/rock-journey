---
title: '30-user load test on staging'
type: 'chore'
ticket: '10'
created: '2026-10-06'
status: 'built'
baseline_revision: '168431c299371da2756ecfa633a7a7ae5a7ee058'
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

**Problem:** Nobody has checked that the game backend keeps answers intact and allows one play per player when 30 people play at the same time (FR-04, FR-08, PRD §25).

**Approach:** One k6 script mints 30 throwaway staging users, runs them concurrently through `start_session` → 12×`submit_answer` → `get_result`, deliberately races a duplicate start and duplicate answer submits, then counts the rows in the DB, asserts the results and cleans up.

**Decision:** k6 is installed locally with `brew install k6`. The agent verifies with `k6 inspect`. The human runs the real staging load, because it needs the service-role key.

## Boundaries & Constraints

**Always:** Target staging (`awvaujmkbstkpsbaxpku`) only. Read keys from env (`SUPABASE_ANON_KEY`, `SUPABASE_STAGING_SERVICE_ROLE_KEY`). Never hardcode them. Delete every user the run created, even when the run fails, in this order: answers → game_sessions → players → auth user. Failed checks fail the k6 exit code through `thresholds`.

**Never:** Run against production. Add npm deps or a Node runner, since k6 does it all over plain HTTP. Change the SQL/RPCs. File the backlog bugs automatically (a human files them from the report).

## I/O & Edge-Case Matrix

| Scenario | Input / State | Expected Output / Behavior | Error Handling |
|----------|--------------|---------------------------|----------------|
| Happy journey | 30 VUs, 1 iteration each | each player ends with 1 session, 12 answers, `get_result` ok | check fails → threshold fails |
| Double start race | `http.batch` of 2× `start_session` | exactly one session row; both responses carry the same `session_id` (or one `SESSION_ALREADY_EXISTS`) | counted as a failure in `dup_violations` |
| Duplicate answer race | `http.batch` of 2× `submit_answer` with the same idempotency key | both ok with the same `answer_id`; `answered_count` +1 only | as above |
| Lost answer | DB count ≠ 12 for a player | teardown reports the player id and the count | `lost_answers` > 0 → exit non-zero |

</frozen-after-approval>

## Code Map

- `supabase/migrations/20261005000000_init.sql` -- RPCs: `start_session` (:166, `on conflict (player_id) do nothing`, `SESSION_ALREADY_EXISTS` :191-200), `submit_answer(p_session_id,p_question_id,p_option_id,p_idempotency_key)` (:214; key 8-100 chars; replay returns the original :232), `get_result(p_session_id)` (:282). Tables: `game_sessions.player_id UNIQUE` (:40), `answers` uniques (:57-69). Every response is `{ok,code,message,data}`; `data.question` gives the next `question_id` + `options[].id`. Read-only reference, do not change.
- `web/e2e/staging-auth.ts` -- user minting and cleanup to port to raw HTTP: admin createUser (email_confirm) → generateLink magiclink → verifyOtp(token_hash) → access_token; cleanup order :26-39.
- `web/playwright.config.ts:4` -- staging URL.
- `web/README.md:20-42` -- env var docs; add the load-test section here.
- No existing load dir. Create `load/`.

## Tasks & Acceptance

**Execution:**
- [ ] `load/journey.k6.js` -- `setup()`: create 30 users through `POST /auth/v1/admin/users`, `POST /auth/v1/admin/generate_link`, `POST /auth/v1/verify` and return `[{id, token}]`. `default`: per-VU journey with the races from the matrix; RPC calls `POST /rest/v1/rpc/<name>` with `apikey` + `Bearer`. `teardown()`: query `game_sessions`/`answers` per user id through PostgREST with service role, log offending players (lost answers, sessions ≠1), clean up, then `exec.test.fail()` if any. In `default`, race violations go to a `dup_violations` Counter. Options: `scenarios: per-vu-iterations, vus 30, iterations 1`; thresholds `checks: rate==1`, `dup_violations: count==0`. -- one self-contained file
- [ ] `web/README.md` -- add "Load test" section: install k6, env vars, `k6 run load/journey.k6.js`, and filing failures as backlog bugs.

**Acceptance Criteria:**
- Given staging keys in env, when `k6 run load/journey.k6.js` runs, then 30 VUs finish and the summary shows checks 100%, `lost_answers` 0, `dup_violations` 0, exit 0.
- Given a run that is aborted midway, when teardown runs, then no `load-*@example.com` users remain on staging.
- Given a missing env var, when the script starts, then it fails fast with a clear message before creating users.

## Review Triage Log

Pass 1 (quick): high 0, medium 1, low 2, false 0, maybe-false 0; 2 rejected.

| Verdict | Finding | Route | Evidence |
|---|---|---|---|
| medium | Abort during setup leaks users (catch skipped, teardown gets no data) | patch | SIGINT/timeout skips the JS catch; violates the aborted-run AC → leftover sweep at setup start |
| low | cleanup() PostgREST deletes don't check their status | patch | only deleteUser logs; FK failures hide the root cause → log status like deleteUser |
| low | startOk passes with two SESSION_ALREADY_EXISTS | patch | `<= 1` admits zero OK; matrix requires one session created → `=== 1` |
| low | lost_answers counts from client answered_count, not DB | rejected | the DB count in teardown still fails the run via exec.test.fail; renaming is cosmetic |
| low | setup returns {runId, users} rather than [{id, token}] | rejected | same behaviour; fixing it would mean editing the plan |

## Design Notes

Teardown verification gives k6 no counters in `teardown`, so fail it with `exec.test.fail(msg)` (k6 ≥0.48) after cleanup. Emails follow `load-<runId>-<n>@example.com` so a manual sweep can find leftovers.

## Verification

**Commands:**
- `k6 inspect load/journey.k6.js` -- expected: parses, shows 30 VUs
- `k6 run load/journey.k6.js` (staging env) -- expected: exit 0, thresholds green

**Manual checks:**
- Staging `auth.users` holds no `load-%` emails after the run.
