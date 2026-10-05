---
title: 'Question, feedback and page tear to spec'
type: 'feature'
ticket: '4'
created: '2026-10-06'
status: 'built'
baseline_revision: '9d9d196be20d70da29196722a0efab7bfd1150eb'
route: 'oneshot'
route_source: 'auto'
risk: 'low'
review: 'quick'
review_source: 'pinned'
lenses_ran: [quick]
review_loop_iteration: 0
context: []
---

<frozen-after-approval reason="human-owned intent — do not modify unless human renegotiates">

## Intent

**Problem:** The notebook misses CAP-2/CAP-4 of spec-player-screens. A double-tap on Chốt can fire two `submit_answer` calls in one tick, because `submitting` is stale React state. The answer radios stay clickable during the ~0.8s tear. Reduced motion only shortens the tear instead of swapping it for a gentle page change. CAP-3 (×/✓ plus text) and SFX gating through the 2.6 prefs already meet spec.

**Approach:** Add a synchronous `useRef` in-flight guard to `submitAnswer` in `web/src/main.tsx`. Disable the option buttons while `torn` is set (`web/src/screens/PlayScreen.tsx`). Under `prefers-reduced-motion`, replace the clip-path tear and peel with a short opacity fade (`web/src/style.css`); `onAnimationEnd` still unlocks input. Tests: a vitest case showing `sfx.play` is a no-op when SFX is off (`web/src/audio.test.ts`), and `web/e2e/question-tear.spec.ts` covering double-tap (one RPC, `answerCount()===1`), radios disabled during the tear, and the reduced-motion swap.

</frozen-after-approval>

## Implementation Notes

Oneshot: about 15 app LOC plus about 70 test LOC, across 3 app files and 2 test files. No jsdom/RTL is added; vitest runs in node, so component behaviour is covered in Playwright.

Changed main.tsx (inFlight ref; body moved to doSubmit), PlayScreen.tsx (options disabled while torn), style.css (reduced-motion swap), audio.test.ts, e2e/question-tear.spec.ts. The e2e could not run locally because SUPABASE_STAGING_SERVICE_ROLE_KEY is not set; it runs in the CI e2e job.


## Verification

**Commands:**
- `cd web && npm run typecheck && npm test` -- expected: pass
- `cd web && npm run e2e -- question-tear` -- expected: pass (needs staging env)

## Review Triage Log

Quick pass: 0 high, 2 medium, 2 low, 0 false, 1 deferred.
- medium (patched): `dblclick` could hit an already-disabled button and never exercise `inFlight`. The test now fires two `click()` calls in one tick through `evaluate`.
- medium (patched): reduced-motion assertions raced the 0.3s fade. The test now takes one DOM snapshot of the animation name, keep-hidden state and disabled radios.
- low (rejected): the RPC count is read after "Đã lưu" appears. The server-side `answerCount()===1` already covers a late duplicate.
- low (patched in part): the SFX unit test leaked `sfx.enabled` and `Audio`, which are now restored. The prefs→`sfx.enabled` wiring is rejected as out of scope; `useMusic` from 2.6 owns it.
- deferred: the e2e has not run locally (no service-role key). Its evidence comes from the CI e2e job.
