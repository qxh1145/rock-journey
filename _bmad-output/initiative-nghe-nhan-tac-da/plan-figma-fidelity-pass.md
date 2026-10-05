---
title: 'Figma fidelity pass — 390×844 stage, screen geometry, carve motion'
type: 'bugfix'
ticket: ''
created: '2026-10-06'
status: 'built'
baseline_revision: 'e6b7ce63ce30ed48c687fd835f64e98a2b71e67b'
route: 'full'
route_source: 'auto'
risk: 'medium'
review: 'quick'
review_source: 'pinned'
lenses_ran: [quick]
review_loop_iteration: 0
context: []
---

<frozen-after-approval reason="human-owned intent — do not modify unless human renegotiates">

## Intent

**Problem:** The UI does not match the Figma prototype (file PQK4NPQAB1xa6PteFH6Fod, start node 64:873). The layout is fluid, not a 390×844 frame, so sizes and positions drift with the viewport. The carve animation (saw, chisel, hammer, dust, debris) also differs from keyframes 64:873–64:1363.

**Approach:** Render the app inside a fixed 390×844 stage that scales proportionally to fit the viewport (Figma "min-zoom"). Then set each screen's geometry and the carve FX keyframes to Figma's absolute values. Work on branch `story-2-8-start-screen` on top of the uncommitted story-2.8 changes.

## Boundaries & Constraints

**Always:** Figma px values are authoritative inside the stage. Keep reduced-motion fallbacks. Keep existing SFX timing hooks. Keep e2e selectors working.

**Never:** Change game logic, API, or copy text. Redesign the avatar dropdown panel (no Figma reference). Touch the showcase screens (already built against 74:1049–1086) or the page tear (already matches spec).

## I/O & Edge-Case Matrix

| Scenario | Input / State | Expected Output / Behavior | Error Handling |
|----------|--------------|---------------------------|----------------|
| Phone portrait | 390×844 viewport | Scale 1, pixel-identical to Figma | — |
| Tall/narrow | 360×780 | Scale = min(w/390,h/844), centered, letterboxed in `--bg` | — |
| Desktop | 1440×900 | Stage scaled to height, centered | — |
| Resize/rotate | viewport changes | Scale recomputes | — |
| Reduce motion | prefers-reduced-motion | Carve shows final stage + fade only | — |

</frozen-after-approval>

## Code Map

- `web/src/style.css:15-16` -- `.phone` max-width 430 / `.screen` flex+gap: replace with fixed stage.
- `web/src/style.css:46-74` -- `.mascot` 255px box + saw/chisel/hammer/dust/debris keyframes.
- `web/src/style.css:80,112-162` -- paper min-height, result, menu, sheet, medal overlay.
- `web/src/components/Mascot.tsx:26-44` -- carve timeline (saw 0ms, chisel 600/850, swap 950, done 1400) and FX layers; sparkle only on FINISHED.
- `web/src/main.tsx` -- root render; place to set `--s` scale on resize.
- `web/src/screens/{Start,Play,Result}Screen.tsx`, `components/{TopBar,MusicSheet,MedalOverlay}.tsx` -- screen markup.
- `web/public/assets/` -- saw/chisel/hammer.webp, dust-1..4, debris-1..3, sparkle, stage-1..7.

## Tasks & Acceptance

**Execution:**
- [ ] `web/src/main.tsx`, `web/src/style.css` -- `.phone` = 390×844, `position:relative`, `transform:scale(var(--s))`, centered; set `--s` from one resize listener; `.overlay`/`.sheet-backdrop` → `position:absolute` within the stage; remove vh/vw/dvh units inside screens.
- [ ] Each screen -- pull `get_design_context` per frame (2:2, 2:22, 2:60, 2:93, 2:121, 7:2, 21:165) for exact typography, then apply absolute y/size values. Known deltas: Start eyebrow y30, h1 34/41px at y80, mascot 268×190 @ (61,283), rules gap 12 @ y491, CTA y680. Play: avatar x14, stone 350×255 @ y111, caption y372, paper 350×326 @ y408, button y748. Result: no avatar, stone 166×158 @ (112,199), one button y690. Sheet: 390×680 @ y164, dim #00000059, grabber 44×5, transport 72×64, rows 52px, styled seek (4px track/20px thumb). Medal: dim #1c1c1ef0, badge 250×289 @ y226, caption y557, button y711.
- [ ] `web/src/components/Mascot.tsx`, `style.css` -- FX canvas 390×394 at stage top, overflow visible; stone 350×259 @ (20,107) → final 348×296 @ (21,70). Saw path (365,6)→(270,46)→(230,96)→back. Chisel 60px, no rotation, (120,50)→(161,135)→back. Hammer 132px, (224,49)→(158,100)→strike (171,170) with rotate/squash. Small/large/ground dust growing to 180×104 / 440×273 @(-25,42) / 380×205 @(10,247). 3 debris pieces flung to (315,300),(42,348),(259,302); ground pile behind stone. Rock spark 40×33→130×108. Sparkle on every stage reveal. Shake x and y ±2–4px. Keyframe timing on the existing 1.4s: 01–03 0–30%, 04 ~35%, 07 ~61%, 10 68–100%.
- [ ] Assets -- source from `/Users/quan/Desktop/web game/` (user decision), convert PNG→webp into `web/public/assets/`: `đá lấp lánh.png` = rock spark, `lấp lánh.png`/`lấp lánh 2.png` = sparkle 1/2, `bụi đá 1-4.png` = small/large/ground dust, `đá vụn 1-3.png` = debris + ground pile, `máy xẻ đá`/`đồ đục`/`búa` = tools, `1-7.png` = stages. Replace existing files with these where they differ.

**Acceptance Criteria:**
- Given a 390×844 viewport, when each screen renders, then a screenshot overlay against the Figma frame shows element boxes within ±2px.
- Given any other viewport, when the app loads, then the whole stage is visible, proportionally scaled, with no scrollbars.
- Given a correct answer on Q8, when the carve plays, then frames sampled at 0/30/35/61/100% match Figma keyframes 00/03/04/07/10.

## Implementation Notes

## Plan Change Log

## Review Triage Log

Pass 1 (quick): high 0 / medium 4 / low 2 / false 3 / maybe-false 1
- medium · patch — carve-stone keyframe jumps vs resting stone geometry at start/end; confirmed by comparing keyframe 0%/100% with `.play .stone`.
- medium · patch — hammer has one strike but chisel SFX fire at 600 and 850ms; confirmed in Mascot.tsx timers vs keyframes.
- medium · patch — reduced-motion still animates stone size/position (global rule only shortens duration).
- medium · patch — `.rotate-hint` position:fixed now contained by transformed `.phone`.
- low · patch — Result two-button case overflows 844 and is clipped (replay account only).
- low · patch — `env(safe-area-inset-bottom)` padding inside fixed stage.
- maybe-false · rejected (low) — `.start .error` may reach CTA if wrapping; would need a long-error screenshot.
- false — frames 2:60/21:165 unaddressed: both are PlayScreen states and inherit the `.play` geometry.
- false — Result should show one button: replay is an existing conditional feature; Figma shows the default case.
- false — plan lacks verification evidence: verification is collected at step 5, not in-plan.

## Verification

**Commands:**
- `cd web && npm run build && npx vitest run` -- expected: pass
- `cd web && npx playwright test` -- expected: existing e2e pass

**Manual checks:**
- Playwright screenshots at 390×844 of each screen, compared side by side with Figma `get_screenshot` of the matching frame.
