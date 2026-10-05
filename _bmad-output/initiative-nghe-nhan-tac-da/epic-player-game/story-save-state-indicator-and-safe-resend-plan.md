---
title: 'Save state indicator and safe resend'
type: 'feature'
ticket: '3'
created: '2026-10-05'
status: 'built'
baseline_revision: '6656092417df671a74cda9b1e7515e1e2b67927e'
route: 'oneshot'
route_source: 'auto'
risk: 'medium'
review: 'quick'
review_source: 'pinned'
lenses_ran: ['quick']
review_loop_iteration: 0
context: ['{project-root}/docs/rpc-error-codes.md']
---

<frozen-after-approval reason="human-owned intent — do not modify unless human renegotiates">

## Intent

**Problem:** An answer submit shows no clear Đang lưu / Đã lưu / Chưa lưu state. Going offline needs a manual retry, and the client handles RPC codes ad hoc instead of following `docs/rpc-error-codes.md` (FR-15, FR-09, CAP-2, CAP-3).

**Approach:** Add a `rpcAction(code)` mapper in `web/src/game.ts` that implements the contract's target reactions, and reuse it in `submitAnswer`. Show "Đang lưu…" while sending and "Chưa lưu" on offline or retryable failure. When offline, skip the call. On the `online` event, resend automatically with the stored idempotency key so the server holds exactly one answer. A Playwright offline spec and a Vitest mapper test prove it.

</frozen-after-approval>

## Implementation Notes

Oneshot route: about 80 lines across game.ts, main.tsx, PlayScreen.tsx, one e2e spec and one unit test. Server idempotency (`answers` unique `(session_id, idempotency_key)` and replay → OK) already exists, so there are no migrations.

## Verification

**Commands:**
- `npm test` (web) -- expected: mapper + optText tests pass
- `npx tsc -b && npm run build` (web) -- expected: no errors
- `npx playwright test` (web, needs staging env) -- expected: offline spec shows Chưa lưu, resends on reconnect, 1 answer row

Resumed 2026-10-05: the "up" commit already held the implementation. Review patch: `signin` now signs out (keeps pending), and `show` codes display `message` instead of the retry state. Playwright offline spec not run locally (needs staging env vars).

## Review Triage Log

- UNAUTHENTICATED reloaded → error screen, pending dropped — medium, patched: signOut, keep pending.
- show codes (INVALID_OPTION/FORBIDDEN) treated as Chưa lưu + auto-resend — medium, patched: show message, clear pending.
- retry codes never auto-retry when already online — low/medium, deferred: manual retry button works; backoff loop is extra scope.
- NOT_FOUND → reload — false: contract says "Show message / reload".
- e2e doesn't prove idempotency-key reuse — medium test gap, deferred.
- no explicit Đã lưu status — low, rejected: the feedback footnote already shows "Đã lưu câu trả lời".
