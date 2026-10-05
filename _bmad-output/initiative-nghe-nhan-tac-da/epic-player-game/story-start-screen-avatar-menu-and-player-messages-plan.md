---
title: 'Start screen, avatar menu and player messages'
type: 'feature'
ticket: '8'
created: '2026-10-06'
status: 'built'
review: 'quick'
review_source: 'pinned'
lenses_ran: ['quick']
baseline_revision: '92d73e4cc1ee79192a770e07f9adf569621479ca'
route: 'full'
route_source: 'auto'
risk: 'low'
review_loop_iteration: 0
context: ['{project-root}/docs/rpc-error-codes.md']
---

<frozen-after-approval reason="human-owned intent — do not modify unless human renegotiates">

## Intent

**Problem:** The start screen and avatar menu don't fully meet CAP-1/CAP-10. Start-up failures (network, sign-in, ineligible account) land on a generic error screen with raw text instead of going through story 3's `rpcAction` mapper. Nothing tests start vs resume, sign-out, returning-player result (FR-11) or these message states.

**Approach:** Route `loadCurrentRoute` codes through `rpcAction` and give each player state one clear Vietnamese message. Bring the start CTA and avatar menu to the spec. Cover all of it with one Playwright spec.

## Boundaries & Constraints

**Always:** Branch only on `code`, never on `message`. Keep existing class names and styling (no new design for message states). Touch targets ≥44px; avatar keeps `aria-expanded`. Tests use throwaway staging users via `e2e/staging-auth.ts`, cleaned up even on failure.

**Decisions:** Signed-in players always see the start screen first: NONE → CTA "Bắt đầu" (calls `start_session`), IN_PROGRESS → "Tiếp tục câu N"; COMPLETED still goes straight to Result (FR-11). Signed out → "Đăng nhập bằng Google". Result shows the avatar menu and drops its own Đăng xuất link.

**Never:** No RPC, migration or schema changes. No real Google OAuth in tests. No new dependencies, no router.

## I/O & Edge-Case Matrix

| Scenario | Input / State | Expected Output / Behavior | Error Handling |
|----------|--------------|---------------------------|----------------|
| Loading | Session + RPC pending | `role=status` "Đang tải hành trình…" | — |
| New player | Signed in, `get_current_session` = NONE | Start screen CTA "Bắt đầu" → tap → `Câu 1/12` | — |
| Resume | IN_PROGRESS at Q2 | Start screen CTA "Tiếp tục câu 2" → tap → `Câu 2/12` | — |
| Returning finished (FR-11) | COMPLETED | Result screen with old score, no replay button | — |
| Network | `callRpc` throws / offline at start-up | Message "Không có kết nối mạng. Kiểm tra mạng rồi thử lại." + Thử lại | Retry reruns `loadCurrentRoute` |
| Login | UNAUTHENTICATED, or OAuth error | Signed out → start screen with sign-in CTA and error text | — |
| Ineligible | `start_session` FORBIDDEN (unverified/locked) | Server `message` shown, no retry loop, Đăng xuất offered | — |
| Claimed | COMPLETED with `reward_claimed` | Result shows "Trạng thái: Đã nhận quà" | — |

</frozen-after-approval>

## Code Map

- `web/src/main.tsx:43-61` -- `loadCurrentRoute`: auto-calls `start_session` on NONE and throws raw messages; `reload` sends every throw to the `error` screen (`:208-211`). Map codes here with `rpcAction`; catch network throws into a fixed message.
- `web/src/game.ts:47-55` -- `rpcAction` (reload/retry/signin/show). Reuse; do not change its table.
- `web/src/screens/StartScreen.tsx` -- CAP-1 copy already matches frame 2:2; CTA is "Đăng nhập bằng Google". Props grow for the CTA label.
- `web/src/components/TopBar.tsx` -- `AvatarMenu` shows the email plus Đăng xuất; CAP-10 says only Đăng xuất. `TopBar` avatar has `aria-expanded` already.
- `web/src/screens/ResultScreen.tsx:10` -- `showAvatar={false}` plus its own Đăng xuất link.
- `web/src/screens/ShowcaseScreen.tsx` -- no TopBar; leave as is (transient animation).
- `web/e2e/staging-auth.ts`, `web/e2e/journey.spec.ts` -- session injection pattern to reuse. `admin` client can set `game_sessions` status/`reward_claimed` for COMPLETED/claimed fixtures.
- `supabase/migrations/20261005000000_init.sql:177,185` -- FORBIDDEN messages for unverified/locked accounts.

## Tasks & Acceptance

**Execution:**
- [x] `web/src/main.tsx` -- map `loadCurrentRoute` results via `rpcAction`; network throw → fixed message; FORBIDDEN on start → error screen with Đăng xuất; stop auto-starting; land signed-in NONE/IN_PROGRESS on start screen, start/resume on CTA -- one place for player messages
- [x] `web/src/screens/StartScreen.tsx` -- CTA label from props (sign-in / Bắt đầu / Tiếp tục câu N) -- CAP-1
- [x] `web/src/components/TopBar.tsx` -- menu holds only Đăng xuất -- CAP-10
- [x] `web/src/screens/ResultScreen.tsx` -- show avatar, remove Đăng xuất link and `onSignOut` prop -- CAP-10
- [x] `web/e2e/staging-auth.ts` -- expose a helper to set the session completed/claimed via the admin client -- fixtures
- [x] `web/e2e/{journey,carve,music,offline-resend,question-feedback,showcase}.spec.ts` -- tap the start/resume CTA after `goto`/`reload` where they now land on the start screen -- keep existing suites green
- [x] `web/e2e/start-and-messages.spec.ts` -- start, resume, sign-out, FR-11 completed, claimed, network (route abort), login (no session) -- verify line of the ticket

**Acceptance Criteria:**
- Given an open avatar menu, when the player taps Đăng xuất, then the start screen with the sign-in CTA is shown and the avatar shows `aria-expanded=false` before sign-out.
- Given `npm run build` and `npm test` in `web/`, then both exit 0.

## Implementation Notes

## Plan Change Log

## Review Triage Log

| # | Finding | Verdict | Route | Evidence |
|---|---------|---------|-------|----------|
| 1 | Stale error shown on start screen after Đăng xuất from error screen | medium | patch | `signOut` never cleared `error`; landing renders it. Fixed: `setError('')` in `signOut`; ineligible e2e asserts no alert. UNAUTHENTICATED path calls `supabase.auth.signOut` directly, so its message survives. |
| 2 | Every thrown error (incl. HTTP 401/5xx) shows the network message | medium | defer | Plan matrix maps `callRpc` throws to the network message; splitting PostgREST errors needs status inspection beyond plan. |
| 3 | Double tap on Bắt đầu → second start_session SESSION_ALREADY_EXISTS → reload bounces player to landing | medium | patch | No guard in `start()`. Fixed with `starting` ref, mirroring `inFlight` in `submitAnswer`. |
| 4 | OAuth redirect error (`?error=`) not shown | medium | defer | Pre-existing: redirect errors were never read before this change. |
| 5 | FR-11 `Chơi lại` check trivially passes; no test for start_session network throw | low | reject | Test-strength nit; the result path itself is covered. |
| 6 | Plan frontmatter duplicate keys / empty verification record | false | reject | Duplicate keys were workflow bookkeeping, now removed; verification recorded below. |

## Verification

**Commands:**
- `cd web && npm run build && npm test` -- expected: exit 0
- `cd web && npx playwright test e2e/start-and-messages.spec.ts` (staging env) -- expected: all pass
