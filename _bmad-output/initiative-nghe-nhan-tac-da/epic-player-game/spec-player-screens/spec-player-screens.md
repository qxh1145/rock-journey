---
id: SPEC-player-screens
companions: [screen-catalog.md]
sources: []
---

> **Canonical contract.** This SPEC and the files in `companions:` are the complete, preservation-validated contract for what to build, test, and validate. The Figma file (`PQK4NPQAB1xa6PteFH6Fod`) is the visual reference; node IDs are in screen-catalog.md.

# Player screens to Figma

## Why

The UX/UI draft in Figma defines the player journey's final look and motion. The web app (`web/src/main.tsx`) already runs the flow, but its screens have to match the design so players on phones get the intended carving experience. One screen, the showcase, exists only in Figma. Most of the work is closing gaps in existing code. Very little is new.

## Capabilities

- **CAP-1**
  - **intent:** Player sees a start screen with the title, tagline, the four play rules, stone stage 1/7 and a start CTA.
  - **success:** Rendered at 390×844, it matches frame 2:2 in copy and layout, and the CTA starts or resumes the session.
- **CAP-2**
  - **intent:** Player answers a question on a flip notebook: one choice among A/B/C, then commits it with Chốt đáp án. The progress bar, Câu n/12, correct count, stone stage and carve caption stay visible.
  - **success:** Choosing another answer moves the tick. Chốt is disabled until a choice exists. Committing records exactly one answer, including on double-tap.
- **CAP-3**
  - **intent:** After committing, the player sees whether they were right or wrong, the correct answer, the explanation and a saved-status line, then continues.
  - **success:** Wrong and correct rows each show a symbol and text (×/✓), not only colour, and match frame 2:60.
- **CAP-4**
  - **intent:** Moving to the next question tears the page from top to bottom to reveal a fresh page.
  - **success:** Input is locked during the ~0.8s tear. The tear SFX plays only when SFX is on. With reduced motion, a gentle page swap replaces the tear.
- **CAP-5**
  - **intent:** Every second answered question, right or wrong, plays the carve sequence and advances the stone one stage.
  - **success:** The stage shown after Q2/4/6/8/10/12 is 2/3/4/5/6/7 of 7. The sequence follows the 10 beats in frames 64:873–64:1363.
- **CAP-6**
  - **intent:** Player opens a music sheet to play or pause, skip, seek, pick a playlist track and toggle SFX separately.
  - **success:** The sheet opens over a 35% dim, traps focus and returns focus to the Đổi nhạc button on close. The playlist choice survives a reload.
- **CAP-7**
  - **intent:** A finished player sees their score, title, prize eligibility, how to claim (show Google email to staff) and the current prize status. Below 10/12 the same layout shows "Cám ơn bạn đã tham gia" in place of the medal and title, with no prize block. "Đã nhận quà" reuses the layout with only the status changed.
  - **success:** It matches frame 2:93 for a 10/12 player. Revisiting after completion lands here and shows no replay button.
- **CAP-8**
  - **intent:** A player who earns Mầm Nghề sees a medal award overlay before the result screen.
  - **success:** The overlay uses a 94% dim and the medal with its caption, and its CTA dismisses to the result screen. Reduced motion removes zoom and sparkle.
- **CAP-9**
  - **intent:** After the final carve, the player sees a showcase of the finished work: the mascot and four craft shelves, leading to the result screen.
  - **success:** The four showcase states render as in frames 74:1062/1074/1086/1049, and "Xem kết quả & nhận quà" opens the result screen. The states auto-advance in order as one short animation and stop on the last; the CTA is tappable throughout.
- **CAP-10**
  - **intent:** Player reaches the account menu from an avatar button on every in-game screen.
  - **success:** The 44px avatar toggles between the Closed and Open states and exposes aria-expanded. The open menu holds only Đăng xuất.

## Constraints

- Mobile-first, designed at 390×844. The layout respects device safe areas.
- Touch targets are at least 44px. Primary buttons are 54px, answer rows 64px and notebook answer lines 48px. Body text is 17px and captions 13px.
- At 200% text size, content scrolls, the CTA flows inline and nothing is clipped.
- A selection is only a draft. Chốt records once: the button disables and shows "Đang lưu", and a failure allows a retry that never creates a second answer.
- Right and wrong are never shown by colour alone. Icon buttons have labels, status changes are announced, the focus ring is visible and focus order follows content.
- Music starts only after a user gesture, and pause and SFX toggles are independent.
- When offline, the current question is kept, "Chưa lưu" is shown and the answer is resent safely. Signing in again resumes the old session.
- The prize is considered only after all 12 answers with at least 10 correct. A completed player never gets a replay button.
- UI text uses the system font stack; Be Vietnam Pro is only Figma's stand-in. Notebook text uses Patrick Hand.
- Every animation (tear, carve, medal) has a prefers-reduced-motion variant.
- Notebook paper is one fixed variant for every question.
- Saving/offline/retry states ("Đang lưu", "Chưa lưu") keep the existing code styling; no new design.
- Notebook paper is fixed to Kẻ lề đỏ (symbol 28:274) for every question.
- Saving, offline and retry states ("Đang lưu", "Chưa lưu") keep the existing code styling.
- Visual states come from the Figma components listed in screen-catalog.md (HIG/Button, Answer row, Notebook/Question, paper variants).

## Non-goals

- Admin and prize-desk UI (other epics).
- Backend, RPC or schema changes.
- Designing the sign-in screen, or layouts specific to desktop.
- Replacing the React + Vite stack.

## Success signal

- One Google account plays all 12 questions on a 390-wide phone. Each screen it passes through visually matches its Figma frame, with tear, carve, showcase, medal and result in order. The same run under reduced motion and at 200% text completes without clipped content.

## Assumptions

- Most screens already exist in `web/src/main.tsx`, so the work is closing gaps, not starting fresh.
- The showcase (CAP-9) is not in the code yet. It sits between the Q12 carve and the result screen.
- CAP-9 ships with placeholder copy (Eyebrow/Headline/Subline) until the real copy arrives.

