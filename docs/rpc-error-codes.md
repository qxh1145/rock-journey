# RPC result-code contract

Every RPC and Edge Function returns `{ ok, code, message, data }` through `_res()` (`supabase/migrations/20261005000000_init.sql:117`). `code` is stable and is what the client branches on. `message` is Vietnamese text for display only, and the client never branches on it. Codes are UPPER_SNAKE, and a code keeps one meaning everywhere.

Source: PRD §19, extended by decisions on 2026-10-05 (story "Decide RPC error-code contract").

## Codes

| Code | ok | Meaning | Status | Target client reaction |
|---|---|---|---|---|
| `OK` | true | Call succeeded; payload in `data` | live | Use `data` |
| `NONE` | true | Player has no session yet | live | Show landing |
| `IN_PROGRESS` | true | Current session is in progress (session status used as code) | live | Resume question |
| `COMPLETED` | true | Current session is completed (session status used as code) | live | Show result |
| `ALREADY_CLAIMED` | true | Reward was already claimed; idempotent success | live | Show "already claimed" |
| `UNAUTHENTICATED` | false | No signed-in user | live | Send to sign-in |
| `FORBIDDEN` | false | Signed in but not allowed: wrong role, unverified email, locked account, not qualified for reward | live | Show `message` |
| `SESSION_ALREADY_EXISTS` | false | Player already has a session; `data` holds it | live | Load existing session |
| `SESSION_COMPLETED` | false | Answer submitted to a finished session | live | Reload state |
| `QUESTION_OUT_OF_ORDER` | false | Answer is not for the current question | live | Reload state |
| `QUESTION_ALREADY_ANSWERED` | false | Question already recorded | live | Reload state |
| `INVALID_OPTION` | false | Chosen option is not valid for the question | live | Show `message` |
| `CONFLICT` | false | Request conflicts with current state (e.g. result asked before session completes) | live | Reload state |
| `RATE_LIMITED` | false | Too many calls; retry later | reserved: arrives with RPC rate limits (epic done-when #4) | Back off, retry |
| `DATABASE_UNAVAILABLE` | false | Database or upstream outage; safe to retry | live, see misuse below | Keep "unsynced", retry (§21) |
| `NOT_FOUND` | false | Referenced session/question/row does not exist or is not visible to caller | new: not yet returned | Show `message` / reload |
| `INVALID_INPUT` | false | Malformed argument (e.g. bad `idempotency_key`) | new: not yet returned | Bug; log with correlation ID |
| `NOT_CONFIGURED` | false | Required config missing (e.g. no active question set) | new: not yet returned | Show maintenance message |

Target reactions are the contract. Today `web/src/main.tsx` only branches on `NONE` (:82) and reloads on `QUESTION_OUT_OF_ORDER`, `QUESTION_ALREADY_ANSWERED`, `SESSION_COMPLETED` (:32); every other `ok=false` shows `message`.

## RPC coverage (current migrations)

| RPC | Codes returned today |
|---|---|
| `get_current_session` | `UNAUTHENTICATED`, `NONE`, `IN_PROGRESS`, `COMPLETED` |
| `start_session` | `UNAUTHENTICATED`, `FORBIDDEN`, `DATABASE_UNAVAILABLE`¹, `SESSION_ALREADY_EXISTS`, `OK` |
| `get_session_state` | `UNAUTHENTICATED`, `FORBIDDEN`², `OK` |
| `submit_answer` | `UNAUTHENTICATED`, `INVALID_OPTION`³, `FORBIDDEN`², `SESSION_COMPLETED`, `QUESTION_ALREADY_ANSWERED`, `QUESTION_OUT_OF_ORDER`, `OK` |
| `get_result` | `UNAUTHENTICATED`, `FORBIDDEN`², `CONFLICT`, `OK` |
| `admin_get_dashboard` | `FORBIDDEN`, `OK` |
| `admin_export_report` | `FORBIDDEN`, `OK` |
| `admin_search_players` | `FORBIDDEN`, `OK` |
| `admin_claim_reward` | `FORBIDDEN`, `CONFLICT`², `ALREADY_CLAIMED`, `OK` |

Superscripts point to the numbered item under "Known misuse".

## Known misuse (to migrate to the new codes)

1. `start_session` returns `DATABASE_UNAVAILABLE` when no question set exists. It should return `NOT_CONFIGURED`.
2. Several RPCs signal "session not found" with the wrong code. They should return `NOT_FOUND`:
   - `get_session_state`, `submit_answer` and `get_result` use `FORBIDDEN`.
   - `admin_claim_reward` uses `CONFLICT`.
3. `submit_answer` returns `INVALID_OPTION` for a bad `idempotency_key`, which should be `INVALID_INPUT`, and for an unknown question, which should be `NOT_FOUND`. `INVALID_OPTION` stays for a bad option.

## Rules for new RPCs

- Return a code from this table. A new code must be added here first.
- Use `ok=true` for idempotent repeats (`ALREADY_CLAIMED`) and `ok=false` for anything the caller must handle.
- `get_current_session` returns `game_sessions.status` as its code, so adding a status value to that check constraint adds an RPC code: add it here in the same change.
