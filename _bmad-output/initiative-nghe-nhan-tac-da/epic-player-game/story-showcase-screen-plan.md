---
title: 'Showcase screen'
type: 'feature'
ticket: '7'
created: '2026-10-06'
status: 'built'
baseline_revision: '2a432222adcd73208579c044ce747d1135814451'
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

**Problem:** CAP-9's showcase exists only in Figma (frames 74:1062/1074/1086/1049). Right now, after the Q12 carve, the player's next tap goes straight to the result screen and never sees the finished work presented.

**Approach:** Add a `showcase` screen between Q12 and the result. It shows the finished mascot and four craft shelves (Đá mỹ nghệ, Non bộ & đá cảnh, Điêu khắc, Tượng). It moves through the 4 states (Mở đầu, Giới thiệu, Kệ tác phẩm, Từ đá thô đến tác phẩm) as one short animation and stops on the last one. The CTA "Xem kết quả & nhận quà" opens the result and can be tapped at any time. The copy is placeholder copy, as the spec says.

## Boundaries & Constraints

**Always:** The CTA is visible and tappable in every state. Under reduced motion, the screen jumps straight to the last state. The layout works at 390px width and at 200% text without clipping. The medal overlay still opens on the result screen, as it does today.

**Never:** No backend or RPC changes. No new npm dependencies. Do not write the real marketing copy (it is a placeholder until it arrives). Do not add analytics (that is story 11).

## I/O & Edge-Case Matrix

| Scenario | Input / State | Expected Output / Behavior | Error Handling |
|----------|--------------|---------------------------|----------------|
| Live finish | Q12 answered, player taps next | showcase → auto-advances 4 states → stops on last | No error expected |
| Early CTA | CTA tapped mid-animation | result screen opens, timers cleared | No error expected |
| Reload after finish | Session COMPLETED on load | result shown directly, no showcase | No error expected |
| Reduced motion | prefers-reduced-motion | last state shown immediately | No error expected |

</frozen-after-approval>

## Code Map

- `web/src/game.ts:3` -- the `Screen` union. Add `'showcase'`.
- `web/src/main.tsx` `next()` -- the `COMPLETED` branch currently calls `music.finish()` and then `setScreen('result')`. Send it to `'showcase'` instead and leave `music.finish()` where it is. Render `<ShowcaseScreen onDone={() => setScreen('result')} />`. `loadCurrentRoute` stays as it is (a reload goes to the result).
- `web/src/screens/ResultScreen.tsx` -- the pattern for screen components (`main.screen`, `TopBar`, `.bottom` CTA).
- `web/src/components/Mascot.tsx` -- reuse `<Mascot stage="FINISHED" />`.
- `web/src/style.css` -- `.screen`, `.bottom`, `.primary`, and the reduced-motion block at line 155. Add the showcase styles here.
- `web/public/assets/` -- has no shelf images yet. Export the 4 shelf artwork groups as webp from the Figma frames using the Figma MCP `download_assets`, and name them `shelf-*.webp`.
- `web/e2e/carve.spec.ts`, `web/e2e/staging-auth.ts` -- the pattern for a throwaway player and the answer loop.

## Tasks & Acceptance

**Execution:**
- [ ] `web/public/assets/shelf-*.webp` -- export the shelf artwork from Figma frames 74:1062/1074/1086/1049 -- there are no assets yet.
- [ ] `web/src/game.ts` -- add `'showcase'` to `Screen` -- route.
- [ ] `web/src/screens/ShowcaseScreen.tsx` -- new screen. A `step` index goes 0→3 on timeouts, and the timers are cleared on unmount. Under reduced motion it starts at 3. It uses placeholder Eyebrow/Headline/Subline for each state, a `data-step` attribute, and the CTA button -- CAP-9.
- [ ] `web/src/main.tsx` -- route `next()` to the showcase and render it -- insert the screen.
- [ ] `web/src/style.css` -- add the showcase layout, the shelves, and the state fade transitions -- match the Figma frames.
- [ ] `web/e2e/showcase.spec.ts` -- answer all 12 questions, tap next, then check that `data-step` goes 0→3 and that the CTA opens "Bạn đã hoàn thành!" -- ticket verify.

**Acceptance Criteria:**
- Given a player who just finished Q12, when they tap next, then the showcase appears and ends on "Từ đá thô đến tác phẩm" within about 6s.
- Given the showcase is on screen, when the CTA is tapped, then the result screen opens.

## Design Notes

The order of states and the timings are hard-coded in the component, with about 1.2s per state. No config is needed. The showcase only appears after a live finish, the same way the carve does not replay on a reload. A completed session that is loaded again opens the result.

## Verification

**Commands:**
- `cd web && npx tsc -b && npm test` -- expected: pass
- `cd web && npx playwright test e2e/showcase.spec.ts` -- expected: pass against staging

**Manual checks:**
- Compare each state at 390px with the Figma frames.

## Review Triage Log

| # | Finding | Verdict | Route | Evidence |
|---|---------|---------|-------|----------|
| 1 | aria-live region keyed on step, remounted each state | medium | patch | `key={step}` sits on the div carrying `aria-live`, so the live region is replaced rather than updated. |
| 2 | Hidden shelves read by screen readers before step 2 | low | patch | Hidden only by CSS opacity; one-attribute fix (`aria-hidden`). |
| 3 | Step 3 eyebrow equals headline | low | reject | Eyebrow is the state name in every step; the plan names state 4 and its headline identically. Placeholder copy. |
| 4 | Showcase has no TopBar (menu/music) | low | patch | Every other game screen renders TopBar via the `topBar` prop (main.tsx:198); plan cites ResultScreen as the pattern. |
| 5 | `.showcase .eyebrow` override not traced to Figma | maybe-false | reject | Would be low at most; the manual 390px Figma check is still open. |
| 6 | e2e allows ~12s, AC says ~6s | low | patch | Four 3s waits; one total-time assertion is a direct fix. |
| 7 | e2e asserts step 0 before early tap, flaky | low | patch | Step 0 lasts 1.2s after a network round-trip; the assertion is not needed for the scenario. |
| 8 | Shelf imgs lack width/height; small files may blur | maybe-false | reject | Low at most; tiny CLS; blur needs the visual check. |
| 9 | Plan checkboxes/verification not recorded | — | reject | Fix edits this build's plan. |
