---
title: 'Carve sequence and mascot stages'
type: 'feature'
ticket: '5'
created: '2026-10-06'
status: 'built'
baseline_revision: '206dec6b410eb58f1850bdd037676b0baf7404b2'
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

**Problem:** CAP-5 (FR-06, FR-16) says every even answer plays the carve and moves the stone to stage 2..7/7, and a resume must never replay a carve that already played. The behaviour is already built, but no test proves the stage mapping or the no-replay-on-resume rule.

**Approach:** Keep the source as it is. Add one Playwright spec that answers through Q4, checks that the carve ran and the stage reads 3/7, reloads, and checks that the stage still reads 3/7 with no carve overlay. Also add a Vitest test for the caption's stage percentage.

</frozen-after-approval>

## Implementation Notes

**Why oneshot:** the change is about 50 lines of tests and no source.

**What already exists:**
- `submit_answer` returns `chisel_event_id` on even counts (`supabase/migrations/20261005000000_init.sql:277`).
- The stage is `answered_count/2`.
- `main.tsx:164-168` plays the carve once per event, deduped through `CHISEL_KEY` in localStorage.
- `Mascot.tsx` and the `.fx` keyframes in `style.css:50-74` cover the beats: saw in, cut, debris, switch to the chisel, two hammer hits, dust and stage swap, dust clears, reveal.
- `Mascot` exposes `aria-label="Tác phẩm: hình thái N/7"`.

**Reuse:** `createThrowawayPlayer` and the `play` pattern from `e2e/question-feedback.spec.ts`.

**Do not change:** the dedup key, the RPC, or the beat timings.

## Verification

**Commands:**
- `cd web && npm test` -- expected: exit 0
- `cd web && npm run typecheck` -- expected: exit 0
- `cd web && npx playwright test --list` -- expected: the new spec is listed. It only runs with the staging service key.

## Review Triage Log

- **The reload check can't fail, because only a submit starts a carve:** low, rejected.
  - A carve could only repeat if a resend came back with an event the client had already seen.
  - The pending entry is cleared as soon as the response arrives (`main.tsx:157`), so that state can't be reached. A resend after an aborted response *should* carve.
  - The spec matches the ticket's verify text, and `CHISEL_KEY` guards against the theoretical case.
- **Fixed 500 ms sleep:** low, patched by deleting it.
- **Circular stage mapping in the unit test, and the name overclaimed its coverage:** low, patched. The mapping is server-side (`mascot_stage = answered_count/2`), and the e2e spec covers it through the aria-label. The unit test was renamed to what it actually checks.
- **Carve-visible flake:** false. The carve lasts 1.4 s and `toBeVisible` polls about every 100 ms. With reduced motion the carve still mounts for 250 ms.
