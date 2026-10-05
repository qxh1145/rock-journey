---
title: 'Question, feedback and page tear to spec'
type: 'feature'
ticket: '4'
created: '2026-10-06'
status: 'built'
baseline_revision: '233fb05cd2e80602ca7092c2f6e33aa78fd56366'
route: 'oneshot'
route_source: 'auto'
risk: 'low'
review: 'quick'
review_source: 'pinned'
lenses_ran: ['quick']
review_loop_iteration: 0
context: []
---

<frozen-after-approval reason="human-owned intent — do not modify unless human renegotiates">

## Intent

**Problem:** CAP-2..4 (FR-05, FR-07, FR-16) are only partly met:
- A double-tap on Chốt sends two `submit_answer` RPCs, because the guard at `main.tsx:112` reads React state that hasn't updated yet.
- The option buttons stay tappable during the tear, because `PlayScreen.tsx:43` only checks `submitting`.
- Reduced motion only shortens the tear instead of swapping it out (`style.css:155`).
- Nothing tests text feedback or the SFX gate.

**Approach:**
- **Double-tap:** add a synchronous in-flight `useRef` guard to `submitAnswer`.
- **Locked options:** disable the options while `torn` is set.
- **Reduced motion:** under `prefers-reduced-motion`, swap the tear for a short opacity fade on `.tear.piece` and hide `.tear.keep`. The element still animates, so `onAnimationEnd` keeps unlocking input.
- **Tests:** a Vitest test for the SFX-off gate, and one Playwright spec covering double-tap → 1 RPC, options and Chốt disabled mid-tear, the reduced-motion swap, and ×/✓ text.

</frozen-after-approval>

## Implementation Notes

**Why oneshot:** about 10 lines of source plus 70 lines of tests. Text feedback (`PlayScreen.tsx:27-28`) and the SFX gate (`audio.ts:36`) are already in place and only need tests.

**Do not change:**
- the idempotency and pending logic
- the `onAnimationEnd` unlock
- the shape of the prefs API
- the answer SFX mapping

**Reuse:**
- the `localStorage` stub in `audio.test.ts`
- the sign-in and route-mock pattern in `e2e/music.spec.ts` (`createThrowawayPlayer`)
- `page.emulateMedia({ reducedMotion: 'reduce' })`

## Verification

**Commands:**
- `cd web && npm test` -- expected: exit 0, SFX gate test passes
- `cd web && npm run typecheck && npm run build` -- expected: exit 0
- `cd web && npm run e2e` (staging env set) -- expected: the new spec passes

The Playwright spec was not run locally because `SUPABASE_STAGING_SERVICE_ROLE_KEY` is not set. It compiles and is listed (2 tests).

The reduced-motion check pauses the animation with an injected style so it can read `animationName` before the 0.2s fade ends.

## Review Triage Log

- **Chốt not asserted disabled mid-tear:** low, rejected. `next()` clears `selected`, so Chốt is already disabled by `!selected`, and the options can't be picked mid-tear (tested). The `torn` gate on Chốt can't be reached on its own.
- **`sfx.enabled` and the stubbed `Audio` leak out of the unit test:** low, patched. Both are restored in `finally`.
- **The × row is never asserted:** medium (test gap), patched. The spec now asserts × whenever a wrong row renders. Whether the wrong branch shows up still depends on staging data.
- **Source changes:** no issues found (ref guard, offline path, CSS specificity).
